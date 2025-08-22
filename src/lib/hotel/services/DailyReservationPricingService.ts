import { supabase } from '../../supabase';

export interface DailyDetail {
  id?: number;
  reservationId: number;
  stayDate: Date;
  adultsPresent: number;
  childrenPresent: number[]; // Array of guest_children.id's
  parkingSpotsNeeded: number;
  petsPresent: boolean;
  towelRentals: number;
  notes?: string;
}

export interface DailyPricingBreakdown {
  date: Date;
  occupancy: {
    adults: number;
    children: Array<{
      id: number;
      name: string;
      age: number;
    }>;
  };
  pricing: {
    seasonalPeriod: string;
    baseRate: number;
    baseAccommodation: number;
    childDiscounts: number;
    netAccommodation: number;
    serviceFees: {
      parking: number;
      pets: number;
      towels: number;
      tourism: number;
      total: number;
    };
    dailyTotal: number;
  };
  editable: boolean;
}

export interface ReservationDailyPricingResult {
  reservationId: number;
  dailyBreakdown: DailyPricingBreakdown[];
  summary: {
    totalNights: number;
    totalAccommodation: number;
    totalServices: number;
    grandTotal: number;
  };
}

export class DailyReservationPricingService {
  private static instance: DailyReservationPricingService;
  
  private constructor() {}
  
  public static getInstance(): DailyReservationPricingService {
    if (!DailyReservationPricingService.instance) {
      DailyReservationPricingService.instance = new DailyReservationPricingService();
    }
    return DailyReservationPricingService.instance;
  }

  /**
   * Get or create daily details for a reservation
   */
  async getReservationDailyDetails(reservationId: number): Promise<DailyDetail[]> {
    try {
      // First check if daily details already exist
      const { data: existingDetails, error: detailsError } = await supabase
        .from('reservation_daily_details')
        .select('*')
        .eq('reservation_id', reservationId)
        .order('stay_date');

      if (detailsError) throw detailsError;
      
      if (existingDetails && existingDetails.length > 0) {
        // Return existing daily details
        return existingDetails.map(detail => ({
          id: detail.id,
          reservationId: detail.reservation_id,
          stayDate: new Date(detail.stay_date),
          adultsPresent: detail.adults_present,
          childrenPresent: detail.children_present || [],
          parkingSpotsNeeded: detail.parking_spots_needed || 0,
          petsPresent: detail.pets_present || false,
          towelRentals: detail.towel_rentals || 0,
          notes: detail.notes
        }));
      }
      
      // Create initial daily details from main reservation
      return await this.createInitialDailyDetails(reservationId);
      
    } catch (error) {
      console.error('Error getting reservation daily details:', error);
      throw error;
    }
  }

  /**
   * Create initial daily details from main reservation data
   */
  private async createInitialDailyDetails(reservationId: number): Promise<DailyDetail[]> {
    try {
      // Get main reservation data
      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .select(`
          *,
          guest_children (id, name, age)
        `)
        .eq('id', reservationId)
        .single();

      if (reservationError) throw reservationError;
      
      // Generate daily details for each night
      const checkIn = new Date(reservation.check_in_date);
      const checkOut = new Date(reservation.check_out_date);
      const dailyDetails: DailyDetail[] = [];
      
      // Get all children IDs for this reservation
      const childrenIds = (reservation.guest_children || []).map((child: any) => child.id);
      
      for (let date = new Date(checkIn); date < checkOut; date.setDate(date.getDate() + 1)) {
        const dailyDetail: DailyDetail = {
          reservationId,
          stayDate: new Date(date),
          adultsPresent: reservation.adults,
          childrenPresent: childrenIds,
          parkingSpotsNeeded: reservation.parking_required ? 1 : 0,
          petsPresent: reservation.has_pets || false,
          towelRentals: 0,
        };
        
        dailyDetails.push(dailyDetail);
      }
      
      // Save to database
      const dailyDetailsToInsert = dailyDetails.map(detail => ({
        reservation_id: detail.reservationId,
        stay_date: detail.stayDate.toISOString().split('T')[0],
        adults_present: detail.adultsPresent,
        children_present: detail.childrenPresent,
        parking_spots_needed: detail.parkingSpotsNeeded,
        pets_present: detail.petsPresent,
        towel_rentals: detail.towelRentals
      }));
      
      const { data: insertedDetails, error: insertError } = await supabase
        .from('reservation_daily_details')
        .insert(dailyDetailsToInsert)
        .select();
        
      if (insertError) throw insertError;
      
      return dailyDetails;
      
    } catch (error) {
      console.error('Error creating initial daily details:', error);
      throw error;
    }
  }

