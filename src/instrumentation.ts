/**
 * Next.js Instrumentation Hook
 *
 * This file provides **best-effort** startup initialization for the database.
 * Due to known issues with instrumentation hooks in serverless environments
 * (particularly Vercel), this may not reliably execute on every cold start.
 *
 * **Fallback Strategy**: The database client uses lazy initialization in
 * getDatabase() if this hook fails to run, ensuring the app works regardless
 * of instrumentation hook reliability.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 * @see https://github.com/vercel/next.js/issues/49897 (instrumentation issues in production)
 */

export async function register() {
  console.log('🚀 [Instrumentation] register() called');
  console.log('🚀 [Instrumentation] Environment:', {
    NEXT_RUNTIME: process.env.NEXT_RUNTIME,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
  });

  // Only attempt initialization on server side in Node.js runtime
  const isServer = typeof window === 'undefined';
  const isNodeRuntime = !process.env.NEXT_RUNTIME || process.env.NEXT_RUNTIME === 'nodejs';

  if (!isServer) {
    console.log('⚠️ [Instrumentation] Skipping - running in browser environment');
    return;
  }

  if (!isNodeRuntime) {
    console.warn('⚠️ [Instrumentation] Skipping - not in Node.js runtime');
    console.warn('⚠️ [Instrumentation] Current runtime:', process.env.NEXT_RUNTIME || 'undefined');
    return;
  }

  // Attempt startup initialization (best-effort)
  try {
    console.log('🔄 [Instrumentation] Attempting startup database initialization...');
    const { initializeDatabase } = await import('./lib/sqlite-db');

    await initializeDatabase();
    console.log('✅ [Instrumentation] Startup initialization succeeded');
    console.log('   This optimizes cold start performance by pre-initializing the database');
  } catch (error: any) {
    // Don't fail the app if instrumentation-based init fails
    // Lazy initialization in getDatabase() will handle it
    console.warn('⚠️ [Instrumentation] Startup initialization failed (will use lazy initialization)');
    console.warn('   Error:', error.message);
    console.warn('   This is expected in some serverless environments');
    console.warn('   The database will auto-initialize on first API request');
  }
}
