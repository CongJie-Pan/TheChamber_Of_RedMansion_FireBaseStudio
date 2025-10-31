/**
 * @fileOverview AuthContext Loading Flow Integration Test Suite
 *
 * End-to-end integration tests for authentication loading workflows including:
 * - First-time user authentication with loading state
 * - Returning user session restoration
 * - Session expiration handling
 * - Network failure recovery
 * - Concurrent authentication checks
 *
 * Test Categories:
 * 1. Critical User Journeys - Complete authentication flows
 * 2. Error Handling - Network failures, API errors, timeouts
 * 3. Concurrent Operations - Multi-tab scenarios
 * 4. Performance Characteristics - Loading time validation
 *
 * Following Google's Integration Testing Best Practices:
 * - Test realistic end-to-end workflows
 * - Verify interactions between components/services
 * - Use production-like test data
 * - Test failure modes comprehensively
 * - Ensure tests are isolated and independent
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Import components being tested
import { AuthProvider, AuthContext } from '@/context/AuthContext';

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

// Import mocked modules for type safety
import { useSession } from 'next-auth/react';

// Mock fetch globally
global.fetch = jest.fn();

/**
 * Test child component that consumes AuthContext
 * Allows us to verify context values in integration tests
 */
const TestConsumer: React.FC = () => {
  const { user, userProfile, isLoading } = React.useContext(AuthContext);

  return (
    <div>
      <div data-testid="loading-state">{isLoading ? 'loading' : 'ready'}</div>
      <div data-testid="user-state">{user ? user.name : 'no-user'}</div>
      <div data-testid="profile-state">{userProfile ? `level-${userProfile.level}` : 'no-profile'}</div>
    </div>
  );
};

