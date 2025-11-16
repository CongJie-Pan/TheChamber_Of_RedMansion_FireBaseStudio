#!/usr/bin/env tsx
/**
 * @fileOverview CLI utility to reset a local user's password in SQLite.
 *
 * Provides a secure workflow for updating existing user accounts when the
 * plaintext password is lost. The script:
 *  - Validates input flags (--email or --user-id plus --password)
 *  - Fetches the target user via repository helpers
 *  - Rejects guest accounts to preserve baseline testing data
 *  - Hashes the new password with bcrypt using shared utilities
 *  - Persists the hash with updateUserPasswordHash()
 *
 * Usage:
 *   pnpm reset:user-password -- --email user@example.com --password NewPass123
 */

import { hashPassword, MIN_PASSWORD_LENGTH } from '../src/lib/utils/password-validation';
import {
  getUserByEmail,
  getUserById,
  updateUserPasswordHash,
  type UserProfile,
} from '../src/lib/repositories/user-repository';

/**
 * CLI parameter structure.
 */
export interface ResetUserPasswordArgs {
  email?: string;
  userId?: string;
  password?: string;
}

/**
 * Result returned after successfully updating a password hash.
 */
export interface ResetUserPasswordResult {
  userId: string;
  email?: string;
  username: string;
}

/**
 * Parse CLI arguments into a structured object.
 *
 * @param argv - Raw argument list (excluding node + script)
 * @returns Parsed arguments
 */
export function parseArgs(argv: string[]): ResetUserPasswordArgs {
  const parsed: ResetUserPasswordArgs = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--email') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --email');
      }
      parsed.email = value;
      i += 1;
      continue;
    }

    if (arg === '--user-id' || arg === '--userId') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --user-id');
      }
      parsed.userId = value;
      i += 1;
      continue;
    }

    if (arg === '--password') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --password');
      }
      parsed.password = value;
      i += 1;
      continue;
    }

    throw new Error(`Unsupported flag: ${arg}`);
  }

  return parsed;
}

/**
 * Core logic: resolve target user, hash the new password, and persist it.
 *
 * @param params - Input arguments (email or userId plus password)
 * @returns Identifier + metadata for auditing/logging
 */
export async function resetUserPassword(
  params: Required<Pick<ResetUserPasswordArgs, 'password'>> &
    Omit<ResetUserPasswordArgs, 'password'>
): Promise<ResetUserPasswordResult> {
  const { email, userId, password } = params;

  if (!email && !userId) {
    throw new Error('Either email or userId must be provided');
  }

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }

  const normalizedEmail = email?.toLowerCase().trim();
  let user: UserProfile | null = null;

  if (userId) {
    user = getUserById(userId);
  }

  if (!user && normalizedEmail) {
    user = getUserByEmail(normalizedEmail);
  }

  if (!user) {
    throw new Error('User not found for provided identifier');
  }

  if (user.isGuest) {
    throw new Error('Guest account passwords cannot be reset');
  }

  const hashedPassword = await hashPassword(password);
  const updated = updateUserPasswordHash(user.userId, hashedPassword);

  return {
    userId: updated.userId,
    email: updated.email || undefined,
    username: updated.username,
  };
}

/**
 * CLI entry point: parse args and run reset process with helpful logging.
 */
async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));

    if (!args.password) {
      throw new Error('Missing --password flag');
    }

    const result = await resetUserPassword({
      email: args.email,
      userId: args.userId,
      password: args.password,
    });

    console.log(
      `✅ Password updated for user ${result.userId} (${result.email ?? result.username}). Please log in with the new credentials.`
    );
  } catch (error: any) {
    console.error(`❌ Failed to reset password: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  void main();
}
