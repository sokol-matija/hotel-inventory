# Reservation Label/Group Feature Implementation Plan

**Date**: November 4, 2025
**Feature**: Add label/group feature for tracking related reservations
**Status**: Planning Complete ✅ → Ready for Implementation

---

## 📋 Feature Requirements

### Business Context
- Track groups of guests together (e.g., "german-bikers" - 10 bikers across multiple rooms)
- Visual indicator in timeline to show which reservations belong to same group
- Autocomplete search when creating/editing reservations
- Reusable labels across multiple reservations

### UI Requirements
1. **Timeline View**: Small white label badge at top of reservation card showing group name
2. **Room Status Overview**: Label displayed at top of status cards
3. **Create Booking Modal**: Autocomplete input with search-as-you-type functionality
4. **Label Format**: Lowercase with hyphens (e.g., "german-bikers", "bikers-germany")

---

## 🗄️ Database Schema Design

### New Table: `labels`
```sql
CREATE TABLE labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6', -- Default blue color
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique label names per hotel
  CONSTRAINT labels_hotel_name_unique UNIQUE (hotel_id, name),

  -- Lowercase validation
  CONSTRAINT labels_name_lowercase CHECK (name = LOWER(name))
);

-- Index for fast search
CREATE INDEX idx_labels_hotel_name ON labels(hotel_id, name);
CREATE INDEX idx_labels_name_search ON labels USING gin(name gin_trgm_ops);
```

### Update: `reservations` Table
```sql
ALTER TABLE reservations
ADD COLUMN label_id UUID REFERENCES labels(id) ON DELETE SET NULL;

-- Index for fast label lookups
CREATE INDEX idx_reservations_label_id ON reservations(label_id);
```

### Enable RLS
```sql
-- Labels table RLS
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view labels for their hotel"
  ON labels FOR SELECT
  TO authenticated
  USING (hotel_id IN (
    SELECT hotel_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create labels for their hotel"
  ON labels FOR INSERT
  TO authenticated
  WITH CHECK (hotel_id IN (
    SELECT hotel_id FROM user_profiles WHERE user_id = auth.uid()
  ));
```

---

## 📁 TypeScript Type Definitions

### New Interface: `Label`
```typescript
// src/lib/hotel/types.ts

export interface Label {
  id: string;
  hotelId: string;
  name: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type LabelCreate = Omit<Label, 'id' | 'createdAt' | 'updatedAt'>;
export type LabelUpdate = Partial<Pick<Label, 'name' | 'color'>>;
```

### Update: `Reservation` Interface
```typescript
export interface Reservation {
  // ... existing fields
  labelId?: string;
  label?: Label; // For joined queries
  // ... rest of fields
}
```

---

## 🛠️ Service Layer Implementation

### New Service: `LabelService`
**Location**: `src/lib/hotel/services/LabelService.ts`

```typescript
export class LabelService {
  private static instance: LabelService;

  static getInstance(): LabelService {
    if (!LabelService.instance) {
      LabelService.instance = new LabelService();
    }
    return LabelService.instance;
  }

  // Search labels by partial name (autocomplete)
  async searchLabels(hotelId: string, query: string): Promise<Label[]> {
    const { data, error } = await supabase
      .from('labels')
      .select('*')
      .eq('hotel_id', hotelId)
      .ilike('name', `%${query.toLowerCase()}%`)
      .order('name')
      .limit(10);

    if (error) throw error;
    return this.mapLabels(data);
  }

  // Create new label
  async createLabel(labelData: LabelCreate): Promise<Label> {
    const { data, error } = await supabase
      .from('labels')
      .insert({
        hotel_id: labelData.hotelId,
        name: labelData.name.toLowerCase().replace(/\s+/g, '-'),
        color: labelData.color || '#3b82f6'
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapLabel(data);
  }

  // Get label by ID
  async getLabelById(labelId: string): Promise<Label | null> {
    const { data, error } = await supabase
      .from('labels')
      .select('*')
      .eq('id', labelId)
      .single();

    if (error) return null;
    return this.mapLabel(data);
  }

  // List all labels for a hotel
  async listLabels(hotelId: string): Promise<Label[]> {
    const { data, error } = await supabase
      .from('labels')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('name');

    if (error) throw error;
    return this.mapLabels(data);
  }

  private mapLabel(data: any): Label {
    return {
      id: data.id,
      hotelId: data.hotel_id,
      name: data.name,
      color: data.color,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private mapLabels(data: any[]): Label[] {
    return data.map(this.mapLabel);
  }
}
```

---

## 🎨 UI Component Implementation

### Component 1: `LabelBadge`
**Location**: `src/components/hotel/shared/LabelBadge.tsx`

```typescript
interface LabelBadgeProps {
  label: Label;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LabelBadge: React.FC<LabelBadgeProps> = ({
  label,
  size = 'sm',
  className
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md font-medium",
        "bg-white border shadow-sm",
        sizeClasses[size],
        className
      )}
      style={{
        borderColor: label.color,
        color: label.color
      }}
    >
      {label.name}
    </span>
  );
};
```

### Component 2: `LabelAutocomplete`
**Location**: `src/components/hotel/shared/LabelAutocomplete.tsx`

