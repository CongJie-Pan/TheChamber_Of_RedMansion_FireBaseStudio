/**
 * Next.js Instrumentation Hook
 * This file is automatically called once when the Next.js server starts
 * It's the perfect place to initialize database connections
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeDatabase } = await import('./lib/sqlite-db');

    try {
      await initializeDatabase();
      console.log('✅ [Instrumentation] Database initialized successfully');
    } catch (error) {
      console.error('❌ [Instrumentation] Failed to initialize database:', error);
      // Don't throw - let the app start even if DB init fails
      // Individual repository calls will handle the error appropriately
    }
  }
}
