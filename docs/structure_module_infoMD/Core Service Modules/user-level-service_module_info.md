# Module: `user-level-service.ts`

## 1. Module Summary

The `user-level-service` module is the core gamification service managing the Red Mansion Cultivation Path (紅樓修行路) progression system, handling user profiles, experience points (XP), levels (0-7), attribute points (5 types), permissions, and content unlocking. This 1188-line service implements atomic transactional XP awards with sourceId-based idempotency locks preventing duplicate rewards, automatic NaN corruption detection and repair for profile data integrity, level-up detection with cascade content unlocking and permission granting, comprehensive XP economy configuration (30+ reward types including reading, daily tasks, community, AI interactions, achievements), chapter completion tracking for cross-system deduplication, attribute and statistics management, permission checking (async and synchronous), audit trail logging (level-ups and XP transactions), and guest user complete data reset for testing scenarios.

## 2. Module Dependencies

* **Internal Dependencies:**
  * `@/lib/firebase` - Firestore database client for persistence operations.
  * `@/lib/types/user-level` - Type definitions for UserProfile, UserLevel, LevelUpRecord, XPTransaction, LevelPermission, AttributePoints, LevelRequirementCheck.
  * `@/lib/config/levels-config` - Level configuration data (LEVELS_CONFIG, MAX_LEVEL), utility functions (getLevelConfig, getAllPermissionsForLevel, calculateLevelFromXP, calculateXPProgress).
* **External Dependencies:**
  * `firebase/firestore` - Comprehensive Firestore operations including atomic transactions (collection, doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, query, where, orderBy, limit, getDocs, increment, serverTimestamp, Timestamp, runTransaction).

## 3. Public API / Exports

* **Class Exports:**
  * `UserLevelService` - Main service class managing all user progression operations.
* **Instance Exports:**
  * `userLevelService: UserLevelService` - Singleton instance for global use.
* **Constant Exports:**
  * `XP_REWARDS: const` - Comprehensive XP economy configuration with 30+ reward types and amounts.
* **UserLevelService Methods:**
  * `initializeUserProfile(userId: string, displayName: string, email: string): Promise<UserProfile>` - Create new user profile with initial stats and attributes.
  * `getUserProfile(userId: string): Promise<UserProfile | null>` - Fetch user profile with automatic NaN corruption repair.
  * `checkDuplicateReward(userId: string, sourceId: string): Promise<boolean>` - Public cross-system duplicate check.
  * `awardXP(userId: string, amount: number, reason: string, source: XPTransaction['source'], sourceId?: string): Promise<{success, newTotalXP, newLevel, leveledUp, isDuplicate?, fromLevel?, unlockedContent?, unlockedPermissions?}>` - Core XP awarding with transactional idempotency.
  * `getUserLevel(userId: string): Promise<UserLevel | null>` - Get current level configuration.
  * `getNextLevelRequirements(currentLevel: number): UserLevel | null` - Get next level config or null at max level.
  * `checkPermission(userId: string, permission: LevelPermission): Promise<boolean>` - Async permission check.
  * `checkPermissionSync(userLevel: number, permission: LevelPermission): boolean` - Synchronous permission check.
  * `checkPermissions(userId: string, permissions: LevelPermission[]): Promise<Record<LevelPermission, boolean>>` - Batch permission check.
  * `getUnlockedContent(userId: string): Promise<string[]>` - Get unlocked content IDs.
  * `checkLevelRequirements(userId: string): Promise<LevelRequirementCheck>` - Check if requirements met for next level.
  * `updateAttributes(userId: string, attributeUpdates: Partial<AttributePoints>): Promise<boolean>` - Update attribute points (clamped 0-100).
  * `updateStats(userId: string, statsUpdates: Partial<UserProfile['stats']>): Promise<boolean>` - Update user statistics.
  * `completeTask(userId: string, taskId: string): Promise<boolean>` - Mark task as completed.
  * `getLevelUpHistory(userId: string, limitCount?: number): Promise<LevelUpRecord[]>` - Fetch level-up records (default 10).
  * `getXPHistory(userId: string, limitCount?: number): Promise<XPTransaction[]>` - Fetch XP transaction history (default 20).
  * `resetGuestUserData(userId: string, displayName: string, email: string): Promise<{success, message, profile?}>` - ⚠️ Complete data wipe for guest users only.

## 4. Code File Breakdown

### 4.1. `user-level-service.ts`

