// PhobsErrorHandlingService - Comprehensive error handling and retry logic
// Handles API failures, rate limiting, and recovery mechanisms for Phobs integration

import hotelNotification from '../../notifications';

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableStatuses: number[];
  timeoutMs: number;
}

export interface ErrorContext {
  operation: string;
  endpoint?: string;
  requestData?: any;
  attempt: number;
  timestamp: Date;
  userId?: string;
  hotelId?: string;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: { [key: string]: number };
  errorsByEndpoint: { [key: string]: number };
  lastError: Date | null;
  successfulRetries: number;
  failedRetries: number;
  averageRetryTime: number;
}

export enum PhobsErrorType {
  NETWORK_ERROR = 'network_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  VALIDATION_ERROR = 'validation_error',
  SERVER_ERROR = 'server_error',
  TIMEOUT_ERROR = 'timeout_error',
  CONFLICT_ERROR = 'conflict_error',
  NOT_FOUND_ERROR = 'not_found_error',
  UNKNOWN_ERROR = 'unknown_error'
}

export class PhobsError extends Error {
  public readonly type: PhobsErrorType;
  public readonly statusCode?: number;
  public readonly context: ErrorContext;
  public readonly retryable: boolean;
  public readonly originalError?: Error;

  constructor(
    message: string,
    type: PhobsErrorType,
    context: ErrorContext,
    statusCode?: number,
    retryable: boolean = false,
    originalError?: Error
  ) {
    super(message);
    this.name = 'PhobsError';
    this.type = type;
    this.statusCode = statusCode;
    this.context = context;
    this.retryable = retryable;
    this.originalError = originalError;
  }
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: PhobsError;
  attempts: number;
  totalTime: number;
  wasRetried: boolean;
}

export class PhobsErrorHandlingService {
  private static instance: PhobsErrorHandlingService;
  private errorMetrics: ErrorMetrics;
  private defaultRetryConfig: RetryConfig;
  private activeRetries: Map<string, number> = new Map();

  private constructor() {
    this.errorMetrics = {
      totalErrors: 0,
      errorsByType: {},
      errorsByEndpoint: {},
      lastError: null,
      successfulRetries: 0,
      failedRetries: 0,
      averageRetryTime: 0
    };

    this.defaultRetryConfig = {
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      retryableStatuses: [408, 429, 500, 502, 503, 504],
      timeoutMs: 30000
    };
  }

  public static getInstance(): PhobsErrorHandlingService {
    if (!PhobsErrorHandlingService.instance) {
      PhobsErrorHandlingService.instance = new PhobsErrorHandlingService();
    }
    return PhobsErrorHandlingService.instance;
  }

