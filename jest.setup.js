/**
 * @fileOverview Jest Setup Configuration
 * 
 * This file runs before each test file and sets up the testing environment.
 * It configures global test utilities, mocks, and testing library extensions.
 * 
 * Key configurations:
 * - Testing Library Jest DOM matchers for enhanced assertions
 * - Global fetch polyfill for Node.js environment
 * - Console.error suppression for cleaner test output
 * - Custom Jest matchers for Firebase testing
 * - Mock implementations for external dependencies
 */

// Import Testing Library Jest DOM matchers
require('@testing-library/jest-dom');

// Set up test environment variables for Firebase to prevent warnings
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'fake-api-key-for-testing';
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'fake-project.firebaseapp.com';
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'fake-project-id-for-testing';
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'fake-project.appspot.com';
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456789';
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:123456789:web:fake-app-id';

// Polyfill fetch for Node.js environment (needed for Firebase operations)
const { TextEncoder, TextDecoder } = require('util');

// Global polyfills for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock environment variables for Firebase testing
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'mock-api-key';
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'mock-project.firebaseapp.com';
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'mock-project';
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'mock-project.appspot.com';
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456789';
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:123456789:web:abcdef123456';

// Mock Firebase Auth for testing
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: null,
    onAuthStateChanged: jest.fn(() => jest.fn()), // Unsubscribe function
    signOut: jest.fn(),
  })),
  onAuthStateChanged: jest.fn((_auth, callback) => {
    // Immediately invoke callback with null user so AuthProvider exits loading state
    if (typeof callback === 'function') {
      setTimeout(() => callback(null), 0);
    }
    return jest.fn(); // Unsubscribe
  }),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  updateProfile: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  signInWithPopup: jest.fn(),
  signInAnonymously: jest.fn(),
}));

// In-memory Firestore store for tests (persists across calls)
const __firestoreStore = new Map();
global.__firestoreStore = __firestoreStore;

// Utilities to help tests seed data
global.testUtils = global.testUtils || {};
global.testUtils.setFirestoreDoc = (path, data) => {
  __firestoreStore.set(path, data);
};
global.testUtils.getFirestoreDoc = (path) => {
  return __firestoreStore.get(path);
};

// Mock Firebase Firestore for testing (stateful)
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({ _id: 'mock-firestore' })),
  collection: jest.fn((db, path) => ({ _path: path, _db: db })),
  doc: jest.fn((collectionOrDb, ...pathSegments) => {
    const base = collectionOrDb && collectionOrDb._path ? collectionOrDb._path : '';
    const fullPath = [base, ...pathSegments].filter(Boolean).join('/');
    return {
      id: pathSegments[pathSegments.length - 1] || base.split('/').pop() || 'mock-doc-id',
      path: fullPath || 'mock-doc-id',
    };
  }),
  runTransaction: jest.fn(async (_db, updateFn) => {
    // Transaction-like object using shared store
    const tx = {
      async get(ref) {
        const data = __firestoreStore.get(ref.path);
        return {
          exists: () => data != null,
          data: () => data,
        };
      },
      set(ref, data) {
        __firestoreStore.set(ref.path, data);
      },
      update(ref, data) {
        const prev = __firestoreStore.get(ref.path) || {};
        __firestoreStore.set(ref.path, { ...prev, ...data });
      },
    };
    await updateFn(tx);
    return undefined;
  }),
  addDoc: jest.fn((collectionRef, data) => {
    const id = 'new-doc-id-' + Math.random().toString(36).slice(2, 8);
    const path = `${collectionRef._path}/${id}`;
    __firestoreStore.set(path, { ...data, id });
    return Promise.resolve({ id });
  }),
  // Enhanced getDocs mock: supports simple query filtering by collection path and where('==') clauses
  getDocs: jest.fn((queryOrCollectionRef) => {
    // Resolve collection path and filters
    let collectionPath = '';
    let filters = [];
    let limitN = undefined;

    if (queryOrCollectionRef && queryOrCollectionRef._query) {
      const parts = queryOrCollectionRef._query;
      const col = parts.find((p) => p && p._path);
      if (col && col._path) collectionPath = col._path;
      filters = parts.filter((p) => p && typeof p.field === 'string');
      const lim = parts.find((p) => p && typeof p.limit === 'number');
      if (lim && typeof lim.limit === 'number') limitN = lim.limit;
    } else if (queryOrCollectionRef && queryOrCollectionRef._path) {
      collectionPath = queryOrCollectionRef._path;
    }

    const docs = [];
    if (global.__firestoreStore && collectionPath) {
      for (const [path, data] of global.__firestoreStore.entries()) {
        if (!path.startsWith(collectionPath + '/')) continue;
        // Apply where filters (support '==' only)
        let ok = true;
        for (const f of filters) {
          if (f.op === '==' && data?.[f.field] !== f.value) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
        const id = path.split('/').pop();
        docs.push({ id, data: () => data, ref: { path, id } });
      }
    }

    const sliced = typeof limitN === 'number' ? docs.slice(0, limitN) : docs;
    return Promise.resolve({
      docs: sliced,
      empty: sliced.length === 0,
      size: sliced.length,
      forEach: (cb) => sliced.forEach((d) => cb(d)),
    });
  }),
  getDoc: jest.fn((ref) => Promise.resolve({
    exists: () => __firestoreStore.has(ref.path),
    data: () => __firestoreStore.get(ref.path),
    id: ref.id,
  })),
  setDoc: jest.fn((ref, data) => {
    __firestoreStore.set(ref.path, data);
    return Promise.resolve();
  }),
  updateDoc: jest.fn((ref, data) => {
    const prev = __firestoreStore.get(ref.path) || {};
    __firestoreStore.set(ref.path, { ...prev, ...data });
    return Promise.resolve();
  }),
  deleteDoc: jest.fn((ref) => {
    __firestoreStore.delete(ref.path);
    return Promise.resolve();
  }),
  query: jest.fn((...args) => ({ _query: args })),
  where: jest.fn((field, op, value) => ({ field, op, value })),
  orderBy: jest.fn((field, direction) => ({ field, direction })),
  limit: jest.fn((n) => ({ limit: n })),
  startAfter: jest.fn((doc) => ({ startAfter: doc })),
  increment: jest.fn((n) => ({ _increment: n })),
  arrayUnion: jest.fn((...values) => ({ _arrayUnion: values })),
  arrayRemove: jest.fn((...values) => ({ _arrayRemove: values })),
  serverTimestamp: jest.fn(() => ({ _serverTimestamp: true })),
  onSnapshot: jest.fn(() => jest.fn()), // Returns unsubscribe function
  Timestamp: {
    now: jest.fn(() => ({
      toDate: () => new Date(),
      seconds: Math.floor(Date.now() / 1000),
      nanoseconds: 0,
    })),
    fromDate: jest.fn((date) => ({
      toDate: () => date,
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: 0,
    })),
  },
}));

