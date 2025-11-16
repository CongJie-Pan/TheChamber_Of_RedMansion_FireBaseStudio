'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

/**
 * React Query Provider for the application
 *
 * Configuration:
 * - staleTime: 60 seconds - Comments stay fresh for 1 minute
 * - cacheTime: 5 minutes - Comments cached for 5 minutes
 * - refetchOnWindowFocus: false - Avoid unnecessary refetches
 *
 * This enables instant comment loading through smart prefetching
 */
export function Providers({ children }: { children: ReactNode }) {
  // Create QueryClient instance with optimized config for comment prefetching
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data stays fresh for 1 minute (balanced approach)
            staleTime: 60 * 1000,
            // Cache persists for 5 minutes
            gcTime: 5 * 60 * 1000,
            // Don't refetch on window focus (avoid unnecessary API calls)
            refetchOnWindowFocus: false,
            // Retry failed requests once
            retry: 1,
            // Show cached data while revalidating in background
            refetchOnMount: 'always',
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
