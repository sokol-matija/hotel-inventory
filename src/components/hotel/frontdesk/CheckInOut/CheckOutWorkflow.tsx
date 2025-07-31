import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import {
  LogOut,
  User,
  CreditCard,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Key,
  ShoppingBag,
  Car,
  Star,
  Receipt,
  MessageSquare
} from 'lucide-react';
import { Reservation, Guest, Room } from '../../../../lib/hotel/types';
import { useHotel } from '../../../../lib/hotel/state/HotelContext';
import { SAMPLE_GUESTS } from '../../../../lib/hotel/sampleData';
import { HOTEL_POREC_ROOMS } from '../../../../lib/hotel/hotelData';

interface CheckOutWorkflowProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation | null;
}

interface CheckOutStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
  icon: React.ComponentType<any>;
}

export default function CheckOutWorkflow({
  isOpen,
  onClose,
  reservation
}: CheckOutWorkflowProps) {
  const { updateReservationStatus, isUpdating } = useHotel();
  const [checkOutSteps, setCheckOutSteps] = useState<CheckOutStep[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkOutNotes, setCheckOutNotes] = useState('');
  const [roomKeyReturned, setRoomKeyReturned] = useState(false);
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [guestSatisfaction, setGuestSatisfaction] = useState<number>(5);
  const [generateInvoice, setGenerateInvoice] = useState(false);

  // Find associated guest and room data
  const guest = reservation ? SAMPLE_GUESTS.find(g => g.id === reservation.guestId) : null;
  const room = reservation ? HOTEL_POREC_ROOMS.find(r => r.id === reservation.roomId) : null;

  // Initialize check-out steps
  useEffect(() => {
    if (!reservation || !guest) return;

    const steps: CheckOutStep[] = [
      {
        id: 'room-inspection',
        title: 'Room Inspection',
        description: 'Check room condition and note any damages',
        completed: false,
        required: true,
        icon: CheckCircle
      },
      {
        id: 'minibar',
        title: 'Minibar Check',
        description: 'Verify minibar consumption and add charges',
        completed: false,
        required: true,
        icon: ShoppingBag
      },
      {
        id: 'additional-services',
        title: 'Additional Services',
        description: 'Review any additional services used (spa, restaurant, etc.)',
        completed: false,
        required: true,
        icon: Star
      },
      {
        id: 'key-return',
        title: 'Room Key Return',
        description: `Collect room key/keycard for Room ${room?.number}`,
        completed: roomKeyReturned,
        required: true,
        icon: Key
      },
      {
        id: 'final-payment',
        title: 'Final Payment',
        description: 'Process any outstanding balance or additional charges',
        completed: additionalCharges === 0,
        required: true,
        icon: CreditCard
      },
      {
        id: 'satisfaction-survey',
        title: 'Guest Satisfaction',
        description: 'Collect feedback about the stay',
        completed: false,
        required: false,
        icon: MessageSquare
      },
      {
        id: 'parking',
        title: 'Parking Settlement',
        description: 'Handle parking fees if applicable',
        completed: false,
        required: false,
        icon: Car
      }
    ];

    setCheckOutSteps(steps);
  }, [reservation, guest, roomKeyReturned, additionalCharges]);

  const handleStepToggle = (stepId: string) => {
    setCheckOutSteps(prev => prev.map(step =>
      step.id === stepId ? { ...step, completed: !step.completed } : step
    ));
  };

  const canCompleteCheckOut = () => {
    return checkOutSteps.filter(step => step.required).every(step => step.completed);
  };

  const handleCompleteCheckOut = async () => {
    if (!reservation || !canCompleteCheckOut()) return;

    try {
      setIsProcessing(true);
      
      // Update reservation status to checked-out
      await updateReservationStatus(reservation.id, 'checked-out');
      
      // Log check-out completion
      console.log(`Check-out completed for ${guest?.name} from Room ${room?.number}`);
      
      // Generate invoice if requested
      if (generateInvoice) {
        console.log('Generating invoice for guest...');
        // TODO: Integrate with PDF invoice generation
      }
      
      // Close workflow
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (error) {
      console.error('Failed to complete check-out:', error);
      alert('Failed to complete check-out. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getProgressPercentage = () => {
    const completedSteps = checkOutSteps.filter(step => step.completed).length;
    return checkOutSteps.length > 0 ? (completedSteps / checkOutSteps.length) * 100 : 0;
  };

  const getTotalAmount = () => {
    return reservation ? reservation.totalAmount + additionalCharges : 0;
  };

  if (!isOpen || !reservation || !guest || !room) return null;

  const isEarlyCheckOut = new Date() < reservation.checkOut;
  const isLateCheckOut = new Date() > new Date(reservation.checkOut.getTime() + 2 * 60 * 60 * 1000); // 2 hours late

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <LogOut className="h-6 w-6 text-blue-600" />
            <span>Check-Out Workflow</span>
            <Badge variant={isEarlyCheckOut ? "secondary" : isLateCheckOut ? "destructive" : "default"}>
              {isEarlyCheckOut ? "Early Departure" : isLateCheckOut ? "Late Departure" : "On Time"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Check-out Progress</span>
              <span>{Math.round(getProgressPercentage())}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Guest Info & Payment */}
            <div className="space-y-6">
              {/* Guest Information Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Guest Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{guest.name}</span>
                    {guest.isVip && <Badge variant="secondary">VIP</Badge>}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Room {room.number} • {room.nameEnglish}</div>
                    <div>{reservation.numberOfGuests} guests • {reservation.numberOfNights} nights</div>
                    <div>{reservation.checkIn.toLocaleDateString()} - {reservation.checkOut.toLocaleDateString()}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CreditCard className="h-5 w-5" />
                    <span>Payment Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Original Booking</span>
                      <span>€{reservation.totalAmount.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Additional Charges</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-20 px-2 py-1 text-right border border-gray-300 rounded text-sm"
                        value={additionalCharges}
                        onChange={(e) => setAdditionalCharges(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    
                    <hr />
                    <div className="flex justify-between font-bold">
                      <span>Total Amount</span>
                      <span>€{getTotalAmount().toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={generateInvoice}
                        onChange={(e) => setGenerateInvoice(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm">Generate invoice</span>
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* Guest Satisfaction */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Star className="h-5 w-5" />
                    <span>Guest Satisfaction</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Rate the stay (1-5 stars)
                      </label>
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            onClick={() => setGuestSatisfaction(rating)}
                            className={`text-2xl ${
                              rating <= guestSatisfaction ? 'text-yellow-400' : 'text-gray-300'
                            }`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Checklist */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Check-Out Checklist</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {checkOutSteps.map((step) => {
                      const StepIcon = step.icon;
                      return (
                        <div
                          key={step.id}
                          className={`flex items-center space-x-4 p-4 rounded-lg border transition-colors cursor-pointer ${
                            step.completed 
                              ? 'bg-green-50 border-green-200' 
                              : step.required 
                                ? 'bg-white border-gray-200 hover:bg-gray-50' 
                                : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                          }`}
                          onClick={() => handleStepToggle(step.id)}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            step.completed 
                              ? 'bg-green-600 text-white' 
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {step.completed ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <StepIcon className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium">{step.title}</h4>
                              {step.required && !step.completed && (
                                <Badge variant="destructive" className="text-xs">Required</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{step.description}</p>
                          </div>
                          <div className="text-2xl">
                            {step.completed ? '✅' : '⭕'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Time Alerts */}
          {(isEarlyCheckOut || isLateCheckOut) && (
            <Card className={`border-l-4 ${isEarlyCheckOut ? 'border-l-blue-500 bg-blue-50' : 'border-l-red-500 bg-red-50'}`}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  {isEarlyCheckOut ? (
                    <Clock className="h-5 w-5 text-blue-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <div>
                    <p className={`font-medium ${isEarlyCheckOut ? 'text-blue-800' : 'text-red-800'}`}>
                      {isEarlyCheckOut ? 'Early Departure' : 'Late Departure'}
                    </p>
                    <p className={`text-sm ${isEarlyCheckOut ? 'text-blue-600' : 'text-red-600'}`}>
                      {isEarlyCheckOut 
                        ? 'Guest is leaving before scheduled check-out time.'
                        : 'Guest is departing after standard check-out time. Late fees may apply.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Check-Out Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Check-Out Notes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Add any notes about room condition, guest feedback, or issues encountered..."
                value={checkOutNotes}
                onChange={(e) => setCheckOutNotes(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            
            <div className="flex items-center space-x-3">
              {!canCompleteCheckOut() && (
                <span className="text-sm text-red-600">
                  Complete all required steps to proceed
                </span>
              )}
              
              <Button
                onClick={handleCompleteCheckOut}
                disabled={!canCompleteCheckOut() || isProcessing || isUpdating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing || isUpdating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <LogOut className="h-4 w-4 mr-2" />
                )}
                {isProcessing || isUpdating ? 'Processing...' : 'Complete Check-Out'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}