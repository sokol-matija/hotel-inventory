// PhobsErrorHandling.test.ts - Unit tests for error handling service
import { PhobsErrorHandlingService, PhobsError, PhobsErrorType } from '../PhobsErrorHandlingService';
import { testMocks, testUtils } from './setup';

describe('PhobsErrorHandlingService', () => {
  let errorHandler: PhobsErrorHandlingService;

  beforeEach(() => {
    errorHandler = PhobsErrorHandlingService.getInstance();
    errorHandler.resetMetrics();
  });

  describe('Error Classification', () => {
    test('should classify network errors correctly', () => {
      const networkError = new Error('Network error: Connection refused');
      networkError.name = 'NetworkError';

      const phobsError = errorHandler.handleError(networkError, {
        operation: 'test_operation',
        attempt: 1,
        timestamp: new Date()
      });

      expect(phobsError.type).toBe(PhobsErrorType.NETWORK_ERROR);
      expect(phobsError.retryable).toBe(true);
    });

    test('should classify HTTP errors by status code', () => {
      const authError = {
        status: 401,
        message: 'Unauthorized'
      };

      const phobsError = errorHandler.handleError(authError, {
        operation: 'authenticate',
        attempt: 1,
        timestamp: new Date()
      });

      expect(phobsError.type).toBe(PhobsErrorType.AUTHENTICATION_ERROR);
      expect(phobsError.retryable).toBe(false);
      expect(phobsError.statusCode).toBe(401);
    });

    test('should classify rate limit errors as retryable', () => {
      const rateLimitError = {
        status: 429,
        message: 'Rate limit exceeded'
      };

      const phobsError = errorHandler.handleError(rateLimitError, {
        operation: 'sync_data',
        attempt: 1,
        timestamp: new Date()
      });

      expect(phobsError.type).toBe(PhobsErrorType.RATE_LIMIT_ERROR);
      expect(phobsError.retryable).toBe(true);
    });

    test('should classify server errors as retryable', () => {
      const serverError = {
        status: 500,
        message: 'Internal server error'
      };

      const phobsError = errorHandler.handleError(serverError, {
        operation: 'sync_data',
        attempt: 1,
        timestamp: new Date()
      });

      expect(phobsError.type).toBe(PhobsErrorType.SERVER_ERROR);
      expect(phobsError.retryable).toBe(true);
    });
  });

  describe('Retry Logic', () => {
    test('should retry retryable errors', async () => {
      let attemptCount = 0;
      const flakyOperation = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };

      const result = await errorHandler.withRetry(
        flakyOperation,
        { operation: 'flaky_test' },
        { maxAttempts: 3, baseDelayMs: 10 }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(3);
      expect(result.wasRetried).toBe(true);
    });

    test('should not retry non-retryable errors', async () => {
      const authFailureOperation = async () => {
        const error = new Error('Authentication failed');
        (error as any).status = 401;
        throw error;
      };

      const result = await errorHandler.withRetry(
        authFailureOperation,
        { operation: 'auth_test' }
      );

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(result.wasRetried).toBe(false);
    });

    test('should respect max attempts limit', async () => {
      const alwaysFailOperation = async () => {
        throw new Error('Always fails');
      };

      const result = await errorHandler.withRetry(
        alwaysFailOperation,
        { operation: 'always_fail_test' },
        { maxAttempts: 2, baseDelayMs: 10 }
      );

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(2);
      expect(result.wasRetried).toBe(true);
    });

    test('should implement exponential backoff', async () => {
      const delays: number[] = [];
      const startTime = Date.now();

      const timedOperation = async () => {
        const currentTime = Date.now();
        if (delays.length > 0) {
          delays.push(currentTime - startTime);
        } else {
          delays.push(0);
        }
        throw new Error('Retry test');
      };

      await errorHandler.withRetry(
        timedOperation,
        { operation: 'backoff_test' },
        { maxAttempts: 3, baseDelayMs: 100, backoffMultiplier: 2 }
      );

      // Should have exponentially increasing delays (with jitter)
      expect(delays.length).toBe(3);
      expect(delays[1]).toBeGreaterThan(50); // At least half the base delay
      expect(delays[2]).toBeGreaterThan(delays[1]); // Should increase
    });
  });

  describe('Timeout Handling', () => {
    test('should timeout long-running operations', async () => {
      const slowOperation = async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return 'should not complete';
      };

      const result = await errorHandler.withRetry(
        slowOperation,
        { operation: 'timeout_test' },
        { timeoutMs: 100, maxAttempts: 1 }
      );

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(PhobsErrorType.TIMEOUT_ERROR);
    });

    test('should complete operations within timeout', async () => {
      const fastOperation = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'completed';
      };

      const result = await errorHandler.withRetry(
        fastOperation,
        { operation: 'fast_test' },
        { timeoutMs: 100, maxAttempts: 1 }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('completed');
    });
  });

  describe('Metrics Tracking', () => {
    test('should track error metrics', () => {
      const initialMetrics = errorHandler.getMetrics();
      expect(initialMetrics.totalErrors).toBe(0);

      // Simulate some errors
      errorHandler.handleError(new Error('Test error 1'), {
        operation: 'test_op',
        attempt: 1,
        timestamp: new Date()
      });

      errorHandler.handleError(new Error('Test error 2'), {
        operation: 'test_op',
        attempt: 1,
        timestamp: new Date()
      });

      const updatedMetrics = errorHandler.getMetrics();
      expect(updatedMetrics.totalErrors).toBe(2);
      expect(updatedMetrics.lastError).toBeInstanceOf(Date);
    });

    test('should track errors by type', async () => {
      const networkFailure = async () => {
        const error = new Error('Network error');
        error.name = 'NetworkError';
        throw error;
      };

      const authFailure = async () => {
        const error = new Error('Auth error');
        (error as any).status = 401;
        throw error;
      };

      await errorHandler.withRetry(networkFailure, { operation: 'network_test' }, { maxAttempts: 1 });
      await errorHandler.withRetry(authFailure, { operation: 'auth_test' }, { maxAttempts: 1 });

      const metrics = errorHandler.getMetrics();
      expect(metrics.errorsByType[PhobsErrorType.NETWORK_ERROR]).toBeGreaterThan(0);
      expect(metrics.errorsByType[PhobsErrorType.AUTHENTICATION_ERROR]).toBeGreaterThan(0);
    });

    test('should track successful retries', async () => {
      let attemptCount = 0;
      const eventuallySucceedOperation = async () => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };

      await errorHandler.withRetry(
        eventuallySucceedOperation,
        { operation: 'retry_test' },
        { maxAttempts: 3, baseDelayMs: 10 }
      );

      const metrics = errorHandler.getMetrics();
      expect(metrics.successfulRetries).toBe(1);
    });
  });

  describe('Configuration Recommendations', () => {
    test('should recommend longer delays for rate limit errors', () => {
      // Simulate rate limit errors
      for (let i = 0; i < 15; i++) {
        errorHandler.handleError({
          status: 429,
          message: 'Rate limit exceeded'
        }, {
          operation: 'test_op',
          attempt: 1,
          timestamp: new Date()
        });
      }

      const recommendations = errorHandler.getRecommendedRetryConfig('test_op');
      expect(recommendations.baseDelayMs).toBe(5000);
      expect(recommendations.maxDelayMs).toBe(60000);
      expect(recommendations.backoffMultiplier).toBe(3);
    });

    test('should recommend longer timeout for timeout errors', () => {
      // Simulate timeout errors
      for (let i = 0; i < 10; i++) {
        errorHandler.handleError(new Error('Operation timed out'), {
          operation: 'test_op',
          attempt: 1,
          timestamp: new Date()
        });
      }

      const recommendations = errorHandler.getRecommendedRetryConfig('test_op');
      expect(recommendations.timeoutMs).toBe(60000);
    });
  });

  describe('Error Logging', () => {
    test('should log errors with proper details', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const error = new PhobsError(
        'Test error message',
        PhobsErrorType.NETWORK_ERROR,
        {
          operation: 'test_operation',
          endpoint: '/test/endpoint',
          attempt: 1,
          timestamp: new Date()
        },
        500,
        true
      );

      errorHandler.logError(error);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Phobs Error:',
        expect.objectContaining({
          type: PhobsErrorType.NETWORK_ERROR,
          message: 'Test error message',
          operation: 'test_operation',
          endpoint: '/test/endpoint',
          statusCode: 500,
          retryable: true
        })
      );

      consoleSpy.mockRestore();
    });
  });
});