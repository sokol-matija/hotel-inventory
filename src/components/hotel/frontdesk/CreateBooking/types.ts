export interface BookingGuest {
  /** Temporary client-side id, e.g. `new-${Date.now()}-${Math.random()}` */
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  phone?: string;
  nationality?: string;
  dateOfBirth?: string;
  type: 'adult' | 'child';
  /** Only set when type === 'child'; 0–17 */
  age?: number;
  isExisting: boolean;
  /** Numeric DB id; only set when isExisting === true */
  existingGuestId?: number;
  preferredLanguage: string;
  dietaryRestrictions: string[];
  hasPets: boolean;
  isVip: boolean;
  vipLevel: number;

  totalStays: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingServices {
  needsParking: boolean;
  parkingSpots: number;
  hasPets: boolean;
  petCount: number;
  specialRequests: string;
}