* **Purpose:** Provides comprehensive gamification infrastructure transforming abstract learning activities into measurable progression with rewards, permissions, and social recognition. The module's architectural decisions prioritize data integrity, fair reward distribution, and system reliability: (1) **Transactional idempotency (critical innovation)** - Uses Firestore transactions with xpTransactionLocks collection to ensure atomic, idempotent XP awards; sourceId-based locking prevents duplicate rewards even with concurrent requests or retries, essential for distributed systems; (2) **Automatic corruption repair** - Detects NaN/null/undefined in XP fields during profile retrieval, recalculates from totalXP using calculateXPProgress, persists repair to Firestore, ensuring user profiles self-heal from any data corruption; (3) **Cross-system deduplication** - checkDuplicateReward is public to allow daily-task-service to verify content not already completed in reading page (e.g., chapter-3 content used in both systems), preventing users from earning double XP for same content; (4) **Chapter completion tracking** - Maintains completedChapters array in profile, checks sourceId pattern `chapter-\\d+` during XP award, prevents duplicate chapter rewards within transaction; (5) **Level-up cascade** - Automatically unlocks all intermediate levels if user skips levels (e.g., level 0→3 unlocks content/permissions for levels 1, 2, and 3), ensures no missed rewards; (6) **Comprehensive XP economy** - Centralized XP_REWARDS configuration with 30+ action types covering reading (chapters, time, welcome bonus), daily tasks (simple/medium/complex), community (posts, comments, likes), AI interactions (first question achievement), notes, achievements, poetry competitions, cultural quizzes, mentoring, special events; (7) **Audit trail** - Logs every XP transaction and level-up to dedicated Firestore collections for analytics, debugging, and potential rollback; (8) **Permission system** - Synchronous and asynchronous permission checking enables feature gating based on user level, supporting gradual feature unlock progression; (9) **Attribute management** - Tracks 5 learning attributes (poetrySkill, culturalKnowledge, analyticalThinking, socialInfluence, learningPersistence) with 0-100 clamping, provides granular skill progression beyond simple levels; (10) **Guest user reset** - Complete data wipe including profile, transactions, locks, notes, daily tasks, enabling clean testing and demo scenarios.
* **Functions:**
    * `initializeUserProfile(userId: string, displayName: string, email: string): Promise<UserProfile>` - **New user creation**. Checks if profile already exists via `getUserProfile`, returns existing if found (idempotent). Constructs new profile object: uid=userId, displayName, email, currentLevel=0, currentXP=0, totalXP=0, nextLevelXP from LEVELS_CONFIG[1].requiredXP, completedTasks=[], unlockedContent from LEVELS_CONFIG[0].exclusiveContent (level 0 content), completedChapters=[] (tracking for deduplication), hasReceivedWelcomeBonus=false (one-time flag), attributes=INITIAL_ATTRIBUTES (all 5 attributes at 0), stats=INITIAL_STATS (all 8 stats at 0), createdAt/updatedAt/lastActivityAt=serverTimestamp(). Writes profile to Firestore users collection with `setDoc`. Logs success message. Returns profile with actual timestamps. Catches errors and throws user-friendly message. Entry point called during user registration.
    * `getUserProfile(userId: string): Promise<UserProfile | null>` - **Profile retrieval with auto-repair**. Fetches user document from Firestore. Returns null if not exists. Reads document data. **Corruption detection**: Checks totalXP for NaN/undefined/null, sets sanitizedData.totalXP=0 and needsRepair=true if corrupt. Checks currentLevel for corruption, sets sanitizedData.currentLevel=0 and needsRepair=true. If corruption detected OR currentXP/nextLevelXP are NaN: Calls `calculateXPProgress` from levels-config with sanitizedData.totalXP, recalculates currentXP, nextLevelXP, currentLevel. Logs repair message. Persists repaired values to Firestore with updateDoc. Logs success. Returns profile object with: uid=docId, all sanitizedData fields, completedChapters (backward compatibility: defaults to []), hasReceivedWelcomeBonus (backward compatibility: defaults to false), timestamps (defaults to now if missing). Catches errors, preserves FirebaseError code (e.g., permission-denied) for upstream handling, throws enriched error. Critical method ensuring data integrity.
    * `checkDuplicateReward(userId: string, sourceId: string): Promise<boolean>` - **Public cross-system duplicate check**. Queries xpTransactionsCollection with `where('userId', '==', userId)` and `where('sourceId', '==', sourceId)`, limit(1). Executes query with getDocs. Returns true if snapshot not empty (duplicate found). Returns false if empty (no duplicate). Catches errors, returns false (assumes not duplicate to avoid blocking legitimate rewards). Made public (originally private) to support daily-task-service checking if content already completed in reading page.
    * `awardXP(userId: string, amount: number, reason: string, source: XPTransaction['source'], sourceId?: string): Promise<{...}>` - **Core XP awarding with transactional idempotency (most complex method, 310 lines)**. **Validation phase**: Throws error if amount undefined/null. Throws error if amount not a finite number or is NaN. Throws error if amount negative. **Transactional path (if sourceId provided)**: Creates userRef and lockRef with format `${userId}__${sourceId}` in xpTransactionLocks collection. Initializes txResult object. Calls `runTransaction(db, async (transaction) => {...})` for atomic execution. Inside transaction: (1) Gets lockDoc to check idempotency. If lock exists, user already received this reward; fetches existing profile, returns {success:true, newTotalXP, newLevel, leveledUp:false, isDuplicate:true}. (2) Loads user profile snapshot within transaction. Throws error if not exists. (3) **Chapter-based deduplication**: Extracts chapter number from sourceId pattern `/^chapter-(\\d+)$/`. If pattern matches, checks profile.completedChapters array. If chapter already completed, returns {success:true, isDuplicate:true} without awarding XP. (4) **Zero XP handling**: If amount===0, returns success without changes, creates lock doc to mark as processed (prevents re-processing). (5) **XP calculation**: Computes newTotalXP=oldTotalXP+amount. Calls `calculateLevelFromXP(newTotalXP)` for newLevel. Detects leveledUp=newLevel>oldLevel. Calls `calculateXPProgress(newTotalXP)` for currentXP/nextLevelXP. (6) Constructs updateData object with totalXP, currentLevel, currentXP, nextLevelXP, updatedAt, lastActivityAt. (7) **Chapter completion persistence**: If sourceId matches `chapter-(\\d+)` pattern, adds chapter to completedChapters array (deduplicated with Set). (8) Applies profile update with `transaction.update`. (9) Creates lock document with userId, sourceId, createdAt, reason, source, amount (marks as processed). (10) Sets txResult object. End transaction. **Post-transaction operations** (outside transaction for safety): If isDuplicate, returns early. Calls `logXPTransaction` to record in audit trail. **Level-up side effects**: If leveledUp: Fetches fresh profile. Calculates fromLevel (handles edge cases). Calls `recordLevelUp` with fromLevel, toLevel, totalXP, reason. Iterates all intermediate levels (fromLevel+1 to newLevel), calls `getLevelConfig` for each, collects unlockedContent and unlockedPermissions arrays. If unlockedContent not empty: Fetches fresh profile, merges with existing unlockedContent using Set, updates profile with merged content. Returns result object with success, newTotalXP, newLevel, leveledUp, optional fromLevel/unlockedContent/unlockedPermissions if leveled up. **Non-transactional fallback path (no sourceId)**: Used for non-idempotent awards (legacy support). Fetches profile. Handles 0 XP edge case. Calculates XP similarly but without transaction. Updates profile with updateDoc. Logs transaction. Handles level-up similarly. Returns result. Catches validation errors and re-throws. Logs all XP awards with emoji and reason.
    * `recordLevelUp(userId: string, fromLevel: number, toLevel: number, totalXP: number, triggerReason?: string): Promise<string>` - **Private level-up history recorder**. Constructs LevelUpRecord object: userId, fromLevel, toLevel, totalXPAtLevelUp=totalXP, timestamp=serverTimestamp(), optional triggerReason. Adds document to levelUpsCollection. Logs success message with emoji and arrow (fromLevel → toLevel). Returns document ID. Catches errors without throwing (non-critical operation). Used for analytics and displaying level-up history to users.
    * `logXPTransaction(transaction: Omit<XPTransaction, 'id' | 'timestamp'>): Promise<string>` - **Private XP audit trail logger**. Constructs XPTransaction record with all transaction data plus timestamp=serverTimestamp(). Adds document to xpTransactionsCollection. Returns document ID. Catches errors without throwing (non-critical operation). Creates complete audit trail of all XP awards for debugging, analytics, and potential rollback.
    * `getUserLevel(userId: string): Promise<UserLevel | null>` - **Current level config retrieval**. Fetches user profile via `getUserProfile`. Returns null if profile not found. Calls `getLevelConfig(profile.currentLevel)` from levels-config. Returns UserLevel configuration object (level title, description, requiredXP, permissions, exclusiveContent, specialRequirements). Catches errors and returns null.
    * `getNextLevelRequirements(currentLevel: number): UserLevel | null` - **Next level config retrieval**. Returns null if currentLevel >= MAX_LEVEL (already at max). Calls `getLevelConfig(currentLevel + 1)`. Returns next level configuration. Used for displaying "what's next" to users.
    * `checkPermission(userId: string, permission: LevelPermission): Promise<boolean>` - **Async single permission check**. Fetches user profile. Returns false if profile not found. Calls `getAllPermissionsForLevel(profile.currentLevel)` from levels-config (returns cumulative permissions up to current level). Returns `userPermissions.includes(permission)`. Catches errors and returns false (fail-closed for security). Used for server-side permission gating.
    * `checkPermissionSync(userLevel: number, permission: LevelPermission): boolean` - **Synchronous permission check**. Calls `getAllPermissionsForLevel(userLevel)`. Returns `userPermissions.includes(permission)`. Used for client-side permission gating when user level already known (avoids async overhead). Enables UI feature hiding based on level.
    * `checkPermissions(userId: string, permissions: LevelPermission[]): Promise<Record<LevelPermission, boolean>>` - **Batch permission check**. Fetches user profile. Returns all-false Record if profile not found. Calls `getAllPermissionsForLevel(profile.currentLevel)`. Iterates requested permissions, builds Record mapping each to boolean (true if user has permission). Returns permission Record. Catches errors and returns all-false Record. Efficient for checking multiple permissions at once.
    * `getUnlockedContent(userId: string): Promise<string[]>` - **Unlocked content retrieval**. Fetches user profile. Returns empty array if profile not found. Returns `profile.unlockedContent || []`. Catches errors and returns empty array. Used for content gating and displaying available content.
    * `checkLevelRequirements(userId: string): Promise<LevelRequirementCheck>` - **Level-up eligibility check**. Fetches user profile. Returns {canLevelUp:false, xpRequirementMet:false, xpNeeded:0} if profile not found. Calls `getNextLevelRequirements(profile.currentLevel)`. Returns {canLevelUp:false, xpRequirementMet:true, xpNeeded:0} if at max level. Calculates xpNeeded=Math.max(0, nextLevel.requiredXP - profile.totalXP). Sets xpRequirementMet=xpNeeded===0. **Special requirements check** (TODO: simplified implementation): Maps nextLevel.specialRequirements to requirement objects with type, description, completed (always false - TODO), progress (always 0), target. Calculates allSpecialRequirementsMet (currently always true or false based on array). Returns comprehensive LevelRequirementCheck object with canLevelUp, xpRequirementMet, xpNeeded, optional specialRequirements array. Catches errors and returns cannot-level-up result. Used for displaying level progress UI.
    * `updateAttributes(userId: string, attributeUpdates: Partial<AttributePoints>): Promise<boolean>` - **Attribute points updater**. Fetches user profile. Returns false if not found. Merges profile.attributes with attributeUpdates. **Clamping**: Iterates all attributes, clamps each to 0-100 range using Math.max(0, Math.min(100, value)). Updates Firestore with clamped attributes and updatedAt timestamp. Returns true on success. Catches errors and returns false. Ensures attribute values stay within valid range.
    * `updateStats(userId: string, statsUpdates: Partial<UserProfile['stats']>): Promise<boolean>` - **Statistics updater**. Fetches user profile. Returns false if not found. Merges profile.stats with statsUpdates. Updates Firestore with merged stats and updatedAt. Returns true on success. Catches errors and returns false. Used for tracking user activity (chapters completed, reading time, notes count, streaks, community engagement).
    * `completeTask(userId: string, taskId: string): Promise<boolean>` - **Task completion marker**. Fetches user profile. Returns false if not found. Checks if taskId already in profile.completedTasks (idempotent). Returns true if already completed. Updates Firestore adding taskId to completedTasks array and updatedAt. Returns true on success. Catches errors and returns false. Tracks which tasks user has completed.
    * `getLevelUpHistory(userId: string, limitCount: number = 10): Promise<LevelUpRecord[]>` - **Level-up history retrieval**. Queries levelUpsCollection with `where('userId', '==', userId)`, `orderBy('timestamp', 'desc')`, `limit(limitCount)`. Fetches documents. Maps to LevelUpRecord array with id, all data fields, timestamp (defaults to now if missing). Returns sorted array (newest first). Catches errors and returns empty array. Used for displaying level-up timeline to users.
    * `getXPHistory(userId: string, limitCount: number = 20): Promise<XPTransaction[]>` - **XP transaction history retrieval**. Queries xpTransactionsCollection with `where('userId', '==', userId)`, `orderBy('timestamp', 'desc')`, `limit(limitCount)`. Fetches documents. Maps to XPTransaction array with id, all data fields, timestamp (defaults to now). Returns sorted array (newest first). Catches errors and returns empty array. Used for displaying XP earning history and debugging.
    * `resetGuestUserData(userId: string, displayName: string, email: string): Promise<{success, message, profile?}>` - **Complete guest user data wipe (testing only)**. ⚠️ WARNING: Permanently deletes all user data. Logs reset start message. Fetches user profile for safety check. Returns failure if profile not found. **Step 1: Delete level-ups** - Queries levelUpsCollection by userId, deletes all matching documents in parallel with Promise.all. Logs deletion count. **Step 2: Delete XP transactions** - Queries xpTransactionsCollection by userId, deletes all in parallel. Logs count. **Step 2.5: Delete XP transaction locks** - Queries xpTransactionLocks by userId, deletes all (clears idempotency locks for fresh start). Logs count. **Step 2.6: Delete user notes** - Queries notes collection by userId, deletes all. Logs count. **Step 3: Delete daily task progress** - Queries dailyTaskProgress by userId (all dates), deletes all. Logs count. **Step 4: Delete daily task history** - Queries dailyTaskHistory by userId, deletes all. Logs count. **Step 5: Delete user profile** - Deletes main profile document. Logs success. **Step 6: Reinitialize profile** - Calls `initializeUserProfile` with userId, displayName, email. Logs reinitialization. Returns {success:true, message:'Guest user data has been successfully reset', profile:newProfile}. Catches errors and returns {success:false, message}. Enables clean testing scenarios and demo accounts.
