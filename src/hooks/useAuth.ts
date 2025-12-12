/**
 * @fileOverview Enhanced Authentication Hook
 *
 * This hook provides a comprehensive interface for accessing authentication state and
 * performing authentication operations throughout the application.
 *
 * Key Features:
 * - Centralized authentication state access via NextAuth.js
 * - Built-in error handling with internationalization
 * - Type-safe authentication operations
 * - User profile management with SQLite
 * - Simplified component integration
 *
 * Features:
 * - User profile display helpers
 * - Logout functionality
 * - User level and XP data access
 *
 * Phase 4 - SQLITE-022: Migrated from Firebase to NextAuth.js
 */

"use client"; // Required for React hooks in client components

// Import React hooks for context and state management
import { useContext } from 'react';
// Import NextAuth signOut method
import { signOut } from 'next-auth/react';
// Import NextAuth session type
import type { Session } from 'next-auth';
// Import the AuthContext to access authentication state
import { AuthContext } from '@/context/AuthContext';
// Import language hook for error messages
import { useLanguage } from '@/hooks/useLanguage';
// Import guest account detection utility
import { isGuestAccount } from '@/lib/middleware/guest-account';

/**
 * Enhanced Authentication Hook
 *
 * This hook provides comprehensive authentication functionality including
 * authentication state access, user profile data, and logout functionality.
 *
 * Phase 4 - SQLITE-022: Refactored to use NextAuth.js instead of Firebase
 *
 * @returns {object} Object containing:
 *   - user: Current authenticated user from NextAuth session (Session['user'] | null)
 *   - userProfile: User level profile from SQLite with XP data (UserProfile | null)
 *   - isLoading: Boolean indicating authentication verification state
 *   - refreshUserProfile: Function to refresh user profile data from SQLite
 *   - logout: Function to sign out current user using NextAuth
 *   - getUserDisplayInfo: Function to get formatted user information
 *
 * @throws {Error} If used outside of an AuthProvider component
 */
export function useAuth() {
  // Access the authentication context using React's useContext hook
  const context = useContext(AuthContext);
  const { t } = useLanguage();

  // Validation: Ensure the hook is used within an AuthProvider
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  /**
   * User Logout
   *
   * Signs out the current user using NextAuth and clears authentication state.
   * Redirects to the home page after logout.
   *
   * Phase 4 - SQLITE-022: Updated to use NextAuth signOut instead of Firebase
   *
   * @returns {Promise<void>}
   */
  const logout = async (): Promise<void> => {
    try {
      console.log('🚪 [useAuth] Logging out user...');

      // Clear AI Q&A records for guest accounts on logout
      // This ensures guest users start fresh each session
      if (context.userProfile?.isGuest || isGuestAccount(context.user?.id)) {
        console.log('🧹 [useAuth] Guest user detected, clearing AI Q&A records...');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('redmansion_qa_sessions_v1');
          localStorage.removeItem('redmansion_qa_conversations');
          console.log('✅ [useAuth] AI Q&A records cleared for guest user');
        }
      }

      await signOut({ callbackUrl: '/' });
    } catch (error) {
      console.error('❌ [useAuth] Logout error:', error);
      throw new Error(t('auth.errorLogout'));
    }
  };

  /**
   * Get Formatted User Display Information
   *
   * Extracts and formats user information for display purposes.
   * Handles cases where user information might be incomplete.
   *
   * Phase 4 - SQLITE-022: Updated to work with NextAuth Session user type
   *
   * @param user - NextAuth user object (optional, defaults to current user from context)
   * @returns {object} Formatted user display information
   */
  const getUserDisplayInfo = (user?: Session['user']) => {
    const currentUser = user || context.user;

    if (!currentUser) {
      return {
        displayName: t('user.guest'),
        email: '',
        photoURL: '',
        initials: 'G',
        isGuest: false,
        provider: 'none',
        id: ''
      };
    }

    // Check if this is a guest user (from userProfile or email pattern)
    const isGuestUser = context.userProfile?.isGuest || currentUser.email?.includes('@redmansion.local');

    if (isGuestUser) {
      return {
        displayName: t('user.redMansionGuest'),
        email: '',
        photoURL: '',
        initials: '客',
        isGuest: true,
        provider: 'guest',
        id: currentUser.id || ''
      };
    }

    // TASK-001: Prioritize displayName from userProfile (SQLite) over session name
    const displayName = context.userProfile?.displayName ||
                       currentUser.name ||
                       currentUser.email?.split('@')[0] ||
                       t('user.anonymous');

    const initials = displayName
      .split(' ')
      .map(name => name.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);

    return {
      displayName,
      email: currentUser.email || '',
      photoURL: currentUser.image || '',
      initials,
      isGuest: false,
      provider: 'credentials',
      id: currentUser.id || ''
    };
  };

  /**
   * Return authentication state and methods
   *
   * Phase 4 - SQLITE-022: Removed Firebase authentication methods
   * Login/Register pages now call NextAuth directly
   */
  return {
    user: context.user,                              // Current user from NextAuth session
    userProfile: context.userProfile,                // User level profile with XP data from SQLite
    isLoading: context.isLoading,                    // Authentication verification state
    refreshUserProfile: context.refreshUserProfile,  // Refresh profile after XP awards
    logout,                                          // Sign out using NextAuth
    getUserDisplayInfo                               // Get formatted user display information
  };
}
