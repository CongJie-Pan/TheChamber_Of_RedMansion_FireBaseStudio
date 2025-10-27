import { userLevelService } from '@/lib/user-level-service';

declare global {
  // eslint-disable-next-line no-var
  var __firestoreStore: Map<string, any> | undefined;
  // eslint-disable-next-line no-var
  var testUtils: any;
}

describe('UserLevelService.awardXP - idempotent transactional awards', () => {
  const uid = 'test-user-1';
  const userDocPath = `users/${uid}`;

  beforeEach(() => {
    global.__firestoreStore?.clear?.();
    // Seed a minimal user profile document
    global.testUtils.setFirestoreDoc(userDocPath, {
      uid,
      displayName: 'Test User',
      email: 'test@example.com',
      currentLevel: 0,
      currentXP: 0,
      totalXP: 0,
      nextLevelXP: 100,
      completedChapters: [],
      unlockedContent: [],
      hasReceivedWelcomeBonus: false,
      attributes: {
        poetrySkill: 0,
        culturalKnowledge: 0,
        analyticalThinking: 0,
        socialInfluence: 0,
        learningPersistence: 0,
      },
      stats: {},
    });
  });

  it('awards once for the same sourceId (achievement) and prevents duplicate', async () => {
    const src = 'achievement-first-ai-question';

    const r1 = await userLevelService.awardXP(
      uid,
      20,
      'First AI question',
      'ai_interaction',
      src,
    );
    expect(r1.success).toBe(true);
    expect(r1.newTotalXP).toBe(20);
    expect(r1.isDuplicate).toBeUndefined();

    const r2 = await userLevelService.awardXP(
      uid,
      20,
      'First AI question (duplicate)',
      'ai_interaction',
      src,
    );
    expect(r2.success).toBe(true);
    expect(r2.isDuplicate).toBe(true);
    // Should not increase further
    expect(r2.newTotalXP).toBe(20);
  });

  it('persists completedChapters on chapter award and prevents duplicate for same chapter', async () => {
    const src = 'chapter-1';

    const a1 = await userLevelService.awardXP(
      uid,
      20,
      'Completed chapter 1',
      'reading',
      src,
    );
    expect(a1.success).toBe(true);
    expect(a1.newTotalXP).toBe(20); // from 0 to 20

    const saved = global.testUtils.getFirestoreDoc(userDocPath);
    expect(saved.completedChapters).toEqual(expect.arrayContaining([1]));

    const a2 = await userLevelService.awardXP(
      uid,
      20,
      'Completed chapter 1 (duplicate)',
      'reading',
      src,
    );
    expect(a2.success).toBe(true);
    expect(a2.isDuplicate).toBe(true);
    expect(a2.newTotalXP).toBe(20);
  });

  it('without sourceId, awards are not idempotent and accumulate each call', async () => {
    const r1 = await userLevelService.awardXP(uid, 5, 'No source A', 'reading');
    expect(r1.success).toBe(true);
    expect(r1.newTotalXP).toBe(5);

    const r2 = await userLevelService.awardXP(uid, 5, 'No source B', 'reading');
    expect(r2.success).toBe(true);
    expect(r2.newTotalXP).toBe(10);
  });
});