* **Key Classes / Constants / Variables:**
    * `XP_REWARDS: const` - Comprehensive XP economy configuration with 30+ reward types organized by category: **Reading actions** (CHAPTER_COMPLETED=10, FIRST_CHAPTER_COMPLETED=20, NEW_USER_WELCOME_BONUS=15, READING_TIME_15MIN=3), **Daily tasks** (DAILY_TASK_SIMPLE=5, DAILY_TASK_MEDIUM=10, DAILY_TASK_COMPLEX=15), **Community actions** (POST_CREATED=5, POST_QUALITY_BONUS=5, COMMENT_CREATED=2, COMMENT_HELPFUL=3, LIKE_RECEIVED=1), **AI interactions** (AI_FIRST_QUESTION_ACHIEVEMENT=20 one-time), **Notes** (NOTE_CREATED=3, NOTE_QUALITY_BONUS=5, ANNOTATION_PUBLISHED=10), **Achievements** (ACHIEVEMENT_UNLOCKED=15, MILESTONE_REACHED=20), **Poetry and cultural** (POETRY_COMPETITION_PARTICIPATION=10, POETRY_COMPETITION_WIN=30, CULTURAL_QUIZ_PASSED=15), **Social and mentoring** (HELP_NEW_USER=5, MENTOR_SESSION=10), **Special events** (SPECIAL_EVENT_PARTICIPATION=20, SPECIAL_EVENT_COMPLETION=50). Central XP economy balance configuration referenced across the application.
    * `INITIAL_ATTRIBUTES: const AttributePoints` - Default attributes for new users: all 5 attributes (poetrySkill, culturalKnowledge, analyticalThinking, socialInfluence, learningPersistence) set to 0. Starting point for attribute progression.
    * `INITIAL_STATS: const` - Default statistics for new profiles: chaptersCompleted=0, totalReadingTimeMinutes=0, notesCount=0, currentStreak=0, longestStreak=0, aiInteractionsCount=0, communityPostsCount=0, communityLikesReceived=0. Eight stat fields tracking user activity.
    * `UserLevelService: class` - Main service class with 3 primary Firestore collection references: `usersCollection` (user profiles), `levelUpsCollection` (level-up history records), `xpTransactionsCollection` (XP transaction audit trail). Additional collections accessed: xpTransactionLocks (idempotency), notes (for reset), dailyTaskProgress/dailyTaskHistory (for reset). Implements 19 public methods managing all aspects of user progression.

