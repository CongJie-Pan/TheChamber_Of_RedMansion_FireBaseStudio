/**
 * @fileOverview User Registration API Route
 *
 * This API endpoint handles new user registration with email/password authentication.
 * Replaces Firebase Authentication createUserWithEmailAndPassword as part of Phase 4 migration.
 *
 * Features:
 * - Comprehensive input validation with Zod schema
 * - Email uniqueness checking
 * - Password strength validation
 * - bcrypt password hashing (10 salt rounds)
 * - User profile creation in SQLite database
 * - Detailed error handling and logging
 *
 * Request format:
 * POST /api/auth/register
 * {
 *   "email": "user@example.com",
 *   "password": "securePassword123",
 *   "firstName": "John",
 *   "lastName": "Doe"
 * }
 *
 * Response format (success):
 * {
 *   "success": true,
 *   "userId": "generated-uuid",
 *   "message": "Registration successful"
 * }
 *
 * Response format (error):
 * {
 *   "success": false,
 *   "error": "Error message",
 *   "code": "ERROR_CODE"
 * }
 *
 * @phase Phase 4 - Authentication Replacement
 * @task SQLITE-020
 * @date 2025-10-30
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getUserByEmail, createUser } from '@/lib/repositories/user-repository';
import {
  validatePasswordStrength,
  hashPassword,
  MIN_PASSWORD_LENGTH,
} from '@/lib/utils/password-validation';

/**
 * Registration request validation schema
 *
 * Defines the structure and validation rules for registration requests.
 * Uses Zod for runtime type validation and error messages.
 */
const registerSchema = z.object({
  /**
   * User email address
   * - Must be valid email format
   * - Will be converted to lowercase for consistency
   * - Uniqueness checked against database
   */
  email: z
    .string()
    .email({ message: 'Invalid email address format' })
    .toLowerCase()
    .trim(),

  /**
   * User password
   * - Minimum 8 characters
   * - Additional strength validation applied separately
   */
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, {
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
    }),

  /**
   * User first name
   * - 1-50 characters
   * - Trimmed whitespace
   */
  firstName: z
    .string()
    .min(1, { message: 'First name is required' })
    .max(50, { message: 'First name must be 50 characters or less' })
    .trim(),

  /**
   * User last name
   * - 1-50 characters
   * - Trimmed whitespace
   */
  lastName: z
    .string()
    .min(1, { message: 'Last name is required' })
    .max(50, { message: 'Last name must be 50 characters or less' })
    .trim(),
});

/**
 * Type for validated registration data
 */
type RegisterData = z.infer<typeof registerSchema>;

/**
 * Generate username from first and last name
 *
 * Creates a username by combining first and last name.
 * Ensures the username is URL-safe and database-compatible.
 *
 * @param firstName - User's first name
 * @param lastName - User's last name
 * @returns Generated username (3-40 characters)
 */
function generateUsername(firstName: string, lastName: string): string {
  // Combine first and last name
  const combined = `${firstName}${lastName}`;

  // Remove non-alphanumeric characters and convert to lowercase
  let username = combined.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

  // Ensure minimum length (3 characters)
  if (username.length < 3) {
    username = username.padEnd(3, '0');
  }

  // Ensure maximum length (40 characters)
  if (username.length > 40) {
    username = username.substring(0, 40);
  }

  return username;
}

/**
 * POST /api/auth/register
 *
 * Handle user registration requests
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();

    console.log('📝 [Registration] Processing registration request...');

    // Validate request data with Zod schema
    let validatedData: RegisterData;
    try {
      validatedData = registerSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log('❌ [Registration] Validation failed:', error.issues);
        return NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: error.issues.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
          { status: 400 }
        );
      }
      throw error;
    }

    const { email, password, firstName, lastName } = validatedData;

    // Additional password strength validation
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      console.log('❌ [Registration] Weak password:', passwordValidation.errors);
      return NextResponse.json(
        {
          success: false,
          error: 'Password does not meet strength requirements',
          code: 'WEAK_PASSWORD',
          details: passwordValidation.errors,
        },
        { status: 400 }
      );
    }

    // Check if email already exists
    console.log(`🔍 [Registration] Checking email uniqueness: ${email}`);
    const existingUser = await getUserByEmail(email);

    if (existingUser) {
      console.log(`❌ [Registration] Email already registered: ${email}`);
      return NextResponse.json(
        {
          success: false,
          error: 'An account with this email already exists',
          code: 'EMAIL_EXISTS',
        },
        { status: 409 } // 409 Conflict
      );
    }

    // Generate unique user ID
    const userId = uuidv4();

    // Generate username from first and last name
    const username = generateUsername(firstName, lastName);

    console.log(`🔐 [Registration] Hashing password for user: ${userId}`);

    // Hash password with bcrypt
    let passwordHash: string;
    try {
      passwordHash = await hashPassword(password);
    } catch (error) {
      console.error('❌ [Registration] Password hashing failed:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Registration failed due to server error',
          code: 'HASHING_ERROR',
        },
        { status: 500 }
      );
    }

    console.log(`💾 [Registration] Creating user in database: ${userId}`);

    // Create user in SQLite database
    try {
      const newUser = await createUser(userId, username, email, passwordHash);

      console.log(`✅ [Registration] User created successfully: ${userId} (${email})`);

      // Return success response (without sensitive data)
      return NextResponse.json(
        {
          success: true,
          userId: newUser.userId,
          username: newUser.username,
          email: newUser.email,
          message: 'Registration successful',
        },
        { status: 201 } // 201 Created
      );
    } catch (error: any) {
      console.error('❌ [Registration] Database error:', error);

      // Check for unique constraint violation (email already exists)
      if (error.message && error.message.includes('UNIQUE constraint failed')) {
        return NextResponse.json(
          {
            success: false,
            error: 'An account with this email already exists',
            code: 'EMAIL_EXISTS',
          },
          { status: 409 }
        );
      }

      // Generic database error
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create user account',
          code: 'DATABASE_ERROR',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ [Registration] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred during registration',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * Handle unsupported HTTP methods
 */
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Use POST to register a new user.',
      code: 'METHOD_NOT_ALLOWED',
    },
    { status: 405 }
  );
}
