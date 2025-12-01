# NextAuth.js API Route Module Documentation

**Module Path**: `src/app/api/auth/[...nextauth]/route.ts`
**Module Type**: Next.js API Route Handler
**Phase**: Phase 4 - Authentication Replacement
**Tasks**: SQLITE-019, SQLITE-021
**Lines of Code**: 350
**Last Updated**: 2025-11-30 (Documentation verified)

---

## Overview

This module implements the core NextAuth.js authentication API route for The Chamber of Red Mansion platform. It replaces Firebase Authentication with a local SQLite-based authentication system using email/password credentials, guest login, and JWT sessions with Remember Me functionality.

**Purpose**: Provide secure, stateless authentication using NextAuth.js with local SQLite database integration, supporting both authenticated users and anonymous guest access.

---

## Key Features

### Authentication Providers
1. **Credentials Provider**: Email/password authentication
   - Database: SQLite via user-repository
   - Password Verification: bcrypt.compare() with 10 salt rounds
   - User Lookup: getUserByEmail() from user-repository
   - Remember Me Support: Dynamic session duration (24h or 30d)

2. **Guest Credentials Provider** (SQLITE-021): Anonymous guest access
   - Auto-generated guest accounts
   - Temporary credentials with unique IDs
   - Chinese guest username (訪客_xxx)
   - Marked with isGuest flag

### Session Management
- **Strategy**: JWT (stateless, no database storage)
- **Expiry**: Dynamic based on Remember Me preference
  - Standard: 24 hours (86400 seconds)
  - Remember Me: 30 days (2592000 seconds)
- **Storage**: HTTPOnly cookies (automatic via NextAuth.js)
- **Security**: 32-byte base64 secret (NEXTAUTH_SECRET)

### Custom Callbacks
- **JWT Callback**: Adds custom claims (userId, username, currentLevel, totalXP)
- **Session Callback**: Populates session object with user data from JWT token

---

## Architecture

### Authentication Flow

```
1. User Login Request
   ↓
2. NextAuth Credentials Provider
   ↓
3. authorize() Function
   │
   ├─→ Validate Input (email, password)
   ├─→ Query SQLite (getUserByEmail)
   ├─→ Verify Password (bcrypt.compare)
   └─→ Return User Object or null
   ↓
4. JWT Callback
   │
   └─→ Add Custom Claims (userId, username, currentLevel, totalXP)
   ↓
5. Session Callback
   │
   └─→ Populate Session Object
   ↓
6. Return JWT Token + Set HTTPOnly Cookie
```

### File Structure

```typescript
src/app/api/auth/[...nextauth]/
└── route.ts               # NextAuth.js configuration and handlers
```

---

## Implementation Details

### 1. NextAuth Configuration

```typescript
export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',        // Stateless JWT sessions
    maxAge: 24 * 60 * 60,   // 24-hour expiry
  },

  pages: {
    signIn: '/login',       // Custom login page
  },

  providers: [
    CredentialsProvider({ /* ... */ })
  ],

  callbacks: {
    async jwt({ token, user, account }) { /* ... */ },
    async session({ session, token }) { /* ... */ }
  },

  debug: process.env.NODE_ENV === 'development',
};
```

### 2. Credentials Provider (SQLITE-019)

**Configuration**:
- **ID**: `credentials`
- **Name**: `Email and Password`
- **Credentials**:
  - email (email type)
  - password (password type)
  - rememberMe (text type, optional) - SQLITE-021

**authorize() Function**:
```typescript
async authorize(credentials) {
  // 1. Validate input
  if (!credentials?.email || !credentials?.password) return null;

  // 2. Parse Remember Me preference (SQLITE-021)
  const rememberMe = credentials.rememberMe === 'true';
  console.log(`🔍 [NextAuth] Login attempt: ${credentials.email} (Remember Me: ${rememberMe})`);

  // 3. Query user from SQLite
  const user = await getUserByEmail(credentials.email.toLowerCase());
  if (!user) return null;

  // 4. Check password hash exists
  if (!user.passwordHash) return null;

  // 5. Verify password with bcrypt
  const isPasswordValid = await bcrypt.compare(
    credentials.password,
    user.passwordHash
  );
  if (!isPasswordValid) return null;

  // 6. Return user object with Remember Me flag (passed to JWT callback)
  return {
    id: user.userId,
    email: user.email || '',
    name: user.username,
    currentLevel: user.currentLevel,
    totalXP: user.totalXP,
    rememberMe: rememberMe,  // SQLITE-021: Dynamic session duration
  };
}
```