## 5. System and Data Flow

### 5.1. System Flowchart (Control Flow)

```mermaid
flowchart TD
    A[Start: awardXP with sourceId] --> B[Validate XP amount];
    B -- Invalid --> C[Throw validation error];
    B -- Valid --> D[Start Firestore transaction];
    D --> E{Check idempotency lock};
    E -- Lock exists --> F[Return duplicate result];
    E -- No lock --> G[Load user profile in transaction];
    G --> H{Check chapter completion};
    H -- Already completed --> F;
    H -- Not completed --> I{Amount === 0?};
    I -- Yes --> J[Create lock, return success];
    I -- No --> K[Calculate new totals];
    K --> L[Calculate new level with calculateLevelFromXP];
    L --> M{Leveled up?};
    M -- Yes --> N[Set leveledUp=true];
    M -- No --> O[Set leveledUp=false];
    N --> P[Update profile in transaction];
    O --> P;
    P --> Q[Add chapter to completedChapters if applicable];
    Q --> R[Create idempotency lock];
    R --> S[Commit transaction];
    S --> T[Log XP transaction to audit trail];
    T --> U{Leveled up?};
    U -- Yes --> V[Record level-up history];
    U -- No --> W[Return result];
    V --> X[Collect unlocked content/permissions];
    X --> Y[Update profile with unlocked content];
    Y --> Z[Return result with unlocks];
    C --> End1[End with error];
    F --> End2[End with duplicate flag];
    J --> End2;
    W --> End3[End with success];
    Z --> End3;
```

