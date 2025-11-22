import { userLevelService } from '@/lib/user-level-service';

declare global {
   
  var __firestoreStore: Map<string, any> | undefined;
   
  var testUtils: any;
}

describe('Guest reset - one-time achievements re-award after reset', () => {
  const baseProfile = (uid: string) => ({
    uid,
    displayName: 'Guest User',
    email: 'guest@example.com',
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

  beforeEach(() => {
    global.__firestoreStore?.clear?.();
  });

  it('re-awards AI first question achievement after reset', async () => {
    const uid = 'reset-user-ai-1';
    const userDocPath = `users/${uid}`;
    global.testUtils.setFirestoreDoc(userDocPath, baseProfile(uid));

    // First award (should succeed and create idempotency lock)
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

    // Duplicate award before reset (should be blocked by lock)
    const r2 = await userLevelService.awardXP(
      uid,
      20,
      'First AI question (duplicate)',
      'ai_interaction',
      src,
    );
    expect(r2.success).toBe(true);
    expect(r2.isDuplicate).toBe(true);
    expect(r2.newTotalXP).toBe(20);

    // Perform guest reset (should delete locks and profile, then reinit)
    const reset = await userLevelService.resetGuestUserData(uid, 'Guest User', 'guest@example.com');
    expect(reset.success).toBe(true);

    // After reset, award again with same sourceId (should succeed anew)
    const r3 = await userLevelService.awardXP(
      uid,
      20,
      'First AI question (after reset)',
      'ai_interaction',
      src,
    );
    expect(r3.success).toBe(true);
    expect(r3.isDuplicate).toBeUndefined();
    expect(r3.newTotalXP).toBe(20);
  });

  it('re-awards Chapter 1 completion after reset and clears completedChapters', async () => {
    const uid = 'reset-user-ch1-1';
    const userDocPath = `users/${uid}`;
    global.testUtils.setFirestoreDoc(userDocPath, baseProfile(uid));

    const src = 'chapter-1';
    const a1 = await userLevelService.awardXP(
      uid,
      20,
      'Completed chapter 1',
      'reading',
      src,
    );
    expect(a1.success).toBe(true);
    expect(a1.newTotalXP).toBe(20);
    const savedAfterAward = global.testUtils.getFirestoreDoc(userDocPath);
    expect(savedAfterAward.completedChapters).toEqual(expect.arrayContaining([1]));

    // Duplicate before reset
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

    // Reset guest user
    const reset = await userLevelService.resetGuestUserData(uid, 'Guest User', 'guest@example.com');
    expect(reset.success).toBe(true);

    // After reset, profile should be reinitialized without completedChapters
    const fresh = global.testUtils.getFirestoreDoc(userDocPath);
    expect(Array.isArray(fresh.completedChapters)).toBe(true);
    expect(fresh.completedChapters.length).toBe(0);

    // Award chapter-1 again (should succeed anew and mark completed again)
    const a3 = await userLevelService.awardXP(
      uid,
      20,
      'Completed chapter 1 (after reset)',
      'reading',
      src,
    );
    expect(a3.success).toBe(true);
    expect(a3.isDuplicate).toBeUndefined();
    expect(a3.newTotalXP).toBe(20);
    const savedAfterReaward = global.testUtils.getFirestoreDoc(userDocPath);
    expect(savedAfterReaward.completedChapters).toEqual(expect.arrayContaining([1]));
  });
});

