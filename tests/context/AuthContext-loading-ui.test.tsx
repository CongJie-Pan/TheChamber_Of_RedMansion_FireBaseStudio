/**
 * @fileOverview AuthContext Loading UI Unit Test Suite
 *
 * Comprehensive test coverage for the AuthContext loading UI including:
 * - Logo and spinning ring display during authentication
 * - Correct CSS classes and styling
 * - Image component props and optimization
 * - Loading state transitions
 * - Accessibility attributes
 * - Animation classes
 *
 * Test Categories:
 * 1. Happy Path Tests - Normal loading behavior
 * 2. Edge Cases - Rapid state changes, error conditions
 * 3. Styling and Animation Tests - CSS classes and visual feedback
 * 4. Accessibility Tests - Screen reader support
 *
 * Following Google's Testing Best Practices:
 * - Test behaviors, not implementation details
 * - Use public APIs only
 * - Test state changes, not interactions
 * - Clear, descriptive test names
 * - One behavior per test
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Import the component being tested
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

// Mock fetch for profile API calls
global.fetch = jest.fn();

// Import mocked modules for type safety
import { useSession } from 'next-auth/react';

/**
 * Helper function to render AuthProvider with test children
 */
const renderAuthProvider = (children: React.ReactNode = <div data-testid="child-content">Test Content</div>) => {
  return render(<AuthProvider>{children}</AuthProvider>);
};

