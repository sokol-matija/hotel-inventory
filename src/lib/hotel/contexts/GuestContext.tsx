// GuestContext - Modern React Context with proper error handling
// Clean separation from legacy hotel context

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { guestService, Guest, CreateGuestData, UpdateGuestData, GuestSearchFilters, GuestChild } from '../services/GuestService';

// Context state types
interface GuestContextState {
  guests: Guest[];
  selectedGuest: Guest | null;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  searchQuery: string;
  filters: GuestSearchFilters;
  lastUpdated: Date | null;
}

// Action types
type GuestAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_UPDATING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_GUESTS'; payload: Guest[] }
  | { type: 'SET_SELECTED_GUEST'; payload: Guest | null }
  | { type: 'ADD_GUEST'; payload: Guest }
  | { type: 'UPDATE_GUEST'; payload: Guest }
  | { type: 'REMOVE_GUEST'; payload: string }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_FILTERS'; payload: GuestSearchFilters }
  | { type: 'SET_LAST_UPDATED'; payload: Date };

// Context interface
interface GuestContextType {
  state: GuestContextState;
  
  // Actions
  loadGuests: (filters?: GuestSearchFilters) => Promise<void>;
  createGuest: (guestData: CreateGuestData) => Promise<Guest | null>;
  updateGuest: (id: string, updates: UpdateGuestData) => Promise<Guest | null>;
  deleteGuest: (id: string) => Promise<boolean>;
  selectGuest: (guest: Guest | null) => void;
  searchGuests: (query: string) => Promise<void>;
  setFilters: (filters: GuestSearchFilters) => void;
  clearError: () => void;
  refreshGuests: () => Promise<void>;
  
  // Child management
  addChildToGuest: (guestId: string, childData: Omit<GuestChild, 'id' | 'guestId' | 'currentAge'>) => Promise<boolean>;
  removeChildFromGuest: (childId: string, guestId: string) => Promise<boolean>;
  
  // Computed values
  filteredGuests: Guest[];
  totalGuests: number;
  vipGuests: Guest[];
  guestsWithPets: Guest[];
}

// Initial state
const initialState: GuestContextState = {
  guests: [],
  selectedGuest: null,
  isLoading: false,
  isUpdating: false,
  error: null,
  searchQuery: '',
  filters: {},
  lastUpdated: null,
};

// Reducer
function guestReducer(state: GuestContextState, action: GuestAction): GuestContextState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_UPDATING':
      return { ...state, isUpdating: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_GUESTS':
      return { ...state, guests: action.payload };
    
    case 'SET_SELECTED_GUEST':
      return { ...state, selectedGuest: action.payload };
    
    case 'ADD_GUEST':
      return { 
        ...state, 
        guests: [...state.guests, action.payload].sort((a, b) => a.lastName.localeCompare(b.lastName))
      };
    
    case 'UPDATE_GUEST':
      return {
        ...state,
        guests: state.guests.map(guest => 
          guest.id === action.payload.id ? action.payload : guest
        ).sort((a, b) => a.lastName.localeCompare(b.lastName)),
        selectedGuest: state.selectedGuest?.id === action.payload.id ? action.payload : state.selectedGuest
      };
    
    case 'REMOVE_GUEST':
      return {
        ...state,
        guests: state.guests.filter(guest => guest.id !== action.payload),
        selectedGuest: state.selectedGuest?.id === action.payload ? null : state.selectedGuest
      };
    
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    
    case 'SET_FILTERS':
      return { ...state, filters: action.payload };
    
    case 'SET_LAST_UPDATED':
      return { ...state, lastUpdated: action.payload };
    
    default:
      return state;
  }
}

// Context
const GuestContext = createContext<GuestContextType | undefined>(undefined);

