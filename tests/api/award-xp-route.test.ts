/**
 * @fileOverview Tests for /api/user-level/award-xp route
 *
 * Verifies that the API returns the metadata required by clients
 * (e.g., duplicate detection and level-up transitions).
 */

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

import { POST } from '@/app/api/user-level/award-xp/route';
import { userLevelService } from '@/lib/user-level-service';
import { getServerSession } from 'next-auth';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/user-level-service', () => ({
  userLevelService: {
    awardXP: jest.fn(),
  },
}));

jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}));

describe('POST /api/user-level/award-xp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (body: Record<string, unknown>) =>
    ({
      json: async () => body,
    } as unknown as Request);

  it('returns level-up metadata when service reports level progression', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user-123' },
    });

    (userLevelService.awardXP as jest.Mock).mockResolvedValue({
      success: true,
      newTotalXP: 95,
      newLevel: 1,
      leveledUp: true,
      fromLevel: 0,
      isDuplicate: false,
      unlockedContent: ['每日任務系統'],
      unlockedPermissions: ['daily_tasks'],
    });

    const request = createRequest({
      userId: 'user-123',
      amount: 5,
      reason: '章節完成',
      source: 'reading',
      sourceId: 'chapter-1',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data).toMatchObject({
      success: true,
      newTotalXP: 95,
      newLevel: 1,
      leveledUp: true,
      fromLevel: 0,
      isDuplicate: false,
      unlockedContent: ['每日任務系統'],
      unlockedPermissions: ['daily_tasks'],
    });
  });
});