  /**
   * Calculate complete daily pricing breakdown
   */
  async calculateDailyPricingBreakdown(reservationId: number): Promise<ReservationDailyPricingResult> {
    try {
      // Get reservation with room details
      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .select(`
          *,
          rooms (*),
          pricing_tiers (*)
        `)
        .eq('id', reservationId)
        .single();

      if (reservationError) throw reservationError;
      
      // Get daily details
      const dailyDetails = await this.getReservationDailyDetails(reservationId);
      
      // Calculate pricing for each day
      const dailyBreakdown: DailyPricingBreakdown[] = [];
      
      for (const day of dailyDetails) {
        const breakdown = await this.calculateSingleDayPricing(reservation, day);
        dailyBreakdown.push(breakdown);
      }
      
      // Calculate summary
      const summary = {
        totalNights: dailyBreakdown.length,
        totalAccommodation: dailyBreakdown.reduce((sum, day) => sum + day.pricing.netAccommodation, 0),
        totalServices: dailyBreakdown.reduce((sum, day) => sum + day.pricing.serviceFees.total, 0),
        grandTotal: dailyBreakdown.reduce((sum, day) => sum + day.pricing.dailyTotal, 0)
      };
      
      return {
        reservationId,
        dailyBreakdown,
        summary
      };
      
    } catch (error) {
      console.error('Error calculating daily pricing breakdown:', error);
      throw error;
    }
  }

  /**
   * Calculate pricing for a single day
   */
  private async calculateSingleDayPricing(reservation: any, dailyDetail: DailyDetail): Promise<DailyPricingBreakdown> {
    try {
      // Get seasonal period for this date
      const seasonalPeriod = this.getSeasonalPeriod(dailyDetail.stayDate);
      
      // Get base room rate from rooms table (single source of truth!)
      const roomRateField = `seasonal_rate_${seasonalPeriod.toLowerCase()}`;
      const baseRoomRate = parseFloat(reservation.rooms[roomRateField] || '0');
      
      // Apply pricing tier discount if applicable
      let finalRate = baseRoomRate;
      if (reservation.pricing_tiers) {
        const tierDiscountField = `seasonal_rate_${seasonalPeriod.toLowerCase()}`;
        const discountMultiplier = parseFloat(reservation.pricing_tiers[tierDiscountField] || '0');
        if (reservation.pricing_tiers.is_percentage_discount) {
          finalRate = baseRoomRate * (1 - discountMultiplier);
        }
      }
      
      // Get children details for this day
      let childrenPresent: Array<{id: number, name: string, age: number}> = [];
      if (dailyDetail.childrenPresent.length > 0) {
        const { data: children, error: childrenError } = await supabase
          .from('guest_children')
          .select('id, name, age')
          .in('id', dailyDetail.childrenPresent);
          
        if (!childrenError) {
          childrenPresent = children || [];
        }
      }
      
      // Calculate base accommodation cost
      const isRoom401 = reservation.rooms.room_number === '401';
      let baseAccommodation = 0;
      
      if (isRoom401) {
        // Room 401: Fixed price per apartment, not per person
        baseAccommodation = finalRate;
      } else {
        // Regular rooms: Per person pricing
        baseAccommodation = finalRate * (dailyDetail.adultsPresent + childrenPresent.length);
      }
      
      // Calculate child discounts (only on accommodation)
      const childDiscounts = this.calculateChildDiscounts(childrenPresent, finalRate, isRoom401);
      const netAccommodation = baseAccommodation - childDiscounts;
      
      // Calculate service fees
      const serviceFees = this.calculateDailyServiceFees(
        dailyDetail.adultsPresent,
        childrenPresent,
        dailyDetail.parkingSpotsNeeded,
        dailyDetail.petsPresent,
        dailyDetail.towelRentals,
        isRoom401
      );
      
      return {
        date: dailyDetail.stayDate,
        occupancy: {
          adults: dailyDetail.adultsPresent,
          children: childrenPresent
        },
        pricing: {
          seasonalPeriod,
          baseRate: finalRate,
          baseAccommodation,
          childDiscounts,
          netAccommodation,
          serviceFees,
          dailyTotal: netAccommodation + serviceFees.total
        },
        editable: true
      };
      
    } catch (error) {
      console.error('Error calculating single day pricing:', error);
      throw error;
    }
  }

  /**
   * Calculate child discounts based on ages
   */
  private calculateChildDiscounts(children: Array<{age: number}>, baseRate: number, isRoom401: boolean): number {
    if (isRoom401) {
      return 0; // Room 401 is fixed price per apartment
    }
    
    let totalDiscount = 0;
    
    for (const child of children) {
      const childAccommodationCost = baseRate;
      let discountRate = 0;
      
      if (child.age < 3) {
        discountRate = 1.0; // 100% discount (free)
      } else if (child.age < 7) {
        discountRate = 0.5; // 50% discount
      } else if (child.age < 14) {
        discountRate = 0.3; // 30% discount
      }
      // Children 14+ pay full rate
      
      totalDiscount += childAccommodationCost * discountRate;
    }
    
    return totalDiscount;
  }