  /**
   * Execute an operation with automatic retry logic
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    context: Omit<ErrorContext, 'attempt' | 'timestamp'>,
    retryConfig?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    const startTime = Date.now();
    let lastError: PhobsError | undefined;
    let attempt = 0;

    for (attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const fullContext: ErrorContext = {
          ...context,
          attempt,
          timestamp: new Date()
        };

        // Add timeout wrapper
        const result = await this.withTimeout(operation(), config.timeoutMs);
        
        // Success - update metrics if this was a retry
        if (attempt > 1) {
          this.errorMetrics.successfulRetries++;
          this.updateAverageRetryTime(Date.now() - startTime);
          
          hotelNotification.success(
            'Operation Recovered',
            `${context.operation} succeeded after ${attempt} attempts`,
            3
          );
        }

        return {
          success: true,
          data: result,
          attempts: attempt,
          totalTime: Date.now() - startTime,
          wasRetried: attempt > 1
        };

      } catch (error) {
        const phobsError = this.handleError(error, {
          ...context,
          attempt,
          timestamp: new Date()
        });

        lastError = phobsError;
        this.trackError(phobsError);

        // Check if we should retry
        if (attempt < config.maxAttempts && phobsError.retryable) {
          const delayMs = this.calculateDelay(attempt, config);
          
          hotelNotification.warning(
            'Retrying Operation',
            `${context.operation} failed, retrying in ${Math.round(delayMs / 1000)}s (attempt ${attempt}/${config.maxAttempts})`,
            2
          );

          await this.delay(delayMs);
          continue;
        }

        // Max attempts reached or non-retryable error
        this.errorMetrics.failedRetries++;
        
        hotelNotification.error(
          'Operation Failed',
          `${context.operation} failed after ${attempt} attempts: ${phobsError.message}`,
          8
        );

        return {
          success: false,
          error: phobsError,
          attempts: attempt,
          totalTime: Date.now() - startTime,
          wasRetried: attempt > 1
        };
      }
    }

    // This should never be reached, but included for type safety
    return {
      success: false,
      error: lastError || new PhobsError(
        'Unknown error occurred',
        PhobsErrorType.UNKNOWN_ERROR,
        { ...context, attempt, timestamp: new Date() }
      ),
      attempts: attempt,
      totalTime: Date.now() - startTime,
      wasRetried: true
    };
  }

  /**
   * Handle and classify errors
   */
  handleError(error: any, context: ErrorContext): PhobsError {
    let phobsError: PhobsError;

    if (error instanceof PhobsError) {
      return error;
    }

    if (error instanceof Error) {
      // Network errors
      if (error.name === 'NetworkError' || error.message.includes('fetch')) {
        phobsError = new PhobsError(
          `Network error: ${error.message}`,
          PhobsErrorType.NETWORK_ERROR,
          context,
          undefined,
          true,
          error
        );
      }
      // Timeout errors
      else if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
        phobsError = new PhobsError(
          `Timeout error: ${error.message}`,
          PhobsErrorType.TIMEOUT_ERROR,
          context,
          408,
          true,
          error
        );
      }
      // Default to unknown error
      else {
        phobsError = new PhobsError(
          error.message,
          PhobsErrorType.UNKNOWN_ERROR,
          context,
          undefined,
          false,
          error
        );
      }
    }
    // HTTP Response errors
    else if (error && typeof error === 'object' && 'status' in error) {
      const status = error.status as number;
      phobsError = this.classifyHttpError(error, status, context);
    }
    // String errors
    else if (typeof error === 'string') {
      phobsError = new PhobsError(
        error,
        PhobsErrorType.UNKNOWN_ERROR,
        context,
        undefined,
        false
      );
    }
    // Unknown error type
    else {
      phobsError = new PhobsError(
        'An unknown error occurred',
        PhobsErrorType.UNKNOWN_ERROR,
        context,
        undefined,
        false
      );
    }

