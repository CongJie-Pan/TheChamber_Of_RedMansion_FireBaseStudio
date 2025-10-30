
/**
 * @fileOverview Authentication Context Provider for the Red Mansion platform.
 *
 * This context manages user authentication state throughout the application using NextAuth.js.
 * It provides:
 * - Current user state from NextAuth session
 * - User level profile with XP and progression data from SQLite
 * - Loading state during authentication checks
 * - Automatic state synchronization with NextAuth session
 * - Profile refresh functionality for level updates
 * - Loading UI during initial authentication verification
 *
 * The context wraps the entire application and makes authentication data
 * available to all child components without prop drilling.
 *
 * Integration with Level System:
 * - Automatically loads user profile from SQLite on authentication
 * - Initializes profile for new users
 * - Provides level and XP data from SQLite database
 *
 * Phase 4 - SQLITE-022: Migrated from Firebase Auth to NextAuth.js
 */

"use client"; // Required for client-side React hooks and NextAuth

// Import NextAuth types and hooks
import { useSession } from 'next-auth/react';
import type { Session } from 'next-auth';
// Import React types and hooks for context management
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
// Import UI component for loading state display
import { Skeleton } from '@/components/ui/skeleton';
// Import level system types and service
import type { UserProfile } from '@/lib/types/user-level';
import { userLevelService } from '@/lib/user-level-service';

/**
 * Type definition for the authentication context value
 *
 * Defines the shape of data available to components that consume this context
 * Extended to include user profile data from the level system
 *
 * Phase 4 - SQLITE-022: Updated to use NextAuth Session instead of FirebaseUser
 */
interface AuthContextType {
  user: Session['user'] | null; // Current authenticated user from NextAuth session
  userProfile: UserProfile | null; // User level profile from SQLite or null if not loaded
  isLoading: boolean; // True during initial authentication check or state changes
  refreshUserProfile: () => Promise<void>; // Function to refresh user profile data from SQLite
}

/**
 * Authentication Context
 *
 * Provides authentication state to the entire application.
 * Default values ensure the context works even before the provider is initialized.
 */
export const AuthContext = createContext<AuthContextType>({
  user: null, // Default to no user
  userProfile: null, // Default to no profile
  isLoading: true, // Default to loading state
  refreshUserProfile: async () => {}, // Default no-op function
});

/**
 * Props for the AuthProvider component
 */
interface AuthProviderProps {
  children: ReactNode; // Child components that will receive auth context
}

/**
 * Authentication Provider Component
 *
 * This component wraps the entire application and provides authentication state
 * to all child components. It:
 * - Manages user authentication state via NextAuth useSession hook
 * - Loads and manages user level profile data from SQLite
 * - Listens for NextAuth session changes automatically
 * - Initializes new user profiles on first login
 * - Shows loading UI during initial authentication verification
 * - Provides the context value to all child components
 *
 * Phase 4 - SQLITE-022: Migrated from Firebase to NextAuth.js + SQLite
 *
 * @param children - Child components that will receive the auth context
 */
export function AuthProvider({ children }: AuthProviderProps) {
  // Get NextAuth session data (replaces Firebase onAuthStateChanged)
  const { data: session, status } = useSession();

  // State to store the user's level profile from SQLite (null if not loaded)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Derive user and loading state from NextAuth session
  const user = session?.user || null;
  const isLoading = status === 'loading';

  /**
   * Load user profile from SQLite
   * Creates a new profile if user doesn't have one (new user)
   *
   * Phase 4 - SQLITE-022: Loads from SQLite instead of Firestore
   *
   * @param userId - NextAuth user ID
   * @param username - User's display name
   * @param email - User's email address
   */
  const loadUserProfile = useCallback(async (userId: string, username: string, email: string) => {
    try {
      // Try to fetch existing profile from SQLite
      let profile = await userLevelService.getUserProfile(userId);

      // If no profile exists, initialize one for new user
      if (!profile) {
        console.log('🆕 [AuthContext] New user detected, initializing profile...');
        profile = await userLevelService.initializeUserProfile(
          userId,
          username,
          email
        );
        console.log('✅ [AuthContext] User profile initialized successfully');
      }

      setUserProfile(profile);
    } catch (error) {
      console.error('❌ [AuthContext] Error loading user profile:', error);
      // Set profile to null on error, but don't block authentication
      setUserProfile(null);
    }
  }, []);

  /**
   * Refresh user profile data from SQLite
   * Useful after XP awards or level-ups to update UI
   *
   * Phase 4 - SQLITE-022: Refreshes from SQLite instead of Firestore
   */
  const refreshUserProfile = useCallback(async () => {
    if (!user?.id) {
      setUserProfile(null);
      return;
    }

    try {
      const profile = await userLevelService.getUserProfile(user.id);
      setUserProfile(profile);
    } catch (error) {
      console.error('❌ [AuthContext] Error refreshing user profile:', error);
    }
  }, [user]);

  /**
   * Effect to load user profile when session changes
   *
   * Replaces Firebase onAuthStateChanged listener
   * Automatically detects when:
   * - User logs in (session becomes available)
   * - User logs out (session becomes null)
   * - Session is restored from cookie
   */
  useEffect(() => {
    if (user?.id) {
      // User is logged in, load their profile from SQLite
      const username = user.name || 'User';
      const email = user.email || '';
      loadUserProfile(user.id, username, email);
    } else {
      // User is logged out, clear profile
      setUserProfile(null);
    }
  }, [user, loadUserProfile]);

  /**
   * Loading state UI
   * 
   * Displays a full-screen loading interface with skeleton components
   * while Firebase verifies authentication status. This prevents flash
   * of unauthenticated content and provides better user experience.
   */
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 p-8 rounded-lg shadow-xl bg-card w-full max-w-md">
          <Skeleton className="h-12 w-1/2 mx-auto" />
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  /**
   * Provider component that makes authentication state available to all children
   *
   * The value object contains:
   * - user: Firebase authentication user
   * - userProfile: User level profile with XP and progression data
   * - isLoading: Loading state indicator
   * - refreshUserProfile: Function to refresh profile data
   *
   * These can be accessed by any child component using the useAuth hook.
   */
  return (
    <AuthContext.Provider value={{ user, userProfile, isLoading, refreshUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
