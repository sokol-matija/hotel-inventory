// useLocationState - Location inventory state management hook
// Manages all location-related state and operations

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { LocationService, Location, InventoryItem, InventoryFilters, DragOperation } from '../services/LocationService';

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

const initialState: LocationState = {
  location: null,
  inventory: [],
  filteredInventory: [],
  loading: true,
  searchTerm: '',
  selectedCategory: 'all',
  showAddDialog: false,
  editingQuantity: null,
  tempQuantity: '',
  orderingMode: false,
  supportsOrdering: false,
  activeId: null,
  error: null
};

export function useLocationState() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const locationService = LocationService.getInstance();
  
  const [state, setState] = useState<LocationState>(initialState);

  // Computed values
  const filters: InventoryFilters = useMemo(() => ({
    searchTerm: state.searchTerm,
    selectedCategory: state.selectedCategory
  }), [state.searchTerm, state.selectedCategory]);

  const uniqueCategories = useMemo(() => 
    locationService.getUniqueCategories(state.inventory),
    [state.inventory, locationService]
  );

  const locationStats = useMemo(() => 
    locationService.getLocationStats(state.inventory),
    [state.inventory, locationService]
  );

  // Apply filters whenever inventory or filters change
  useEffect(() => {
    const filtered = locationService.filterInventory(state.inventory, filters);
    setState(prev => ({ ...prev, filteredInventory: filtered }));
  }, [state.inventory, filters, locationService]);

  // Load data when location ID changes
  useEffect(() => {
    if (id) {
      fetchLocationData();
    }
  }, [id]);

  // State updaters
  const updateState = useCallback(<K extends keyof LocationState>(
    updates: Pick<LocationState, K>
  ) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Data operations
  const fetchLocationData = useCallback(async () => {
    if (!id) return;

    try {
      updateState({ loading: true, error: null });
      
      const { location, inventory } = await locationService.fetchLocationData(id);
      
      updateState({
        location,
        inventory,
        supportsOrdering: true, // Display order column exists
        loading: false
      });
    } catch (error) {
      console.error('Error fetching location data:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Failed to load location data',
        loading: false
      });
    }
  }, [id, locationService, updateState]);

  // Search and filtering
  const setSearchTerm = useCallback((searchTerm: string) => {
    updateState({ searchTerm });
  }, [updateState]);

  const setSelectedCategory = useCallback((selectedCategory: string) => {
    updateState({ selectedCategory });
  }, [updateState]);

  const clearFilters = useCallback(() => {
    updateState({
      searchTerm: '',
      selectedCategory: 'all'
    });
  }, [updateState]);

  // Dialog management
  const openAddDialog = useCallback(() => {
    updateState({ showAddDialog: true });
  }, [updateState]);

  const closeAddDialog = useCallback(() => {
    updateState({ showAddDialog: false });
  }, [updateState]);

  const refreshAfterAdd = useCallback(() => {
    fetchLocationData();
    closeAddDialog();
  }, [fetchLocationData, closeAddDialog]);

  // Quantity editing
  const startEditingQuantity = useCallback((inventoryId: number, currentQuantity: number) => {
    updateState({
      editingQuantity: inventoryId,
      tempQuantity: currentQuantity.toString()
    });
  }, [updateState]);

  const cancelEditingQuantity = useCallback(() => {
    updateState({
      editingQuantity: null,
      tempQuantity: ''
    });
  }, [updateState]);

  const saveQuantity = useCallback(async (inventoryId: number) => {
    if (!user?.id) return;

    try {
      const newQuantity = parseInt(state.tempQuantity, 10);
      if (isNaN(newQuantity) || newQuantity < 0) {
        throw new Error('Invalid quantity');
      }

      await locationService.updateQuantity(inventoryId, newQuantity, user.id);
      
      // Update local state
      const updatedInventory = state.inventory.map(item =>
        item.id === inventoryId ? { ...item, quantity: newQuantity } : item
      );
      
      updateState({
        inventory: updatedInventory,
        editingQuantity: null,
        tempQuantity: ''
      });
    } catch (error) {
      console.error('Error updating quantity:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Failed to update quantity'
      });
    }
  }, [state.tempQuantity, state.inventory, user?.id, locationService, updateState]);

  const setTempQuantity = useCallback((tempQuantity: string) => {
    updateState({ tempQuantity });
  }, [updateState]);

  // Item deletion
  const deleteItem = useCallback(async (inventoryId: number) => {
    if (!user?.id) return;

    try {
      await locationService.deleteInventoryItem(inventoryId, user.id);
      
      // Update local state
      const updatedInventory = state.inventory.filter(item => item.id !== inventoryId);
      updateState({ inventory: updatedInventory });
    } catch (error) {
      console.error('Error deleting item:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Failed to delete item'
      });
    }
  }, [state.inventory, user?.id, locationService, updateState]);

  // Drag and drop operations
  const toggleOrderingMode = useCallback(() => {
    updateState({ orderingMode: !state.orderingMode });
  }, [state.orderingMode, updateState]);

  const setActiveId = useCallback((activeId: number | null) => {
    updateState({ activeId });
  }, [updateState]);

  const handleDragEnd = useCallback(async (fromIndex: number, toIndex: number, itemId: number) => {
    if (!user?.id || fromIndex === toIndex) return;

    try {
      const dragOperation: DragOperation = {
        fromIndex,
        toIndex,
        itemId
      };

      const reorderedInventory = await locationService.updateInventoryOrder(
        state.filteredInventory,
        dragOperation,
        user.id
      );

      // Update both inventory and filtered inventory
      updateState({
        inventory: reorderedInventory,
        filteredInventory: reorderedInventory,
        activeId: null
      });
    } catch (error) {
      console.error('Error updating order:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Failed to save item order',
        activeId: null
      });
    }
  }, [state.filteredInventory, user?.id, locationService, updateState]);

  // Error management
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // Helper functions using service
  const getExpirationStatus = useCallback((expirationDate?: string) => {
    return locationService.getExpirationStatus(expirationDate);
  }, [locationService]);

  const isLowStock = useCallback((item: InventoryItem) => {
    return locationService.isLowStock(item);
  }, [locationService]);

  const translateCategory = useCallback((categoryName: string) => {
    return locationService.translateCategory(categoryName);
  }, [locationService]);

  return {
    // State
    state,
    
    // Computed values
    uniqueCategories,
    locationStats,
    
    // Data operations
    fetchLocationData,
    refreshAfterAdd,
    
    // Search and filtering
    setSearchTerm,
    setSelectedCategory,
    clearFilters,
    
    // Dialog management
    openAddDialog,
    closeAddDialog,
    
    // Quantity editing
    startEditingQuantity,
    cancelEditingQuantity,
    saveQuantity,
    setTempQuantity,
    
    // Item operations
    deleteItem,
    
    // Drag and drop
    toggleOrderingMode,
    setActiveId,
    handleDragEnd,
    
    // Error management
    clearError,
    
    // Helper functions
    getExpirationStatus,
    isLowStock,
    translateCategory,
    
    // Direct state updates (for complex cases)
    updateState
  };
}