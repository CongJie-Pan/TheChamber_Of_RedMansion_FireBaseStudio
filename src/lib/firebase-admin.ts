/**
 * @fileOverview Firebase Admin initialization for server-side APIs (optional).
 *
 * This module avoids a hard dependency on the 'firebase-admin' package so that
 * the app can run in environments where Firebase is disabled. When the package
 * is unavailable, all exports degrade gracefully (no-ops or nulls).
 */

// Safe dynamic require that bundlers won't statically analyze
function safeRequire(name: string): any | null {
  try {
    // eslint-disable-next-line no-eval
    const req: NodeRequire = eval('require');
    return req(name);
  } catch {
    return null;
  }
}

// Try to load firebase-admin dynamically
const admin: any = safeRequire('firebase-admin');

function getServiceAccountFromEnv(): any | null {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!json) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(json, json.trim().startsWith('{') ? 'utf8' : 'base64').toString('utf8')
    );
    return {
      projectId: parsed.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: parsed.client_email,
      privateKey: (parsed.private_key as string)?.replace(/\\n/g, '\n'),
    };
  } catch {
    return null;
  }
}

let adminAuth: any = null;
let adminDb: any = null;

if (admin) {
  try {
    if (!admin.apps.length) {
      const svc = getServiceAccountFromEnv();
      admin.initializeApp(
        svc
          ? { credential: admin.credential.cert(svc), projectId: svc.projectId }
          : { credential: admin.credential.applicationDefault(), projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID }
      );
    }
    adminAuth = admin.auth();
    adminDb = admin.firestore();
  } catch (e) {
    // If initialization fails, keep nulls to signal unavailability
    console.warn('Firebase Admin unavailable:', e);
    adminAuth = null;
    adminDb = null;
  }
}

/**
 * Verify Authorization header with Firebase ID token.
 * Returns UID on success; null when admin is unavailable or token invalid.
 */
export async function verifyAuthHeader(header?: string | null): Promise<string | null> {
  if (!header || !header.toLowerCase().startsWith('bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token || !adminAuth) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded?.uid || null;
  } catch (e) {
    return null;
  }
}

export { admin, adminAuth, adminDb };
