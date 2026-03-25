import React from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import {
  Mail,
  Send,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
  Globe,
  Phone,
} from 'lucide-react';
import { useEmailTestState } from '../../../lib/hooks/useEmailTestState';
import { ntfyService } from '../../../lib/ntfyService';

export default function EmailTestPage() {
  const {
    // State
    emailAddress,
    selectedLanguage,
    selectedEmailType,
    isSendingEmail,
    isSendingNotification,
    lastEmailResult,
    lastNotificationResult,
    testData,
    isValidEmail,
    emailValidationError,

    // Actions
    setEmailAddress,
    setSelectedLanguage,
    setSelectedEmailType,
    sendTestEmail,
    sendTestNotification,
    getEmailTypes,
    getEmailLanguages,
    formatDisplayDate,
    getGuestBadges,
  } = useEmailTestState();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Email & Notification System Test</h1>
        <p className="text-gray-600">
          Test the hotel email system and Room 401 push notifications with sample data
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Test Data Overview */}
        <div className="space-y-6">
          {/* Guest Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Test Guest Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Name</div>
                  <div className="font-medium">{testData.guest.fullName}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Email</div>
                  <div className="font-medium text-blue-600">{testData.guest.email}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Phone</div>
                  <div className="font-medium">{testData.guest.phone}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Nationality</div>
                  <div className="font-medium">{testData.guest.nationality}</div>
                </div>
              </div>

              <div className="flex items-center space-x-4 pt-2">
                {getGuestBadges(testData.guest).map((badge) => (
                  <Badge
                    key={badge.label}
                    variant={badge.type === 'vip' ? 'default' : 'outline'}
                    className="text-xs"
                  >
                    <span className="mr-1">{badge.icon}</span>
                    {badge.label}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Reservation Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Test Reservation Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Room</div>
                  <div className="font-medium">
                    {testData.room.room_number} - {testData.room.name_english}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Check-in</div>
                  <div className="font-medium">
                    {formatDisplayDate(testData.reservation.checkIn)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Check-out</div>
                  <div className="font-medium">
                    {formatDisplayDate(testData.reservation.checkOut)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Duration</div>
                  <div className="font-medium">{testData.reservation.numberOfNights} nights</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Total Amount</div>
                  <div className="text-lg font-medium text-green-600">
                    €{testData.reservation.totalAmount.toFixed(2)}
                  </div>
                </div>
              </div>

              {testData.reservation.specialRequests && (
                <div className="border-t pt-2">
                  <div className="text-sm text-gray-500">Special Requests</div>
                  <div className="mt-1 rounded bg-yellow-50 p-2 text-sm">
                    {testData.reservation.specialRequests}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Email Test Controls */}
        <div className="space-y-6">
          {/* Email Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="h-5 w-5" />
                <span>Email Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email Address Input */}
              <div>
                <label
                  htmlFor="email-address"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  📧 Send to Email Address:
                </label>
                <Input
                  id="email-address"
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="Enter email address"
                  className={`w-full ${!isValidEmail && emailAddress ? 'border-red-500' : ''}`}
                />
                {emailValidationError && (
                  <p className="mt-1 text-sm text-red-600">{emailValidationError}</p>
                )}
              </div>

              {/* Email Type Selection */}
              <div>
                <p className="mb-2 block text-sm font-medium text-gray-700">📝 Email Type:</p>
                <div className="grid grid-cols-1 gap-2">
                  {getEmailTypes().map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setSelectedEmailType(type.value)}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        selectedEmailType === type.value
                          ? 'border-blue-500 bg-blue-50 text-blue-900'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">{type.label}</div>
                      <div className="text-sm text-gray-600">{type.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language Selection */}
              {selectedEmailType === 'welcome' && (
                <div>
                  <p className="mb-2 block text-sm font-medium text-gray-700">
                    <Globe className="mr-1 inline h-4 w-4" />
                    Language:
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {getEmailLanguages().map((lang) => (
                      <button
                        key={lang.value}
                        onClick={() => setSelectedLanguage(lang.value)}
                        className={`rounded-lg border p-2 text-center transition-colors ${
                          selectedLanguage === lang.value
                            ? 'border-blue-500 bg-blue-50 text-blue-900'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-lg">{lang.flag}</div>
                        <div className="text-xs font-medium">{lang.value.toUpperCase()}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={sendTestEmail}
                disabled={isSendingEmail || !isValidEmail}
                className="w-full"
                size="lg"
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Test Email...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send {selectedEmailType.charAt(0).toUpperCase() +
                      selectedEmailType.slice(1)}{' '}
                    Email
                    {selectedEmailType === 'welcome' && ` (${selectedLanguage.toUpperCase()})`}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Email Result Card */}
          {lastEmailResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {lastEmailResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span>Email Send Result</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`rounded-lg p-4 ${
                    lastEmailResult.success
                      ? 'bg-green-50 text-green-800'
                      : 'bg-red-50 text-red-800'
                  }`}
                >
                  <p className="font-medium">
                    {lastEmailResult.success ? '✅ Success!' : '❌ Failed'}
                  </p>
                  <p className="mt-1 text-sm">{lastEmailResult.message}</p>
                </div>

                {lastEmailResult.success && (
                  <div className="mt-4 rounded-lg bg-blue-50 p-3">
                    <p className="text-sm text-blue-800">
                      📧 Check your email inbox at <strong>{emailAddress}</strong> for the{' '}
                      {selectedEmailType} email!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Email Content Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="h-5 w-5" />
                <span>Email Content Preview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                {selectedEmailType === 'welcome' && (
                  <>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🏨</span>
                      <span>Hotel Porec logo and branding</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>Booking details and room information</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>Check-in: 2:00 PM - 11:00 PM</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🍽️</span>
                      <span>Breakfast: 7:00 AM - 10:30 AM</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🅿️</span>
                      <span>Parking: €7/night</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🏖️</span>
                      <span>Poreč attractions & recommendations</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <span>Multi-language support (EN/DE/IT)</span>
                    </div>
                  </>
                )}

                {selectedEmailType === 'thankyou' && (
                  <>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🙏</span>
                      <span>Thank you message for completed stay</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🎉</span>
                      <span>15% discount offer for 2025 bookings</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">📝</span>
                      <span>Review request and feedback form</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">📸</span>
                      <span>Social media sharing encouragement</span>
                    </div>
                  </>
                )}

                {selectedEmailType === 'reminder' && (
                  <>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🌞</span>
                      <span>Summer season invitation</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🎯</span>
                      <span>Early bird discounts (up to 20% off)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🏖️</span>
                      <span>Seasonal activities and attractions</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🗓️</span>
                      <span>Best time to visit recommendations</span>
                    </div>
                  </>
                )}

                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>Hotel contact: +385 (0)52 451 611</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🎨</span>
                  <span>Beautiful mosaic background design</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ntfy Notification Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Phone className="h-5 w-5" />
              <span>Room 401 Notification Test</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="font-medium text-blue-900">📱 Mobile Setup Required</p>
                <p className="mt-1 text-blue-700">
                  Install the ntfy app and subscribe to:{' '}
                  <code className="rounded bg-white px-1 font-mono">{ntfyService.getTopic()}</code>
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🏨</span>
                  <span>Test Room 401 booking notification</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">📱</span>
                  <span>Push notification to subscribed devices</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">💰</span>
                  <span>Includes guest, dates, and pricing info</span>
                </div>
              </div>
            </div>

            <Button
              onClick={sendTestNotification}
              disabled={isSendingNotification}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {isSendingNotification ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Notification...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Test Room 401 Notification
                </>
              )}
            </Button>

            {lastNotificationResult && (
              <div
                className={`rounded-lg p-3 ${lastNotificationResult.success ? 'bg-green-50' : 'bg-red-50'}`}
              >
                <div className="flex items-center space-x-2">
                  {lastNotificationResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span
                    className={`text-sm font-medium ${lastNotificationResult.success ? 'text-green-800' : 'text-red-800'}`}
                  >
                    {lastNotificationResult.success ? 'Success!' : 'Failed'}
                  </span>
                </div>
                <p
                  className={`mt-1 text-sm ${lastNotificationResult.success ? 'text-green-700' : 'text-red-700'}`}
                >
                  {lastNotificationResult.message}
                </p>

                {lastNotificationResult.success && (
                  <div className="mt-4 rounded-lg bg-purple-50 p-3">
                    <p className="text-sm text-purple-800">
                      📱 Check your phone for the Room 401 booking notification!
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
