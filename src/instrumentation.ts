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

    // Phase 4-T1: Seed guest account if tasks don't exist
    // This ensures guest account works in both development AND production (Vercel)
    await ensureGuestAccountSeeded();
  } catch (error: any) {
    // Don't fail the app if instrumentation-based init fails
    // Lazy initialization in getDatabase() will handle it
    console.warn('⚠️ [Instrumentation] Startup initialization failed (will use lazy initialization)');
    console.warn('   Error:', error.message);
    console.warn('   This is expected in some serverless environments');
    console.warn('   The database will auto-initialize on first API request');
  }
}

/**
 * Ensure guest account and tasks are seeded
 * Phase 4-T1 Enhancement: Works in both development and production environments
 *
 * This function checks if guest tasks exist before seeding to avoid:
 * 1. Duplicate insert errors
 * 2. Unnecessary database operations on every cold start
 */
async function ensureGuestAccountSeeded(): Promise<void> {
  try {
    console.log('🔄 [Instrumentation] Checking guest account status...');

    const { getDatabase } = await import('./lib/sqlite-db');
    const { GUEST_TASK_IDS } = await import('./lib/constants/guest-account');

    const db = getDatabase();

    // Check if guest tasks already exist
    const result = await db.execute({
      sql: `SELECT COUNT(*) as count FROM daily_tasks WHERE id IN (?, ?)`,
      args: [GUEST_TASK_IDS.READING_COMPREHENSION, GUEST_TASK_IDS.CULTURAL_EXPLORATION]
    });

    const count = (result.rows[0] as any)?.count ?? 0;

    if (count >= 2) {
      console.log('✅ [Instrumentation] Guest tasks already exist, skipping seed');
      return;
    }

    console.log('🔄 [Instrumentation] Guest tasks not found, seeding...');

    // Dynamically import and run seed function from lib (Vercel compatible)
    const { seedGuestAccount } = await import('./lib/seed-guest-account');
    await seedGuestAccount(true);

    console.log('✅ [Instrumentation] Guest account seeded successfully');
  } catch (error: any) {
    // Don't fail the app if guest seeding fails
    // The API will return a helpful error message
    console.warn('⚠️ [Instrumentation] Guest account seeding failed (non-fatal)');
    console.warn('   Error:', error.message);
    console.warn('   Guest account features may not work until manually seeded');
  }
}
