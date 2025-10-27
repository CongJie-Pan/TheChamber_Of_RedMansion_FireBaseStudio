# Daily Task System - API Documentation

## Overview

The Daily Task System (GAME-002) provides automated, personalized daily learning tasks for users to engage with *Dream of the Red Chamber* content. This document describes the service layer APIs and data models.

---

## Core Services

### DailyTaskService

The main service class managing all daily task operations.

**Location**: `src/lib/daily-task-service.ts`

**Initialization**:
```typescript
const taskService = DailyTaskService.getInstance();
```

---

## Public API Methods

### 1. generateDailyTasks()

Generates a set of daily tasks for a specific user.

**Signature**:
```typescript
async generateDailyTasks(userId: string): Promise<DailyTask[]>
```

**Parameters**:
- `userId` (string): The user's unique identifier

**Returns**:
- `Promise<DailyTask[]>`: Array of 3-5 generated tasks

**Behavior**:
- Checks if user already has tasks for today
- Generates tasks based on weekday rotation and user performance
- Implements adaptive difficulty (analyzes recent 30 task completions)
- Uses content source deduplication to prevent farming
- Initializes daily progress tracking

**Example**:
```typescript
const tasks = await taskService.generateDailyTasks('user123');
// Returns: [
//   { id: 'task1', type: DailyTaskType.MORNING_READING, ... },
//   { id: 'task2', type: DailyTaskType.POETRY, ... },
//   ...
// ]
```

**Error Handling**:
- Returns empty array on failure
- Logs errors to console

---

### 2. submitTaskCompletion()

Submits a user's response to a daily task and awards rewards.

**Signature**:
```typescript
async submitTaskCompletion(
  userId: string,
  taskId: string,
  userResponse: string
): Promise<{
  success: boolean;
  rewards: {
    xp: number;
    coins: number;
    qualityScore: number;
  };
  newStreak?: number;
  streakBonus?: number;
  levelUp?: boolean;
  newLevel?: number;
}>
```

**Parameters**:
- `userId` (string): User's unique identifier
- `taskId` (string): Task to complete
- `userResponse` (string): User's submission content

**Returns**:
- Object containing:
  - `success` (boolean): Whether submission was successful
  - `rewards.xp` (number): Base XP awarded (10-50 based on difficulty)
  - `rewards.coins` (number): Coins awarded (5-25 based on difficulty)
  - `rewards.qualityScore` (number): AI-evaluated quality score (0-100)
  - `newStreak` (number, optional): Updated consecutive completion streak
  - `streakBonus` (number, optional): Bonus XP from streak milestones
  - `levelUp` (boolean, optional): Whether user leveled up
  - `newLevel` (number, optional): New level if levelUp is true

**Anti-Farming Protections**:
1. **Duplicate Content Prevention**: Checks `sourceId` against `usedSourceIds[]` to prevent duplicate rewards for same content
2. **Submission Cooldown**: 5-second minimum interval between submissions
3. **Task Ownership**: Validates task belongs to user's daily task list

**Performance Optimizations**:
- AI evaluation has 3-second timeout (fallback score: 60)
- Task data cached with 5-minute TTL

**Example**:
```typescript
const result = await taskService.submitTaskCompletion(
  'user123',
  'task456',
  '這首詩展現了賈寶玉對林黛玉的深厚情感...'
);

// Returns:
// {
//   success: true,
//   rewards: { xp: 30, coins: 15, qualityScore: 75 },
//   newStreak: 5,
//   streakBonus: 10,
//   levelUp: false
// }
```

**Error Scenarios**:
- Throws error if task not found
- Throws error if task already completed
- Throws error if duplicate sourceId detected
- Throws error if user not found
- Throws error if cooldown period not elapsed

---

### 3. getUserTaskProgress()

Retrieves a user's daily task progress for the current day.

**Signature**:
```typescript
async getUserTaskProgress(userId: string): Promise<DailyTaskProgress | null>
```

**Parameters**:
- `userId` (string): User's unique identifier

**Returns**:
- `DailyTaskProgress` object or `null` if no progress exists

**Example**:
```typescript
const progress = await taskService.getUserTaskProgress('user123');

// Returns:
// {
//   userId: 'user123',
//   date: '2025-01-19',
//   totalTasks: 5,
//   completedTasks: 3,
//   completedTaskIds: ['task1', 'task2', 'task3'],
//   usedSourceIds: ['chapter-1-passage-1-10', 'poem-123', 'character-jbaoyu-general'],
//   xpEarned: 90,
//   coinsEarned: 45,
//   streakCount: 3,
//   lastCompletedAt: Timestamp(...)
// }
```

---

### 4. getTodayTasks()

Gets all daily tasks for a user for the current day.

**Signature**:
```typescript
async getTodayTasks(userId: string): Promise<DailyTask[]>
```