```typescript
interface LabelAutocompleteProps {
  hotelId: string;
  value: string | null;
  onChange: (labelId: string | null) => void;
  placeholder?: string;
}

export const LabelAutocomplete: React.FC<LabelAutocompleteProps> = ({
  hotelId,
  value,
  onChange,
  placeholder = "Search or create label..."
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [labels, setLabels] = useState<Label[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const labelService = LabelService.getInstance();

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim()) {
        setIsLoading(true);
        try {
          const results = await labelService.searchLabels(hotelId, searchQuery);
          setLabels(results);
        } catch (error) {
          console.error('Error searching labels:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setLabels([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, hotelId]);

  const handleCreateLabel = async () => {
    try {
      const newLabel = await labelService.createLabel({
        hotelId,
        name: searchQuery,
        color: '#3b82f6'
      });
      onChange(newLabel.id);
      setOpen(false);
      setSearchQuery("");
    } catch (error) {
      console.error('Error creating label:', error);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="justify-between">
          {value ? labels.find(l => l.id === value)?.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput
            placeholder="Type to search..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoading && (
              <CommandEmpty>Loading...</CommandEmpty>
            )}
            {!isLoading && labels.length === 0 && searchQuery && (
              <CommandItem onSelect={handleCreateLabel}>
                <Plus className="mr-2 h-4 w-4" />
                Create "{searchQuery}"
              </CommandItem>
            )}
            {!isLoading && labels.length > 0 && (
              <CommandGroup>
                {labels.map((label) => (
                  <CommandItem
                    key={label.id}
                    value={label.id}
                    onSelect={() => {
                      onChange(label.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === label.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <LabelBadge label={label} size="sm" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
```

---

## 🔄 Component Updates

### Update 1: `ModernCreateBookingModal`
**Location**: `src/components/hotel/frontdesk/ModernCreateBookingModal.tsx`

**Changes**:
1. Add state for `selectedLabelId`
2. Add `LabelAutocomplete` component to form
3. Pass `labelId` to reservation creation service

```typescript
// Add to modal state
const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);

// Add to form UI (after company selection)
<div className="space-y-2">
  <Label>Group Label (Optional)</Label>
  <LabelAutocomplete
    hotelId={hotelId}
    value={selectedLabelId}
    onChange={setSelectedLabelId}
    placeholder="Search or create label..."
  />
</div>

// Update submission to include labelId
const reservationData = {
  // ... existing fields
  labelId: selectedLabelId,
  // ... rest of fields
};
```

### Update 2: `HotelTimeline` Reservation Cards
**Location**: `src/components/hotel/frontdesk/HotelTimeline.tsx`

**Changes**:
1. Fetch reservations with label join
2. Display `LabelBadge` at top of reservation cards

```typescript
// Update query to include label
const { data: reservations } = await supabase
  .from('reservations')
  .select(`
    *,
    guest:guests(*),
    label:labels(*)
  `)
  // ... rest of query

// In reservation card render
<div className="reservation-card">
  {reservation.label && (
    <div className="mb-1">
      <LabelBadge label={reservation.label} size="sm" />
    </div>
  )}
  {/* Rest of card content */}
</div>
```

### Update 3: Room Status Overview Cards
**Location**: Similar pattern to HotelTimeline

**Changes**:
- Display label at top of status cards
- Same query pattern with label join

---

## ✅ Implementation Checklist

### Phase 1: Database (30 minutes)
- [ ] Create migration file `20251104000001_add_labels.sql`
- [ ] Test migration on local Supabase
- [ ] Verify indexes and constraints
- [ ] Test RLS policies

### Phase 2: TypeScript Types (15 minutes)
- [ ] Add `Label` interface to `types.ts`
- [ ] Add utility types (`LabelCreate`, `LabelUpdate`)
- [ ] Update `Reservation` interface with `labelId` and `label?`
- [ ] Verify TypeScript compilation

### Phase 3: Service Layer (45 minutes)
- [ ] Create `LabelService.ts` with all CRUD methods
- [ ] Implement search functionality with debouncing
- [ ] Add error handling and validation
- [ ] Test service methods

### Phase 4: UI Components (60 minutes)
- [ ] Create `LabelBadge` component
- [ ] Create `LabelAutocomplete` component with Popover
- [ ] Test autocomplete search and create
- [ ] Style components to match design

### Phase 5: Integration (45 minutes)
- [ ] Update `ModernCreateBookingModal` with label selection
- [ ] Update `HotelTimeline` queries and rendering
- [ ] Update Room Status Overview cards
- [ ] Update `ReservationService` to handle labels

### Phase 6: Testing (30 minutes)
- [ ] Test label creation via autocomplete
- [ ] Test label search functionality
- [ ] Test reservation creation with labels
- [ ] Verify label display in timeline
- [ ] Verify label display in room status cards
- [ ] Test edge cases (duplicate names, empty labels, etc.)

---

## 🎯 Success Criteria

1. ✅ Users can create labels on-the-fly while booking
2. ✅ Autocomplete shows matching labels as user types
3. ✅ Labels appear on timeline reservation cards
4. ✅ Labels appear on room status cards
5. ✅ Multiple reservations can share same label
6. ✅ Label names are unique per hotel
7. ✅ No TypeScript errors
8. ✅ No console errors in browser
9. ✅ All existing functionality still works

---

## 📝 Implementation Notes

### Technical Decisions
1. **Lowercase normalization**: All labels stored as lowercase with hyphens
2. **Color support**: Future enhancement for visual distinction
3. **Soft delete**: Using `ON DELETE SET NULL` for reservations
4. **Search**: Using PostgreSQL `ilike` for simple case-insensitive search
5. **Autocomplete**: 300ms debounce for search performance

### Future Enhancements
- [ ] Color picker for custom label colors
- [ ] Label usage statistics
- [ ] Bulk label assignment
- [ ] Label management page (edit/delete labels)
- [ ] Label filtering in timeline view

---

## 🚀 Ready to Implement!

**Estimated Total Time**: 3.5 hours
**Priority**: High
**Complexity**: Medium

All planning complete. Ready for step-by-step implementation with user verification before coding begins.