  /**
   * Calculate daily service fees
   */
  private calculateDailyServiceFees(
    adults: number, 
    children: Array<{age: number}>, 
    parkingSpots: number, 
    hasPets: boolean, 
    towelRentals: number, 
    isRoom401: boolean
  ) {
    // Tourism tax (adults + children 12+)
    const taxablePersons = adults + children.filter(child => child.age >= 12).length;
    const tourism = taxablePersons * 1.50; // €1.50 per person per night
    
    // Parking (Room 401 includes 3 free spaces)
    let parking = 0;
    if (parkingSpots > 0) {
      if (isRoom401) {
        const extraSpaces = Math.max(0, parkingSpots - 3);
        parking = extraSpaces * 7; // €7 per extra space
      } else {
        parking = parkingSpots * 7; // €7 per space
      }
    }
    
    // Pet fee
    const pets = hasPets ? 20 : 0; // €20 per night if pets present
    
    // Towel rental
    const towels = towelRentals * 5; // €5 per towel per day
    
    return {
      parking,
      pets,
      towels,
      tourism,
      total: parking + pets + towels + tourism
    };
  }

  /**
   * Get seasonal period for a date
   */
  private getSeasonalPeriod(date: Date): string {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // Simplified seasonal logic - you can enhance this
    if (month <= 4 || month === 12) return 'A'; // Winter/Early Spring
    if (month === 5 || month === 10) return 'B'; // Spring/Late Fall  
    if (month === 6 || month === 9) return 'C'; // Early Summer/Early Fall
    if (month >= 7 && month <= 8) return 'D'; // Peak Summer
    
    return 'A';
  }

  /**
   * Update daily detail
   */
  async updateDailyDetail(dailyDetail: DailyDetail): Promise<void> {
    try {
      const { error } = await supabase
        .from('reservation_daily_details')
        .update({
          adults_present: dailyDetail.adultsPresent,
          children_present: dailyDetail.childrenPresent,
          parking_spots_needed: dailyDetail.parkingSpotsNeeded,
          pets_present: dailyDetail.petsPresent,
          towel_rentals: dailyDetail.towelRentals,
          notes: dailyDetail.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', dailyDetail.id);
        
      if (error) throw error;
      
      // Recalculate and update pricing
      await this.recalculateDailyPricing(dailyDetail.reservationId, dailyDetail.stayDate);
      
    } catch (error) {
      console.error('Error updating daily detail:', error);
      throw error;
    }
  }

  /**
   * Recalculate pricing for a specific day
   */
  private async recalculateDailyPricing(reservationId: number, stayDate: Date): Promise<void> {
    try {
      // Get updated reservation and daily detail
      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .select(`*, rooms (*), pricing_tiers (*)`)
        .eq('id', reservationId)
        .single();
        
      if (reservationError) throw reservationError;
      
      const { data: dailyDetail, error: dailyError } = await supabase
        .from('reservation_daily_details')
        .select('*')
        .eq('reservation_id', reservationId)
        .eq('stay_date', stayDate.toISOString().split('T')[0])
        .single();
        
      if (dailyError) throw dailyError;
      
      // Calculate new pricing
      const dailyDetailObj: DailyDetail = {
        id: dailyDetail.id,
        reservationId: dailyDetail.reservation_id,
        stayDate: new Date(dailyDetail.stay_date),
        adultsPresent: dailyDetail.adults_present,
        childrenPresent: dailyDetail.children_present || [],
        parkingSpotsNeeded: dailyDetail.parking_spots_needed || 0,
        petsPresent: dailyDetail.pets_present || false,
        towelRentals: dailyDetail.towel_rentals || 0
      };
      
      const pricingBreakdown = await this.calculateSingleDayPricing(reservation, dailyDetailObj);
      
      // Update pricing in database
      const { error: updateError } = await supabase
        .from('reservation_daily_details')
        .update({
          daily_base_accommodation: pricingBreakdown.pricing.baseAccommodation,
          daily_child_discounts: pricingBreakdown.pricing.childDiscounts,
          daily_service_fees: pricingBreakdown.pricing.serviceFees.total,
          daily_total: pricingBreakdown.pricing.dailyTotal
        })
        .eq('id', dailyDetail.id);
        
      if (updateError) throw updateError;
      
    } catch (error) {
      console.error('Error recalculating daily pricing:', error);
      throw error;
    }
  }
}

export const dailyReservationPricingService = DailyReservationPricingService.getInstance();