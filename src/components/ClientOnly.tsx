/**
 * @fileOverview ClientOnly Component
 * 
 * This component ensures that its children are only rendered on the client side,
 * preventing hydration mismatches when server and client rendering differ.
 * 
 * Use cases:
 * - Components that access browser-only APIs (window, document, localStorage)
 * - Dynamic content that changes between server and client
 * - Third-party widgets that modify DOM after loading
 * - Components that depend on user interaction state
 * 
 * This is a common pattern for handling hydration issues in Next.js applications.
 */

"use client";

import { useState, useEffect, ReactNode, useSyncExternalStore } from 'react';

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * ClientOnly Component
 * 
 * Renders children only after the component has mounted on the client side.
 * This prevents hydration errors by ensuring server and client render the same content initially.
 * 
 * @param children - Content to render only on client side
 * @param fallback - Optional content to show during server-side rendering
 * @returns JSX element that renders differently on server vs client
 */
export default function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  // Use useSyncExternalStore to detect client-side mounting without cascading renders
  const hasMounted = useSyncExternalStore(
    () => () => {}, // subscribe (no-op)
    () => true,      // getSnapshot (client)
    () => false      // getServerSnapshot (server)
  );

  // During server-side rendering and initial client render, show fallback
  if (!hasMounted) {
    return <>{fallback}</>;
  }

  // After hydration is complete, show actual children
  return <>{children}</>;
} 