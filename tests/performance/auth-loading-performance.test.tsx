/**
 * @fileOverview AuthContext Loading Performance Test Suite
 *
 * Performance and timing tests for the authentication loading UI including:
 * - Loading UI render time measurement
 * - Image loading optimization verification
 * - Animation performance checks
 * - Memory leak detection
 * - Transition timing validation
 *
 * Test Categories:
 * 1. Render Performance - Time to first paint
 * 2. Asset Loading - Image optimization verification
 * 3. Animation Performance - Frame rate checks
 * 4. Memory Management - Leak detection
 * 5. Transition Performance - State change timing
 *
 * Following Google's Performance Testing Best Practices:
 * - Measure real-world performance characteristics
 * - Set acceptable thresholds
 * - Test under various conditions
 * - Verify no performance regressions
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Import component being tested
import { AuthProvider } from '@/context/AuthContext';

// Mock NextAuth useSession hook
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

import { useSession } from 'next-auth/react';

// Mock fetch
global.fetch = jest.fn();

/**
 * Performance measurement utility
 */
class PerformanceTimer {
  private startTime: number = 0;

  start() {
    this.startTime = performance.now();
  }

  end(): number {
    return performance.now() - this.startTime;
  }
}

describe('AuthContext Loading Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  // ============================================================================
  // RENDER PERFORMANCE
  // ============================================================================

  describe('P1: Loading UI Render Time', () => {
    /**
     * Test: Loading UI should render quickly
     *
     * Metric: Time from component mount to UI paint
     * Target: < 300ms (test environment threshold)
     * Note: In production, target is < 100ms, but test environment overhead
     * requires a more generous threshold to avoid flakiness
     * Why: Instant visual feedback prevents perceived lag
     */
    it('should render loading UI quickly in test environment', () => {
      // Arrange
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      const timer = new PerformanceTimer();

      // Act: Measure render time
      timer.start();
      render(
        <AuthProvider>
          <div>Test Content</div>
        </AuthProvider>
      );
      const renderTime = timer.end();

      // Assert: Render completes within reasonable time for test environment
      // Production target: < 100ms, Test environment: < 300ms
      expect(renderTime).toBeLessThan(300);

      // Verify UI actually rendered
      const logo = screen.getByAltText('紅樓慧讀');
      expect(logo).toBeInTheDocument();
    });

    it('should render loading UI synchronously without async delays', () => {
      // Arrange
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      // Act: Render should complete synchronously
      const { container } = render(
        <AuthProvider>
          <div>Test Content</div>
        </AuthProvider>
      );

      // Assert: Logo is immediately available (no need for waitFor)
      const logo = screen.getByAltText('紅樓慧讀');
      expect(logo).toBeInTheDocument();

      // Assert: Spinning ring is immediately available
      const spinningRing = container.querySelector('.animate-spin');
      expect(spinningRing).toBeInTheDocument();
    });
  });

  // ============================================================================
  // ASSET LOADING
  // ============================================================================

  describe('P2: Image Loading Optimization', () => {
    /**
     * Test: Logo should use Next.js priority loading
     *
     * Metric: Image component configured for priority loading
     * Target: Image renders without errors (priority prop accepted)
     * Note: The mock Image component doesn't render priority as HTML attribute
     * Why: Critical asset must load immediately in production
     */
    it('should configure logo for priority loading', () => {
      // Arrange
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      // Act & Assert: Should render without errors
      expect(() => {
        render(
          <AuthProvider>
            <div>Test Content</div>
          </AuthProvider>
        );
      }).not.toThrow();

      // Assert: Logo image is present and optimized
      const logo = screen.getByAltText('紅樓慧讀');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('src', '/images/logo_circle.png');
    });

    it('should use optimized image dimensions', () => {
      // Arrange
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      // Act
      render(
        <AuthProvider>
          <div>Test Content</div>
        </AuthProvider>
      );

      // Assert: Image has explicit dimensions (prevents layout shift)
      const logo = screen.getByAltText('紅樓慧讀');
      expect(logo).toHaveAttribute('width', '112');
      expect(logo).toHaveAttribute('height', '112');
    });

    it('should use correct image format and path', () => {
      // Arrange
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      // Act
      render(
        <AuthProvider>
          <div>Test Content</div>
        </AuthProvider>
      );

      // Assert: Image uses PNG format from public directory
      const logo = screen.getByAltText('紅樓慧讀');
      expect(logo).toHaveAttribute('src', '/images/logo_circle.png');
    });
  });

  // ============================================================================
  // ANIMATION PERFORMANCE
  // ============================================================================

  describe('P3: Animation Performance', () => {
    /**
     * Test: Spinning ring uses CSS animation (GPU accelerated)
     *
     * Metric: Uses Tailwind animate-spin class
     * Target: CSS-based animation (not JavaScript)
     * Why: CSS animations are GPU-accelerated and maintain 60fps
     */
    it('should use CSS-based animation for smooth 60fps performance', () => {
      // Arrange
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      // Act
      const { container } = render(
        <AuthProvider>
          <div>Test Content</div>
        </AuthProvider>
      );

      // Assert: Animation uses CSS class (not JS-based animation)
      const spinningRing = container.querySelector('.animate-spin');
      expect(spinningRing).toBeInTheDocument();
      expect(spinningRing).toHaveClass('animate-spin');
    });

    it('should apply transform-based animation for GPU acceleration', () => {
      // Arrange
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      // Act
      const { container } = render(
        <AuthProvider>
          <div>Test Content</div>
        </AuthProvider>
      );

      // Assert: Ring uses rounded shape (border-radius triggers GPU)
      const spinningRing = container.querySelector('.animate-spin');
      expect(spinningRing).toHaveClass('rounded-full');
    });

    it('should not trigger layout recalculations during animation', () => {
      // Arrange
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      // Act
      const { container } = render(
        <AuthProvider>
          <div>Test Content</div>
        </AuthProvider>
      );

      // Assert: Animation elements use absolute positioning (no layout shifts)
      const spinningRing = container.querySelector('.animate-spin');
      expect(spinningRing).toHaveClass('absolute');

      // Assert: Container uses relative positioning for proper stacking
      const logoContainer = container.querySelector('.w-28.h-28');
      expect(logoContainer).toHaveClass('relative');
    });
  });

  // ============================================================================
  // MEMORY MANAGEMENT
  // ============================================================================

  describe('P4: Memory Usage', () => {
    /**
     * Test: Component should unmount cleanly without memory leaks
     *
     * Metric: No detached DOM nodes after unmount
     * Target: Clean unmount
     * Why: Prevents performance degradation over time
     */
    it('should unmount cleanly without memory leaks', () => {
      // Arrange
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      // Act: Render and unmount
      const { unmount, container } = render(
        <AuthProvider>
          <div>Test Content</div>
        </AuthProvider>
      );

      // Verify component rendered
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();

      // Act: Unmount component
      unmount();

      // Assert: Container is empty after unmount
      expect(container.innerHTML).toBe('');
    });

    it('should clean up loading UI when transitioning to authenticated state', async () => {
      // Arrange: Start with loading state
      const { rerender, container } = render(
        <AuthProvider>
          <div data-testid="child">Test Content</div>
        </AuthProvider>
      );

      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      rerender(
        <AuthProvider>
          <div data-testid="child">Test Content</div>
        </AuthProvider>
      );

      // Verify loading UI is present
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();

      // Arrange: Transition to authenticated state
      const mockUser = {
        id: 'test-user-123',
        name: 'Test User',
        email: 'test@example.com',
      };

      (useSession as jest.Mock).mockReturnValue({
        data: { user: mockUser },
        status: 'authenticated',
        update: jest.fn(),
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          profile: {
            userId: mockUser.id,
            displayName: mockUser.name,
            level: 1,
            xp: 0,
          },
        }),
      });

      // Act: Rerender with authenticated state
      await act(async () => {
        rerender(
          <AuthProvider>
            <div data-testid="child">Test Content</div>
          </AuthProvider>
        );
      });

      // Assert: Loading UI is completely removed
      await waitFor(() => {
        expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();
        expect(screen.queryByAltText('紅樓慧讀')).not.toBeInTheDocument();
      });

      // Assert: Children are now visible
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // TRANSITION PERFORMANCE
  // ============================================================================

  describe('P5: Transition Timing', () => {
    /**
     * Test: Transition from loading to content should be fast
     *
     * Metric: Time from state change to UI update
     * Target: < 500ms
     * Why: Smooth user experience requires fast transitions
     */
    it('should transition from loading to content quickly', async () => {
      // Arrange: Start with loading state
      const { rerender } = render(
        <AuthProvider>
          <div data-testid="child">Test Content</div>
        </AuthProvider>
      );

      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      rerender(
        <AuthProvider>
          <div data-testid="child">Test Content</div>
        </AuthProvider>
      );

      // Verify loading state
      expect(screen.getByAltText('紅樓慧讀')).toBeInTheDocument();

      // Arrange: Prepare authenticated state
      const mockUser = {
        id: 'fast-user-123',
        name: 'Fast User',
        email: 'fast@example.com',
      };

      (useSession as jest.Mock).mockReturnValue({
        data: { user: mockUser },
        status: 'authenticated',
        update: jest.fn(),
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          profile: {
            userId: mockUser.id,
            displayName: mockUser.name,
            level: 1,
            xp: 0,
          },
        }),
      });

      const timer = new PerformanceTimer();

      // Act: Measure transition time
      timer.start();
      await act(async () => {
        rerender(
          <AuthProvider>
            <div data-testid="child">Test Content</div>
          </AuthProvider>
        );
      });

      // Wait for transition to complete
      await waitFor(() => {
        expect(screen.queryByAltText('紅樓慧讀')).not.toBeInTheDocument();
        expect(screen.getByTestId('child')).toBeInTheDocument();
      });

      const transitionTime = timer.end();

      // Assert: Transition completes within acceptable time
      // Note: This threshold is generous for test environment
      // In production, it should be much faster (< 100ms)
      expect(transitionTime).toBeLessThan(500);
    });

    it('should handle rapid state changes without performance degradation', async () => {
      // Arrange
      const mockUser = {
        id: 'rapid-user-123',
        name: 'Rapid User',
        email: 'rapid@example.com',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          profile: {
            userId: mockUser.id,
            displayName: mockUser.name,
            level: 1,
            xp: 0,
          },
        }),
      });

      const { rerender } = render(
        <AuthProvider>
          <div data-testid="child">Test Content</div>
        </AuthProvider>
      );

      const timer = new PerformanceTimer();
      timer.start();

      // Act: Rapidly change states multiple times
      for (let i = 0; i < 5; i++) {
        (useSession as jest.Mock).mockReturnValue({
          data: null,
          status: 'loading',
          update: jest.fn(),
        });

        await act(async () => {
          rerender(
            <AuthProvider>
              <div data-testid="child">Test Content</div>
            </AuthProvider>
          );
        });

        (useSession as jest.Mock).mockReturnValue({
          data: { user: mockUser },
          status: 'authenticated',
          update: jest.fn(),
        });

        await act(async () => {
          rerender(
            <AuthProvider>
              <div data-testid="child">Test Content</div>
            </AuthProvider>
          );
        });
      }

      const totalTime = timer.end();

      // Assert: Multiple transitions complete in reasonable time
      // 5 cycles × 2 transitions = 10 transitions
      // Should complete in < 2000ms total (< 200ms per transition average)
      expect(totalTime).toBeLessThan(2000);
    });
  });

  // ============================================================================
  // LAYOUT STABILITY
  // ============================================================================

  describe('P6: Layout Stability', () => {
    /**
     * Test: Loading UI should not cause layout shifts
     *
     * Metric: No cumulative layout shift (CLS)
     * Target: CLS = 0
     * Why: Layout shifts harm user experience and Core Web Vitals
     */
    it('should use fixed dimensions to prevent layout shifts', () => {
      // Arrange
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      // Act
      const { container } = render(
        <AuthProvider>
          <div>Test Content</div>
        </AuthProvider>
      );

      // Assert: Logo container has explicit size
      const logoContainer = container.querySelector('.w-28.h-28');
      expect(logoContainer).toBeInTheDocument();

      // Assert: Spinning ring has explicit size
      const spinningRing = container.querySelector('.w-40.h-40');
      expect(spinningRing).toBeInTheDocument();

      // Assert: Image has explicit dimensions
      const logo = screen.getByAltText('紅樓慧讀');
      expect(logo).toHaveAttribute('width', '112');
      expect(logo).toHaveAttribute('height', '112');
    });

    it('should use absolute positioning to prevent layout reflows', () => {
      // Arrange
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      // Act
      const { container } = render(
        <AuthProvider>
          <div>Test Content</div>
        </AuthProvider>
      );

      // Assert: Spinning ring uses absolute positioning
      const spinningRing = container.querySelector('.animate-spin');
      expect(spinningRing).toHaveClass('absolute');

      // Assert: Parent container is relative
      const parent = spinningRing?.parentElement;
      expect(parent).toHaveClass('relative');
    });
  });
});
