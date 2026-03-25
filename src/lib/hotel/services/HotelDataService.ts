// HotelDataService - Supabase integration for hotel data management
// Handles rooms, guests, reservations, and invoices

import { supabase } from '../../supabase';
import { Guest, Reservation, Hotel, Invoice } from '../types';
import type { Room } from '@/lib/queries/hooks/useRooms';
import { databaseAdapter } from './DatabaseAdapter';

type GuestRow = { [key: string]: unknown };

export class HotelDataService {
  private static instance: HotelDataService;

  private constructor() {}

  public static getInstance(): HotelDataService {
    if (!HotelDataService.instance) {
      HotelDataService.instance = new HotelDataService();
    }
    return HotelDataService.instance;
  }

  async getHotel(): Promise<Hotel> {
    return await databaseAdapter.getHotel();
  }

  async getRooms(): Promise<Room[]> {
    return await databaseAdapter.getRooms();
  }

  async getRoomById(roomId: string): Promise<Room | null> {
    return await databaseAdapter.getRoomById(roomId);
  }

  async updateRoom(roomId: string, updates: Partial<Room>): Promise<Room> {
    return await databaseAdapter.updateRoom(roomId, updates);
  }

  async getGuests(): Promise<Guest[]> {
    return await databaseAdapter.getGuests();
  }

  async createGuest(guestData: Omit<Guest, 'id' | 'display_name'>): Promise<Guest> {
    return await databaseAdapter.createGuest(guestData);
  }

  async updateGuest(id: string, updates: Partial<Guest>): Promise<Guest> {
    const updateData: Record<string, unknown> = {};

    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.nationality !== undefined) updateData.nationality = updates.nationality;
    if (updates.preferred_language !== undefined)
      updateData.preferred_language = updates.preferred_language;
    if (updates.has_pets !== undefined) updateData.has_pets = updates.has_pets;
    if (updates.date_of_birth !== undefined) updateData.date_of_birth = updates.date_of_birth;

    const { data, error } = await supabase
      .from('guests')
      .update(updateData)
      .eq('id', parseInt(id))
      .select()
      .single();

    if (error) throw error;