// Mock Firebase Storage for testing
jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// Mock Radix UI Toast primitives to simple components for tests
jest.mock('@radix-ui/react-toast', () => {
  const React = require('react');
  const Dummy = React.forwardRef((props, ref) => React.createElement('div', { ref, ...props }));
  Dummy.displayName = 'Dummy';
  return {
    Provider: ({ children }) => React.createElement('div', { 'data-testid': 'toast-provider' }, children),
    Viewport: Dummy,
    Root: Dummy,
    Title: Dummy,
    Description: Dummy,
    Action: Dummy,
    Close: Dummy,
  };
});

// Mock Radix Tabs primitives specifically (some components refer to displayName)
jest.mock('@radix-ui/react-tabs', () => {
  const React = require('react');
  const mk = (name) => {
    const C = React.forwardRef((props, ref) => React.createElement('div', { ref, ...props }));
    C.displayName = name;
    return C;
  };
  return {
    Root: mk('TabsRoot'),
    List: mk('TabsList'),
    Trigger: mk('TabsTrigger'),
    Content: mk('TabsContent'),
  };
});

// Mock console.error to reduce noise in test output
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    // Allow specific error messages that we want to see in tests
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning') || 
       args[0].includes('Error') ||
       args[0].includes('Failed'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Increase timeout for async operations (especially for daily task tests)
jest.setTimeout(60000); // 60 seconds for complex test suites

// Global test utilities
global.testUtils = {
  // In-memory Firestore helpers
  setFirestoreDoc: (path, data) => {
    if (global.__firestoreStore) {
      global.__firestoreStore.set(path, data);
    }
  },
  getFirestoreDoc: (path) => {
    if (global.__firestoreStore) {
      return global.__firestoreStore.get(path);
    }
    return undefined;
  },
  // Create mock Firestore document with ID
  createMockDoc: (id, data) => ({
    id,
    data: () => data,
    exists: () => true,
  }),
  
  // Create mock Firestore query snapshot
  createMockQuerySnapshot: (docs) => ({
    docs,
    size: docs.length,
    empty: docs.length === 0,
    forEach: (callback) => docs.forEach(callback),
  }),
  
  // Create mock user object for authentication tests
  createMockUser: (overrides = {}) => ({
    uid: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: null,
    emailVerified: true,
    ...overrides,
  }),
  
  // Create mock timestamp
  createMockTimestamp: (date = new Date()) => ({
    toDate: () => date,
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
  }),
};

// Custom Jest matchers for Firebase testing
expect.extend({
  // Check if a Firebase document contains expected data
  toContainFirebaseDoc(received, expected) {
    const pass = received.some(doc => 
      Object.keys(expected).every(key => 
        doc.data()[key] === expected[key]
      )
    );
    
    if (pass) {
      return {
        message: () => `Expected documents not to contain ${JSON.stringify(expected)}`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected documents to contain ${JSON.stringify(expected)}`,
        pass: false,
      };
    }
  },
  
  // Check if an array contains a specific Firebase document ID
  toContainDocId(received, docId) {
    const pass = received.some(doc => doc.id === docId);
    
    if (pass) {
      return {
        message: () => `Expected documents not to contain ID ${docId}`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected documents to contain ID ${docId}`,
        pass: false,
      };
    }
  },
}); 
