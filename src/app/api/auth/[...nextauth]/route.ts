/**
 * @fileOverview NextAuth.js API Route Handler
 *
 * This file configures NextAuth.js for email/password authentication with SQLite.
 * Replaces Firebase Authentication as part of Phase 4 migration.
 *
 * Key features:
 * - Credentials provider with email/password authentication
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
 * 5. Session established with 24-hour expiry
 *
 * @phase Phase 4 - Authentication Replacement
 * @task SQLITE-019
 * @date 2025-10-30
 */

import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import * as bcrypt from 'bcryptjs';
import { getUserByEmail } from '@/lib/repositories/user-repository';

/**
 * NextAuth.js Configuration
 *
 * Defines authentication providers, session strategy, and callback functions
 * for managing user authentication and sessions.
 */
export const authOptions: NextAuthOptions = {
  // Session strategy: JWT (stateless, no database sessions)
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours in seconds
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
     * Credentials Provider
     *
     * Handles email/password authentication with SQLite database verification
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
      },

      /**
       * Authorization function
       *
       * Called when user submits login credentials.
       * Validates email/password against SQLite database.
       *
       * @param credentials - User-submitted email and password
       * @returns User object if authentication successful, null otherwise
       */
      async authorize(credentials) {
        try {
          // Validate input
          if (!credentials?.email || !credentials?.password) {
            console.log('❌ [NextAuth] Missing email or password');
            return null;
          }

          console.log(`🔍 [NextAuth] Attempting login for email: ${credentials.email}`);

          // Query user from SQLite by email
          const user = await getUserByEmail(credentials.email.toLowerCase());

          if (!user) {
            console.log(`❌ [NextAuth] User not found: ${credentials.email}`);
            return null;
          }

          // Check if user has a password hash (should always exist for NextAuth users)
          if (!user.passwordHash) {
            console.log(`❌ [NextAuth] User ${user.userId} has no password hash`);
            return null;
          }

          // Verify password with bcrypt
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          );

          if (!isPasswordValid) {
            console.log(`❌ [NextAuth] Invalid password for user: ${credentials.email}`);
            return null;
          }

          // Authentication successful
          console.log(`✅ [NextAuth] Login successful for user: ${user.userId}`);

          // Return user object (will be passed to JWT callback)
          return {
            id: user.userId,
            email: user.email || '', // Ensure email is never null (NextAuth User type requires string)
            name: user.username,
            // Include additional user data for session
            currentLevel: user.currentLevel,
            totalXP: user.totalXP,
          };

        } catch (error) {
          console.error('❌ [NextAuth] Authorization error:', error);
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
     * Adds custom claims to the JWT token.
     *
     * @param token - The JWT token
     * @param user - User object from authorize() (only on initial sign-in)
     * @param account - Account information (only on initial sign-in)
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

        console.log(`✅ [NextAuth] JWT created for user: ${user.id}`);
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
    async signIn({ user, account, profile, isNewUser }) {
      console.log(`🎉 [NextAuth] User signed in: ${user.id} (${user.email})`);
    },

    /**
     * Sign Out Event
     * Triggered when user signs out
     */
    async signOut({ token, session }) {
      console.log(`👋 [NextAuth] User signed out: ${(token as any)?.userId || 'unknown'}`);
    },
  },

  /**
   * Enable debug mode in development for detailed logs
   */
  debug: process.env.NODE_ENV === 'development',
};

/**
 * NextAuth.js Route Handler
 *
 * Export GET and POST handlers for Next.js App Router API routes
 */
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