### 2.5. Guest Credentials Provider (SQLITE-021)

**Configuration**:
- **ID**: `guest-credentials`
- **Name**: `Guest Login`
- **Credentials**: None (anonymous access)

**Purpose**: Allow users to explore the platform without creating an account

**authorize() Function**:
```typescript
async authorize(credentials, req) {
  console.log('👤 [NextAuth Guest] Creating guest user...');

  // 1. Create guest user with auto-generated credentials
  const guestUser = await createGuestUser();

  // createGuestUser() returns:
  // - Unique ID: guest_{timestamp}_{random}
  // - Email: guest_{timestamp}@redmansion.local
  // - Username: 訪客_{random} (Chinese for "Guest")
  // - Password: 32-byte secure random hex (user won't need this)
  // - isGuest: true

  // 2. Return guest user object (passed to JWT callback)
  return {
    id: guestUser.userId,
    email: guestUser.email || '',
    name: guestUser.username,
    currentLevel: guestUser.currentLevel,
    totalXP: guestUser.totalXP,
    isGuest: true,           // Mark as guest user
    rememberMe: false,       // Guest users: standard 24h session
  };
}
```

**Guest User Characteristics**:
- **ID Pattern**: `guest_1698765432_a1b2c3`
- **Email Pattern**: `guest_1698765432@redmansion.local`
- **Username**: `訪客_a1b2c3` (Chinese: "Guest")
- **Password**: Auto-generated (not shown to user)
- **Level**: 0 (starts at beginner level)
- **XP**: 0 (no experience points)
- **isGuest Flag**: `true` (for UI customization)

### 3. JWT Callback

**Purpose**: Add custom claims to JWT token on sign-in and set dynamic session expiration

```typescript
async jwt({ token, user, account, trigger }) {
  // On initial sign-in, add user data to token
  if (user && account) {
    token.userId = user.id;
    token.email = user.email;
    token.username = user.name;
    token.currentLevel = (user as any).currentLevel || 0;
    token.totalXP = (user as any).totalXP || 0;
    token.isGuest = (user as any).isGuest || false;

    // SQLITE-021: Set session duration based on Remember Me preference
    const rememberMe = (user as any).rememberMe || false;
    const sessionDuration = rememberMe
      ? SESSION_DURATION_REMEMBER_ME  // 30 days
      : SESSION_DURATION_STANDARD;     // 24 hours

    // Store rememberMe flag and session duration in token
    token.rememberMe = rememberMe;
    token.sessionDuration = sessionDuration;

    // Set token expiration time dynamically
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    token.exp = now + sessionDuration;

    console.log(`✅ [NextAuth] JWT created for user: ${user.id} (Session: ${rememberMe ? '30 days' : '24 hours'}, Guest: ${token.isGuest})`);
  }

  return token;
}
```

**JWT Token Structure**:
```typescript
{
  userId: string;
  email: string;
  username: string;
  currentLevel: number;
  totalXP: number;
  isGuest: boolean;           // SQLITE-021: Guest user flag
  rememberMe: boolean;        // SQLITE-021: Remember Me preference
  sessionDuration: number;    // SQLITE-021: Session duration in seconds
  iat: number;                // Issued at (automatic)
  exp: number;                // Expiry (automatic, dynamically set)
  jti: string;                // JWT ID (automatic)
}
```

### 4. Session Callback

**Purpose**: Populate session object from JWT token for client access

```typescript
async session({ session, token }) {
  // Add user data from token to session
  if (token && session.user) {
    session.user.id = token.userId as string;
    session.user.email = token.email as string;
    session.user.name = token.username as string;
    (session.user as any).currentLevel = token.currentLevel;
    (session.user as any).totalXP = token.totalXP;
    (session.user as any).isGuest = token.isGuest || false;  // SQLITE-021: Guest flag
  }

  return session;
}
```

