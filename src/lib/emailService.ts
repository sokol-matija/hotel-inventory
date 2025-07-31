// Hotel Email Service for Guest Information
// Sends check-in instructions, breakfast times, and hotel amenities information

import { Reservation, Guest, Room } from './hotel/types';
import { format, addDays } from 'date-fns';
import { SAMPLE_GUESTS } from './hotel/sampleData';
import { HOTEL_POREC_ROOMS } from './hotel/hotelData';
import { formatRoomNumber } from './hotel/calendarUtils';

interface EmailTemplate {
  subject: string;
  body: string;
}

interface HotelInfoEmailData {
  guest: Guest;
  reservation: Reservation;
  room: Room;
}

export class HotelEmailService {
  
  /**
   * Generate welcome email with hotel information for guest
   */
  static generateWelcomeEmail(data: HotelInfoEmailData): EmailTemplate {
    const { guest, reservation, room } = data;
    const checkInDate = format(reservation.checkIn, 'EEEE, MMMM do, yyyy');
    const checkOutDate = format(reservation.checkOut, 'EEEE, MMMM do, yyyy');
    const nights = Math.ceil((reservation.checkOut.getTime() - reservation.checkIn.getTime()) / (24 * 60 * 60 * 1000));

    const subject = `Welcome to Hotel Porec - Your Stay Information (${checkInDate})`;

    const body = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Hotel Porec</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 600px; 
            margin: 0 auto;
            background-color: #f8fafc;
        }
        .container { 
            background: white; 
            margin: 20px; 
            border-radius: 12px; 
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .header { 
            background: linear-gradient(135deg, #3B82F6, #1E40AF); 
            color: white; 
            padding: 30px 25px; 
            text-align: center;
        }
        .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: 300; 
        }
        .content { 
            padding: 30px 25px; 
        }
        .section { 
            margin-bottom: 30px; 
            padding: 20px;
            background: #f8fafc;
            border-radius: 8px;
            border-left: 4px solid #3B82F6;
        }
        .section h3 { 
            color: #1E40AF; 
            margin-top: 0; 
            font-size: 18px;
            display: flex;
            align-items: center;
        }
        .section-icon {
            width: 20px;
            height: 20px;
            margin-right: 10px;
        }
        .booking-details { 
            background: #EFF6FF; 
            border-left-color: #3B82F6;
        }
        .important-info { 
            background: #FEF3C7; 
            border-left-color: #F59E0B;
        }
        .amenities { 
            background: #ECFDF5; 
            border-left-color: #10B981;
        }
        .contact { 
            background: #F3E8FF; 
            border-left-color: #8B5CF6;
        }
        .info-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 15px; 
            margin: 15px 0;
        }
        .info-item { 
            padding: 12px; 
            background: white; 
            border-radius: 6px;
            border: 1px solid #E5E7EB;
        }
        .info-label { 
            font-weight: 600; 
            color: #6B7280; 
            font-size: 12px; 
            text-transform: uppercase; 
            letter-spacing: 0.5px;
        }
        .info-value { 
            font-size: 16px; 
            color: #1F2937; 
            margin-top: 4px;
        }
        .highlight { 
            background: #FEE2E2; 
            color: #DC2626; 
            padding: 15px; 
            border-radius: 6px; 
            font-weight: 500;
            margin: 15px 0;
        }
        .footer { 
            background: #F9FAFB; 
            padding: 25px; 
            text-align: center; 
            color: #6B7280; 
            font-size: 14px;
            border-top: 1px solid #E5E7EB;
        }
        .cta-button {
            display: inline-block;
            background: #3B82F6;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 10px 5px;
        }
        ul { 
            margin: 15px 0; 
            padding-left: 20px;
        }
        li { 
            margin-bottom: 8px;
        }
        @media (max-width: 600px) {
            .container { margin: 10px; }
            .content { padding: 20px; }
            .info-grid { grid-template-columns: 1fr; }
            .header h1 { font-size: 24px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏨 Hotel Porec</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">Welcome to your home away from home in beautiful Poreč, Istria</p>
        </div>
        
        <div class="content">
            <p style="font-size: 18px; margin-bottom: 25px;">Dear ${guest.name},</p>
            
            <p>We're delighted to welcome you to Hotel Porec! Your reservation is confirmed and we're looking forward to hosting you. Here's everything you need to know for a comfortable stay.</p>
            
            <div class="section booking-details">
                <h3>📋 Your Booking Details</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Room</div>
                        <div class="info-value">${formatRoomNumber(room)} - ${room.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Guests</div>
                        <div class="info-value">${reservation.numberOfGuests} guest${reservation.numberOfGuests > 1 ? 's' : ''}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Check-in</div>
                        <div class="info-value">${checkInDate}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Check-out</div>
                        <div class="info-value">${checkOutDate}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Duration</div>
                        <div class="info-value">${nights} night${nights > 1 ? 's' : ''}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Total Amount</div>
                        <div class="info-value">€${reservation.totalAmount.toFixed(2)}</div>
                    </div>
                </div>
            </div>

            <div class="section important-info">
                <h3>⏰ Important Check-in Information</h3>
                <ul>
                    <li><strong>Check-in time:</strong> 2:00 PM - 11:00 PM</li>
                    <li><strong>Check-out time:</strong> Until 10:00 AM</li>
                    <li><strong>Early/Late arrivals:</strong> Please contact us in advance</li>
                    <li><strong>Required documents:</strong> Valid ID/Passport for all guests</li>
                    <li><strong>Key cards:</strong> Will be provided at check-in</li>
                </ul>
                
                ${reservation.checkIn.getHours() < 14 ? 
                    '<div class="highlight">🕐 Early Check-in Notice: Your check-in is scheduled before 2:00 PM. Please contact us to confirm room availability.</div>' : 
                    ''
                }
            </div>

            <div class="section amenities">
                <h3>🍽️ Dining & Amenities</h3>
                
                <h4 style="color: #059669; margin: 15px 0 10px 0;">Breakfast Service</h4>
                <ul>
                    <li><strong>Hours:</strong> 7:00 AM - 10:30 AM (Monday-Sunday)</li>
                    <li><strong>Location:</strong> Main dining room (Ground floor)</li>
                    <li><strong>Style:</strong> Continental buffet with fresh local products</li>
                    <li><strong>Special diets:</strong> Please inform us in advance</li>
                </ul>

                <h4 style="color: #059669; margin: 15px 0 10px 0;">Hotel Facilities</h4>
                <ul>
                    <li><strong>Free WiFi:</strong> Available throughout the hotel</li>
                    <li><strong>Reception:</strong> 24-hour front desk service</li>
                    <li><strong>Parking:</strong> €7/night (limited spaces, please reserve)</li>
                    <li><strong>Luggage storage:</strong> Available before check-in and after check-out</li>
                    <li><strong>Concierge:</strong> Local tours and restaurant recommendations</li>
                </ul>
            </div>

            <div class="section">
                <h3>🏖️ Explore Beautiful Poreč</h3>
                <p>Poreč is a stunning Istrian coastal town with rich history and beautiful beaches. Here are our top recommendations:</p>
                <ul>
                    <li><strong>Euphrasian Basilica:</strong> UNESCO World Heritage site (5 min walk)</li>
                    <li><strong>Old Town:</strong> Roman streets and Venetian architecture (3 min walk)</li>
                    <li><strong>Beaches:</strong> Plava Laguna and Zelena Laguna (10 min by bus)</li>
                    <li><strong>Restaurants:</strong> Ask our concierge for the best local taverns</li>
                    <li><strong>Day trips:</strong> Rovinj, Motovun, or wine tasting in Istrian hills</li>
                </ul>
            </div>

            <div class="section contact">
                <h3>📞 Contact Information</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Hotel Phone</div>
                        <div class="info-value">+385 (0)52 451 611</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Email</div>
                        <div class="info-value">hotelporec@pu.t-com.hr</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Address</div>
                        <div class="info-value">R Konoba 1, 52440 Poreč, Croatia</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Emergency</div>
                        <div class="info-value">24/7 front desk service</div>
                    </div>
                </div>
            </div>

            ${guest.hasPets ? `
            <div class="section" style="background: #FEF3C7; border-left-color: #F59E0B;">
                <h3>🐕 Pet-Friendly Stay</h3>
                <p>We're happy to welcome your furry friend! Please note:</p>
                <ul>
                    <li>Pet fee: €20 per stay (already included in your booking)</li>
                    <li>Pets must be kept on leash in common areas</li>
                    <li>Please clean up after your pet</li>
                    <li>Let us know if you need pet beds or bowls</li>
                </ul>
            </div>
            ` : ''}

            <div class="section">
                <h3>❓ Need Assistance?</h3>
                <p>Our friendly staff is here to help make your stay memorable. Don't hesitate to contact us with any questions or special requests.</p>
                
                <div style="text-align: center; margin-top: 20px;">
                    <a href="tel:+385524516111" class="cta-button">📞 Call Hotel</a>
                    <a href="mailto:hotelporec@pu.t-com.hr" class="cta-button">✉️ Email Us</a>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Hotel Porec</strong> | R Konoba 1, 52440 Poreč, Croatia | www.hotelporec.com</p>
            <p style="margin-top: 15px; font-size: 12px;">This email was sent regarding your upcoming stay. We look forward to welcoming you!</p>
        </div>
    </div>
</body>
</html>`;

    return { subject, body };
  }

  /**
   * Generate reminder email for upcoming stay
   */
  static generateReminderEmail(data: HotelInfoEmailData): EmailTemplate {
    const { guest, reservation, room } = data;
    const checkInDate = format(reservation.checkIn, 'EEEE, MMMM do, yyyy');
    const daysUntilCheckIn = Math.ceil((reservation.checkIn.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000));

    const subject = `Your stay at Hotel Porec is in ${daysUntilCheckIn} day${daysUntilCheckIn > 1 ? 's' : ''} - ${checkInDate}`;

    const body = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .container { background: white; margin: 20px; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #3B82F6; color: white; padding: 20px; text-align: center; }
        .content { padding: 25px; }
        .section { margin-bottom: 20px; padding: 15px; background: #f8fafc; border-radius: 6px; }
        .highlight { background: #FEE2E2; color: #DC2626; padding: 10px; border-radius: 4px; font-weight: 500; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏨 Hotel Porec</h1>
            <p>Your stay reminder</p>
        </div>
        
        <div class="content">
            <p>Dear ${guest.name},</p>
            
            <p>Just a friendly reminder that your stay at Hotel Porec is coming up in <strong>${daysUntilCheckIn} day${daysUntilCheckIn > 1 ? 's' : ''}</strong>!</p>
            
            <div class="section">
                <h3>📅 Your Booking Details</h3>
                <p><strong>Room:</strong> ${formatRoomNumber(room)}<br>
                <strong>Check-in:</strong> ${checkInDate} at 2:00 PM<br>
                <strong>Guests:</strong> ${reservation.numberOfGuests} guest${reservation.numberOfGuests > 1 ? 's' : ''}</p>
            </div>

            <div class="section">
                <h3>📋 What to Bring</h3>
                <ul>
                    <li>Valid ID/Passport for all guests</li>
                    <li>Confirmation number: ${reservation.id}</li>
                    ${guest.hasPets ? '<li>Pet vaccination certificates</li>' : ''}
                </ul>
            </div>

            <p>We're excited to welcome you to beautiful Poreč! If you have any questions, please don't hesitate to contact us.</p>
            
            <p>Best regards,<br>The Hotel Porec Team</p>
        </div>
    </div>
</body>
</html>`;

    return { subject, body };
  }

  /**
   * Send email using simulated email service
   * In a real implementation, this would integrate with SendGrid, Mailgun, etc.
   */
  static async sendEmail(
    to: string,
    template: EmailTemplate,
    guestName: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Log email for demo purposes
      console.log('📧 Email sent successfully:', {
        to,
        subject: template.subject,
        bodyLength: template.body.length,
        timestamp: new Date().toISOString()
      });
      
      // In a real implementation, you would call your email service API here
      // Example with fetch:
      // const response = await fetch('/api/send-email', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ to, subject: template.subject, html: template.body })
      // });
      
      return {
        success: true,
        message: `Welcome email sent successfully to ${to}`
      };
      
    } catch (error) {
      console.error('Failed to send email:', error);
      return {
        success: false,
        message: `Failed to send email to ${to}. Please try again.`
      };
    }
  }

  /**
   * Convenient method to send welcome email for a reservation
   */
  static async sendWelcomeEmail(reservation: Reservation): Promise<{ success: boolean; message: string }> {
    try {
      const guest = SAMPLE_GUESTS.find(g => g.id === reservation.guestId);
      const room = HOTEL_POREC_ROOMS.find(r => r.id === reservation.roomId);
      
      if (!guest || !room) {
        throw new Error('Guest or room not found');
      }

      const template = this.generateWelcomeEmail({ guest, reservation, room });
      return await this.sendEmail(guest.email, template, guest.name);
      
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return {
        success: false,
        message: 'Failed to send welcome email. Missing guest or room information.'
      };
    }
  }

  /**
   * Convenient method to send reminder email for a reservation
   */
  static async sendReminderEmail(reservation: Reservation): Promise<{ success: boolean; message: string }> {
    try {
      const guest = SAMPLE_GUESTS.find(g => g.id === reservation.guestId);
      const room = HOTEL_POREC_ROOMS.find(r => r.id === reservation.roomId);
      
      if (!guest || !room) {
        throw new Error('Guest or room not found');
      }

      const template = this.generateReminderEmail({ guest, reservation, room });
      return await this.sendEmail(guest.email, template, guest.name);
      
    } catch (error) {
      console.error('Error sending reminder email:', error);
      return {
        success: false,
        message: 'Failed to send reminder email. Missing guest or room information.'
      };
    }
  }
}