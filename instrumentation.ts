/**
 * Next.js Instrumentation Hook - Phase 4-T1
 *
 * This file is automatically executed when the Next.js server starts.
 * Used to seed the guest test account in development mode.
 *
 * Documentation: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run in development mode for security
  if (process.env.NODE_ENV === 'development') {
    console.log('\n🔧 [Instrumentation] Running development setup tasks...\n');

    try {
      // Dynamically import the seed function to avoid bundling issues
      const { seedGuestAccount } = await import('./scripts/seed-guest-account');

      // Seed guest account with reset
      seedGuestAccount(true);

      console.log('✅ [Instrumentation] Guest account seeded successfully\n');
    } catch (error: any) {
      console.error('❌ [Instrumentation] Failed to seed guest account:', error.message);
      console.error('   Make sure better-sqlite3 is properly installed for your platform');
      console.error('   Run: npm rebuild better-sqlite3\n');
    }
  }
}
