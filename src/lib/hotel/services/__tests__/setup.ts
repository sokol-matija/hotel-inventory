// Test setup file for Phobs integration tests
// Configures global test environment and mocks

// Mock localStorage for configuration service tests
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock fetch for API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Setup test database/storage mocks
export const testMocks = {
  localStorage: mockLocalStorage,
  fetch: mockFetch as jest.MockedFunction<typeof fetch>,
  console: global.console,
  
  // Reset all mocks between tests
  resetAll: () => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
    mockLocalStorage.clear.mockClear();
  },
  
  // Mock successful API responses
  mockSuccessfulApiCall: (data: any) => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data }),
      text: async () => JSON.stringify({ success: true, data }),
    } as Response);
  },
  
  // Mock failed API responses
  mockFailedApiCall: (status: number, error: string) => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status,
      json: async () => ({ success: false, error }),
      text: async () => JSON.stringify({ success: false, error }),
    } as Response);
  },
  
  // Mock network error
  mockNetworkError: () => {
    mockFetch.mockRejectedValueOnce(
      new Error('Network error: Connection refused')
    );
  },
  
  // Mock rate limit error
  mockRateLimitError: () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ success: false, error: 'Rate limit exceeded' }),
      text: async () => JSON.stringify({ success: false, error: 'Rate limit exceeded' }),
    } as Response);
  },
};

// Global test utilities
export const testUtils = {
  // Wait for promises to resolve
  flushPromises: () => new Promise(resolve => setTimeout(resolve, 0)),
  
  // Wait for specific amount of time
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Generate test IDs
  generateTestId: () => `test_${Date.now()}_${Math.random().toString(36).substring(2)}`,
  
  // Create test dates
  createTestDate: (daysFromNow: number = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date;
  },
  
  // Format currency for tests
  formatTestCurrency: (amount: number) => new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount),
};

// Setup global test constants
export const testConstants = {
  TEST_HOTEL_ID: 'test_hotel_123',
  TEST_API_KEY: 'test_api_key_456',
  TEST_API_SECRET: 'test_api_secret_789',
  TEST_WEBHOOK_SECRET: 'test_webhook_secret_abc',
  TEST_BASE_URL: 'https://api.phobs.test/v1',
  
  MOCK_CHANNELS: [
    'booking.com',
    'expedia', 
    'airbnb',
    'agoda',
    'hotels.com'
  ] as const,
  
  MOCK_OPERATIONS: [
    'authenticate',
    'sync_reservations',
    'sync_inventory',
    'process_webhook',
    'test_connection'
  ] as const,
};

// Clean up after each test
afterEach(() => {
  testMocks.resetAll();
  jest.clearAllTimers();
});

// Clean up after all tests
afterAll(() => {
  // Restore original console
  global.console = originalConsole;
});