describe('AuthContext Loading UI - Unit Tests', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  // ============================================================================
  // HAPPY PATH TESTS
  // ============================================================================

  describe('Happy Path - Normal Loading Behavior', () => {
    /**
     * Test 1.1: Loading state displays logo with spinning ring
     *
     * Behavior: When isLoading is true (NextAuth status='loading'),
     * the component should render a centered logo with an animated ring around it.
     *
     * Public API: AuthProvider component with mocked useSession hook
     */
    it('should display logo image and spinning ring when loading', () => {
      // Arrange: Mock NextAuth to return loading state
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      // Act: Render AuthProvider with test children
      renderAuthProvider();

      // Assert: Logo is visible with correct attributes
      const logo = screen.getByAltText('紅樓慧讀');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('src', '/images/logo_circle.png');
      expect(logo).toHaveAttribute('width', '88');
      expect(logo).toHaveAttribute('height', '88');

      // Assert: Spinning ring container is present
      const container = logo.closest('div.relative');
      expect(container).toBeInTheDocument();

      // Assert: Children are NOT rendered during loading
      const childContent = screen.queryByTestId('child-content');
      expect(childContent).not.toBeInTheDocument();
    });

    /**
     * Test 1.2: Loading state disappears when authentication completes
     *
     * Behavior: When isLoading changes from true to false (status changes to 'authenticated'),
     * the loading UI should unmount and children should render.
     */
    it('should hide loading UI and render children when not loading', async () => {
      // Arrange: Mock NextAuth to return authenticated state
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

      // Mock successful profile fetch
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

      // Act: Render AuthProvider
      renderAuthProvider();

      // Assert: Loading UI is NOT visible
      const logo = screen.queryByAltText('紅樓慧讀');
      expect(logo).not.toBeInTheDocument();

      // Assert: Children ARE rendered
      const childContent = screen.getByTestId('child-content');
      expect(childContent).toBeInTheDocument();
      expect(childContent).toHaveTextContent('Test Content');
    });

    /**
     * Test 1.3: Image component uses correct source path
     *
     * Behavior: The Next.js Image component should point to the correct logo path.
     */
    it('should use correct logo image path', () => {
      // Arrange
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      // Act
      renderAuthProvider();

      // Assert: Image src is correct
      const logo = screen.getByAltText('紅樓慧讀');
      expect(logo).toHaveAttribute('src', '/images/logo_circle.png');
    });

    /**
     * Test 1.4: Image component has priority flag for optimization
     *
     * Behavior: Critical logo should have priority loading flag.
     * Note: The mock Image component receives the priority prop but doesn't
     * render it as an HTML attribute. We verify the component renders correctly.
     */
    it('should render logo image without errors when priority is set', () => {
      // Arrange
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      // Act & Assert: Should render without errors
      expect(() => renderAuthProvider()).not.toThrow();

      // Assert: Logo is rendered (priority prop is accepted by component)
      const logo = screen.getByAltText('紅樓慧讀');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('src', '/images/logo_circle.png');
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases - Unusual Conditions', () => {
    /**
     * Test 2.1: Loading UI persists on slow network
     *
     * Behavior: Loading state should remain visible if session loading is delayed.
     */
    it('should continue showing loading UI while session is loading', () => {
      // Arrange: Simulate extended loading time
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      // Act
      renderAuthProvider();

      // Assert: Logo remains visible
      const logo = screen.getByAltText('紅樓慧讀');
      expect(logo).toBeInTheDocument();
    });

    /**
     * Test 2.2: Component handles unauthenticated state correctly
     *
     * Behavior: When status is 'unauthenticated', loading UI should not show.
     */
    it('should not show loading UI when user is unauthenticated', () => {
      // Arrange
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });

      // Act
      renderAuthProvider();

      // Assert: Loading UI is hidden
      const logo = screen.queryByAltText('紅樓慧讀');
      expect(logo).not.toBeInTheDocument();

      // Assert: Children are rendered
      const childContent = screen.getByTestId('child-content');
      expect(childContent).toBeInTheDocument();
    });

    /**
     * Test 2.3: Component doesn't crash when session data is null
     *
     * Behavior: Null session data should be handled gracefully.
     */
    it('should handle null session data without crashing', () => {
      // Arrange
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      // Act & Assert: Should not throw
      expect(() => renderAuthProvider()).not.toThrow();

      // Assert: Loading UI is shown
      const logo = screen.getByAltText('紅樓慧讀');
      expect(logo).toBeInTheDocument();
    });
  });

  // ============================================================================
  // STYLING AND ANIMATION TESTS
  // ============================================================================

  describe('Styling and Animation - Visual Feedback', () => {
    /**
     * Test 3.1: Gradient spinner has animation class and proper sizing
     *
     * Behavior: The gradient spinner should include the 'animate-spin' Tailwind class.
     * Updated: Now uses pink gradient conic-gradient spinner with layered masking technique.
     */
    it('should apply animate-spin class to gradient spinner with proper sizing', () => {
      // Arrange
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      // Act
      const { container } = renderAuthProvider();

      // Assert: Find the spinning gradient div
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('relative', 'inline-block');

      // Assert: Spinner has proper size (128px)
      expect(spinner).toHaveStyle({ width: '128px', height: '128px' });

      // Assert: Spinner has proper accessibility attributes
      expect(spinner).toHaveAttribute('role', 'status');
      expect(spinner).toHaveAttribute('aria-label', '載入中');
    });

    /**
     * Test 3.1b: Spinner has performance optimization
     *
     * Behavior: The spinner should have willChange: transform for GPU optimization.
     */
    it('should apply willChange transform for performance optimization', () => {
      // Arrange
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      // Act
      const { container } = renderAuthProvider();

      // Assert: Find the spinner and check willChange style
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveStyle({ willChange: 'transform' });
    });

    /**
     * Test 3.2: Layout classes ensure centering
     *
     * Behavior: Container should use flex centering classes.
     */
    it('should apply flex centering classes to container', () => {
      // Arrange
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      // Act
      const { container } = renderAuthProvider();

      // Assert: Outer container has centering classes
      const outerContainer = container.querySelector('.flex.min-h-screen.items-center.justify-center');
      expect(outerContainer).toBeInTheDocument();
      // Container uses gradient background from-background
      expect(outerContainer).toHaveClass('bg-gradient-to-br', 'from-background');
    });

    /**
     * Test 3.3: Logo container has correct sizing
     *
     * Behavior: Logo container should be h-24 w-24 (96px) for balanced proportions.
     */
    it('should apply correct size classes to logo container', () => {
      // Arrange
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      // Act
      const { container } = renderAuthProvider();

      // Assert: Logo container has size classes (h-24 w-24 = 96px)
      const logoContainer = container.querySelector('.h-24.w-24');
      expect(logoContainer).toBeInTheDocument();
      expect(logoContainer).toHaveClass('rounded-full', 'relative', 'flex', 'items-center', 'justify-center');
    });

    /**
     * Test 3.4: Gradient spinner has layered structure
     *
     * Behavior: Spinner should have outer gradient circle and inner masking circle.
     */
    it('should have layered gradient structure for ring effect', () => {
      // Arrange
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      // Act
      const { container } = renderAuthProvider();

      // Assert: Spinner exists
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();

      // Assert: Outer gradient circle exists
      const outerGradient = spinner?.querySelector('.absolute.inset-0.rounded-full');
      expect(outerGradient).toBeInTheDocument();

      // Assert: Inner masking circle exists (creates ring effect)
      const innerMask = spinner?.querySelectorAll('.absolute.rounded-full')[1];
      expect(innerMask).toBeInTheDocument();
    });
  });

  // ============================================================================
  // ACCESSIBILITY TESTS
  // ============================================================================

  describe('Accessibility - Screen Reader Support', () => {
    /**
     * Test 4.1: Logo has descriptive alt text
     *
     * Behavior: Image alt attribute should be meaningful for screen readers.
     */
    it('should provide descriptive alt text for logo', () => {
      // Arrange
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      // Act
      renderAuthProvider();

      // Assert: Alt text is present and descriptive
      const logo = screen.getByAltText('紅樓慧讀');
      expect(logo).toBeInTheDocument();
      expect(logo.getAttribute('alt')).toBe('紅樓慧讀');
    });

    /**
     * Test 4.2: Logo is accessible via getByAltText query
     *
     * Behavior: Logo should be queryable by assistive technologies.
     */
    it('should be findable by alt text for accessibility', () => {
      // Arrange
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      // Act
      renderAuthProvider();

      // Assert: Logo is accessible
      expect(screen.getByAltText('紅樓慧讀')).toBeInTheDocument();
    });

    /**
     * Test 4.3: Image has correct dimensions for assistive tech
     *
     * Behavior: Width and height attributes help screen readers.
     */
    it('should have explicit width and height attributes', () => {
      // Arrange
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      // Act
      renderAuthProvider();

      // Assert: Dimensions are explicit (88x88)
      const logo = screen.getByAltText('紅樓慧讀');
      expect(logo).toHaveAttribute('width', '88');
      expect(logo).toHaveAttribute('height', '88');
    });
  });

  // ============================================================================
  // STATE TRANSITION TESTS
  // ============================================================================

  describe('State Transitions - Loading to Content', () => {
    /**
     * Test 5.1: Transition from loading to authenticated state
     *
     * Behavior: Component should smoothly transition between states.
     */
    it('should transition from loading to authenticated state', async () => {
      // Arrange: Start with loading state
      const { rerender } = render(
        <AuthProvider>
          <div data-testid="child-content">Test Content</div>
        </AuthProvider>
      );

      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      // Act: Initial render shows loading
      rerender(
        <AuthProvider>
          <div data-testid="child-content">Test Content</div>
        </AuthProvider>
      );

      let logo = screen.queryByAltText('紅樓慧讀');
      expect(logo).toBeInTheDocument();

      // Arrange: Change to authenticated state
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
      rerender(
        <AuthProvider>
          <div data-testid="child-content">Test Content</div>
        </AuthProvider>
      );

      // Assert: Loading UI is gone, children are visible
      await waitFor(() => {
        logo = screen.queryByAltText('紅樓慧讀');
        expect(logo).not.toBeInTheDocument();
      });

      const childContent = screen.getByTestId('child-content');
      expect(childContent).toBeInTheDocument();
    });
  });
});