**Parameters**:
- `userId` (string): User's unique identifier

**Returns**:
- `Promise<DailyTask[]>`: Array of today's tasks (or empty array if none)

**Caching**:
- Results cached for 5 minutes to reduce Firestore reads
- Cache automatically expires and refreshes

**Example**:
```typescript
const tasks = await taskService.getTodayTasks('user123');

// Returns tasks with completion status:
// [
//   { id: 'task1', type: DailyTaskType.MORNING_READING, completed: true, ... },
//   { id: 'task2', type: DailyTaskType.POETRY, completed: false, ... },
//   ...
// ]
```

---

### 5. getTaskHistory()

Retrieves a user's task completion history.

**Signature**:
```typescript
async getTaskHistory(
  userId: string,
  limit: number = 30
): Promise<DailyTaskProgress[]>
```

**Parameters**:
- `userId` (string): User's unique identifier
- `limit` (number, optional): Maximum number of records to return (default: 30)

**Returns**:
- `Promise<DailyTaskProgress[]>`: Array of historical progress records, sorted by date descending

**Example**:
```typescript
const history = await taskService.getTaskHistory('user123', 7);

// Returns last 7 days of task progress:
// [
//   { userId: 'user123', date: '2025-01-19', totalTasks: 5, completedTasks: 5, ... },
//   { userId: 'user123', date: '2025-01-18', totalTasks: 5, completedTasks: 3, ... },
//   ...
// ]
```

---

## Data Models

### DailyTask

Represents a single daily task.

**Interface**: `src/lib/types/daily-task.ts:146-172`

```typescript
interface DailyTask {
  id: string;                        // Unique task identifier
  userId: string;                    // Owner of the task
  type: DailyTaskType;               // Task category (MORNING_READING, POETRY, etc.)
  title: string;                     // Display title
  description: string;               // Task instructions
  difficulty: TaskDifficulty;        // EASY | MEDIUM | HARD
  xpReward: number;                  // Base XP reward (10-50)
  coinReward: number;                // Base coin reward (5-25)
  content: TaskContent;              // Type-specific content data
  completed: boolean;                // Completion status
  completedAt?: FirebaseTimestamp;   // Completion timestamp
  qualityScore?: number;             // AI-evaluated quality (0-100)
  sourceId: string;                  // Unique content identifier for anti-farming
  createdAt: FirebaseTimestamp;      // Task creation time
  expiresAt: FirebaseTimestamp;      // Task expiration time (end of day)
}
```

**Task Types (DailyTaskType)**:
- `MORNING_READING`: Read and comprehend a passage from the novel
- `POETRY`: Analyze classical Chinese poetry from the text
- `CHARACTER_INSIGHT`: Explore character relationships and development
- `CULTURAL_EXPLORATION`: Learn about cultural elements (architecture, customs, etc.)
- `COMMENTARY_DECODE`: Understand historical commentary on the text

**Difficulty Levels (TaskDifficulty)**:
- `EASY`: Beginner-friendly, basic comprehension (10 XP, 5 coins)
- `MEDIUM`: Intermediate analysis (30 XP, 15 coins)
- `HARD`: Advanced literary interpretation (50 XP, 25 coins)

---

### DailyTaskProgress

Tracks a user's daily task completion progress.

**Interface**: `src/lib/types/daily-task.ts:206-221`

```typescript
interface DailyTaskProgress {
  userId: string;                    // User identifier
  date: string;                      // Date in YYYY-MM-DD format
  totalTasks: number;                // Total tasks generated for the day
  completedTasks: number;            // Number of completed tasks
  completedTaskIds: string[];        // IDs of completed tasks
  usedSourceIds?: string[];          // Content IDs already rewarded (anti-farming)
  xpEarned: number;                  // Total XP earned today
  coinsEarned: number;               // Total coins earned today
  streakCount: number;               // Consecutive completion days
  lastCompletedAt?: FirebaseTimestamp; // Most recent completion time
  createdAt: FirebaseTimestamp;      // Progress record creation
  updatedAt: FirebaseTimestamp;      // Last update time
}
```

---

### TaskContent

Union type containing type-specific content data.

```typescript
type TaskContent = {
  textPassage?: {                    // For MORNING_READING
    chapter: number;
    startLine: number;
    endLine: number;
    text: string;
  };
  poem?: {                           // For POETRY
    id: string;
    title: string;
    author: string;
    content: string;
    context: string;
  };
  character?: {                      // For CHARACTER_INSIGHT
    characterId: string;
    name: string;
    chapter?: number;
    relationships: string[];
    promptFocus: string;
  };
  culturalElement?: {                // For CULTURAL_EXPLORATION
    id: string;
    category: string;
    title: string;
    description: string;
  };
  commentary?: {                     // For COMMENTARY_DECODE
    id: string;
    commentator: string;
    text: string;
    chapter: number;
  };
}
```

