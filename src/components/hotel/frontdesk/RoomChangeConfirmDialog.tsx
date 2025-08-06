import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { formatRoomNumber, getRoomTypeDisplay } from '../../../lib/hotel/calendarUtils';
import { Room, Reservation, Guest } from '../../../lib/hotel/types';
import { ArrowRight, Gift, DollarSign, X } from 'lucide-react';

interface RoomChangeConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoom: Room;
  targetRoom: Room;
  reservation: Reservation;
  guest: Guest | null;
  onConfirmChange: () => void;
  onFreeUpgrade: () => void;
}

export default function RoomChangeConfirmDialog({
  isOpen,
  onClose,
  currentRoom,
  targetRoom,
  reservation,
  guest,
  onConfirmChange,
  onFreeUpgrade
}: RoomChangeConfirmDialogProps) {
  if (!isOpen) return null;

  // Calculate price difference (using average seasonal rate)
  const currentRate = Object.values(currentRoom.seasonalRates).reduce((a, b) => a + b, 0) / 4;
  const targetRate = Object.values(targetRoom.seasonalRates).reduce((a, b) => a + b, 0) / 4;
  const priceDifference = targetRate - currentRate;
  const isUpgrade = priceDifference > 0;
  const isDowngrade = priceDifference < 0;
  const isSamePrice = priceDifference === 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-white shadow-2xl">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 h-8 w-8 p-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          
          <CardTitle className="text-xl font-bold text-gray-900 pr-10">
            Confirm Room Change
          </CardTitle>
          <p className="text-sm text-gray-600">
            {guest?.name || 'Guest'} • Reservation #{reservation.id.slice(-8)}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Room Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Current Room */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">Current Room</div>
              <div className="font-bold text-lg text-gray-900">
                {formatRoomNumber(currentRoom)}
              </div>
              <div className="text-sm text-gray-600">
                {getRoomTypeDisplay(currentRoom)}
              </div>
              <div className="text-sm font-medium text-gray-700 mt-2">
                €{currentRate}/night
              </div>
              {currentRoom.isPremium && (
                <Badge variant="secondary" className="mt-2 text-xs">
                  Premium
                </Badge>
              )}
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <ArrowRight className="h-8 w-8 text-gray-400" />
            </div>

            {/* Target Room */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-xs text-blue-600 mb-1">New Room</div>
              <div className="font-bold text-lg text-blue-900">
                {formatRoomNumber(targetRoom)}
              </div>
              <div className="text-sm text-blue-700">
                {getRoomTypeDisplay(targetRoom)}
              </div>
              <div className="text-sm font-medium text-blue-800 mt-2">
                €{targetRate}/night
              </div>
              {targetRoom.isPremium && (
                <Badge variant="default" className="mt-2 text-xs bg-blue-600">
                  Premium
                </Badge>
              )}
            </div>
          </div>

          {/* Price Impact */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-700">
                Price Impact
              </div>
              <div className={`flex items-center space-x-2 ${
                isUpgrade ? 'text-red-600' : isDowngrade ? 'text-green-600' : 'text-gray-600'
              }`}>
                <DollarSign className="h-4 w-4" />
                <span className="font-bold">
                  {isSamePrice ? 'No change' : 
                   isUpgrade ? `+€${priceDifference}/night` : 
                   `€${Math.abs(priceDifference)}/night less`}
                </span>
              </div>
            </div>
            
            {isUpgrade && (
              <div className="text-xs text-gray-600 mt-2">
                Total increase: €{priceDifference * reservation.numberOfNights} for this stay
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>

            <Button
              onClick={onConfirmChange}
              className={`flex-1 ${
                isUpgrade ? 'bg-red-600 hover:bg-red-700' : 
                isDowngrade ? 'bg-green-600 hover:bg-green-700' : 
                'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isUpgrade ? `Confirm Upgrade (+€${priceDifference})` : 
               isDowngrade ? `Confirm Change (€${Math.abs(priceDifference)} less)` : 
               'Confirm Change'}
            </Button>

            {isUpgrade && (
              <Button
                onClick={onFreeUpgrade}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
              >
                <Gift className="h-4 w-4 mr-2" />
                Free Upgrade
              </Button>
            )}
          </div>

          {isUpgrade && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Gift className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-xs text-yellow-800">
                  <strong>Free Upgrade:</strong> Move guest to the better room without price change. 
                  Current room becomes available for new bookings at the higher rate.
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}