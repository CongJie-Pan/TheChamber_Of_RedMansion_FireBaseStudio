/**
 * @fileoverview Tests for the SQLite tooling script that verifies environment diagnostics.
 */

describe('sqlite-tool CLI helpers', () => {
  // Reset module cache between tests to ensure fresh evaluation of environment checks.
  const loadTool = () => {
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../../scripts/sqlite-tool.cjs');
  };

  test('collectEnvironmentInfo returns core fields', () => {
    const tool = loadTool();
    const info = tool.collectEnvironmentInfo();

    expect(info.platform).toBe(process.platform);
    expect(info.arch).toBe(process.arch);
    expect(info.nodeVersion).toBe(process.version);
    expect(typeof info.nodeExecPath).toBe('string');
    expect(typeof info.hasBetterSqlite3).toBe('boolean');
  });

  test('shouldSkipRebuild respects CI flag during postinstall', () => {
    const tool = loadTool();

    expect(tool.shouldSkipRebuild('postinstall', { CI: 'true' })).toBe(true);
    expect(tool.shouldSkipRebuild('postinstall', {})).toBe(false);
    expect(tool.shouldSkipRebuild('doctor', { CI: 'true' })).toBe(false);
  });
});
