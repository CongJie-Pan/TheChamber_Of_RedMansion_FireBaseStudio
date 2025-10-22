
/**
 * @fileOverview Authentication Context Provider for the Red Mansion platform.
 *
 * This context manages user authentication state throughout the application using Firebase Auth.
 * It provides:
 * - Current user state (logged in user or null)
 * - User level profile with XP and progression data
 * - Loading state during authentication checks
 * - Automatic state synchronization with Firebase authentication
 * - Profile refresh functionality for level updates
 * - Loading UI during initial authentication verification
 *
 * The context wraps the entire application and makes authentication data
 * available to all child components without prop drilling.
 *
 * Integration with Level System:
 * - Automatically loads user profile on authentication
 * - Initializes profile for new users
 * - Provides real-time level and XP data
 */

"use client"; // Required for client-side React hooks and Firebase auth

// Import Firebase authentication types and functions
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
// Firestore real-time updates
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
// Import React types and hooks for context management
import type { ReactNode } from 'react';
import { createContext, useEffect, useState, useCallback } from 'react';
// Import configured Firebase auth instance
import { auth, db } from '@/lib/firebase';
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
 */
interface AuthContextType {
  user: FirebaseUser | null; // Current authenticated user or null if not logged in
  userProfile: UserProfile | null; // User level profile or null if not loaded
  isLoading: boolean; // True during initial authentication check or state changes
  refreshUserProfile: () => Promise<void>; // Function to refresh user profile data
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
 * - Manages user authentication state with React hooks
 * - Loads and manages user level profile data
 * - Listens for Firebase auth state changes automatically
 * - Initializes new user profiles on first login
 * - Shows loading UI during initial authentication verification
 * - Provides the context value to all child components
 *
 * @param children - Child components that will receive the auth context
 */
export function AuthProvider({ children }: AuthProviderProps) {
  // State to store the current authenticated user (null if not logged in)
  const [user, setUser] = useState<FirebaseUser | null>(null);
  // State to store the user's level profile (null if not loaded)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  // State to track whether we're still checking authentication status
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load user profile from Firestore
   * Creates a new profile if user doesn't have one (new user)
   *
   * @param firebaseUser - Firebase authentication user object
   */
  const loadUserProfile = useCallback(async (firebaseUser: FirebaseUser) => {
    try {
      // Try to fetch existing profile
      let profile = await userLevelService.getUserProfile(firebaseUser.uid);

      // If no profile exists, initialize one for new user
      if (!profile) {
        console.log('🆕 New user detected, initializing profile...');
        profile = await userLevelService.initializeUserProfile(
          firebaseUser.uid,
          firebaseUser.displayName || 'User',
          firebaseUser.email || ''
        );
        console.log('✅ User profile initialized successfully');
      }

      setUserProfile(profile);
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
      // Set profile to null on error, but don't block authentication
      setUserProfile(null);
    }
  }, []);

  /**
   * Refresh user profile data from Firestore
   * Useful after XP awards or level-ups to update UI
   */
  const refreshUserProfile = useCallback(async () => {
    if (!user) {
      setUserProfile(null);
      return;
    }

    try {
      const profile = await userLevelService.getUserProfile(user.uid);
      setUserProfile(profile);
    } catch (error) {
      console.error('❌ Error refreshing user profile:', error);
    }
  }, [user]);

  /**
   * Effect to set up Firebase auth state listener
   *
   * Uses Firebase's onAuthStateChanged to automatically detect when:
   * - User logs in
   * - User logs out
   * - Authentication state is restored from previous session
   * - Authentication expires or fails
   *
   * When user logs in, also loads their level profile
   */
  useEffect(() => {
    // Set up listener for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser); // Update user state (null if logged out)

      if (firebaseUser) {
        // User is logged in, load their profile
        await loadUserProfile(firebaseUser);
      } else {
        // User is logged out, clear profile
        setUserProfile(null);
      }

      setIsLoading(false); // Authentication check complete
    });

    // Cleanup function: unsubscribe from listener when component unmounts
    return () => unsubscribe();
  }, [loadUserProfile]); // Depend on loadUserProfile callback

  /**
   * Real-time user profile subscription
   *
   * Subscribes to Firestore users/{uid} document updates so XP/level changes
   * are reflected immediately across the app without manual refresh.
   */
  useEffect(() => {
    if (!user) {
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubscribeProfile = onSnapshot(userRef, (snapshot) => {
      if (!snapshot.exists()) {
        setUserProfile(null);
        return;
      }

      const data = snapshot.data() as any;
      // Lightweight normalization for safety and backward-compatibility
      setUserProfile({
        uid: snapshot.id,
        ...data,
        completedChapters: Array.isArray(data.completedChapters) ? data.completedChapters : [],
        hasReceivedWelcomeBonus: data.hasReceivedWelcomeBonus ?? false,
        createdAt: data.createdAt || Timestamp.now(),
        updatedAt: data.updatedAt || Timestamp.now(),
        lastActivityAt: data.lastActivityAt || Timestamp.now(),
      });
    });

    return () => unsubscribeProfile();
  }, [user]);

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
