import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LogOut,
  User,
  CreditCard,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Star,
  Mail,
} from 'lucide-react';
import { Reservation } from '@/lib/hotel/types';
import { useCheckOutWorkflow } from './useCheckOutWorkflow';

interface CheckOutWorkflowProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation | null;
}

export default function CheckOutWorkflow({ isOpen, onClose, reservation }: CheckOutWorkflowProps) {
  const {
    guest,
    room,
    checkOutSteps,
    isProcessing,
    isUpdating,
    checkOutNotes,
    additionalCharges,
    guestSatisfaction,
    generateInvoice,
    paymentStatus,
    chargesTotalAmount,
    isEarlyCheckOut,
    isLateCheckOut,
    progressPercentage,
    totalAmount,
    canCompleteCheckOut,
    handleStepToggle,
    handleMarkAsPaid,
    handleSendInvoiceEmail,
    handleCompleteCheckOut,
    setCheckOutNotes,
    setAdditionalCharges,
    setGuestSatisfaction,
    setGenerateInvoice,
  } = useCheckOutWorkflow(reservation, onClose);

  if (!isOpen || !reservation || !guest || !room) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-h-[90vh] max-w-4xl overflow-y-auto"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <LogOut className="h-6 w-6 text-blue-600" />
            <span>Check-Out Workflow</span>
            <Badge
              variant={isEarlyCheckOut ? 'secondary' : isLateCheckOut ? 'destructive' : 'default'}
            >
              {isEarlyCheckOut ? 'Early Departure' : isLateCheckOut ? 'Late Departure' : 'On Time'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Check-out Progress</span>
              <span>{Math.round(progressPercentage)}% Complete</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
                    <span className="font-medium">{guest.display_name}</span>
                    {guest.is_vip && <Badge variant="secondary">VIP</Badge>}
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div>
                      Room {room.room_number} • {room.name_english}
                    </div>
                    <div>
                      {reservation.number_of_guests ?? reservation.adults} guests •{' '}
                      {reservation.number_of_nights ?? 1} nights
                    </div>
                    <div>
                      {new Date(reservation.check_in_date).toLocaleDateString()} -{' '}
                      {new Date(reservation.check_out_date).toLocaleDateString()}
                    </div>
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
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center space-x-2">
                      <CreditCard className="h-4 w-4" />
                      <span className="text-sm font-medium">Payment Status:</span>
                    </div>
                    <Badge
                      variant={paymentStatus === 'incomplete-payment' ? 'destructive' : 'default'}
                      className="text-xs"
                    >
                      {paymentStatus === 'incomplete-payment'
                        ? 'PAYMENT PENDING'
                        : 'PAYMENT COMPLETE'}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Original Booking</span>
                      <span>€{chargesTotalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Additional Charges</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-right text-sm"
                        value={additionalCharges}
                        onChange={(e) => setAdditionalCharges(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <hr />
                    <div className="flex justify-between font-bold">
                      <span>Total Amount</span>
                      <span>€{totalAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-3 border-t pt-2">
                    {paymentStatus === 'incomplete-payment' && (
                      <Button
                        onClick={handleMarkAsPaid}
                        disabled={isProcessing}
                        className="w-full bg-green-600 text-white hover:bg-green-700"
                        size="sm"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Mark as Paid (After POS Payment)
                      </Button>
                    )}
                    <Button
                      onClick={handleSendInvoiceEmail}
                      variant="outline"
                      className="w-full"
                      size="sm"
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Send PDF Invoice to Email
                    </Button>
                  </div>

                  <div className="mt-4">
                    <label className="flex cursor-pointer items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={generateInvoice}
                        onChange={(e) => setGenerateInvoice(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
                      <label
                        htmlFor="checkout-satisfaction-rating"
                        className="mb-2 block text-sm font-medium"
                      >
                        Rate the stay (1-5 stars)
                      </label>
                      <div id="checkout-satisfaction-rating" className="flex space-x-1">
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
                        <button
                          key={step.id}
                          type="button"
                          className={`flex w-full cursor-pointer items-center space-x-4 rounded-lg border p-4 text-left transition-colors ${
                            step.completed
                              ? 'border-green-200 bg-green-50'
                              : step.required
                                ? 'border-gray-200 bg-white hover:bg-gray-50'
                                : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                          }`}
                          onClick={() => handleStepToggle(step.id)}
                        >
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full ${
                              step.completed
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                          >
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
                                <Badge variant="destructive" className="text-xs">
                                  Required
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{step.description}</p>
                          </div>
                          <div>
                            {step.completed ? (
                              <CheckCircle className="h-6 w-6 text-green-600" />
                            ) : (
                              <div className="h-6 w-6 rounded-full border-2 border-gray-300" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Time Alerts */}
          {(isEarlyCheckOut || isLateCheckOut) && (
            <Card
              className={`border-l-4 ${isEarlyCheckOut ? 'border-l-blue-500 bg-blue-50' : 'border-l-red-500 bg-red-50'}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  {isEarlyCheckOut ? (
                    <Clock className="h-5 w-5 text-blue-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <div>
                    <p
                      className={`font-medium ${isEarlyCheckOut ? 'text-blue-800' : 'text-red-800'}`}
                    >
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
                className="w-full resize-none rounded-md border border-gray-300 p-3 focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Add any notes about room condition, guest feedback, or issues encountered..."
                value={checkOutNotes}
                onChange={(e) => setCheckOutNotes(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between border-t pt-4">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>

            <div className="flex items-center space-x-3">
              {!canCompleteCheckOut && (
                <span className="text-sm text-red-600">Complete all required steps to proceed</span>
              )}
              <Button
                onClick={handleCompleteCheckOut}
                disabled={!canCompleteCheckOut || isProcessing || isUpdating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing || isUpdating ? (
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
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
