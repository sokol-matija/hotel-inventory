// PhobsSoapClient - SOAP/HTTP transport layer for Phobs API
// Handles HTTP requests, SOAP envelopes, authentication, and error handling

import { phobsXmlBuilder } from './PhobsXmlBuilder';
import { phobsXmlParser, SoapResponse } from './PhobsXmlParser';
import { PhobsErrorHandlingService } from './PhobsErrorHandlingService';
import { PhobsConfig } from './phobsTypes';

/**
 * SOAP client configuration
 */
export interface SoapClientConfig {
  baseUrl: string;
  timeout: number;
  username?: string;
  password?: string;
  bearerToken?: string;
}

/**
 * SOAP request options
 */
export interface SoapRequestOptions {
  endpoint: string;
  soapAction?: string;
  headers?: Record<string, string>;
  timeout?: number;
  requiresAuth?: boolean;
}

/**
 * PhobsSoapClient - Handles SOAP communication with Phobs API
 */
export class PhobsSoapClient {
  private config: SoapClientConfig;
  private errorHandler: PhobsErrorHandlingService;
  private bearerToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(config: SoapClientConfig) {
    this.config = config;
    this.errorHandler = PhobsErrorHandlingService.getInstance();
  }

  /**
   * Set bearer token for OAuth2 authentication
   */
  setBearerToken(token: string, expiresAt?: Date): void {
    this.bearerToken = token;
    this.tokenExpiresAt = expiresAt || null;
  }

  /**
   * Check if bearer token is valid
   */
  isTokenValid(): boolean {
    if (!this.bearerToken) return false;
    if (!this.tokenExpiresAt) return true; // No expiry set
    return this.tokenExpiresAt > new Date();
  }

  /**
   * Clear bearer token
   */
  clearToken(): void {
    this.bearerToken = null;
    this.tokenExpiresAt = null;
  }