    return phobsError;
  }

  /**
   * Classify HTTP errors by status code
   */
  private classifyHttpError(error: any, status: number, context: ErrorContext): PhobsError {
    const message = error.message || error.statusText || `HTTP ${status} Error`;
    
    switch (status) {
      case 400:
        return new PhobsError(
          `Validation error: ${message}`,
          PhobsErrorType.VALIDATION_ERROR,
          context,
          status,
          false,
          error
        );
      
      case 401:
      case 403:
        return new PhobsError(
          `Authentication error: ${message}`,
          PhobsErrorType.AUTHENTICATION_ERROR,
          context,
          status,
          false,
          error
        );
      
      case 404:
        return new PhobsError(
          `Resource not found: ${message}`,
          PhobsErrorType.NOT_FOUND_ERROR,
          context,
          status,
          false,
          error
        );
      
      case 408:
        return new PhobsError(
          `Request timeout: ${message}`,
          PhobsErrorType.TIMEOUT_ERROR,
          context,
          status,
          true,
          error
        );
      
      case 409:
        return new PhobsError(
          `Conflict error: ${message}`,
          PhobsErrorType.CONFLICT_ERROR,
          context,
          status,
          false,
          error
        );
      
      case 429:
        return new PhobsError(
          `Rate limit exceeded: ${message}`,
          PhobsErrorType.RATE_LIMIT_ERROR,
          context,
          status,
          true,
          error
        );
      
      case 500:
      case 502:
      case 503:
      case 504:
        return new PhobsError(
          `Server error: ${message}`,
          PhobsErrorType.SERVER_ERROR,
          context,
          status,
          true,
          error
        );
      
      default:
        return new PhobsError(
          `HTTP ${status} error: ${message}`,
          PhobsErrorType.UNKNOWN_ERROR,
          context,
          status,
          this.defaultRetryConfig.retryableStatuses.includes(status),
          error
        );
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    const baseDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
    const jitteredDelay = baseDelay * (0.5 + Math.random() * 0.5); // Add jitter
    return Math.min(jitteredDelay, config.maxDelayMs);
  }

  /**
   * Add timeout to a promise
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Track error for metrics
   */
  private trackError(error: PhobsError): void {
    this.errorMetrics.totalErrors++;
    this.errorMetrics.lastError = new Date();
    
    // Track by error type
    if (!this.errorMetrics.errorsByType[error.type]) {
      this.errorMetrics.errorsByType[error.type] = 0;
    }
    this.errorMetrics.errorsByType[error.type]++;
    
    // Track by endpoint
    if (error.context.endpoint) {
      if (!this.errorMetrics.errorsByEndpoint[error.context.endpoint]) {
        this.errorMetrics.errorsByEndpoint[error.context.endpoint] = 0;
      }
      this.errorMetrics.errorsByEndpoint[error.context.endpoint]++;
    }
  }

  /**
   * Update average retry time
   */
  private updateAverageRetryTime(retryTime: number): void {
    const totalRetries = this.errorMetrics.successfulRetries + this.errorMetrics.failedRetries;
    const currentAverage = this.errorMetrics.averageRetryTime;
    
    this.errorMetrics.averageRetryTime = 
      ((currentAverage * (totalRetries - 1)) + retryTime) / totalRetries;
  }

  /**
   * Get error metrics
   */
  getMetrics(): ErrorMetrics {
    return { ...this.errorMetrics };
  }

  /**
   * Reset error metrics
   */
  resetMetrics(): void {
    this.errorMetrics = {
      totalErrors: 0,
      errorsByType: {},
      errorsByEndpoint: {},
      lastError: null,
      successfulRetries: 0,
      failedRetries: 0,
      averageRetryTime: 0
    };
  }

  /**
   * Check if operation is safe to retry based on current load
   */
  canRetry(operation: string): boolean {
    const activeRetries = this.activeRetries.get(operation) || 0;
    const maxConcurrentRetries = 5; // Prevent too many concurrent retries
    
    return activeRetries < maxConcurrentRetries;
  }

  /**
   * Track active retry
   */
  startRetry(operation: string): void {
    const current = this.activeRetries.get(operation) || 0;
    this.activeRetries.set(operation, current + 1);
  }

  /**
   * Stop tracking retry
   */
  endRetry(operation: string): void {
    const current = this.activeRetries.get(operation) || 0;
    if (current > 0) {
      this.activeRetries.set(operation, current - 1);
    }
  }

  /**
   * Get retry configuration recommendations based on error patterns
   */
  getRecommendedRetryConfig(operation: string): Partial<RetryConfig> {
    const metrics = this.getMetrics();
    const config: Partial<RetryConfig> = {};

    // If we're seeing a lot of rate limit errors, increase delays
    const rateLimitErrors = metrics.errorsByType[PhobsErrorType.RATE_LIMIT_ERROR] || 0;
    if (rateLimitErrors > 10) {
      config.baseDelayMs = 5000;
      config.maxDelayMs = 60000;
      config.backoffMultiplier = 3;
    }

    // If we're seeing timeout errors, increase timeout
    const timeoutErrors = metrics.errorsByType[PhobsErrorType.TIMEOUT_ERROR] || 0;
    if (timeoutErrors > 5) {
      config.timeoutMs = 60000;
    }

    // If success rate is low, reduce max attempts to fail faster
    const totalRetries = metrics.successfulRetries + metrics.failedRetries;
    if (totalRetries > 10 && metrics.successfulRetries / totalRetries < 0.3) {
      config.maxAttempts = 2;
    }

    return config;
  }

  /**
   * Log error details for debugging
   */
  logError(error: PhobsError, level: 'error' | 'warn' | 'info' = 'error'): void {
    const logData = {
      type: error.type,
      message: error.message,
      operation: error.context.operation,
      endpoint: error.context.endpoint,
      attempt: error.context.attempt,
      statusCode: error.statusCode,
      retryable: error.retryable,
      timestamp: error.context.timestamp.toISOString(),
      originalError: error.originalError?.message
    };

    switch (level) {
      case 'error':
        console.error('Phobs Error:', logData);
        break;
      case 'warn':
        console.warn('Phobs Warning:', logData);
        break;
      case 'info':
        console.info('Phobs Info:', logData);
        break;
    }
  }
}