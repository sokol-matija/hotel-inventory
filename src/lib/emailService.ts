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

export type EmailLanguage = 'en' | 'de' | 'it';
export type EmailType = 'welcome' | 'thankyou' | 'reminder';

export class HotelEmailService {
  
  // Translations for different languages
  private static translations = {
    en: {
      welcome: {
        subject: 'Welcome to Hotel Porec - Your Stay Information',
        greeting: 'Dear',
        welcomeText: "We're delighted to welcome you to Hotel Porec! Your reservation is confirmed and we're looking forward to hosting you. Here's everything you need to know for a comfortable stay.",
        bookingDetails: 'Your Booking Details',
        importantInfo: 'Important Check-in Information',
        dining: 'Dining & Amenities',
        explore: 'Explore Beautiful Poreč',
        contact: 'Contact Information',
        petFriendly: 'Pet-Friendly Stay',
        assistance: 'Need Assistance?',
        checkInTime: 'Check-in time: 2:00 PM - 11:00 PM',
        checkOutTime: 'Check-out time: Until 10:00 AM',
        breakfastHours: 'Breakfast: 7:00 AM - 10:30 AM (Continental buffet)',
        parking: 'Parking: €7/night (limited spaces)',
      }
    },
    de: {
      welcome: {
        subject: 'Willkommen im Hotel Porec - Ihre Aufenthaltsinformationen',
        greeting: 'Liebe/r',
        welcomeText: "Wir freuen uns sehr, Sie im Hotel Porec begrüßen zu dürfen! Ihre Reservierung ist bestätigt und wir freuen uns darauf, Sie zu beherbergen. Hier ist alles, was Sie für einen komfortablen Aufenthalt wissen müssen.",
        bookingDetails: 'Ihre Buchungsdetails',
        importantInfo: 'Wichtige Check-in Informationen',
        dining: 'Gastronomie & Ausstattung',
        explore: 'Entdecken Sie das wunderschöne Poreč',
        contact: 'Kontaktinformationen',
        petFriendly: 'Haustierfreundlicher Aufenthalt',
        assistance: 'Benötigen Sie Hilfe?',
        checkInTime: 'Check-in Zeit: 14:00 - 23:00 Uhr',
        checkOutTime: 'Check-out Zeit: Bis 10:00 Uhr',
        breakfastHours: 'Frühstück: 7:00 - 10:30 Uhr (Kontinentales Buffet)',
        parking: 'Parkplatz: €7/Nacht (begrenzte Plätze)',
      }
    },
    it: {
      welcome: {
        subject: 'Benvenuti all\'Hotel Porec - Informazioni sul Soggiorno',
        greeting: 'Gentile',
        welcomeText: "Siamo lieti di darvi il benvenuto all'Hotel Porec! La vostra prenotazione è confermata e non vediamo l'ora di ospitarvi. Ecco tutto quello che dovete sapere per un soggiorno confortevole.",
        bookingDetails: 'Dettagli della Prenotazione',
        importantInfo: 'Informazioni Importanti per il Check-in',
        dining: 'Ristorazione e Servizi',
        explore: 'Scoprite la Bellissima Poreč',
        contact: 'Informazioni di Contatto',
        petFriendly: 'Soggiorno Pet-Friendly',
        assistance: 'Avete Bisogno di Assistenza?',
        checkInTime: 'Orario check-in: 14:00 - 23:00',
        checkOutTime: 'Orario check-out: Fino alle 10:00',
        breakfastHours: 'Colazione: 7:00 - 10:30 (Buffet continentale)',
        parking: 'Parcheggio: €7/notte (posti limitati)',
      }
    }
  };