// Provider component
export function GuestProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(guestReducer, initialState);

  // Load guests
  const loadGuests = useCallback(async (filters: GuestSearchFilters = {}) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const result = await guestService.getGuests(filters);
      
      if (result.success) {
        dispatch({ type: 'SET_GUESTS', payload: result.data });
        dispatch({ type: 'SET_LAST_UPDATED', payload: new Date() });
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.error });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load guests' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Create guest
  const createGuest = useCallback(async (guestData: CreateGuestData): Promise<Guest | null> => {
    dispatch({ type: 'SET_UPDATING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const result = await guestService.createGuest(guestData);
      
      if (result.success) {
        dispatch({ type: 'ADD_GUEST', payload: result.data });
        dispatch({ type: 'SET_LAST_UPDATED', payload: new Date() });
        return result.data;
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.error });
        return null;
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create guest' });
      return null;
    } finally {
      dispatch({ type: 'SET_UPDATING', payload: false });
    }
  }, []);

  // Update guest
  const updateGuest = useCallback(async (id: string, updates: UpdateGuestData): Promise<Guest | null> => {
    dispatch({ type: 'SET_UPDATING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const result = await guestService.updateGuest(id, updates);
      
      if (result.success) {
        dispatch({ type: 'UPDATE_GUEST', payload: result.data });
        dispatch({ type: 'SET_LAST_UPDATED', payload: new Date() });
        return result.data;
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.error });
        return null;
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update guest' });
      return null;
    } finally {
      dispatch({ type: 'SET_UPDATING', payload: false });
    }
  }, []);

  // Delete guest
  const deleteGuest = useCallback(async (id: string): Promise<boolean> => {
    dispatch({ type: 'SET_UPDATING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const result = await guestService.deleteGuest(id);
      
      if (result.success) {
        dispatch({ type: 'REMOVE_GUEST', payload: id });
        dispatch({ type: 'SET_LAST_UPDATED', payload: new Date() });
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.error });
        return false;
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete guest' });
      return false;
    } finally {
      dispatch({ type: 'SET_UPDATING', payload: false });
    }
  }, []);

  // Select guest
  const selectGuest = useCallback((guest: Guest | null) => {
    dispatch({ type: 'SET_SELECTED_GUEST', payload: guest });
  }, []);

  // Search guests
  const searchGuests = useCallback(async (query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
    
    if (!query.trim()) {
      await loadGuests(state.filters);
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const result = await guestService.searchGuests(query);
      
      if (result.success) {
        dispatch({ type: 'SET_GUESTS', payload: result.data });
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.error });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to search guests' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.filters, loadGuests]);

  // Set filters
  const setFilters = useCallback((filters: GuestSearchFilters) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  // Refresh guests
  const refreshGuests = useCallback(async () => {
    await loadGuests(state.filters);
  }, [loadGuests, state.filters]);

  // Add child to guest
  const addChildToGuest = useCallback(async (
    guestId: string, 
    childData: Omit<GuestChild, 'id' | 'guestId' | 'currentAge'>
  ): Promise<boolean> => {
    dispatch({ type: 'SET_UPDATING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const childResult = await guestService.addChildToGuest(guestId, childData);
      
      if (childResult.success) {
        // Reload the guest to get updated children
        const guestResult = await guestService.getGuestById(guestId);
        if (guestResult.success) {
          dispatch({ type: 'UPDATE_GUEST', payload: guestResult.data });
          dispatch({ type: 'SET_LAST_UPDATED', payload: new Date() });
        }
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: childResult.error });
        return false;
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to add child to guest' });
      return false;
    } finally {
      dispatch({ type: 'SET_UPDATING', payload: false });
    }
  }, []);

  // Remove child from guest
  const removeChildFromGuest = useCallback(async (childId: string, guestId: string): Promise<boolean> => {
    dispatch({ type: 'SET_UPDATING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const result = await guestService.removeChildFromGuest(childId);
      
      if (result.success) {
        // Reload the guest to get updated children
        const guestResult = await guestService.getGuestById(guestId);
        if (guestResult.success) {
          dispatch({ type: 'UPDATE_GUEST', payload: guestResult.data });
          dispatch({ type: 'SET_LAST_UPDATED', payload: new Date() });
        }
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.error });
        return false;
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to remove child from guest' });
      return false;
    } finally {
      dispatch({ type: 'SET_UPDATING', payload: false });
    }
  }, []);

  // Computed values
  const filteredGuests = React.useMemo(() => {
    let filtered = [...state.guests];

    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(guest => 
        guest.fullName.toLowerCase().includes(query) ||
        guest.email?.toLowerCase().includes(query) ||
        guest.phone?.includes(query)
      );
    }

    return filtered;
  }, [state.guests, state.searchQuery]);

  const totalGuests = state.guests.length;
  const vipGuests = state.guests.filter(guest => guest.isVip);
  const guestsWithPets = state.guests.filter(guest => guest.hasPets);

  // Load initial data
  useEffect(() => {
    loadGuests();
  }, []); // Empty dependency array is fine here - we only want to load once

  const contextValue: GuestContextType = {
    state,
    loadGuests,
    createGuest,
    updateGuest,
    deleteGuest,
    selectGuest,
    searchGuests,
    setFilters,
    clearError,
    refreshGuests,
    addChildToGuest,
    removeChildFromGuest,
    filteredGuests,
    totalGuests,
    vipGuests,
    guestsWithPets,
  };

  return (
    <GuestContext.Provider value={contextValue}>
      {children}
    </GuestContext.Provider>
  );
}

// Hook to use guest context
export function useGuests(): GuestContextType {
  const context = useContext(GuestContext);
  if (context === undefined) {
    throw new Error('useGuests must be used within a GuestProvider');
  }
  return context;
}