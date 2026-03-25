// Query key factory for all entities — single source of truth for cache keys.
// Use these keys in all useQuery/useMutation calls to ensure consistent cache behavior.

export const queryKeys = {
  rooms: {
    all: () => ['rooms'] as const,
    detail: (id: string) => ['rooms', id] as const,
    byFloor: (floor: number) => ['rooms', 'floor', floor] as const,
  },
  guests: {
    all: () => ['guests'] as const,
    detail: (id: string) => ['guests', id] as const,
    search: (query: string) => ['guests', 'search', query] as const,
  },
  reservations: {
    all: () => ['reservations'] as const,
    detail: (id: string) => ['reservations', id] as const,
    byDateRange: (start: string, end: string) => ['reservations', 'range', start, end] as const,
    list: (params: object) => ['reservations', 'list', params] as const,
  },
  reservationCharges: {
    byReservation: (id: number) => ['reservationCharges', id] as const,
  },
  invoices: {
    all: () => ['invoices'] as const,
    detail: (id: string) => ['invoices', id] as const,
  },
  companies: {
    all: () => ['companies'] as const,
    detail: (id: string) => ['companies', id] as const,
  },
  pricingTiers: {
    all: () => ['pricingTiers'] as const,
    detail: (id: string) => ['pricingTiers', id] as const,
  },
  labels: {
    all: () => ['labels'] as const,
    detail: (id: string) => ['labels', id] as const,
  },
  locations: {
    all: () => ['locations'] as const,
    withStats: () => ['locations', 'withStats'] as const,
    detail: (id: number) => ['locations', id] as const,
  },
  items: {
    withCounts: () => ['items', 'withCounts'] as const,
    active: () => ['items', 'active'] as const,
  },
  categories: {
    all: () => ['categories'] as const,
  },
  orders: {
    availableItems: () => ['orders', 'availableItems'] as const,
  },
  inventory: {
    all: () => ['inventory'] as const,
  },
  auditLogs: {
    all: () => ['auditLogs'] as const,
  },
  userRoles: {
    all: () => ['userRoles'] as const,
  },
  roomService: {
    foodAndBeverage: () => ['roomService', 'foodAndBeverage'] as const,
  },
} as const;
