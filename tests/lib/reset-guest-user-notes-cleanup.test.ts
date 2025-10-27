import { userLevelService } from '@/lib/user-level-service';

declare global {
  // eslint-disable-next-line no-var
  var __firestoreStore: Map<string, any> | undefined;
  // eslint-disable-next-line no-var
  var testUtils: any;
}

describe('Guest reset - notes cleanup', () => {
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

  it('deletes all notes for user after reset', async () => {
    const uid = 'reset-notes-user-1';
    const userDocPath = `users/${uid}`;
    global.testUtils.setFirestoreDoc(userDocPath, baseProfile(uid));

    // Seed two notes for this user
    global.testUtils.setFirestoreDoc('notes/note-a', {
      userId: uid,
      chapterId: 1,
      selectedText: '片段A',
      note: '筆記內容 A',
      createdAt: { _serverTimestamp: true },
      lastModified: { _serverTimestamp: true },
      isPublic: false,
    });
    global.testUtils.setFirestoreDoc('notes/note-b', {
      userId: uid,
      chapterId: 2,
      selectedText: '片段B',
      note: '筆記內容 B',
      createdAt: { _serverTimestamp: true },
      lastModified: { _serverTimestamp: true },
      isPublic: true,
    });

    // Sanity pre-check: notes exist
    let countBefore = 0;
    for (const [path, data] of global.__firestoreStore!.entries()) {
      if (path.startsWith('notes/') && data?.userId === uid) countBefore++;
    }
    expect(countBefore).toBe(2);

    // Execute reset
    const result = await userLevelService.resetGuestUserData(uid, 'Guest User', 'guest@example.com');
    expect(result.success).toBe(true);

    // Verify all notes for user are deleted
    let countAfter = 0;
    for (const [path, data] of global.__firestoreStore!.entries()) {
      if (path.startsWith('notes/') && data?.userId === uid) countAfter++;
    }
    expect(countAfter).toBe(0);
  });
});

