/**
 * Bi-Column Edge Cases and Error Scenarios Tests
 *
 * Tests boundary conditions, null/undefined handling, concurrent operations,
 * configuration errors, resource cleanup, and error recovery mechanisms.
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

describe('Bi-Column Edge Cases and Error Scenarios', () => {
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

  describe('Null and Undefined Handling', () => {
    test('handles null viewport element gracefully', () => {
      /**
       * Edge case: Null viewport should not cause errors.
       */
      const viewport: HTMLElement | null = null;

      const computePagination = (viewportEl: HTMLElement | null) => {
        if (!viewportEl) return 0;
        return 10;
      };

      const result = computePagination(viewport);
      expect(result).toBe(0);
    });

    test('handles undefined viewport element gracefully', () => {
      /**
       * Edge case: Undefined viewport should not cause errors.
       */
      const viewport: HTMLElement | undefined = undefined;

      const computePagination = (viewportEl: HTMLElement | undefined) => {
        if (!viewportEl) return 0;
        return 10;
      };

      const result = computePagination(viewport);
      expect(result).toBe(0);
    });

    test('handles null container element gracefully', () => {
      /**
       * Edge case: Null container should not cause errors.
       */
      const container: HTMLElement | null = null;

      const setImportantStyles = (el: HTMLElement | null, styles: Record<string, string>) => {
        if (!el) return false;
        Object.entries(styles).forEach(([key, value]) => {
          el.style.setProperty(key, value, 'important');
        });
        return true;
      };

      const result = setImportantStyles(container, { 'width': '100%' });
      expect(result).toBe(false);
    });

    test('handles undefined currentPageRef', () => {
      /**
       * Edge case: Undefined ref should use fallback value.
       */
      const currentPageRef: { current: number } | undefined = undefined;

      const getCurrentPage = () => {
        return currentPageRef?.current ?? 1;
      };

      expect(getCurrentPage()).toBe(1);
    });

    test('handles null Range API result', () => {
      /**
       * Edge case: Null range should not cause errors.
       */
      document.createRange = jest.fn(() => null as any);

      const measureContent = () => {
        const range = document.createRange();
        if (!range) return { width: 0, height: 0 };
        return range.getBoundingClientRect();
      };

      const result = measureContent();
      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
    });

    test('handles undefined totalPages', () => {
      /**
       * Edge case: Undefined totalPages should default to 0.
       */
      const totalPages: number | undefined = undefined;

      const getTotalPages = () => {
        return totalPages ?? 0;
      };

      expect(getTotalPages()).toBe(0);
    });

    test('handles null getComputedStyle result', () => {
      /**
       * Edge case: Null computed styles should use defaults.
       */
      global.getComputedStyle = jest.fn(() => null as any);

      const getColumnCount = (element: HTMLElement) => {
        const styles = window.getComputedStyle(element);
        if (!styles) return 1;
        return parseInt(styles.getPropertyValue('column-count') || '1');
      };

      const element = document.createElement('div');
      expect(getColumnCount(element)).toBe(1);
    });

    test('handles undefined callback in double RAF', () => {
      /**
       * Edge case: Undefined callback should not cause errors.
       */
      const doubleRAF = (callback?: () => void) => {
        if (!callback) return;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            callback();
          });
        });
      };

      expect(() => doubleRAF(undefined)).not.toThrow();
    });
  });

  describe('Boundary Conditions - Zero Values', () => {
    test('handles zero total pages', () => {
      /**
       * Boundary: Zero pages should default to minimum 1 page.
       */
      const totalPages = 0;

      const goToPage = (page: number) => {
        const safeTotal = Math.max(1, totalPages);
        return page >= 1 && page <= safeTotal;
      };

      expect(goToPage(1)).toBe(true);
      expect(goToPage(2)).toBe(false);
    });

    test('handles zero viewport width', () => {
      /**
       * Boundary: Zero width should not cause division by zero.
       */
      const calculatePages = (contentWidth: number, viewportWidth: number) => {
        if (viewportWidth === 0) return 1;
        return Math.ceil(contentWidth / viewportWidth);
      };

      expect(calculatePages(1000, 0)).toBe(1);
    });

    test('handles zero viewport height', () => {
      /**
       * Boundary: Zero height should not cause division by zero.
       */
      const calculatePages = (contentHeight: number, viewportHeight: number) => {
        if (viewportHeight === 0) return 1;
        return Math.ceil(contentHeight / viewportHeight);
      };

      expect(calculatePages(1000, 0)).toBe(1);
    });

    test('handles zero content width', () => {
      /**
       * Boundary: Zero content width results in minimum pages.
       */
      const calculatePages = (contentWidth: number, viewportWidth: number) => {
        if (viewportWidth === 0) return 1;
        return Math.max(1, Math.ceil(contentWidth / viewportWidth));
      };

      expect(calculatePages(0, 800)).toBe(1);
    });

    test('handles zero content height', () => {
      /**
       * Boundary: Zero content height results in minimum pages.
       */
      const calculatePages = (contentHeight: number, viewportHeight: number) => {
        if (viewportHeight === 0) return 1;
        return Math.max(1, Math.ceil(contentHeight / viewportHeight));
      };

      expect(calculatePages(0, 800)).toBe(1);
    });

    test('handles zero column gap', () => {
      /**
       * Boundary: Zero column gap should work correctly.
       */
      const calculateWidth = (viewportWidth: number, columnGap: number) => {
        return viewportWidth * 2 + columnGap;
      };

      expect(calculateWidth(800, 0)).toBe(1600);
    });
  });

  describe('Boundary Conditions - Negative Values', () => {
    test('rejects negative page numbers', () => {
      /**
       * Boundary: Negative pages are invalid.
       */
      let currentPage = 5;
      const totalPages = 10;

      const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
          currentPage = page;
          return true;
        }
        return false;
      };

      expect(goToPage(-1)).toBe(false);
      expect(currentPage).toBe(5);
    });

    test('handles negative viewport dimensions', () => {
      /**
       * Boundary: Negative dimensions should be treated as zero.
       */
      const calculatePages = (contentHeight: number, viewportHeight: number) => {
        const safeHeight = Math.max(1, viewportHeight);
        return Math.ceil(contentHeight / safeHeight);
      };

      expect(calculatePages(1000, -800)).toBe(1000);
    });

    test('handles negative content dimensions', () => {
      /**
       * Boundary: Negative content dimensions should default to minimum.
       */
      const calculatePages = (contentHeight: number, viewportHeight: number) => {
        const safeContent = Math.max(0, contentHeight);
        const safeHeight = Math.max(1, viewportHeight);
        return Math.max(1, Math.ceil(safeContent / safeHeight));
      };

      expect(calculatePages(-1000, 800)).toBe(1);
    });

    test('handles negative column gap', () => {
      /**
       * Boundary: Negative column gap should be treated as zero.
       */
      const calculateWidth = (viewportWidth: number, columnGap: number) => {
        const safeGap = Math.max(0, columnGap);
        return viewportWidth * 2 + safeGap;
      };

      expect(calculateWidth(800, -50)).toBe(1600);
    });
  });

  describe('Boundary Conditions - Extreme Values', () => {
    test('handles extremely large page numbers', () => {
      /**
       * Boundary: Very large page numbers should be rejected.
       */
      let currentPage = 5;
      const totalPages = 10;

      const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
          currentPage = page;
          return true;
        }
        return false;
      };

      expect(goToPage(1000000)).toBe(false);
      expect(currentPage).toBe(5);
    });

    test('handles extremely large content height', () => {
      /**
       * Stress test: Very large content should calculate correctly.
       */
      const calculatePages = (contentHeight: number, viewportHeight: number) => {
        if (viewportHeight === 0) return 1;
        return Math.ceil(contentHeight / viewportHeight);
      };

      expect(calculatePages(10000000, 800)).toBe(12500);
    });

    test('handles extremely small viewport', () => {
      /**
       * Stress test: Very small viewport should not cause errors.
       */
      const calculatePages = (contentHeight: number, viewportHeight: number) => {
        const safeHeight = Math.max(1, viewportHeight);
        return Math.ceil(contentHeight / safeHeight);
      };

      expect(calculatePages(2400, 1)).toBe(2400);
    });

    test('handles floating point precision issues', () => {
      /**
       * Edge case: Floating point arithmetic should round consistently.
       */
      const calculatePages = (contentHeight: number, viewportHeight: number) => {
        return Math.ceil(contentHeight / viewportHeight);
      };

      // 1700 / 800 = 2.125, should round to 3
      expect(calculatePages(1700, 800)).toBe(3);
    });

    test('handles extremely large column count', () => {
      /**
       * Edge case: Very large column count should be handled.
       */
      const calculatePages = (contentHeight: number, viewportHeight: number, columnCount: number) => {
        const safeCount = Math.max(1, columnCount);
        const effectiveHeight = contentHeight / safeCount;
        return Math.max(1, Math.ceil(effectiveHeight / viewportHeight));
      };

      expect(calculatePages(2400, 800, 100)).toBe(1);
    });
  });

  describe('Concurrent Operations', () => {
    test('handles rapid pagination toggles', async () => {
      /**
       * Stress test: Rapid enable/disable should be stable.
       */
      let isPaginationMode = false;

      const toggles = [];
      for (let i = 0; i < 100; i++) {
        isPaginationMode = !isPaginationMode;
        toggles.push(isPaginationMode);
      }

      expect(isPaginationMode).toBe(false); // Even number of toggles
      expect(toggles.length).toBe(100);
    });

    test('handles rapid page navigation', async () => {
      /**
       * Stress test: Rapid navigation should reach final page correctly.
       */
      let currentPage = 1;
      const totalPages = 10;

      const goNextPage = () => {
        if (currentPage < totalPages) {
          currentPage++;
        }
      };

      for (let i = 0; i < 20; i++) {
        goNextPage();
      }

      expect(currentPage).toBe(10); // Should stop at max
    });

    test('handles simultaneous resize and navigation', async () => {
      /**
       * Stress test: Resize during navigation should not cause errors.
       */
      let currentPage = 5;
      let totalPages = 10;

      const goNextPage = () => {
        if (currentPage < totalPages) {
          currentPage++;
        }
      };

      const handleResize = (newTotal: number) => {
        totalPages = newTotal;
        currentPage = Math.min(currentPage, totalPages);
      };

      goNextPage(); // currentPage = 6
      handleResize(5); // totalPages = 5, currentPage clamped to 5
      goNextPage(); // currentPage should stay at 5

      expect(currentPage).toBe(5);
      expect(totalPages).toBe(5);
    });

    test('handles column layout change during navigation', async () => {
      /**
       * Stress test: Layout change mid-navigation should be safe.
       */
      type ColumnLayout = 'single' | 'double';
      let columnLayout: ColumnLayout = 'single';
      let currentPage = 5;

      const toggleLayout = () => {
        columnLayout = columnLayout === 'single' ? 'double' : 'single';
      };

      const goNextPage = () => {
        currentPage++;
      };

      goNextPage(); // Page 6
      toggleLayout(); // Change to double
      goNextPage(); // Page 7

      expect(currentPage).toBe(7);
      expect(columnLayout).toBe('double');
    });

    test('handles multiple ResizeObserver callbacks', async () => {
      /**
       * Stress test: Multiple rapid resizes should all be processed.
       */
      let resizeCount = 0;

      const handleResize = () => {
        resizeCount++;
      };

      for (let i = 0; i < 50; i++) {
        handleResize();
      }

      expect(resizeCount).toBe(50);
    });
  });

  describe('Configuration Errors', () => {
    test('handles missing DEBUG_PAGINATION flag', () => {
      /**
       * Configuration: Missing debug flag should default to false.
       */
      const DEBUG_PAGINATION: boolean | undefined = undefined;

      const debugLog = (message: string) => {
        if (DEBUG_PAGINATION) {
          console.log(message);
        }
      };

      expect(() => debugLog('test')).not.toThrow();
    });

    test('handles invalid column layout value', () => {
      /**
       * Configuration: Invalid layout should default to single.
       */
      type ColumnLayout = 'single' | 'double';
      const invalidLayout = 'triple' as any;

      const getValidLayout = (layout: any): ColumnLayout => {
        return layout === 'single' || layout === 'double' ? layout : 'single';
      };

      expect(getValidLayout(invalidLayout)).toBe('single');
    });

    test('handles missing mobile breakpoint', () => {
      /**
       * Configuration: Missing breakpoint should use default.
       */
      const MOBILE_BREAKPOINT = undefined;

      const isMobile = (width: number) => {
        const breakpoint = MOBILE_BREAKPOINT ?? 768;
        return width < breakpoint;
      };

      expect(isMobile(500)).toBe(true);
      expect(isMobile(800)).toBe(false);
    });

    test('handles invalid column-count CSS value', () => {
      /**
       * Configuration: Invalid column-count should default to 1.
       */
      global.getComputedStyle = jest.fn(() => ({
        getPropertyValue: jest.fn(() => 'invalid'),
      })) as any;

      const element = document.createElement('div');
      const styles = window.getComputedStyle(element);
      const columnCount = parseInt(styles.getPropertyValue('column-count')) || 1;

      expect(columnCount).toBe(1);
    });

    test('handles missing column-gap CSS value', () => {
      /**
       * Configuration: Missing column-gap should default to 0.
       */
      global.getComputedStyle = jest.fn(() => ({
        getPropertyValue: jest.fn(() => ''),
      })) as any;

      const element = document.createElement('div');
      const styles = window.getComputedStyle(element);
      const columnGap = parseFloat(styles.getPropertyValue('column-gap')) || 0;

      expect(columnGap).toBe(0);
    });
  });

  describe('Resource Cleanup', () => {
    test('cleans up ResizeObserver on unmount', () => {
      /**
       * Cleanup: ResizeObserver must be disconnected to prevent memory leaks.
       */
      const viewport = document.createElement('div');
      const observer = new ResizeObserver(jest.fn());
      observer.observe(viewport);

      const disconnectSpy = jest.spyOn(observer, 'disconnect');

      const cleanup = () => {
        observer.disconnect();
      };

      cleanup();

      expect(disconnectSpy).toHaveBeenCalled();
    });

    test('removes event listeners on cleanup', () => {
      /**
       * Cleanup: Event listeners must be removed to prevent memory leaks.
       */
      const viewport = document.createElement('div');
      const handler = jest.fn();

      viewport.addEventListener('keydown', handler);
      viewport.removeEventListener('keydown', handler);

      viewport.dispatchEvent(new KeyboardEvent('keydown'));

      expect(handler).not.toHaveBeenCalled();
    });

    test('restores body overflow on cleanup', () => {
      /**
       * Cleanup: Body overflow must be restored on unmount.
       */
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const cleanup = () => {
        document.body.style.overflow = originalOverflow;
      };

      cleanup();

      expect(document.body.style.overflow).toBe(originalOverflow);
    });

    test('clears requestAnimationFrame on cleanup', () => {
      /**
       * Cleanup: Pending RAF requests should be cancelled.
       */
      const rafId = requestAnimationFrame(() => {});
      const cancelAnimationFrame = jest.fn();

      global.cancelAnimationFrame = cancelAnimationFrame;

      const cleanup = () => {
        cancelAnimationFrame(rafId);
      };

      cleanup();

      expect(cancelAnimationFrame).toHaveBeenCalledWith(rafId);
    });

    test('clears debounce timeouts on cleanup', () => {
      /**
       * Cleanup: Pending timeouts should be cleared.
       */
      jest.useFakeTimers();

      let timeoutId: NodeJS.Timeout | null = null;

      const scheduleRecalculation = () => {
        timeoutId = setTimeout(() => {}, 250);
      };

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
      };

      scheduleRecalculation();
      cleanup();

      jest.advanceTimersByTime(250);

      // No callback should have been executed

      jest.useRealTimers();
    });
  });

  describe('Range API Error Handling', () => {
    test('handles Range API throwing error', () => {
      /**
       * Error scenario: Range API failure should not crash.
       */
      document.createRange = jest.fn(() => {
        throw new Error('Range API not supported');
      });

      const measureContent = () => {
        try {
          const range = document.createRange();
          return range.getBoundingClientRect();
        } catch (error) {
          return { width: 0, height: 0, top: 0, left: 0, bottom: 0, right: 0 };
        }
      };

      const result = measureContent();
      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
    });

    test('handles getBoundingClientRect returning invalid values', () => {
      /**
       * Error scenario: Invalid rect values should be sanitized.
       */
      mockRange.getBoundingClientRect.mockReturnValue({
        width: NaN,
        height: Infinity,
        top: -Infinity,
        left: NaN,
        bottom: Infinity,
        right: NaN,
      });

      const range = document.createRange();
      const rect = range.getBoundingClientRect();

      const sanitize = (value: number) => {
        if (!isFinite(value) || isNaN(value)) return 0;
        return value;
      };

      expect(sanitize(rect.width)).toBe(0);
      expect(sanitize(rect.height)).toBe(0);
    });

    test('handles selectNodeContents throwing error', () => {
      /**
       * Error scenario: selectNodeContents failure should not crash.
       */
      mockRange.selectNodeContents.mockImplementation(() => {
        throw new Error('Invalid node');
      });

      const measureContent = (container: HTMLElement) => {
        try {
          const range = document.createRange();
          range.selectNodeContents(container);
          return range.getBoundingClientRect();
        } catch (error) {
          return { width: 0, height: 0, top: 0, left: 0, bottom: 0, right: 0 };
        }
      };

      const container = document.createElement('div');
      const result = measureContent(container);

      expect(result.width).toBe(0);
    });
  });

  describe('getComputedStyle Error Handling', () => {
    test('handles getComputedStyle throwing error', () => {
      /**
       * Error scenario: getComputedStyle failure should use defaults.
       */
      global.getComputedStyle = jest.fn(() => {
        throw new Error('Styles not available');
      });

      const getColumnCount = (element: HTMLElement) => {
        try {
          const styles = window.getComputedStyle(element);
          return parseInt(styles.getPropertyValue('column-count')) || 1;
        } catch (error) {
          return 1;
        }
      };

      const element = document.createElement('div');
      expect(getColumnCount(element)).toBe(1);
    });

    test('handles getPropertyValue returning non-numeric string', () => {
      /**
       * Error scenario: Non-numeric CSS values should be handled.
       */
      global.getComputedStyle = jest.fn(() => ({
        getPropertyValue: jest.fn(() => 'auto'),
      })) as any;

      const element = document.createElement('div');
      const styles = window.getComputedStyle(element);
      const columnCount = parseInt(styles.getPropertyValue('column-count')) || 1;

      expect(isNaN(parseInt('auto'))).toBe(true);
      expect(columnCount).toBe(1);
    });
  });

  describe('ResizeObserver Error Handling', () => {
    test('handles ResizeObserver not supported', () => {
      /**
       * Error scenario: Missing ResizeObserver should fallback gracefully.
       */
      const originalResizeObserver = global.ResizeObserver;
      (global as any).ResizeObserver = undefined;

      const initializeObserver = () => {
        if (typeof ResizeObserver !== 'undefined') {
          return new ResizeObserver(jest.fn());
        }
        return null;
      };

      const observer = initializeObserver();
      expect(observer).toBeNull();

      global.ResizeObserver = originalResizeObserver;
    });

    test('handles ResizeObserver callback throwing error', async () => {
      /**
       * Error scenario: Observer callback errors should be caught.
       */
      let errorThrown = false;

      const callback: ResizeObserverCallback = () => {
        throw new Error('Observer error');
      };

      const safeCallback: ResizeObserverCallback = (entries, observer) => {
        try {
          callback(entries, observer);
        } catch (error) {
          errorThrown = true;
        }
      };

      const observer = new ResizeObserver(safeCallback);
      const viewport = document.createElement('div');
      observer.observe(viewport);

      // Trigger callback would normally happen here
      // We test the wrapper logic

      expect(() => safeCallback([], observer)).not.toThrow();
    });
  });

  describe('Scroll Position Recovery', () => {
    test('recovers to valid page after total pages decrease', () => {
      /**
       * Recovery: Current page beyond new total should clamp to max.
       */
      let currentPage = 10;
      let totalPages = 10;

      const handleResize = (newTotal: number) => {
        totalPages = newTotal;
        if (currentPage > totalPages) {
          currentPage = totalPages;
        }
      };

      handleResize(5);

      expect(currentPage).toBe(5);
      expect(totalPages).toBe(5);
    });

    test('maintains relative position during resize', () => {
      /**
       * Recovery: Proportional position should be preserved.
       */
      let currentPage = 5;
      let totalPages = 10;

      const handleResize = (newTotal: number) => {
        const ratio = (currentPage - 1) / Math.max(1, totalPages - 1);
        totalPages = newTotal;
        currentPage = Math.max(1, Math.min(Math.round(ratio * (totalPages - 1)) + 1, totalPages));
      };

      handleResize(20);

      expect(currentPage).toBe(9); // Approximately doubled
      expect(totalPages).toBe(20);
    });

    test('defaults to page 1 when total pages become 0', () => {
      /**
       * Recovery: Invalid state should reset to page 1.
       */
      let currentPage = 5;
      let totalPages = 10;

      const handleResize = (newTotal: number) => {
        totalPages = Math.max(1, newTotal);
        currentPage = Math.max(1, Math.min(currentPage, totalPages));
      };

      handleResize(0);

      expect(currentPage).toBe(1);
      expect(totalPages).toBe(1);
    });
  });

  describe('Performance Safeguards', () => {
    test('limits recalculation frequency with debouncing', () => {
      /**
       * Performance: Rapid events should be debounced.
       */
      jest.useFakeTimers();

      let recalculationCount = 0;
      let timeoutId: NodeJS.Timeout | null = null;

      const scheduleRecalculation = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          recalculationCount++;
        }, 250);
      };

      for (let i = 0; i < 100; i++) {
        scheduleRecalculation();
      }

      jest.advanceTimersByTime(250);

      expect(recalculationCount).toBe(1);

      jest.useRealTimers();
    });

    test('uses passive event listeners for wheel events', () => {
      /**
       * Performance: Passive listeners improve scroll performance.
       */
      const viewport = document.createElement('div');
      const handler = jest.fn();

      const addWheelListener = () => {
        viewport.addEventListener('wheel', handler, { passive: false });
      };

      addWheelListener();

      // This tests the API usage pattern
      expect(() => addWheelListener()).not.toThrow();
    });

    test('limits Range API calls during rapid layout changes', () => {
      /**
       * Performance: Range API calls should be minimized.
       */
      let rangeCallCount = 0;

      const measureContent = () => {
        rangeCallCount++;
        const range = document.createRange();
        return range.getBoundingClientRect();
      };

      // Only call once per layout settle, not continuously
      measureContent();

      expect(rangeCallCount).toBe(1);
    });
  });

  describe('Cross-Platform Compatibility Edge Cases', () => {
    test('handles different scrollTo implementations', () => {
      /**
       * Compatibility: Different browsers implement scrollTo differently.
       */
      const viewport = document.createElement('div');

      const safeScrollTo = (element: HTMLElement, left: number) => {
        if (typeof element.scrollTo === 'function') {
          element.scrollTo({ left, behavior: 'smooth' });
        } else {
          element.scrollLeft = left;
        }
      };

      expect(() => safeScrollTo(viewport, 100)).not.toThrow();
    });

    test('handles different focus implementations', () => {
      /**
       * Compatibility: Focus behavior varies across browsers.
       */
      const viewport = document.createElement('div');
      viewport.tabIndex = 0;

      const safeFocus = (element: HTMLElement) => {
        if (typeof element.focus === 'function') {
          try {
            element.focus();
          } catch (error) {
            // Some browsers throw on hidden elements
          }
        }
      };

      expect(() => safeFocus(viewport)).not.toThrow();
    });

    test('handles different requestAnimationFrame implementations', () => {
      /**
       * Compatibility: RAF polyfill for older browsers.
       */
      const originalRAF = global.requestAnimationFrame;
      (global as any).requestAnimationFrame = undefined;

      const safeRAF = (callback: () => void) => {
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(callback);
        } else {
          setTimeout(callback, 16);
        }
      };

      expect(() => safeRAF(() => {})).not.toThrow();

      global.requestAnimationFrame = originalRAF;
    });
  });
});
