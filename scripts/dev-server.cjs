#!/usr/bin/env node
/**
 * Development server launcher with automatic port fallback.
 *
 * Next.js 15 occasionally fails to bind to the default port (3001) on Windows
 * machines because that port is reserved by another service or requires
 * elevated permissions. This helper probes a list of candidate ports and
 * starts `next dev` on the first port that is actually available.
 */

const spawn = require('cross-spawn');
const net = require('node:net');

const DEFAULT_PORTS = [3001, 3000, 3002, 3100];

/**
 * Probe a port by creating a disposable TCP server.
 */
function checkPortAvailability(port) {
  return new Promise((resolve, reject) => {
    const tester = net.createServer()
      .once('error', err => {
        tester.close(() => reject(err));
      })
      .once('listening', () => {
        tester.close(() => resolve());
      })
      .listen(port, '0.0.0.0');
  });
}

/**
 * Build the ordered list of ports to try.
 */
function buildPortList() {
  const preferred = Number(process.env.PORT);
  const candidates = [];

  if (Number.isInteger(preferred) && preferred > 0) {
    candidates.push(preferred);
  }

  for (const p of DEFAULT_PORTS) {
    if (!candidates.includes(p)) {
      candidates.push(p);
    }
  }

  return candidates;
}

/**
 * Ensure NextAuth URL matches the port we finally use for dev server.
 */
function resolveNextAuthUrl(port) {
  const existing = process.env.NEXTAUTH_URL;
  if (!existing) {
    return `http://localhost:${port}`;
  }

  try {
    const parsed = new URL(existing);
    if (['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname)) {
      parsed.port = String(port);
      return parsed.toString();
    }
    return existing;
  } catch {
    return `http://localhost:${port}`;
  }
}

async function findAvailablePort() {
  const candidates = buildPortList();

  for (const port of candidates) {
    try {
      await checkPortAvailability(port);
      return port;
    } catch (error) {
      const errorCode = error && error.code ? error.code : error.message;
      console.warn(`⚠️  [dev-server] Port ${port} unavailable (${errorCode}). Trying next option...`);
    }
  }

  throw new Error(`No available development ports found. Tried: ${candidates.join(', ')}`);
}

async function main() {
  const port = await findAvailablePort();
  const resolvedNextAuthUrl = resolveNextAuthUrl(port);

  console.log(`🚀 [dev-server] Starting Next.js on port ${port}`);
  if (process.env.NEXTAUTH_URL !== resolvedNextAuthUrl) {
    console.log(`ℹ️  [dev-server] NEXTAUTH_URL set to ${resolvedNextAuthUrl}`);
  }

  const child = spawn('next', ['dev', '-p', String(port)], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: String(port),
      NEXTAUTH_URL: resolvedNextAuthUrl,
    },
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.warn(`⚠️  [dev-server] Next.js exited via signal ${signal}`);
      process.exit(1);
    } else {
      process.exit(code ?? 0);
    }
  });

  child.on('error', error => {
    console.error('❌ [dev-server] Failed to launch Next.js:', error);
    process.exit(1);
  });
}

main().catch(error => {
  console.error('❌ [dev-server] Unable to start development server:', error);
  process.exit(1);
});
