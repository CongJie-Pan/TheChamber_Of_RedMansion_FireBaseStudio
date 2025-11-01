
/**
 * @fileOverview Main Application Layout Component
 * 
 * This layout component serves as the protected area wrapper for all authenticated
 * application pages. It provides authentication guards, route protection, and
 * adaptive layout rendering based on the current page context.
 * 
 * Key responsibilities:
 * - Authentication state management and route protection
 * - Conditional layout rendering based on page requirements
 * - Seamless navigation between different application areas
 * - Consistent theming and styling across protected routes
 * 
 * Layout variations:
 * 1. Default Layout: Uses AppShell with sidebar navigation for most pages
 * 2. Immersive Layout: Full-screen layout for reading experience without distractions
 * 
 * Authentication flow:
 * - Monitors user authentication state via useAuth hook
 * - Automatically redirects unauthenticated users to login page
 * - Provides loading states during authentication checks
 * - Ensures secure access to protected application features
 * 
 * This component implements the security boundary between public and private
 * areas of the application while providing optimal user experience for different
 * use cases within the learning platform.
 */

"use client"; // Required for client-side authentication and routing

// React type definitions and hooks
import type { ReactNode } from 'react';
import { useEffect } from 'react';

// Next.js navigation hooks for routing and path detection
import { usePathname, useRouter } from 'next/navigation';

// Layout components for different page contexts
import { AppShell } from '@/components/layout/AppShell';

// Custom hooks for authentication state management
import { useAuth } from '@/hooks/useAuth';
import { AuthLoadingScreen } from '@/context/AuthContext';

// Utility functions (imported but not used in this component)
import { cn } from '@/lib/utils';

/**
 * Main Application Layout Component
 * 
 * Provides protected routing and adaptive layout for authenticated users.
 * Chooses appropriate layout structure based on current page requirements.
 * 
 * @param children - React child components to render within the layout
 * @returns Conditional layout structure based on authentication state and current page
 */
export default function MainAppLayout({ children }: { children: ReactNode }) {
  // Authentication state from custom hook
  const { user, isLoading } = useAuth();
  
  // Next.js navigation and routing hooks
  const router = useRouter();
  const pathname = usePathname();

  /**
   * Authentication Guard Effect
   * 
   * Monitors authentication state and redirects unauthenticated users
   * to the login page. Only runs after initial loading is complete
   * to avoid premature redirects during app initialization.
   */
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login'); // Redirect to login for unauthenticated users without history stacking
    }
  }, [user, isLoading, router]);

  /**
   * Loading State Handler
   * 
   * Returns null during authentication loading or when user is not authenticated
   * to prevent flash of unauthenticated content and provide smooth transitions.
   */
  if (isLoading || !user) {
    if (isLoading) {
      return <AuthLoadingScreen />;
    }

    return (
      <AuthLoadingScreen
        message="Redirecting to login..."
        subMessage="Please wait while we route you to the login page to continue your journey."
      />
    );
  }

  // Determine current page context for layout selection
  const isReadBookPage = pathname === '/read-book';

  if (isReadBookPage) {
    /**
     * Immersive Reading Layout
     * 
     * Provides a distraction-free, full-screen reading experience
     * without sidebar navigation or other interface elements.
     * Optimized for focused literature study and AI-assisted reading.
     */
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        <main className="flex-1 overflow-hidden h-full">
          {children}
        </main>
      </div>
    );
  } else {
    /**
     * Standard Application Layout
     * 
     * Uses AppShell component which provides:
     * - Collapsible sidebar navigation
     * - Header with user controls and breadcrumbs
     * - Main content area with consistent padding and scrolling
     * - Responsive design for different screen sizes
     */
    return <AppShell>{children}</AppShell>;
  }
}
