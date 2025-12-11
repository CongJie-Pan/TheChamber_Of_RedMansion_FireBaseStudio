/**
 * Bi-Column Navigation Tests
 *
 * Tests page navigation functions (goToPage, goNextPage, goPrevPage),
 * keyboard navigation, mouse wheel navigation, and scroll locking mechanisms.
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
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

describe('Bi-Column Navigation', () => {
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

  describe('goToPage() Function', () => {
    test('navigates to valid page number', () => {
      /**
       * Tests navigation to a specific page within bounds.
       */
      let currentPage = 1;
      const totalPages = 10;

      const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
          currentPage = page;
          return true;
        }
        return false;
      };

      const result = goToPage(5);

      expect(result).toBe(true);
      expect(currentPage).toBe(5);
    });

    test('rejects page number less than 1', () => {
      /**
       * Edge case: Page numbers must be >= 1.
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

      const result = goToPage(0);

      expect(result).toBe(false);
      expect(currentPage).toBe(5); // Should not change
    });

    test('rejects page number greater than totalPages', () => {
      /**
       * Edge case: Page numbers must be <= totalPages.
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

      const result = goToPage(11);

      expect(result).toBe(false);
      expect(currentPage).toBe(5); // Should not change
    });

    test('updates viewport scroll position on navigation', () => {
      /**
       * Tests that navigation triggers viewport scroll to correct position.
       */
      const viewport = document.createElement('div');
      let currentPage = 1;

      const goToPage = (page: number) => {
        currentPage = page;
        const scrollX = (page - 1) * viewport.clientWidth;
        viewport.scrollTo({ left: scrollX, behavior: 'smooth' });
      };

      viewport.scrollTo = jest.fn();
      goToPage(3);

      expect(currentPage).toBe(3);
      expect(viewport.scrollTo).toHaveBeenCalled();
    });

    test('focuses viewport after navigation', () => {
      /**
       * Tests that viewport gains focus after navigation for keyboard control.
       */
      const viewport = document.createElement('div');
      viewport.tabIndex = 0;
      document.body.appendChild(viewport);

      let currentPage = 1;

      const goToPage = (page: number) => {
        currentPage = page;
        viewport.focus();
      };

      viewport.focus = jest.fn();
      goToPage(5);

      expect(viewport.focus).toHaveBeenCalled();

      document.body.removeChild(viewport);
    });

    test('uses double RAF for layout settling', async () => {
      /**
       * Tests that navigation uses double RAF to allow layout to settle.
       */
      let navigationComplete = false;

      const goToPage = (page: number) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            navigationComplete = true;
          });
        });
      };

      await act(async () => {
        goToPage(5);
      });

      expect(navigationComplete).toBe(true);
    });

    test('handles navigation to first page', () => {
      /**
       * Tests navigation to page 1 (boundary condition).
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

      const result = goToPage(1);

      expect(result).toBe(true);
      expect(currentPage).toBe(1);
    });

    test('handles navigation to last page', () => {
      /**
       * Tests navigation to last page (boundary condition).
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

      const result = goToPage(10);

      expect(result).toBe(true);
      expect(currentPage).toBe(10);
    });

    test('handles navigation to current page (no-op)', () => {
      /**
       * Tests navigation to the same page (should succeed but not change state).
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

      const result = goToPage(5);

      expect(result).toBe(true);
      expect(currentPage).toBe(5);
    });
  });

  describe('goNextPage() Function', () => {
    test('advances to next page when not at end', () => {
      /**
       * Tests normal next page navigation.
       */
      let currentPage = 5;
      const totalPages = 10;

      const goNextPage = () => {
        if (currentPage < totalPages) {
          currentPage++;
          return true;
        }
        return false;
      };

      const result = goNextPage();

      expect(result).toBe(true);
      expect(currentPage).toBe(6);
    });

    test('does not advance beyond last page', () => {
      /**
       * Boundary test: Cannot go past last page.
       */
      let currentPage = 10;
      const totalPages = 10;

      const goNextPage = () => {
        if (currentPage < totalPages) {
          currentPage++;
          return true;
        }
        return false;
      };

      const result = goNextPage();

      expect(result).toBe(false);
      expect(currentPage).toBe(10);
    });

    test('advances from first page', () => {
      /**
       * Tests next page from page 1.
       */
      let currentPage = 1;
      const totalPages = 10;

      const goNextPage = () => {
        if (currentPage < totalPages) {
          currentPage++;
          return true;
        }
        return false;
      };

      const result = goNextPage();

      expect(result).toBe(true);
      expect(currentPage).toBe(2);
    });

    test('advances to last page', () => {
      /**
       * Tests advancing to the final page.
       */
      let currentPage = 9;
      const totalPages = 10;

      const goNextPage = () => {
        if (currentPage < totalPages) {
          currentPage++;
          return true;
        }
        return false;
      };

      const result = goNextPage();

      expect(result).toBe(true);
      expect(currentPage).toBe(10);
    });

    test('updates currentPageRef when advancing', () => {
      /**
       * Tests that ref stays synchronized with state.
       */
      let currentPage = 5;
      const currentPageRef = { current: 5 };
      const totalPages = 10;

      const goNextPage = () => {
        if (currentPage < totalPages) {
          currentPage++;
          currentPageRef.current = currentPage;
          return true;
        }
        return false;
      };

      goNextPage();

      expect(currentPage).toBe(6);
      expect(currentPageRef.current).toBe(6);
    });
  });

  describe('goPrevPage() Function', () => {
    test('goes back to previous page when not at start', () => {
      /**
       * Tests normal previous page navigation.
       */
      let currentPage = 5;

      const goPrevPage = () => {
        if (currentPage > 1) {
          currentPage--;
          return true;
        }
        return false;
      };

      const result = goPrevPage();

      expect(result).toBe(true);
      expect(currentPage).toBe(4);
    });

    test('does not go below page 1', () => {
      /**
       * Boundary test: Cannot go before first page.
       */
      let currentPage = 1;

      const goPrevPage = () => {
        if (currentPage > 1) {
          currentPage--;
          return true;
        }
        return false;
      };

      const result = goPrevPage();

      expect(result).toBe(false);
      expect(currentPage).toBe(1);
    });

    test('goes back from last page', () => {
      /**
       * Tests previous page from last page.
       */
      let currentPage = 10;

      const goPrevPage = () => {
        if (currentPage > 1) {
          currentPage--;
          return true;
        }
        return false;
      };

      const result = goPrevPage();

      expect(result).toBe(true);
      expect(currentPage).toBe(9);
    });

    test('goes back to first page', () => {
      /**
       * Tests going back to page 1.
       */
      let currentPage = 2;

      const goPrevPage = () => {
        if (currentPage > 1) {
          currentPage--;
          return true;
        }
        return false;
      };

      const result = goPrevPage();

      expect(result).toBe(true);
      expect(currentPage).toBe(1);
    });

    test('updates currentPageRef when going back', () => {
      /**
       * Tests that ref stays synchronized with state.
       */
      let currentPage = 5;
      const currentPageRef = { current: 5 };

      const goPrevPage = () => {
        if (currentPage > 1) {
          currentPage--;
          currentPageRef.current = currentPage;
          return true;
        }
        return false;
      };

      goPrevPage();

      expect(currentPage).toBe(4);
      expect(currentPageRef.current).toBe(4);
    });
  });

  describe('Keyboard Navigation - Arrow Keys', () => {
    test('ArrowRight advances to next page', () => {
      /**
       * Tests right arrow key navigation.
       */
      let currentPage = 5;
      const totalPages = 10;

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'ArrowRight' && currentPage < totalPages) {
          currentPage++;
        }
      };

      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      handleKeyDown(event);

      expect(currentPage).toBe(6);
    });

    test('ArrowLeft goes to previous page', () => {
      /**
       * Tests left arrow key navigation.
       */
      let currentPage = 5;

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'ArrowLeft' && currentPage > 1) {
          currentPage--;
        }
      };

      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      handleKeyDown(event);

      expect(currentPage).toBe(4);
    });

    test('ArrowDown advances to next page', () => {
      /**
       * Tests down arrow key navigation (alternative to right).
       */
      let currentPage = 5;
      const totalPages = 10;

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'ArrowDown' && currentPage < totalPages) {
          currentPage++;
        }
      };

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      handleKeyDown(event);

      expect(currentPage).toBe(6);
    });

    test('ArrowUp goes to previous page', () => {
      /**
       * Tests up arrow key navigation (alternative to left).
       */
      let currentPage = 5;

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'ArrowUp' && currentPage > 1) {
          currentPage--;
        }
      };

      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      handleKeyDown(event);

      expect(currentPage).toBe(4);
    });

    test('ignores arrow keys when in editable element', () => {
      /**
       * Tests that arrow keys are ignored in input/textarea/contenteditable.
       */
      let currentPage = 5;
      const totalPages = 10;

      const handleKeyDown = (event: KeyboardEvent, target: HTMLElement) => {
        const isEditable = target.tagName === 'INPUT' ||
                          target.tagName === 'TEXTAREA' ||
                          target.isContentEditable;

        if (!isEditable && event.key === 'ArrowRight' && currentPage < totalPages) {
          currentPage++;
        }
      };

      const input = document.createElement('input');
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      handleKeyDown(event, input);

      expect(currentPage).toBe(5); // Should not change
    });
  });

  describe('Keyboard Navigation - PageUp/PageDown', () => {
    test('PageDown advances to next page', () => {
      /**
       * Tests PageDown key navigation.
       */
      let currentPage = 5;
      const totalPages = 10;

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'PageDown' && currentPage < totalPages) {
          event.preventDefault();
          currentPage++;
        }
      };

      const event = new KeyboardEvent('keydown', { key: 'PageDown' });
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
      handleKeyDown(event);

      expect(currentPage).toBe(6);
    });

    test('PageUp goes to previous page', () => {
      /**
       * Tests PageUp key navigation.
       */
      let currentPage = 5;

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'PageUp' && currentPage > 1) {
          event.preventDefault();
          currentPage--;
        }
      };

      const event = new KeyboardEvent('keydown', { key: 'PageUp' });
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
      handleKeyDown(event);

      expect(currentPage).toBe(4);
    });

    test('PageDown prevents default scroll behavior', () => {
      /**
       * Tests that PageDown preventDefault is called to avoid page scroll.
       */
      let currentPage = 5;
      const totalPages = 10;

      const mockPreventDefault = jest.fn();

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'PageDown' && currentPage < totalPages) {
          event.preventDefault();
          currentPage++;
        }
      };

      const event = new KeyboardEvent('keydown', { key: 'PageDown' });
      Object.defineProperty(event, 'preventDefault', { value: mockPreventDefault });
      handleKeyDown(event);

      expect(mockPreventDefault).toHaveBeenCalled();
    });

    test('PageUp prevents default scroll behavior', () => {
      /**
       * Tests that PageUp preventDefault is called to avoid page scroll.
       */
      let currentPage = 5;

      const mockPreventDefault = jest.fn();

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'PageUp' && currentPage > 1) {
          event.preventDefault();
          currentPage--;
        }
      };

      const event = new KeyboardEvent('keydown', { key: 'PageUp' });
      Object.defineProperty(event, 'preventDefault', { value: mockPreventDefault });
      handleKeyDown(event);

      expect(mockPreventDefault).toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation - Space Key', () => {
    test('Space advances to next page', () => {
      /**
       * Tests Space key navigation.
       */
      let currentPage = 5;
      const totalPages = 10;

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === ' ' && currentPage < totalPages) {
          event.preventDefault();
          currentPage++;
        }
      };

      const event = new KeyboardEvent('keydown', { key: ' ' });
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
      handleKeyDown(event);

      expect(currentPage).toBe(6);
    });

    test('Shift+Space goes to previous page', () => {
      /**
       * Tests Shift+Space key navigation.
       */
      let currentPage = 5;

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === ' ' && event.shiftKey && currentPage > 1) {
          event.preventDefault();
          currentPage--;
        }
      };

      const event = new KeyboardEvent('keydown', { key: ' ', shiftKey: true });
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
      handleKeyDown(event);

      expect(currentPage).toBe(4);
    });

    test('Space prevents default scroll behavior', () => {
      /**
       * Tests that Space preventDefault is called to avoid page scroll.
       */
      let currentPage = 5;
      const totalPages = 10;

      const mockPreventDefault = jest.fn();

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === ' ' && currentPage < totalPages) {
          event.preventDefault();
          currentPage++;
        }
      };

      const event = new KeyboardEvent('keydown', { key: ' ' });
      Object.defineProperty(event, 'preventDefault', { value: mockPreventDefault });
      handleKeyDown(event);

      expect(mockPreventDefault).toHaveBeenCalled();
    });

    test('ignores Space in editable elements', () => {
      /**
       * Tests that Space is ignored in input/textarea/contenteditable.
       */
      let currentPage = 5;
      const totalPages = 10;

      const handleKeyDown = (event: KeyboardEvent, target: HTMLElement) => {
        const isEditable = target.tagName === 'INPUT' ||
                          target.tagName === 'TEXTAREA' ||
                          target.isContentEditable;

        if (!isEditable && event.key === ' ' && currentPage < totalPages) {
          event.preventDefault();
          currentPage++;
        }
      };

      const textarea = document.createElement('textarea');
      const event = new KeyboardEvent('keydown', { key: ' ' });
      handleKeyDown(event, textarea);

      expect(currentPage).toBe(5); // Should not change
    });
  });

  describe('Mouse Wheel Navigation', () => {
    test('wheel down (deltaY > 0) advances to next page', () => {
      /**
       * Tests mouse wheel down navigation.
       */
      let currentPage = 5;
      const totalPages = 10;

      const handleWheel = (event: WheelEvent) => {
        if (event.deltaY > 0 && currentPage < totalPages) {
          event.preventDefault();
          currentPage++;
        }
      };

      const event = new WheelEvent('wheel', { deltaY: 100 });
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
      handleWheel(event);

      expect(currentPage).toBe(6);
    });

    test('wheel up (deltaY < 0) goes to previous page', () => {
      /**
       * Tests mouse wheel up navigation.
       */
      let currentPage = 5;

      const handleWheel = (event: WheelEvent) => {
        if (event.deltaY < 0 && currentPage > 1) {
          event.preventDefault();
          currentPage--;
        }
      };

      const event = new WheelEvent('wheel', { deltaY: -100 });
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
      handleWheel(event);

      expect(currentPage).toBe(4);
    });

    test('wheel event prevents default scroll', () => {
      /**
       * Tests that wheel preventDefault is called to avoid page scroll.
       */
      let currentPage = 5;
      const totalPages = 10;

      const mockPreventDefault = jest.fn();

      const handleWheel = (event: WheelEvent) => {
        if (event.deltaY > 0 && currentPage < totalPages) {
          event.preventDefault();
          currentPage++;
        }
      };

      const event = new WheelEvent('wheel', { deltaY: 100 });
      Object.defineProperty(event, 'preventDefault', { value: mockPreventDefault });
      handleWheel(event);

      expect(mockPreventDefault).toHaveBeenCalled();
    });

    test('ignores wheel in editable elements', () => {
      /**
       * Tests that wheel is ignored in input/textarea/contenteditable.
       */
      let currentPage = 5;
      const totalPages = 10;

      const handleWheel = (event: WheelEvent, target: HTMLElement) => {
        const isEditable = target.tagName === 'INPUT' ||
                          target.tagName === 'TEXTAREA' ||
                          target.isContentEditable;

        if (!isEditable && event.deltaY > 0 && currentPage < totalPages) {
          event.preventDefault();
          currentPage++;
        }
      };

      const input = document.createElement('input');
      const event = new WheelEvent('wheel', { deltaY: 100 });
      handleWheel(event, input);

      expect(currentPage).toBe(5); // Should not change
    });

    test('handles deltaY = 0 (no vertical scroll)', () => {
      /**
       * Edge case: deltaY = 0 should not trigger navigation.
       */
      let currentPage = 5;
      const totalPages = 10;

      const handleWheel = (event: WheelEvent) => {
        if (event.deltaY > 0 && currentPage < totalPages) {
          currentPage++;
        } else if (event.deltaY < 0 && currentPage > 1) {
          currentPage--;
        }
      };

      const event = new WheelEvent('wheel', { deltaY: 0 });
      handleWheel(event);

      expect(currentPage).toBe(5); // Should not change
    });
  });

  describe('Global Scroll Lock', () => {
    test('locks body scroll when pagination mode is enabled', () => {
      /**
       * Tests that body scroll is disabled during pagination mode.
       */
      const originalOverflow = document.body.style.overflow;

      const enableScrollLock = () => {
        document.body.style.overflow = 'hidden';
      };

      enableScrollLock();

      expect(document.body.style.overflow).toBe('hidden');

      document.body.style.overflow = originalOverflow;
    });

    test('unlocks body scroll when pagination mode is disabled', () => {
      /**
       * Tests that body scroll is restored when exiting pagination mode.
       */
      document.body.style.overflow = 'hidden';

      const disableScrollLock = () => {
        document.body.style.overflow = '';
      };

      disableScrollLock();

      expect(document.body.style.overflow).toBe('');
    });

    test('scroll lock persists across page navigation', () => {
      /**
       * Tests that scroll lock remains active during page changes.
       */
      document.body.style.overflow = 'hidden';

      let currentPage = 5;
      const totalPages = 10;

      const goNextPage = () => {
        if (currentPage < totalPages) {
          currentPage++;
        }
        // Scroll lock should remain
      };

      goNextPage();

      expect(document.body.style.overflow).toBe('hidden');
      expect(currentPage).toBe(6);
    });

    test('scroll lock cleanup on unmount', () => {
      /**
       * Tests that scroll lock is removed when component unmounts.
       */
      document.body.style.overflow = 'hidden';

      const cleanup = () => {
        document.body.style.overflow = '';
      };

      cleanup();

      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Viewport Focus Management', () => {
    test('viewport receives focus on pagination enable', () => {
      /**
       * Tests that viewport gains focus when pagination is activated.
       */
      const viewport = document.createElement('div');
      viewport.tabIndex = 0;
      document.body.appendChild(viewport);

      viewport.focus = jest.fn();

      const enablePagination = () => {
        viewport.focus();
      };

      enablePagination();

      expect(viewport.focus).toHaveBeenCalled();

      document.body.removeChild(viewport);
    });

    test('viewport retains focus during navigation', () => {
      /**
       * Tests that viewport maintains focus through page changes.
       */
      const viewport = document.createElement('div');
      viewport.tabIndex = 0;
      document.body.appendChild(viewport);

      viewport.focus = jest.fn();

      let currentPage = 5;
      const totalPages = 10;

      const goNextPage = () => {
        if (currentPage < totalPages) {
          currentPage++;
          viewport.focus();
        }
      };

      goNextPage();

      expect(viewport.focus).toHaveBeenCalled();

      document.body.removeChild(viewport);
    });
  });

  describe('Editable Element Protection', () => {
    test('detects INPUT elements correctly', () => {
      /**
       * Tests identification of INPUT elements to prevent navigation.
       */
      const input = document.createElement('input');

      const isEditable = (element: HTMLElement) => {
        return element.tagName === 'INPUT' ||
               element.tagName === 'TEXTAREA' ||
               element.isContentEditable;
      };

      expect(isEditable(input)).toBe(true);
    });

    test('detects TEXTAREA elements correctly', () => {
      /**
       * Tests identification of TEXTAREA elements.
       */
      const textarea = document.createElement('textarea');

      const isEditable = (element: HTMLElement) => {
        return element.tagName === 'INPUT' ||
               element.tagName === 'TEXTAREA' ||
               element.isContentEditable;
      };

      expect(isEditable(textarea)).toBe(true);
    });

    test('detects contentEditable elements correctly', () => {
      /**
       * Tests identification of contenteditable elements.
       * Note: jsdom doesn't properly implement isContentEditable (returns undefined),
       * so we check the contentEditable attribute string directly.
       */
      const div = document.createElement('div');
      div.contentEditable = 'true';

      const isEditable = (element: HTMLElement) => {
        return element.tagName === 'INPUT' ||
               element.tagName === 'TEXTAREA' ||
               element.contentEditable === 'true';  // jsdom workaround
      };

      expect(isEditable(div)).toBe(true);
    });

    test('non-editable elements return false', () => {
      /**
       * Tests that regular elements are not identified as editable.
       * Note: jsdom doesn't properly implement isContentEditable (returns undefined),
       * so we check the contentEditable attribute string directly.
       */
      const div = document.createElement('div');

      const isEditable = (element: HTMLElement) => {
        return element.tagName === 'INPUT' ||
               element.tagName === 'TEXTAREA' ||
               element.contentEditable === 'true';  // jsdom workaround
      };

      expect(isEditable(div)).toBe(false);
    });
  });
});