**Session Object Structure** (client-side):
```typescript
{
  user: {
    id: string;
    email: string;
    name: string;
    currentLevel: number;
    totalXP: number;
    isGuest: boolean;     // SQLITE-021: Indicates if user is guest
  },
  expires: string;        // ISO 8601 date string
}
```

### 5. Event Handlers

**signIn Event**:
```typescript
async signIn({ user, account, profile, isNewUser }) {
  console.log(`🎉 [NextAuth] User signed in: ${user.id} (${user.email})`);
}
```

**signOut Event**:
```typescript
async signOut({ token, session }) {
  console.log(`👋 [NextAuth] User signed out: ${token?.userId || 'unknown'}`);
}
```

### 6. Route Handlers

```typescript
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

**Supported HTTP Methods**:
- **GET**: Get session, CSRF token, providers list
- **POST**: Sign in, sign out, callback handling

---

## Dependencies

### External Libraries
```json
{
  "next-auth": "latest",      // NextAuth.js core
  "bcryptjs": "^3.0.2"        // Password verification
}
```

### Internal Dependencies
```typescript
import { getUserByEmail } from '@/lib/repositories/user-repository';
```

---

## Configuration

### Environment Variables

**Required**:
```bash
# JWT secret for signing tokens (32+ bytes recommended)
NEXTAUTH_SECRET=<generated-with-openssl-rand-base64-32>

