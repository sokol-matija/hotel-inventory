// PhobsXmlBuilder - Utility for building OTA-compliant XML messages
// Handles XML structure, namespaces, and OTA schema compliance

import { XMLBuilder } from 'fast-xml-parser';

/**
 * OTA XML Namespace constants
 */
export const OTA_NAMESPACES = {
  OTA: 'http://www.opentravel.org/OTA/2003/05',
  XSI: 'http://www.w3.org/2001/XMLSchema-instance',
  SOAP_ENV: 'http://schemas.xmlsoap.org/soap/envelope/',
  SOAP_ENC: 'http://schemas.xmlsoap.org/soap/encoding/',
};

/**
 * OTA Schema version
 */
export const OTA_VERSION = '1.006';

/**
 * XML Builder configuration for OTA messages
 */
const xmlBuilderConfig = {
  ignoreAttributes: false,
  format: true,
  indentBy: '  ',
  suppressEmptyNode: true,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
};

/**
 * PhobsXmlBuilder - Builds OTA-compliant XML messages
 */
export class PhobsXmlBuilder {
  private builder: XMLBuilder;

  constructor() {
    this.builder = new XMLBuilder(xmlBuilderConfig);
  }

  /**
   * Build SOAP envelope wrapper
   */
  buildSoapEnvelope(body: any, headers?: any): string {
    const envelope = {
      '?xml': {
        '@_version': '1.0',
        '@_encoding': 'UTF-8',
      },
      'soap:Envelope': {
        '@_xmlns:soap': OTA_NAMESPACES.SOAP_ENV,
        '@_xmlns:xsi': OTA_NAMESPACES.XSI,
        ...(headers && {
          'soap:Header': headers,
        }),
        'soap:Body': body,
      },
    };

    return this.builder.build(envelope);
  }

  /**
   * Build OTA_HotelAvailNotifRQ - Availability notification
   */
  buildAvailabilityNotification(params: {
    hotelCode: string;
    roomTypeCode: string;
    ratePlanCode?: string;
    startDate: string; // ISO format
    endDate: string; // ISO format
    available: number;
    status?: 'Open' | 'Close';
    minStay?: number;
    maxStay?: number;
    closeToArrival?: boolean;
    closeToDeparture?: boolean;
    timestamp?: string;
  }): string {
    const {
      hotelCode,
      roomTypeCode,
      ratePlanCode,
      startDate,
      endDate,
      available,
      status = 'Open',
      minStay,
      maxStay,
      closeToArrival,
      closeToDeparture,
      timestamp = new Date().toISOString(),
    } = params;

    const message: any = {
      '@_xmlns': OTA_NAMESPACES.OTA,
      '@_xmlns:xsi': OTA_NAMESPACES.XSI,
      '@_EchoToken': `AVAIL_${Date.now()}`,
      '@_TimeStamp': timestamp,
      '@_Version': OTA_VERSION,
      AvailStatusMessages: {
        '@_HotelCode': hotelCode,
        AvailStatusMessage: {
          StatusApplicationControl: {
            '@_Start': startDate,
            '@_End': endDate,
            '@_InvTypeCode': roomTypeCode,
            ...(ratePlanCode && { '@_RatePlanCode': ratePlanCode }),
          },
          ...(available !== undefined && {
            LengthsOfStay: {
              LengthOfStay: {
                '@_MinMaxMessageType': 'SetMinLOS',
                '@_Time': available,
              },
            },
          }),
          RestrictionStatus: {
            '@_Status': status,
            ...(closeToArrival !== undefined && {
              '@_Restriction': closeToArrival ? 'Arrival' : undefined,
            }),
            ...(closeToDeparture !== undefined && {
              '@_Restriction': closeToDeparture ? 'Departure' : undefined,
            }),
          },
          ...(minStay !== undefined && {
            LengthsOfStay: {
              LengthOfStay: {
                '@_MinMaxMessageType': 'SetMinLOS',
                '@_Time': minStay,
              },
            },
          }),
          ...(maxStay !== undefined && {
            LengthsOfStay: {
              LengthOfStay: {
                '@_MinMaxMessageType': 'SetMaxLOS',
                '@_Time': maxStay,
              },
            },
          }),
        },
      },
    };

    const body = {
      OTA_HotelAvailNotifRQ: message,
    };

    return this.buildSoapEnvelope(body);
  }