describe('AuthContext Loading Flow - Integration Tests', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ============================================================================
  // CRITICAL USER JOURNEYS
  // ============================================================================

  describe('Journey 1: First-time user authentication', () => {
    /**
     * Complete flow from unauthenticated to authenticated with profile loading
     *
     * Steps:
     * 1. User arrives → NextAuth checks session → isLoading = true
     * 2. Loading UI displays (logo + ring)
     * 3. No session found → isLoading = false
     * 4. User logs in successfully
     * 5. Session created → profile fetched
     * 6. Dashboard renders
     */
    it('should show loading UI during initial authentication check', async () => {
      // Arrange: Mock initial loading state
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      // Act: Render AuthProvider
      const { rerender } = render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      // Assert: Loading UI is visible
      const logo = screen.getByAltText('紅樓慧讀');
      expect(logo).toBeInTheDocument();

      // Assert: TestConsumer is NOT rendered during loading (children are hidden)
      const loadingState = screen.queryByTestId('loading-state');
      expect(loadingState).not.toBeInTheDocument();

      // Arrange: Simulate successful login
      const mockUser = {
        id: 'new-user-123',
        name: 'New User',
        email: 'newuser@example.com',
      };

      (useSession as jest.Mock).mockReturnValue({
        data: { user: mockUser },
        status: 'authenticated',
        update: jest.fn(),
      });

      // Mock profile API responses (new user - 404 then successful creation)
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => ({ error: 'Profile not found' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            profile: {
              userId: mockUser.id,
              displayName: mockUser.name,
              level: 1,
              xp: 0,
              totalXp: 0,
            },
          }),
        });

      // Act: Rerender with authenticated state
      await act(async () => {
        rerender(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        );
      });

      // Assert: Loading UI is hidden
      await waitFor(() => {
        const logoAfter = screen.queryByAltText('紅樓慧讀');
        expect(logoAfter).not.toBeInTheDocument();
      });

      // Assert: User is authenticated
      await waitFor(() => {
        const userState = screen.getByTestId('user-state');
        expect(userState).toHaveTextContent('New User');
      });

      // Assert: Profile was created and loaded
      await waitFor(() => {
        const profileState = screen.getByTestId('profile-state');
        expect(profileState).toHaveTextContent('level-1');
      });

      // Assert: Profile API was called twice (fetch attempt + creation)
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should not show flash of unauthenticated content (FOUC)', () => {
      // Arrange: Mock loading state
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      // Act
      render(
        <AuthProvider>
          <div data-testid="protected-content">Protected Dashboard</div>
        </AuthProvider>
      );

      // Assert: Protected content is NOT visible during loading
      const protectedContent = screen.queryByTestId('protected-content');
      expect(protectedContent).not.toBeInTheDocument();

      // Assert: Loading UI IS visible
      const logo = screen.getByAltText('紅樓慧讀');
      expect(logo).toBeInTheDocument();
    });
  });

  describe('Journey 2: Returning user with valid session', () => {
    /**
     * Fast authentication for users with existing session
     *
     * Steps:
     * 1. User returns → NextAuth restores session from cookie
     * 2. Loading UI displays briefly
     * 3. Session validated → profile loaded
     * 4. Dashboard renders immediately
     */
    it('should quickly restore session and load profile for returning user', async () => {
      // Arrange: Mock authenticated session (restored from cookie)
      const mockUser = {
        id: 'returning-user-456',
        name: 'Returning User',
        email: 'returning@example.com',
      };

      (useSession as jest.Mock).mockReturnValue({
        data: { user: mockUser },
        status: 'authenticated',
        update: jest.fn(),
      });

      // Mock profile API response (existing user)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          profile: {
            userId: mockUser.id,
            displayName: mockUser.name,
            level: 5,
            xp: 1200,
            totalXp: 3500,
          },
        }),
      });

      // Act: Render AuthProvider
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      // Assert: Loading UI should not be visible (status is 'authenticated', not 'loading')
      const logo = screen.queryByAltText('紅樓慧讀');
      expect(logo).not.toBeInTheDocument();

      // Assert: User profile loads successfully
      await waitFor(() => {
        const profileState = screen.getByTestId('profile-state');
        expect(profileState).toHaveTextContent('level-5');
      });

      // Assert: Profile API called only once (no creation needed)
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/user/profile?userId=${mockUser.id}`)
      );
    });

    it('should not make unnecessary API calls for returning user', async () => {
      // Arrange
      const mockUser = {
        id: 'efficient-user-789',
        name: 'Efficient User',
        email: 'efficient@example.com',
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
            level: 3,
            xp: 500,
            totalXp: 1500,
          },
        }),
      });

      // Act
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      // Wait for profile to load
      await waitFor(() => {
        const profileState = screen.getByTestId('profile-state');
        expect(profileState).toHaveTextContent('level-3');
      });

      // Assert: Only one API call (profile fetch, no creation)
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Journey 3: Session expiration during use', () => {
    /**
     * Handling session timeout while user is active
     *
     * Steps:
     * 1. User is authenticated
     * 2. Session expires (timeout)
     * 3. NextAuth detects expiration
     * 4. User data cleared
     * 5. Redirect to login
     */
    it('should clear user data when session expires', async () => {
      // Arrange: Start with authenticated user
      const mockUser = {
        id: 'expiring-user-123',
        name: 'Expiring User',
        email: 'expiring@example.com',
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
            level: 2,
            xp: 300,
            totalXp: 800,
          },
        }),
      });

      // Act: Initial render with authenticated user
      const { rerender } = render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      // Assert: User is authenticated
      await waitFor(() => {
        const userState = screen.getByTestId('user-state');
        expect(userState).toHaveTextContent('Expiring User');
      });

      // Arrange: Simulate session expiration
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });

      // Act: Rerender with expired session
      await act(async () => {
        rerender(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        );
      });

      // Assert: User data is cleared
      await waitFor(() => {
        const userState = screen.getByTestId('user-state');
        expect(userState).toHaveTextContent('no-user');
      });

      await waitFor(() => {
        const profileState = screen.getByTestId('profile-state');
        expect(profileState).toHaveTextContent('no-profile');
      });
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe('Journey 4: Network failure during profile fetch', () => {
    /**
     * Graceful degradation when API fails
     *
     * Steps:
     * 1. User authenticates successfully
     * 2. Profile API fetch fails (500 error)
     * 3. Error handled gracefully
     * 4. User proceeds with null profile
     */
    it('should handle profile fetch failure gracefully', async () => {
      // Arrange: Mock authenticated user
      const mockUser = {
        id: 'error-user-123',
        name: 'Error User',
        email: 'error@example.com',
      };

      (useSession as jest.Mock).mockReturnValue({
        data: { user: mockUser },
        status: 'authenticated',
        update: jest.fn(),
      });

      // Mock API failure
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      // Spy on console.error to verify error is logged
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      // Assert: User is authenticated despite profile error
      await waitFor(() => {
        const userState = screen.getByTestId('user-state');
        expect(userState).toHaveTextContent('Error User');
      });

      // Assert: Profile is null (error handled)
      await waitFor(() => {
        const profileState = screen.getByTestId('profile-state');
        expect(profileState).toHaveTextContent('no-profile');
      });

      // Assert: Error was logged
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Error loading user profile'),
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });

    it('should handle API 500 error without crashing', async () => {
      // Arrange
      const mockUser = {
        id: 'server-error-user-456',
        name: 'Server Error User',
        email: 'server@example.com',
      };

      (useSession as jest.Mock).mockReturnValue({
        data: { user: mockUser },
        status: 'authenticated',
        update: jest.fn(),
      });

      // Mock 500 error
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      });

      // Spy on console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Act & Assert: Should not throw
      expect(() => {
        render(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        );
      }).not.toThrow();

      // Assert: Component still renders
      await waitFor(() => {
        const userState = screen.getByTestId('user-state');
        expect(userState).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });

    it('should handle profile creation failure for new users', async () => {
      // Arrange: New user (profile doesn't exist)
      const mockUser = {
        id: 'new-error-user-789',
        name: 'New Error User',
        email: 'newerror@example.com',
      };

      (useSession as jest.Mock).mockReturnValue({
        data: { user: mockUser },
        status: 'authenticated',
        update: jest.fn(),
      });

      // Mock profile fetch failure (404) then creation failure
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => ({ error: 'Profile not found' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Failed to create profile' }),
        });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      // Assert: User is still authenticated
      await waitFor(() => {
        const userState = screen.getByTestId('user-state');
        expect(userState).toHaveTextContent('New Error User');
      });

      // Assert: Profile creation was attempted but failed
      await waitFor(() => {
        const profileState = screen.getByTestId('profile-state');
        expect(profileState).toHaveTextContent('no-profile');
      });

      // Assert: Both API calls were made
      expect(global.fetch).toHaveBeenCalledTimes(2);

      consoleErrorSpy.mockRestore();
    });
  });

  // ============================================================================
  // CONCURRENT OPERATIONS
  // ============================================================================

  describe('Journey 5: Concurrent authentication checks', () => {
    /**
     * Multiple components rendering simultaneously
     *
     * Ensures consistent state and no race conditions
     */
    it('should handle multiple AuthProvider renders without race conditions', async () => {
      // Arrange: Mock authenticated user
      const mockUser = {
        id: 'concurrent-user-123',
        name: 'Concurrent User',
        email: 'concurrent@example.com',
      };

      (useSession as jest.Mock).mockReturnValue({
        data: { user: mockUser },
        status: 'authenticated',
        update: jest.fn(),
      });

      // Mock profile API
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          profile: {
            userId: mockUser.id,
            displayName: mockUser.name,
            level: 4,
            xp: 800,
            totalXp: 2000,
          },
        }),
      });

      // Act: Render multiple times rapidly
      const { rerender } = render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      rerender(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      rerender(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      // Assert: Profile loads correctly despite multiple renders
      await waitFor(() => {
        const profileState = screen.getByTestId('profile-state');
        expect(profileState).toHaveTextContent('level-4');
      });

      // Note: API might be called multiple times due to effect cleanup
      // but final state should be consistent
      const profileState = screen.getByTestId('profile-state');
      expect(profileState).toHaveTextContent('level-4');
    });
  });

  // ============================================================================
  // DATA FLOW VERIFICATION
  // ============================================================================

  describe('Data Flow - Cross-boundary verification', () => {
    /**
     * Verify data flows correctly through context
     */
    it('should provide correct context values to consumers', async () => {
      // Arrange
      const mockUser = {
        id: 'context-user-123',
        name: 'Context User',
        email: 'context@example.com',
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
            level: 7,
            xp: 2500,
            totalXp: 5000,
          },
        }),
      });

      // Act
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      // Assert: All context values are correct
      await waitFor(() => {
        const loadingState = screen.getByTestId('loading-state');
        const userState = screen.getByTestId('user-state');
        const profileState = screen.getByTestId('profile-state');

        expect(loadingState).toHaveTextContent('ready');
        expect(userState).toHaveTextContent('Context User');
        expect(profileState).toHaveTextContent('level-7');
      });
    });
  });
});
