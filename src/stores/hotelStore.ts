import { create } from 'zustand'
import toast from 'react-hot-toast'
import {
  Reservation,
  ReservationStatus,
  Guest,
  Room,
  Invoice,
  Payment,
  FiscalRecord,
  RevenueAnalytics,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  Company,
  PricingTier,
  BookingSource,
  SeasonalPeriod
} from '../lib/hotel/types'
import { hotelDataService } from '../lib/hotel/services/HotelDataService'
import { realtimeService } from '../lib/hotel/services/RealtimeService'
import { databaseAdapter } from '../lib/hotel/services/DatabaseAdapter'
import { supabase, Database } from '../lib/supabase'
import { logger, logUserActivity, logBusinessOperation, trackError } from '../lib/logging/LoggingService'
import { performanceMonitor } from '../lib/monitoring/PerformanceMonitoringService'
import { auditTrail } from '../lib/audit/AuditTrailService'
import { OptimisticUpdateService } from '../lib/hotel/services/OptimisticUpdateService'

// Helper: compute derived room state from a rooms array
function computeRoomDerivedState(rooms: Room[]): { roomsByFloor: Record<number, Room[]>; roomLookup: Record<string, Room> } {
  const roomsByFloor: Record<number, Room[]> = {}
  const roomLookup: Record<string, Room> = {}
  rooms.forEach(room => {
    if (!roomsByFloor[room.floor]) roomsByFloor[room.floor] = []
    roomsByFloor[room.floor].push(room)
    roomLookup[room.id] = room
  })
  return { roomsByFloor, roomLookup }
}

// Module-level mapping helpers (no closure dependencies)
function mapCompanyFromDB(companyRow: Database['public']['Tables']['companies']['Row']): Company {
  return {
    id: companyRow.id.toString(),
    name: companyRow.name,
    oib: companyRow.oib,
    address: {
      street: companyRow.address,
      city: companyRow.city,
      postalCode: companyRow.postal_code,
      country: companyRow.country || 'Croatia'
    },
    contactPerson: companyRow.contact_person,
    email: companyRow.email,
    phone: companyRow.phone || '',
    fax: companyRow.fax || undefined,
    vatNumber: undefined,
    businessRegistrationNumber: undefined,
    discountPercentage: undefined,
    paymentTerms: undefined,
    isActive: companyRow.is_active || true,
    notes: companyRow.notes || '',
    createdAt: new Date(companyRow.created_at || ''),
    updatedAt: new Date(companyRow.updated_at || '')
  }
}

function mapPricingTierFromDB(tierRow: Database['public']['Tables']['pricing_tiers']['Row']): PricingTier {
  return {
    id: tierRow.id.toString(),
    name: tierRow.name,
    description: tierRow.description || '',
    discountPercentage: (tierRow.seasonal_rate_a || 0) * 100,
    isDefault: tierRow.is_default || false,
    isActive: tierRow.is_active || true,
    seasonalRates: {
      A: tierRow.seasonal_rate_a || 0,
      B: tierRow.seasonal_rate_b || 0,
      C: tierRow.seasonal_rate_c || 0,
      D: tierRow.seasonal_rate_d || 0
    },
    roomTypeMultipliers: {},
    minimumStayRequirement: tierRow.minimum_stay || undefined,
    advanceBookingDiscount: undefined,
    lastMinuteDiscount: undefined,
    validFrom: tierRow.valid_from ? new Date(tierRow.valid_from) : undefined,
    validTo: tierRow.valid_to ? new Date(tierRow.valid_to) : undefined,
    applicableServices: [],
    createdAt: new Date(tierRow.created_at || ''),
    updatedAt: new Date(tierRow.updated_at || '')
  }
}

