/**
 * Next.js Instrumentation Hook
 * This file is automatically called once when the Next.js server starts
 * It's the perfect place to initialize database connections
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  console.log('🚀 [Instrumentation] register() called');
  console.log('🚀 [Instrumentation] NEXT_RUNTIME:', process.env.NEXT_RUNTIME);
  console.log('🚀 [Instrumentation] Running on server:', typeof window === 'undefined');

  // Only run on server side (Node.js runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      console.log('🔄 [Instrumentation] Importing database module...');
      const { initializeDatabase } = await import('./lib/sqlite-db');

      console.log('🔄 [Instrumentation] Calling initializeDatabase()...');
      await initializeDatabase();
      console.log('✅ [Instrumentation] Database initialized successfully');
    } catch (error) {
      console.error('❌ [Instrumentation] Failed to initialize database:', error);
      // Don't throw - let the app start even if DB init fails
      // Individual repository calls will handle the error appropriately
    }
  } else {
    console.warn('⚠️ [Instrumentation] Skipping DB init - NEXT_RUNTIME is not "nodejs"');
    console.warn('⚠️ [Instrumentation] Current runtime:', process.env.NEXT_RUNTIME || 'undefined');
  }
}
