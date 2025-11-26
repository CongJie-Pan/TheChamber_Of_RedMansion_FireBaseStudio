/**
 * @fileOverview NextAuth.js Authentication Options Configuration
 *
 * This file contains the NextAuth.js configuration options, separated from
 * the route handler to comply with Next.js App Router conventions.
 *
 * Key features:
 * - Credentials provider with email/password authentication
 * - Guest/Anonymous login support
 * - Remember Me functionality with dynamic session duration
 * - JWT-based sessions (stateless, no database storage)
 * - bcrypt password verification
 * - Custom session callbacks with user profile data
 * - Integration with existing user-repository for SQLite queries
 *
 * Authentication flow:
 * 1. User submits email/password via login form
 * 2. authorize() function validates credentials against SQLite
 * 3. bcrypt verifies password hash
 * 4. JWT token created with user data
 * 5. Session established with dynamic expiry (24h or 30d if Remember Me)
 *
 * @phase Phase 4 - Authentication Replacement
 * @task SQLITE-019, SQLITE-021
 * @date 2025-10-30
 */

import { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import * as bcrypt from 'bcryptjs';
import { getUserByEmail, createGuestUser } from '@/lib/repositories/user-repository';

/**
 * Session duration constants
 */
const SESSION_DURATION_STANDARD = 24 * 60 * 60; // 24 hours in seconds
const SESSION_DURATION_REMEMBER_ME = 30 * 24 * 60 * 60; // 30 days in seconds

/**
 * NextAuth.js Configuration
 *
 * Defines authentication providers, session strategy, and callback functions
 * for managing user authentication and sessions.
 */
export const authOptions: NextAuthOptions = {
  // Session strategy: JWT (stateless, no database sessions)
  // maxAge is dynamically set in JWT callback based on Remember Me preference
  session: {
    strategy: 'jwt',
    maxAge: SESSION_DURATION_STANDARD, // Default: 24 hours
  },

  // Custom pages configuration (using existing login/register pages)
  pages: {
    signIn: '/login',
    // signUp not used by NextAuth, but our register page handles it
    // error: '/auth/error', // Optional: custom error page
  },

  // Authentication providers
  providers: [
    /**
     * Credentials Provider - Email/Password Login
     *
     * Handles email/password authentication with SQLite database verification.
     * Supports "Remember Me" functionality with extended session duration.
     */
    CredentialsProvider({
      id: 'credentials',
      name: 'Email and Password',

      // Credential fields displayed in default sign-in form (not used, we have custom UI)
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'your-email@example.com'
        },
        password: {
          label: 'Password',
          type: 'password'
        },
        rememberMe: {
          label: 'Remember Me',
          type: 'checkbox'
        },
      },

      /**
       * Authorization function
       *
       * Called when user submits login credentials.
       * Validates email/password against SQLite database.
       *
       * @param credentials - User-submitted email, password, and rememberMe flag
       * @returns User object if authentication successful, null otherwise
       */
      async authorize(credentials) {
        try {
          // Validate input
          if (!credentials?.email || !credentials?.password) {
            console.log('❌ [NextAuth Credentials] Missing email or password');
            return null;
          }

          const rememberMe = credentials.rememberMe === 'true';
          console.log(`🔍 [NextAuth Credentials] Attempting login for email: ${credentials.email} (Remember Me: ${rememberMe})`);

          // Query user from SQLite by email
          const user = await getUserByEmail(credentials.email.toLowerCase());

          if (!user) {
            console.log(`❌ [NextAuth Credentials] User not found: ${credentials.email}`);
            return null;
          }

          // Check if user has a password hash (should always exist for NextAuth users)
          if (!user.passwordHash) {
            console.log(`❌ [NextAuth Credentials] User ${user.userId} has no password hash`);
            return null;
          }

          // Verify password with bcrypt
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          );

          if (!isPasswordValid) {
            console.log(`❌ [NextAuth Credentials] Invalid password for user: ${credentials.email}`);
            return null;
          }

          // Authentication successful
          console.log(`✅ [NextAuth Credentials] Login successful for user: ${user.userId}`);

          // Return user object (will be passed to JWT callback)
          return {
            id: user.userId,
            email: user.email || '', // Ensure email is never null (NextAuth User type requires string)
            name: user.username,
            // Include additional user data for session
            currentLevel: user.currentLevel,
            totalXP: user.totalXP,
            isGuest: user.isGuest || false,
            rememberMe, // Pass Remember Me preference to JWT callback
          };

        } catch (error) {
          console.error('❌ [NextAuth Credentials] Authorization error:', error);
          return null;
        }
      },
    }),

    /**
     * Credentials Provider - Guest/Anonymous Login
     *
     * Creates temporary guest accounts for users who want to try the platform
     * without registering. Guest accounts are marked with isGuest flag.
     */
    CredentialsProvider({
      id: 'guest-credentials',
      name: 'Guest Login',

      // No credentials required for guest login
      credentials: {},

      /**
       * Authorization function for guest login
       *
       * Creates a new guest user in SQLite with auto-generated credentials.
       *
       * @returns Guest user object
       */
      async authorize() {
        try {
          console.log('🔍 [NextAuth Guest] Creating new guest account...');

          // Create guest user in SQLite
          const guestUser = await createGuestUser();

          console.log(`✅ [NextAuth Guest] Guest account created: ${guestUser.userId}`);

          // Return guest user object
          return {
            id: guestUser.userId,
            email: guestUser.email || '',
            name: guestUser.username,
            currentLevel: guestUser.currentLevel,
            totalXP: guestUser.totalXP,
            isGuest: true,
            rememberMe: false, // Guests don't get extended sessions
          };

        } catch (error) {
          console.error('❌ [NextAuth Guest] Guest login error:', error);
          return null;
        }
      },
    }),
  ],

  /**
   * Callback functions for session and JWT customization
   */
  callbacks: {
    /**
     * JWT Callback
     *
     * Called whenever a JWT is created or updated.
     * Adds custom claims to the JWT token and sets dynamic maxAge based on Remember Me.
     *
     * @param token - The JWT token
     * @param user - User object from authorize() (only on initial sign-in)
     * @param account - Account information (only on initial sign-in)
     * @param trigger - What caused this callback ('signIn', 'signUp', 'update')
     * @returns Modified JWT token with custom claims
     */
    async jwt({ token, user, account }) {
      // On initial sign-in, add user data to token
      if (user && account) {
        token.userId = user.id;
        token.email = user.email;
        token.username = user.name;
        token.currentLevel = (user as any).currentLevel || 0;
        token.totalXP = (user as any).totalXP || 0;
        token.isGuest = (user as any).isGuest || false;

        // Set session duration based on Remember Me preference
        const rememberMe = (user as any).rememberMe || false;
        const sessionDuration = rememberMe ? SESSION_DURATION_REMEMBER_ME : SESSION_DURATION_STANDARD;

        // Store rememberMe flag and session duration in token
        token.rememberMe = rememberMe;
        token.sessionDuration = sessionDuration;

        // Set token expiration time
        const now = Math.floor(Date.now() / 1000); // Current time in seconds
        token.exp = now + sessionDuration; // Token expiration time

        console.log(`✅ [NextAuth] JWT created for user: ${user.id} (Session: ${rememberMe ? '30 days' : '24 hours'}, Guest: ${token.isGuest})`);
      }

      return token;
    },

    /**
     * Session Callback
     *
     * Called whenever a session is accessed on the client.
     * Populates the session object with data from the JWT token.
     *
     * @param session - The session object
     * @param token - The JWT token containing user data
     * @returns Modified session object with user data
     */
    async session({ session, token }) {
      // Add user data from token to session
      if (token && session.user) {
        session.user.id = token.userId as string;
        session.user.email = token.email as string;
        session.user.name = token.username as string;
        (session.user as any).currentLevel = token.currentLevel;
        (session.user as any).totalXP = token.totalXP;
        (session.user as any).isGuest = token.isGuest || false;
      }

      return session;
    },
  },

  /**
   * Event handlers for authentication events
   */
  events: {
    /**
     * Sign In Event
     * Triggered when user successfully signs in
     */
    async signIn({ user }) {
      console.log(`🎉 [NextAuth] User signed in: ${user.id} (${user.email})`);
    },

    /**
     * Sign Out Event
     * Triggered when user signs out
     */
    async signOut({ token }) {
      console.log(`👋 [NextAuth] User signed out: ${(token as any)?.userId || 'unknown'}`);
    },
  },

  /**
   * Enable debug mode in development for detailed logs
   */
  debug: process.env.NODE_ENV === 'development',
};
