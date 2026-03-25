# Supabase + TanStack Query Architecture Guide

> Reference document for migrating domain modules to the modern hook-based architecture.
> Written after completing the inventory module refactor (March 2026).

---

## The Core Principle

**Components never call Supabase directly.** All server state goes through TanStack Query hooks. No manual type mapping, no adapter layer — the database schema *is* the type system.

```
Component
  → TanStack Query hook  (src/lib/queries/hooks/)
    → Supabase client    (src/lib/supabase.ts)
      → PostgreSQL
```

---

## What We Removed

The old approach used a `DatabaseAdapter` singleton (~936 lines) that:
- Mapped integer DB IDs → string domain IDs
- Converted `snake_case` columns → `camelCase` domain types
- Required manual updates after every schema migration
- Caused type drift between DB reality and domain types

**The inventory module never needed this.** It called Supabase directly from hooks. The refactor cleaned those hooks up to use the patterns below. All other modules should follow the same path.

---

## Pattern 1: Module-Level Query Constants + `QueryData<>` Types

Define the Supabase query **outside the hook** at the top of the file. TypeScript infers the full join shape from the query string — no manual type declarations needed.

```typescript
import { QueryData } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// ── Define query at module level ──────────────────────────────────────────────
// The select string is the source of truth for the type.
// Any column added/removed here automatically updates the TypeScript type.

const inventoryQuery = supabase
  .from('inventory')
  .select(`
    *,
    item:items(id, name, description, unit, minimum_stock,
      category:categories(id, name, requires_expiration)
    ),
    location:locations(id, name, type, is_refrigerated)
  `)
  .order('item(name)');

// ── Derive the exported type from the query ───────────────────────────────────
// No manual interface. No `as unknown as` cast. Just `QueryData<>`.

export type InventoryWithDetails = QueryData<typeof inventoryQuery>[number];

// ── Use the query inside the hook ─────────────────────────────────────────────

export function useInventoryWithDetails() {
  return useQuery({
    queryKey: queryKeys.inventory.all(),
    queryFn: async () => {
      const { data } = await inventoryQuery.throwOnError();
      return data ?? [];
    },
  });
}
```

**Why module-level?** TypeScript needs to evaluate `typeof inventoryQuery` at compile time. If the query is inside the hook function, `QueryData<>` cannot infer the type. Define it at the top of the file, outside any function.

**Joining tables:** Supabase JS v2 infers nested join types automatically since v2.46.0. The syntax `item:items(...)` creates an `item` property typed from the `items` table columns you select. Use `!inner` to exclude rows where the join returns null:

```typescript
// Only returns items where category join succeeds (no nulls)
supabase.from('items')
  .select('id, name, category:categories!inner(name, requires_expiration)')
```

---

## Pattern 2: `.throwOnError()` on Every Query

Without `.throwOnError()`, Supabase returns errors *inside the response object*. TanStack Query never sees them — `query.error` is always `null` and errors are silently swallowed.

```typescript
// ❌ Before — errors silently swallowed, TQ never enters error state
const { data, error } = await supabase.from('items').select('*');
if (error) throw error; // This works but can be forgotten

// ✅ After — TQ catches the error automatically, query.isError works correctly
const { data } = await supabase.from('items').select('*').throwOnError();
```

**Add `.throwOnError()` to every Supabase query in every hook.** This is not optional — without it, `query.isError` and error boundaries cannot function.

For `Promise.all` across multiple queries:

```typescript
const [locationsResult, inventoryResult] = await Promise.all([
  locationsQuery.throwOnError(),
  inventoryStatsQuery.throwOnError(),
]);
```

---

## Pattern 3: `TablesInsert<>` and `TablesUpdate<>` for Mutations

Use the generated types for mutation inputs instead of hand-written interfaces. They are re-exported from `src/lib/supabase.ts`:

```typescript
import type { TablesInsert, TablesUpdate } from '@/lib/supabase';

// ❌ Before — manual interface that can drift from DB schema
interface CreateItemParams {
  name: string;
  category_id: number;
  unit: string;
  minimum_stock: number;
  price?: number;
}

// ✅ After — generated from DB schema, always in sync
export function useCreateItem() {
  return useMutation({
    mutationFn: async (item: TablesInsert<'items'>) => {
      const { data } = await supabase.from('items').insert([item]).select().throwOnError();
      return data?.[0];
    },
    // ...
  });
}

export function useUpdateItem() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TablesUpdate<'items'> }) => {
      await supabase.from('items').update(data).eq('id', id).throwOnError();
    },
    // ...
  });
}
```

