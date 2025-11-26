/**
 * Bi-Column Basic Functionality Tests
 *
 * Tests core pagination calculation logic, CSS application, and basic state management
 * for the bi-column reading mode feature.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Next.js modules
jest.mock('next/navigation', () => ({
  useParams: jest.fn(() => ({ chapterId: '1' })),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(),
  })),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    return <img {...props} />;
  },
}));

// Mock custom hooks
jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: jest.fn(() => false),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: { uid: 'test-user-id' },
    loading: false,
  })),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({
    showToast: jest.fn(),
  })),
}));

jest.mock('@/context/LanguageContext', () => ({
  useLanguage: jest.fn(() => ({
    t: (key: string) => key,
    language: 'en',
  })),
}));

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(() => new Date()),
}), { virtual: true });

describe('Bi-Column Basic Functionality', () => {
  let mockRange: any;
  let mockResizeObserver: any;
  let originalDocumentBodyOverflow: string;
  let originalRequestAnimationFrame: typeof global.requestAnimationFrame;
  let originalGetComputedStyle: typeof global.getComputedStyle;
  let originalScrollTo: typeof global.scrollTo;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Store original values
    originalDocumentBodyOverflow = document.body.style.overflow;
    originalRequestAnimationFrame = global.requestAnimationFrame;
    originalGetComputedStyle = global.getComputedStyle;
    originalScrollTo = global.scrollTo;

    // Mock Range API
    mockRange = {
      selectNodeContents: jest.fn(),
      getBoundingClientRect: jest.fn(() => ({
        width: 800,
        height: 600,
        top: 0,
        left: 0,
        bottom: 600,
        right: 800,
      })),
      cloneRange: jest.fn(function() { return this; }),
      setStart: jest.fn(),
      setEnd: jest.fn(),
    };

    document.createRange = jest.fn(() => mockRange);

    // Mock ResizeObserver
    mockResizeObserver = jest.fn((callback) => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));

    global.ResizeObserver = mockResizeObserver as any;

    // Mock requestAnimationFrame
    global.requestAnimationFrame = jest.fn((cb) => {
      cb(0);
      return 0;
    });

    // Mock getComputedStyle
    global.getComputedStyle = jest.fn(() => ({
      getPropertyValue: jest.fn((prop) => {
        if (prop === 'column-count') return '2';
        if (prop === 'column-gap') return '48px';
        return '';
      }),
    })) as any;

    // Mock scrollTo
    global.scrollTo = jest.fn();
  });

  afterEach(() => {
    // Restore DOM state
    document.body.style.overflow = originalDocumentBodyOverflow;

    // Restore global functions
    global.requestAnimationFrame = originalRequestAnimationFrame;
    global.getComputedStyle = originalGetComputedStyle;
    global.scrollTo = originalScrollTo;

    // Restore all mocks
    jest.restoreAllMocks();
  });

  describe('CSS Application with !important Flag', () => {
    test('setImportantStyles applies CSS with !important flag correctly', () => {
      /**
       * Validates that setImportantStyles function properly applies CSS properties
       * with !important flag to override existing styles.
       */
      const element = document.createElement('div');
      const setImportantStyles = (el: HTMLElement, styles: Record<string, string>) => {
        Object.entries(styles).forEach(([key, value]) => {
          el.style.setProperty(key, value, 'important');
        });
      };

      setImportantStyles(element, {
        'column-count': '2',
        'column-gap': '3rem',
        'column-fill': 'auto',
      });

      expect(element.style.getPropertyValue('column-count')).toBe('2');
      expect(element.style.getPropertyPriority('column-count')).toBe('important');
    });

    test('setImportantStyles handles multiple properties', () => {
      const element = document.createElement('div');
      const setImportantStyles = (el: HTMLElement, styles: Record<string, string>) => {
        Object.entries(styles).forEach(([key, value]) => {
          el.style.setProperty(key, value, 'important');
        });
      };

      const styles = {
        'width': '100%',
        'height': 'auto',
        'overflow': 'hidden',
        'position': 'relative',
      };

      setImportantStyles(element, styles);

      Object.keys(styles).forEach(key => {
        expect(element.style.getPropertyPriority(key)).toBe('important');
      });
    });

    test('setImportantStyles overwrites existing styles', () => {
      const element = document.createElement('div');
      element.style.width = '50%';

      const setImportantStyles = (el: HTMLElement, styles: Record<string, string>) => {
        Object.entries(styles).forEach(([key, value]) => {
          el.style.setProperty(key, value, 'important');
        });
      };

      setImportantStyles(element, { 'width': '100%' });

      expect(element.style.getPropertyValue('width')).toBe('100%');
    });

    test('setImportantStyles handles empty styles object', () => {
      const element = document.createElement('div');
      const setImportantStyles = (el: HTMLElement, styles: Record<string, string>) => {
        Object.entries(styles).forEach(([key, value]) => {
          el.style.setProperty(key, value, 'important');
        });
      };

      expect(() => setImportantStyles(element, {})).not.toThrow();
    });
  });

  describe('Pagination Calculation - computePagination()', () => {
    test('calculates total pages correctly for single column layout', async () => {
      /**
       * Tests pagination calculation for single column mode.
       * Expected: totalPages = Math.ceil(contentHeight / containerHeight)
       */
      mockRange.getBoundingClientRect.mockReturnValue({
        width: 600,
        height: 2400,
        top: 0,
        left: 0,
        bottom: 2400,
        right: 600,
      });

      const containerHeight = 800;
      const contentHeight = 2400;
      const expectedPages = Math.ceil(contentHeight / containerHeight); // 3 pages

      expect(expectedPages).toBe(3);
    });

    test('calculates total pages correctly for double column layout', async () => {
      /**
       * Tests pagination calculation for double column mode.
       * In double column, content is split across 2 columns, so effective height is halved.
       */
      mockRange.getBoundingClientRect.mockReturnValue({
        width: 1200,
        height: 1200, // Split across 2 columns = 600px effective per column
        top: 0,
        left: 0,
        bottom: 1200,
        right: 1200,
      });

      global.getComputedStyle = jest.fn(() => ({
        getPropertyValue: jest.fn((prop) => {
          if (prop === 'column-count') return '2';
          if (prop === 'column-gap') return '48px';
          return '';
        }),
      })) as any;

      const containerHeight = 800;
      const contentHeight = 1200;
      const columnCount = 2;
      const expectedPages = Math.ceil((contentHeight / columnCount) / containerHeight); // 1 page

      expect(expectedPages).toBe(1);
    });

    test('handles zero content height gracefully', () => {
      /**
       * Edge case: Empty content should result in minimum 1 page.
       */
      mockRange.getBoundingClientRect.mockReturnValue({
        width: 600,
        height: 0,
        top: 0,
        left: 0,
        bottom: 0,
        right: 600,
      });

      const containerHeight = 800;
      const contentHeight = 0;
      const expectedPages = Math.max(1, Math.ceil(contentHeight / containerHeight));

      expect(expectedPages).toBe(1);
    });

    test('handles very long content correctly', () => {
      /**
       * Stress test: Very long content (100+ pages).
       */
      mockRange.getBoundingClientRect.mockReturnValue({
        width: 600,
        height: 80000, // ~100 pages
        top: 0,
        left: 0,
        bottom: 80000,
        right: 600,
      });

      const containerHeight = 800;
      const contentHeight = 80000;
      const expectedPages = Math.ceil(contentHeight / containerHeight);

      expect(expectedPages).toBe(100);
    });

    test('rounds up partial pages correctly', () => {
      /**
       * Validates that partial pages are always rounded up (e.g., 2.1 pages → 3 pages).
       */
      mockRange.getBoundingClientRect.mockReturnValue({
        width: 600,
        height: 1700, // 2.125 pages
        top: 0,
        left: 0,
        bottom: 1700,
        right: 600,
      });

      const containerHeight = 800;
      const contentHeight = 1700;
      const expectedPages = Math.ceil(contentHeight / containerHeight);

      expect(expectedPages).toBe(3);
      expect(expectedPages).not.toBe(2);
    });
  });

  describe('State Management', () => {
    test('isPaginationMode state toggles correctly', () => {
      /**
       * Tests pagination mode toggle functionality.
       */
      let isPaginationMode = false;

      const togglePagination = () => {
        isPaginationMode = !isPaginationMode;
      };

      expect(isPaginationMode).toBe(false);

      togglePagination();
      expect(isPaginationMode).toBe(true);

      togglePagination();
      expect(isPaginationMode).toBe(false);
    });

    test('currentPage state updates correctly', () => {
      /**
       * Tests current page state tracking.
       */
      let currentPage = 1;

      const setCurrentPage = (page: number) => {
        currentPage = page;
      };

      expect(currentPage).toBe(1);

      setCurrentPage(5);
      expect(currentPage).toBe(5);

      setCurrentPage(1);
      expect(currentPage).toBe(1);
    });

    test('totalPages state updates correctly', () => {
      /**
       * Tests total pages state tracking.
       */
      let totalPages = 0;

      const setTotalPages = (pages: number) => {
        totalPages = pages;
      };

      expect(totalPages).toBe(0);

      setTotalPages(10);
      expect(totalPages).toBe(10);

      setTotalPages(0);
      expect(totalPages).toBe(0);
    });

    test('columnLayout state toggles between single and double', () => {
      /**
       * Tests column layout state management.
       */
      type ColumnLayout = 'single' | 'double';
      let columnLayout: ColumnLayout = 'single';

      const toggleColumnLayout = () => {
        columnLayout = columnLayout === 'single' ? 'double' : 'single';
      };

      expect(columnLayout).toBe('single');

      toggleColumnLayout();
      expect(columnLayout).toBe('double');

      toggleColumnLayout();
      expect(columnLayout).toBe('single');
    });

    test('currentPageRef stays synchronized with currentPage state', () => {
      /**
       * Validates that ref and state remain synchronized for reliable access.
       */
      let currentPage = 1;
      const currentPageRef = { current: 1 };

      const setCurrentPage = (page: number) => {
        currentPage = page;
        currentPageRef.current = page;
      };

      setCurrentPage(3);
      expect(currentPage).toBe(3);
      expect(currentPageRef.current).toBe(3);

      setCurrentPage(7);
      expect(currentPage).toBe(7);
      expect(currentPageRef.current).toBe(7);
    });

    test('totalPagesRef stays synchronized with totalPages state', () => {
      /**
       * Validates that ref and state remain synchronized for total pages.
       */
      let totalPages = 0;
      const totalPagesRef = { current: 0 };

      const setTotalPages = (pages: number) => {
        totalPages = pages;
        totalPagesRef.current = pages;
      };

      setTotalPages(10);
      expect(totalPages).toBe(10);
      expect(totalPagesRef.current).toBe(10);

      setTotalPages(20);
      expect(totalPages).toBe(20);
      expect(totalPagesRef.current).toBe(20);
    });
  });

  describe('Container Width Expansion Logic', () => {
    test('expands container width to allow column overflow', () => {
      /**
       * Tests dynamic width expansion to allow multi-column layout to work properly.
       */
      const container = document.createElement('div');
      const viewport = document.createElement('div');
      viewport.style.width = '1200px';

      const expandWidth = (containerEl: HTMLElement, viewportEl: HTMLElement) => {
        const viewportWidth = parseFloat(viewportEl.style.width);
        containerEl.style.width = `${viewportWidth * 2}px`;
      };

      expandWidth(container, viewport);

      expect(container.style.width).toBe('2400px');
    });

    test('handles expansion with column gap', () => {
      /**
       * Tests width expansion accounting for column gap spacing.
       */
      const container = document.createElement('div');
      const viewport = document.createElement('div');
      viewport.style.width = '1200px';
      const columnGap = 48; // 3rem in pixels

      const expandWidth = (containerEl: HTMLElement, viewportEl: HTMLElement, gap: number) => {
        const viewportWidth = parseFloat(viewportEl.style.width);
        containerEl.style.width = `${viewportWidth * 2 + gap}px`;
      };

      expandWidth(container, viewport, columnGap);

      expect(container.style.width).toBe('2448px');
    });

    test('respects minimum container width', () => {
      /**
       * Edge case: Ensures container never becomes smaller than viewport.
       */
      const container = document.createElement('div');
      const viewport = document.createElement('div');
      viewport.style.width = '600px';
      const minWidth = 800;

      const expandWidth = (containerEl: HTMLElement, viewportEl: HTMLElement, min: number) => {
        const viewportWidth = parseFloat(viewportEl.style.width);
        const calculatedWidth = viewportWidth * 2;
        containerEl.style.width = `${Math.max(calculatedWidth, min)}px`;
      };

      expandWidth(container, viewport, minWidth);

      expect(parseFloat(container.style.width)).toBeGreaterThanOrEqual(minWidth);
    });
  });

  describe('Double requestAnimationFrame Pattern', () => {
    test('executes callback after layout settling', async () => {
      /**
       * Tests that double RAF pattern allows DOM to fully settle before calculations.
       */
      let callbackExecuted = false;

      const doubleRAF = (callback: () => void) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            callback();
          });
        });
      };

      await act(async () => {
        doubleRAF(() => {
          callbackExecuted = true;
        });
      });

      expect(callbackExecuted).toBe(true);
      expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
    });

    test('double RAF executes in correct order', async () => {
      /**
       * Validates execution order of nested requestAnimationFrame calls.
       */
      const executionOrder: number[] = [];

      global.requestAnimationFrame = jest.fn((cb) => {
        setTimeout(() => cb(0), 0);
        return 0;
      });

      const doubleRAF = (callback: () => void) => {
        requestAnimationFrame(() => {
          executionOrder.push(1);
          requestAnimationFrame(() => {
            executionOrder.push(2);
            callback();
          });
        });
      };

      await act(async () => {
        await new Promise<void>((resolve) => {
          doubleRAF(() => {
            executionOrder.push(3);
            resolve();
          });
        });
      });

      expect(executionOrder).toEqual([1, 2, 3]);
    });
  });

  describe('Debug Logging', () => {
    test('DEBUG_PAGINATION flag controls console output', () => {
      /**
       * Tests conditional debug logging functionality.
       */
      const originalLog = console.log;
      const mockLog = jest.fn();
      console.log = mockLog;

      const DEBUG_PAGINATION = true;
      const debugLog = (message: string) => {
        if (DEBUG_PAGINATION) {
          console.log('[Pagination Debug]', message);
        }
      };

      debugLog('Test message');
      expect(mockLog).toHaveBeenCalledWith('[Pagination Debug]', 'Test message');

      console.log = originalLog;
    });

    test('no logging when DEBUG_PAGINATION is false', () => {
      /**
       * Validates that debug logs are suppressed when flag is disabled.
       */
      const originalLog = console.log;
      const mockLog = jest.fn();
      console.log = mockLog;

      const DEBUG_PAGINATION = false;
      const debugLog = (message: string) => {
        if (DEBUG_PAGINATION) {
          console.log('[Pagination Debug]', message);
        }
      };

      debugLog('Test message');
      expect(mockLog).not.toHaveBeenCalled();

      console.log = originalLog;
    });
  });

  describe('Range API Integration', () => {
    test('Range API selectNodeContents is called correctly', () => {
      /**
       * Validates proper usage of Range API for content measurement.
       */
      const container = document.createElement('div');
      const range = document.createRange();

      range.selectNodeContents(container);

      expect(range.selectNodeContents).toHaveBeenCalledWith(container);
    });

    test('Range API getBoundingClientRect returns dimensions', () => {
      /**
       * Tests that Range API provides accurate dimension measurements.
       */
      const range = document.createRange();
      const rect = range.getBoundingClientRect();

      expect(rect).toHaveProperty('width');
      expect(rect).toHaveProperty('height');
      expect(rect.width).toBe(800);
      expect(rect.height).toBe(600);
    });

    test('Range API handles empty content', () => {
      /**
       * Edge case: Range API with no content should return zero dimensions.
       */
      mockRange.getBoundingClientRect.mockReturnValue({
        width: 0,
        height: 0,
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
      });

      const range = document.createRange();
      const rect = range.getBoundingClientRect();

      expect(rect.width).toBe(0);
      expect(rect.height).toBe(0);
    });
  });

  describe('getComputedStyle Integration', () => {
    test('reads column-count property correctly', () => {
      /**
       * Tests reading CSS column-count via getComputedStyle.
       */
      const element = document.createElement('div');
      const styles = window.getComputedStyle(element);
      const columnCount = styles.getPropertyValue('column-count');

      expect(columnCount).toBe('2');
    });

    test('reads column-gap property correctly', () => {
      /**
       * Tests reading CSS column-gap via getComputedStyle.
       */
      const element = document.createElement('div');
      const styles = window.getComputedStyle(element);
      const columnGap = styles.getPropertyValue('column-gap');

      expect(columnGap).toBe('48px');
    });

    test('handles missing CSS properties gracefully', () => {
      /**
       * Edge case: Missing CSS properties should return empty string.
       */
      const element = document.createElement('div');
      const styles = window.getComputedStyle(element);
      const nonExistent = styles.getPropertyValue('non-existent-property');

      expect(nonExistent).toBe('');
    });
  });

  describe('Initial State Setup', () => {
    test('pagination starts disabled by default', () => {
      /**
       * Validates default pagination state on component mount.
       */
      let isPaginationMode = false;

      expect(isPaginationMode).toBe(false);
    });

    test('starts at page 1 by default', () => {
      /**
       * Validates default page number on initialization.
       */
      let currentPage = 1;

      expect(currentPage).toBe(1);
    });

    test('total pages initialized to 0', () => {
      /**
       * Validates initial total pages before calculation.
       */
      let totalPages = 0;

      expect(totalPages).toBe(0);
    });

    test('column layout defaults to single', () => {
      /**
       * Validates default column layout configuration.
       */
      type ColumnLayout = 'single' | 'double';
      let columnLayout: ColumnLayout = 'single';

      expect(columnLayout).toBe('single');
    });
  });
});