### 5.2. Data Flow Diagram (Data Transformation)

```mermaid
graph LR
    Input1(userId, amount, reason, source, sourceId) --> Validation[Validate amount is finite number];
    Validation --> Lock[Check xpTransactionLocks for duplicate];
    Lock -- Duplicate --> DupResult(Return isDuplicate=true);
    Lock -- No duplicate --> Profile[(Firestore: users)];
    Profile --> Chapter{Check completedChapters};
    Chapter -- Already completed --> DupResult;
    Chapter -- Not completed --> XPCalc[Calculate newTotalXP = oldTotalXP + amount];
    XPCalc --> LevelCalc[Calculate newLevel with calculateLevelFromXP];
    LevelCalc --> ProgressCalc[Calculate currentXP/nextLevelXP with calculateXPProgress];
    ProgressCalc --> Update[Update profile with new totals];
    Update --> LockCreate[Create idempotency lock];
    LockCreate --> Audit[(Firestore: xpTransactions)];
    Audit --> LevelCheck{Leveled up?};
    LevelCheck -- Yes --> LevelRecord[(Firestore: levelUps)];
    LevelCheck -- No --> Result;
    LevelRecord --> UnlockCalc[Collect unlocked content/permissions];
    LevelsConfig(LEVELS_CONFIG from levels-config) --> UnlockCalc;
    UnlockCalc --> ContentUpdate[Update profile.unlockedContent];
    ContentUpdate --> Result(Return with success, newTotalXP, newLevel, leveledUp, unlocks);
```