`TablesInsert<'table'>` makes all non-nullable columns without defaults required. `TablesUpdate<'table'>` makes everything optional (partial update). Both are correct by default.

---

## Pattern 4: `onSettled` + Return the Promise

`onSuccess` only fires when the mutation succeeds. `onSettled` fires always (success or error), which is correct for cache invalidation. Returning the Promise keeps the mutation in `isPending` state until the refetch completes — the submit button stays disabled until fresh data is loaded.

```typescript
// ❌ Before — onSuccess only, button re-enables before data is fresh
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.items.withCounts() });
}

// ✅ After — onSettled always runs, Promise keeps isPending true during refetch
onSettled: () => {
  return queryClient.invalidateQueries({ queryKey: queryKeys.items.withCounts() });
}

// For mutations that affect multiple caches (e.g. inventory affects both
// inventory list AND location stats):
onSettled: () => {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.locations.withStats() }),
  ]);
}
```

**Always use `queryKeys.*` factory** — never write raw string arrays inline. The factory lives in `src/lib/queries/queryKeys.ts` and is the single source of truth for all cache keys.

---

## Pattern 5: Computed Fields via Post-Processing

When you need fields that don't exist directly on a DB row (e.g. `inventory_count`, `total_quantity`, `low_stock_count`), compute them in the `queryFn` after fetching, then extend the base type:

```typescript
// Base type from the query
type ItemBase = QueryData<typeof itemsWithCategoryQuery>[number];

// Extended with computed fields
export type ItemWithCategory = ItemBase & {
  inventory_count: number;
  total_quantity: number;
};

// Compute in queryFn
queryFn: async () => {
  const [{ data: items }, { data: inventory }] = await Promise.all([
    itemsWithCategoryQuery.throwOnError(),
    inventoryCountQuery.throwOnError(),
  ]);

  return (items ?? []).map((item) => {
    const itemInventory = (inventory ?? []).filter((inv) => inv.item_id === item.id);
    return {
      ...item,
      inventory_count: itemInventory.length,
      total_quantity: itemInventory.reduce((sum, inv) => sum + inv.quantity, 0),
    };
  });
},
```

---

## Full Hook File Template

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryData } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { TablesInsert, TablesUpdate } from '@/lib/supabase';
import { queryKeys } from '../queryKeys';

// ── 1. Query constants at module level ────────────────────────────────────────

const thingsQuery = supabase
  .from('things')
  .select('*, related:other_table(id, name)')
  .order('name');

// ── 2. Types derived from queries ─────────────────────────────────────────────

export type Thing = QueryData<typeof thingsQuery>[number];

// ── 3. Query hooks ────────────────────────────────────────────────────────────

export function useThings() {
  return useQuery({
    queryKey: queryKeys.things.all(),
    queryFn: async () => {
      const { data } = await thingsQuery.throwOnError();
      return data ?? [];
    },
  });
}

// ── 4. Mutation hooks ─────────────────────────────────────────────────────────

export function useCreateThing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<'things'>) => {
      const { data } = await supabase.from('things').insert([input]).select().throwOnError();
      return data?.[0];
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: queryKeys.things.all() });
    },
  });
}

export function useUpdateThing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: TablesUpdate<'things'> }) => {
      await supabase.from('things').update(updates).eq('id', id).throwOnError();
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: queryKeys.things.all() });
    },
  });
}

export function useDeleteThing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await supabase.from('things').delete().eq('id', id).throwOnError();
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: queryKeys.things.all() });
    },
  });
}
```

---

## Component Rules

**Components consume hooks — nothing else.**

```typescript
// ✅ Correct
import { useItemsWithCounts, useDeleteItem } from '@/lib/queries/hooks/useItems';

export default function ItemsPage() {
  const { data: items = [], isLoading } = useItemsWithCounts();
  const deleteItem = useDeleteItem();

  // Use data, call mutate — that's it
}

