/**
 * Enhanced Daily View Modal - Individual Guest/Object Day Tracking
 * 
 * Allows management of:
 * - Individual guest presence per day (adults, children)
 * - Dynamic check-in/check-out within booking period
 * - Service tracking (parking, pets, towels) per day
 * - Real-time pricing calculations
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Users, Baby, Car, Heart, Shirt, Calendar, Plus, Minus, Check, Save, AlertCircle } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { unifiedPricingService, DayByDayPricingResult } from '../../../../lib/hotel/services/UnifiedPricingService';
import { format, addDays, differenceInDays } from 'date-fns';
import { supabase } from '../../../../lib/supabase';

interface EnhancedDailyViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservationId: string;
  reservationTitle: string;
}

interface Guest {
  id: string;
  name: string;
  type: 'adult' | 'child';
  age?: number;
}

interface DayGuestPresence {
  guestId: string;
  isPresent: boolean;
}

interface DayServices {
  parkingSpots: number;
  hasPets: boolean;
  petCount: number;
  towelRentals: number;
}

interface DayState {
  date: Date;
  guestPresences: DayGuestPresence[];
  services: DayServices;
  notes: string;
  dailyTotal: number;
  hasChanges: boolean;
}

export const EnhancedDailyViewModal: React.FC<EnhancedDailyViewModalProps> = ({
  isOpen,
  onClose,
  reservationId,
  reservationTitle
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Core data
  const [reservation, setReservation] = useState<any>(null);
  const [allGuests, setAllGuests] = useState<Guest[]>([]);
  const [dayStates, setDayStates] = useState<DayState[]>([]);
  const [pricingData, setPricingData] = useState<DayByDayPricingResult | null>(null);
  
  // UI state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load reservation and guest data
  const loadReservationData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get reservation with guests
      const { data: reservationData, error: reservationError } = await supabase
        .from('reservations')
        .select(`
          *,
          guest:guests(*),
          guest_children (*)
        `)
        .eq('id', reservationId)
        .single();

      if (reservationError) throw reservationError;
      setReservation(reservationData);

      // Build all guests list
      const guests: Guest[] = [];
      
      // Add main guest (adult)
      if (reservationData.guest) {
        guests.push({
          id: reservationData.guest.id,
          name: reservationData.guest.full_name,
          type: 'adult'
        });
      }

      // Add children
      if (reservationData.guest_children) {
        reservationData.guest_children.forEach((child: any) => {
          guests.push({
            id: child.id,
            name: child.name,
            type: 'child',
            age: child.age
          });
        });
      }

      setAllGuests(guests);

      // Initialize day states
      const checkIn = new Date(reservationData.check_in);
      const checkOut = new Date(reservationData.check_out);
      const days: DayState[] = [];

      for (let date = new Date(checkIn); date < checkOut; date.setDate(date.getDate() + 1)) {
        days.push({
          date: new Date(date),
          guestPresences: guests.map(guest => ({
            guestId: guest.id,
            isPresent: true // Default: all guests present all days
          })),
          services: {
            parkingSpots: reservationData.parking_required ? 1 : 0,
            hasPets: reservationData.has_pets || false,
            petCount: reservationData.pet_count || 0,
            towelRentals: 0
          },
          notes: '',
          dailyTotal: 0,
          hasChanges: false
        });
      }

      setDayStates(days);

      // Calculate initial pricing
      await calculatePricing(days);

    } catch (err) {
      console.error('Error loading reservation data:', err);
      setError('Failed to load reservation data');
    } finally {
      setLoading(false);
    }
  }, [reservationId]);

  // Calculate pricing for current day states
  const calculatePricing = async (states: DayState[]) => {
    try {
      const dailyDetails = states.map(dayState => {
        const presentGuests = allGuests.filter(guest => 
          dayState.guestPresences.find(p => p.guestId === guest.id)?.isPresent
        );

        return {
          date: dayState.date,
          adultsPresent: presentGuests.filter(g => g.type === 'adult').length,
          childrenPresent: presentGuests.filter(g => g.type === 'child').map(g => g.id),
          parkingSpots: dayState.services.parkingSpots,
          hasPets: dayState.services.hasPets,
          towelRentals: dayState.services.towelRentals
        };
      });

      const pricingResult = await unifiedPricingService.calculateDayByDayBreakdown({
        reservationId,
        dailyDetails
      });

      setPricingData(pricingResult);

      // Update daily totals in day states
      const updatedStates = states.map((dayState, index) => ({
        ...dayState,
        dailyTotal: pricingResult.dailyBreakdown[index]?.pricing.dailyTotal || 0
      }));

      setDayStates(updatedStates);

    } catch (err) {
      console.error('Error calculating pricing:', err);
      setError('Failed to calculate pricing');
    }
  };

  // Handle guest presence toggle
  const toggleGuestPresence = async (dayIndex: number, guestId: string) => {
    const updatedStates = [...dayStates];
    const dayState = updatedStates[dayIndex];
    
    const presenceIndex = dayState.guestPresences.findIndex(p => p.guestId === guestId);
    if (presenceIndex >= 0) {
      dayState.guestPresences[presenceIndex].isPresent = !dayState.guestPresences[presenceIndex].isPresent;
      dayState.hasChanges = true;
      
      setDayStates(updatedStates);
      setHasUnsavedChanges(true);
      
      // Recalculate pricing
      await calculatePricing(updatedStates);
    }
  };

  // Handle service changes
  const updateDayServices = async (dayIndex: number, field: keyof DayServices, value: number | boolean) => {
    const updatedStates = [...dayStates];
    const dayState = updatedStates[dayIndex];
    
    (dayState.services as any)[field] = value;
    dayState.hasChanges = true;
    
    setDayStates(updatedStates);
    setHasUnsavedChanges(true);
    
    // Recalculate pricing
    await calculatePricing(updatedStates);
  };

  // Save all changes
  const saveAllChanges = async () => {
    try {
      setSaving(true);
      setError(null);

      for (const dayState of dayStates) {
        if (dayState.hasChanges) {
          const presentGuests = allGuests.filter(guest => 
            dayState.guestPresences.find(p => p.guestId === guest.id)?.isPresent
          );

          await unifiedPricingService.updateGuestDayPresence({
            reservationId,
            stayDate: dayState.date,
            adultsPresent: presentGuests.filter(g => g.type === 'adult').length,
            childrenPresent: presentGuests.filter(g => g.type === 'child').map(g => g.id),
            parkingSpots: dayState.services.parkingSpots,
            hasPets: dayState.services.hasPets,
            petCount: dayState.services.petCount,
            towelRentals: dayState.services.towelRentals,
            notes: dayState.notes
          });
        }
      }

      // Mark all as saved
      const updatedStates = dayStates.map(state => ({
        ...state,
        hasChanges: false
      }));
      setDayStates(updatedStates);
      setHasUnsavedChanges(false);

    } catch (err) {
      console.error('Error saving changes:', err);
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Quick actions
  const setAllGuestsPresence = async (isPresent: boolean) => {
    const updatedStates = dayStates.map(dayState => ({
      ...dayState,
      guestPresences: dayState.guestPresences.map(presence => ({
        ...presence,
        isPresent
      })),
      hasChanges: true
    }));
    
    setDayStates(updatedStates);
    setHasUnsavedChanges(true);
    await calculatePricing(updatedStates);
  };

  // Load data on modal open
  useEffect(() => {
    if (isOpen && reservationId) {
      loadReservationData();
    }
  }, [isOpen, reservationId, loadReservationData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span>Individual Guest Day Management</span>
              </h2>
              <p className="text-gray-600 mt-1">{reservationTitle}</p>
              {pricingData && (
                <p className="text-sm text-gray-500 mt-1">
                  {pricingData.summary.totalNights} nights • Total: €{pricingData.summary.grandTotal.toFixed(2)}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-3">
              {hasUnsavedChanges && (
                <Badge variant="destructive" className="animate-pulse">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Unsaved Changes
                </Badge>
              )}
              <Button
                onClick={saveAllChanges}
                disabled={!hasUnsavedChanges || saving}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save All Changes'}
              </Button>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-600">Loading guest management data...</div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="text-red-800 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {error}
                </div>
                <Button onClick={loadReservationData} className="mt-2" size="sm" variant="outline">
                  Try Again
                </Button>
              </div>
            )}

            {!loading && !error && dayStates.length > 0 && (
              <div className="space-y-6">
                {/* Quick Actions */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex space-x-3">
                      <Button 
                        onClick={() => setAllGuestsPresence(true)}
                        variant="outline"
                        size="sm"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        All Guests Present
                      </Button>
                      <Button 
                        onClick={() => setAllGuestsPresence(false)}
                        variant="outline"
                        size="sm"
                      >
                        <X className="h-4 w-4 mr-2" />
                        No Guests Present
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Guest Legend */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Guests in this Booking</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {allGuests.map(guest => (
                        <div key={guest.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                          {guest.type === 'adult' ? (
                            <Users className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Baby className="h-4 w-4 text-green-600" />
                          )}
                          <div>
                            <div className="font-medium text-sm">{guest.name}</div>
                            {guest.age && (
                              <div className="text-xs text-gray-500">Age {guest.age}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Daily Management */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Daily Guest & Service Management</h3>
                  
                  {dayStates.map((dayState, dayIndex) => (
                    <Card key={dayIndex} className={`${dayState.hasChanges ? 'border-orange-300 bg-orange-50/30' : ''}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-5 w-5 text-gray-600" />
                              <span className="font-medium">
                                {format(dayState.date, 'EEEE, MMMM do, yyyy')}
                              </span>
                            </div>
                            {dayState.hasChanges && (
                              <Badge variant="secondary" className="text-orange-700 bg-orange-100">
                                Modified
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-gray-900">
                              €{dayState.dailyTotal.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">Daily Total</div>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Guest Presence Management */}
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                              <Users className="h-4 w-4 mr-2" />
                              Guest Presence
                            </h4>
                            <div className="space-y-2">
                              {allGuests.map(guest => {
                                const presence = dayState.guestPresences.find(p => p.guestId === guest.id);
                                const isPresent = presence?.isPresent || false;
                                
                                return (
                                  <div key={guest.id} className="flex items-center justify-between p-2 rounded-lg border">
                                    <div className="flex items-center space-x-2">
                                      {guest.type === 'adult' ? (
                                        <Users className="h-4 w-4 text-blue-600" />
                                      ) : (
                                        <Baby className="h-4 w-4 text-green-600" />
                                      )}
                                      <div>
                                        <div className="font-medium text-sm">{guest.name}</div>
                                        {guest.age && (
                                          <div className="text-xs text-gray-500">Age {guest.age}</div>
                                        )}
                                      </div>
                                    </div>
                                    <Button
                                      onClick={() => toggleGuestPresence(dayIndex, guest.id)}
                                      size="sm"
                                      variant={isPresent ? "default" : "outline"}
                                      className={isPresent ? "bg-green-600 hover:bg-green-700" : ""}
                                    >
                                      {isPresent ? (
                                        <>
                                          <Check className="h-3 w-3 mr-1" />
                                          Present
                                        </>
                                      ) : (
                                        <>
                                          <X className="h-3 w-3 mr-1" />
                                          Not Present
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Services Management */}
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3">Services & Amenities</h4>
                            <div className="space-y-4">
                              {/* Parking */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Car className="h-4 w-4 text-gray-600" />
                                  <span>Parking Spots:</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    onClick={() => updateDayServices(dayIndex, 'parkingSpots', Math.max(0, dayState.services.parkingSpots - 1))}
                                    size="sm"
                                    variant="outline"
                                    disabled={dayState.services.parkingSpots <= 0}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="w-8 text-center font-medium">
                                    {dayState.services.parkingSpots}
                                  </span>
                                  <Button
                                    onClick={() => updateDayServices(dayIndex, 'parkingSpots', dayState.services.parkingSpots + 1)}
                                    size="sm"
                                    variant="outline"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>

                              {/* Pets */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Heart className="h-4 w-4 text-gray-600" />
                                  <span>Pets Present:</span>
                                </div>
                                <Button
                                  onClick={() => updateDayServices(dayIndex, 'hasPets', !dayState.services.hasPets)}
                                  size="sm"
                                  variant={dayState.services.hasPets ? "default" : "outline"}
                                  className={dayState.services.hasPets ? "bg-green-600 hover:bg-green-700" : ""}
                                >
                                  {dayState.services.hasPets ? (
                                    <>
                                      <Check className="h-3 w-3 mr-1" />
                                      Yes
                                    </>
                                  ) : (
                                    <>
                                      <X className="h-3 w-3 mr-1" />
                                      No
                                    </>
                                  )}
                                </Button>
                              </div>

                              {/* Towel Rentals */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Shirt className="h-4 w-4 text-gray-600" />
                                  <span>Towel Rentals:</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    onClick={() => updateDayServices(dayIndex, 'towelRentals', Math.max(0, dayState.services.towelRentals - 1))}
                                    size="sm"
                                    variant="outline"
                                    disabled={dayState.services.towelRentals <= 0}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="w-8 text-center font-medium">
                                    {dayState.services.towelRentals}
                                  </span>
                                  <Button
                                    onClick={() => updateDayServices(dayIndex, 'towelRentals', dayState.services.towelRentals + 1)}
                                    size="sm"
                                    variant="outline"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              {hasUnsavedChanges && (
                <span className="text-orange-600 font-medium">
                  You have unsaved changes. Don't forget to save!
                </span>
              )}
            </div>
            <div className="flex space-x-3">
              <Button onClick={onClose} variant="outline">
                Close
              </Button>
              {hasUnsavedChanges && (
                <Button 
                  onClick={saveAllChanges}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save All Changes'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};