async function loadInvoicesFromDB(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
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
        status,
        seasonal_period,
        base_room_rate
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw error

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any) => ({
    id: row.id.toString(),
    invoiceNumber: row.invoice_number,
    reservationId: row.reservation_id?.toString() || '',
    guestId: row.guest_id?.toString() || '',
    companyId: row.company_id?.toString(),
    issueDate: new Date(row.issue_date),
    dueDate: new Date(row.due_date || row.issue_date),
    status: row.status as InvoiceStatus,
    currency: 'EUR',
    items: [],
    subtotal: parseFloat(row.subtotal || '0'),
    vatRate: 0.25,
    vatAmount: parseFloat(row.vat_amount || '0'),
    tourismTax: parseFloat(row.tourism_tax || '0'),
    totalAmount: parseFloat(row.total_amount || '0'),
    paidAmount: 0,
    remainingAmount: parseFloat(row.total_amount || '0'),
    fiscalData: row.fiscal_records?.[0] ? {
      oib: '87246357068',
      jir: row.fiscal_records[0].jir,
      zki: row.fiscal_records[0].zki,
      qrCodeData: row.fiscal_records[0].qr_code_data
    } : undefined,
    guest: row.guests ? {
      id: row.guests.id.toString(),
      firstName: row.guests.first_name,
      lastName: row.guests.last_name,
      fullName: `${row.guests.first_name} ${row.guests.last_name}`,
      email: row.guests.email,
      phone: row.guests.phone,
      nationality: '',
      preferredLanguage: 'en',
      dietaryRestrictions: [],
      hasPets: false,
      isVip: false,
      vipLevel: 0,
      children: [],
      totalStays: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Guest : undefined,
    reservation: row.reservations ? {
      id: row.reservations.id.toString(),
      roomId: row.reservations.room_id?.toString() || '',
      guestId: row.guest_id?.toString() || '',
      checkIn: new Date(row.reservations.check_in_date),
      checkOut: new Date(row.reservations.check_out_date),
      numberOfGuests: row.reservations.adults + (row.reservations.children_count || 0),
      adults: row.reservations.adults,
      children: [],
      status: row.reservations.status as ReservationStatus || 'confirmed',
      bookingSource: 'direct' as BookingSource,
      specialRequests: '',
      seasonalPeriod: row.reservations.seasonal_period as SeasonalPeriod || 'standard',
      baseRoomRate: parseFloat(row.reservations.base_room_rate || '0'),
      numberOfNights: row.reservations.number_of_nights,
      subtotal: parseFloat(row.reservations.subtotal || '0'),
      childrenDiscounts: 0,
      tourismTax: parseFloat(row.reservations.tourism_tax || '0'),
      vatAmount: parseFloat(row.reservations.vat_amount || '0'),
      petFee: parseFloat(row.reservations.pet_fee || '0'),
      parkingFee: parseFloat(row.reservations.parking_fee || '0'),
      shortStaySuplement: 0,
      additionalCharges: parseFloat(row.reservations.additional_charges || '0'),
      roomServiceItems: [],
      totalAmount: parseFloat(row.reservations.total_amount || '0'),
      bookingDate: new Date(),
      lastModified: new Date(),
      notes: ''
    } as Reservation : undefined,
    notes: '',
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at || row.created_at)
  }))
}

async function loadCompaniesFromDB(): Promise<Company[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return data?.map(mapCompanyFromDB) || []
}

async function loadPricingTiersFromDB(): Promise<PricingTier[]> {
  const { data, error } = await supabase
    .from('pricing_tiers')
    .select('*')
    .eq('is_active', true)
    .order('is_default', { ascending: false })

  if (error) throw error
  return data?.map(mapPricingTierFromDB) || []
}

interface HotelState {
  // Data state
  reservations: Reservation[]
  guests: Guest[]
  rooms: Room[]
  invoices: Invoice[]
  payments: Payment[]
  fiscalRecords: FiscalRecord[]
  companies: Company[]
  pricingTiers: PricingTier[]

  // Performance optimizations (derived)
  roomsByFloor: Record<number, Room[]>
  roomLookup: Record<string, Room>

  // Loading states
  isLoading: boolean
  isUpdating: boolean
  lastUpdated: Date
  error: string | null

  // Actions - Reservations
  updateReservationStatus: (id: string, newStatus: ReservationStatus) => Promise<void>
  updateReservationNotes: (id: string, notes: string) => Promise<void>
  updateReservation: (id: string, updates: Partial<Reservation>) => Promise<void>
  createReservation: (reservationData: Omit<Reservation, 'id' | 'bookingDate' | 'lastModified'>) => Promise<void>
  deleteReservation: (id: string) => Promise<void>

  // Actions - Guests
  createGuest: (guest: Omit<Guest, 'id' | 'totalStays'>) => Promise<Guest>
  updateGuest: (id: string, updates: Partial<Guest>) => Promise<void>
  findGuestsByName: (query: string) => Guest[]
  getGuestStayHistory: (guestId: string) => Reservation[]

