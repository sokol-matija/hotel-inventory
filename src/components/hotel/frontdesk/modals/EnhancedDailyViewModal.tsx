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
import { reservationAdapter } from '../../../../services/ReservationAdapter';

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
  
  // Guest management state
  const [showAddGuestDialog, setShowAddGuestDialog] = useState(false);
  const [newGuestName, setNewGuestName] = useState('');
  const [newGuestAge, setNewGuestAge] = useState('');
  const [newGuestType, setNewGuestType] = useState<'adult' | 'child'>('child');
  const [addingGuest, setAddingGuest] = useState(false);

  // Load reservation and guest data
  const loadReservationData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Enable new schema in the adapter
      await reservationAdapter.enableNewSchema();
      
      // Use compatibility layer to get normalized data
      const normalizedData = await reservationAdapter.getReservationWithGuests(reservationId);
      
      console.log('✅ Normalized reservation data loaded:', normalizedData);
      setReservation(normalizedData.reservation);

      // Convert to Guest format expected by this component
      const guests: Guest[] = normalizedData.allGuests.map(guest => ({
        id: guest.id.toString(),
        name: `${guest.first_name} ${guest.last_name}`,
        type: guest.guest_type
      }));

      // Load children from the guest_children table
      const { data: childrenData, error: childrenError } = await supabase
        .from('guest_children')
        .select('*')
        .in('guest_id', normalizedData.allGuests.map(g => g.id));

      if (childrenError) {
        console.warn('⚠️ Could not load children:', childrenError);
      } else if (childrenData && childrenData.length > 0) {
        console.log('✅ Children found:', childrenData);
        childrenData.forEach((child: any) => {
          guests.push({
            id: child.id.toString(),
            name: child.name,
            type: 'child',
            age: child.age
          });
        });
      } else {
        console.log('ℹ️  No children found');
      }

      console.log('👥 Final guests list:', guests);
      setAllGuests(guests);

      // Initialize day states
      const checkIn = new Date(normalizedData.reservation.check_in_date);
      const checkOut = new Date(normalizedData.reservation.check_out_date);
      const days: DayState[] = [];

      console.log('📅 Initializing day states:', { 
        checkIn: checkIn.toLocaleDateString(), 
        checkOut: checkOut.toLocaleDateString(),
        guestsCount: guests.length 
      });

      // Load existing daily details if any
      const { data: existingDetails, error: detailsError } = await supabase
        .from('reservation_daily_details')
        .select('*')
        .eq('reservation_id', reservationId)
        .order('stay_date');

      if (detailsError) {
        console.warn('⚠️  Could not load existing daily details:', detailsError);
      } else {
        console.log('📊 Loaded existing daily details:', existingDetails);
      }

      const existingDetailsMap = new Map(
        (existingDetails || []).map(detail => [
          detail.stay_date, detail
        ])
      );

      for (let date = new Date(checkIn); date < checkOut; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        const existingDetail = existingDetailsMap.get(dateStr);
        
        const dayState = {
          date: new Date(date),
          guestPresences: guests.map(guest => {
            // If we have existing data, check if this guest was present
            if (existingDetail) {
              if (guest.type === 'adult') {
                // For adults, check if count includes this guest (simplified)
                return {
                  guestId: guest.id,
                  isPresent: existingDetail.adults_present > 0
                };
              } else {
                // For children, check if their ID is in the array
                return {
                  guestId: guest.id,
                  isPresent: existingDetail.children_present?.includes(guest.id) || false
                };
              }
            }
            
            // Default: all guests present all days
            return {
              guestId: guest.id,
              isPresent: true
            };
          }),
          services: {
            parkingSpots: existingDetail?.parking_spots_needed || (normalizedData.reservation.parking_required ? 1 : 0),
            hasPets: existingDetail?.pets_present || normalizedData.reservation.has_pets || false,
            petCount: normalizedData.reservation.pet_count || 0,
            towelRentals: existingDetail?.towel_rentals || 0
          },
          notes: existingDetail?.notes || '',
          dailyTotal: existingDetail?.daily_total || 0,
          hasChanges: false
        };
        
        console.log('📖 Creating day state for:', {
          date: date.toLocaleDateString(),
          guestPresences: dayState.guestPresences,
          hasExistingDetail: !!existingDetail
        });
        
        days.push(dayState);
      }

      console.log('🗓️  Final day states:', days);
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

  // Add new guest to reservation
  const addGuestToReservation = async () => {
    if (!newGuestName.trim() || !reservationId) return;
    if (newGuestType === 'child' && !newGuestAge) return;

    try {
      setAddingGuest(true);
      setError(null);

      let newGuest: Guest;

      if (newGuestType === 'child') {
        const age = parseInt(newGuestAge);
        if (isNaN(age) || age < 0 || age > 17) {
          throw new Error('Please enter a valid age between 0 and 17');
        }

        // Insert child into guest_children table
        const { data: childData, error: insertError } = await supabase
          .from('guest_children')
          .insert({
            reservation_id: reservationId,
            name: newGuestName.trim(),
            age: age
          })
          .select()
          .single();

        if (insertError) throw insertError;

        newGuest = {
          id: childData.id,
          name: childData.name,
          type: 'child',
          age: childData.age
        };
      } else {
        // For adult guests, we'll create a placeholder for now
        // In a full implementation, you might want to create a proper guest record
        const placeholderAdultCount = allGuests.filter(g => g.id.startsWith('placeholder-adult')).length;
        newGuest = {
          id: `placeholder-adult-${placeholderAdultCount + 1}`,
          name: newGuestName.trim(),
          type: 'adult'
        };
      }

      const updatedGuests = [...allGuests, newGuest];
      setAllGuests(updatedGuests);

      // Add guest presence to all day states (default to present)
      const updatedStates = dayStates.map(dayState => ({
        ...dayState,
        guestPresences: [
          ...dayState.guestPresences,
          {
            guestId: newGuest.id,
            isPresent: true
          }
        ],
        hasChanges: true
      }));

      setDayStates(updatedStates);
      setHasUnsavedChanges(true);

      // Clear form and close dialog
      setNewGuestName('');
      setNewGuestAge('');
      setNewGuestType('child');
      setShowAddGuestDialog(false);

      // Recalculate pricing
      await calculatePricing(updatedStates);

    } catch (err) {
      console.error('Error adding guest:', err);
      setError(err instanceof Error ? err.message : 'Failed to add guest');
    } finally {
      setAddingGuest(false);
    }
  };

  // Remove guest from reservation
  const removeGuestFromReservation = async (guestId: string, guestName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${guestName} from this booking? This cannot be undone.`)) {
      return;
    }

    try {
      setError(null);

      // Delete from database if it's a real guest (not placeholder)
      if (!guestId.startsWith('placeholder-')) {
        const { error: deleteError } = await supabase
          .from('guest_children')
          .delete()
          .eq('id', guestId);

        if (deleteError) throw deleteError;
      }

      // Remove guest from local guest list
      const updatedGuests = allGuests.filter(guest => guest.id !== guestId);
      setAllGuests(updatedGuests);

      // Remove guest presence from all day states
      const updatedStates = dayStates.map(dayState => ({
        ...dayState,
        guestPresences: dayState.guestPresences.filter(presence => presence.guestId !== guestId),
        hasChanges: true
      }));

      setDayStates(updatedStates);
      setHasUnsavedChanges(true);

      // Recalculate pricing
      await calculatePricing(updatedStates);

    } catch (err) {
      console.error('Error removing guest:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove guest');
    }
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

                {/* Guest Management Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Guests in this Booking</CardTitle>
                      <Button
                        onClick={() => setShowAddGuestDialog(true)}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Guest
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {allGuests.map(guest => {
                        const isPlaceholder = guest.id.startsWith('placeholder-');
                        const isPrimaryGuest = guest.type === 'adult' && !isPlaceholder;
                        
                        return (
                          <div key={guest.id} className={`flex items-center justify-between p-3 rounded-lg ${isPlaceholder ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                            <div className="flex items-center space-x-2">
                              {guest.type === 'adult' ? (
                                <Users className={`h-4 w-4 ${isPlaceholder ? 'text-yellow-600' : 'text-blue-600'}`} />
                              ) : (
                                <Baby className="h-4 w-4 text-green-600" />
                              )}
                              <div>
                                <div className="font-medium text-sm">{guest.name}</div>
                                {guest.age && (
                                  <div className="text-xs text-gray-500">Age {guest.age}</div>
                                )}
                                <div className="text-xs text-gray-400">
                                  {isPrimaryGuest ? 'Primary Guest' : 
                                   isPlaceholder ? 'Placeholder' : 
                                   guest.type === 'adult' ? 'Adult' : 'Child'}
                                </div>
                              </div>
                            </div>
                            {!isPrimaryGuest && (
                              <Button
                                onClick={() => removeGuestFromReservation(guest.id, guest.name)}
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:border-red-300"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Add Guest Dialog */}
                    {showAddGuestDialog && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowAddGuestDialog(false)} />
                        <div className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                          <h3 className="text-lg font-semibold mb-4">Add Guest to Booking</h3>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Guest Type
                              </label>
                              <select
                                value={newGuestType}
                                onChange={(e) => setNewGuestType(e.target.value as 'adult' | 'child')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="child">Child</option>
                                <option value="adult">Adult</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Guest Name
                              </label>
                              <input
                                type="text"
                                value={newGuestName}
                                onChange={(e) => setNewGuestName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter guest name"
                              />
                            </div>
                            {newGuestType === 'child' && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Age
                                </label>
                                <input
                                  type="number"
                                  value={newGuestAge}
                                  onChange={(e) => setNewGuestAge(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Enter age (0-17)"
                                  min="0"
                                  max="17"
                                />
                              </div>
                            )}
                            <div className="flex space-x-3 pt-4">
                              <Button
                                onClick={() => setShowAddGuestDialog(false)}
                                variant="outline"
                                className="flex-1"
                                disabled={addingGuest}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={addGuestToReservation}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                                disabled={!newGuestName.trim() || (newGuestType === 'child' && !newGuestAge) || addingGuest}
                              >
                                {addingGuest ? 'Adding...' : 'Add Guest'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
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
                                const isPlaceholder = guest.id.startsWith('placeholder-');
                                
                                return (
                                  <div key={guest.id} className={`flex items-center justify-between p-2 rounded-lg border ${isPlaceholder ? 'border-yellow-200 bg-yellow-50/50' : ''}`}>
                                    <div className="flex items-center space-x-2">
                                      {guest.type === 'adult' ? (
                                        <Users className={`h-4 w-4 ${isPlaceholder ? 'text-yellow-600' : 'text-blue-600'}`} />
                                      ) : (
                                        <Baby className="h-4 w-4 text-green-600" />
                                      )}
                                      <div>
                                        <div className="font-medium text-sm">{guest.name}</div>
                                        {guest.age && (
                                          <div className="text-xs text-gray-500">Age {guest.age}</div>
                                        )}
                                        {isPlaceholder && (
                                          <div className="text-xs text-yellow-600">Placeholder</div>
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
        </div>
      </div>
    </div>
  );
};