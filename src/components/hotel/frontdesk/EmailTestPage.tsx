import React, { useState } from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { 
  Mail, 
  Send, 
  User, 
  Calendar,
  Phone,
  Heart,
  CheckCircle,
  XCircle,
  Loader2,
  Globe
} from 'lucide-react';
import { HotelEmailService, EmailLanguage, EmailType } from '../../../lib/emailService';
import hotelNotification from '../../../lib/notifications';
import { Reservation, Guest, Room } from '../../../lib/hotel/types';

// Test data for email testing
const TEST_GUEST: Guest = {
  id: 'test-guest-001',
  name: 'Matija Sokol',
  email: 'sokol.matija@gmail.com',
  phone: '+385 98 123 456',
  emergencyContact: '+385 98 987 654',
  nationality: 'Croatia',
  preferredLanguage: 'English',
  hasPets: true,
  dateOfBirth: new Date('1985-03-15'),
  children: [
    {
      name: 'Ana Sokol',
      dateOfBirth: new Date('2015-06-20'),
      age: 8
    }
  ],
  totalStays: 3,
  isVip: true
};

const TEST_ROOM: Room = {
  id: 'room-301',
  number: '301',
  floor: 3,
  type: 'double',
  nameCroatian: 'Dvokrevetna soba',
  nameEnglish: 'Double Room',
  seasonalRates: {
    A: 47,
    B: 57,
    C: 69,
    D: 90
  },
  maxOccupancy: 2,
  isPremium: false,
  amenities: ['WiFi', 'Air Conditioning', 'Private Bathroom']
};

const TEST_RESERVATION: Reservation = {
  id: 'test-reservation-001',
  roomId: 'room-301',
  guestId: 'test-guest-001',
  checkIn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  checkOut: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
  numberOfGuests: 2,
  adults: 1,
  children: [
    {
      name: 'Ana Sokol',
      dateOfBirth: new Date('2015-06-20'),
      age: 8
    }
  ],
  status: 'confirmed',
  bookingSource: 'direct',
  specialRequests: 'Sea view room if available, late check-in around 9 PM',
  seasonalPeriod: 'C',
  baseRoomRate: 69,
  numberOfNights: 3,
  subtotal: 207,
  childrenDiscounts: 20.70, // 20% discount for child 7-14
  tourismTax: 9.00, // €1.50 x 2 guests x 3 nights
  vatAmount: 46.58, // 25% VAT
  petFee: 20,
  parkingFee: 21, // €7 x 3 nights
  shortStaySuplement: 0,
  additionalCharges: 0,
  totalAmount: 282.88,
  bookingDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
  lastModified: new Date(),
  notes: 'VIP guest, previous stays were excellent'
};

