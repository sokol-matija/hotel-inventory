import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { formatRoomNumber, getRoomTypeDisplay } from '../../../lib/hotel/calendarUtils';
import { Reservation } from '../../../lib/hotel/types';
import type { Guest } from '../../../lib/queries/hooks/useGuests';
import type { Room } from '../../../lib/queries/hooks/useRooms';
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
  onFreeUpgrade,
}: RoomChangeConfirmDialogProps) {
  if (!isOpen) return null;

  // Calculate price difference (using average seasonal rate)
  const currentRate = Object.values(currentRoom.seasonal_rates).reduce((a, b) => a + b, 0) / 4;
  const targetRate = Object.values(targetRoom.seasonal_rates).reduce((a, b) => a + b, 0) / 4;
  const priceDifference = targetRate - currentRate;
  const isUpgrade = priceDifference > 0;
  const isDowngrade = priceDifference < 0;
  const isSamePrice = priceDifference === 0;

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
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

          <CardTitle className="pr-10 text-xl font-bold text-gray-900">
            Confirm Room Change
          </CardTitle>
          <p className="text-sm text-gray-600">
            {guest?.display_name || 'Guest'} • Reservation #{String(reservation.id).slice(-8)}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Room Comparison */}
          <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-3">
            {/* Current Room */}
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="mb-1 text-xs text-gray-500">Current Room</div>
              <div className="text-lg font-bold text-gray-900">{formatRoomNumber(currentRoom)}</div>
              <div className="text-sm text-gray-600">{getRoomTypeDisplay(currentRoom)}</div>
              <div className="mt-2 text-sm font-medium text-gray-700">€{currentRate}/night</div>
              {currentRoom.is_premium && (
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
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="mb-1 text-xs text-blue-600">New Room</div>
              <div className="text-lg font-bold text-blue-900">{formatRoomNumber(targetRoom)}</div>
              <div className="text-sm text-blue-700">{getRoomTypeDisplay(targetRoom)}</div>
              <div className="mt-2 text-sm font-medium text-blue-800">€{targetRate}/night</div>
              {targetRoom.is_premium && (
                <Badge variant="default" className="mt-2 bg-blue-600 text-xs">
                  Premium
                </Badge>
              )}
            </div>
          </div>

          {/* Price Impact */}
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-700">Price Impact</div>
              <div
                className={`flex items-center space-x-2 ${
                  isUpgrade ? 'text-red-600' : isDowngrade ? 'text-green-600' : 'text-gray-600'
                }`}
              >
                <DollarSign className="h-4 w-4" />
                <span className="font-bold">
                  {isSamePrice
                    ? 'No change'
                    : isUpgrade
                      ? `+€${priceDifference}/night`
                      : `€${Math.abs(priceDifference)}/night less`}
                </span>
              </div>
            </div>

            {isUpgrade && (
              <div className="mt-2 text-xs text-gray-600">
                Total increase: €{priceDifference * (reservation.number_of_nights ?? 1)} for this
                stay
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>

            <Button
              onClick={onConfirmChange}
              className={`flex-1 ${
                isUpgrade
                  ? 'bg-red-600 hover:bg-red-700'
                  : isDowngrade
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isUpgrade
                ? `Confirm Upgrade (+€${priceDifference})`
                : isDowngrade
                  ? `Confirm Change (€${Math.abs(priceDifference)} less)`
                  : 'Confirm Change'}
            </Button>

            {isUpgrade && (
              <Button
                onClick={onFreeUpgrade}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600"
              >
                <Gift className="mr-2 h-4 w-4" />
                Free Upgrade
              </Button>
            )}
          </div>

          {isUpgrade && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
              <div className="flex items-start space-x-2">
                <Gift className="mt-0.5 h-4 w-4 text-yellow-600" />
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
