/**
 * @fileOverview Jest Polyfills for Node.js 22 + jsdom Compatibility
 *
 * This file provides Web Standard APIs polyfills for Jest test environment.
 * It resolves compatibility issues between jest-environment-jsdom and Node.js 22.
 *
 * CRITICAL: Polyfills must be loaded in specific order:
 * 1. TextEncoder/TextDecoder (required by fetch APIs internally)
 * 2. fetch-related APIs from Node.js 22 globalThis (native implementation)
 * 3. Stream APIs from Node.js
 *
 * IMPORTANT: Node.js 22 has undici built-in (v6.21.2) but it's not exposed as
 * a requireable module. Instead, fetch APIs are available on globalThis.
 *
 * Based on:
 * - MSW v2 migration guide: https://mswjs.io/docs/migrations/1.x-to-2.x/
 * - jest-fixed-jsdom pattern: https://github.com/mswjs/jest-fixed-jsdom
 * - Next.js testing docs: https://nextjs.org/docs/app/guides/testing/jest
 */

const { TextEncoder, TextDecoder } = require('node:util');
const { ReadableStream, WritableStream, TransformStream } = require('node:stream/web');

// Step 1: Set up TextEncoder/TextDecoder FIRST (undici depends on these)
Object.assign(globalThis, {
  TextEncoder,
  TextDecoder,
});

// Step 2: Set up fetch-related APIs (Node.js 22 provides these natively on globalThis)
// Note: While Node.js 22 has undici built-in, it's not exposed as a requireable module
// Instead, fetch APIs are available directly on globalThis
const { Blob } = require('node:buffer');
const { fetch, Request, Response, Headers, FormData } = globalThis;

Object.assign(globalThis, {
  fetch,
  Request,
  Response,
  Headers,
  FormData,
  Blob,
});

// Step 3: Set up Stream APIs from Node.js
Object.assign(globalThis, {
  ReadableStream,
  WritableStream,
  TransformStream,
});

// Verification log for debugging
if (process.env.NODE_ENV !== 'production') {
  console.log('✅ Jest polyfills loaded successfully:');
  console.log('   - TextEncoder/TextDecoder from node:util');
  console.log('   - fetch/Request/Response/Headers/FormData from globalThis (Node.js 22 native)');
  console.log('   - ReadableStream/WritableStream/TransformStream from node:stream/web');
}
