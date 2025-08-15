// SupabaseHotelProvider.tsx - Hotel data provider with Supabase integration
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface Hotel {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
}

interface HotelContextType {
  hotel: Hotel | null;
  loading: boolean;
  setHotel: (hotel: Hotel) => void;
  supabase: typeof supabase;
}

const HotelContext = createContext<HotelContextType | undefined>(undefined);

export const useHotel = () => {
  const context = useContext(HotelContext);
  if (!context) {
    throw new Error('useHotel must be used within a SupabaseHotelProvider');
  }
  return context;
};

interface SupabaseHotelProviderProps {
  children: ReactNode;
}

export const SupabaseHotelProvider: React.FC<SupabaseHotelProviderProps> = ({ children }) => {
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load default hotel or get from user session
    const mockHotel: Hotel = {
      id: '1',
      name: 'Test Hotel',
      address: '123 Test St',
      phone: '+1234567890',
      email: 'test@hotel.com'
    };
    setHotel(mockHotel);
    setLoading(false);
  }, []);

  const value = {
    hotel,
    loading,
    setHotel,
    supabase
  };

  return (
    <HotelContext.Provider value={value}>
      {children}
    </HotelContext.Provider>
  );
};