// ❌ Never do this in a component
import { supabase } from '@/lib/supabase';
const { data } = await supabase.from('items').select('*'); // No
```

**Prop types come from the hook's exported types, not redeclared inline:**

```typescript
// ✅ Import the hook type
import type { ItemWithCategory } from '@/lib/queries/hooks/useItems';
interface EditItemDialogProps {
  item: ItemWithCategory; // from the hook
}

// ❌ Don't redeclare a parallel interface
interface Item { id: number; name: string; /* ... */ } // drifts from DB
```

---

## Adding a New Query Key

Every new domain entity needs entries in `src/lib/queries/queryKeys.ts`:

```typescript
export const queryKeys = {
  // ... existing keys ...

  reservations: {
    all: () => ['reservations'] as const,
    byRoom: (roomId: number) => ['reservations', 'byRoom', roomId] as const,
    detail: (id: number) => ['reservations', id] as const,
  },
};
```

Use `number` for DB IDs — they are integers in PostgreSQL, not strings.

---

## Test Patterns for This Architecture

### Hook tests — mutable proxy mock

Module-level query constants call `supabase.from()` at **import time**, before any test runs. Regular `mockReturnValue` approaches don't work. Use `vi.hoisted()` to create shared mutable state the proxy reads at resolve time:

```typescript
const mockState = vi.hoisted(() => ({
  items: { data: [] as unknown, error: null as unknown },
  categories: { data: [] as unknown, error: null as unknown },
}));

vi.mock('@/lib/supabase', () => {
  function makeProxy(table: string): unknown {
    const handler: ProxyHandler<object> = {
      get(_target, prop: string | symbol) {
        if (prop === 'then') {
          const record = (mockState as Record<string, { data: unknown; error: unknown }>)[table]
            ?? { data: [], error: null };
          if (record.error !== null) {
            return (_resolve: unknown, reject?: (e: unknown) => void) => {
              if (typeof reject === 'function') reject(record.error);
            };
          }
          return (resolve: (v: unknown) => void) => resolve({ data: record.data });
        }
        return vi.fn().mockReturnValue(new Proxy({}, handler));
      },
    };
    return new Proxy({}, handler);
  }

  return {
    supabase: { from: vi.fn((table: string) => makeProxy(table)) },
  };
});

// In each test, mutate mockState to control per-table data:
beforeEach(() => {
  mockState.items = { data: [itemRow], error: null };
});
```

### Component tests — mock the hooks, not Supabase

Components should have their hooks mocked entirely. This keeps component tests focused on UI behavior, not data fetching:

```typescript
vi.mock('@/lib/queries/hooks/useItems', () => ({
  useItemsWithCounts: vi.fn(),
  useDeleteItem: vi.fn(),
}));

import { useItemsWithCounts, useDeleteItem } from '@/lib/queries/hooks/useItems';

beforeEach(() => {
  vi.mocked(useItemsWithCounts).mockReturnValue({
    data: [mockItem],
    isLoading: false,
  } as unknown as ReturnType<typeof useItemsWithCounts>);
});
```

Note the `as unknown as ReturnType<typeof ...>` cast — necessary because the mock only provides the fields the component actually uses, not the full TanStack Query result object.

### `.throwOnError()` is testable

The proxy mock's `then` handler throws when `error !== null`. This means error-state tests work correctly:

```typescript
it('surfaces error when fetch fails', async () => {
  mockState.items = { data: null, error: new Error('DB error') };

  const { result } = renderHook(() => useItems(), { wrapper: createWrapper() });

  await waitFor(() => expect(result.current.isError).toBe(true));
  // This only passes because .throwOnError() is in the hook
});
```

---

## Migration Checklist

When migrating a new domain module (e.g. reservations, guests):

- [ ] Create `src/lib/queries/hooks/useDomain.ts`
- [ ] Define query constants at module level (outside hooks)
- [ ] Export types via `QueryData<typeof query>[number]`
- [ ] Add `.throwOnError()` to every query
- [ ] Use `TablesInsert<'table'>` / `TablesUpdate<'table'>` for mutation inputs
- [ ] Use `onSettled` returning `queryClient.invalidateQueries(...)` Promise
- [ ] Add new keys to `queryKeys.ts` (IDs as `number`)
- [ ] Update components to import types from the hook file
- [ ] Write co-located `.test.ts` file using the proxy mock pattern
- [ ] Remove any manual type interfaces that duplicate DB columns
- [ ] Run `npm run validate:fast` — typecheck + lint + tests + build