## 6. Usage Example & Testing

* **Usage:**
```typescript
import { userLevelService, XP_REWARDS } from '@/lib/user-level-service';
import { DailyTaskType } from './types/daily-task';

// Initialize new user profile
const newProfile = await userLevelService.initializeUserProfile(
  userId,
  'Zhang Wei',
  'zhang.wei@example.com'
);
console.log('New user initialized:', newProfile.uid);
console.log('Starting level:', newProfile.currentLevel); // 0
console.log('Starting XP:', newProfile.totalXP); // 0
console.log('Attributes:', newProfile.attributes); // All 0
console.log('Initial unlocked content:', newProfile.unlockedContent); // Level 0 content

// Get user profile (with auto-repair if corrupted)
const profile = await userLevelService.getUserProfile(userId);
if (profile) {
  console.log('Current level:', profile.currentLevel);
  console.log('Total XP:', profile.totalXP);
  console.log('Progress:', profile.currentXP, '/', profile.nextLevelXP);
  console.log('Completed chapters:', profile.completedChapters); // e.g., [1, 2, 3]
}

// Award XP for chapter completion (with idempotency)
const chapterResult = await userLevelService.awardXP(
  userId,
  XP_REWARDS.CHAPTER_COMPLETED, // 10 XP
  'Completed Chapter 5',
  'reading',
  'chapter-5' // sourceId prevents duplicate rewards
);

if (chapterResult.isDuplicate) {
  console.log('⚠️ User already completed this chapter, no XP awarded');
} else {
  console.log('✅ Awarded', XP_REWARDS.CHAPTER_COMPLETED, 'XP');
  console.log('New total XP:', chapterResult.newTotalXP);
  console.log('New level:', chapterResult.newLevel);

  if (chapterResult.leveledUp) {
    console.log('🎉 LEVEL UP!');
    console.log('From level:', chapterResult.fromLevel);
    console.log('To level:', chapterResult.newLevel);
    console.log('Unlocked content:', chapterResult.unlockedContent); // e.g., ['chapter-6', 'chapter-7']
    console.log('Unlocked permissions:', chapterResult.unlockedPermissions); // e.g., ['CREATE_POST', 'USE_AI']
  }
}

// Try awarding again (idempotent - no duplicate XP)
const duplicateResult = await userLevelService.awardXP(
  userId,
  XP_REWARDS.CHAPTER_COMPLETED,
  'Completed Chapter 5 again',
  'reading',
  'chapter-5' // Same sourceId
);
console.log('Duplicate detected:', duplicateResult.isDuplicate); // true

// Cross-system duplicate check (before awarding)
const isDuplicate = await userLevelService.checkDuplicateReward(userId, 'chapter-3');
if (isDuplicate) {
  console.log('⚠️ User already received XP for chapter-3, skipping');
  // Don't award XP
}

// Award XP for daily task completion
const taskResult = await userLevelService.awardXP(
  userId,
  XP_REWARDS.DAILY_TASK_MEDIUM, // 10 XP
  'Completed daily task: Poetry analysis',
  'task',
  `task-${taskId}-${date}` // Unique sourceId per task per day
);

// Award XP for community post
await userLevelService.awardXP(
  userId,
  XP_REWARDS.POST_CREATED, // 5 XP
  'Created discussion post',
  'community',
  `post-${postId}` // Prevents multiple XP for same post
);

// Award XP for AI interaction (one-time achievement)
await userLevelService.awardXP(
  userId,
  XP_REWARDS.AI_FIRST_QUESTION_ACHIEVEMENT, // 20 XP
  'First AI question asked',
  'achievement',
  'ai-first-question' // One-time sourceId
);

// Check permission (async)
const canUseAI = await userLevelService.checkPermission(userId, 'USE_AI');
if (canUseAI) {
  // Show AI features
} else {
  // Hide AI features, show level requirement
}

// Check permission synchronously (when level known)
const userProfile = await userLevelService.getUserProfile(userId);
const canCreatePost = userLevelService.checkPermissionSync(userProfile!.currentLevel, 'CREATE_POST');

// Batch permission check
const permissions = await userLevelService.checkPermissions(userId, [
  'USE_AI',
  'CREATE_POST',
  'USE_COMMUNITY',
  'UNLOCK_ADVANCED_CHAPTERS',
]);
console.log('Permissions:', permissions);
// { USE_AI: true, CREATE_POST: true, USE_COMMUNITY: true, UNLOCK_ADVANCED_CHAPTERS: false }

// Update user attributes
await userLevelService.updateAttributes(userId, {
  poetrySkill: 5,
  culturalKnowledge: 3,
  analyticalThinking: 2,
});
console.log('✅ Attributes updated');

// Update user statistics
await userLevelService.updateStats(userId, {
  chaptersCompleted: profile!.stats.chaptersCompleted + 1,
  totalReadingTimeMinutes: profile!.stats.totalReadingTimeMinutes + 15,
  currentStreak: profile!.stats.currentStreak + 1,
});

// Get level configuration
const currentLevel = await userLevelService.getUserLevel(userId);
console.log('Current level title:', currentLevel?.title); // e.g., "初學士子 (Novice Scholar)"
console.log('Required XP:', currentLevel?.requiredXP);
console.log('Permissions:', currentLevel?.permissions);
console.log('Exclusive content:', currentLevel?.exclusiveContent);

// Get next level requirements
const nextLevel = userLevelService.getNextLevelRequirements(profile!.currentLevel);
if (nextLevel) {
  console.log('Next level:', nextLevel.title);
  console.log('Required XP:', nextLevel.requiredXP);
  console.log('XP needed:', nextLevel.requiredXP - profile!.totalXP);
}

// Check level-up requirements
const requirements = await userLevelService.checkLevelRequirements(userId);
console.log('Can level up:', requirements.canLevelUp);
console.log('XP requirement met:', requirements.xpRequirementMet);
console.log('XP needed:', requirements.xpNeeded);
if (requirements.specialRequirements) {
  console.log('Special requirements:', requirements.specialRequirements);
}

// Get level-up history
const levelUps = await userLevelService.getLevelUpHistory(userId, 5);
levelUps.forEach(record => {
  console.log(`${record.fromLevel} → ${record.toLevel} (${record.totalXPAtLevelUp} XP)`);
  console.log('Reason:', record.triggerReason);
  console.log('Timestamp:', record.timestamp.toDate());
});

// Get XP transaction history
const xpHistory = await userLevelService.getXPHistory(userId, 10);
xpHistory.forEach(tx => {
  console.log(`+${tx.amount} XP: ${tx.reason}`);
  console.log('Source:', tx.source, 'SourceId:', tx.sourceId);
  console.log('New total:', tx.newTotalXP, 'Level:', tx.newLevel);
  if (tx.causedLevelUp) console.log('🎉 Caused level up!');
});

// Reset guest user data (testing only)
const resetResult = await userLevelService.resetGuestUserData(
  guestUserId,
  'Guest User',
  'guest@example.com'
);
if (resetResult.success) {
  console.log('✅', resetResult.message);
  console.log('Fresh profile:', resetResult.profile);
} else {
  console.error('❌ Reset failed:', resetResult.message);
}

// XP economy reference
console.log('XP Rewards:');
console.log('Chapter completed:', XP_REWARDS.CHAPTER_COMPLETED); // 10
console.log('First chapter:', XP_REWARDS.FIRST_CHAPTER_COMPLETED); // 20
console.log('Welcome bonus:', XP_REWARDS.NEW_USER_WELCOME_BONUS); // 15
console.log('15 min reading:', XP_REWARDS.READING_TIME_15MIN); // 3
console.log('Daily task complex:', XP_REWARDS.DAILY_TASK_COMPLEX); // 15
console.log('Post created:', XP_REWARDS.POST_CREATED); // 5
console.log('AI first question:', XP_REWARDS.AI_FIRST_QUESTION_ACHIEVEMENT); // 20
console.log('Poetry competition win:', XP_REWARDS.POETRY_COMPETITION_WIN); // 30
console.log('Special event completion:', XP_REWARDS.SPECIAL_EVENT_COMPLETION); // 50
```
* **Testing:** Testing strategy focuses on idempotency, corruption repair, and transactional correctness:
  - Test `initializeUserProfile` creates new profile with initial values
  - Test `initializeUserProfile` returns existing profile (idempotent)
  - Test `getUserProfile` returns profile for existing user
  - Test `getUserProfile` returns null for non-existent user
  - Test `getUserProfile` detects and repairs NaN in totalXP
  - Test `getUserProfile` detects and repairs NaN in currentLevel
  - Test `getUserProfile` recalculates currentXP/nextLevelXP on corruption
  - Test `getUserProfile` persists repair to Firestore
  - Test `checkDuplicateReward` returns true for existing sourceId
  - Test `checkDuplicateReward` returns false for new sourceId
  - Test `checkDuplicateReward` returns false on error (fail-open)
  - Test `awardXP` throws error for undefined/null amount
  - Test `awardXP` throws error for NaN amount
  - Test `awardXP` throws error for negative amount
  - Test `awardXP` with sourceId creates idempotency lock
  - Test `awardXP` with same sourceId twice returns isDuplicate on second call
  - Test `awardXP` detects chapter completion from sourceId pattern
  - Test `awardXP` prevents duplicate chapter rewards
  - Test `awardXP` handles 0 XP award gracefully
  - Test `awardXP` calculates correct newTotalXP
  - Test `awardXP` detects level-up correctly
  - Test `awardXP` awards intermediate level content when skipping levels
  - Test `awardXP` records level-up to levelUpsCollection
  - Test `awardXP` logs transaction to xpTransactionsCollection
  - Test `awardXP` unlocks content for new level
  - Test `awardXP` grants permissions for new level
  - Test `awardXP` updates completedChapters array
  - Test `awardXP` transactional atomicity (concurrent requests don't duplicate)
  - Test `checkPermission` returns true for granted permission
  - Test `checkPermission` returns false for not-granted permission
  - Test `checkPermission` returns false on error (fail-closed)
  - Test `checkPermissionSync` returns correct boolean
  - Test `checkPermissions` returns correct Record mapping
  - Test `updateAttributes` clamps values to 0-100
  - Test `updateAttributes` merges with existing attributes
  - Test `updateStats` merges with existing stats
  - Test `completeTask` adds task to completedTasks
  - Test `completeTask` is idempotent (doesn't duplicate)
  - Test `getLevelUpHistory` returns sorted records (newest first)
  - Test `getLevelUpHistory` respects limit parameter
  - Test `getXPHistory` returns sorted transactions
  - Test `getXPHistory` respects limit parameter
  - Test `resetGuestUserData` deletes all user data
  - Test `resetGuestUserData` deletes xpTransactionLocks
  - Test `resetGuestUserData` deletes notes
  - Test `resetGuestUserData` deletes daily tasks
  - Test `resetGuestUserData` reinitializes fresh profile
  - Test XP_REWARDS constants are all positive integers
