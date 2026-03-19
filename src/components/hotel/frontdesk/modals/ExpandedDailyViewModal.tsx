import React, { useState, useEffect } from 'react';
import { X, Users, Baby, Car, Heart, Shirt, Calendar } from 'lucide-react';
import { Button } from '../../../ui/button';
import {
  unifiedPricingService,
  DayByDayPricingResult,
  GuestDayPresenceParams,
} from '../../../../lib/hotel/services/UnifiedPricingService';
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
    children: string[];
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
  reservationTitle,
}) => {
  const [pricingData, setPricingData] = useState<DayByDayPricingResult | null>(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, reservationId]);

  const loadPricingData = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await unifiedPricingService.calculateDayByDayBreakdown({
        reservationId: reservationId.toString(),
      });
      setPricingData(result);

      // Initialize edit state
      const initialEditState: EditableDayState = {};
      result.dailyBreakdown.forEach((day) => {
        const dateKey = format(day.date, 'yyyy-MM-dd');
        initialEditState[dateKey] = {
          adults: day.occupancy.adults,
          children: day.occupancy.children.map((c) => c.id),
          parkingSpots:
            day.pricing.serviceFees.parking > 0
              ? Math.round(day.pricing.serviceFees.parking / 7)
              : 0,
          hasPets: day.pricing.serviceFees.pets > 0,
          towelRentals: Math.round(day.pricing.serviceFees.towels / 5),
          notes: '',
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

      // Create GuestDayPresenceParams object for update
      const params: GuestDayPresenceParams = {
        reservationId: reservationId.toString(),
        stayDate: new Date(dateKey),
        adultsPresent: editData.adults,
        childrenPresent: editData.children,
        parkingSpots: editData.parkingSpots,
        hasPets: editData.hasPets,
        towelRentals: editData.towelRentals,
        notes: editData.notes,
      };

      await unifiedPricingService.updateGuestDayPresence(params);

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
      const dayData = pricingData.dailyBreakdown.find(
        (d) => format(d.date, 'yyyy-MM-dd') === dateKey
      );
      if (dayData) {
        setEditState((prev) => ({
          ...prev,
          [dateKey]: {
            adults: dayData.occupancy.adults,
            children: dayData.occupancy.children.map((c) => c.id),
            parkingSpots:
              dayData.pricing.serviceFees.parking > 0
                ? Math.round(dayData.pricing.serviceFees.parking / 7)
                : 0,
            hasPets: dayData.pricing.serviceFees.pets > 0,
            towelRentals: Math.round(dayData.pricing.serviceFees.towels / 5),
            notes: '',
          },
        }));
      }
    }
    setEditingDay(null);
  };

  const updateEditState = (dateKey: string, field: string, value: unknown) => {
    setEditState((prev) => ({
      ...prev,
      [dateKey]: {
        ...prev[dateKey],
        [field]: value,
      },
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      {/* Backdrop */}
      <div className="bg-opacity-50 fixed inset-0 bg-black" onClick={onClose} />

      {/* Modal */}
      <div className="relative flex min-h-screen items-center justify-center p-4">
        <div className="relative max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-lg bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 p-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Day-by-Day Breakdown</h2>
              <p className="text-gray-600">{reservationTitle}</p>
            </div>
            <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[calc(90vh-180px)] overflow-y-auto p-6">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-600">Loading daily breakdown...</div>
              </div>
            )}

            {error && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="text-red-800">{error}</div>
                <Button onClick={loadPricingData} className="mt-2" size="sm">
                  Try Again
                </Button>
              </div>
            )}

            {pricingData && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <h3 className="mb-2 text-lg font-medium text-blue-900">Summary</h3>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700">Total Nights:</span>
                      <div className="font-semibold">{pricingData.summary.totalNights}</div>
                    </div>
                    <div>
                      <span className="text-blue-700">Accommodation:</span>
                      <div className="font-semibold">
                        €{pricingData.summary.totalAccommodation.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <span className="text-blue-700">Services:</span>
                      <div className="font-semibold">
                        €{pricingData.summary.totalServices.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <span className="text-blue-700">Grand Total:</span>
                      <div className="text-lg font-semibold">
                        €{pricingData.summary.grandTotal.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Daily Breakdown */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Daily Details</h3>

                  {pricingData.dailyBreakdown.map((day, _index) => {
                    const dateKey = format(day.date, 'yyyy-MM-dd');
                    const isEditing = editingDay === dateKey;
                    const editData = editState[dateKey];

                    return (
                      <div
                        key={dateKey}
                        className="overflow-hidden rounded-lg border border-gray-200"
                      >
                        {/* Day Header */}
                        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
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
                          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
                                    onChange={(e) =>
                                      updateEditState(
                                        dateKey,
                                        'adults',
                                        parseInt(e.target.value) || 1
                                      )
                                    }
                                    className="w-20 rounded border border-gray-300 px-2 py-1 text-center"
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
                                  {day.occupancy.children.map((child) => (
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
                                    onChange={(e) =>
                                      updateEditState(
                                        dateKey,
                                        'parkingSpots',
                                        parseInt(e.target.value) || 0
                                      )
                                    }
                                    className="w-20 rounded border border-gray-300 px-2 py-1 text-center"
                                  />
                                ) : (
                                  <span className="font-medium">
                                    {day.pricing.serviceFees.parking > 0
                                      ? Math.round(day.pricing.serviceFees.parking / 7)
                                      : 0}
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
                                    onChange={(e) =>
                                      updateEditState(dateKey, 'hasPets', e.target.checked)
                                    }
                                    className="h-4 w-4"
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
                                    onChange={(e) =>
                                      updateEditState(
                                        dateKey,
                                        'towelRentals',
                                        parseInt(e.target.value) || 0
                                      )
                                    }
                                    className="w-20 rounded border border-gray-300 px-2 py-1 text-center"
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

                                <div className="mt-2 border-t pt-2">
                                  <div className="mb-2 text-xs text-gray-600">Service Fees:</div>

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

                                  <div className="mt-1 flex items-center justify-between border-t pt-1 text-sm font-medium">
                                    <span>Total Services:</span>
                                    <span>€{day.pricing.serviceFees.total.toFixed(2)}</span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between border-t pt-2 text-lg font-semibold">
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
          <div className="flex justify-end space-x-3 border-t border-gray-200 p-6">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
