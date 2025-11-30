/**
 * @fileOverview Registration API Route Tests
 *
 * Tests for POST /api/auth/register endpoint
 * Task 4.8: preferredName (username) validation and uniqueness
 *
 * @phase Phase 4 - Authentication
 */

// Mock NextResponse before imports
const nextResponseJsonMock = jest.fn((body: any, init?: { status?: number }) => ({
  json: async () => body,
  status: init?.status ?? 200,
}));

jest.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: {
    json: nextResponseJsonMock,
  },
}));

// Mock user repository
jest.mock('@/lib/repositories/user-repository', () => ({
  getUserByEmail: jest.fn(),
  getUserByUsername: jest.fn(),
  createUser: jest.fn(),
}));

// Mock password validation
jest.mock('@/lib/utils/password-validation', () => ({
  validatePasswordStrength: jest.fn(() => ({ isValid: true, errors: [] })),
  hashPassword: jest.fn(() => Promise.resolve('hashed_password_123')),
  MIN_PASSWORD_LENGTH: 8,
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

import { POST } from '@/app/api/auth/register/route';
import { getUserByEmail, getUserByUsername, createUser } from '@/lib/repositories/user-repository';
import { validatePasswordStrength } from '@/lib/utils/password-validation';

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mocks for successful registration
    (getUserByEmail as jest.Mock).mockResolvedValue(null);
    (getUserByUsername as jest.Mock).mockResolvedValue(null);
    (createUser as jest.Mock).mockResolvedValue({
      userId: 'test-uuid-123',
      username: 'TestUser',
      email: 'test@example.com',
    });
  });

  const createRequest = (body: Record<string, unknown>) =>
    ({
      json: async () => body,
    } as unknown as Request);

  const validRegistrationData = {
    email: 'test@example.com',
    password: 'SecurePass123!',
    firstName: 'Test',
    lastName: 'User',
    preferredName: 'TestUser',
  };

  describe('Task 4.8: preferredName (username) validation', () => {
    describe('Success cases', () => {
      test('should register user with valid preferredName', async () => {
        const request = createRequest(validRegistrationData);

        const response = await POST(request as any);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.success).toBe(true);
        expect(data.userId).toBe('test-uuid-123');
        expect(createUser).toHaveBeenCalledWith(
          'test-uuid-123',
          'TestUser',
          'test@example.com',
          'hashed_password_123'
        );
      });

      test('should accept Chinese characters in preferredName', async () => {
        const request = createRequest({
          ...validRegistrationData,
          preferredName: '林黛玉',
        });

        const response = await POST(request as any);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.success).toBe(true);
      });

      test('should accept mixed Chinese/English preferredName', async () => {
        const request = createRequest({
          ...validRegistrationData,
          preferredName: '紅樓Reader123',
        });

        const response = await POST(request as any);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.success).toBe(true);
      });

      test('should accept preferredName with underscores', async () => {
        const request = createRequest({
          ...validRegistrationData,
          preferredName: 'Test_User_123',
        });

        const response = await POST(request as any);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.success).toBe(true);
      });
    });

    describe('Validation failures', () => {
      test('should reject empty preferredName', async () => {
        const request = createRequest({
          ...validRegistrationData,
          preferredName: '',
        });

        const response = await POST(request as any);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.code).toBe('VALIDATION_ERROR');
      });

      test('should reject preferredName shorter than 2 characters', async () => {
        const request = createRequest({
          ...validRegistrationData,
          preferredName: 'A',
        });

        const response = await POST(request as any);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.code).toBe('VALIDATION_ERROR');
      });

      test('should reject preferredName longer than 30 characters', async () => {
        const request = createRequest({
          ...validRegistrationData,
          preferredName: 'A'.repeat(31),
        });

        const response = await POST(request as any);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.code).toBe('VALIDATION_ERROR');
      });

      test('should reject preferredName with invalid characters (@)', async () => {
        const request = createRequest({
          ...validRegistrationData,
          preferredName: 'Test@User',
        });

        const response = await POST(request as any);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.code).toBe('VALIDATION_ERROR');
      });

      test('should reject preferredName with special characters (#$%)', async () => {
        const request = createRequest({
          ...validRegistrationData,
          preferredName: 'Test#User$%',
        });

        const response = await POST(request as any);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.code).toBe('VALIDATION_ERROR');
      });

      test('should reject missing preferredName field', async () => {
        const { preferredName, ...dataWithoutPreferredName } = validRegistrationData;
        const request = createRequest(dataWithoutPreferredName);

        const response = await POST(request as any);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('Uniqueness check', () => {
      test('should reject duplicate preferredName (USERNAME_EXISTS)', async () => {
        (getUserByUsername as jest.Mock).mockResolvedValue({
          userId: 'existing-user-id',
          username: 'TestUser',
        });

        const request = createRequest(validRegistrationData);

        const response = await POST(request as any);
        const data = await response.json();

        expect(response.status).toBe(409);
        expect(data.success).toBe(false);
        expect(data.code).toBe('USERNAME_EXISTS');
        expect(getUserByUsername).toHaveBeenCalledWith('TestUser');
      });

      test('should check username uniqueness after email check', async () => {
        // Track call order using mock implementation
        const callOrder: string[] = [];
        (getUserByEmail as jest.Mock).mockImplementation(() => {
          callOrder.push('email');
          return Promise.resolve(null);
        });
        (getUserByUsername as jest.Mock).mockImplementation(() => {
          callOrder.push('username');
          return Promise.resolve(null);
        });

        const request = createRequest(validRegistrationData);
        await POST(request as any);

        // Verify email was checked before username
        expect(callOrder).toEqual(['email', 'username']);
      });
    });
  });

  describe('Email validation', () => {
    test('should reject duplicate email (EMAIL_EXISTS)', async () => {
      (getUserByEmail as jest.Mock).mockResolvedValue({
        userId: 'existing-user-id',
        email: 'test@example.com',
      });

      const request = createRequest(validRegistrationData);

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.code).toBe('EMAIL_EXISTS');
    });

    test('should reject invalid email format', async () => {
      const request = createRequest({
        ...validRegistrationData,
        email: 'invalid-email',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Password validation', () => {
    test('should reject weak password', async () => {
      (validatePasswordStrength as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Password must contain uppercase letter'],
      });

      const request = createRequest(validRegistrationData);

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('WEAK_PASSWORD');
    });

    test('should reject password shorter than 8 characters', async () => {
      const request = createRequest({
        ...validRegistrationData,
        password: 'short',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Error handling', () => {
    test('should handle database errors gracefully', async () => {
      // Ensure password validation passes for this test
      (validatePasswordStrength as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      (createUser as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const request = createRequest(validRegistrationData);

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.code).toBe('DATABASE_ERROR');
    });

    test('should handle JSON parsing errors', async () => {
      const request = {
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as unknown as Request;

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });
});