---

## Anti-Farming System

### sourceId Generation

Each task content piece receives a unique `sourceId` to prevent duplicate rewards.

**Pattern Examples**:
- **Morning Reading**: `chapter-5-passage-100-150` (Chapter 5, lines 100-150)
- **Poetry**: `poem-abc123` (Poem ID)
- **Character**: `character-linhdaiyu-chapter-3` (Character in specific chapter)
- **Cultural**: `culture-jiafu-architecture-001` (Cultural element ID)
- **Commentary**: `commentary-zhiyanzhai-ch5-001` (Commentary ID)

**Implementation**: `src/lib/task-generator.ts:307-354`

### Deduplication Flow

1. User submits task completion
2. System retrieves task's `sourceId`
3. Checks if `sourceId` exists in user's `usedSourceIds[]` array for today
4. If duplicate: **Throws error**, no rewards
5. If unique: Awards rewards, adds `sourceId` to `usedSourceIds[]`

**Reset**: `usedSourceIds[]` resets daily at UTC+8 00:00 when new tasks are generated

---

## Performance Features

### 1. AI Evaluation Timeout

**Location**: `src/lib/daily-task-service.ts:172-181`

AI quality evaluation has a 3-second timeout to prevent hanging:

```typescript
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
```

**Behavior**:
- AI call completes within 3s: Returns actual quality score
- AI call exceeds 3s: Returns fallback score (60)
- Logs execution time for monitoring

### 2. Task Caching

**Location**: `src/lib/daily-task-service.ts:196`

In-memory cache reduces Firestore reads:

```typescript
private taskCache: Map<string, { task: DailyTask; timestamp: number }> = new Map();
```

**Configuration**:
- TTL: 5 minutes (300,000ms)
- Scope: Per task ID
- Invalidation: Automatic on expiration

**Cache Hit Rate**: Significantly reduces Firebase API costs for frequently accessed tasks

---

## Adaptive Difficulty System

### Algorithm

**Location**: `src/lib/daily-task-service.ts:696-745`

Analyzes user's recent 30 task completions to adjust difficulty:

```typescript
private async calculateAdaptiveDifficulty(userId: string): Promise<TaskDifficulty> {
  const recentHistory = await this.getTaskHistory(userId, 30);

  // Calculate average quality score
  const avgScore = calculateAverageQualityScore(recentHistory);

  // Adjust difficulty based on performance
  if (avgScore < 60) return TaskDifficulty.EASY;        // Struggling users
  if (avgScore > 85) return TaskDifficulty.HARD;        // High performers
  return TaskDifficulty.MEDIUM;                         // Default
}
```

**Thresholds**:
- **< 60**: Decrease to EASY
- **60-85**: Maintain MEDIUM
- **> 85**: Increase to HARD

---

## Weekday Task Rotation

**Location**: `src/lib/daily-task-service.ts:746-806`

Task type distribution varies by day of week:

| Day       | Boosted Task Type (1.5x weight) |
|-----------|----------------------------------|
| Monday    | Morning Reading                  |
| Tuesday   | Poetry                           |
| Wednesday | Character Insight                |
| Thursday  | Cultural Exploration             |
| Friday    | Commentary Decode                |
| Weekend   | Balanced mix (equal weights)     |

**Implementation**:
```typescript
const weights = {
  [DailyTaskType.MORNING_READING]: dayOfWeek === 1 ? 1.5 : 1,
  [DailyTaskType.POETRY]: dayOfWeek === 2 ? 1.5 : 1,
  [DailyTaskType.CHARACTER_INSIGHT]: dayOfWeek === 3 ? 1.5 : 1,
  // ...
};
```

---

## Streak System

### Streak Calculation

**Location**: `src/lib/daily-task-service.ts:863-887`

Consecutive completion days are tracked:

```typescript
private calculateStreak(history: DailyTaskProgress[]): number {
  let streak = 0;
  const sortedHistory = history.sort((a, b) => b.date.localeCompare(a.date));

  for (const record of sortedHistory) {
    if (record.completedTasks > 0) {
      streak++;
    } else {
      break; // Streak broken
    }
  }

  return streak;
}
```

### Streak Bonuses

**Milestones** (awarded as bonus XP):

| Streak Days | Bonus XP |
|-------------|----------|
| 3 days      | +10 XP   |
| 7 days      | +25 XP   |
| 14 days     | +50 XP   |
| 30 days     | +100 XP  |

**Location**: `src/lib/daily-task-service.ts:362-381`

---

## Cron Job Integration

### Automated Task Generation

**Endpoint**: `src/app/api/cron/daily-tasks/route.ts`

**Schedule**: Daily at UTC+8 00:00 (Vercel Cron)

