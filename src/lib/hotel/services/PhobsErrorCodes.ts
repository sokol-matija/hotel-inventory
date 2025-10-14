/**
 * Phobs Channel Manager Error Codes
 *
 * Complete error code mappings from Phobs API specification
 * @see https://phobs.gitbook.io/phobs-central-reservation-system-channel-manager/security-and-authentication-appendix
 */

/**
 * EWT (Error Warning Type) Codes
 * These are OTA standard error type codes
 */
export enum PhobsEWTCode {
  /** Unknown error */
  UNKNOWN = '1',
  /** No implementation - target system has no implementation for the request */
  NO_IMPLEMENTATION = '2',
  /** Business rule violation - XML valid but business rules not met */
  BIZ_RULE = '3',
  /** Authentication - message lacks adequate security credentials */
  AUTHENTICATION = '4',
  /** Authentication timeout - security credentials have expired */
  AUTHENTICATION_TIMEOUT = '5',
  /** Authorization - message lacks adequate security credentials */
  AUTHORIZATION = '6',
  /** Protocol violation - request does not align to message exchange */
  PROTOCOL_VIOLATION = '7',
  /** Transaction model - target system does not support intended operation */
  TRANSACTION_MODEL = '8',
  /** Authentication model - type of authentication not recognized */
  AUTHENTICATION_MODEL = '9',
  /** Required field missing - element or attribute required but missing */
  REQUIRED_FIELD_MISSING = '10'
}

/**
 * ERR (Error) Codes
 * These are Phobs-specific error codes
 */
export enum PhobsERRCode {
  // General Errors
  /** Invalid date - TimeStamp from any message */
  INVALID_DATE = '15',
  /** System currently unavailable */
  SYSTEM_UNAVAILABLE = '187',
  /** Invalid value - invalid value in a field with no individual error */
  INVALID_VALUE = '320',
  /** Required field missing */
  REQUIRED_FIELD_MISSING = '321',
  /** Invalid property code - Hotel code */
  INVALID_PROPERTY_CODE = '400',
  /** System error */
  SYSTEM_ERROR = '448',
  /** Unable to process */
  UNABLE_TO_PROCESS = '450',

  // Reservation Errors
  /** Booking reference invalid */
  BOOKING_REFERENCE_INVALID = '87',
  /** Invalid confirmation number */
  INVALID_CONFIRMATION_NUMBER = '245',
  /** Invalid check-in date */
  INVALID_CHECK_IN_DATE = '381',
  /** Invalid check-out date */
  INVALID_CHECK_OUT_DATE = '382',
  /** Invalid room type */
  INVALID_ROOM_TYPE = '402',
  /** Rate does not exist */
  RATE_DOES_NOT_EXIST = '436',
  /** Reservation cannot be cancelled */
  RESERVATION_CANNOT_BE_CANCELLED = '264'
}

/**
 * Special Request Codes
 * Used in reservation special requests
 */
export enum PhobsSpecialRequestCode {
  /** Allergy room */
  ALLERGY_ROOM = 'AL',
  /** Adjoining rooms */
  ADJOINING_ROOMS = 'AR',
  /** Baby cot requested */
  BABY_COT = 'BC',
  /** Connecting rooms */
  CONNECTING_ROOMS = 'CR',
  /** Deposit direct to hotel */
  DEPOSIT_DIRECT = 'DH',
  /** Direct payment */
  DIRECT_PAYMENT = 'DP',
  /** Room at day use */
  DAY_USE = 'DU',
  /** Early arrival */
  EARLY_ARRIVAL = 'ER',
  /** Family room */
  FAMILY_ROOM = 'FR',
  /** High floor */
  HIGH_FLOOR = 'HF',
  /** Handicapped room */
  HANDICAPPED_ROOM = 'HR',
  /** Late arrival */
  LATE_ARRIVAL = 'LA',
  /** Low floor */
  LOW_FLOOR = 'LF',
  /** Non-smoking room */
  NON_SMOKING = 'NS',
  /** Part of a convention */
  CONVENTION = 'PC',
  /** Quiet room */
  QUIET_ROOM = 'QR',
  /** Repeat guest */
  REPEAT_GUEST = 'RG',
  /** Airport transfer/one way */
  TRANSFER_ONE_WAY = 'TO',
  /** Airport transfer/round trip */
  TRANSFER_ROUND_TRIP = 'TR',
  /** Voucher for room and breakfast */
  VOUCHER_BREAKFAST = 'VB',
  /** Voucher for room only */
  VOUCHER_ROOM_ONLY = 'VR'
}