    return this.mapGuestFromDB(data as GuestRow);
  }

  async getReservations(): Promise<Reservation[]> {
    return await databaseAdapter.getReservations();
  }

  async createReservation(
    reservationData: Omit<Reservation, 'id' | 'bookingDate' | 'lastModified'>
  ): Promise<Reservation> {
    return await databaseAdapter.createReservation(reservationData);
  }

  async updateReservation(id: string, updates: Partial<Reservation>): Promise<Reservation> {
    return await databaseAdapter.updateReservation(id, updates);
  }

  async deleteReservation(id: string): Promise<void> {
    const { error } = await supabase.from('reservations').delete().eq('id', parseInt(id));
    if (error) throw error;
  }

  async getInvoices(): Promise<Invoice[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function mapInvoiceReservation(row: any) {
      const r = row.reservations;
      return {
        id: r.id.toString(),
        roomId: r.room_id?.toString() || '',
        guestId: row.guest_id?.toString() || '',
        checkIn: new Date(r.check_in_date),
        checkOut: new Date(r.check_out_date),
        numberOfGuests: r.adults + (r.children_count || 0),
        adults: r.adults,
        children: [],
        // reservations uses status_id (FK), not a status string — default to 'confirmed'
        status: 'confirmed',
        totalAmount: parseFloat(r.total_amount || '0'),
        numberOfNights: r.number_of_nights,
        baseRoomRate: parseFloat(r.base_room_rate || '0'),
        subtotal: parseFloat(r.subtotal || '0'),
        vatAmount: parseFloat(r.vat_amount || '0'),
        tourismTax: parseFloat(r.tourism_tax || '0'),
        petFee: parseFloat(r.pet_fee || '0'),
        parkingFee: parseFloat(r.parking_fee || '0'),
        additionalCharges: parseFloat(r.additional_charges || '0'),
        specialRequests: '',
        source: 'direct',
        hasPets: false,
        hasParking: false,
        seasonalPeriod: r.seasonal_period || 'low',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    const { data, error } = await supabase
      .from('invoices')
      .select(
        `
        *,
        fiscal_records (
          jir,
          zki,
          qr_code_data
        ),
        guests (
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        reservations (
          id,
          room_id,
          check_in_date,
          check_out_date,
          number_of_nights,
          adults,
          children_count,
          subtotal,
          vat_amount,
          tourism_tax,
          total_amount,
          pet_fee,
          parking_fee,
          additional_charges,
          status_id,
          seasonal_period,
          base_room_rate
        )
      `
      )
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (row: any): Invoice => ({
        id: row.id.toString(),
        invoiceNumber: row.invoice_number,
        reservationId: row.reservation_id?.toString() || '',
        guestId: row.guest_id?.toString() || '',
        companyId: row.company_id?.toString(),
        issueDate: new Date(row.issue_date),
        dueDate: new Date(row.due_date || row.issue_date),
        status: row.status || 'draft',
        subtotal: parseFloat(row.subtotal || '0'),
        vatRate: 0.13,
        vatAmount: parseFloat(row.vat_amount || '0'),
        tourismTax: parseFloat(row.tourism_tax || '0'),
        totalAmount: parseFloat(row.total_amount || '0'),
        paidAmount: parseFloat(row.paid_amount || '0'),
        remainingAmount: parseFloat(row.balance_due || '0'),
        currency: 'EUR',
        items: [],
        notes: row.notes || '',
        createdAt: new Date(row.created_at || Date.now()),
        updatedAt: new Date(row.updated_at || Date.now()),
        fiscalData: row.fiscal_records?.[0]
          ? {
              oib: '87246357068',
              jir: row.fiscal_records[0].jir,
              zki: row.fiscal_records[0].zki,
              qrCodeData: row.fiscal_records[0].qr_code_data,
            }
          : undefined,
        guest: row.guests
          ? ({
              id: row.guests.id,
              first_name: row.guests.first_name,
              last_name: row.guests.last_name,
              full_name: `${row.guests.first_name} ${row.guests.last_name}`,
              email: row.guests.email,
              phone: row.guests.phone,
              nationality: null,
              preferred_language: 'en',
              dietary_restrictions: null,
              has_pets: null,
              is_vip: null,
              vip_level: null,
              marketing_consent: null,
              average_rating: null,
              notes: null,
              country_code: null,
              date_of_birth: null,
              passport_number: null,
              id_card_number: null,
              special_needs: null,
              created_at: null,
              updated_at: null,
              display_name: `${row.guests.first_name} ${row.guests.last_name}`.trim(),
            } as Guest)
          : undefined,
        reservation: row.reservations
          ? (mapInvoiceReservation(row) as unknown as Reservation)
          : undefined,
      })
    );
  }

  private mapGuestFromDB(guestRow: GuestRow): Guest {
    const fn = String(guestRow.first_name || '');
    const ln = String(guestRow.last_name || '');
    return {
      id: Number(guestRow.id),
      first_name: fn,
      last_name: ln,
      full_name: String(guestRow.full_name || `${fn} ${ln}`.trim()),
      email: guestRow.email ? String(guestRow.email) : null,
      phone: guestRow.phone ? String(guestRow.phone) : null,
      date_of_birth: guestRow.date_of_birth ? String(guestRow.date_of_birth) : null,
      nationality: guestRow.nationality ? String(guestRow.nationality) : null,
      passport_number: guestRow.passport_number ? String(guestRow.passport_number) : null,
      id_card_number: guestRow.id_card_number ? String(guestRow.id_card_number) : null,
      preferred_language: guestRow.preferred_language ? String(guestRow.preferred_language) : null,
      dietary_restrictions: (guestRow.dietary_restrictions as string[] | null) ?? null,
      special_needs: guestRow.special_needs ? String(guestRow.special_needs) : null,
      has_pets: guestRow.has_pets ? Boolean(guestRow.has_pets) : null,
      is_vip: guestRow.is_vip ? Boolean(guestRow.is_vip) : null,
      vip_level: guestRow.vip_level ? Number(guestRow.vip_level) : null,
      marketing_consent: null,
      average_rating: null,
      notes: guestRow.notes ? String(guestRow.notes) : null,
      country_code: null,
      created_at: guestRow.created_at ? String(guestRow.created_at) : null,
      updated_at: guestRow.updated_at ? String(guestRow.updated_at) : null,
      display_name: `${fn} ${ln}`.trim(),
    };
  }
}

export const hotelDataService = HotelDataService.getInstance();