  /**
   * Build OTA_HotelRateAmountNotifRQ - Rate notification
   */
  buildRateNotification(params: {
    hotelCode: string;
    roomTypeCode: string;
    ratePlanCode: string;
    startDate: string;
    endDate: string;
    currencyCode: string;
    rates: Array<{
      numberOfGuests: number;
      ageQualifyingCode?: number; // 10=Adult, 8=Child
      amount: number;
    }>;
    timestamp?: string;
  }): string {
    const {
      hotelCode,
      roomTypeCode,
      ratePlanCode,
      startDate,
      endDate,
      currencyCode,
      rates,
      timestamp = new Date().toISOString(),
    } = params;

    const message: any = {
      '@_xmlns': OTA_NAMESPACES.OTA,
      '@_xmlns:xsi': OTA_NAMESPACES.XSI,
      '@_EchoToken': `RATE_${Date.now()}`,
      '@_TimeStamp': timestamp,
      '@_Version': OTA_VERSION,
      RateAmountMessages: {
        '@_HotelCode': hotelCode,
        RateAmountMessage: {
          StatusApplicationControl: {
            '@_Start': startDate,
            '@_End': endDate,
            '@_InvTypeCode': roomTypeCode,
            '@_RatePlanCode': ratePlanCode,
          },
          Rates: {
            Rate: {
              '@_CurrencyCode': currencyCode,
              BaseByGuestAmts: {
                BaseByGuestAmt: rates.map((rate) => ({
                  '@_NumberOfGuests': rate.numberOfGuests,
                  '@_AmountAfterTax': rate.amount.toFixed(2),
                  ...(rate.ageQualifyingCode && {
                    '@_AgeQualifyingCode': rate.ageQualifyingCode,
                  }),
                })),
              },
            },
          },
        },
      },
    };

    const body = {
      OTA_HotelRateAmountNotifRQ: message,
    };

    return this.buildSoapEnvelope(body);
  }

  /**
   * Build OTA_HotelResNotifRQ - Reservation notification
   */
  buildReservationNotification(params: {
    hotelCode: string;
    resStatus: 'Commit' | 'Cancel' | 'Modify';
    reservationId: string;
    roomTypeCode: string;
    ratePlanCode: string;
    checkIn: string;
    checkOut: string;
    numberOfUnits?: number;
    guestCounts?: Array<{
      ageQualifyingCode: number;
      count: number;
    }>;
    guest?: {
      givenName: string;
      surname: string;
      email?: string;
      phone?: string;
    };
    totalAmount?: number;
    currencyCode?: string;
    timestamp?: string;
  }): string {
    const {
      hotelCode,
      resStatus,
      reservationId,
      roomTypeCode,
      ratePlanCode,
      checkIn,
      checkOut,
      numberOfUnits = 1,
      guestCounts,
      guest,
      totalAmount,
      currencyCode = 'EUR',
      timestamp = new Date().toISOString(),
    } = params;

    const message: any = {
      '@_xmlns': OTA_NAMESPACES.OTA,
      '@_xmlns:xsi': OTA_NAMESPACES.XSI,
      '@_EchoToken': `RES_${Date.now()}`,
      '@_TimeStamp': timestamp,
      '@_Version': OTA_VERSION,
      '@_ResStatus': resStatus,
      HotelReservations: {
        HotelReservation: {
          UniqueID: {
            '@_Type': '14', // Reservation ID type
            '@_ID': reservationId,
          },
          RoomStays: {
            RoomStay: {
              RoomTypes: {
                RoomType: {
                  '@_RoomTypeCode': roomTypeCode,
                  '@_NumberOfUnits': numberOfUnits,
                },
              },
              RatePlans: {
                RatePlan: {
                  '@_RatePlanCode': ratePlanCode,
                },
              },
              TimeSpan: {
                '@_Start': checkIn,
                '@_End': checkOut,
              },
              ...(guestCounts && {
                GuestCounts: {
                  GuestCount: guestCounts.map((gc) => ({
                    '@_AgeQualifyingCode': gc.ageQualifyingCode,
                    '@_Count': gc.count,
                  })),
                },
              }),
              BasicPropertyInfo: {
                '@_HotelCode': hotelCode,
              },
              ...(totalAmount !== undefined && {
                Total: {
                  '@_AmountAfterTax': totalAmount.toFixed(2),
                  '@_CurrencyCode': currencyCode,
                },
              }),
            },
          },
          ResGuests: guest
            ? {
                ResGuest: {
                  Profiles: {
                    ProfileInfo: {
                      Profile: {
                        Customer: {
                          PersonName: {
                            GivenName: guest.givenName,
                            Surname: guest.surname,
                          },
                          ...(guest.email && {
                            Email: guest.email,
                          }),
                          ...(guest.phone && {
                            Telephone: {
                              '@_PhoneNumber': guest.phone,
                            },
                          }),
                        },
                      },
                    },
                  },
                },
              }
            : undefined,
        },
      },
    };

    const body = {
      OTA_HotelResNotifRQ: message,
    };

    return this.buildSoapEnvelope(body);
  }

