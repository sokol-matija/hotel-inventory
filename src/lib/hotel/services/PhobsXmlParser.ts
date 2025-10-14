// PhobsXmlParser - Utility for parsing OTA SOAP responses
// Handles XML parsing, error extraction, and response validation

import { XMLParser } from 'fast-xml-parser';

/**
 * XML Parser configuration for SOAP responses
 */
const xmlParserConfig = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: true,
  trimValues: true,
  removeNSPrefix: true, // Remove namespace prefixes for easier access
};

/**
 * OTA Error interface
 */
export interface OTAError {
  type: string;
  code: string;
  shortText?: string;
  message?: string;
  recordId?: string;
}

/**
 * SOAP Response interface
 */
export interface SoapResponse<T = any> {
  success: boolean;
  data?: T;
  errors?: OTAError[];
  warnings?: OTAError[];
  rawResponse?: any;
}

/**
 * PhobsXmlParser - Parses OTA SOAP responses
 */
export class PhobsXmlParser {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser(xmlParserConfig);
  }

  /**
   * Parse SOAP envelope and extract body
   */
  parseSoapResponse<T = any>(xmlString: string): SoapResponse<T> {
    try {
      const parsed = this.parser.parse(xmlString);

      // Navigate SOAP structure
      const envelope = parsed.Envelope || parsed['soap:Envelope'] || parsed;
      const body = envelope.Body || envelope['soap:Body'];

      if (!body) {
        return {
          success: false,
          errors: [
            {
              type: 'ParseError',
              code: 'INVALID_SOAP',
              message: 'Invalid SOAP envelope: missing Body',
            },
          ],
        };
      }

      // Check for SOAP Fault
      const fault = body.Fault || body['soap:Fault'];
      if (fault) {
        return this.parseSoapFault(fault);
      }

      // Extract OTA response
      const otaResponse = this.extractOtaResponse(body);
      return otaResponse;
    } catch (error) {
      return {
        success: false,
        errors: [
          {
            type: 'ParseError',
            code: 'XML_PARSE_ERROR',
            message:
              error instanceof Error ? error.message : 'Unknown parsing error',
          },
        ],
      };
    }
  }

  /**
   * Extract OTA response from SOAP body
   */
  private extractOtaResponse(body: any): SoapResponse {
    // Common OTA response types
    const responseTypes = [
      'OTA_HotelAvailNotifRS',
      'OTA_HotelRateAmountNotifRS',
      'OTA_HotelResNotifRS',
      'OTA_HotelRatePlanRS',
    ];

    let otaResponse: any = null;
    for (const type of responseTypes) {
      if (body[type]) {
        otaResponse = body[type];
        break;
      }
    }

    if (!otaResponse) {
      // Try to find any OTA response
      const keys = Object.keys(body);
      const otaKey = keys.find((key) => key.startsWith('OTA_'));
      if (otaKey) {
        otaResponse = body[otaKey];
      }
    }

    if (!otaResponse) {
      return {
        success: false,
        errors: [
          {
            type: 'ParseError',
            code: 'NO_OTA_RESPONSE',
            message: 'No OTA response found in SOAP body',
          },
        ],
      };
    }

    // Check for Success element
    const hasSuccess = otaResponse.Success !== undefined;

    // Extract errors
    const errors = this.extractErrors(otaResponse.Errors);

    // Extract warnings
    const warnings = this.extractWarnings(otaResponse.Warnings);

    return {
      success: hasSuccess && errors.length === 0,
      data: otaResponse,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      rawResponse: otaResponse,
    };
  }

  /**
   * Parse SOAP fault
   */
  private parseSoapFault(fault: any): SoapResponse {
    const faultCode = fault.faultcode || fault.Code?.Value || 'UNKNOWN';
    const faultString =
      fault.faultstring || fault.Reason?.Text || 'Unknown SOAP fault';
    const faultDetail = fault.detail || fault.Detail;

    return {
      success: false,
      errors: [
        {
          type: 'SOAPFault',
          code: faultCode,
          message: faultString,
          shortText: faultDetail ? JSON.stringify(faultDetail) : undefined,
        },
      ],
    };
  }

  /**
   * Extract OTA errors
   */
  private extractErrors(errorsElement: any): OTAError[] {
    if (!errorsElement) return [];

    const errors: OTAError[] = [];
    const errorArray = Array.isArray(errorsElement.Error)
      ? errorsElement.Error
      : errorsElement.Error
        ? [errorsElement.Error]
        : [];

    for (const error of errorArray) {
      errors.push({
        type: error['@_Type'] || 'Unknown',
        code: error['@_Code'] || 'UNKNOWN_ERROR',
        shortText: error['@_ShortText'] || error.ShortText,
        message: error['#text'] || error.ShortText || 'Unknown error',
        recordId: error['@_RecordID'],
      });
    }

    return errors;
  }

  /**
   * Extract OTA warnings
   */
  private extractWarnings(warningsElement: any): OTAError[] {
    if (!warningsElement) return [];

    const warnings: OTAError[] = [];
    const warningArray = Array.isArray(warningsElement.Warning)
      ? warningsElement.Warning
      : warningsElement.Warning
        ? [warningsElement.Warning]
        : [];

    for (const warning of warningArray) {
      warnings.push({
        type: warning['@_Type'] || 'Warning',
        code: warning['@_Code'] || 'UNKNOWN_WARNING',
        shortText: warning['@_ShortText'] || warning.ShortText,
        message: warning['#text'] || warning.ShortText || 'Unknown warning',
      });
    }

    return warnings;
  }

  /**
   * Parse availability response
   */
  parseAvailabilityResponse(xmlString: string): SoapResponse {
    const response = this.parseSoapResponse(xmlString);
    if (!response.success) return response;

    // Extract any additional availability-specific data
    return response;
  }

  /**
   * Parse rate response
   */
  parseRateResponse(xmlString: string): SoapResponse {
    const response = this.parseSoapResponse(xmlString);
    if (!response.success) return response;

    // Extract any additional rate-specific data
    return response;
  }

  /**
   * Parse reservation response
   */
  parseReservationResponse(xmlString: string): SoapResponse<{
    reservationId?: string;
    confirmationNumber?: string;
  }> {
    const response = this.parseSoapResponse(xmlString);
    if (!response.success) return response;

    // Extract reservation-specific data
    const otaResponse = response.data;
    const hotelReservation =
      otaResponse?.HotelReservations?.HotelReservation;

    if (hotelReservation) {
      const uniqueId = hotelReservation.UniqueID;
      const resId = Array.isArray(uniqueId) ? uniqueId[0] : uniqueId;

      return {
        ...response,
        data: {
          reservationId: resId?.['@_ID'],
          confirmationNumber: resId?.['@_ID'],
        },
      };
    }

    return response;
  }

  /**
   * Parse reservation pull response (OTA_HotelResNotifRQ from Phobs)
   * Step 2: Parse reservations received from Phobs
   */
  parseReservationPullResponse(xml: string): {
    success: boolean;
    reservations?: Array<{
      reservationId: string;
      hotelCode: string;
      roomTypeCode: string;
      ratePlanCode: string;
      checkIn: string;
      checkOut: string;
      numberOfUnits: number;
      guestCounts: Array<{ ageQualifyingCode: number; count: number }>;
      guest?: {
        givenName: string;
        surname: string;
        email?: string;
        phone?: string;
      };
      totalAmount?: number;
      currencyCode?: string;
      resStatus?: string;
    }>;
    errors?: Array<{ code: string; message: string; type: string }>;
    warnings?: string[];
  } {
    const response = this.parseSoapResponse(xml);
    
    if (!response.success || !response.data) {
      return {
        success: false,
        errors: response.errors?.map(e => ({
          code: e.code,
          message: e.message || e.shortText || 'Unknown error',
          type: e.type
        })),
      };
    }

    try {
      const body = response.data;
      const resNotif = body['OTA_HotelResNotifRQ'];
      
      if (!resNotif) {
        return {
          success: true,
          reservations: [], // No reservations in this pull
        };
      }

      const hotelReservations = resNotif.HotelReservations?.HotelReservation;
      
      if (!hotelReservations) {
        return {
          success: true,
          reservations: [],
        };
      }

      // Handle both single reservation and array of reservations
      const reservationArray = Array.isArray(hotelReservations)
        ? hotelReservations
        : [hotelReservations];

      const reservations = reservationArray.map((res: any) => {
        const uniqueId = res.UniqueID;
        const roomStay = res.RoomStays?.RoomStay;
        const resGuest = res.ResGuests?.ResGuest;

        // Extract room stay details
        const roomType = roomStay?.RoomTypes?.RoomType;
        const ratePlan = roomStay?.RatePlans?.RatePlan;
        const timeSpan = roomStay?.TimeSpan;
        const guestCountsData = roomStay?.GuestCounts?.GuestCount;
        const basicInfo = roomStay?.BasicPropertyInfo;
        const total = roomStay?.Total;

        // Extract guest details
        const profile = resGuest?.Profiles?.ProfileInfo?.Profile;
        const customer = profile?.Customer;
        const personName = customer?.PersonName;

        // Parse guest counts
        const guestCountArray = Array.isArray(guestCountsData)
          ? guestCountsData
          : guestCountsData
          ? [guestCountsData]
          : [];

        return {
          reservationId: uniqueId?.['@_ID'] || '',
          hotelCode: basicInfo?.['@_HotelCode'] || '',
          roomTypeCode: roomType?.['@_RoomTypeCode'] || '',
          ratePlanCode: ratePlan?.['@_RatePlanCode'] || '',
          checkIn: timeSpan?.['@_Start'] || '',
          checkOut: timeSpan?.['@_End'] || '',
          numberOfUnits: parseInt(roomType?.['@_NumberOfUnits'] || '1', 10),
          guestCounts: guestCountArray.map((gc: any) => ({
            ageQualifyingCode: parseInt(gc['@_AgeQualifyingCode'] || '10', 10),
            count: parseInt(gc['@_Count'] || '1', 10),
          })),
          guest: personName
            ? {
                givenName: personName.GivenName || '',
                surname: personName.Surname || '',
                email: customer?.Email || undefined,
                phone: customer?.Telephone?.['@_PhoneNumber'] || undefined,
              }
            : undefined,
          totalAmount: total?.['@_AmountAfterTax']
            ? parseFloat(total['@_AmountAfterTax'])
            : undefined,
          currencyCode: total?.['@_CurrencyCode'] || 'EUR',
          resStatus: resNotif['@_ResStatus'] || 'Commit',
        };
      });

      return {
        success: true,
        reservations,
        warnings: response.warnings?.map(w => w.message || w.shortText || 'Warning'),
      };
    } catch (error) {
      console.error('Error parsing reservation pull response:', error);
      return {
        success: false,
        errors: [
          {
            code: 'PARSE_ERROR',
            message: error instanceof Error ? error.message : 'Failed to parse response',
            type: 'Unknown',
          },
        ],
      };
    }
  }

  /**
   * Parse rate plan response (OTA_HotelRatePlanRS)
   * Extracts room and rate plan mapping data
   */
  parseRatePlanResponse(xmlString: string): SoapResponse<{
    ratePlans: Array<{
      ratePlanCode: string;
      ratePlanName?: string;
      ratePlanType?: string;
      roomTypeCode?: string;
      roomTypeName?: string;
      description?: string;
      minOccupancy?: number;
      maxOccupancy?: number;
    }>;
  }> {
    const response = this.parseSoapResponse(xmlString);
    if (!response.success) return response;

    // Extract rate plan data
    const otaResponse = response.data;
    const ratePlansElement = otaResponse?.RatePlans;

    if (!ratePlansElement) {
      return {
        ...response,
        data: { ratePlans: [] },
      };
    }

    const ratePlansArray = Array.isArray(ratePlansElement.RatePlan)
      ? ratePlansElement.RatePlan
      : ratePlansElement.RatePlan
        ? [ratePlansElement.RatePlan]
        : [];

    const ratePlans = ratePlansArray.map((rp: any) => ({
      ratePlanCode: rp['@_RatePlanCode'] || rp.RatePlanCode || '',
      ratePlanName: rp['@_RatePlanName'] || rp.RatePlanName,
      ratePlanType: rp['@_RatePlanType'] || rp.RatePlanType,
      roomTypeCode: rp['@_InvTypeCode'] || rp.InvTypeCode,
      roomTypeName: rp.RoomTypes?.RoomType?.['@_RoomTypeName'],
      description: rp.Description?.Text || rp.Description,
      minOccupancy: rp['@_MinOccupancy'] || rp.GuestCounts?.GuestCount?.['@_MinOccupancy'],
      maxOccupancy: rp['@_MaxOccupancy'] || rp.GuestCounts?.GuestCount?.['@_MaxOccupancy'],
    }));

    return {
      ...response,
      data: { ratePlans },
    };
  }

  /**
   * Parse OAuth2 token response (JSON)
   */
  parseTokenResponse(jsonString: string): {
    success: boolean;
    accessToken?: string;
    tokenType?: string;
    expiresIn?: number;
    scope?: string;
    error?: string;
  } {
    try {
      const data = JSON.parse(jsonString);

      if (data.access_token) {
        return {
          success: true,
          accessToken: data.access_token,
          tokenType: data.token_type || 'Bearer',
          expiresIn: data.exp || 3600,
          scope: data.scope,
        };
      } else if (data.error) {
        return {
          success: false,
          error: data.error_description || data.error,
        };
      } else {
        return {
          success: false,
          error: 'Invalid token response',
        };
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to parse JSON',
      };
    }
  }

  /**
   * Validate XML structure
   */
  validateXml(xmlString: string): { valid: boolean; error?: string } {
    try {
      this.parser.parse(xmlString);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid XML',
      };
    }
  }

  /**
   * Parse raw XML to object
   */
  parseXml(xmlString: string): any {
    return this.parser.parse(xmlString);
  }
}

// Export singleton instance
export const phobsXmlParser = new PhobsXmlParser();
