/**
 * @fileOverview Password Validation and Encryption Utilities
 *
 * This module provides password security utilities for the application,
 * including strength validation, bcrypt hashing, and password verification.
 *
 * Security features:
 * - Password strength validation with configurable rules
 * - bcrypt password hashing with salt rounds
 * - Secure password comparison
 * - Clear validation error messages
 *
 * @phase Phase 4 - Authentication Replacement
 * @task SQLITE-020
 * @date 2025-10-30
 */

import * as bcrypt from 'bcryptjs';

/**
 * Password validation constants
 */
export const MIN_PASSWORD_LENGTH = 8;
export const BCRYPT_SALT_ROUNDS = 10;

/**
 * Password validation result interface
 */
export interface PasswordValidationResult {
  /**
   * Whether the password passes all validation rules
   */
  isValid: boolean;

  /**
   * Array of validation error messages
   * Empty if password is valid
   */
  errors: string[];
}

/**
 * Validate password strength
 *
 * Checks password against security requirements:
 * - Minimum length (8 characters)
 * - Not empty or whitespace-only
 *
 * Optional recommendations (not enforced):
 * - At least 1 uppercase letter
 * - At least 1 number
 * - At least 1 special character
 *
 * @param password - Password to validate
 * @returns Validation result with isValid flag and error messages
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // Check if password is empty or null
  if (!password || password.trim().length === 0) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  // Check minimum length
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }

  // Optional: Check for whitespace-only passwords
  if (password.trim().length !== password.length) {
    errors.push('Password cannot start or end with whitespace');
  }

  // Note: We don't enforce uppercase/numbers/special chars to allow
  // users to choose their own password strategy (e.g., passphrases)
  // These can be added as recommendations in the UI layer

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Hash a password using bcrypt
 *
 * Uses bcrypt with configured salt rounds to create a secure hash.
 * The resulting hash can be safely stored in the database.
 *
 * @param password - Plain text password to hash
 * @returns Promise resolving to bcrypt hash string
 * @throws Error if hashing fails
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    return hash;
  } catch (error) {
    console.error('❌ [PasswordValidation] Failed to hash password:', error);
    throw new Error('Password hashing failed');
  }
}

/**
 * Verify a password against a bcrypt hash
 *
 * Compares a plain text password with a stored bcrypt hash.
 * Uses constant-time comparison to prevent timing attacks.
 *
 * @param password - Plain text password to verify
 * @param hash - Bcrypt hash from database
 * @returns Promise resolving to true if password matches, false otherwise
 * @throws Error if verification fails due to invalid hash format
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    const isValid = await bcrypt.compare(password, hash);
    return isValid;
  } catch (error) {
    console.error('❌ [PasswordValidation] Failed to verify password:', error);
    // Return false instead of throwing to prevent information leakage
    return false;
  }
}

/**
 * Generate a random secure password (utility function)
 *
 * Can be used for temporary passwords, password reset tokens, etc.
 * Generates a cryptographically secure random password.
 *
 * @param length - Length of password to generate (default: 16)
 * @returns Randomly generated password
 */
export function generateSecurePassword(length: number = 16): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const randomValues = new Uint8Array(length);

  // Use crypto.getRandomValues for cryptographically secure random numbers
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues);
  } else {
    // Fallback for environments without crypto API (shouldn't happen in modern environments)
    for (let i = 0; i < length; i++) {
      randomValues[i] = Math.floor(Math.random() * 256);
    }
  }

  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length];
  }

  return password;
}

/**
 * Estimate password strength (0-5 scale)
 *
 * Provides a simple strength indicator for UI feedback.
 * NOT used for validation, only for user guidance.
 *
 * @param password - Password to evaluate
 * @returns Strength score: 0 (very weak) to 5 (very strong)
 */
export function estimatePasswordStrength(password: string): number {
  if (!password) return 0;

  let score = 0;

  // Length scoring
  if (password.length >= MIN_PASSWORD_LENGTH) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  // Complexity scoring
  if (/[a-z]/.test(password)) score++; // Has lowercase
  if (/[A-Z]/.test(password)) score++; // Has uppercase
  if (/[0-9]/.test(password)) score++; // Has numbers
  if (/[^a-zA-Z0-9]/.test(password)) score++; // Has special chars

  // Cap at 5
  return Math.min(score, 5);
}
