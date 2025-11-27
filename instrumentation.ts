/**
 * Next.js Instrumentation Hook - Phase 4-T1
 *
 * This file is automatically executed when the Next.js server starts.
 * Used to seed the guest test account in development mode.
 *
 * Documentation: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  console.log('🚀 [Instrumentation] register() called');
  console.log('🚀 [Instrumentation] NEXT_RUNTIME:', process.env.NEXT_RUNTIME);
  console.log('🚀 [Instrumentation] Running on server:', typeof window === 'undefined');

  // Only run on server side (both Node.js and Edge runtime)
  if (typeof window === 'undefined') {
    // Skip if running in Edge runtime (Turso client requires Node.js)
    if (process.env.NEXT_RUNTIME === 'edge') {
      console.log('⚠️ [Instrumentation] Skipping DB init in Edge runtime');
      return;
    }

    try {
      const { initializeDatabase } = await import('./src/lib/sqlite-db');
      await initializeDatabase();
      console.log('✅ [Instrumentation] Database initialized successfully');
    } catch (error) {
      console.error('❌ [Instrumentation] Failed to initialize database:', error);
      // Log but don't throw - individual routes will handle gracefully
    }
  } else {
    console.log('⚠️ [Instrumentation] Skipping DB init in browser environment');
  }
}
