'use strict';

/**
 * Utility CLI for maintaining the better-sqlite3 native build on local machines.
 * - `node scripts/sqlite-tool.cjs doctor` prints environment diagnostics.
 * - `node scripts/sqlite-tool.cjs rebuild` rebuilds better-sqlite3.
 * - `node scripts/sqlite-tool.cjs postinstall` rebuilds unless running in CI.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Collects diagnostic information about the current runtime and better-sqlite3 build.
 *
 * @returns {object} Diagnostic data for logging or testing.
 */
function collectEnvironmentInfo() {
  let packageJsonPath = null;
  let binaryPath = null;
  let hasBetterSqlite3 = false;

  try {
    packageJsonPath = require.resolve('better-sqlite3/package.json');
    hasBetterSqlite3 = true;

    const packageDir = path.dirname(packageJsonPath);
    const candidateBinary = path.join(packageDir, 'build', 'Release', 'better_sqlite3.node');

    if (fs.existsSync(candidateBinary)) {
      binaryPath = candidateBinary;
    }
  } catch {
    hasBetterSqlite3 = false;
  }

  const packageManager = detectPackageManager();

  return {
    platform: process.platform,
    arch: process.arch,
    release: os.release(),
    nodeVersion: process.version,
    nodeExecPath: process.execPath,
    packageManager: packageManager.manager,
    packageManagerCommand: packageManager.command,
    hasBetterSqlite3,
    betterSqlite3Package: packageJsonPath,
    betterSqlite3Binary: binaryPath,
  };
}

/**
 * Detects which package manager is available and returns the appropriate command.
 * Respects FORCE_NPM environment variable to skip pnpm detection.
 * Checks in order: pnpm, npm. Falls back to npm if neither is explicitly found.
 *
 * @returns {{manager: string, command: string}} Package manager info.
 */
function detectPackageManager() {
  const isWindows = process.platform === 'win32';
  const npmCommand = isWindows ? 'npm.cmd' : 'npm';
  const pnpmCommand = isWindows ? 'pnpm.cmd' : 'pnpm';

  // Respect FORCE_NPM environment variable
  if (process.env.FORCE_NPM === '1' || process.env.FORCE_NPM === 'true') {
    console.log('⚙️  FORCE_NPM environment variable detected, using npm');
    return { manager: 'npm', command: npmCommand };
  }

  // Try npm first (more reliable and commonly available)
  try {
    const npmCheck = spawnSync(npmCommand, ['--version'], { stdio: 'pipe', shell: true });
    if (npmCheck.status === 0 && !npmCheck.error) {
      return { manager: 'npm', command: npmCommand };
    }
  } catch {
    // npm not available
  }

  // Try pnpm as fallback
  try {
    const pnpmCheck = spawnSync(pnpmCommand, ['--version'], { stdio: 'pipe', shell: true });
    if (pnpmCheck.status === 0 && !pnpmCheck.error) {
      return { manager: 'pnpm', command: pnpmCommand };
    }
  } catch {
    // pnpm not available or failed
  }

  // Fallback to npm (should always be available with Node.js)
  console.log('⚠️  Warning: Could not verify package manager, defaulting to npm');
  return {
    manager: 'npm',
    command: npmCommand
  };
}

/**
 * Determines whether we should skip rebuilding better-sqlite3 for the given mode.
 *
 * @param {string} mode CLI mode.
 * @param {NodeJS.ProcessEnv} env Environment variables.
 * @returns {boolean} True if rebuild should be skipped.
 */
function shouldSkipRebuild(mode, env) {
  if (env.SKIP_SQLITE_REBUILD === '1' || env.SKIP_SQLITE_REBUILD === 'true') {
    return true;
  }

  if (mode === 'postinstall' && env.CI) {
    return true;
  }

  return false;
}

/**
 * Prints environment diagnostics to the console.
 *
 * @param {ReturnType<typeof collectEnvironmentInfo>} info Diagnostic info.
 */
function logEnvironment(info) {
  const banner = '━'.repeat(60);
  console.log(`\n${banner}`);
  console.log('SQLite Environment Diagnostics');
  console.log(banner);
  console.log(`Platform          : ${info.platform}`);
  console.log(`Architecture      : ${info.arch}`);
  console.log(`OS Release        : ${info.release}`);
  console.log(`Node.js Version   : ${info.nodeVersion}`);
  console.log(`Node Exec Path    : ${info.nodeExecPath}`);
  console.log(`Package Manager   : ${info.packageManager} (${info.packageManagerCommand})`);
  console.log(`better-sqlite3    : ${info.hasBetterSqlite3 ? 'installed' : 'not resolved'}`);
  if (info.betterSqlite3Package) {
    console.log(`  package.json    : ${info.betterSqlite3Package}`);
  }
  if (info.betterSqlite3Binary) {
    console.log(`  native binary   : ${info.betterSqlite3Binary}`);
  } else if (info.hasBetterSqlite3) {
    console.log('  native binary   : <missing build output>');
  }
  console.log(banner + '\n');
}

/**
 * Executes `npm rebuild better-sqlite3` or `pnpm rebuild better-sqlite3`
 * depending on which package manager is detected.
 *
 * @returns {number} Process exit status.
 */
function runRebuild() {
  const pm = detectPackageManager();
  console.log(`🔧 Rebuilding better-sqlite3 using ${pm.manager}...`);

  const result = spawnSync(pm.command, ['rebuild', 'better-sqlite3'], {
    stdio: 'inherit',
    shell: true,
  });

  if (result.error) {
    throw result.error;
  }

  return typeof result.status === 'number' ? result.status : 0;
}

/**
 * CLI entry point shared across modes.
 *
 * @param {string} mode CLI mode (`doctor`, `rebuild`, `postinstall`).
 */
function run(mode = 'doctor') {
  const info = collectEnvironmentInfo();
  logEnvironment(info);

  if (mode === 'doctor') {
    return;
  }

  if (mode === 'rebuild' || mode === 'postinstall') {
    if (shouldSkipRebuild(mode, process.env)) {
      console.log('Skipping better-sqlite3 rebuild due to environment flags.');
      return;
    }

    const status = runRebuild();
    if (status !== 0) {
      process.exit(status);
    }
    console.log('✅ better-sqlite3 rebuild completed');
    return;
  }

  console.error(`Unknown sqlite-tool mode: ${mode}`);
  process.exit(1);
}

if (require.main === module) {
  const mode = process.argv[2] ?? 'doctor';
  try {
    run(mode);
  } catch (error) {
    console.error('❌ Failed to run sqlite-tool:', error);
    process.exit(1);
  }
}

module.exports = {
  collectEnvironmentInfo,
  shouldSkipRebuild,
  runRebuild,
  run,
};