  // Actions - Companies
  createCompany: (company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateCompany: (id: string, updates: Partial<Company>) => Promise<void>
  deleteCompany: (id: string) => Promise<void>
  findCompaniesByName: (query: string) => Company[]
  findCompanyByOIB: (oib: string) => Company | undefined
  validateOIB: (oib: string) => boolean

  // Actions - Pricing Tiers
  createPricingTier: (pricingTier: Omit<PricingTier, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updatePricingTier: (id: string, updates: Partial<PricingTier>) => Promise<void>
  deletePricingTier: (id: string) => Promise<void>
  findPricingTiersByName: (query: string) => PricingTier[]
  getActivePricingTiers: () => PricingTier[]
  getDefaultPricingTier: () => PricingTier | undefined

  // Financial actions - Invoices
  generateInvoice: (reservationId: string) => Promise<Invoice>
  updateInvoiceStatus: (invoiceId: string, status: InvoiceStatus) => Promise<void>
  getInvoicesByGuest: (guestId: string) => Invoice[]
  getInvoicesByDateRange: (start: Date, end: Date) => Invoice[]
  getOverdueInvoices: () => Invoice[]

  // Financial actions - Payments
  addPayment: (payment: Omit<Payment, 'id' | 'createdAt'>) => Promise<void>
  updatePaymentStatus: (paymentId: string, status: PaymentStatus) => Promise<void>
  getPaymentsByInvoice: (invoiceId: string) => Payment[]
  getPaymentsByMethod: (method: PaymentMethod) => Payment[]

  // Revenue analytics
  calculateRevenueAnalytics: (
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    startDate: Date,
    endDate: Date
  ) => RevenueAnalytics

  // Financial utilities
  getTotalRevenue: (startDate: Date, endDate: Date) => number
  getUnpaidInvoices: () => Invoice[]
  getPaymentSummary: (startDate: Date, endDate: Date) => {
    total: number
    cash: number
    card: number
    bank: number
    online: number
  }

  // Sync utilities
  refreshData: () => Promise<void>

  // Internal
  loadAllData: () => Promise<void>
  initialize: () => () => void
}

export const useHotelStore = create<HotelState>()((set, get) => ({
  reservations: [],
  guests: [],
  rooms: [],
  invoices: [],
  payments: [],
  fiscalRecords: [],
  companies: [],
  pricingTiers: [],
  roomsByFloor: {},
  roomLookup: {},
  isLoading: true,
  isUpdating: false,
  lastUpdated: new Date(),
  error: null,

  loadAllData: async () => {
    const operationStart = performance.now()
    set({ isLoading: true, error: null })

    try {
      logger.info('HotelContext', 'Starting hotel data load from Supabase')
      logUserActivity('data_load_started')

      const results = await performanceMonitor.measureAsync(
        'load_all_hotel_data',
        async () => {
          return Promise.allSettled([
            performanceMonitor.measureAsync('load_rooms', () => hotelDataService.getRooms()),
            performanceMonitor.measureAsync('load_guests', () => hotelDataService.getGuests()),
            performanceMonitor.measureAsync('load_reservations', () => hotelDataService.getReservations()),
            performanceMonitor.measureAsync('load_invoices', () => loadInvoicesFromDB()),
            performanceMonitor.measureAsync('load_companies', () => loadCompaniesFromDB()),
            performanceMonitor.measureAsync('load_pricing_tiers', () => loadPricingTiersFromDB())
          ])
        },
        'database_operation'
      )

      if (results[0].status === 'fulfilled') {
        const rooms = results[0].value
        set({ rooms, ...computeRoomDerivedState(rooms) })
        logger.info('HotelContext', `Loaded ${rooms.length} rooms`)
        performanceMonitor.recordDatabaseOperation('load_rooms', 'rooms', performance.now() - operationStart, rooms.length, 'SELECT')
      } else {
        const error = results[0].reason
        logger.error('HotelContext', 'Failed to load rooms', error)
        trackError(error instanceof Error ? error : new Error('Failed to load rooms'), { operation: 'load_rooms' })
        set({ error: 'Failed to load room data' })
      }

      if (results[1].status === 'fulfilled') {
        const guests = results[1].value
        set({ guests })
        logger.info('HotelContext', `Loaded ${guests.length} guests`)
        performanceMonitor.recordDatabaseOperation('load_guests', 'guests', performance.now() - operationStart, guests.length, 'SELECT')
      } else {
        const error = results[1].reason
        logger.warn('HotelContext', 'Failed to load guests - continuing with empty array', error)
        trackError(error instanceof Error ? error : new Error('Failed to load guests'), { operation: 'load_guests', critical: false })
      }

      if (results[2].status === 'fulfilled') {
        const reservations = results[2].value
        set({ reservations })
        logger.info('HotelContext', `Loaded ${reservations.length} reservations`)
        performanceMonitor.recordDatabaseOperation('load_reservations', 'reservations', performance.now() - operationStart, reservations.length, 'SELECT')
      } else {
        const error = results[2].reason
        logger.warn('HotelContext', 'Failed to load reservations - continuing with empty array', error)
        trackError(error instanceof Error ? error : new Error('Failed to load reservations'), { operation: 'load_reservations', critical: false })
      }

      if (results[3].status === 'fulfilled') {
        const invoices = results[3].value
        set({ invoices })
        logger.info('HotelContext', `Loaded ${invoices.length} invoices`)
        performanceMonitor.recordDatabaseOperation('load_invoices', 'invoices', performance.now() - operationStart, invoices.length, 'SELECT')
      } else {
        const error = results[3].reason
        logger.warn('HotelContext', 'Failed to load invoices - continuing with empty array', error)
        trackError(error instanceof Error ? error : new Error('Failed to load invoices'), { operation: 'load_invoices', critical: false })
        set({ invoices: [] })
      }

      if (results[4].status === 'fulfilled') {
        const companies = results[4].value
        set({ companies })
        logger.info('HotelContext', `Loaded ${companies.length} companies`)
        performanceMonitor.recordDatabaseOperation('load_companies', 'companies', performance.now() - operationStart, companies.length, 'SELECT')
      } else {
        const error = results[4].reason
        logger.warn('HotelContext', 'Failed to load companies - continuing with empty array', error)
        trackError(error instanceof Error ? error : new Error('Failed to load companies'), { operation: 'load_companies', critical: false })
        set({ companies: [] })
      }

      if (results[5].status === 'fulfilled') {
        const pricingTiers = results[5].value
        set({ pricingTiers })
        logger.info('HotelContext', `Loaded ${pricingTiers.length} pricing tiers`)
        performanceMonitor.recordDatabaseOperation('load_pricing_tiers', 'pricing_tiers', performance.now() - operationStart, pricingTiers.length, 'SELECT')
      } else {
        const error = results[5].reason
        logger.warn('HotelContext', 'Failed to load pricing tiers - continuing with empty array', error)
        trackError(error instanceof Error ? error : new Error('Failed to load pricing tiers'), { operation: 'load_pricing_tiers', critical: false })
        set({ pricingTiers: [] })
      }

      set({ payments: [], fiscalRecords: [], lastUpdated: new Date() })

      const roomCount = results[0].status === 'fulfilled' ? results[0].value.length : 0
      const guestCount = results[1].status === 'fulfilled' ? results[1].value.length : 0
      const reservationCount = results[2].status === 'fulfilled' ? results[2].value.length : 0
      const invoiceCount = results[3].status === 'fulfilled' ? results[3].value.length : 0
      const companyCount = results[4].status === 'fulfilled' ? results[4].value.length : 0
      const pricingTierCount = results[5].status === 'fulfilled' ? results[5].value.length : 0
      const totalDuration = performance.now() - operationStart

      logger.info('HotelContext', 'Hotel data loading completed', {
        roomCount, guestCount, reservationCount, invoiceCount, companyCount, pricingTierCount,
        totalDuration: Math.round(totalDuration)
      })

      logUserActivity('data_load_completed', {
        roomCount, guestCount, reservationCount, invoiceCount, companyCount, pricingTierCount,
        duration: Math.round(totalDuration)
      })

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load data')
      logger.error('HotelContext', 'Failed to load hotel data', error)
      trackError(error, { operation: 'loadAllData', critical: true })
      set({ error: error.message })
    } finally {
      set({ isLoading: false })
      performanceMonitor.recordSystemMetrics()
    }
  },

  initialize: () => {
    get().loadAllData()

    logger.info('HotelContext', 'Setting up real-time subscriptions')

    const unsubscribe = realtimeService.subscribeToHotelTimeline(
      // Reservation changes
      (payload) => {
        logger.debug('RealtimeService', `Reservation ${payload.eventType}`, {
          reservationId: payload.new?.id || payload.old?.id,
          eventType: payload.eventType
        })

        if (payload.eventType === 'INSERT' && payload.new) {
          set(state => ({ reservations: [...state.reservations, payload.new as Reservation] }))
          auditTrail.logReservationCreate(payload.new.id, payload.new)
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          set(state => ({
            reservations: state.reservations.map(r => r.id === payload.new!.id ? payload.new as Reservation : r)
          }))
          auditTrail.logReservationUpdate(payload.new.id, payload.old, payload.new)
        } else if (payload.eventType === 'DELETE' && payload.old) {
          set(state => ({
            reservations: state.reservations.filter(r => r.id !== payload.old!.id)
          }))
          auditTrail.logReservationDelete(payload.old.id, payload.old)
        }

        set({ lastUpdated: new Date() })
        performanceMonitor.recordUserInteraction('realtime_reservation_update', 'HotelContext', 0, true)
      },
      // Room changes
      (payload) => {
        logger.debug('RealtimeService', `Room ${payload.eventType}`, {
          roomId: payload.new?.id || payload.old?.id,
          eventType: payload.eventType
        })

        if (payload.eventType === 'UPDATE' && payload.new) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newRoom = databaseAdapter.mapRoomFromCurrentDB(payload.new as any)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const oldRoom = payload.old ? databaseAdapter.mapRoomFromCurrentDB(payload.old as any) : undefined

          if (oldRoom && newRoom.is_clean !== oldRoom.is_clean) {
            if (newRoom.is_clean) {
              toast.success(`Room ${newRoom.number} is now clean and ready for the next guest!`)
            }
          }

          set(state => {
            const rooms = state.rooms.map(r => r.id === newRoom.id ? newRoom : r)
            return { rooms, ...computeRoomDerivedState(rooms) }
          })
        }

        set({ lastUpdated: new Date() })
        performanceMonitor.recordUserInteraction('realtime_room_update', 'HotelContext', 0, true)
      },
      // Guest changes
      (payload) => {
        logger.debug('RealtimeService', `Guest ${payload.eventType}`, {
          guestId: payload.new?.id || payload.old?.id,
          eventType: payload.eventType
        })

        if (payload.eventType === 'INSERT' && payload.new) {
          set(state => ({ guests: [...state.guests, payload.new as Guest] }))
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          set(state => ({
            guests: state.guests.map(g => g.id === payload.new!.id ? payload.new as Guest : g)
          }))
        } else if (payload.eventType === 'DELETE' && payload.old) {
          set(state => ({
            guests: state.guests.filter(g => g.id !== payload.old!.id)
          }))
        }

        set({ lastUpdated: new Date() })
        performanceMonitor.recordUserInteraction('realtime_guest_update', 'HotelContext', 0, true)
      }
    )

    return () => {
      logger.info('HotelContext', 'Cleaning up real-time subscriptions')
      unsubscribe()
    }
  },

  refreshData: async () => {
    await get().loadAllData()
  },

  // Reservation actions
  updateReservationStatus: async (id: string, newStatus: ReservationStatus) => {
    const operationStart = performance.now()
    const optimisticService = OptimisticUpdateService.getInstance()
    const { reservations } = get()
    const currentReservation = reservations.find(r => r.id === id)
    if (!currentReservation) {
      throw new Error(`Reservation with id ${id} not found`)
    }

    logger.info('HotelContext', 'Starting optimistic reservation status update', {
      reservationId: id,
      oldStatus: currentReservation.status,
      newStatus
    })

    const result = await optimisticService.executeOptimisticUpdate(
      `status-update-${id}-${Date.now()}`,
      {
        type: 'update',
        entity: 'reservation',
        originalData: currentReservation,
        newData: { status: newStatus },

        optimisticUpdate: () => {
          console.log(`🔄 Optimistically updating reservation ${id} status to ${newStatus}`)
          set(state => ({
            reservations: state.reservations.map(r => r.id === id ? { ...r, status: newStatus } : r),
            lastUpdated: new Date()
          }))
        },

        rollbackUpdate: () => {
          console.log(`⬅️ Rolling back reservation ${id} status to ${currentReservation.status}`)
          set(state => ({
            reservations: state.reservations.map(r => r.id === id ? { ...r, status: currentReservation.status } : r)
          }))
        },

        serverUpdate: async () => {
          set({ isUpdating: true })
          try {
            await performanceMonitor.measureAsync(
              'update_reservation_status',
              () => hotelDataService.updateReservation(id, { status: newStatus }),
              'database_operation'
            )

            if (newStatus === 'checked-out' && currentReservation.roomId) {
              try {
                await hotelDataService.updateRoom(currentReservation.roomId, { is_clean: false })
                logger.info('HotelContext', 'Room marked as dirty on checkout', {
                  roomId: currentReservation.roomId,
                  reservationId: id
                })
              } catch (err) {
                logger.warn('HotelContext', 'Failed to mark room as dirty on checkout', {
                  roomId: currentReservation.roomId,
                  error: err instanceof Error ? err.message : 'Unknown error'
                })
              }
            }

            logBusinessOperation('update', 'reservation', id, {
              oldStatus: currentReservation.status,
              newStatus
            })

            auditTrail.logAuditEvent('update', 'reservation', id,
              { status: currentReservation.status },
              { status: newStatus },
              'success'
            )

            const duration = performance.now() - operationStart
            performanceMonitor.recordDatabaseOperation('update_reservation_status', 'reservations', duration, 1, 'UPDATE')

            console.log(`✅ Server confirmed status update for reservation ${id}`)

          } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to update reservation status')

            logger.error('HotelContext', 'Failed to update reservation status', {
              reservationId: id,
              newStatus,
              error: error.message
            })

            trackError(error, {
              operation: 'updateReservationStatus',
              reservationId: id,
              newStatus
            })

            auditTrail.logAuditEvent('update', 'reservation', id,
              undefined,
              { status: newStatus },
              'failure',
              error.message
            )

            console.log(`❌ Server update failed for reservation ${id}:`, error.message)
            throw error

          } finally {
            set({ isUpdating: false })
          }
        }
      }
    )

    if (!result.success) {
      console.error('Optimistic update failed:', result.error)
      throw new Error(result.error || 'Failed to update reservation status')
    }

    console.log(`🎉 Successfully updated reservation ${id} status to ${newStatus}`)
  },

  updateReservationNotes: async (id: string, notes: string) => {
    set({ isUpdating: true })
    try {
      await hotelDataService.updateReservation(id, { specialRequests: notes })
    } catch (err) {
      console.error('Failed to update reservation notes:', err)
      throw err
    } finally {
      set({ isUpdating: false })
    }
  },

  updateReservation: async (id: string, updates: Partial<Reservation>) => {
    set({ isUpdating: true })
    try {
      await hotelDataService.updateReservation(id, updates)
    } catch (err) {
      console.error('Failed to update reservation:', err)
      throw err
    } finally {
      set({ isUpdating: false })
    }
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createReservation: async (reservationData: any) => {
    const operationStart = performance.now()
    set({ isUpdating: true })

    try {
      logger.info('HotelContext', 'Creating new reservation', {
        roomId: reservationData.roomId,
        isNewGuest: reservationData.isNewGuest,
        checkIn: reservationData.checkIn,
        checkOut: reservationData.checkOut
      })

      let guestId = reservationData.guestId

      if (reservationData.isNewGuest && reservationData.guest) {
        logger.info('HotelContext', 'Creating new guest for reservation', {
          firstName: reservationData.guest.firstName,
          lastName: reservationData.guest.lastName
        })

        const newGuest = await performanceMonitor.measureAsync(
          'create_guest_for_reservation',
          () => hotelDataService.createGuest({
            firstName: reservationData.guest.firstName,
            lastName: reservationData.guest.lastName || '',
            fullName: `${reservationData.guest.firstName} ${reservationData.guest.lastName || ''}`.trim(),
            email: reservationData.guest.email,
            phone: reservationData.guest.phone,
            nationality: reservationData.guest.nationality,
            preferredLanguage: reservationData.guest.preferredLanguage || 'en',
            dietaryRestrictions: [],
            hasPets: reservationData.guest.hasPets || false,
            vipLevel: 0,
            dateOfBirth: undefined,
            children: [],
            emergencyContactName: undefined,
            emergencyContactPhone: undefined,
            createdAt: new Date(),
            updatedAt: new Date()
          }),
          'database_operation'
        )

        guestId = newGuest.id
        logger.info('HotelContext', 'New guest created', { guestId })
        logBusinessOperation('create', 'guest', guestId, reservationData.guest)
      }

      const finalReservationData = { ...reservationData, guestId }

      const newReservation = await performanceMonitor.measureAsync(
        'create_reservation',
        () => hotelDataService.createReservation(finalReservationData),
        'database_operation'
      )

      if (newReservation) {
        set(state => ({ reservations: [...state.reservations, newReservation] }))
      }

      logBusinessOperation('create', 'reservation', newReservation?.id || 'unknown', finalReservationData)
      auditTrail.logReservationCreate(newReservation?.id || 'unknown', finalReservationData)

      const duration = performance.now() - operationStart
      performanceMonitor.recordDatabaseOperation('create_reservation', 'reservations', duration, 1, 'INSERT')
      performanceMonitor.recordUserInteraction('create_reservation', 'HotelContext', duration, true)

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create reservation')
      logger.error('HotelContext', 'Failed to create reservation', {
        error: error.message,
        reservationData: { roomId: reservationData.roomId, isNewGuest: reservationData.isNewGuest }
      })
      trackError(error, { operation: 'createReservation', reservationData })
      auditTrail.logAuditEvent('create', 'reservation', 'unknown', undefined, reservationData, 'failure', error.message)
      throw error
    } finally {
      set({ isUpdating: false })
    }
  },

  deleteReservation: async (id: string) => {
    set({ isUpdating: true })
    try {
      await hotelDataService.deleteReservation(id)
    } catch (err) {
      console.error('Failed to delete reservation:', err)
      throw err
    } finally {
      set({ isUpdating: false })
    }
  },

  // Guest actions
  createGuest: async (guest: Omit<Guest, 'id' | 'totalStays'>) => {
    set({ isUpdating: true })
    try {
      const newGuest = await hotelDataService.createGuest(guest)
      set(state => ({ guests: [...state.guests, newGuest] }))
      return newGuest
    } catch (err) {
      console.error('Failed to create guest:', err)
      throw err
    } finally {
      set({ isUpdating: false })
    }
  },

  updateGuest: async (id: string, updates: Partial<Guest>) => {
    set({ isUpdating: true })
    try {
      await hotelDataService.updateGuest(id, updates)
    } catch (err) {
      console.error('Failed to update guest:', err)
      throw err
    } finally {
      set({ isUpdating: false })
    }
  },

  findGuestsByName: (query: string): Guest[] => {
    return get().guests.filter(guest =>
      guest.fullName.toLowerCase().includes(query.toLowerCase())
    )
  },

  getGuestStayHistory: (guestId: string): Reservation[] => {
    return get().reservations
      .filter(reservation => reservation.guestId === guestId)
      .sort((a, b) => b.checkIn.getTime() - a.checkIn.getTime())
  },

  // Company actions
  createCompany: async (company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>) => {
    const operationStart = performance.now()
    set({ isUpdating: true })

    try {
      logger.info('HotelContext', 'Creating new company', { name: company.name, oib: company.oib })

      const result = await performanceMonitor.measureAsync(
        'create_company',
        async () => {
          const { data, error } = await supabase
            .from('companies')
            .insert({
              name: company.name,
              oib: company.oib,
              address: company.address.street,
              city: company.address.city,
              postal_code: company.address.postalCode,
              country: company.address.country || 'Croatia',
              contact_person: company.contactPerson,
              email: company.email,
              phone: company.phone,
              fax: company.fax,
              is_active: true
            })
            .select()
            .single()

          if (error) throw error
          return data
        },
        'database_operation'
      )

      const newCompany = mapCompanyFromDB(result)
      set(state => ({ companies: [...state.companies, newCompany] }))

      const duration = performance.now() - operationStart
      performanceMonitor.recordDatabaseOperation('create_company', 'companies', duration, 1, 'INSERT')

      logBusinessOperation('create', 'company', newCompany.id, company)
      auditTrail.logAuditEvent('create', 'company', newCompany.id, undefined, company, 'success')

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create company')
      logger.error('HotelContext', 'Failed to create company', {
        error: error.message,
        companyName: company.name,
        oib: company.oib
      })
      trackError(error, { operation: 'createCompany', company })
      auditTrail.logAuditEvent('create', 'company', 'unknown', undefined, company, 'failure', error.message)
      throw error
    } finally {
      set({ isUpdating: false })
    }
  },

  updateCompany: async (id: string, updates: Partial<Company>) => {
    set({ isUpdating: true })
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {}

      if (updates.name) updateData.name = updates.name
      if (updates.oib) updateData.oib = updates.oib
      if (updates.address) {
        updateData.address = updates.address.street
        updateData.city = updates.address.city
        updateData.postal_code = updates.address.postalCode
        updateData.country = updates.address.country
      }
      if (updates.contactPerson) updateData.contact_person = updates.contactPerson
      if (updates.email) updateData.email = updates.email
      if (updates.phone) updateData.phone = updates.phone
      if (updates.fax !== undefined) updateData.fax = updates.fax
      updateData.updated_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', parseInt(id))
        .select()
        .single()

      if (error) throw error

      const updatedCompany = mapCompanyFromDB(data)
      set(state => ({ companies: state.companies.map(c => c.id === id ? updatedCompany : c) }))

    } catch (err) {
      console.error('Failed to update company:', err)
      throw err
    } finally {
      set({ isUpdating: false })
    }
  },

  deleteCompany: async (id: string) => {
    set({ isUpdating: true })
    try {
      const { error } = await supabase
        .from('companies')
        .update({ is_active: false })
        .eq('id', parseInt(id))

      if (error) throw error

      set(state => ({ companies: state.companies.map(c => c.id === id ? { ...c, isActive: false } : c) }))

    } catch (err) {
      console.error('Failed to delete company:', err)
      throw err
    } finally {
      set({ isUpdating: false })
    }
  },

  findCompaniesByName: (query: string): Company[] => {
    return get().companies.filter(company =>
      company.name.toLowerCase().includes(query.toLowerCase())
    )
  },

  findCompanyByOIB: (oib: string): Company | undefined => {
    return get().companies.find(company => company.oib === oib)
  },

  validateOIB: (oib: string): boolean => {
    return /^\d{11}$/.test(oib)
  },

  // Pricing tier actions
  createPricingTier: async (pricingTier: Omit<PricingTier, 'id' | 'createdAt' | 'updatedAt'>) => {
    set({ isUpdating: true })
    try {
      const { data, error } = await supabase
        .from('pricing_tiers')
        .insert({
          name: pricingTier.name,
          description: pricingTier.description || null,
          seasonal_rate_a: pricingTier.seasonalRates?.A || 0,
          seasonal_rate_b: pricingTier.seasonalRates?.B || 0,
          seasonal_rate_c: pricingTier.seasonalRates?.C || 0,
          seasonal_rate_d: pricingTier.seasonalRates?.D || 0,
          is_percentage_discount: true,
          minimum_stay: pricingTier.minimumStayRequirement || null,
          valid_from: pricingTier.validFrom?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
          valid_to: pricingTier.validTo?.toISOString().split('T')[0] || null,
          is_active: pricingTier.isActive !== false,
          is_default: pricingTier.isDefault || false
        })
        .select()
        .single()

      if (error) throw error

      const newPricingTier = mapPricingTierFromDB(data)
      set(state => ({ pricingTiers: [...state.pricingTiers, newPricingTier] }))

    } catch (err) {
      console.error('Failed to create pricing tier:', err)
      throw err
    } finally {
      set({ isUpdating: false })
    }
  },

  updatePricingTier: async (id: string, updates: Partial<PricingTier>) => {
    set({ isUpdating: true })
    try {
      const { data, error } = await supabase
        .from('pricing_tiers')
        .update({
          name: updates.name,
          description: updates.description,
          seasonal_rate_a: updates.seasonalRates?.A,
          seasonal_rate_b: updates.seasonalRates?.B,
          seasonal_rate_c: updates.seasonalRates?.C,
          seasonal_rate_d: updates.seasonalRates?.D,
          minimum_stay: updates.minimumStayRequirement,
          valid_from: updates.validFrom?.toISOString().split('T')[0],
          valid_to: updates.validTo?.toISOString().split('T')[0],
          is_active: updates.isActive,
          is_default: updates.isDefault,
          updated_at: new Date().toISOString()
        })
        .eq('id', parseInt(id))
        .select()
        .single()

      if (error) throw error

      const updatedPricingTier = mapPricingTierFromDB(data)
      set(state => ({ pricingTiers: state.pricingTiers.map(pt => pt.id === id ? updatedPricingTier : pt) }))

    } catch (err) {
      console.error('Failed to update pricing tier:', err)
      throw err
    } finally {
      set({ isUpdating: false })
    }
  },

  deletePricingTier: async (id: string) => {
    set({ isUpdating: true })
    try {
      const { error } = await supabase
        .from('pricing_tiers')
        .update({ is_active: false })
        .eq('id', parseInt(id))

      if (error) throw error

      set(state => ({ pricingTiers: state.pricingTiers.map(pt => pt.id === id ? { ...pt, isActive: false } : pt) }))

    } catch (err) {
      console.error('Failed to delete pricing tier:', err)
      throw err
    } finally {
      set({ isUpdating: false })
    }
  },

  findPricingTiersByName: (query: string): PricingTier[] => {
    return get().pricingTiers.filter(tier =>
      tier.name.toLowerCase().includes(query.toLowerCase())
    )
  },

  getActivePricingTiers: (): PricingTier[] => {
    return get().pricingTiers.filter(tier => tier.isActive)
  },

  getDefaultPricingTier: (): PricingTier | undefined => {
    return get().pricingTiers.find(tier => tier.isDefault)
  },

  // Financial placeholders
  generateInvoice: async (_reservationId: string): Promise<Invoice> => {
    console.warn('generateInvoice not implemented yet')
    throw new Error('Invoice generation not implemented')
  },

  updateInvoiceStatus: async (_invoiceId: string, _status: InvoiceStatus) => {
    console.warn('updateInvoiceStatus not implemented yet')
    throw new Error('Invoice management not implemented')
  },

  getInvoicesByGuest: (guestId: string): Invoice[] => {
    return get().invoices.filter(invoice => invoice.guestId === guestId)
  },

  getInvoicesByDateRange: (start: Date, end: Date): Invoice[] => {
    return get().invoices.filter(invoice =>
      invoice.issueDate >= start && invoice.issueDate <= end
    )
  },

  getOverdueInvoices: (): Invoice[] => {
    const today = new Date()
    return get().invoices.filter(invoice =>
      invoice.status !== 'paid' && invoice.dueDate < today
    )
  },

  addPayment: async (_payment: Omit<Payment, 'id' | 'createdAt'>) => {
    console.warn('addPayment not implemented yet')
    throw new Error('Payment management not implemented')
  },

  updatePaymentStatus: async (_paymentId: string, _status: PaymentStatus) => {
    console.warn('updatePaymentStatus not implemented yet')
    throw new Error('Payment management not implemented')
  },

  getPaymentsByInvoice: (invoiceId: string): Payment[] => {
    return get().payments.filter(payment => payment.invoiceId === invoiceId)
  },

  getPaymentsByMethod: (method: PaymentMethod): Payment[] => {
    return get().payments.filter(payment => payment.method === method)
  },

  calculateRevenueAnalytics: (
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    startDate: Date,
    endDate: Date
  ): RevenueAnalytics => {
    return {
      period,
      startDate,
      endDate,
      totalRevenue: 0,
      totalBookings: 0,
      roomRevenue: 0,
      taxRevenue: 0,
      additionalRevenue: 0,
      vatCollected: 0,
      tourismTaxCollected: 0,
      directBookings: 0,
      bookingComRevenue: 0,
      otherSourcesRevenue: 0,
      cashPayments: 0,
      cardPayments: 0,
      bankTransfers: 0,
      onlinePayments: 0,
      totalInvoices: 0,
      averageBookingValue: 0,
      occupancyRate: 0,
      fiscalReportsGenerated: 0,
      fiscalSubmissions: 0,
      periods: []
    }
  },

  getTotalRevenue: (startDate: Date, endDate: Date): number => {
    return get().invoices
      .filter(invoice => invoice.issueDate >= startDate && invoice.issueDate <= endDate)
      .reduce((total, invoice) => total + invoice.totalAmount, 0)
  },

  getUnpaidInvoices: (): Invoice[] => {
    return get().invoices.filter(invoice => invoice.status !== 'paid')
  },

  getPaymentSummary: (startDate: Date, endDate: Date) => {
    const relevantPayments = get().payments.filter(payment =>
      payment.receivedDate >= startDate && payment.receivedDate <= endDate
    )

    return {
      total: relevantPayments.reduce((sum, payment) => sum + payment.amount, 0),
      cash: relevantPayments.filter(p => p.method === 'cash').reduce((sum, p) => sum + p.amount, 0),
      card: relevantPayments.filter(p => p.method === 'card').reduce((sum, p) => sum + p.amount, 0),
      bank: relevantPayments.filter(p => p.method === 'bank_transfer').reduce((sum, p) => sum + p.amount, 0),
      online: relevantPayments.filter(p => p.method === 'online').reduce((sum, p) => sum + p.amount, 0)
    }
  }
}))

export const useHotel = () => useHotelStore()
