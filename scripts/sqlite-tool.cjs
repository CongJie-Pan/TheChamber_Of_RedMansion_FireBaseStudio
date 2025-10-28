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

  return {
    platform: process.platform,
    arch: process.arch,
    release: os.release(),
    nodeVersion: process.version,
    nodeExecPath: process.execPath,
    pnpmCommand: getPnpmCommand(),
    hasBetterSqlite3,
    betterSqlite3Package: packageJsonPath,
    betterSqlite3Binary: binaryPath,
  };
}

/**
 * Returns the appropriate pnpm binary name for the current platform.
 *
 * @returns {string} pnpm executable.
 */
function getPnpmCommand() {
  return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
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
  console.log(`pnpm Command      : ${info.pnpmCommand}`);
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
 * Executes `pnpm rebuild better-sqlite3`.
 *
 * @returns {number} Process exit status.
 */
function runRebuild() {
  const command = getPnpmCommand();
  const result = spawnSync(command, ['rebuild', 'better-sqlite3'], {
    stdio: 'inherit',
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
  getPnpmCommand,
  runRebuild,
  run,
};