  /**
   * Get base email styles with hotel branding
   */
  private static getEmailStyles(): string {
    return `
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 600px; 
            margin: 0 auto;
            background-color: #f8fafc;
            background-image: url('https://gkbpthurkucotikjefra.supabase.co/storage/v1/object/public/hotel-assets/mozaik_gp1_copy.png');
            background-repeat: no-repeat;
            background-position: bottom right;
            background-size: 300px;
            background-attachment: fixed;
        }
        .container { 
            background: rgba(255, 255, 255, 0.95); 
            margin: 20px; 
            border-radius: 12px; 
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .header { 
            background: white; 
            color: #1F2937; 
            padding: 30px 25px; 
            text-align: center;
            position: relative;
            border-bottom: 3px solid #3B82F6;
        }
        .logo { 
            max-width: 200px; 
            height: auto; 
            margin-bottom: 15px;
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
            background: rgba(248, 250, 252, 0.8);
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
        .booking-details { 
            background: rgba(239, 246, 255, 0.9); 
            border-left-color: #3B82F6;
        }
        .important-info { 
            background: rgba(254, 243, 199, 0.9); 
            border-left-color: #F59E0B;
        }
        .amenities { 
            background: rgba(236, 253, 245, 0.9); 
            border-left-color: #10B981;
        }
        .contact { 
            background: rgba(243, 232, 255, 0.9); 
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
            background: rgba(255, 255, 255, 0.9); 
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
            background: rgba(254, 226, 226, 0.9); 
            color: #DC2626; 
            padding: 15px; 
            border-radius: 6px; 
            font-weight: 500;
            margin: 15px 0;
        }
        .footer { 
            background: rgba(249, 250, 251, 0.95); 
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
            .logo { max-width: 150px; }
        }`;
  }

  /**
   * Generate welcome email with hotel information for guest
   */
  static generateWelcomeEmail(data: HotelInfoEmailData, language: EmailLanguage = 'en'): EmailTemplate {
    const { guest, reservation, room } = data;
    const checkInDate = format(reservation.checkIn, 'EEEE, MMMM do, yyyy');
    const checkOutDate = format(reservation.checkOut, 'EEEE, MMMM do, yyyy');
    const nights = Math.ceil((reservation.checkOut.getTime() - reservation.checkIn.getTime()) / (24 * 60 * 60 * 1000));

    const t = this.translations[language].welcome;
    const subject = `${t.subject} (${checkInDate})`;

    const body = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t.subject}</title>
    <style>
${this.getEmailStyles()}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://gkbpthurkucotikjefra.supabase.co/storage/v1/object/public/hotel-assets/LOGO1-hires.png" alt="Hotel Porec Logo" class="logo" />
            <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">Welcome to your home away from home in beautiful Poreč, Istria</p>
        </div>
        
        <div class="content">
            <p style="font-size: 18px; margin-bottom: 25px;">${t.greeting} ${guest.name},</p>
            
            <p>${t.welcomeText}</p>
            
            <div class="section booking-details">
                <h3>📋 ${t.bookingDetails}</h3>
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
                <h3>⏰ ${t.importantInfo}</h3>
                <ul>
                    <li><strong>${t.checkInTime}</strong></li>
                    <li><strong>${t.checkOutTime}</strong></li>
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
                <h3>🍽️ ${t.dining}</h3>
                
                <h4 style="color: #059669; margin: 15px 0 10px 0;">Breakfast Service</h4>
                <ul>
                    <li><strong>${t.breakfastHours}</strong></li>
                    <li><strong>Location:</strong> Main dining room (Ground floor)</li>
                    <li><strong>Style:</strong> Continental buffet with fresh local products</li>
                    <li><strong>Special diets:</strong> Please inform us in advance</li>
                </ul>

                <h4 style="color: #059669; margin: 15px 0 10px 0;">Hotel Facilities</h4>
                <ul>
                    <li><strong>Free WiFi:</strong> Available throughout the hotel</li>
                    <li><strong>Reception:</strong> 24-hour front desk service</li>
                    <li><strong>${t.parking}</strong></li>
                    <li><strong>Luggage storage:</strong> Available before check-in and after check-out</li>
                    <li><strong>Concierge:</strong> Local tours and restaurant recommendations</li>
                </ul>
            </div>

