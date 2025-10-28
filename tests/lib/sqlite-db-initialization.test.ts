/**
 * @jest-environment node
 *
 * @fileoverview Ensures the SQLite database module fails fast when initialization breaks.
 */

let mockDatabaseConstructor = jest.fn();
let mockDatabaseInstance;

jest.mock('better-sqlite3', () => {
  mockDatabaseConstructor = jest.fn();
  return mockDatabaseConstructor;
});

jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  dirname: jest.fn((value) => value.split('/').slice(0, -1).join('/')),
}));

describe('sqlite-db strict initialization', () => {
  const loadModule = () => require('@/lib/sqlite-db');

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    process.env.USE_SQLITE = '1';

    require('better-sqlite3');
    mockDatabaseInstance = {
      pragma: jest.fn(),
      exec: jest.fn(),
      close: jest.fn(),
      transaction: jest.fn((fn) => {
        const wrapped = fn(mockDatabaseInstance);
        return () => wrapped;
      }),
    };

    mockDatabaseConstructor.mockReset();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.USE_SQLITE;
    jest.restoreAllMocks();
  });

  test('initializes database when better-sqlite3 loads successfully', () => {
    const sqliteDb = loadModule();
    mockDatabaseConstructor.mockImplementation(function () {
      Object.assign(this, mockDatabaseInstance);
    });
    const db = sqliteDb.getDatabase();

    expect(typeof db.exec).toBe('function');
    expect(sqliteDb.isSQLiteAvailable()).toBe(true);
  });

  test('throws with actionable message when initialization fails', () => {
    const sqliteDb = loadModule();
    mockDatabaseConstructor.mockImplementation(() => {
      throw new Error('native module load failure');
    });

    expect(() => sqliteDb.getDatabase()).toThrow(
      /Failed to initialize SQLite database/
    );
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to initialize SQLite database')
    );
    expect(sqliteDb.isSQLiteAvailable()).toBe(false);
  });

  test('provides rebuild guidance for architecture mismatches', () => {
    const error = new Error('better_sqlite3.node is not a valid Win32 application');
    error.code = 'ERR_DLOPEN_FAILED';
    const sqliteDb = loadModule();
    mockDatabaseConstructor.mockImplementation(() => {
      throw error;
    });

    expect(() => sqliteDb.getDatabase()).toThrow(/pnpm run doctor:sqlite/);
    expect(console.warn).toHaveBeenCalled();
  });

  test('throws when USE_SQLITE flag is disabled', () => {
    process.env.USE_SQLITE = '0';
    const sqliteDb = loadModule();

    expect(() => sqliteDb.getDatabase()).toThrow(
      /USE_SQLITE environment flag is disabled/
    );
  });
});
