/**
 * @fileOverview NextAuth.js Type Definitions
 *
 * This file extends the default NextAuth.js types to include custom user fields
 * from our application (user level, XP, etc.). This ensures type safety when
 * accessing session data throughout the application.
 *
 * TypeScript Declaration Merging:
 * - Extends the 'next-auth' module interfaces
 * - Adds custom fields to Session.user and JWT token
 * - Maintains full type safety for authentication data
 *
 * @phase Phase 4 - Authentication Replacement
 * @task SQLITE-019
 * @date 2025-10-30
 */

import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT, DefaultJWT } from 'next-auth/jwt';

/**
 * Extend the default Session interface
 *
 * Adds custom user fields to the session.user object.
 * These fields are populated in the session() callback in [...nextauth]/route.ts
 */
declare module 'next-auth' {
  /**
   * Extended Session interface with custom user profile data
   */
  interface Session {
    user: {
      /**
       * User ID from SQLite database
       * Maps to users.id column
       */
      id: string;

      /**
       * User email address
       * Required for authentication
       */
      email: string;

      /**
       * Username for display purposes
       * Maps to users.username column
       */
      name: string;

      /**
       * Current user level in the gamification system
       * Ranges from 0 to MAX_LEVEL (typically 7)
       */
      currentLevel: number;

      /**
       * Total accumulated XP across all levels
       * Used for leaderboards and progression tracking
       */
      totalXP: number;
    } & DefaultSession['user'];
  }

  /**
   * Extended User interface for authentication
   *
   * This is the user object returned from the authorize() function
   * in the Credentials provider.
   */
  interface User extends DefaultUser {
    /**
     * User ID from database
     */
    id: string;

    /**
     * User email address
     */
    email: string;

    /**
     * Username
     */
    name: string;

    /**
     * Current level (optional, added during authentication)
     */
    currentLevel?: number;

    /**
     * Total XP (optional, added during authentication)
     */
    totalXP?: number;
  }
}

/**
 * Extend the JWT interface
 *
 * Adds custom claims to the JWT token.
 * These claims are populated in the jwt() callback in [...nextauth]/route.ts
 */
declare module 'next-auth/jwt' {
  /**
   * Extended JWT interface with custom claims
   */
  interface JWT extends DefaultJWT {
    /**
     * User ID stored in JWT token
     * Allows quick user identification without database lookup
     */
    userId: string;

    /**
     * Username stored in JWT token
     */
    username: string;

    /**
     * User email stored in JWT token
     */
    email: string;

    /**
     * Current user level stored in JWT token
     * Note: This may become stale if user levels up in another session
     */
    currentLevel: number;

    /**
     * Total XP stored in JWT token
     * Note: This may become stale if user earns XP in another session
     */
    totalXP: number;
  }
}