**Configuration** (vercel.json):
```json
{
  "crons": [{
    "path": "/api/cron/daily-tasks",
    "schedule": "0 16 * * *"
  }]
}
```

**Security**:
- Validates `CRON_SECRET` in Authorization header
- Returns 401 if unauthorized

**Batch Processing**:
- Processes users in batches of 10
- 100ms delay between batches
- Prevents serverless timeout

**Response Format**:
```typescript
{
  "success": true,
  "processedUsers": 1234,
  "failedUsers": 5,
  "processingTimeMs": 45678,
  "message": "Daily tasks generated successfully"
}
```

---

## Error Handling

### Common Errors

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `Task not found` | Invalid taskId or task expired | Check task exists in user's daily tasks |
| `Task already completed` | Duplicate submission | Check `completed` field before submitting |
| `You have already completed this content today` | sourceId duplication | This content was already rewarded today |
| `User not found` | Invalid userId | Verify user authentication |
| `Please wait before submitting again` | Cooldown violation | Wait 5 seconds between submissions |

### Error Response Format

All service methods follow this pattern:

```typescript
try {
  // Operation logic
} catch (error) {
  console.error('Detailed error message:', error);
  throw error; // Re-throw for caller to handle
}
```

**Recommendation**: Wrap service calls in try-catch blocks in your UI components.

---

## Testing

### Integration Tests

**Location**: `tests/integration/daily-tasks-full-flow.test.ts`

**Coverage**:
- End-to-end task generation and completion flow
- Anti-farming sourceId deduplication
- Streak calculation and bonuses
- AI evaluation integration
- Level-up detection

### Unit Tests

**Location**: `tests/lib/daily-task-service.test.ts`

**Coverage**:
- Task generation logic
- Difficulty adaptation
- Weekday rotation
- Caching behavior
- Error handling

**Run Tests**:
```bash
npm test -- tests/integration/daily-tasks-full-flow.test.ts
npm test -- tests/lib/daily-task-service.test.ts
```

---

## Performance Benchmarks

### Expected Performance

| Operation | Target | Actual |
|-----------|--------|--------|
| Task Generation | < 2s | ~1.5s |
| Task Submission | < 5s | ~3-4s |
| Get Today Tasks (cached) | < 100ms | ~50ms |
| Get Today Tasks (uncached) | < 500ms | ~300ms |
| AI Evaluation | < 3s | 2-3s (or timeout fallback) |

### Optimization Recommendations

1. **Enable Firestore Caching**: Configure client-side persistence
2. **Implement Pagination**: For task history (currently loads 30 records)
3. **Pre-generate Tasks**: Consider generating tasks 1 hour before UTC+8 00:00
4. **Monitor AI Performance**: Log slow AI calls for optimization

---

## Usage Examples

### Complete Daily Task Flow

```typescript
import { DailyTaskService } from '@/lib/daily-task-service';

const taskService = DailyTaskService.getInstance();
const userId = 'user123';

// 1. Get today's tasks
const tasks = await taskService.getTodayTasks(userId);

// 2. Display tasks in UI
tasks.forEach(task => {
  console.log(`${task.title} - ${task.difficulty} - ${task.xpReward} XP`);
});

// 3. User submits response
const userResponse = '這段文字描述了...';
const taskId = tasks[0].id;

try {
  const result = await taskService.submitTaskCompletion(
    userId,
    taskId,
    userResponse
  );

  console.log(`✅ Earned ${result.rewards.xp} XP!`);

  if (result.streakBonus) {
    console.log(`🔥 Streak bonus: +${result.streakBonus} XP`);
  }

  if (result.levelUp) {
    console.log(`🎉 Level up! Now level ${result.newLevel}`);
  }
} catch (error) {
  if (error.message.includes('already completed this content')) {
    console.error('⚠️ Duplicate content - no rewards');
  } else {
    console.error('❌ Submission failed:', error.message);
  }
}

// 4. Check progress
const progress = await taskService.getUserTaskProgress(userId);
console.log(`Progress: ${progress.completedTasks}/${progress.totalTasks} tasks`);
console.log(`Total XP today: ${progress.xpEarned}`);
console.log(`Current streak: ${progress.streakCount} days`);
```

---

## Version History

- **v1.0.0** (2025-01-19): Phase 4 completion
  - Core task generation and completion system
  - Anti-farming sourceId deduplication
  - AI evaluation with timeout protection
  - Task caching (5-minute TTL)
  - Adaptive difficulty based on performance
  - Weekday task rotation
  - Streak system with bonuses
  - Cron job automation

---

## Support

For issues or questions:
- Check inline JSDoc comments in source files
- Review integration tests for usage patterns
- Consult TASK.md for implementation decisions

**Last Updated**: 2025-01-19
**Phase**: GAME-002 Phase 4 Complete
