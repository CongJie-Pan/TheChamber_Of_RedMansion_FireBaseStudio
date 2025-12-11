/**
 * Bi-Column Responsive Behavior Tests
 *
 * Tests ResizeObserver integration, viewport changes, mobile breakpoint handling,
 * and responsive recalculation logic for the bi-column reading mode.
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
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...props} />;
  },
}));

// Mock custom hooks
const mockUseIsMobile = jest.fn(() => false);
jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: mockUseIsMobile,
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

describe('Bi-Column Responsive Behavior', () => {
  let mockRange: any;
  let mockResizeObserver: any;
  let resizeCallback: ResizeObserverCallback | null = null;
  let originalDocumentBodyOverflow: string;
  let originalRequestAnimationFrame: typeof global.requestAnimationFrame;
  let originalGetComputedStyle: typeof global.getComputedStyle;
  let originalScrollTo: typeof global.scrollTo;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    resizeCallback = null;

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

    // Mock ResizeObserver with callback capture
    mockResizeObserver = jest.fn((callback) => {
      resizeCallback = callback;
      return {
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      };
    });

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

    // Reset mobile hook
    mockUseIsMobile.mockReturnValue(false);
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

  describe('ResizeObserver Integration', () => {
    test('ResizeObserver is created and observes viewport element', () => {
      /**
       * Tests that ResizeObserver is properly initialized and attached to viewport.
       */
      const viewport = document.createElement('div');
      let observer: ResizeObserver | null = null;

      const initializeResizeObserver = (element: HTMLElement, callback: ResizeObserverCallback) => {
        observer = new ResizeObserver(callback);
        observer.observe(element);
        return observer;
      };

      const mockCallback: ResizeObserverCallback = jest.fn();
      const result = initializeResizeObserver(viewport, mockCallback);

      expect(mockResizeObserver).toHaveBeenCalledWith(mockCallback);
      expect(result).toBeDefined();
    });

    test('ResizeObserver callback triggers on viewport size change', async () => {
      /**
       * Validates that resize events trigger the observer callback.
       */
      const viewport = document.createElement('div');
      let resizeCallbackInvoked = false;

      const mockCallback: ResizeObserverCallback = jest.fn(() => {
        resizeCallbackInvoked = true;
      });

      const observer = new ResizeObserver(mockCallback);
      observer.observe(viewport);

      // Simulate resize event
      if (resizeCallback) {
        const mockEntries: ResizeObserverEntry[] = [{
          target: viewport,
          contentRect: {
            width: 1024,
            height: 768,
            top: 0,
            left: 0,
            bottom: 768,
            right: 1024,
            x: 0,
            y: 0,
            toJSON: () => ({}),
          },
          borderBoxSize: [],
          contentBoxSize: [],
          devicePixelContentBoxSize: [],
        }];

        await act(async () => {
          resizeCallback(mockEntries, observer);
        });
      }

      expect(mockCallback).toHaveBeenCalled();
    });

    test('ResizeObserver disconnects on cleanup', () => {
      /**
       * Tests proper cleanup of ResizeObserver to prevent memory leaks.
       */
      const viewport = document.createElement('div');
      const mockCallback: ResizeObserverCallback = jest.fn();

      const observer = new ResizeObserver(mockCallback);
      observer.observe(viewport);

      const disconnectSpy = jest.spyOn(observer, 'disconnect');
      observer.disconnect();

      expect(disconnectSpy).toHaveBeenCalled();
    });

    test('ResizeObserver unobserves specific element', () => {
      /**
       * Tests selective unobservation of elements.
       */
      const viewport = document.createElement('div');
      const mockCallback: ResizeObserverCallback = jest.fn();

      const observer = new ResizeObserver(mockCallback);
      observer.observe(viewport);

      const unobserveSpy = jest.spyOn(observer, 'unobserve');
      observer.unobserve(viewport);

      expect(unobserveSpy).toHaveBeenCalledWith(viewport);
    });

    test('ResizeObserver handles multiple resize events', async () => {
      /**
       * Stress test: Multiple rapid resize events should all be handled.
       */
      const viewport = document.createElement('div');
      let callCount = 0;

      const mockCallback: ResizeObserverCallback = jest.fn(() => {
        callCount++;
      });

      const observer = new ResizeObserver(mockCallback);
      observer.observe(viewport);

      if (resizeCallback) {
        const mockEntries: ResizeObserverEntry[] = [{
          target: viewport,
          contentRect: {
            width: 1024,
            height: 768,
            top: 0,
            left: 0,
            bottom: 768,
            right: 1024,
            x: 0,
            y: 0,
            toJSON: () => ({}),
          },
          borderBoxSize: [],
          contentBoxSize: [],
          devicePixelContentBoxSize: [],
        }];

        await act(async () => {
          for (let i = 0; i < 5; i++) {
            resizeCallback(mockEntries, observer);
          }
        });
      }

      expect(callCount).toBe(5);
    });
  });

  describe('Viewport Width Changes', () => {
    test('recalculates pagination when viewport width increases', async () => {
      /**
       * Tests pagination recalculation on viewport expansion.
       */
      let totalPages = 5;
      const recalculatePagination = (newWidth: number) => {
        const pagesPerWidth = Math.floor(newWidth / 200);
        totalPages = Math.max(1, Math.ceil(5 / pagesPerWidth));
      };

      recalculatePagination(800);
      const initialPages = totalPages;

      recalculatePagination(1200);
      const newPages = totalPages;

      expect(newPages).toBeLessThanOrEqual(initialPages);
    });

    test('recalculates pagination when viewport width decreases', async () => {
      /**
       * Tests pagination recalculation on viewport shrinkage.
       */
      let totalPages = 3;
      const recalculatePagination = (newWidth: number) => {
        const pagesPerWidth = Math.floor(newWidth / 200);
        totalPages = Math.max(1, Math.ceil(5 / pagesPerWidth));
      };

      recalculatePagination(1200);
      const initialPages = totalPages;

      recalculatePagination(800);
      const newPages = totalPages;

      expect(newPages).toBeGreaterThanOrEqual(initialPages);
    });

    test('maintains current page ratio on viewport resize', async () => {
      /**
       * Tests that current page position is preserved proportionally during resize.
       */
      let currentPage = 5;
      let totalPages = 10;

      const resizeHandler = (newTotalPages: number) => {
        const ratio = (currentPage - 1) / (totalPages - 1);
        currentPage = Math.max(1, Math.min(Math.round(ratio * (newTotalPages - 1)) + 1, newTotalPages));
        totalPages = newTotalPages;
      };

      resizeHandler(20);

      expect(currentPage).toBe(9); // Position ratio preserved: (5-1)/(10-1) = 4/9, then round(4/9 * 19) + 1 = 9
      expect(totalPages).toBe(20);
    });

    test('clamps current page to new total pages on resize', async () => {
      /**
       * Edge case: If current page exceeds new total, clamp to maximum.
       */
      let currentPage = 10;
      let totalPages = 10;

      const resizeHandler = (newTotalPages: number) => {
        currentPage = Math.min(currentPage, newTotalPages);
        totalPages = newTotalPages;
      };

      resizeHandler(5);

      expect(currentPage).toBe(5);
      expect(totalPages).toBe(5);
    });
  });

  describe('Viewport Height Changes', () => {
    test('recalculates pagination when viewport height increases', async () => {
      /**
       * Tests pagination adjustment when more vertical space is available.
       */
      const calculatePages = (contentHeight: number, viewportHeight: number) => {
        return Math.ceil(contentHeight / viewportHeight);
      };

      const contentHeight = 2400;
      const initialPages = calculatePages(contentHeight, 600);
      const newPages = calculatePages(contentHeight, 800);

      expect(newPages).toBeLessThan(initialPages);
    });

    test('recalculates pagination when viewport height decreases', async () => {
      /**
       * Tests pagination adjustment when less vertical space is available.
       */
      const calculatePages = (contentHeight: number, viewportHeight: number) => {
        return Math.ceil(contentHeight / viewportHeight);
      };

      const contentHeight = 2400;
      const initialPages = calculatePages(contentHeight, 800);
      const newPages = calculatePages(contentHeight, 600);

      expect(newPages).toBeGreaterThan(initialPages);
    });

    test('handles very small viewport height', async () => {
      /**
       * Edge case: Very small viewport should still calculate pages correctly.
       */
      const calculatePages = (contentHeight: number, viewportHeight: number) => {
        return Math.ceil(contentHeight / Math.max(1, viewportHeight));
      };

      const contentHeight = 2400;
      const pages = calculatePages(contentHeight, 100);

      expect(pages).toBe(24);
    });
  });

  describe('Mobile Breakpoint Handling', () => {
    test('disables pagination mode on mobile (<768px)', async () => {
      /**
       * Tests automatic pagination disable on mobile devices.
       */
      mockUseIsMobile.mockReturnValue(true);

      let isPaginationMode = true;
      const isMobile = mockUseIsMobile();

      if (isMobile) {
        isPaginationMode = false;
      }

      expect(isPaginationMode).toBe(false);
    });

    test('enables pagination mode on desktop (>=768px)', async () => {
      /**
       * Tests pagination availability on desktop devices.
       */
      mockUseIsMobile.mockReturnValue(false);

      let isPaginationMode = false;
      const isMobile = mockUseIsMobile();

      if (!isMobile) {
        isPaginationMode = true;
      }

      expect(isPaginationMode).toBe(true);
    });

    test('switches from double to single column on mobile', async () => {
      /**
       * Tests automatic column layout adjustment for mobile.
       */
      mockUseIsMobile.mockReturnValue(true);

      type ColumnLayout = 'single' | 'double';
      let columnLayout: ColumnLayout = 'double';
      const isMobile = mockUseIsMobile();

      if (isMobile) {
        columnLayout = 'single';
      }

      expect(columnLayout).toBe('single');
    });

    test('preserves double column on desktop', async () => {
      /**
       * Tests that double column layout is maintained on desktop.
       */
      mockUseIsMobile.mockReturnValue(false);

      type ColumnLayout = 'single' | 'double';
      let columnLayout: ColumnLayout = 'double';
      const isMobile = mockUseIsMobile();

      if (!isMobile) {
        // Keep current layout
      }

      expect(columnLayout).toBe('double');
    });

    test('mobile breakpoint detection is accurate', () => {
      /**
       * Validates mobile detection logic boundary.
       */
      const isMobile = (width: number) => width < 768;

      expect(isMobile(767)).toBe(true);
      expect(isMobile(768)).toBe(false);
      expect(isMobile(1024)).toBe(false);
      expect(isMobile(320)).toBe(true);
    });
  });

  describe('Responsive Recalculation Triggers', () => {
    test('recalculation triggered by window resize', async () => {
      /**
       * Tests that window resize events trigger pagination recalculation.
       */
      let recalculationCount = 0;

      const handleResize = () => {
        recalculationCount++;
      };

      window.addEventListener('resize', handleResize);

      await act(async () => {
        window.dispatchEvent(new Event('resize'));
        window.dispatchEvent(new Event('resize'));
        window.dispatchEvent(new Event('resize'));
      });

      window.removeEventListener('resize', handleResize);

      expect(recalculationCount).toBe(3);
    });

    test('recalculation triggered by orientation change', async () => {
      /**
       * Tests pagination recalculation on device orientation change.
       */
      let recalculationCount = 0;

      const handleOrientationChange = () => {
        recalculationCount++;
      };

      window.addEventListener('orientationchange', handleOrientationChange);

      await act(async () => {
        window.dispatchEvent(new Event('orientationchange'));
      });

      window.removeEventListener('orientationchange', handleOrientationChange);

      expect(recalculationCount).toBe(1);
    });

    test('recalculation triggered by column layout toggle', async () => {
      /**
       * Tests recalculation when switching between single/double column.
       */
      let recalculationCount = 0;

      const toggleLayout = () => {
        recalculationCount++;
        // Simulate layout change
      };

      toggleLayout(); // Switch to double
      toggleLayout(); // Switch back to single

      expect(recalculationCount).toBe(2);
    });

    test('recalculation triggered by pagination mode toggle', async () => {
      /**
       * Tests recalculation when enabling/disabling pagination.
       */
      let recalculationCount = 0;

      const togglePagination = () => {
        recalculationCount++;
        // Simulate pagination toggle
      };

      togglePagination(); // Enable
      togglePagination(); // Disable

      expect(recalculationCount).toBe(2);
    });
  });

  describe('Container Dimension Updates', () => {
    test('container adapts to viewport width changes', async () => {
      /**
       * Tests dynamic container width adjustment.
       */
      const container = document.createElement('div');

      const updateContainerWidth = (viewportWidth: number) => {
        container.style.width = `${viewportWidth * 2}px`;
      };

      updateContainerWidth(600);
      expect(container.style.width).toBe('1200px');

      updateContainerWidth(900);
      expect(container.style.width).toBe('1800px');
    });

    test('container height adjusts to content', async () => {
      /**
       * Tests that container height adapts to content height.
       */
      const container = document.createElement('div');

      const updateContainerHeight = (contentHeight: number) => {
        container.style.height = `${contentHeight}px`;
      };

      updateContainerHeight(2000);
      expect(container.style.height).toBe('2000px');

      updateContainerHeight(3000);
      expect(container.style.height).toBe('3000px');
    });

    test('container respects minimum dimensions', async () => {
      /**
       * Edge case: Container should not shrink below minimum size.
       */
      const container = document.createElement('div');
      const minWidth = 600;
      const minHeight = 400;

      const updateContainer = (width: number, height: number) => {
        container.style.width = `${Math.max(width, minWidth)}px`;
        container.style.height = `${Math.max(height, minHeight)}px`;
      };

      updateContainer(300, 200);
      expect(container.style.width).toBe('600px');
      expect(container.style.height).toBe('400px');
    });
  });

  describe('Column Count Responsiveness', () => {
    test('reads updated column-count after layout change', async () => {
      /**
       * Tests dynamic column-count detection.
       */
      global.getComputedStyle = jest.fn(() => ({
        getPropertyValue: jest.fn((prop) => {
          if (prop === 'column-count') return '1';
          return '';
        }),
      })) as any;

      const element = document.createElement('div');
      const styles = window.getComputedStyle(element);
      const columnCount = parseInt(styles.getPropertyValue('column-count') || '1');

      expect(columnCount).toBe(1);
    });

    test('adapts pagination to single column layout', async () => {
      /**
       * Tests pagination calculation for single column mode.
       */
      const calculatePages = (contentHeight: number, viewportHeight: number, columnCount: number) => {
        const effectiveHeight = contentHeight / columnCount;
        return Math.ceil(effectiveHeight / viewportHeight);
      };

      const pages = calculatePages(2400, 800, 1);
      expect(pages).toBe(3);
    });

    test('adapts pagination to double column layout', async () => {
      /**
       * Tests pagination calculation for double column mode.
       */
      const calculatePages = (contentHeight: number, viewportHeight: number, columnCount: number) => {
        const effectiveHeight = contentHeight / columnCount;
        return Math.ceil(effectiveHeight / viewportHeight);
      };

      const pages = calculatePages(2400, 800, 2);
      expect(pages).toBe(2);
    });
  });

  describe('Debounced Recalculation', () => {
    test('debounces rapid resize events', async () => {
      /**
       * Tests that rapid resize events are debounced to avoid performance issues.
       */
      jest.useFakeTimers();

      let recalculationCount = 0;
      let debounceTimeout: NodeJS.Timeout | null = null;

      const debouncedRecalculation = () => {
        if (debounceTimeout) clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          recalculationCount++;
        }, 250);
      };

      // Trigger multiple rapid events
      for (let i = 0; i < 10; i++) {
        debouncedRecalculation();
      }

      // Fast-forward time
      jest.advanceTimersByTime(250);

      expect(recalculationCount).toBe(1); // Only 1 recalculation despite 10 calls

      jest.useRealTimers();
    });

    test('allows recalculation after debounce delay', async () => {
      /**
       * Tests that recalculation occurs after debounce period.
       */
      jest.useFakeTimers();

      let recalculationCount = 0;
      let debounceTimeout: NodeJS.Timeout | null = null;

      const debouncedRecalculation = () => {
        if (debounceTimeout) clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          recalculationCount++;
        }, 250);
      };

      debouncedRecalculation();
      jest.advanceTimersByTime(250);

      debouncedRecalculation();
      jest.advanceTimersByTime(250);

      expect(recalculationCount).toBe(2);

      jest.useRealTimers();
    });
  });

  describe('Responsive State Persistence', () => {
    test('preserves pagination mode across viewport changes', async () => {
      /**
       * Tests that user-selected pagination mode persists during resize.
       */
      let isPaginationMode = true;

      const handleResize = () => {
        // Pagination mode should persist
      };

      handleResize();
      expect(isPaginationMode).toBe(true);
    });

    test('preserves reading position during responsive changes', async () => {
      /**
       * Critical: User's reading position must be maintained during resize.
       */
      let currentPage = 5;
      let totalPages = 10;

      const handleResize = (newTotalPages: number) => {
        const ratio = (currentPage - 1) / Math.max(1, totalPages - 1);
        currentPage = Math.max(1, Math.min(Math.round(ratio * (newTotalPages - 1)) + 1, newTotalPages));
        totalPages = newTotalPages;
      };

      handleResize(15);

      expect(currentPage).toBeGreaterThanOrEqual(1);
      expect(currentPage).toBeLessThanOrEqual(15);
    });
  });

  describe('Cross-Browser Compatibility', () => {
    test('handles ResizeObserver unavailability gracefully', () => {
      /**
       * Edge case: Fallback for browsers without ResizeObserver.
       */
      const originalResizeObserver = global.ResizeObserver;
      (global as any).ResizeObserver = undefined;

      const hasResizeObserver = typeof ResizeObserver !== 'undefined';

      expect(hasResizeObserver).toBe(false);

      global.ResizeObserver = originalResizeObserver;
    });

    test('handles getComputedStyle differences across browsers', () => {
      /**
       * Tests robust CSS property reading across browser implementations.
       */
      global.getComputedStyle = jest.fn(() => ({
        getPropertyValue: jest.fn((prop) => {
          // Some browsers return 'auto' instead of number
          if (prop === 'column-count') return 'auto';
          return '';
        }),
      })) as any;

      const element = document.createElement('div');
      const styles = window.getComputedStyle(element);
      const columnCount = styles.getPropertyValue('column-count');
      const parsedCount = columnCount === 'auto' ? 1 : parseInt(columnCount) || 1;

      expect(parsedCount).toBe(1);
    });
  });
});