  /**
   * Build reservation pull request (OTA_HotelResNotifRS)
   * Step 1: PMS requests reservation list from Phobs
   * Used to initiate the pull-based reservation sync
   */
  /**
   * Build reservation pull request (OTA_HotelResNotifRS)
   * Step 1: PMS requests reservation list from Phobs
   * Used to initiate the pull-based reservation sync
   */
  buildReservationPullRequest(params: {
    hotelCode: string;
    username: string;
    password: string;
    timestamp?: string;
  }): string {
    const {
      hotelCode,
      username,
      password,
      timestamp = new Date().toISOString(),
    } = params;

    // Build WS-Security header
    const headers = {
      'wsse:Security': {
        '@_xmlns:wsse':
          'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd',
        'wsse:UsernameToken': {
          'wsse:Username': username,
          'wsse:Password': {
            '@_xsi:type': 'wsse:http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText',
            '#text': password,
          },
        },
      },
    };

    const message: any = {
      '@_xmlns': OTA_NAMESPACES.OTA,
      '@_xmlns:xsi': OTA_NAMESPACES.XSI,
      '@_EchoToken': `PHOBS${Date.now()}`,
      '@_TimeStamp': timestamp,
      '@_Version': OTA_VERSION,
      '@_ResResponseType': 'Commited', // Note: Phobs uses "Commited" not "Committed"
      Success: {}, // Empty success element
    };

    const body = {
      OTA_HotelResNotifRS: message,
    };

    return this.buildSoapEnvelope(body, headers);
  }

  /**
   * Build reservation confirmation message (Step 3)
   * Confirms receipt of reservations pulled from Phobs
   */
  /**
   * Build reservation confirmation message (Step 3)
   * Confirms receipt of reservations pulled from Phobs
   */
  buildReservationConfirmation(params: {
    hotelCode: string;
    username: string;
    password: string;
    confirmationCodes: Array<{
      reservationCode: string;
      pmsConfirmationId: string;
      yourConfirmationCode: string;
    }>; // List of reservations to confirm with mapping
    timestamp?: string;
  }): string {
    const {
      hotelCode,
      username,
      password,
      confirmationCodes,
      timestamp = new Date().toISOString(),
    } = params;

    // Build WS-Security header
    const headers = {
      'wsse:Security': {
        '@_xmlns:wsse':
          'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd',
        'wsse:UsernameToken': {
          'wsse:Username': username,
          'wsse:Password': {
            '@_xsi:type': 'wsse:http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText',
            '#text': password,
          },
        },
      },
    };

    const message: any = {
      '@_xmlns': OTA_NAMESPACES.OTA,
      '@_xmlns:xsi': OTA_NAMESPACES.XSI,
      '@_EchoToken': `PHOBS${Date.now()}`,
      '@_TimeStamp': timestamp,
      '@_Version': OTA_VERSION,
      '@_ResResponseType': 'Commited',
      Success: {},
      // Include confirmation codes with PMS mapping
      HotelReservations: {
        HotelReservation: confirmationCodes.map((code) => ({
          UniqueID: {
            '@_Type': '14',
            '@_ID': code.reservationCode,
          },
          ResGlobalInfo: {
            HotelReservationIDs: {
              HotelReservationID: {
                '@_ResID_Type': '10',
                '@_ResID_Value': code.yourConfirmationCode,
                '@_PMSConfirmationID': code.pmsConfirmationId,
                '@_ForGuest': 'true',
              },
            },
          },
        })),
      },
    };

    const body = {
      OTA_HotelResNotifRS: message,
    };

    return this.buildSoapEnvelope(body, headers);
  }

  /**
   * Build OTA_HotelRatePlanRQ - Fetch hotel rate plan
   * Used to retrieve rate and room mapping data from Phobs
   */
  buildRatePlanRequest(params: {
    hotelCode: string;
    destinationSystemCode?: string;
    timestamp?: string;
  }): string {
    const {
      hotelCode,
      destinationSystemCode = 'PHOBS',
      timestamp = new Date().toISOString(),
    } = params;

    const message: any = {
      '@_xmlns': OTA_NAMESPACES.OTA,
      '@_xmlns:xsi': OTA_NAMESPACES.XSI,
      '@_EchoToken': `RATEPLAN_${Date.now()}`,
      '@_TimeStamp': timestamp,
      '@_Version': OTA_VERSION,
      RatePlans: {
        RatePlan: {
          DestinationSystemsCode: {
            DestinationSystemCode: destinationSystemCode,
          },
          HotelRef: {
            '@_HotelCode': hotelCode,
          },
        },
      },
    };

    const body = {
      OTA_HotelRatePlanRQ: message,
    };

    return this.buildSoapEnvelope(body);
  }

  /**
   * Build authentication SOAP header
   */
  buildAuthHeader(username: string, password: string): any {
    return {
      'wsse:Security': {
        '@_xmlns:wsse':
          'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd',
        'wsse:UsernameToken': {
          'wsse:Username': username,
          'wsse:Password': password,
        },
      },
    };
  }

  /**
   * Build raw XML from object
   */
  buildXml(obj: any): string {
    return this.builder.build(obj);
  }
}

// Export singleton instance
export const phobsXmlBuilder = new PhobsXmlBuilder();
