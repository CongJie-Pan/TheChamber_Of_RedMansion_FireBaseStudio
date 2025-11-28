/**
 * @fileOverview Jest Polyfills for Node.js 22 + jsdom Compatibility
 *
 * This file provides Web Standard APIs polyfills for Jest test environment.
 * It resolves compatibility issues between jest-environment-jsdom and Node.js 22.
 *
 * CRITICAL: Why we use undici instead of node-fetch or Node.js 22 native fetch:
 * 1. setupFiles runs BEFORE jsdom initializes
 * 2. jsdom creates a NEW global context, replacing globalThis entirely
 * 3. Node.js 22's native fetch (on globalThis) is LOST after jsdom init
 * 4. node-fetch v2 doesn't support Web Streams API (no getReader() on response.body)
 * 5. undici is Node.js's official fetch implementation with FULL Web Streams support
 *
 * This is the industry-standard pattern recommended by MSW v2:
 * - MSW v2 migration guide: https://mswjs.io/docs/migrations/1.x-to-2.x/
 * - jest-fixed-jsdom pattern: https://github.com/mswjs/jest-fixed-jsdom
 * - Next.js testing docs: https://nextjs.org/docs/app/guides/testing/jest
 *
 * NOTE: undici provides Web Streams API support (response.body.getReader() works)
 */

const { TextEncoder, TextDecoder } = require('node:util');
const { ReadableStream, WritableStream, TransformStream } = require('node:stream/web');
const { Blob } = require('node:buffer');
const { MessagePort, MessageChannel } = require('node:worker_threads');

// Step 1: Set up TextEncoder/TextDecoder FIRST (required by fetch APIs internally)
Object.assign(globalThis, {
  TextEncoder,
  TextDecoder,
});

// Step 2: Set up Stream APIs from Node.js BEFORE importing undici
// CRITICAL: undici internally requires ReadableStream to be in globalThis before import
Object.assign(globalThis, {
  ReadableStream,
  WritableStream,
  TransformStream,
});

// Step 2.5: Set up Worker APIs (MessagePort, MessageChannel) BEFORE importing undici
// CRITICAL: undici v7+ uses MessagePort for webidl type assertions
Object.assign(globalThis, {
  MessagePort,
  MessageChannel,
});

// Step 3: Set up fetch-related APIs using undici
// undici is Node.js's official fetch implementation (powers Node.js 18+ native fetch)
// Unlike node-fetch v2, undici supports Web Streams API (response.body.getReader())
const { fetch, Request, Response, Headers, FormData } = require('undici');

// Assign to both globalThis and global for maximum compatibility
// Some code uses globalThis.fetch, others use global.fetch or just fetch
const fetchAPIs = {
  fetch: fetch,
  Headers: Headers,
  Request: Request,
  Response: Response,
  FormData: FormData,
  Blob: Blob,
};

Object.assign(globalThis, fetchAPIs);
Object.assign(global, fetchAPIs);

// Verification log for debugging - show actual API availability status
if (process.env.NODE_ENV !== 'production') {
  console.log('✅ Jest polyfills loaded:');
  console.log('   - TextEncoder/TextDecoder from node:util');
  console.log('   - ReadableStream/WritableStream/TransformStream from node:stream/web');
  console.log('   - Fetch API from undici (Web Streams API compatible):');
  console.log(`     globalThis.fetch: ${typeof globalThis.fetch === 'function' ? '✅ available' : '❌ NOT AVAILABLE'}`);
  console.log(`     global.fetch: ${typeof global.fetch === 'function' ? '✅ available' : '❌ NOT AVAILABLE'}`);
  console.log(`     Request: ${typeof globalThis.Request === 'function' ? '✅ available' : '❌ NOT AVAILABLE'}`);
  console.log(`     Response: ${typeof globalThis.Response === 'function' ? '✅ available' : '❌ NOT AVAILABLE'}`);
  console.log(`     Headers: ${typeof globalThis.Headers === 'function' ? '✅ available' : '❌ NOT AVAILABLE'}`);
}
