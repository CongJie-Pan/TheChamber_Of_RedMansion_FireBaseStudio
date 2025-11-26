/**
 * @fileOverview NextAuth.js API Route Handler
 *
 * This file exports the NextAuth.js route handlers for Next.js App Router.
 * The authentication configuration is defined in src/lib/auth-options.ts
 * to comply with Next.js App Router conventions.
 *
 * @phase Phase 4 - Authentication Replacement
 * @task SQLITE-019, SQLITE-021
 * @date 2025-10-30
 */

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth-options';

/**
 * NextAuth.js Route Handler
 *
 * Export GET and POST handlers for Next.js App Router API routes
 */
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
