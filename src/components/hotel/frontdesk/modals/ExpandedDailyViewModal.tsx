import React, { useState, useEffect } from 'react';
import { X, Users, Baby, Car, Heart, Shirt, Calendar, Euro } from 'lucide-react';
import { Button } from '../../../ui/button';
import { 
  ReservationDailyPricingResult, 
  DailyPricingBreakdown,
  DailyDetail,
  dailyReservationPricingService 
} from '../../../../lib/hotel/services/DailyReservationPricingService';
import { format } from 'date-fns';

interface ExpandedDailyViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservationId: number;
  reservationTitle: string; // e.g., "John Doe - Room 202"
}

interface EditableDayState {
  [date: string]: {
    adults: number;
    children: number[];
    parkingSpots: number;
    hasPets: boolean;
    towelRentals: number;
    notes: string;
  };
}

export const ExpandedDailyViewModal: React.FC<ExpandedDailyViewModalProps> = ({
  isOpen,
  onClose,
  reservationId,
  reservationTitle
}) => {
  const [pricingData, setPricingData] = useState<ReservationDailyPricingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditableDayState>({});
  const [saving, setSaving] = useState(false);

  // Load pricing data when modal opens
  useEffect(() => {
    if (isOpen && reservationId) {
      loadPricingData();
    }
  }, [isOpen, reservationId]);

  const loadPricingData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await dailyReservationPricingService.calculateDailyPricingBreakdown(reservationId);
      setPricingData(result);
      
      // Initialize edit state
      const initialEditState: EditableDayState = {};
      result.dailyBreakdown.forEach(day => {
        const dateKey = format(day.date, 'yyyy-MM-dd');
        initialEditState[dateKey] = {
          adults: day.occupancy.adults,
          children: day.occupancy.children.map(c => c.id),
          parkingSpots: day.pricing.serviceFees.parking > 0 ? Math.round(day.pricing.serviceFees.parking / 7) : 0,
          hasPets: day.pricing.serviceFees.pets > 0,
          towelRentals: Math.round(day.pricing.serviceFees.towels / 5),
          notes: ''
        };
      });
      setEditState(initialEditState);
      
    } catch (err) {
      console.error('Error loading pricing data:', err);
      setError('Failed to load daily pricing breakdown');
    } finally {
      setLoading(false);
    }
  };

  const handleEditDay = (dateKey: string) => {
    setEditingDay(dateKey);
  };

  const handleSaveDay = async (dateKey: string) => {
    try {
      setSaving(true);
      
      const editData = editState[dateKey];
      if (!editData) return;
      
      // Create DailyDetail object for update
      const dailyDetail: DailyDetail = {
        reservationId,
        stayDate: new Date(dateKey),
        adultsPresent: editData.adults,
        childrenPresent: editData.children,
        parkingSpotsNeeded: editData.parkingSpots,
        petsPresent: editData.hasPets,
        towelRentals: editData.towelRentals,
        notes: editData.notes
      };
      
      await dailyReservationPricingService.updateDailyDetail(dailyDetail);
      
      // Reload data to get updated pricing
      await loadPricingData();
      
      setEditingDay(null);
      
    } catch (err) {
      console.error('Error saving daily detail:', err);
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = (dateKey: string) => {
    // Reset to original values
    if (pricingData) {
      const dayData = pricingData.dailyBreakdown.find(d => format(d.date, 'yyyy-MM-dd') === dateKey);
      if (dayData) {
        setEditState(prev => ({
          ...prev,
          [dateKey]: {
            adults: dayData.occupancy.adults,
            children: dayData.occupancy.children.map(c => c.id),
            parkingSpots: dayData.pricing.serviceFees.parking > 0 ? Math.round(dayData.pricing.serviceFees.parking / 7) : 0,
            hasPets: dayData.pricing.serviceFees.pets > 0,
            towelRentals: Math.round(dayData.pricing.serviceFees.towels / 5),
            notes: ''
          }
        }));
      }
    }
    setEditingDay(null);
  };

  const updateEditState = (dateKey: string, field: string, value: any) => {
    setEditState(prev => ({
      ...prev,
      [dateKey]: {
        ...prev[dateKey],
        [field]: value
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Day-by-Day Breakdown</h2>
              <p className="text-gray-600">{reservationTitle}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-600">Loading daily breakdown...</div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="text-red-800">{error}</div>
                <Button onClick={loadPricingData} className="mt-2" size="sm">
                  Try Again
                </Button>
              </div>
            )}

            {pricingData && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-blue-900 mb-2">Summary</h3>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700">Total Nights:</span>
                      <div className="font-semibold">{pricingData.summary.totalNights}</div>
                    </div>
                    <div>
                      <span className="text-blue-700">Accommodation:</span>
                      <div className="font-semibold">€{pricingData.summary.totalAccommodation.toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-blue-700">Services:</span>
                      <div className="font-semibold">€{pricingData.summary.totalServices.toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-blue-700">Grand Total:</span>
                      <div className="font-semibold text-lg">€{pricingData.summary.grandTotal.toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                {/* Daily Breakdown */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Daily Details</h3>
                  
                  {pricingData.dailyBreakdown.map((day, index) => {
                    const dateKey = format(day.date, 'yyyy-MM-dd');
                    const isEditing = editingDay === dateKey;
                    const editData = editState[dateKey];
                    
                    return (
                      <div key={dateKey} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Day Header */}
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Calendar className="h-5 w-5 text-gray-600" />
                              <span className="font-medium">
                                {format(day.date, 'EEEE, MMMM do, yyyy')}
                              </span>
                              <span className="text-sm text-gray-500">
                                (Period {day.pricing.seasonalPeriod})
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-lg font-semibold text-gray-900">
                                €{day.pricing.dailyTotal.toFixed(2)}
                              </span>
                              {!isEditing ? (
                                <Button
                                  onClick={() => handleEditDay(dateKey)}
                                  size="sm"
                                  variant="outline"
                                >
                                  Edit
                                </Button>
                              ) : (
                                <div className="space-x-2">
                                  <Button
                                    onClick={() => handleSaveDay(dateKey)}
                                    size="sm"
                                    disabled={saving}
                                  >
                                    {saving ? 'Saving...' : 'Save'}
                                  </Button>
                                  <Button
                                    onClick={() => handleCancelEdit(dateKey)}
                                    size="sm"
                                    variant="outline"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Day Content */}
                        <div className="p-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left Column - Occupancy & Services */}
                            <div className="space-y-4">
                              <h4 className="font-medium text-gray-900">Occupancy & Services</h4>
                              
                              {/* Adults */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Users className="h-4 w-4 text-gray-600" />
                                  <span>Adults:</span>
                                </div>
                                {isEditing && editData ? (
                                  <input
                                    type="number"
                                    min="1"
                                    value={editData.adults}
                                    onChange={(e) => updateEditState(dateKey, 'adults', parseInt(e.target.value) || 1)}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                                  />
                                ) : (
                                  <span className="font-medium">{day.occupancy.adults}</span>
                                )}
                              </div>

                              {/* Children */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Baby className="h-4 w-4 text-gray-600" />
                                  <span>Children:</span>
                                </div>
                                <span className="font-medium">{day.occupancy.children.length}</span>
                              </div>
                              
                              {day.occupancy.children.length > 0 && (
                                <div className="ml-6 space-y-1">
                                  {day.occupancy.children.map(child => (
                                    <div key={child.id} className="text-sm text-gray-600">
                                      • {child.name} (age {child.age})
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Parking */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Car className="h-4 w-4 text-gray-600" />
                                  <span>Parking Spots:</span>
                                </div>
                                {isEditing && editData ? (
                                  <input
                                    type="number"
                                    min="0"
                                    value={editData.parkingSpots}
                                    onChange={(e) => updateEditState(dateKey, 'parkingSpots', parseInt(e.target.value) || 0)}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                                  />
                                ) : (
                                  <span className="font-medium">
                                    {day.pricing.serviceFees.parking > 0 ? Math.round(day.pricing.serviceFees.parking / 7) : 0}
                                  </span>
                                )}
                              </div>

                              {/* Pets */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Heart className="h-4 w-4 text-gray-600" />
                                  <span>Pets:</span>
                                </div>
                                {isEditing && editData ? (
                                  <input
                                    type="checkbox"
                                    checked={editData.hasPets}
                                    onChange={(e) => updateEditState(dateKey, 'hasPets', e.target.checked)}
                                    className="w-4 h-4"
                                  />
                                ) : (
                                  <span className="font-medium">
                                    {day.pricing.serviceFees.pets > 0 ? 'Yes' : 'No'}
                                  </span>
                                )}
                              </div>

                              {/* Towel Rentals */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Shirt className="h-4 w-4 text-gray-600" />
                                  <span>Towel Rentals:</span>
                                </div>
                                {isEditing && editData ? (
                                  <input
                                    type="number"
                                    min="0"
                                    value={editData.towelRentals}
                                    onChange={(e) => updateEditState(dateKey, 'towelRentals', parseInt(e.target.value) || 0)}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                                  />
                                ) : (
                                  <span className="font-medium">
                                    {Math.round(day.pricing.serviceFees.towels / 5)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Right Column - Pricing Breakdown */}
                            <div className="space-y-4">
                              <h4 className="font-medium text-gray-900">Pricing Breakdown</h4>
                              
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                  <span>Base Rate (Period {day.pricing.seasonalPeriod}):</span>
                                  <span>€{day.pricing.baseRate.toFixed(2)}</span>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <span>Base Accommodation:</span>
                                  <span>€{day.pricing.baseAccommodation.toFixed(2)}</span>
                                </div>
                                
                                {day.pricing.childDiscounts > 0 && (
                                  <div className="flex items-center justify-between text-green-600">
                                    <span>Child Discounts:</span>
                                    <span>-€{day.pricing.childDiscounts.toFixed(2)}</span>
                                  </div>
                                )}
                                
                                <div className="flex items-center justify-between font-medium">
                                  <span>Net Accommodation:</span>
                                  <span>€{day.pricing.netAccommodation.toFixed(2)}</span>
                                </div>
                                
                                <div className="border-t pt-2 mt-2">
                                  <div className="text-xs text-gray-600 mb-2">Service Fees:</div>
                                  
                                  {day.pricing.serviceFees.parking > 0 && (
                                    <div className="flex items-center justify-between text-xs">
                                      <span>• Parking:</span>
                                      <span>€{day.pricing.serviceFees.parking.toFixed(2)}</span>
                                    </div>
                                  )}
                                  
                                  {day.pricing.serviceFees.pets > 0 && (
                                    <div className="flex items-center justify-between text-xs">
                                      <span>• Pet Fee:</span>
                                      <span>€{day.pricing.serviceFees.pets.toFixed(2)}</span>
                                    </div>
                                  )}
                                  
                                  {day.pricing.serviceFees.towels > 0 && (
                                    <div className="flex items-center justify-between text-xs">
                                      <span>• Towel Rental:</span>
                                      <span>€{day.pricing.serviceFees.towels.toFixed(2)}</span>
                                    </div>
                                  )}
                                  
                                  {day.pricing.serviceFees.tourism > 0 && (
                                    <div className="flex items-center justify-between text-xs">
                                      <span>• Tourism Tax:</span>
                                      <span>€{day.pricing.serviceFees.tourism.toFixed(2)}</span>
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center justify-between text-sm font-medium mt-1 pt-1 border-t">
                                    <span>Total Services:</span>
                                    <span>€{day.pricing.serviceFees.total.toFixed(2)}</span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between font-semibold text-lg pt-2 border-t">
                                  <span>Daily Total:</span>
                                  <span>€{day.pricing.dailyTotal.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};