export default function EmailTestPage() {
  const [isSending, setIsSending] = useState(false);
  const [lastEmailResult, setLastEmailResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testEmail, setTestEmail] = useState('sokol.matija@gmail.com');
  const [selectedLanguage, setSelectedLanguage] = useState<EmailLanguage>('en');
  const [selectedEmailType, setSelectedEmailType] = useState<EmailType>('welcome');

  const handleSendTestEmail = async () => {
    setIsSending(true);
    setLastEmailResult(null);

    try {
      // Generate the email template based on selected type and language
      const emailData = selectedEmailType === 'reminder' 
        ? { guest: { ...TEST_GUEST, email: testEmail } }
        : { 
            guest: { ...TEST_GUEST, email: testEmail }, 
            reservation: TEST_RESERVATION, 
            room: TEST_ROOM 
          };
      
      const template = HotelEmailService.generateEmail(
        selectedEmailType,
        emailData,
        selectedLanguage
      );
      
      // Send the email with the generated template
      const result = await HotelEmailService.sendEmail(
        testEmail,
        template,
        TEST_GUEST.name
      );
      
      setLastEmailResult(result);

      if (result.success) {
        hotelNotification.success(
          'Test Email Sent Successfully!', 
          `${selectedEmailType} email sent to ${testEmail}`
        );
      } else {
        hotelNotification.error(
          'Email Send Failed', 
          result.message
        );
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      const errorResult = {
        success: false,
        message: 'Failed to send test email. Please check the console for details.'
      };
      setLastEmailResult(errorResult);
      hotelNotification.error('Email Send Error', errorResult.message);
    } finally {
      setIsSending(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Email System Test</h1>
        <p className="text-gray-600">Test the hotel welcome email system with sample data</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  <div className="font-medium">{TEST_GUEST.name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Email</div>
                  <div className="font-medium text-blue-600">{TEST_GUEST.email}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Phone</div>
                  <div className="font-medium">{TEST_GUEST.phone}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Nationality</div>
                  <div className="font-medium">{TEST_GUEST.nationality}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 pt-2">
                {TEST_GUEST.hasPets && (
                  <Badge variant="outline" className="text-xs">
                    <Heart className="h-3 w-3 mr-1" />
                    Has Pet
                  </Badge>
                )}
                {TEST_GUEST.isVip && (
                  <Badge variant="default" className="text-xs">⭐ VIP Guest</Badge>
                )}
                {TEST_GUEST.children.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    👶 {TEST_GUEST.children.length} Child
                  </Badge>
                )}
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
                    {TEST_ROOM.number} - {TEST_ROOM.nameEnglish}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Check-in</div>
                  <div className="font-medium">{formatDate(TEST_RESERVATION.checkIn)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Check-out</div>
                  <div className="font-medium">{formatDate(TEST_RESERVATION.checkOut)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Duration</div>
                  <div className="font-medium">{TEST_RESERVATION.numberOfNights} nights</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Total Amount</div>
                  <div className="font-medium text-lg text-green-600">
                    €{TEST_RESERVATION.totalAmount.toFixed(2)}
                  </div>
                </div>
              </div>

              {TEST_RESERVATION.specialRequests && (
                <div className="pt-2 border-t">
                  <div className="text-sm text-gray-500">Special Requests</div>
                  <div className="text-sm mt-1 p-2 bg-yellow-50 rounded">
                    {TEST_RESERVATION.specialRequests}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📧 Send to Email Address:
                </label>
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full"
                />
              </div>

              {/* Email Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📝 Email Type:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { value: 'welcome', label: '🏨 Welcome Email', desc: 'Check-in information & hotel details' },
                    { value: 'thankyou', label: '🙏 Thank You Email', desc: 'Post-stay gratitude & return offers' },
                    { value: 'reminder', label: '🌞 Summer Reminder', desc: 'Seasonal booking invitation' }
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setSelectedEmailType(type.value as EmailType)}
                      className={`p-3 text-left border rounded-lg transition-colors ${
                        selectedEmailType === type.value
                          ? 'border-blue-500 bg-blue-50 text-blue-900'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">{type.label}</div>
                      <div className="text-sm text-gray-600">{type.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language Selection */}
              {selectedEmailType === 'welcome' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Globe className="h-4 w-4 inline mr-1" />
                    Language:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'en', label: '🇬🇧 English', flag: '🇬🇧' },
                      { value: 'de', label: '🇩🇪 Deutsch', flag: '🇩🇪' },
                      { value: 'it', label: '🇮🇹 Italiano', flag: '🇮🇹' }
                    ].map((lang) => (
                      <button
                        key={lang.value}
                        onClick={() => setSelectedLanguage(lang.value as EmailLanguage)}
                        className={`p-2 text-center border rounded-lg transition-colors ${
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
                onClick={handleSendTestEmail}
                disabled={isSending || !testEmail}
                className="w-full"
                size="lg"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending Test Email...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send {selectedEmailType.charAt(0).toUpperCase() + selectedEmailType.slice(1)} Email
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
                <div className={`p-4 rounded-lg ${
                  lastEmailResult.success 
                    ? 'bg-green-50 text-green-800' 
                    : 'bg-red-50 text-red-800'
                }`}>
                  <p className="font-medium">
                    {lastEmailResult.success ? '✅ Success!' : '❌ Failed'}
                  </p>
                  <p className="text-sm mt-1">{lastEmailResult.message}</p>
                </div>
                
                {lastEmailResult.success && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      📧 Check your email inbox at <strong>{TEST_GUEST.email}</strong> for the welcome email!
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
      </div>
    </div>
  );
}