/**
 * Payment Card Type Codes
 * Supported payment card types in Phobs
 */
export enum PhobsPaymentCardCode {
  /** American Express */
  AMEX = 'AX',
  /** Bank Card */
  BANK_CARD = 'BC',
  /** Carte Bleu */
  CARTE_BLEU = 'BL',
  /** Carte Blanche */
  CARTE_BLANCHE = 'CB',
  /** Diners Club */
  DINERS_CLUB = 'DN',
  /** Diners Club (alternate) */
  DINERS_CLUB_DC = 'DC',
  /** Discover Card */
  DISCOVER = 'DS',
  /** Euro Card */
  EURO_CARD = 'EC',
  /** Japanese Credit Bureau */
  JCB = 'JC',
  /** Master Card */
  MASTERCARD = 'MC',
  /** Master Card (alternate) */
  MASTERCARD_MA = 'MA',
  /** Universal Air Travel Card */
  UATP = 'TP',
  /** VISA */
  VISA = 'VI',
  /** Maestro */
  MAESTRO = 'MA',
  /** Big Fish */
  BIGFISH = 'BIGFISH',
  /** Stripe */
  STRIPE = 'STRIPE'
}

/**
 * Error code to human-readable message mapping
 */
export const PhobsErrorMessages: Record<string, string> = {
  // EWT Codes
  '1': 'Unknown error occurred',
  '2': 'Target system has no implementation for this request',
  '3': 'Business rule violation - message is valid but business rules not met',
  '4': 'Authentication failed - message lacks adequate security credentials',
  '5': 'Authentication timeout - security credentials have expired',
  '6': 'Authorization failed - insufficient permissions',
  '7': 'Protocol violation - request does not align to message exchange',
  '8': 'Transaction model not supported by target system',
  '9': 'Authentication model not recognized',
  '10': 'Required field is missing from the message',

  // ERR Codes
  '15': 'Invalid date format in TimeStamp',
  '87': 'Booking reference is invalid',
  '187': 'System is currently unavailable, please try again later',
  '245': 'Confirmation number is invalid',
  '320': 'Invalid value provided in field',
  '321': 'Required field is missing',
  '381': 'Invalid check-in date',
  '382': 'Invalid check-out date',
  '400': 'Invalid property code (Hotel code not recognized)',
  '402': 'Invalid room type code',
  '436': 'Rate plan does not exist',
  '448': 'Internal system error occurred',
  '450': 'Unable to process the request',
  '264': 'Reservation cannot be cancelled'
};

/**
 * Get human-readable error message for error code
 */
export function getPhobsErrorMessage(code: string, defaultMessage?: string): string {
  return PhobsErrorMessages[code] || defaultMessage || `Unknown error code: ${code}`;
}

/**
 * Check if error code indicates authentication failure
 */
export function isAuthenticationError(code: string): boolean {
  return ['4', '5', '6', '9'].includes(code);
}

/**
 * Check if error code indicates system availability issue
 */
export function isSystemAvailabilityError(code: string): boolean {
  return ['187', '448', '450'].includes(code);
}

/**
 * Check if error code indicates validation error
 */
export function isValidationError(code: string): boolean {
  return ['15', '320', '321', '381', '382', '400', '402', '436'].includes(code);
}

/**
 * Check if error is retryable
 */
export function isRetryableError(code: string): boolean {
  // System availability errors are retryable
  // Authentication timeout is retryable
  return isSystemAvailabilityError(code) || code === '5';
}
