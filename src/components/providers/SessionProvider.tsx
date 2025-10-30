/**
 * @fileOverview NextAuth Session Provider Wrapper
 *
 * This component provides a client-side wrapper for NextAuth.js SessionProvider.
 * It's necessary because NextAuth's SessionProvider must be a client component,
 * but Next.js 13+ App Router layouts are server components by default.
 *
 * Phase 4 - SQLITE-022: NextAuth.js integration with React Server Components
 *
 * @date 2025-10-30
 */

"use client"; // Required for NextAuth SessionProvider

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

interface SessionProviderProps {
  children: ReactNode;
}

/**
 * Session Provider Component
 *
 * Wraps the application with NextAuth.js SessionProvider to provide
 * authentication session data to all client components via useSession hook.
 *
 * @param children - Child components that need access to session data
 */
export function SessionProvider({ children }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider>
      {children}
    </NextAuthSessionProvider>
  );
}