# NextAuth.js base URL
NEXTAUTH_URL=http://localhost:3001
```

**Generation**:
```bash
openssl rand -base64 32
```

### Type Definitions

**Location**: `src/types/next-auth.d.ts`

**Extended Types**:
- `Session.user`: Added custom fields (id, currentLevel, totalXP)
- `JWT`: Added custom claims (userId, username, currentLevel, totalXP)
- `User`: Extended with optional level/XP fields

---

## Security Features

| Feature | Implementation | Status |
|---------|---------------|--------|
| **Password Hashing** | bcrypt with 10 salt rounds | ✅ |
| **JWT Signing** | NEXTAUTH_SECRET (32-byte base64) | ✅ |
| **HTTPOnly Cookies** | Automatic via NextAuth.js | ✅ |
| **Session Expiry** | Dynamic: 24h standard / 30d Remember Me | ✅ |
| **CSRF Protection** | Built-in NextAuth.js CSRF tokens | ✅ |
| **Secure Cookies** | Production mode (HTTPS) | ✅ |
| **SQL Injection** | Prepared statements in user-repository | ✅ |

---

## API Endpoints

### Base URL
```
/api/auth/*
```

### Available Endpoints (Auto-generated by NextAuth.js)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/signin` | POST | Sign in with credentials |
| `/api/auth/signout` | POST | Sign out current user |
| `/api/auth/session` | GET | Get current session |
| `/api/auth/csrf` | GET | Get CSRF token |
| `/api/auth/providers` | GET | List available providers |
| `/api/auth/callback/credentials` | POST | Credentials callback |

---

## Usage Examples

### Client-Side Sign In (Standard)

```typescript
import { signIn } from 'next-auth/react';

// Sign in with credentials (standard 24-hour session)
const result = await signIn('credentials', {
  email: 'user@example.com',
  password: 'securePassword123',
  redirect: false,  // Handle redirect manually
});

if (result?.error) {
  console.error('Sign in failed:', result.error);
} else {
  // Redirect to dashboard
  router.push('/dashboard');
}
```

### Client-Side Sign In (Remember Me) - SQLITE-021

```typescript
import { signIn } from 'next-auth/react';

// Sign in with Remember Me (30-day session)
const result = await signIn('credentials', {
  email: 'user@example.com',
  password: 'securePassword123',
  rememberMe: 'true',  // Enable 30-day session
  redirect: false,
});

if (result?.ok) {
  router.push('/dashboard');
} else {
  console.error('Sign in failed:', result.error);
}
```

### Guest Login - SQLITE-021

```typescript
import { signIn } from 'next-auth/react';

// Sign in as guest (anonymous account)
const handleGuestSignIn = async () => {
  const result = await signIn('guest-credentials', {
    redirect: false,
  });

  if (result?.ok) {
    console.log('✅ Guest login successful');
    router.push('/dashboard');
  } else {
    console.error('❌ Guest login failed:', result?.error);
  }
};
```

### Client-Side Session Access

```typescript
import { useSession } from 'next-auth/react';

function MyComponent() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <div>Loading...</div>;
  if (status === 'unauthenticated') return <div>Not signed in</div>;

  return (
    <div>
      <p>Welcome, {session.user.name}!</p>
      <p>Level: {session.user.currentLevel}</p>
      <p>Total XP: {session.user.totalXP}</p>
    </div>
  );
}
```

### Server-Side Session Access

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Access session data
  const userId = session.user.id;
  const email = session.user.email;

  // ... handle request
}
```

### Sign Out

```typescript
import { signOut } from 'next-auth/react';

// Sign out
await signOut({
  callbackUrl: '/',  // Redirect to homepage after sign out
});
```

---

## Error Handling

### Authentication Failures

**Invalid Credentials**:
```typescript
// authorize() returns null
// NextAuth.js returns error to client
{
  error: 'CredentialsSignin',
  status: 401
}
```

**Missing Password Hash**:
```typescript
// User exists but has no password (legacy user)
console.log('❌ [NextAuth] User has no password hash');
return null;
```

**bcrypt Verification Error**:
```typescript
catch (error) {
  console.error('❌ [NextAuth] Authorization error:', error);
  return null;
}
```

---

## Performance Considerations

### Optimization Strategies

1. **Stateless Sessions**: JWT tokens eliminate database lookups for session validation
2. **HTTPOnly Cookies**: Automatic browser management
3. **Token Expiry**: 24-hour refresh reduces token bloat
4. **Minimal Claims**: Only essential data in JWT (userId, username, level, XP)
5. **Database Connection Pooling**: Handled by user-repository

### Performance Metrics

| Operation | Time | Notes |
|-----------|------|-------|
| **Sign In** | ~100-150ms | Includes bcrypt verification (dominant cost) |
| **Session Validation** | <5ms | JWT decoding only, no database |
| **bcrypt.compare()** | ~80-120ms | Intentionally slow for security |

---

## Testing

### Manual Testing Checklist

**Standard Authentication:**
- [ ] Sign in with valid credentials → Success
- [ ] Sign in with wrong password → Error
- [ ] Sign in with non-existent email → Error
- [ ] Session persists across page refreshes
- [ ] Session expires after 24 hours (standard)
- [ ] Sign out clears session
- [ ] Custom claims in JWT token (userId, username, level, XP)
- [ ] Custom fields in session object

**Remember Me (SQLITE-021):**
- [ ] Sign in with Remember Me checked → 30-day session
- [ ] Remember Me session persists for 30 days
- [ ] JWT token has correct expiry (30 days)
- [ ] Standard session expires after 24h, Remember Me after 30d

**Guest Login (SQLITE-021):**
- [ ] Guest login creates new guest account
- [ ] Guest user has unique ID (guest_{timestamp}_{random})
- [ ] Guest user has Chinese username (訪客_xxx)
- [ ] Guest user has isGuest flag set to true
- [ ] Guest session is 24 hours (no Remember Me)
- [ ] Guest can access platform features

### Integration Test Example

```typescript
describe('NextAuth.js Authentication', () => {
  it('should authenticate user with valid credentials', async () => {
    const result = await signIn('credentials', {
      email: 'test@example.com',
      password: 'validPassword123',
      redirect: false,
    });

    expect(result.error).toBeUndefined();
    expect(result.ok).toBe(true);
  });

  it('should reject invalid password', async () => {
    const result = await signIn('credentials', {
      email: 'test@example.com',
      password: 'wrongPassword',
      redirect: false,
    });

    expect(result.error).toBe('CredentialsSignin');
    expect(result.ok).toBe(false);
  });
});
```

---

## Troubleshooting

### Common Issues

**Issue**: `NEXTAUTH_SECRET` not set
```bash
Error: [next-auth][error][NO_SECRET]
Please define a `secret` in production.
```
**Solution**: Set `NEXTAUTH_SECRET` in `.env.local`

**Issue**: Session not persisting
```bash
# Check if cookies are being set
Network tab → Response Headers → Set-Cookie
```
**Solution**: Ensure `NEXTAUTH_URL` matches current domain

**Issue**: User not found during sign in
```bash
❌ [NextAuth] User not found: user@example.com
```
**Solution**: Verify user exists in SQLite database and email is lowercase

**Issue**: bcrypt verification fails
```bash
❌ [NextAuth] Invalid password for user: user@example.com
```
**Solution**: Ensure password hash was created with same bcrypt version and salt rounds

---

## Future Enhancements

### Planned Features

- [ ] OAuth Providers (Google, GitHub)
- [ ] Email Verification
- [ ] Password Reset Flow
- [ ] Account Lockout (failed login attempts)
- [ ] Session Revocation (requires database sessions)
- [ ] Multi-Factor Authentication (2FA)
- [ ] Guest account conversion to permanent account

---

## Related Documentation

- **SQLITE-020**: User Registration API (`src/app/api/auth/register/route.ts`)
- **Password Validation**: `src/lib/utils/password-validation.ts`
- **User Repository**: `src/lib/repositories/user-repository.ts`
- **Type Definitions**: `src/types/next-auth.d.ts`
- **Migration**: `scripts/migrations/add-password-fields.ts`

---

## Changelog

### 2025-10-30 (SQLITE-019)
- ✅ Initial implementation of NextAuth.js API route
- ✅ Credentials provider with SQLite integration
- ✅ JWT session strategy with 24-hour expiry
- ✅ Custom callbacks for session/JWT customization
- ✅ Event handlers for sign in/out logging
- ✅ Type definitions for extended Session and JWT
- ✅ Environment configuration (NEXTAUTH_SECRET, NEXTAUTH_URL)
- ✅ TypeScript validation with 0 errors

### 2025-10-30 (SQLITE-021)
- ✅ Implemented Remember Me functionality with dynamic session duration
  - Standard session: 24 hours (86400 seconds)
  - Remember Me session: 30 days (2592000 seconds)
  - Dynamic JWT token expiry based on user preference
- ✅ Implemented Guest/Anonymous login provider
  - Auto-generated guest accounts with unique IDs
  - Chinese guest usernames (訪客_xxx)
  - isGuest flag for UI customization
  - Guest users stored in SQLite database
- ✅ Added rememberMe field to credentials provider
- ✅ Updated JWT callback to set dynamic token expiration
- ✅ Updated Session callback to include isGuest flag
- ✅ Added createGuestUser() function to user-repository
- ✅ Added isGuest column to SQLite users table
- ✅ Updated login page UI with Remember Me checkbox and Guest Login button
- ✅ TypeScript validation with 2 errors fixed

### 2025-10-30 (SQLITE-024)
- ✅ Removed Firebase Admin authentication dependency
  - Deleted `firebase-admin.ts` and `verifyAuthHeader()` function
  - Migrated API routes from Firebase ID token verification to NextAuth sessions
- ✅ Updated API route authentication pattern
  - Old: `const uid = await verifyAuthHeader(request.headers.get('authorization'))`
  - New: `const session = await getServerSession(authOptions); const uid = session?.user?.id`
- ✅ Migrated from Bearer token authentication to session cookies
  - Removed Authorization header handling from API routes
  - Now using HTTP-only cookies automatically managed by NextAuth
- ✅ Updated API routes to use NextAuth session verification:
  - `src/app/api/daily-tasks/submit/route.ts` - Now uses `getServerSession()`
  - `src/app/api/daily-tasks/generate/route.ts` - Now uses `getServerSession()`
- ✅ Removed client-side token generation
  - Removed all `getIdToken()` calls from page components
  - Session cookies now sent automatically with API requests
- ✅ Updated UI components to use NextAuth
  - `AppShell.tsx` - Changed from Firebase `signOut(auth)` to NextAuth `signOut({ callbackUrl })`
- ✅ Benefits of migration:
  - More secure with HTTP-only cookies (no token in JavaScript)
  - Simpler API (no Authorization header management)
  - Built-in CSRF protection
  - Consistent authentication across client and server

---

**Status**: ✅ Completed (Phase 4 - SQLITE-019, SQLITE-021, SQLITE-024)
**Dependencies**: user-repository (SQLITE-016), password-validation (SQLITE-020), sqlite-db (SQLITE-014)
**Next Steps**: Firestore data migration to SQLite (SQLITE-025)
