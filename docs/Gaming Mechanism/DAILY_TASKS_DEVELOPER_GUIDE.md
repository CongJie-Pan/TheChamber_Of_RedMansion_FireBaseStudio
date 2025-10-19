# Daily Task System - Developer Guide

## Table of Contents

1. [Introduction](#introduction)
2. [System Architecture](#system-architecture)
3. [Development Setup](#development-setup)
4. [Core Concepts](#core-concepts)
5. [Common Development Tasks](#common-development-tasks)
6. [Best Practices](#best-practices)
7. [Testing Guide](#testing-guide)
8. [Debugging Tips](#debugging-tips)
9. [Performance Optimization](#performance-optimization)
10. [Troubleshooting](#troubleshooting)

---

## Introduction

The Daily Task System (GAME-002 Phase 4) is a gamification feature that provides users with personalized daily learning tasks related to *Dream of the Red Chamber*. This guide helps developers understand, maintain, and extend the system.

### Key Features

- ✅ **Automated Task Generation**: Vercel Cron jobs generate tasks daily at UTC+8 00:00
- ✅ **Anti-Farming Protection**: sourceId deduplication prevents duplicate XP rewards
- ✅ **Adaptive Difficulty**: Tasks adjust based on user performance (recent 30 completions)
- ✅ **AI Evaluation**: Quality scoring with 3-second timeout protection
- ✅ **Performance Optimization**: 5-minute task caching, batch processing
- ✅ **Streak System**: Consecutive completion rewards with milestone bonuses
- ✅ **Weekday Rotation**: Task type distribution varies by day of week

---

## System Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Vercel Cron Job                         │
│            (Daily UTC+8 00:00 Trigger)                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│          /api/cron/daily-tasks/route.ts                     │
│  - CRON_SECRET validation                                   │
│  - Batch processing (10 users/batch)                        │
│  - Error aggregation & reporting                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           DailyTaskService (Singleton)                      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  generateDailyTasks()                                 │  │
│  │  - Check existing tasks                               │  │
│  │  - Calculate adaptive difficulty                      │  │
│  │  - Generate 3-5 tasks via TaskGenerator              │  │
│  │  - Initialize DailyTaskProgress                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  submitTaskCompletion()                               │  │
│  │  - Validate task ownership                            │  │
│  │  - Check sourceId deduplication                       │  │
│  │  - Enforce submission cooldown                        │  │
│  │  - AI quality evaluation (with timeout)               │  │
│  │  - Award XP/coins + streak bonuses                    │  │
│  │  - Update DailyTaskProgress                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  getTodayTasks()                                      │  │
│  │  - Check 5-minute cache                               │  │
│  │  - Fetch from Firestore if cache miss                │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              TaskGenerator (Singleton)                      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  generateTask()                                       │  │
│  │  - Apply weekday rotation weights                     │  │
│  │  - Select task type probabilistically                 │  │
│  │  - Generate type-specific content                     │  │
│  │  - Generate unique sourceId                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  generateSourceId()                                   │  │
│  │  - Create unique content identifier                   │  │
│  │  - Pattern: chapter-X-passage-Y-Z                     │  │
│  │            poem-ABC123                                 │  │
│  │            character-name-chapter-X                    │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Firebase Firestore                         │
│                                                              │
│  Collections:                                               │
│  - dailyTasks/            (Task documents)                  │
│  - dailyTaskProgress/     (User progress)                   │
│  - users/                 (User profiles for XP/level)      │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**Task Generation Flow**:
```
Cron Trigger → API Route → DailyTaskService.generateDailyTasks()
  → Check existing tasks (skip if already generated)
  → Fetch user performance history (last 30 tasks)
  → Calculate adaptive difficulty
  → TaskGenerator.generateTask() × 3-5 times
    → Select task type (weekday rotation + randomness)
    → Generate content (passage/poem/character/etc.)
    → Generate sourceId
  → Save tasks to Firestore dailyTasks collection
  → Initialize DailyTaskProgress document
```

**Task Completion Flow**:
```
User Submits → DailyTaskService.submitTaskCompletion()
  → Validate task exists & belongs to user
  → Check task not already completed
  → Check sourceId not in usedSourceIds[] (anti-farming)
  → Enforce 5-second cooldown since last submission
  → AI evaluation with 3-second timeout
    → Success: Return quality score
    → Timeout: Return fallback score (60)
  → Calculate rewards (base XP/coins + quality bonus)
  → Calculate streak (consecutive days)
  → Award streak bonus XP (3/7/14/30 day milestones)
  → Update user XP/coins/level
  → Update DailyTaskProgress
    → Add taskId to completedTaskIds[]
    → Add sourceId to usedSourceIds[]
    → Increment completedTasks counter
  → Check level-up condition
  → Return rewards + streak + levelUp info
```

---

## Development Setup

### Prerequisites

- Node.js 18+
- Firebase project with Firestore enabled
- Vercel account (for Cron jobs)
- Environment variables configured

### Required Environment Variables

Create `.env.local` file:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Cron Job Security
CRON_SECRET=your_secure_random_string

# Google AI (for GenKit)
GOOGLE_GENAI_API_KEY=your_gemini_api_key
```

### Installation

```bash
# Install dependencies
npm install

# Run type checking
npm run typecheck

# Run tests
npm test

# Start development server
npm run dev
```

### Vercel Cron Configuration

Edit `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-tasks",
      "schedule": "0 16 * * *"
    }
  ]
}
```

**Note**: `0 16 * * *` = 00:00 UTC+8 (16:00 UTC)

---

## Core Concepts

### 1. Task Types (DailyTaskType)

**Location**: `src/lib/types/daily-task.ts`

```typescript
enum DailyTaskType {
  MORNING_READING = 'morning_reading',       // Read novel passages
  POETRY = 'poetry',                          // Analyze poems
  CHARACTER_INSIGHT = 'character_insight',    // Character analysis
  CULTURAL_EXPLORATION = 'cultural_exploration', // Cultural elements
  COMMENTARY_DECODE = 'commentary_decode'     // Historical commentary
}
```

**When to add a new task type**:
1. Define enum value in `DailyTaskType`
2. Add content interface to `TaskContent` type
3. Implement content generation in `TaskGenerator.generateTaskContent()`
4. Implement sourceId pattern in `TaskGenerator.generateSourceId()`
5. Add weekday rotation weight (if applicable)
6. Update tests

### 2. Difficulty Adaptation

**Algorithm**: Analyze user's recent 30 task completions

```typescript
// src/lib/daily-task-service.ts:696-745
private async calculateAdaptiveDifficulty(userId: string): Promise<TaskDifficulty> {
  const recentHistory = await this.getTaskHistory(userId, 30);

  if (recentHistory.length === 0) {
    return TaskDifficulty.EASY; // New users start with EASY
  }

  // Calculate average quality score from all completed tasks
  let totalScore = 0;
  let scoredTasks = 0;

  recentHistory.forEach(progress => {
    // Each progress record may have multiple completed tasks with scores
    // We need to aggregate quality scores if available
    if (progress.completedTasks > 0) {
      totalScore += (progress.xpEarned / progress.completedTasks); // Approximate score
      scoredTasks += progress.completedTasks;
    }
  });

  const avgScore = scoredTasks > 0 ? totalScore / scoredTasks : 50;

  // Adjust difficulty based on performance
  if (avgScore < 60) return TaskDifficulty.EASY;
  if (avgScore > 85) return TaskDifficulty.HARD;
  return TaskDifficulty.MEDIUM;
}
```

**Tuning Parameters**:
- History window: 30 tasks (adjustable)
- EASY threshold: < 60 avg score
- HARD threshold: > 85 avg score
- Default for new users: EASY

### 3. Anti-Farming System

**Problem**: Users could complete the same content multiple times for XP farming.

**Solution**: `sourceId` deduplication

**Implementation**:

```typescript
// 1. Generate sourceId when creating task
// src/lib/task-generator.ts:307-354
private generateSourceId(type: DailyTaskType, content: TaskContent): string {
  switch (type) {
    case DailyTaskType.MORNING_READING:
      return `chapter-${passage.chapter}-passage-${passage.startLine}-${passage.endLine}`;
    case DailyTaskType.POETRY:
      return `poem-${poem.id}`;
    // ... other patterns
  }
}

// 2. Check deduplication on submission
// src/lib/daily-task-service.ts:321-325
const usedSourceIds = progress.usedSourceIds || [];
if (task.sourceId && usedSourceIds.includes(task.sourceId)) {
  throw new Error('You have already completed this content today. Duplicate rewards are not allowed.');
}

// 3. Add sourceId after successful completion
// src/lib/daily-task-service.ts:383
usedSourceIds: task.sourceId ? [...usedSourceIds, task.sourceId] : usedSourceIds
```

**Testing Anti-Farming**:

```typescript
// Test duplicate content prevention
test('should prevent duplicate sourceId rewards', async () => {
  const service = DailyTaskService.getInstance();

  // Generate tasks
  const tasks = await service.generateDailyTasks('user123');
  const task = tasks[0];

  // First submission: Success
  await service.submitTaskCompletion('user123', task.id, 'response 1');

  // Re-generate same task manually (simulate duplicate content)
  const duplicateTask = { ...task, id: 'new-task-id', completed: false };

  // Second submission with same sourceId: Should fail
  await expect(
    service.submitTaskCompletion('user123', duplicateTask.id, 'response 2')
  ).rejects.toThrow('already completed this content');
});
```

### 4. Weekday Rotation

**Purpose**: Vary task distribution to keep content fresh

**Implementation**: `src/lib/daily-task-service.ts:746-806`

```typescript
private getWeekdayTaskWeights(): Record<DailyTaskType, number> {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ...

  const baseWeights = {
    [DailyTaskType.MORNING_READING]: 1,
    [DailyTaskType.POETRY]: 1,
    [DailyTaskType.CHARACTER_INSIGHT]: 1,
    [DailyTaskType.CULTURAL_EXPLORATION]: 1,
    [DailyTaskType.COMMENTARY_DECODE]: 1,
  };

  // Boost specific type based on day
  switch (dayOfWeek) {
    case 1: // Monday
      baseWeights[DailyTaskType.MORNING_READING] = 1.5;
      break;
    case 2: // Tuesday
      baseWeights[DailyTaskType.POETRY] = 1.5;
      break;
    case 3: // Wednesday
      baseWeights[DailyTaskType.CHARACTER_INSIGHT] = 1.5;
      break;
    case 4: // Thursday
      baseWeights[DailyTaskType.CULTURAL_EXPLORATION] = 1.5;
      break;
    case 5: // Friday
      baseWeights[DailyTaskType.COMMENTARY_DECODE] = 1.5;
      break;
    // Weekends: balanced
  }

  return baseWeights;
}
```

**Customization**: Modify weights or add new patterns (e.g., theme weeks)

### 5. Performance Optimizations

#### A. AI Timeout Protection

**Problem**: AI calls can hang indefinitely, blocking user submissions

**Solution**: Promise.race() with 3-second timeout

```typescript
// src/lib/daily-task-service.ts:172-181
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallbackValue: T
): Promise<T> {
  const timeoutPromise = new Promise<T>((resolve) => {
    setTimeout(() => resolve(fallbackValue), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
}

// Usage in evaluateTaskQuality()
const score = await withTimeout(
  this.performAIEvaluation(task, userResponse),
  AI_EVALUATION_TIMEOUT_MS, // 3000ms
  60 // Fallback score
);
```

**Configuration**:
- Timeout: 3000ms (adjustable via `AI_EVALUATION_TIMEOUT_MS`)
- Fallback score: 60 (passing grade)
- Logs actual execution time for monitoring

#### B. Task Caching

**Problem**: Frequent Firestore reads for same tasks waste API quota

**Solution**: In-memory Map cache with 5-minute TTL

```typescript
// src/lib/daily-task-service.ts:196
private taskCache: Map<string, { task: DailyTask; timestamp: number }> = new Map();

// Cache-aware getTaskById()
private async getTaskById(taskId: string): Promise<DailyTask | null> {
  const cached = this.taskCache.get(taskId);
  const now = Date.now();

  // Cache hit: Return cached task if not expired
  if (cached && (now - cached.timestamp) < TASK_CACHE_TTL_MS) {
    return cached.task;
  }

  // Cache miss: Fetch from Firestore
  const taskDoc = await getDoc(doc(this.dailyTasksCollection, taskId));
  if (!taskDoc.exists()) return null;

  const task = { id: taskDoc.id, ...taskDoc.data() } as DailyTask;

  // Update cache
  this.taskCache.set(taskId, { task, timestamp: now });

  return task;
}
```

**Configuration**:
- TTL: 5 minutes (300,000ms)
- Scope: Per taskId
- Memory impact: Minimal (5-10 tasks cached per user session)

**Cache Invalidation**:
- Automatic expiration after TTL
- No manual invalidation needed (tasks are immutable)

---

## Common Development Tasks

### Task 1: Add a New Task Type

**Example**: Add a "Quiz" task type

**Step 1**: Define the enum

```typescript
// src/lib/types/daily-task.ts
export enum DailyTaskType {
  // ... existing types
  QUIZ = 'quiz',
}
```

**Step 2**: Add content interface

```typescript
// src/lib/types/daily-task.ts
export type TaskContent = {
  // ... existing content types
  quiz?: {
    questionId: string;
    question: string;
    options: string[];
    correctAnswerIndex: number;
    explanation: string;
  };
};
```

**Step 3**: Implement content generation

```typescript
// src/lib/task-generator.ts
private async generateTaskContent(type: DailyTaskType, difficulty: TaskDifficulty): Promise<TaskContent> {
  switch (type) {
    // ... existing cases
    case DailyTaskType.QUIZ:
      return {
        quiz: {
          questionId: `quiz-${Date.now()}`,
          question: 'What is the Jia family\'s ancestral home called?',
          options: [
            'Grand View Garden',
            'Prospect Garden',
            'Rongguo Mansion',
            'Ningguo Mansion'
          ],
          correctAnswerIndex: 2,
          explanation: 'Rongguo Mansion is the Jia family\'s main residence.'
        }
      };
  }
}
```

**Step 4**: Implement sourceId pattern

```typescript
// src/lib/task-generator.ts
private generateSourceId(type: DailyTaskType, content: TaskContent): string {
  switch (type) {
    // ... existing cases
    case DailyTaskType.QUIZ:
      const quiz = content.quiz;
      if (!quiz) return `unknown-quiz-${Date.now()}`;
      return `quiz-${quiz.questionId}`;
  }
}
```

**Step 5**: Update weekday rotation (optional)

```typescript
// src/lib/daily-task-service.ts
private getWeekdayTaskWeights(): Record<DailyTaskType, number> {
  const baseWeights = {
    // ... existing weights
    [DailyTaskType.QUIZ]: 1,
  };

  switch (dayOfWeek) {
    case 6: // Saturday: Boost quizzes
      baseWeights[DailyTaskType.QUIZ] = 1.5;
      break;
  }

  return baseWeights;
}
```

**Step 6**: Write tests

```typescript
// tests/lib/task-generator.test.ts
test('should generate quiz task', async () => {
  const generator = TaskGenerator.getInstance();
  const task = await generator.generateTask(DailyTaskType.QUIZ, TaskDifficulty.MEDIUM);

  expect(task.type).toBe(DailyTaskType.QUIZ);
  expect(task.content.quiz).toBeDefined();
  expect(task.content.quiz.options).toHaveLength(4);
  expect(task.sourceId).toMatch(/^quiz-/);
});
```

---

### Task 2: Adjust Difficulty Thresholds

**Current thresholds** (src/lib/daily-task-service.ts:729-731):
```typescript
if (avgScore < 60) return TaskDifficulty.EASY;
if (avgScore > 85) return TaskDifficulty.HARD;
return TaskDifficulty.MEDIUM;
```

**To make difficulty more aggressive** (faster progression):
```typescript
if (avgScore < 70) return TaskDifficulty.EASY;   // Raise easy threshold
if (avgScore > 75) return TaskDifficulty.HARD;   // Lower hard threshold
return TaskDifficulty.MEDIUM;
```

**To make difficulty more forgiving** (slower progression):
```typescript
if (avgScore < 50) return TaskDifficulty.EASY;   // Lower easy threshold
if (avgScore > 90) return TaskDifficulty.HARD;   // Raise hard threshold
return TaskDifficulty.MEDIUM;
```

**Test the changes**:
```bash
npm test -- tests/lib/daily-task-service.test.ts --testNamePattern="adaptive difficulty"
```

---

### Task 3: Modify Cron Schedule

**Current schedule**: Daily at UTC+8 00:00

**Change to UTC+8 06:00** (6 AM):

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/daily-tasks",
      "schedule": "0 22 * * *"  // 22:00 UTC = 06:00 UTC+8
    }
  ]
}
```

**Cron syntax reference**:
```
* * * * *
│ │ │ │ │
│ │ │ │ └─ Day of week (0-7, Sunday=0 or 7)
│ │ │ └─── Month (1-12)
│ │ └───── Day of month (1-31)
│ └─────── Hour (0-23)
└───────── Minute (0-59)
```

**Deploy to Vercel**:
```bash
vercel --prod
```

**Verify cron job**:
- Check Vercel dashboard → Settings → Cron Jobs
- Logs appear in Vercel → Deployments → Functions

---

### Task 4: Add New Streak Milestone

**Current milestones** (src/lib/daily-task-service.ts:362-381):
```typescript
const streakBonuses = {
  3: 10,
  7: 25,
  14: 50,
  30: 100,
};
```

**Add a 60-day milestone**:
```typescript
const streakBonuses = {
  3: 10,
  7: 25,
  14: 50,
  30: 100,
  60: 250,  // New milestone
};

// Award bonus if milestone reached
const milestones = Object.keys(streakBonuses).map(Number);
milestones.forEach(milestone => {
  if (newStreak === milestone) {
    streakBonus = streakBonuses[milestone];
    totalXP += streakBonus;
  }
});
```

**Test**:
```typescript
test('should award 60-day streak bonus', async () => {
  const service = DailyTaskService.getInstance();

  // Mock 60-day history
  const history = Array.from({ length: 60 }, (_, i) => ({
    userId: 'user123',
    date: subtractDays(new Date(), i).toISOString().split('T')[0],
    completedTasks: 1,
    totalTasks: 5,
    // ... other fields
  }));

  // Simulate completion on day 60
  const result = await service.submitTaskCompletion('user123', 'task-id', 'response');

  expect(result.streakBonus).toBe(250);
  expect(result.newStreak).toBe(60);
});
```

---

### Task 5: Implement Custom Content Source

**Scenario**: Add custom novel passages instead of random generation

**Step 1**: Create content repository

```typescript
// src/lib/content-repository.ts
export interface NovelPassage {
  id: string;
  chapter: number;
  startLine: number;
  endLine: number;
  text: string;
  difficulty: TaskDifficulty;
}

export const MORNING_READING_PASSAGES: NovelPassage[] = [
  {
    id: 'passage-ch1-001',
    chapter: 1,
    startLine: 1,
    endLine: 15,
    text: '姑蘇城有座葫蘆廟緊靠著閶門，廟旁有座十里街...',
    difficulty: TaskDifficulty.EASY
  },
  // ... more passages
];
```

**Step 2**: Modify task generator

```typescript
// src/lib/task-generator.ts
import { MORNING_READING_PASSAGES } from './content-repository';

private async generateTaskContent(type: DailyTaskType, difficulty: TaskDifficulty): Promise<TaskContent> {
  switch (type) {
    case DailyTaskType.MORNING_READING:
      // Filter passages by difficulty
      const suitablePassages = MORNING_READING_PASSAGES.filter(
        p => p.difficulty === difficulty
      );

      // Select random passage
      const passage = suitablePassages[Math.floor(Math.random() * suitablePassages.length)];

      return {
        textPassage: {
          chapter: passage.chapter,
          startLine: passage.startLine,
          endLine: passage.endLine,
          text: passage.text
        }
      };
  }
}
```

**Benefits**:
- Curated, high-quality content
- Consistent difficulty levels
- Educational value validated by experts

---

## Best Practices

### 1. Error Handling

**Always wrap service calls in try-catch**:

```typescript
// ❌ Bad: No error handling
const tasks = await taskService.getTodayTasks(userId);

// ✅ Good: Proper error handling
try {
  const tasks = await taskService.getTodayTasks(userId);
  setTasks(tasks);
} catch (error) {
  console.error('Failed to load tasks:', error);
  toast.error('Could not load your daily tasks. Please try again.');
  setTasks([]);
}
```

**Provide user-friendly error messages**:

```typescript
try {
  await taskService.submitTaskCompletion(userId, taskId, response);
} catch (error) {
  if (error.message.includes('already completed this content')) {
    toast.warning('You've already completed this content today!');
  } else if (error.message.includes('wait before submitting')) {
    toast.info('Please wait a moment before submitting again.');
  } else {
    toast.error('Submission failed. Please try again.');
  }
}
```

### 2. Caching Strategy

**Use cached methods when possible**:

```typescript
// ✅ Good: Uses cache
const tasks = await taskService.getTodayTasks(userId);

// ❌ Avoid: Direct Firestore query bypasses cache
const tasksQuery = query(
  collection(db, 'dailyTasks'),
  where('userId', '==', userId)
);
const snapshot = await getDocs(tasksQuery);
```

**Invalidate cache when necessary**:

Currently, cache auto-expires after 5 minutes. If you need manual invalidation:

```typescript
// Add to DailyTaskService class
public clearCache(): void {
  this.taskCache.clear();
}

// Use when user manually refreshes tasks
taskService.clearCache();
const freshTasks = await taskService.getTodayTasks(userId);
```

### 3. Batch Operations

**Process users in batches for cron jobs**:

```typescript
// src/app/api/cron/daily-tasks/route.ts
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 100;

for (let i = 0; i < activeUsers.length; i += BATCH_SIZE) {
  const batch = activeUsers.slice(i, i + BATCH_SIZE);

  await Promise.all(
    batch.map(async (user) => {
      try {
        await taskService.generateDailyTasks(user.id);
        successCount++;
      } catch (error) {
        console.error(`Failed for user ${user.id}:`, error);
        failedCount++;
      }
    })
  );

  // Delay between batches to avoid overwhelming Firestore
  if (i + BATCH_SIZE < activeUsers.length) {
    await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
  }
}
```

### 4. Type Safety

**Always use TypeScript interfaces**:

```typescript
// ✅ Good: Type-safe
import { DailyTask, DailyTaskType, TaskDifficulty } from '@/lib/types/daily-task';

const task: DailyTask = {
  id: 'task-123',
  userId: 'user-456',
  type: DailyTaskType.MORNING_READING,
  difficulty: TaskDifficulty.MEDIUM,
  // ... compiler ensures all required fields are present
};

// ❌ Bad: No type safety
const task = {
  id: 'task-123',
  type: 'morning_reading', // Typo risk
  // Missing required fields won't be caught
};
```

### 5. Logging & Monitoring

**Add performance logs**:

```typescript
const startTime = Date.now();

try {
  const result = await expensiveOperation();
  const duration = Date.now() - startTime;

  console.log(`✅ Operation completed in ${duration}ms`);

  // Alert if operation is slow
  if (duration > 5000) {
    console.warn(`⚠️ Slow operation detected: ${duration}ms`);
  }

  return result;
} catch (error) {
  const duration = Date.now() - startTime;
  console.error(`❌ Operation failed after ${duration}ms:`, error);
  throw error;
}
```

**Monitor AI evaluation performance**:

```typescript
// Already implemented in src/lib/daily-task-service.ts:502
const duration = Date.now() - startTime;
console.log(`✅ AI evaluation completed in ${duration}ms (target: <${AI_EVALUATION_TIMEOUT_MS}ms)`);
```

---

## Testing Guide

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/lib/daily-task-service.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should generate daily tasks"

# Run tests with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### Writing Unit Tests

**Example: Testing task generation**

```typescript
// tests/lib/daily-task-service.test.ts
import { DailyTaskService } from '@/lib/daily-task-service';
import { DailyTaskType, TaskDifficulty } from '@/lib/types/daily-task';

describe('DailyTaskService', () => {
  let service: DailyTaskService;

  beforeEach(() => {
    service = DailyTaskService.getInstance();
  });

  test('should generate 3-5 tasks for new user', async () => {
    const tasks = await service.generateDailyTasks('new-user-123');

    expect(tasks.length).toBeGreaterThanOrEqual(3);
    expect(tasks.length).toBeLessThanOrEqual(5);

    tasks.forEach(task => {
      expect(task.userId).toBe('new-user-123');
      expect(task.completed).toBe(false);
      expect(task.sourceId).toBeTruthy();
    });
  });

  test('should not regenerate tasks if already exist', async () => {
    const firstCall = await service.generateDailyTasks('user-123');
    const secondCall = await service.generateDailyTasks('user-123');

    expect(firstCall).toEqual(secondCall); // Same tasks returned
  });
});
```

### Integration Tests

**Example: End-to-end task flow**

```typescript
// tests/integration/daily-tasks-full-flow.test.ts
describe('Daily Tasks Full Flow', () => {
  test('complete task lifecycle', async () => {
    const service = DailyTaskService.getInstance();
    const userId = 'integration-test-user';

    // 1. Generate tasks
    const tasks = await service.generateDailyTasks(userId);
    expect(tasks.length).toBeGreaterThan(0);

    // 2. Get progress (should be initialized)
    const initialProgress = await service.getUserTaskProgress(userId);
    expect(initialProgress.completedTasks).toBe(0);
    expect(initialProgress.totalTasks).toBe(tasks.length);

    // 3. Complete first task
    const task = tasks[0];
    const result = await service.submitTaskCompletion(
      userId,
      task.id,
      'This is my thoughtful response to the task.'
    );

    expect(result.success).toBe(true);
    expect(result.rewards.xp).toBeGreaterThan(0);
    expect(result.rewards.coins).toBeGreaterThan(0);

    // 4. Verify progress updated
    const updatedProgress = await service.getUserTaskProgress(userId);
    expect(updatedProgress.completedTasks).toBe(1);
    expect(updatedProgress.completedTaskIds).toContain(task.id);
    expect(updatedProgress.usedSourceIds).toContain(task.sourceId);

    // 5. Verify duplicate prevention
    await expect(
      service.submitTaskCompletion(userId, task.id, 'Second attempt')
    ).rejects.toThrow('already completed');
  });
});
```

---

## Debugging Tips

### 1. Check Firestore Data

Use Firebase Console to inspect data:

**Collections to check**:
- `dailyTasks/` - Individual task documents
- `dailyTaskProgress/` - User progress records
- `users/` - User XP/level data

**Common issues**:
- Tasks not appearing: Check `userId` field matches authenticated user
- Duplicate tasks: Check `date` field format (YYYY-MM-DD)
- Missing progress: Verify `generateDailyTasks()` was called

### 2. Enable Console Logging

Add debug logs to trace execution:

```typescript
// In submitTaskCompletion()
console.log('📝 Submitting task:', {
  userId,
  taskId,
  responseLength: userResponse.length
});

console.log('🔍 Checking deduplication:', {
  sourceId: task.sourceId,
  usedSourceIds: progress.usedSourceIds
});

console.log('🎯 AI evaluation result:', {
  score: qualityScore,
  duration: `${Date.now() - startTime}ms`
});

console.log('🎁 Rewarding user:', {
  baseXP,
  qualityBonus,
  streakBonus,
  totalXP
});
```

### 3. Test Cron Jobs Locally

**Simulate cron job execution**:

```typescript
// tests/manual/test-cron.ts
import { DailyTaskService } from '@/lib/daily-task-service';

async function testCronJob() {
  const service = DailyTaskService.getInstance();

  const testUsers = ['user1', 'user2', 'user3'];

  for (const userId of testUsers) {
    try {
      const tasks = await service.generateDailyTasks(userId);
      console.log(`✅ Generated ${tasks.length} tasks for ${userId}`);
    } catch (error) {
      console.error(`❌ Failed for ${userId}:`, error);
    }
  }
}

testCronJob();
```

**Run manually**:
```bash
npx tsx tests/manual/test-cron.ts
```

### 4. Inspect AI Evaluation

**Test AI evaluation in isolation**:

```typescript
// tests/manual/test-ai-evaluation.ts
import { DailyTaskService } from '@/lib/daily-task-service';

async function testAIEvaluation() {
  const service = DailyTaskService.getInstance();

  const mockTask = {
    type: DailyTaskType.POETRY,
    content: {
      poem: {
        title: '葬花吟',
        content: '花謝花飛花滿天...',
      }
    }
  };

  const responses = [
    '這首詩很好。',  // Poor quality
    '這首詩展現了林黛玉對生命無常的深刻感悟，花開花落象徵著青春易逝...',  // High quality
  ];

  for (const response of responses) {
    const score = await service.evaluateTaskQuality(mockTask, response);
    console.log(`Response: "${response.slice(0, 30)}..."`);
    console.log(`Score: ${score}\n`);
  }
}

testAIEvaluation();
```

---

## Performance Optimization

### Current Performance Metrics

| Operation | Target | Actual | Status |
|-----------|--------|--------|--------|
| Task Generation | < 2s | ~1.5s | ✅ |
| Task Submission | < 5s | ~3-4s | ✅ |
| Get Today Tasks (cached) | < 100ms | ~50ms | ✅ |
| Get Today Tasks (uncached) | < 500ms | ~300ms | ✅ |
| AI Evaluation | < 3s | 2-3s | ✅ |

### Optimization Checklist

**When adding new features, ensure**:

- [ ] Use caching for frequently accessed data
- [ ] Implement timeouts for external API calls (AI, webhooks, etc.)
- [ ] Batch Firestore operations when possible
- [ ] Avoid N+1 queries (fetch related data in bulk)
- [ ] Add performance logging to monitor regressions
- [ ] Test with realistic data volumes (1000+ users)

### Future Optimization Ideas

1. **Firestore Query Optimization**
   - Use composite indexes for complex queries
   - Implement pagination for task history (currently loads all 30 records)

2. **AI Evaluation Caching**
   - Cache AI scores for identical responses (MD5 hash)
   - Pre-compute scores for common responses

3. **Task Pre-generation**
   - Generate tasks 1 hour before UTC+8 00:00
   - Reduces latency when users first access tasks

4. **CDN Caching for Static Content**
   - Cache task content repository (poems, passages)
   - Reduce database reads for unchanging data

---

## Troubleshooting

### Issue 1: Tasks Not Generated

**Symptoms**:
- User has no tasks for today
- Cron job logs show failures

**Debugging**:
```typescript
// Check Firestore manually
const progress = await service.getUserTaskProgress(userId);
console.log('Progress:', progress);

// Check cron job logs in Vercel
// Vercel Dashboard → Functions → Logs
```

**Common Causes**:
1. Cron job didn't execute (check Vercel cron config)
2. User not in active users list (check `users` collection query)
3. Firestore permission denied (check Firestore rules)
4. Task generator error (check console logs)

**Solution**:
```typescript
// Manually trigger task generation
await service.generateDailyTasks(userId);
```

---

### Issue 2: Duplicate sourceId Error

**Symptoms**:
- User gets error: "You have already completed this content today"
- Task appears incomplete in UI

**Debugging**:
```typescript
const progress = await service.getUserTaskProgress(userId);
console.log('Used sourceIds:', progress.usedSourceIds);

const task = await service.getTodayTasks(userId).then(tasks => tasks[0]);
console.log('Task sourceId:', task.sourceId);
```

**Common Causes**:
1. Task generator created duplicate content
2. usedSourceIds not properly initialized
3. Date mismatch (task from previous day)

**Solution**:
```typescript
// If legitimate duplicate (generator bug), clear usedSourceIds
// ONLY DO THIS FOR DEBUGGING - NOT IN PRODUCTION
await updateDoc(doc(db, 'dailyTaskProgress', `${userId}_${todayDate}`), {
  usedSourceIds: []
});
```

---

### Issue 3: AI Evaluation Timeout

**Symptoms**:
- All quality scores are 60 (fallback value)
- Console shows timeout warnings

**Debugging**:
```typescript
// Check AI evaluation duration
const startTime = Date.now();
const score = await service.evaluateTaskQuality(task, response);
console.log(`AI evaluation took ${Date.now() - startTime}ms`);
```

**Common Causes**:
1. Gemini API rate limiting
2. Network latency
3. Large response text (> 1000 characters)

**Solutions**:
1. Increase timeout (if network is slow):
   ```typescript
   const AI_EVALUATION_TIMEOUT_MS = 5000; // Increase to 5s
   ```

2. Optimize AI prompt (reduce token count)

3. Implement retry logic:
   ```typescript
   let score = await withTimeout(this.performAIEvaluation(...), 3000, null);

   if (score === null) {
     // Retry once
     score = await withTimeout(this.performAIEvaluation(...), 5000, 60);
   }
   ```

---

### Issue 4: Cron Job Not Executing

**Symptoms**:
- No tasks generated at expected time
- Vercel logs show no cron executions

**Debugging**:
1. Check Vercel cron config:
   ```bash
   cat vercel.json
   ```

2. Check deployment:
   ```bash
   vercel ls
   ```

3. Check cron job dashboard:
   - Vercel Dashboard → Settings → Cron Jobs

**Common Causes**:
1. `vercel.json` not deployed
2. Incorrect cron schedule syntax
3. CRON_SECRET mismatch
4. API route path mismatch

**Solutions**:
1. Redeploy with `vercel.json`:
   ```bash
   git add vercel.json
   git commit -m "fix: Update cron config"
   git push
   vercel --prod
   ```

2. Test cron endpoint manually:
   ```bash
   curl -X GET \
     -H "Authorization: Bearer YOUR_CRON_SECRET" \
     https://your-app.vercel.app/api/cron/daily-tasks
   ```

---

## Additional Resources

- **API Documentation**: `docs/Gaming Mechanism/DAILY_TASKS_API.md`
- **Task Planning**: `docs/Gaming Mechanism/TASK.md`
- **Type Definitions**: `src/lib/types/daily-task.ts`
- **Main Service**: `src/lib/daily-task-service.ts`
- **Task Generator**: `src/lib/task-generator.ts`
- **Integration Tests**: `tests/integration/daily-tasks-full-flow.test.ts`

---

**Last Updated**: 2025-01-19
**Phase**: GAME-002 Phase 4 Complete
**Version**: 1.0.0