            <div class="section">
                <h3>🏖️ ${t.explore}</h3>
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
                <h3>📞 ${t.contact}</h3>
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
            <div class="section" style="background: rgba(254, 243, 199, 0.9); border-left-color: #F59E0B;">
                <h3>🐕 ${t.petFriendly}</h3>
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
                <h3>❓ ${t.assistance}</h3>
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
   * Generate thank you email after guest stay
   */
  static generateThankYouEmail(data: HotelInfoEmailData): EmailTemplate {
    const { guest, reservation, room } = data;
    const subject = `Thank you for staying with us at Hotel Porec!`;

    const body = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thank You - Hotel Porec</title>
    <style>
${this.getEmailStyles()}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://gkbpthurkucotikjefra.supabase.co/storage/v1/object/public/hotel-assets/LOGO1-hires.png" alt="Hotel Porec Logo" class="logo" />
            <h1>Thank You!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">We hope you had a wonderful stay in Poreč</p>
        </div>
        
        <div class="content">
            <p style="font-size: 18px; margin-bottom: 25px;">Dear ${guest.name},</p>
            
            <p>Thank you for choosing Hotel Porec for your recent stay! We hope you had a wonderful time exploring beautiful Poreč and enjoying our hospitality.</p>
            
            <div class="section" style="background: rgba(236, 253, 245, 0.9); border-left-color: #10B981;">
                <h3>🌟 Your Stay Summary</h3>
                <p>You stayed with us from <strong>${format(reservation.checkIn, 'MMMM do')} to ${format(reservation.checkOut, 'MMMM do, yyyy')}</strong> in room <strong>${formatRoomNumber(room)}</strong>.</p>
                <p>We hope you enjoyed your ${Math.ceil((reservation.checkOut.getTime() - reservation.checkIn.getTime()) / (24 * 60 * 60 * 1000))} nights with us!</p>
            </div>

            <div class="section" style="background: rgba(254, 243, 199, 0.9); border-left-color: #F59E0B;">
                <h3>🎉 Special Offer for Your Next Visit</h3>
                <p><strong>Book your next stay for 2025 and save 15%!</strong></p>
                <p>As a valued returning guest, we're offering you an exclusive 15% discount on your next booking for the 2025 season. Use promo code: <strong>RETURN2025</strong></p>
                
                <div style="text-align: center; margin: 20px 0;">
                    <a href="mailto:hotelporec@pu.t-com.hr?subject=Returning Guest Booking - 15% Discount" class="cta-button">Book Your Next Stay</a>
                </div>
                
                <p style="font-size: 14px; color: #92400e;">*Offer valid until March 31st, 2025. Cannot be combined with other offers. Subject to availability.</p>
            </div>

            <div class="section">
                <h3>📝 Help Us Improve</h3>
                <p>Your feedback is incredibly valuable to us. If you have a moment, we'd love to hear about your experience:</p>
                <ul>
                    <li>Leave us a review on Google or TripAdvisor</li>
                    <li>Share your photos on social media and tag us</li>
                    <li>Tell us directly what we could improve</li>
                </ul>
            </div>

            <div class="section contact">
                <h3>🏖️ Poreč Memories</h3>
                <p>We hope you were able to experience some of Poreč's highlights during your stay:</p>
                <ul>
                    <li>The stunning Euphrasian Basilica</li>
                    <li>Beautiful beaches along the Istrian coast</li>
                    <li>Delicious local cuisine and wine</li>
                    <li>The charming old town atmosphere</li>
                </ul>
                <p>We'd love to see your photos and memories from your trip!</p>
            </div>

            <div class="section">
                <h3>💌 Stay Connected</h3>
                <p>Follow us for updates, special offers, and beautiful Poreč photography:</p>
                <div style="text-align: center; margin-top: 20px;">
                    <a href="mailto:hotelporec@pu.t-com.hr" class="cta-button">✉️ Email Us</a>
                    <a href="tel:+385524516111" class="cta-button">📞 Call Us</a>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Hotel Porec</strong> | R Konoba 1, 52440 Poreč, Croatia | www.hotelporec.com</p>
            <p style="margin-top: 15px; font-size: 12px;">Thank you for being our guest. We can't wait to welcome you back!</p>
        </div>
    </div>
</body>
</html>`;

    return { subject, body };
  }

  /**
   * Generate summer season reminder email
   */
  static generateSeasonReminderEmail(data: { guest: Guest }): EmailTemplate {
    const { guest } = data;
    const subject = `Summer in Poreč is calling! Special rates for returning guests`;

    const body = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Summer Reminder - Hotel Porec</title>
    <style>
${this.getEmailStyles()}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://gkbpthurkucotikjefra.supabase.co/storage/v1/object/public/hotel-assets/LOGO1-hires.png" alt="Hotel Porec Logo" class="logo" />
            <h1>🌞 Summer in Poreč</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">The sunny season is approaching - book your perfect getaway!</p>
        </div>
        
        <div class="content">
            <p style="font-size: 18px; margin-bottom: 25px;">Dear ${guest.name},</p>
            
            <p>We loved having you as our guest last year, and summer is just around the corner! Poreč is getting ready for another beautiful season, and we'd love to welcome you back to Hotel Porec.</p>
            
            <div class="section" style="background: rgba(254, 243, 199, 0.9); border-left-color: #F59E0B;">
                <h3>🎯 Early Bird Special - Limited Time!</h3>
                <p><strong>Book now for summer 2025 and save up to 20%!</strong></p>
                <ul>
                    <li><strong>20% off</strong> - Book before February 28th</li>
                    <li><strong>15% off</strong> - Book before March 31st</li>
                    <li><strong>10% off</strong> - Book before April 30th</li>
                </ul>
                <p>As a returning guest, you get an additional 5% discount on top of these rates!</p>
                
                <div style="text-align: center; margin: 20px 0;">
                    <a href="mailto:hotelporec@pu.t-com.hr?subject=Summer 2025 Booking - Early Bird Special" class="cta-button">Book Your Summer Stay</a>
                </div>
            </div>

            <div class="section amenities">
                <h3>🏖️ What Awaits You This Summer</h3>
                <p>Experience the magic of Poreč in summer:</p>
                <ul>
                    <li><strong>Perfect Weather:</strong> Sunny days and warm Mediterranean evenings</li>
                    <li><strong>Crystal Clear Waters:</strong> Swimming and water sports at nearby beaches</li>
                    <li><strong>Local Festivals:</strong> Summer events and cultural celebrations</li>
                    <li><strong>Fresh Seafood:</strong> Seasonal specialties at local restaurants</li>
                    <li><strong>Extended Hours:</strong> More time to explore with longer daylight</li>
                </ul>
            </div>

            <div class="section">
                <h3>🗓️ Best Time to Visit</h3>
                <p>Based on last year's experience, here are our recommendations:</p>
                <ul>
                    <li><strong>June:</strong> Perfect weather, fewer crowds, wildflowers in bloom</li>
                    <li><strong>July:</strong> Peak summer, vibrant nightlife, all attractions open</li>
                    <li><strong>August:</strong> Warmest weather, ideal for beach lovers</li>
                    <li><strong>September:</strong> Mild temperatures, wine harvest season</li>
                </ul>
            </div>

            <div class="section contact">
                <h3>📞 Ready to Book?</h3>
                <p>Don't wait too long - the best dates fill up quickly! Contact us today:</p>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Phone</div>
                        <div class="info-value">+385 (0)52 451 611</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Email</div>
                        <div class="info-value">hotelporec@pu.t-com.hr</div>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 20px;">
                    <a href="tel:+385524516111" class="cta-button">📞 Call Now</a>
                    <a href="mailto:hotelporec@pu.t-com.hr" class="cta-button">✉️ Email Us</a>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Hotel Porec</strong> | R Konoba 1, 52440 Poreč, Croatia | www.hotelporec.com</p>
            <p style="margin-top: 15px; font-size: 12px;">We can't wait to welcome you back to beautiful Poreč!</p>
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
   * Generate email based on type and language
   */
  static generateEmail(
    type: EmailType,
    data: HotelInfoEmailData | { guest: Guest },
    language: EmailLanguage = 'en'
  ): EmailTemplate {
    switch (type) {
      case 'welcome':
        return this.generateWelcomeEmail(data as HotelInfoEmailData, language);
      case 'thankyou':
        return this.generateThankYouEmail(data as HotelInfoEmailData);
      case 'reminder':
        return this.generateSeasonReminderEmail(data as { guest: Guest });
      default:
        throw new Error(`Unknown email type: ${type}`);
    }
  }

  /**
   * Send email using Supabase Edge Function
   */
  static async sendEmail(
    to: string,
    template: EmailTemplate,
    guestName: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
      const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        console.warn('⚠️ Supabase not configured, falling back to simulation');
        // Fallback to simulation if no Supabase config
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log('📧 Email simulated (no Supabase config):', {
          to,
          subject: template.subject,
          bodyLength: template.body.length,
          timestamp: new Date().toISOString()
        });
        return {
          success: true,
          message: `Email simulated successfully to ${to} (no Supabase configured)`
        };
      }

      // Send email via Supabase Edge Function
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-email`;
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: to,
          subject: template.subject,
          html: template.body,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('📧 Email sent successfully via Supabase:', {
          to,
          subject: template.subject,
          emailId: result.emailId,
          timestamp: new Date().toISOString()
        });
        
        return {
          success: true,
          message: `Welcome email sent successfully to ${to}`
        };
      } else {
        console.error('❌ Supabase Edge Function error:', result);
        return {
          success: false,
          message: result.message || 'Failed to send email via Supabase'
        };
      }
      
    } catch (error) {
      console.error('❌ Failed to send email via Supabase:', error);
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