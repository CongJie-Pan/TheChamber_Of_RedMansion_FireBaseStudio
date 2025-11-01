/**
 * Next.js Instrumentation Hook - Phase 4-T1
 *
 * This file is automatically executed when the Next.js server starts.
 * Used to seed the guest test account in development mode.
 *
 * Documentation: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  const nodeEnv = process.env.NODE_ENV;

  // Enhanced environment detection:
  // 1. Explicit development mode (NODE_ENV=development)
  // 2. If NODE_ENV is not set but we're running via npm run dev (development server)
  // 3. Allow explicit override with ENABLE_GUEST_ACCOUNT=true
  const isDevelopment =
    nodeEnv === 'development' ||
    (!nodeEnv && process.argv.some(arg => arg.includes('next') && arg.includes('dev'))) ||
    process.env.ENABLE_GUEST_ACCOUNT === 'true';

  if (isDevelopment) {
    console.log('\n🔧 [Instrumentation] Running development setup tasks...\n');
    console.log('[Instrumentation] Current working directory:', process.cwd());
    console.log('[Instrumentation] Node environment:', nodeEnv || '未設置（檢測為開發模式）');

    try {
      // Dynamically import the seed function to avoid bundling issues
      const { seedGuestAccount } = await import('./scripts/seed-guest-account');

      // Seed guest account with reset
      console.log('[Instrumentation] Calling seedGuestAccount(true)...');
      seedGuestAccount(true);

      console.log('✅ [Instrumentation] Guest account seeded successfully\n');
    } catch (error: any) {
      console.error('❌ [Instrumentation] Failed to seed guest account:', error.message);
      console.error('[Instrumentation] Error stack:', error.stack);
      console.error('   Make sure better-sqlite3 is properly installed for your platform');
      console.error('   Run: npm rebuild better-sqlite3');
      console.error('   Or manually seed: npx tsx scripts/seed-guest-account.ts --reset');

      // Enhanced diagnostics
      const fs = require('fs');
      const path = require('path');
      const dbPath = path.join(process.cwd(), 'data', 'local-db', 'redmansion.db');
      const dbDirExists = fs.existsSync(path.dirname(dbPath));
      const dbFileExists = fs.existsSync(dbPath);
      console.error('[Instrumentation] Database directory exists:', dbDirExists);
      console.error('[Instrumentation] Database file exists:', dbFileExists);
      console.error('');
    }
  } else {
    console.log('\n[Instrumentation] Skipping development setup');
    console.log('[Instrumentation] NODE_ENV=' + (nodeEnv || '未設置（非開發模式）'));
    console.log('[Instrumentation] Guest account setup only runs in development mode');
    console.log('[Instrumentation] To enable: npm run dev (recommended) or NODE_ENV=development npm start\n');
  }
}
