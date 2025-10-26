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
  LogIn,
  User,
  MapPin,
  Calendar,
  CreditCard,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Key,
  Users,
  Baby,
  Wifi,
  Car,
  CheckCheck
} from 'lucide-react';
import { Reservation, Guest, Room } from '../../../../lib/hotel/types';
import { useHotel } from '../../../../lib/hotel/state/SupabaseHotelContext';
import { SAMPLE_GUESTS } from '../../../../lib/hotel/sampleData';
import { HotelEmailService } from '../../../../lib/emailService';
// Removed static HOTEL_POREC_ROOMS import - now using dynamic rooms from context

interface CheckInWorkflowProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation | null;
}

interface CheckInStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
  icon: React.ComponentType<any>;
}

export default function CheckInWorkflow({
  isOpen,
  onClose,
  reservation
}: CheckInWorkflowProps) {
  const { rooms, updateReservationStatus, isUpdating } = useHotel();
  const [currentStep, setCurrentStep] = useState(0);
  const [checkInSteps, setCheckInSteps] = useState<CheckInStep[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkInNotes, setCheckInNotes] = useState('');
  const [roomKeyIssued, setRoomKeyIssued] = useState(false);
  const [wifiInfoProvided, setWifiInfoProvided] = useState(false);
  const [parkingAssigned, setParkingAssigned] = useState(false);
  const [emailSendResult, setEmailSendResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Find associated guest and room data
  const guest = reservation ? SAMPLE_GUESTS.find(g => g.id === reservation.guestId) : null;
  const room = reservation ? rooms.find(r => r.id === reservation.roomId) : null;

  // Initialize check-in steps
  useEffect(() => {
    if (!reservation || !guest) return;

    const steps: CheckInStep[] = [
      {
        id: 'identity',
        title: 'Verify Guest Identity',
        description: 'Check passport/ID and confirm guest details',
        completed: false,
        required: true,
        icon: User
      },
      {
        id: 'payment',
        title: 'Note Payment Status',
        description: `Payment status: ${reservation.status === 'checked-out' ? 'Already paid' : 'Will pay at checkout'}`,
        completed: true, // Always completed since payment is not required for check-in
        required: false, // Not required - guests can pay at checkout
        icon: CreditCard
      },
      {
        id: 'room-ready',
        title: 'Confirm Room Ready',
        description: 'Ensure room is cleaned and prepared for guest',
        completed: false,
        required: true,
        icon: CheckCircle
      },
      {
        id: 'room-key',
        title: 'Issue Room Key',
        description: `Provide key/keycard for Room ${room?.number}`,
        completed: roomKeyIssued,
        required: true,
        icon: Key
      },
      {
        id: 'amenities',
        title: 'Explain Amenities',
        description: 'Brief guest on hotel facilities and services',
        completed: false,
        required: true,
        icon: MapPin
      },
      {
        id: 'wifi',
        title: 'Provide WiFi Information',
        description: 'Share WiFi network name and password',
        completed: wifiInfoProvided,
        required: false,
        icon: Wifi
      }
    ];

    // Add parking step if guest has children (likely to have car) or is VIP
    if (guest.children.length > 0 || guest.isVip) {
      steps.push({
        id: 'parking',
        title: 'Assign Parking',
        description: 'Provide parking space if requested',
        completed: parkingAssigned,
        required: false,
        icon: Car
      });
    }

    setCheckInSteps(steps);
  }, [reservation, guest, roomKeyIssued, wifiInfoProvided, parkingAssigned]);

  const handleStepToggle = (stepId: string) => {
    setCheckInSteps(prev => prev.map(step =>
      step.id === stepId ? { ...step, completed: !step.completed } : step
    ));
  };

  const handleCheckAll = () => {
    setCheckInSteps(prev => prev.map(step => ({ ...step, completed: true })));
    // Also set individual state items
    setRoomKeyIssued(true);
    setWifiInfoProvided(true);
    setParkingAssigned(true);
  };

  const canCompleteCheckIn = () => {
    return checkInSteps.filter(step => step.required).every(step => step.completed);
  };

  const handleCompleteCheckIn = async () => {
    if (!reservation || !canCompleteCheckIn()) return;

    try {
      setIsProcessing(true);

      // Update reservation status to checked-in
      await updateReservationStatus(reservation.id, 'checked-in');

      // Send welcome email
      console.log(`📧 Sending welcome email to ${guest?.email}...`);
      const emailResult = await HotelEmailService.sendWelcomeEmail(reservation, guest ?? undefined, room ?? undefined);
      setEmailSendResult(emailResult);

      if (emailResult.success) {
        console.log(`✅ Welcome email sent successfully to ${guest?.email}`);
      } else {
        console.warn(`⚠️ Failed to send welcome email: ${emailResult.message}`);
      }

      // Log check-in completion
      console.log(`Check-in completed for ${guest?.fullName} in Room ${room?.number}`);

      // Close workflow after showing feedback
      setTimeout(() => {
        onClose();
      }, emailResult.success ? 2000 : 3000); // Longer delay if email failed

    } catch (error) {
      console.error('Failed to complete check-in:', error);
      alert('Failed to complete check-in. Please try again.');
      setEmailSendResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const getProgressPercentage = () => {
    const completedSteps = checkInSteps.filter(step => step.completed).length;
    return checkInSteps.length > 0 ? (completedSteps / checkInSteps.length) * 100 : 0;
  };

  if (!isOpen || !reservation || !guest || !room) return null;

  const isEarlyCheckIn = new Date() < reservation.checkIn;
  const isLateCheckIn = new Date() > new Date(reservation.checkIn.getTime() + 4 * 60 * 60 * 1000); // 4 hours late

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <LogIn className="h-6 w-6 text-green-600" />
            <span>Check-In Workflow</span>
            <Badge variant={isEarlyCheckIn ? "secondary" : isLateCheckIn ? "destructive" : "default"}>
              {isEarlyCheckIn ? "Early Arrival" : isLateCheckIn ? "Late Arrival" : "On Time"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Check-in Progress</span>
              <span>{Math.round(getProgressPercentage())}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>

          {/* Guest Information Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Guest Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{guest.fullName}</span>
                    {guest.isVip && (
                      <Badge variant="secondary">VIP</Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {guest.email} • {guest.phone}
                  </div>
                  <div className="text-sm text-gray-600">
                    🌍 {guest.nationality} • {guest.preferredLanguage.toUpperCase()}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Room {room.number}</span>
                    <span className="text-sm text-gray-600">({room.nameEnglish})</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{reservation.numberOfGuests} guests</span>
                    {guest.children.length > 0 && (
                      <>
                        <Baby className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{guest.children.length} children</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {reservation.checkIn.toLocaleDateString()} - {reservation.checkOut.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Time Alerts */}
          {(isEarlyCheckIn || isLateCheckIn) && (
            <Card className={`border-l-4 ${isEarlyCheckIn ? 'border-l-blue-500 bg-blue-50' : 'border-l-red-500 bg-red-50'}`}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  {isEarlyCheckIn ? (
                    <Clock className="h-5 w-5 text-blue-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <div>
                    <p className={`font-medium ${isEarlyCheckIn ? 'text-blue-800' : 'text-red-800'}`}>
                      {isEarlyCheckIn ? 'Early Arrival' : 'Late Arrival'}
                    </p>
                    <p className={`text-sm ${isEarlyCheckIn ? 'text-blue-600' : 'text-red-600'}`}>
                      {isEarlyCheckIn 
                        ? 'Guest arrived before official check-in time. Room may not be ready.'
                        : 'Guest arrived significantly after expected check-in time. Consider calling guest.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Check-In Steps */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Check-In Checklist</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCheckAll}
                  className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Check All (Experienced Staff)
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {checkInSteps.map((step, index) => {
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

          {/* Check-In Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Check-In Notes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Add any notes about the check-in process, guest requests, or special circumstances..."
                value={checkInNotes}
                onChange={(e) => setCheckInNotes(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>

            <div className="flex items-center space-x-3">
              {!canCompleteCheckIn() && (
                <span className="text-sm text-red-600">
                  Complete all required steps to proceed
                </span>
              )}

              <Button
                onClick={handleCompleteCheckIn}
                disabled={!canCompleteCheckIn() || isProcessing || isUpdating}
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessing || isUpdating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <LogIn className="h-4 w-4 mr-2" />
                )}
                {isProcessing || isUpdating ? 'Processing...' : 'Complete Check-In'}
              </Button>
            </div>
          </div>

          {/* Email Send Feedback */}
          {emailSendResult && (
            <div className={`mt-4 p-4 rounded-lg ${
              emailSendResult.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <div className="flex items-center space-x-2">
                {emailSendResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                )}
                <p className={`text-sm font-medium ${
                  emailSendResult.success ? 'text-green-800' : 'text-yellow-800'
                }`}>
                  {emailSendResult.message}
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}