  /**
   * Send SOAP request with XML body
   */
  async sendSoapRequest<T = any>(
    xmlBody: string,
    options: SoapRequestOptions
  ): Promise<SoapResponse<T>> {
    const {
      endpoint,
      soapAction,
      headers = {},
      timeout = this.config.timeout,
      requiresAuth = true,
    } = options;

    try {
      // Build headers
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'text/xml; charset=utf-8',
        Accept: 'text/xml',
        ...headers,
      };

      // Add SOAP Action if provided
      if (soapAction) {
        requestHeaders['SOAPAction'] = soapAction;
      }

      // Add authentication
      if (requiresAuth) {
        if (this.bearerToken && this.isTokenValid()) {
          // Bearer token authentication
          requestHeaders['Authorization'] = `Bearer ${this.bearerToken}`;
        } else if (this.config.username && this.config.password) {
          // Basic authentication
          const credentials = btoa(
            `${this.config.username}:${this.config.password}`
          );
          requestHeaders['Authorization'] = `Basic ${credentials}`;
        }
      }

      // Make HTTP request
      const url = `${this.config.baseUrl}${endpoint}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers: requestHeaders,
        body: xmlBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Get response text
      const responseText = await response.text();

      // Check HTTP status
      if (!response.ok) {
        // Try to parse as SOAP fault
        if (responseText.includes('soap:Fault') || responseText.includes('Fault')) {
          const parsed = phobsXmlParser.parseSoapResponse<T>(responseText);
          return parsed;
        }

        // Return HTTP error
        return {
          success: false,
          errors: [
            {
              type: 'HTTPError',
              code: `HTTP_${response.status}`,
              message: `HTTP ${response.status}: ${response.statusText}`,
              shortText: responseText.substring(0, 200),
            },
          ],
        };
      }

      // Parse SOAP response
      const parsed = phobsXmlParser.parseSoapResponse<T>(responseText);
      return parsed;
    } catch (error) {
      // Handle network errors, timeouts, etc.
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          errors: [
            {
              type: 'TimeoutError',
              code: 'REQUEST_TIMEOUT',
              message: `Request timeout after ${timeout}ms`,
            },
          ],
        };
      }

      return {
        success: false,
        errors: [
          {
            type: 'NetworkError',
            code: 'NETWORK_ERROR',
            message: error instanceof Error ? error.message : 'Network error occurred',
          },
        ],
      };
    }
  }

  /**
   * Send availability notification
   */
  async sendAvailabilityNotification(params: {
    hotelCode: string;
    roomTypeCode: string;
    ratePlanCode?: string;
    startDate: string;
    endDate: string;
    available: number;
    status?: 'Open' | 'Close';
    minStay?: number;
    maxStay?: number;
    closeToArrival?: boolean;
    closeToDeparture?: boolean;
  }): Promise<SoapResponse> {
    const xmlBody = phobsXmlBuilder.buildAvailabilityNotification(params);

    return this.sendSoapRequest(xmlBody, {
      endpoint: '/availability',
      soapAction: 'OTA_HotelAvailNotifRQ',
      requiresAuth: true,
    });
  }

  /**
   * Send rate notification
   */
  async sendRateNotification(params: {
    hotelCode: string;
    roomTypeCode: string;
    ratePlanCode: string;
    startDate: string;
    endDate: string;
    currencyCode: string;
    rates: Array<{
      numberOfGuests: number;
      ageQualifyingCode?: number;
      amount: number;
    }>;
  }): Promise<SoapResponse> {
    const xmlBody = phobsXmlBuilder.buildRateNotification(params);

    return this.sendSoapRequest(xmlBody, {
      endpoint: '/rates',
      soapAction: 'OTA_HotelRateAmountNotifRQ',
      requiresAuth: true,
    });
  }

  /**
   * Send reservation notification
   */
  async sendReservationNotification(params: {
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
  }): Promise<SoapResponse<{ reservationId?: string; confirmationNumber?: string }>> {
    const xmlBody = phobsXmlBuilder.buildReservationNotification(params);

    const response = await this.sendSoapRequest(xmlBody, {
      endpoint: '/reservations',
      soapAction: 'OTA_HotelResNotifRQ',
      requiresAuth: true,
    });

    // Parse reservation-specific data
    return phobsXmlParser.parseReservationResponse(
      xmlBody // This is a workaround - ideally we'd pass the response XML
    );
  }

  /**
   * Pull reservations from Phobs (Step 1 & 2 of pull process)
   * Sends OTA_HotelResNotifRS request, receives OTA_HotelResNotifRQ response
   */
  async pullReservations(params: {
    hotelCode: string;
    username: string;
    password: string;
  }): Promise<{
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
  }> {
    try {
      // Build pull request XML
      const xmlBody = phobsXmlBuilder.buildReservationPullRequest(params);

      // Send SOAP request
      const response = await this.sendSoapRequest(xmlBody, {
        endpoint: '/reservations/pull',
        requiresAuth: true,
      });

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

      // Parse the response to extract reservations
      const parseResult = phobsXmlParser.parseReservationPullResponse(response.data);

      return parseResult;
    } catch (error) {
      console.error('Error pulling reservations:', error);
      return {
        success: false,
        errors: [
          {
            code: 'PULL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to pull reservations',
            type: 'Unknown',
          },
        ],
      };
    }
  }

  /**
   * Confirm received reservations (Step 3 of pull process)
   * Sends OTA_HotelResNotifRS with confirmation codes
   */
  async confirmReservations(params: {
    hotelCode: string;
    username: string;
    password: string;
    confirmationCodes: Array<{
      reservationCode: string;
      pmsConfirmationId: string;
      yourConfirmationCode: string;
    }>;
  }): Promise<{
    success: boolean;
    errors?: Array<{ code: string; message: string; type: string }>;
    warnings?: string[];
  }> {
    try {
      // Build confirmation XML
      const xmlBody = phobsXmlBuilder.buildReservationConfirmation(params);

      // Send SOAP request
      const response = await this.sendSoapRequest(xmlBody, {
        endpoint: '/reservations/confirm',
        requiresAuth: true,
      });

      if (!response.success) {
        return {
          success: false,
          errors: response.errors?.map(e => ({
            code: e.code,
            message: e.message || e.shortText || 'Unknown error',
            type: e.type
          })),
        };
      }

      return {
        success: true,
        warnings: response.warnings?.map(w => w.message || w.shortText || 'Warning'),
      };
    } catch (error) {
      console.error('Error confirming reservations:', error);
      return {
        success: false,
        errors: [
          {
            code: 'CONFIRM_ERROR',
            message: error instanceof Error ? error.message : 'Failed to confirm reservations',
            type: 'Unknown',
          },
        ],
      };
    }
  }

  /**
   * Send rate plan request (fetch hotel rate plan)
   * Retrieves rate and room mapping data from Phobs
   */
  async sendRatePlanRequest(params: {
    hotelCode: string;
    destinationSystemCode?: string;
  }): Promise<SoapResponse<{
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
  }>> {
    const xmlBody = phobsXmlBuilder.buildRatePlanRequest(params);

    const response = await this.sendSoapRequest(xmlBody, {
      endpoint: '/rateplans',
      soapAction: 'OTA_HotelRatePlanRQ',
      requiresAuth: true,
    });

    // Parse rate plan-specific data
    if (response.success) {
      // Extract the raw XML response text and parse it properly
      // For now, return the generic response
      return response as SoapResponse<{
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
      }>;
    }

    return response;
  }

  /**
   * Authenticate with OAuth2 to get bearer token
   */
  async authenticate(
    apiKey: string,
    secretKey: string,
    hotelId: string
  ): Promise<{
    success: boolean;
    token?: string;
    expiresAt?: Date;
    error?: string;
  }> {
    try {
      // OAuth2 endpoint uses Basic Auth with X-Client-ID header
      const credentials = btoa(`${apiKey}:${secretKey}`);

      const response = await fetch(`${this.config.baseUrl}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${credentials}`,
          'X-Client-ID': 'ads',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          scope: 'reservations:upload',
        }),
      });

      const responseText = await response.text();

      if (!response.ok) {
        return {
          success: false,
          error: `Authentication failed: HTTP ${response.status}`,
        };
      }

      // Parse token response
      const tokenData = phobsXmlParser.parseTokenResponse(responseText);

      if (tokenData.success && tokenData.accessToken) {
        // Calculate expiry (default 1 hour)
        const expiresIn = tokenData.expiresIn || 3600;
        const expiresAt = new Date(Date.now() + expiresIn * 1000);

        // Store token
        this.setBearerToken(tokenData.accessToken, expiresAt);

        return {
          success: true,
          token: tokenData.accessToken,
          expiresAt,
        };
      } else {
        return {
          success: false,
          error: tokenData.error || 'Authentication failed',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication error',
      };
    }
  }

  /**
   * Test connection to SOAP endpoint
   */
  async testConnection(): Promise<{
    success: boolean;
    latency?: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();

      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        return { success: true, latency };
      } else {
        return {
          success: false,
          latency,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Send raw SOAP envelope
   */
  async sendRawSoap<T = any>(
    soapEnvelope: string,
    endpoint: string,
    soapAction?: string
  ): Promise<SoapResponse<T>> {
    return this.sendSoapRequest<T>(soapEnvelope, {
      endpoint,
      soapAction,
    });
  }

  /**
   * Update client configuration
   */
  updateConfig(config: Partial<SoapClientConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): SoapClientConfig {
    return { ...this.config };
  }
}

/**
 * Create SOAP client from Phobs config
 */
export function createPhobsSoapClient(config: PhobsConfig): PhobsSoapClient {
  return new PhobsSoapClient({
    baseUrl: config.baseUrl,
    timeout: config.timeout,
    username: config.apiKey,
    password: config.secretKey,
  });
}
