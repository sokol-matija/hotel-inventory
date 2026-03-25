// useLocationState - Location inventory state management hook
// Manages server state via TanStack Query and local UI state via useState

import { useState, useMemo, useCallback } from 'react';
import { useParams } from '@tanstack/react-router';
import { useAuth } from '@/stores/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queries/queryKeys';
import {
  LocationService,
  Location,
  InventoryItem,
  InventoryFilters,
  DragOperation,
} from '../services/LocationService';

export interface LocationState {
  // Core data
  location: Location | null;
  inventory: InventoryItem[];
  filteredInventory: InventoryItem[];

  // UI state
  loading: boolean;
  searchTerm: string;
  selectedCategory: string;
  showAddDialog: boolean;
  editingQuantity: number | null;
  tempQuantity: string;
  orderingMode: boolean;
  supportsOrdering: boolean;
  activeId: number | null;

  // Error state
  error: string | null;
}

export function useLocationState() {
  const { id } = useParams({ strict: false });
  const { user } = useAuth();
  const locationService = LocationService.getInstance();
  const queryClient = useQueryClient();

  // UI state
  const [searchTerm, setSearchTermState] = useState('');
  const [selectedCategory, setSelectedCategoryState] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingQuantity, setEditingQuantityState] = useState<number | null>(null);
  const [tempQuantity, setTempQuantityState] = useState('');
  const [orderingMode, setOrderingModeState] = useState(false);
  const [activeId, setActiveIdState] = useState<number | null>(null);

  // Server state via TQ
  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: queryKeys.locations.detail(Number(id ?? 0)),
    queryFn: () => locationService.fetchLocationData(id!),
    enabled: !!id,
  });

  const location = data?.location ?? null;
  const inventory = useMemo(() => data?.inventory ?? [], [data]);

  // Computed values
  const filters: InventoryFilters = useMemo(
    () => ({ searchTerm, selectedCategory }),
    [searchTerm, selectedCategory]
  );

  const filteredInventory = useMemo(
    () => locationService.filterInventory(inventory, filters),
    [inventory, filters, locationService]
  );

  const uniqueCategories = useMemo(
    () => locationService.getUniqueCategories(inventory),
    [inventory, locationService]
  );

  const locationStats = useMemo(
    () => locationService.getLocationStats(inventory),
    [inventory, locationService]
  );

  // Mutations
  const updateQuantityMutation = useMutation({
    mutationFn: ({ inventoryId, newQuantity }: { inventoryId: number; newQuantity: number }) =>
      locationService.updateQuantity(inventoryId, newQuantity, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.detail(Number(id ?? 0)) });
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.withStats() });
      setEditingQuantityState(null);
      setTempQuantityState('');
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (inventoryId: number) => locationService.deleteInventoryItem(inventoryId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.detail(Number(id ?? 0)) });
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.withStats() });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: ({
      inventory: inv,
      dragOperation,
    }: {
      inventory: InventoryItem[];
      dragOperation: DragOperation;
    }) => locationService.updateInventoryOrder(inv, dragOperation, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.detail(Number(id ?? 0)) });
      setActiveIdState(null);
    },
    onError: () => {
      setActiveIdState(null);
    },
  });

  // Build state object (same shape as before for component compatibility)
  const state: LocationState = {
    location,
    inventory,
    filteredInventory,
    loading: isLoading,
    searchTerm,
    selectedCategory,
    showAddDialog,
    editingQuantity,
    tempQuantity,
    orderingMode,
    supportsOrdering: true,
    activeId,
    error: queryError instanceof Error ? queryError.message : null,
  };

  // Data operations
  const fetchLocationData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.locations.detail(Number(id ?? 0)) });
  }, [queryClient, id]);

  const refreshAfterAdd = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.locations.detail(Number(id ?? 0)) });
    queryClient.invalidateQueries({ queryKey: queryKeys.locations.withStats() });
    setShowAddDialog(false);
  }, [queryClient, id]);

  // Search and filtering
  const setSearchTerm = useCallback((term: string) => setSearchTermState(term), []);
  const setSelectedCategory = useCallback((cat: string) => setSelectedCategoryState(cat), []);
  const clearFilters = useCallback(() => {
    setSearchTermState('');
    setSelectedCategoryState('all');
  }, []);

  // Dialog management
  const openAddDialog = useCallback(() => setShowAddDialog(true), []);
  const closeAddDialog = useCallback(() => setShowAddDialog(false), []);

  // Quantity editing
  const startEditingQuantity = useCallback((inventoryId: number, currentQuantity: number) => {
    setEditingQuantityState(inventoryId);
    setTempQuantityState(currentQuantity.toString());
  }, []);

  const cancelEditingQuantity = useCallback(() => {
    setEditingQuantityState(null);
    setTempQuantityState('');
  }, []);

  const saveQuantity = useCallback(
    async (inventoryId: number) => {
      if (!user?.id) return;
      const newQuantity = parseInt(tempQuantity, 10);
      if (isNaN(newQuantity) || newQuantity < 0) return;
      updateQuantityMutation.mutate({ inventoryId, newQuantity });
    },
    [user?.id, tempQuantity, updateQuantityMutation]
  );

  const setTempQuantity = useCallback((q: string) => setTempQuantityState(q), []);

  // Item deletion
  const deleteItem = useCallback(
    async (inventoryId: number) => {
      if (!user?.id) return;
      deleteItemMutation.mutate(inventoryId);
    },
    [user?.id, deleteItemMutation]
  );

  // Drag and drop
  const toggleOrderingMode = useCallback(() => setOrderingModeState((prev) => !prev), []);

  const setActiveId = useCallback((id: number | null) => setActiveIdState(id), []);

  const handleDragEnd = useCallback(
    async (fromIndex: number, toIndex: number, itemId: number) => {
      if (!user?.id || fromIndex === toIndex) return;
      const dragOperation: DragOperation = { fromIndex, toIndex, itemId };
      reorderMutation.mutate({ inventory: filteredInventory, dragOperation });
    },
    [user?.id, filteredInventory, reorderMutation]
  );

  // Error management
  const clearError = useCallback(() => {}, []);

  // Helper functions using service
  const getExpirationStatus = useCallback(
    (expirationDate?: string) => locationService.getExpirationStatus(expirationDate),
    [locationService]
  );

  const isLowStock = useCallback(
    (item: InventoryItem) => locationService.isLowStock(item),
    [locationService]
  );

  const translateCategory = useCallback(
    (categoryName: string) => locationService.translateCategory(categoryName),
    [locationService]
  );

  // no-op — kept for API compatibility
  const updateState = useCallback(() => {}, []);

  return {
    state,
    uniqueCategories,
    locationStats,
    fetchLocationData,
    refreshAfterAdd,
    setSearchTerm,
    setSelectedCategory,
    clearFilters,
    openAddDialog,
    closeAddDialog,
    startEditingQuantity,
    cancelEditingQuantity,
    saveQuantity,
    setTempQuantity,
    deleteItem,
    toggleOrderingMode,
    setActiveId,
    handleDragEnd,
    clearError,
    getExpirationStatus,
    isLowStock,
    translateCategory,
    updateState,
  };
}
