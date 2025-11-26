/**
 * @fileOverview Jest Setup Configuration (SQLITE-025: Firebase removed)
 *
 * This file runs before each test file and sets up the testing environment.
 * It configures global test utilities, mocks, and testing library extensions.
 *
 * Key configurations:
 * - Testing Library Jest DOM matchers for enhanced assertions
 * - Global polyfills for Node.js environment
 * - Console.error suppression for cleaner test output
 * - Mock implementations for external dependencies (Next.js, Radix UI)
 */

// Import Testing Library Jest DOM matchers
require('@testing-library/jest-dom');

// Web Standard APIs polyfills (TextEncoder, fetch, Request, Response, Streams, etc.)
// are now loaded via jest.polyfills.js (setupFiles in jest.config.js).
//
// This approach ensures:
// - Correct initialization order (TextEncoder before undici)
// - Compatibility with jest-environment-jsdom and Node.js 22
// - Prevention of globals being cleared by jsdom
//
// See jest.polyfills.js for implementation details.

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// Mock Radix UI Toast primitives to simple components for tests
jest.mock('@radix-ui/react-toast', () => {
  const React = require('react');
  const Dummy = React.forwardRef((props, ref) => React.createElement('div', { ref, ...props }));
  Dummy.displayName = 'Dummy';
  return {
    Provider: ({ children }) => React.createElement('div', { 'data-testid': 'toast-provider' }, children),
    Viewport: Dummy,
    Root: Dummy,
    Title: Dummy,
    Description: Dummy,
    Action: Dummy,
    Close: Dummy,
  };
});

// Mock Radix Tabs primitives specifically (some components refer to displayName)
jest.mock('@radix-ui/react-tabs', () => {
  const React = require('react');
  const mk = (name) => {
    const C = React.forwardRef((props, ref) => React.createElement('div', { ref, ...props }));
    C.displayName = name;
    return C;
  };
  return {
    Root: mk('TabsRoot'),
    List: mk('TabsList'),
    Trigger: mk('TabsTrigger'),
    Content: mk('TabsContent'),
  };
});

// Mock console.error to reduce noise in test output
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    // Allow specific error messages that we want to see in tests
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning') ||
       args[0].includes('Error') ||
       args[0].includes('Failed'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Increase timeout for async operations (especially for daily task tests)
jest.setTimeout(60000); // 60 seconds for complex test suites

// Global test utilities (SQLite-based)
global.testUtils = {
  // Create mock user object for authentication tests (NextAuth-based)
  createMockUser: (overrides = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    image: null,
    emailVerified: true,
    ...overrides,
  }),

  // Create mock timestamp (compatible with SQLite timestamp format)
  createMockTimestamp: (date = new Date()) => ({
    toDate: () => date,
    toMillis: () => date.getTime(),
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
    isEqual: (other) => other && other.seconds === Math.floor(date.getTime() / 1000),
  }),
};
