/**
 * @fileOverview SQLite Database Fallback Mechanism Tests
 *
 * Tests the graceful fallback behavior when SQLite initialization fails
 * due to architecture mismatches (e.g., Windows Node.js with WSL-compiled better-sqlite3).
 *
 * Key Features Tested:
 * - Database initialization success and failure scenarios
 * - Architecture mismatch error detection (ERR_DLOPEN_FAILED)
 * - Graceful fallback without throwing errors
 * - Initialization flag management
 * - isSQLiteAvailable() helper function
 *
 * Prevents Regression:
 * - "better_sqlite3.node is not a valid Win32 application" errors
 * - Server crashes due to SQLite loading failures
 * - Loss of functionality when SQLite unavailable
 *
 * @phase Phase 2.9 - SQLite Integration with Graceful Fallback
 */

// Mock better-sqlite3 before importing sqlite-db
let mockDatabaseConstructor: jest.Mock;
let mockDatabaseInstance: any;

jest.mock('better-sqlite3', () => {
  mockDatabaseConstructor = jest.fn();
  return mockDatabaseConstructor;
});

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
}));

// Mock path module
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  dirname: jest.fn((p) => p.split('/').slice(0, -1).join('/')),
}));

describe('SQLite Database Fallback Mechanism', () => {
  let getDatabase: () => any;
  let isSQLiteAvailable: () => boolean;
  let closeDatabase: () => void;

  beforeEach(() => {
    // CRITICAL: Reset modules to clear singleton state between tests
    jest.resetModules();
    jest.clearAllMocks();

    // Reset mock database instance with all required methods
    mockDatabaseInstance = {
      pragma: jest.fn(),
      prepare: jest.fn(),
      exec: jest.fn(),
      close: jest.fn(),
    };

    // Reset the mock constructor
    mockDatabaseConstructor.mockReset();

    // Suppress console output during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console output and clear mocks
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('Successful Initialization', () => {
    test('should successfully initialize SQLite database', () => {
      // Arrange: Mock successful database creation
      mockDatabaseConstructor.mockReturnValue(mockDatabaseInstance);

      // Act: Import and initialize
      const sqliteDb = require('@/lib/sqlite-db');
      const db = sqliteDb.getDatabase();

      // Assert
      expect(db).toBeTruthy();
      expect(db).toBe(mockDatabaseInstance);
      expect(mockDatabaseConstructor).toHaveBeenCalledTimes(1);
      expect(mockDatabaseInstance.pragma).toHaveBeenCalledWith('foreign_keys = ON');
      expect(mockDatabaseInstance.pragma).toHaveBeenCalledWith('journal_mode = WAL');
      expect(mockDatabaseInstance.exec).toHaveBeenCalled(); // Schema initialization
    });

    test('should return cached instance on subsequent calls', () => {
      // Arrange
      mockDatabaseConstructor.mockReturnValue(mockDatabaseInstance);
      const sqliteDb = require('@/lib/sqlite-db');

      // Act
      const db1 = sqliteDb.getDatabase();
      const db2 = sqliteDb.getDatabase();

      // Assert
      expect(db1).toBe(db2);
      expect(mockDatabaseConstructor).toHaveBeenCalledTimes(1); // Only called once
    });

    test('isSQLiteAvailable() should return true when database initialized', () => {
      // Arrange
      mockDatabaseConstructor.mockReturnValue(mockDatabaseInstance);
      const sqliteDb = require('@/lib/sqlite-db');

      // Act
      sqliteDb.getDatabase(); // Initialize
      const isAvailable = sqliteDb.isSQLiteAvailable();

      // Assert
      expect(isAvailable).toBe(true);
    });
  });

  describe('Architecture Mismatch Detection', () => {
    test('should detect ERR_DLOPEN_FAILED error', () => {
      // Arrange: Mock ERR_DLOPEN_FAILED error
      const dlopenError = new Error('Cannot load native module');
      (dlopenError as any).code = 'ERR_DLOPEN_FAILED';
      mockDatabaseConstructor.mockImplementation(() => {
        throw dlopenError;
      });

      // Act
      const sqliteDb = require('@/lib/sqlite-db');
      const db = sqliteDb.getDatabase();

      // Assert
      expect(db).toBeNull();
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to initialize database'));
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Architecture mismatch detected'));
    });

    test('should detect "not a valid Win32 application" error', () => {
      // Arrange: Mock Win32 error
      const win32Error = new Error('better_sqlite3.node is not a valid Win32 application');
      mockDatabaseConstructor.mockImplementation(() => {
        throw win32Error;
      });

      // Act
      const sqliteDb = require('@/lib/sqlite-db');
      const db = sqliteDb.getDatabase();

      // Assert
      expect(db).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Architecture mismatch detected'));
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Running Windows Node.js with WSL-compiled better-sqlite3'));
    });

    test('should detect "wrong ELF class" error', () => {
      // Arrange: Mock ELF error
      const elfError = new Error('wrong ELF class: ELFCLASS64');
      mockDatabaseConstructor.mockImplementation(() => {
        throw elfError;
      });

      // Act
      const sqliteDb = require('@/lib/sqlite-db');
      const db = sqliteDb.getDatabase();

      // Assert
      expect(db).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Architecture mismatch detected'));
    });
  });

  describe('Fallback Behavior', () => {
    test('should return null on initialization failure', () => {
      // Arrange
      mockDatabaseConstructor.mockImplementation(() => {
        throw new Error('Database initialization failed');
      });

      // Act
      const sqliteDb = require('@/lib/sqlite-db');
      const db = sqliteDb.getDatabase();

      // Assert
      expect(db).toBeNull();
    });

    test('should not throw error on architecture mismatch', () => {
      // Arrange
      const error = new Error('not a valid Win32 application');
      mockDatabaseConstructor.mockImplementation(() => {
        throw error;
      });

      // Act & Assert: Should not throw
      const sqliteDb = require('@/lib/sqlite-db');
      expect(() => sqliteDb.getDatabase()).not.toThrow();
    });

    test('should log helpful error message with solution', () => {
      // Arrange
      const error = new Error('ERR_DLOPEN_FAILED');
      (error as any).code = 'ERR_DLOPEN_FAILED';
      mockDatabaseConstructor.mockImplementation(() => {
        throw error;
      });

      // Act
      const sqliteDb = require('@/lib/sqlite-db');
      sqliteDb.getDatabase();

      // Assert
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Solution: Run "npm rebuild better-sqlite3"'));
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Falling back to Firebase'));
    });
  });

  describe('Initialization Flag Management', () => {
    test('should not retry initialization after failure', () => {
      // Arrange
      mockDatabaseConstructor.mockImplementation(() => {
        throw new Error('Initialization failed');
      });
      const sqliteDb = require('@/lib/sqlite-db');

      // Act
      const db1 = sqliteDb.getDatabase();
      const db2 = sqliteDb.getDatabase();
      const db3 = sqliteDb.getDatabase();

      // Assert
      expect(db1).toBeNull();
      expect(db2).toBeNull();
      expect(db3).toBeNull();
      expect(mockDatabaseConstructor).toHaveBeenCalledTimes(1); // Only called once
    });

    test('should return cached null on subsequent calls after failure', () => {
      // Arrange
      let callCount = 0;
      mockDatabaseConstructor.mockImplementation(() => {
        callCount++;
        throw new Error('Fail');
      });
      const sqliteDb = require('@/lib/sqlite-db');

      // Act
      sqliteDb.getDatabase();
      sqliteDb.getDatabase();
      sqliteDb.getDatabase();

      // Assert
      expect(callCount).toBe(1); // Constructor only called once
    });
  });

  describe('isSQLiteAvailable() Helper Function', () => {
    test('should return true when database successfully initialized', () => {
      // Arrange
      mockDatabaseConstructor.mockReturnValue(mockDatabaseInstance);
      const sqliteDb = require('@/lib/sqlite-db');

      // Act
      sqliteDb.getDatabase();
      const isAvailable = sqliteDb.isSQLiteAvailable();

      // Assert
      expect(isAvailable).toBe(true);
    });

    test('should return false when initialization failed', () => {
      // Arrange
      mockDatabaseConstructor.mockImplementation(() => {
        throw new Error('Init failed');
      });
      const sqliteDb = require('@/lib/sqlite-db');

      // Act
      sqliteDb.getDatabase();
      const isAvailable = sqliteDb.isSQLiteAvailable();

      // Assert
      expect(isAvailable).toBe(false);
    });

    test('should return false before initialization attempt', () => {
      // Arrange
      const sqliteDb = require('@/lib/sqlite-db');

      // Act
      const isAvailable = sqliteDb.isSQLiteAvailable();

      // Assert
      expect(isAvailable).toBe(false);
    });

    test('should consistently return false after failed initialization', () => {
      // Arrange
      mockDatabaseConstructor.mockImplementation(() => {
        throw new Error('Fail');
      });

      // IMPORTANT: Fresh require after resetModules()
      const sqliteDb = require('@/lib/sqlite-db');

      // Act
      const db = sqliteDb.getDatabase(); // Attempt initialization
      const check1 = sqliteDb.isSQLiteAvailable();
      const check2 = sqliteDb.isSQLiteAvailable();
      const check3 = sqliteDb.isSQLiteAvailable();

      // Assert
      expect(db).toBeNull(); // Should fail to initialize
      expect(check1).toBe(false);
      expect(check2).toBe(false);
      expect(check3).toBe(false);
    });
  });

  describe('Database Cleanup', () => {
    test('should close database connection successfully', () => {
      // Arrange: Ensure close method exists
      mockDatabaseInstance.close = jest.fn();
      mockDatabaseConstructor.mockReturnValue(mockDatabaseInstance);

      const sqliteDb = require('@/lib/sqlite-db');
      const db = sqliteDb.getDatabase();

      expect(db).toBeTruthy();
      expect(db.close).toBeDefined();

      // Act
      sqliteDb.closeDatabase();

      // Assert
      expect(mockDatabaseInstance.close).toHaveBeenCalledTimes(1);
    });

    test('should not throw error when closing non-existent database', () => {
      // Arrange: Fresh module without initializing database
      const sqliteDb = require('@/lib/sqlite-db');

      // Act & Assert: Should not throw
      expect(() => sqliteDb.closeDatabase()).not.toThrow();
    });
  });
});
