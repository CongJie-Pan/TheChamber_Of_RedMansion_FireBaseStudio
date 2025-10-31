/**
 * Unit Tests - XP Award Client-Side Validation (Phase 3-T3)
 *
 * Tests the client-side parameter validation added to prevent
 * "Invalid request data" errors when awarding XP in AI Q&A flow.
 *
 * Bug Fix Location: src/app/(main)/read-book/page.tsx:285-340
 * Fix: Added parameter validation before API call with descriptive errors
 *
 * @jest-environment node
 */

describe('XP Award Client-Side Validation (P3-T3)', () => {
  /**
   * Mock awardXP function that mimics the validation logic from read-book/page.tsx:285-340
   */
  const createAwardXpFunction = () => {
    return async (params: {
      userId: string;
      amount: number;
      reason: string;
      source?: string;
      sourceId?: string;
    }) => {
      const { userId, amount, reason, source, sourceId } = params;

      // Client-side validation (matches read-book/page.tsx:289-308)
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        throw new Error('Invalid userId: must be a non-empty string');
      }

      if (
        typeof amount !== 'number' ||
        !Number.isInteger(amount) ||
        amount <= 0
      ) {
        throw new Error('Invalid amount: must be a positive integer');
      }

      if (
        !reason ||
        typeof reason !== 'string' ||
        reason.length < 1 ||
        reason.length > 200
      ) {
        throw new Error('Invalid reason: must be 1-200 characters');
      }

      // Validation passed - simulate API call
      return {
        success: true,
        userId,
        amount,
        reason,
        source,
        sourceId,
      };
    };
  };

  describe('userId Validation', () => {
    it('should accept valid userId', async () => {
      const awardXP = createAwardXpFunction();

      const result = await awardXP({
        userId: 'user-123',
        amount: 10,
        reason: 'Completed Q&A',
      });

      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-123');
    });

    it('should reject empty userId', async () => {
      const awardXP = createAwardXpFunction();

      await expect(
        awardXP({
          userId: '',
          amount: 10,
          reason: 'Completed Q&A',
        })
      ).rejects.toThrow('Invalid userId: must be a non-empty string');
    });

    it('should reject whitespace-only userId', async () => {
      const awardXP = createAwardXpFunction();

      await expect(
        awardXP({
          userId: '   ',
          amount: 10,
          reason: 'Completed Q&A',
        })
      ).rejects.toThrow('Invalid userId: must be a non-empty string');
    });

    it('should reject non-string userId', async () => {
      const awardXP = createAwardXpFunction();

      await expect(
        awardXP({
          userId: null as any,
          amount: 10,
          reason: 'Completed Q&A',
        })
      ).rejects.toThrow('Invalid userId');
    });

    it('should reject undefined userId', async () => {
      const awardXP = createAwardXpFunction();

      await expect(
        awardXP({
          userId: undefined as any,
          amount: 10,
          reason: 'Completed Q&A',
        })
      ).rejects.toThrow('Invalid userId');
    });
  });

  describe('amount Validation', () => {
    it('should accept valid positive integer amount', async () => {
      const awardXP = createAwardXpFunction();

      const result = await awardXP({
        userId: 'user-123',
        amount: 15,
        reason: 'Completed Q&A',
      });

      expect(result.success).toBe(true);
      expect(result.amount).toBe(15);
    });

    it('should reject zero amount', async () => {
      const awardXP = createAwardXpFunction();

      await expect(
        awardXP({
          userId: 'user-123',
          amount: 0,
          reason: 'Completed Q&A',
        })
      ).rejects.toThrow('Invalid amount: must be a positive integer');
    });

    it('should reject negative amount', async () => {
      const awardXP = createAwardXpFunction();

      await expect(
        awardXP({
          userId: 'user-123',
          amount: -10,
          reason: 'Completed Q&A',
        })
      ).rejects.toThrow('Invalid amount: must be a positive integer');
    });

    it('should reject decimal amount', async () => {
      const awardXP = createAwardXpFunction();

      await expect(
        awardXP({
          userId: 'user-123',
          amount: 10.5,
          reason: 'Completed Q&A',
        })
      ).rejects.toThrow('Invalid amount: must be a positive integer');
    });

    it('should reject non-numeric amount', async () => {
      const awardXP = createAwardXpFunction();

      await expect(
        awardXP({
          userId: 'user-123',
          amount: '10' as any,
          reason: 'Completed Q&A',
        })
      ).rejects.toThrow('Invalid amount');
    });

    it('should reject NaN amount', async () => {
      const awardXP = createAwardXpFunction();

      await expect(
        awardXP({
          userId: 'user-123',
          amount: NaN,
          reason: 'Completed Q&A',
        })
      ).rejects.toThrow('Invalid amount');
    });
  });

  describe('reason Validation', () => {
    it('should accept valid reason', async () => {
      const awardXP = createAwardXpFunction();

      const result = await awardXP({
        userId: 'user-123',
        amount: 10,
        reason: 'Completed daily task: reading comprehension',
      });

      expect(result.success).toBe(true);
      expect(result.reason).toBe('Completed daily task: reading comprehension');
    });

    it('should accept reason at minimum length (1 character)', async () => {
      const awardXP = createAwardXpFunction();

      const result = await awardXP({
        userId: 'user-123',
        amount: 10,
        reason: 'A',
      });

      expect(result.success).toBe(true);
    });

    it('should accept reason at maximum length (200 characters)', async () => {
      const awardXP = createAwardXpFunction();

      const longReason = 'A'.repeat(200);
      const result = await awardXP({
        userId: 'user-123',
        amount: 10,
        reason: longReason,
      });

      expect(result.success).toBe(true);
    });

    it('should reject empty reason', async () => {
      const awardXP = createAwardXpFunction();

      await expect(
        awardXP({
          userId: 'user-123',
          amount: 10,
          reason: '',
        })
      ).rejects.toThrow('Invalid reason: must be 1-200 characters');
    });

    it('should reject reason exceeding 200 characters', async () => {
      const awardXP = createAwardXpFunction();

      const tooLongReason = 'A'.repeat(201);
      await expect(
        awardXP({
          userId: 'user-123',
          amount: 10,
          reason: tooLongReason,
        })
      ).rejects.toThrow('Invalid reason: must be 1-200 characters');
    });

    it('should reject non-string reason', async () => {
      const awardXP = createAwardXpFunction();

      await expect(
        awardXP({
          userId: 'user-123',
          amount: 10,
          reason: null as any,
        })
      ).rejects.toThrow('Invalid reason');
    });

    it('should reject undefined reason', async () => {
      const awardXP = createAwardXpFunction();

      await expect(
        awardXP({
          userId: 'user-123',
          amount: 10,
          reason: undefined as any,
        })
      ).rejects.toThrow('Invalid reason');
    });
  });

  describe('Optional Parameters', () => {
    it('should accept valid source and sourceId', async () => {
      const awardXP = createAwardXpFunction();

      const result = await awardXP({
        userId: 'user-123',
        amount: 10,
        reason: 'Completed Q&A',
        source: 'ai-qa',
        sourceId: 'qa-session-456',
      });

      expect(result.success).toBe(true);
      expect(result.source).toBe('ai-qa');
      expect(result.sourceId).toBe('qa-session-456');
    });

    it('should accept missing source and sourceId', async () => {
      const awardXP = createAwardXpFunction();

      const result = await awardXP({
        userId: 'user-123',
        amount: 10,
        reason: 'Completed Q&A',
      });

      expect(result.success).toBe(true);
      expect(result.source).toBeUndefined();
      expect(result.sourceId).toBeUndefined();
    });
  });

  describe('Real-World Scenarios', () => {
    it('should validate typical AI Q&A XP award', async () => {
      const awardXP = createAwardXpFunction();

      const result = await awardXP({
        userId: 'authenticated-user-789',
        amount: 5,
        reason: 'AI Q&A: Asked about character relationships',
        source: 'ai-qa',
        sourceId: 'session-12345',
      });

      expect(result.success).toBe(true);
    });

    it('should validate welcome bonus XP award', async () => {
      const awardXP = createAwardXpFunction();

      const result = await awardXP({
        userId: 'new-user-456',
        amount: 10,
        reason: 'Welcome to reading!',
        source: 'welcome-bonus',
        sourceId: 'welcome-bonus-new-user-456',
      });

      expect(result.success).toBe(true);
    });

    it('should provide descriptive error for debugging', async () => {
      const awardXP = createAwardXpFunction();

      try {
        await awardXP({
          userId: 'user-123',
          amount: -5, // Invalid
          reason: 'Test',
        });
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Invalid amount');
        expect(error.message).toContain('positive integer');
      }
    });
  });
});
