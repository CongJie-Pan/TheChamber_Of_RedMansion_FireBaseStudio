# 📘 Firebase 到 SQLite 完整遷移規劃文檔

**Project**: The Chamber of Red Mansion (紅樓慧讀)
**Document Version**: 1.0
**Date**: 2025-10-29
**Author**: Development Team
**Status**: Draft - Pending Approval

---

## 📋 目錄

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Migration Objectives](#3-migration-objectives)
4. [Target Architecture](#4-target-architecture)
5. [Database Schema Design](#5-database-schema-design)
6. [Migration Strategy](#6-migration-strategy)
7. [Risk Assessment & Mitigation](#7-risk-assessment--mitigation)
8. [Testing Strategy](#8-testing-strategy)
9. [Rollback Plan](#9-rollback-plan)
10. [Timeline & Milestones](#10-timeline--milestones)
11. [Resource Requirements](#11-resource-requirements)
12. [Success Criteria](#12-success-criteria)

---

## 1. Executive Summary

### 1.1 Purpose
本文檔旨在提供一個完整、系統化的計劃，將 The Chamber of Red Mansion 平台從 Firebase 依賴遷移至本地 SQLite 數據庫，以實現：
- ✅ 消除外部服務依賴
- ✅ 降低運營成本
- ✅ 提升數據控制能力
- ✅ 改善性能和可靠性
- ✅ 支持完全離線運行

### 1.2 Scope
**遷移範圍**：
- ✅ Firebase Firestore → SQLite
- ✅ Firebase Authentication → NextAuth.js
- ✅ 所有數據服務層重構
- ❌ 不包含 Firebase Storage（暫時保留）
- ❌ 不包含 Firebase Analytics（可選功能）

### 1.3 Business Justification
**當前問題**：
1. ❌ Firebase 權限錯誤頻繁發生（permission-denied）
2. ❌ better-sqlite3 架構不匹配問題
3. ❌ 網絡依賴導致離線無法使用
4. ❌ 潛在的成本問題（超出免費配額）
5. ❌ 數據主權和控制問題

**預期效益**：
1. ✅ **100% 離線運行能力**
2. ✅ **零運營成本**（無外部服務費用）
3. ✅ **性能提升 50-80%**（本地數據庫）
4. ✅ **完全數據控制**
5. ✅ **簡化部署流程**

---

## 2. Current State Analysis

### 2.1 Firebase Usage Overview

#### 統計數據
- **Total Files Using Firebase**: 47 files
- **Core Services**: 6 services
- **Authentication Components**: 4 components
- **UI Dependencies**: 15+ components

#### 依賴分類

##### A. **Firebase Authentication** 🔐
**Files**:
- `src/lib/firebase.ts`
- `src/lib/firebase-admin.ts`
- `src/context/AuthContext.tsx`
- `src/hooks/useAuth.ts`
- `src/app/login/page.tsx`
- `src/app/register/page.tsx`

**Impact**: ⭐⭐⭐⭐⭐ Critical (整個應用的基礎)

**Current Issues**:
- ❌ 需要網絡連接
- ❌ Firebase Admin SDK 初始化失敗
- ❌ 權限配置複雜

---

##### B. **User Level Service** 💎
**File**: `src/lib/user-level-service.ts`

**Firestore Collections**:
```typescript
users/{userId}                    // User profiles
xpTransactions/{transactionId}    // XP transaction history
levelUps/{recordId}               // Level-up records
```

**Operations**:
- User profile CRUD
- XP awarding and leveling
- Attribute points management
- Transaction logging
- Permission checking

**Impact**: ⭐⭐⭐⭐⭐ Critical (核心遊戲化系統)

**Migration Complexity**: 🔴 High
- Complex transaction logic
- Real-time level-up detection
- Audit trail requirements

---

##### C. **Community Service** 💬
**File**: `src/lib/community-service.ts`

**Firestore Collections**:
```typescript
posts                             // Community posts
posts/{postId}/comments           // Comments sub-collection
```

**Operations**:
- Post CRUD operations
- Comment threading
- Like/unlike functionality
- View count tracking
- Content moderation integration

**Impact**: ⭐⭐⭐⭐ High (社交功能)

**Migration Complexity**: 🟡 Medium
- Sub-collection structure needs flattening
- Real-time updates need redesign
- Comment threading logic

---

##### D. **Notes Service** 📝
**File**: `src/lib/notes-service.ts`

**Firestore Collections**:
```typescript
notes                             // User notes
```

**Operations**:
- Save/update/delete notes
- Query by user and chapter
- Tag management
- Public/private toggle

**Impact**: ⭐⭐⭐ Medium (閱讀功能)

**Migration Complexity**: 🟢 Low
- Simple CRUD operations
- No complex relationships
- Straightforward schema mapping

---

##### E. **Highlight Service** ✏️
**File**: `src/lib/highlight-service.ts`

**Firestore Collections**:
```typescript
highlights                        // Text highlights
```

**Operations**:
- Save highlights
- Query by user and chapter
- Delete highlights

**Impact**: ⭐⭐ Low (輔助功能)

**Migration Complexity**: 🟢 Low
- Minimal logic
- Simple data model
- No dependencies

---

##### F. **Daily Task Service** 🎯
**File**: `src/lib/daily-task-service.ts`

**Firestore Collections**:
```typescript
dailyTasks                        // Task templates
dailyTaskProgress                 // User progress
dailyTaskHistory                  // Completion history
```

**Operations**:
- Task generation
- Progress tracking
- Submission and evaluation
- Streak calculation

**Impact**: ⭐⭐⭐⭐ High (核心遊戲化功能)

**Migration Status**: ✅ **PARTIALLY MIGRATED**
- ✅ SQLite schema exists
- ✅ Repository layer implemented
- ✅ Dual-mode architecture in place
- ⚠️ Needs activation and validation

**Migration Complexity**: 🟢 Low (已完成大部分工作)

---

### 2.2 Current Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ AuthContext  │  │  Components  │  │    Pages     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
└─────────┼─────────────────┼──────────────────┼───────────────┘
          │                 │                  │
          ▼                 ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                              │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ user-level-    │  │ community-      │  │ daily-task-  │ │
│  │ service        │  │ service         │  │ service      │ │
│  └────────┬───────┘  └────────┬────────┘  └──────┬───────┘ │
│           │                   │                   │          │
└───────────┼───────────────────┼───────────────────┼──────────┘
            │                   │                   │
            ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│               Firebase Services (Current)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Firebase Auth  │  Firestore   │  (Storage/Analytics)│   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Pain Points

#### Critical Issues
1. ❌ **Permission Denied Errors**
   - Firestore security rules 配置複雜
   - Firebase Admin SDK 初始化失敗
   - 權限問題難以調試

2. ❌ **Architecture Mismatch**
   - better-sqlite3 原生模組編譯問題
   - Windows vs WSL 環境不一致
   - ERR_DLOPEN_FAILED 錯誤頻繁

3. ❌ **Network Dependency**
   - 無法離線運行
   - 網絡延遲影響性能
   - 依賴外部服務穩定性

4. ❌ **Cost Concerns**
   - 免費配額限制
   - 潛在的超額費用
   - 難以預測成本

#### Development Challenges
1. ⚠️ **Complex Configuration**
   - 多個環境變量
   - Service account JSON 管理
   - Firestore 規則維護

2. ⚠️ **Limited Control**
   - 無法直接訪問數據
   - 受限於 Firebase SDK
   - 調試困難

3. ⚠️ **Testing Difficulties**
   - 需要 Firebase emulator
   - 集成測試複雜
   - Mock 數據困難

---

## 3. Migration Objectives

### 3.1 Primary Goals

#### Goal 1: Complete Offline Capability
**Target**: 100% 功能可離線運行

**Success Criteria**:
- ✅ 所有數據操作在無網絡環境下正常運行
- ✅ 登錄和註冊不依賴外部服務
- ✅ 所有功能的響應時間 < 100ms

#### Goal 2: Zero External Dependencies
**Target**: 移除所有 Firebase 依賴

**Success Criteria**:
- ✅ package.json 中無 firebase 相關依賴
- ✅ 無外部 API 調用（除 AI 服務）
- ✅ 所有數據存儲在本地 SQLite

#### Goal 3: Performance Improvement
**Target**: 性能提升 50-80%

**Success Criteria**:
- ✅ 數據庫查詢平均響應 < 10ms
- ✅ 頁面載入時間減少 50%
- ✅ 並發用戶支持 > 100

#### Goal 4: Simplified Deployment
**Target**: 部署流程簡化 70%

**Success Criteria**:
- ✅ 無需 Firebase 配置
- ✅ 環境變量減少 80%
- ✅ 單一部署包（含數據庫）

### 3.2 Secondary Goals

1. **Improved Testability**
   - 單元測試覆蓋率 > 90%
   - 集成測試自動化
   - 無需外部服務的測試環境

2. **Better Data Control**
   - 直接 SQL 查詢能力
   - 備份和恢復簡化
   - 數據遷移工具

3. **Enhanced Security**
   - 本地數據加密
   - 無外部數據洩露風險
   - 完整的審計日誌

---

## 4. Target Architecture

### 4.1 New Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ NextAuth     │  │  Components  │  │    Pages     │      │
│  │ Context      │  │              │  │              │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
└─────────┼─────────────────┼──────────────────┼───────────────┘
          │                 │                  │
          ▼                 ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                              │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ user-level-    │  │ community-      │  │ daily-task-  │ │
│  │ service        │  │ service         │  │ service      │ │
│  └────────┬───────┘  └────────┬────────┘  └──────┬───────┘ │
│           │                   │                   │          │
└───────────┼───────────────────┼───────────────────┼──────────┘
            │                   │                   │
            ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                  Repository Layer (NEW)                      │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ user-          │  │ community-      │  │ task-        │ │
│  │ repository     │  │ repository      │  │ repository   │ │
│  └────────┬───────┘  └────────┬────────┘  └──────┬───────┘ │
│           │                   │                   │          │
└───────────┼───────────────────┼───────────────────┼──────────┘
            │                   │                   │
            ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│              SQLite Database (Local)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  users  │  posts  │  notes  │  highlights  │ tasks  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Key Architectural Changes

#### Change 1: Repository Pattern
**Before**: Direct Firestore SDK calls in services
**After**: Repository layer abstracts database operations

**Benefits**:
- ✅ Clear separation of concerns
- ✅ Easy to test and mock
- ✅ Database-agnostic services
- ✅ Simplified migration path

#### Change 2: NextAuth.js for Authentication
**Before**: Firebase Authentication
**After**: NextAuth.js with Credentials provider

**Benefits**:
- ✅ Flexible authentication strategies
- ✅ Built-in session management
- ✅ No external dependencies
- ✅ Easy to customize

#### Change 3: Transaction Management
**Before**: Firestore transactions
**After**: SQLite ACID transactions

**Benefits**:
- ✅ Better performance
- ✅ Simpler error handling
- ✅ Native rollback support
- ✅ Consistent data integrity

### 4.3 Technology Stack

#### Current Stack
```
├── Frontend: Next.js 15, React 18, TypeScript
├── Auth: Firebase Authentication
├── Database: Firebase Firestore
├── Storage: Firebase Storage (optional)
└── Analytics: Firebase Analytics (optional)
```

#### Target Stack
```
├── Frontend: Next.js 15, React 18, TypeScript
├── Auth: NextAuth.js + bcrypt
├── Database: SQLite + better-sqlite3
├── ORM: Custom Repository Pattern
├── Storage: Local filesystem (or keep Firebase)
└── Analytics: (optional, can keep Firebase)
```

---

## 5. Database Schema Design

### 5.1 Complete SQLite Schema

```sql
-- ============================================================
-- User Management Tables
-- ============================================================

-- Users table (replaces Firebase Auth + Firestore users)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,              -- User ID (UUID)
  username TEXT NOT NULL UNIQUE,    -- Username
  email TEXT UNIQUE,                -- Email (optional for guests)
  passwordHash TEXT,                -- bcrypt hashed password

  -- Level system fields
  currentLevel INTEGER DEFAULT 1,
  currentXP INTEGER DEFAULT 0,
  totalXP INTEGER DEFAULT 0,

  -- Attribute points (JSON)
  attributes TEXT DEFAULT '{}',
  -- {
  --   "poetrySkill": 0,
  --   "culturalKnowledge": 0,
  --   "analyticalThinking": 0,
  --   "socialInfluence": 0,
  --   "learningPersistence": 0
  -- }

  -- Account metadata
  isAnonymous INTEGER DEFAULT 0,    -- 0=regular, 1=guest
  isAdmin INTEGER DEFAULT 0,
  emailVerified INTEGER DEFAULT 0,

  -- Timestamps
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  lastLoginAt INTEGER,

  -- Indexes
  CONSTRAINT unique_username UNIQUE(username),
  CONSTRAINT unique_email UNIQUE(email)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_level ON users(currentLevel);

-- ============================================================
-- XP and Leveling Tables
-- ============================================================

-- XP Transactions (audit trail)
CREATE TABLE IF NOT EXISTS xp_transactions (
  transactionId TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  amount INTEGER NOT NULL,          -- Can be negative for penalties
  reason TEXT,                      -- Description of why XP was awarded
  source TEXT,                      -- e.g., "task", "reading", "community"
  sourceId TEXT,                    -- Reference to source entity
  createdAt INTEGER NOT NULL,

  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(userId, sourceId)          -- Prevent duplicate rewards
);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_user
  ON xp_transactions(userId, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_source
  ON xp_transactions(source, sourceId);

-- XP Transaction Locks (prevent double-spending)
CREATE TABLE IF NOT EXISTS xp_transaction_locks (
  lockId TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  sourceId TEXT NOT NULL,
  createdAt INTEGER NOT NULL,

  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(userId, sourceId)
);

CREATE INDEX IF NOT EXISTS idx_xp_locks_user
  ON xp_transaction_locks(userId);

-- Level Ups History
CREATE TABLE IF NOT EXISTS level_ups (
  levelUpId TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  fromLevel INTEGER NOT NULL,
  toLevel INTEGER NOT NULL,
  unlockedContent TEXT,             -- JSON array of unlocked content
  unlockedPermissions TEXT,         -- JSON array of unlocked permissions
  createdAt INTEGER NOT NULL,

  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_level_ups_user
  ON level_ups(userId, createdAt DESC);

-- ============================================================
-- Daily Tasks Tables
-- ============================================================

-- Daily Tasks (task templates)
CREATE TABLE IF NOT EXISTS daily_tasks (
  id TEXT PRIMARY KEY,
  taskType TEXT NOT NULL,           -- e.g., "poetry_analysis", "character_insight"
  difficulty TEXT NOT NULL,         -- "easy", "medium", "hard"
  title TEXT NOT NULL,
  description TEXT,
  baseXP INTEGER NOT NULL,
  content TEXT,                     -- JSON format for task content
  sourceChapter INTEGER,
  sourceVerseStart INTEGER,
  sourceVerseEnd INTEGER,
  createdAt INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_daily_tasks_type
  ON daily_tasks(taskType);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_difficulty
  ON daily_tasks(difficulty);

-- Daily Progress (user daily progress records)
CREATE TABLE IF NOT EXISTS daily_progress (
  id TEXT PRIMARY KEY,              -- Format: userId_date (e.g., "user123_2025-01-15")
  userId TEXT NOT NULL,
  date TEXT NOT NULL,               -- YYYY-MM-DD format

  tasks TEXT,                       -- JSON array of task assignments
  -- [{
  --   "taskId": "task123",
  --   "assignedAt": 1234567890,
  --   "status": "completed",
  --   "completedAt": 1234567900,
  --   "aiScore": 85,
  --   "xpAwarded": 15
  -- }]

  completedTaskIds TEXT,            -- JSON array of completed task IDs
  skippedTaskIds TEXT,              -- JSON array of skipped task IDs
  totalXPEarned INTEGER DEFAULT 0,
  totalAttributeGains TEXT,         -- JSON object
  usedSourceIds TEXT,               -- JSON array for anti-farming
  streak INTEGER DEFAULT 0,

  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,

  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_daily_progress_user_date
  ON daily_progress(userId, date);

-- Task Submissions (detailed submission records)
CREATE TABLE IF NOT EXISTS task_submissions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  taskId TEXT NOT NULL,
  userAnswer TEXT NOT NULL,
  score INTEGER NOT NULL,
  feedback TEXT,
  xpEarned INTEGER DEFAULT 0,
  attributeGains TEXT,              -- JSON format
  submittedAt INTEGER NOT NULL,

  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (taskId) REFERENCES daily_tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_submissions_user_task
  ON task_submissions(userId, taskId);

-- ============================================================
-- Community Tables
-- ============================================================

-- Posts
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  authorId TEXT NOT NULL,
  authorName TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  tags TEXT,                        -- JSON array
  likes INTEGER DEFAULT 0,
  likedBy TEXT DEFAULT '[]',        -- JSON array of user IDs
  commentCount INTEGER DEFAULT 0,
  viewCount INTEGER DEFAULT 0,
  bookmarkedBy TEXT DEFAULT '[]',   -- JSON array of user IDs

  -- Moderation fields
  status TEXT DEFAULT 'active',     -- 'active', 'hidden', 'deleted'
  moderationAction TEXT,
  originalContent TEXT,
  moderationWarning TEXT,

  -- Timestamps
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  isEdited INTEGER DEFAULT 0,

  -- Category
  category TEXT,

  FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(authorId);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);

-- Comments (flattened from sub-collection)
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  postId TEXT NOT NULL,
  authorId TEXT NOT NULL,
  authorName TEXT NOT NULL,
  content TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  likedBy TEXT DEFAULT '[]',        -- JSON array of user IDs
  parentCommentId TEXT,             -- For nested replies

  -- Moderation fields
  status TEXT DEFAULT 'active',
  moderationAction TEXT,
  originalContent TEXT,
  moderationWarning TEXT,

  -- Timestamps
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  isEdited INTEGER DEFAULT 0,

  FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parentCommentId) REFERENCES comments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(postId);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(authorId);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parentCommentId);

-- ============================================================
-- Notes and Highlights Tables
-- ============================================================

-- Notes
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  chapterId INTEGER NOT NULL,
  selectedText TEXT NOT NULL,
  note TEXT NOT NULL,
  tags TEXT DEFAULT '[]',           -- JSON array
  isPublic INTEGER DEFAULT 0,
  wordCount INTEGER DEFAULT 0,
  noteType TEXT,                    -- 'general', 'vocabulary', 'character', etc.
  createdAt INTEGER NOT NULL,
  lastModified INTEGER NOT NULL,

  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notes_user_chapter
  ON notes(userId, chapterId);
CREATE INDEX IF NOT EXISTS idx_notes_public
  ON notes(isPublic, createdAt DESC);

-- Highlights
CREATE TABLE IF NOT EXISTS highlights (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  chapterId INTEGER NOT NULL,
  selectedText TEXT NOT NULL,
  createdAt INTEGER NOT NULL,

  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_highlights_user_chapter
  ON highlights(userId, chapterId);

-- ============================================================
-- Session Management (for NextAuth.js)
-- ============================================================

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  sessionToken TEXT NOT NULL UNIQUE,
  expires INTEGER NOT NULL,
  createdAt INTEGER NOT NULL,

  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(sessionToken);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(userId);

-- Account providers (for future OAuth support)
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  provider TEXT NOT NULL,           -- 'credentials', 'google', 'github', etc.
  providerAccountId TEXT NOT NULL,
  refreshToken TEXT,
  accessToken TEXT,
  expiresAt INTEGER,
  createdAt INTEGER NOT NULL,

  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(provider, providerAccountId)
);

CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(userId);
```

### 5.2 Data Type Mapping

#### Firebase → SQLite

| Firebase Type | SQLite Type | Notes |
|--------------|-------------|-------|
| `string` | `TEXT` | Direct mapping |
| `number` | `INTEGER` or `REAL` | Based on decimal requirement |
| `boolean` | `INTEGER` | 0=false, 1=true |
| `Timestamp` | `INTEGER` | Unix timestamp in milliseconds |
| `Array` | `TEXT` | JSON serialization |
| `Object` | `TEXT` | JSON serialization |
| `DocumentReference` | `TEXT` | Store document ID as foreign key |
| `GeoPoint` | `TEXT` | JSON: `{"lat": 0, "lng": 0}` |

### 5.3 Index Strategy

**Performance Targets**:
- Single-user queries: < 5ms
- Multi-user queries: < 20ms
- Full-text search: < 50ms
- Complex joins: < 100ms

**Index Guidelines**:
1. ✅ Primary keys on all tables
2. ✅ Foreign keys for relational integrity
3. ✅ Composite indexes for common query patterns
4. ✅ Covering indexes for frequent queries
5. ❌ Avoid over-indexing (balance read vs write performance)

---

## 6. Migration Strategy

### 6.1 Migration Approach: **Phased Incremental Migration**

我們採用分階段增量遷移策略，而非一次性大爆炸式遷移（Big Bang）。

**Rationale**:
- ✅ 降低風險
- ✅ 逐步驗證
- ✅ 快速回滾能力
- ✅ 持續交付新功能

### 6.2 Four-Phase Migration Plan

```
Phase 1        Phase 2         Phase 3          Phase 4
(1-2 days)    (1-2 weeks)     (2-3 weeks)      (2-3 weeks)
───────────   ────────────    ─────────────    ─────────────
   SQLite      Simple          Core             Auth
Infrastructure  Services       Systems         Replacement
   Setup       Migration       Migration

   ✓ Enable    ✓ highlights   ✓ user-level    ✓ NextAuth.js
   daily-task  ✓ notes        ✓ community     ✓ Migrate users
   SQLite                                      ✓ Remove Firebase
```

### 6.3 Phase 1: SQLite Infrastructure Setup

**Objective**: 啟用並驗證現有 SQLite 支持

**Duration**: 1-2 days

**Tasks**:
1. Set `USE_SQLITE=1` environment variable
2. Rebuild `better-sqlite3` for current environment
3. Validate database initialization
4. Run existing test suite
5. Benchmark performance

**Success Criteria**:
- ✅ SQLite database initializes without errors
- ✅ All daily-task tests pass
- ✅ Task generation and submission work correctly
- ✅ Performance meets targets (< 10ms average query time)

**Deliverables**:
- ✅ Working SQLite database
- ✅ Performance baseline report
- ✅ Updated documentation

### 6.4 Phase 2: Simple Services Migration

**Objective**: 遷移 highlights 和 notes 服務

**Duration**: 1-2 weeks

**Migration Path**:

#### Step 1: Create Repository Layer
```typescript
// src/lib/repositories/highlight-repository.ts
export class HighlightRepository {
  createHighlight(highlight: Omit<Highlight, 'id'>): Highlight;
  getHighlightsByUserAndChapter(userId: string, chapterId: number): Highlight[];
  deleteHighlight(id: string): void;
}

// src/lib/repositories/note-repository.ts
export class NoteRepository {
  createNote(note: Omit<Note, 'id'>): Note;
  updateNote(id: string, updates: Partial<Note>): Note;
  getNotesByUserAndChapter(userId: string, chapterId: number): Note[];
  getAllNotesByUser(userId: string): Note[];
  deleteNote(id: string): void;
}
```

#### Step 2: Update Service Layer
```typescript
// src/lib/highlight-service.ts (updated)
import { highlightRepository } from './repositories/highlight-repository';

export async function saveHighlight(highlight: Omit<Highlight, 'id'>) {
  if (useSQLite()) {
    return highlightRepository.createHighlight(highlight);
  } else {
    // Firebase fallback (for gradual migration)
    return saveHighlightFirebase(highlight);
  }
}
```

#### Step 3: Data Migration Script
```typescript
// scripts/migrate-highlights-to-sqlite.ts
async function migrateHighlights() {
  const firebaseHighlights = await getAllFirebaseHighlights();
  for (const highlight of firebaseHighlights) {
    await highlightRepository.createHighlight(highlight);
  }
}
```

**Success Criteria**:
- ✅ All highlight/note operations work with SQLite
- ✅ Data migration script completes successfully
- ✅ Zero data loss during migration
- ✅ All tests pass

### 6.5 Phase 3: Core Systems Migration

**Objective**: 遷移 user-level 和 community 服務

**Duration**: 2-3 weeks

**Complexity**: 🔴 High

#### Challenge 1: Transaction Management

**Firebase Approach**:
```typescript
await runTransaction(db, async (transaction) => {
  const userRef = doc(db, 'users', userId);
  const user = await transaction.get(userRef);
  transaction.update(userRef, { totalXP: user.data().totalXP + xp });
});
```

**SQLite Approach**:
```typescript
db.transaction(() => {
  const user = userRepository.getUserById(userId);
  userRepository.updateUser(userId, { totalXP: user.totalXP + xp });
})();
```

**Benefits**:
- ✅ 更快的性能（無網絡往返）
- ✅ 真正的 ACID 事務
- ✅ 自動回滾機制

#### Challenge 2: Real-time Updates

**Firebase**: Uses `onSnapshot()` for real-time updates
**SQLite**: Polling or WebSocket-based updates

**Solution**:
- Use React Query with stale-while-revalidate
- Implement optimistic UI updates
- Add manual refresh triggers

#### Challenge 3: Sub-collections

**Firebase**: Nested sub-collections (e.g., `posts/{id}/comments`)
**SQLite**: Flattened structure with foreign keys

**Solution**:
```sql
-- Instead of sub-collection, use foreign key
CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  postId TEXT NOT NULL,
  -- ... other fields
  FOREIGN KEY (postId) REFERENCES posts(id)
);
```

**Success Criteria**:
- ✅ All user-level operations work (XP, levels, attributes)
- ✅ Community posts and comments fully functional
- ✅ Transaction integrity maintained
- ✅ Performance meets targets

### 6.6 Phase 4: Authentication Replacement

**Objective**: 替換 Firebase Auth 為 NextAuth.js

**Duration**: 2-3 weeks

**Complexity**: 🟡 Medium-High

#### Step 1: Install NextAuth.js
```bash
npm install next-auth bcryptjs
npm install --save-dev @types/bcryptjs
```

#### Step 2: Configure NextAuth.js
```typescript
// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { userRepository } from '@/lib/repositories/user-repository';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const user = await userRepository.getUserByEmail(credentials.email);
        if (!user) return null;

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.username };
      }
    })
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    signUp: '/register',
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

#### Step 3: Update AuthContext
```typescript
// src/context/AuthContext.tsx (updated)
import { useSession } from 'next-auth/react';

export function AuthProvider({ children }: AuthProviderProps) {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';

  // ... rest of the implementation
}
```

#### Step 4: Migrate Existing Users
```typescript
// scripts/migrate-firebase-users-to-sqlite.ts
async function migrateUsers() {
  const firebaseUsers = await admin.auth().listUsers();

  for (const user of firebaseUsers.users) {
    // Create SQLite user with temporary password
    await userRepository.createUser({
      id: user.uid,
      email: user.email,
      username: user.displayName || user.email?.split('@')[0],
      passwordHash: await bcrypt.hash(generateTemporaryPassword(), 10),
      // ... other fields
    });
  }
}
```

**Success Criteria**:
- ✅ Users can log in with email/password
- ✅ Session management works correctly
- ✅ All existing users migrated
- ✅ Password reset functionality
- ✅ Guest/anonymous login support

### 6.7 Data Migration Workflow

```
┌────────────────────┐
│  Firebase (Source) │
└─────────┬──────────┘
          │
          ▼
┌────────────────────────────────┐
│  Migration Script              │
│  1. Fetch all data             │
│  2. Transform schema           │
│  3. Validate data              │
│  4. Insert to SQLite           │
│  5. Verify integrity           │
└─────────┬──────────────────────┘
          │
          ▼
┌────────────────────┐
│  SQLite (Target)   │
└────────────────────┘
```

**Key Principles**:
1. ✅ **Idempotent**: Can run multiple times safely
2. ✅ **Atomic**: All or nothing (use transactions)
3. ✅ **Verifiable**: Checksum and count validation
4. ✅ **Reversible**: Keep Firebase data until verified
5. ✅ **Logged**: Detailed migration logs

---

## 7. Risk Assessment & Mitigation

### 7.1 Critical Risks

#### Risk 1: Data Loss During Migration 🔴

**Probability**: Low
**Impact**: Critical
**Risk Level**: HIGH

**Mitigation**:
- ✅ Keep Firebase data as backup during migration
- ✅ Implement comprehensive data validation
- ✅ Use checksums to verify data integrity
- ✅ Run migration in dry-run mode first
- ✅ Create automated rollback scripts

**Contingency Plan**:
- If data loss detected, immediately halt migration
- Restore from Firebase backup
- Investigate and fix migration script
- Re-run with additional validation

---

#### Risk 2: Performance Degradation 🟡

**Probability**: Medium
**Impact**: Medium
**Risk Level**: MEDIUM

**Mitigation**:
- ✅ Benchmark before and after migration
- ✅ Optimize database indexes
- ✅ Use connection pooling
- ✅ Implement query result caching
- ✅ Profile slow queries

**Contingency Plan**:
- Identify slow operations
- Add targeted indexes
- Optimize queries with EXPLAIN QUERY PLAN
- Consider denormalization for read-heavy operations

---

#### Risk 3: Authentication Breaking 🔴

**Probability**: Low
**Impact**: Critical
**Risk Level**: HIGH

**Mitigation**:
- ✅ Phase authentication migration last
- ✅ Run parallel auth systems during transition
- ✅ Extensive testing of login/logout flows
- ✅ Implement fallback to Firebase Auth
- ✅ User communication about password reset

**Contingency Plan**:
- Keep Firebase Auth active as fallback
- Implement dual authentication check
- Allow users to re-authenticate if needed

---

#### Risk 4: Real-time Features Breaking 🟡

**Probability**: High
**Impact**: Low
**Risk Level**: MEDIUM

**Mitigation**:
- ✅ Replace real-time with polling + optimistic updates
- ✅ Implement React Query for cache management
- ✅ Add manual refresh buttons
- ✅ Consider WebSocket for critical features

**Contingency Plan**:
- Accept degraded UX temporarily
- Prioritize features needing real-time
- Implement WebSocket for high-priority features

---

### 7.2 Risk Matrix

```
         Impact
         │
Critical │     Risk 1        Risk 3
         │   (Data Loss)   (Auth Break)
         │
  Medium │     Risk 2
         │  (Performance)
         │
     Low │                   Risk 4
         │                 (Real-time)
         │
         └──────────────────────────────
           Low      Medium      High
                Probability
```

---

## 8. Testing Strategy

### 8.1 Testing Pyramid

```
         ╱╲
        ╱  ╲
       ╱ E2E╲          10% - End-to-End Tests
      ╱──────╲
     ╱        ╲
    ╱Integration╲     30% - Integration Tests
   ╱────────────╲
  ╱              ╲
 ╱  Unit Tests   ╲   60% - Unit Tests
╱────────────────╲
```

### 8.2 Test Coverage Requirements

**Minimum Coverage**:
- Unit Tests: 90%
- Integration Tests: 80%
- E2E Tests: Critical user flows only

**Critical Paths to Test**:
1. ✅ User registration and login
2. ✅ Daily task generation and submission
3. ✅ XP awarding and level-up
4. ✅ Community post creation and commenting
5. ✅ Note taking and retrieval

### 8.3 Test Plan by Phase

#### Phase 1: SQLite Infrastructure
```typescript
// tests/lib/sqlite-db-initialization.test.ts
test('SQLite database initializes successfully', () => {
  const db = getDatabase();
  expect(db).toBeDefined();
});

test('All tables are created', () => {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  expect(tables).toContainEqual({ name: 'users' });
  expect(tables).toContainEqual({ name: 'xp_transactions' });
  // ... all other tables
});
```

#### Phase 2: Simple Services Migration
```typescript
// tests/lib/highlight-repository.test.ts
describe('HighlightRepository', () => {
  test('creates highlight successfully', () => {
    const highlight = highlightRepository.createHighlight({
      userId: 'user123',
      chapterId: 1,
      selectedText: 'Test text'
    });
    expect(highlight.id).toBeDefined();
  });

  test('retrieves highlights by user and chapter', () => {
    const highlights = highlightRepository.getHighlightsByUserAndChapter('user123', 1);
    expect(highlights.length).toBeGreaterThan(0);
  });
});
```

#### Phase 3: Core Systems Migration
```typescript
// tests/integration/user-level-sqlite.test.ts
describe('User Level Service with SQLite', () => {
  test('awards XP and updates user profile', async () => {
    const result = await userLevelService.awardXP('user123', 50, 'Test reward');
    expect(result.newTotalXP).toBe(50);
    expect(result.success).toBe(true);
  });

  test('detects level-up correctly', async () => {
    const result = await userLevelService.awardXP('user123', 100, 'Level up test');
    expect(result.leveledUp).toBe(true);
    expect(result.newLevel).toBeGreaterThan(result.fromLevel);
  });
});
```

#### Phase 4: Authentication Replacement
```typescript
// tests/integration/nextauth-login.test.ts
describe('NextAuth.js Authentication', () => {
  test('user can login with valid credentials', async () => {
    const result = await signIn('credentials', {
      email: 'test@example.com',
      password: 'password123',
      redirect: false
    });
    expect(result.error).toBeNull();
    expect(result.ok).toBe(true);
  });

  test('login fails with invalid password', async () => {
    const result = await signIn('credentials', {
      email: 'test@example.com',
      password: 'wrongpassword',
      redirect: false
    });
    expect(result.error).toBeDefined();
  });
});
```

### 8.4 Performance Testing

**Benchmarks**:
```typescript
// tests/performance/database-benchmarks.test.ts
describe('SQLite Performance Benchmarks', () => {
  test('single user query < 5ms', () => {
    const start = performance.now();
    const user = userRepository.getUserById('user123');
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(5);
  });

  test('complex join query < 100ms', () => {
    const start = performance.now();
    const data = db.prepare(`
      SELECT u.*, COUNT(p.id) as postCount
      FROM users u
      LEFT JOIN posts p ON u.id = p.authorId
      WHERE u.currentLevel > 5
      GROUP BY u.id
    `).all();
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });
});
```

---

## 9. Rollback Plan

### 9.1 Rollback Triggers

**Automatic Rollback** if:
- ❌ Data integrity check fails
- ❌ Critical functionality broken
- ❌ Performance degradation > 50%
- ❌ User-reported critical bugs > 5

**Manual Rollback** if:
- ⚠️ Unforeseen issues arise
- ⚠️ Business requirements change
- ⚠️ Timeline constraints

### 9.2 Rollback Procedure

#### Step 1: Stop New Writes to SQLite
```typescript
// Set environment variable
USE_SQLITE=0
```

#### Step 2: Re-enable Firebase
```typescript
// Verify Firebase credentials are still valid
// Re-enable Firebase in all services
```

#### Step 3: Verify Data Consistency
```bash
# Run data validation script
npm run validate:firebase-data
```

#### Step 4: Restore from Backup (if needed)
```bash
# Restore Firestore backup
firebase firestore:restore --backup-id <backup-id>
```

#### Step 5: Redeploy Previous Version
```bash
git revert <migration-commit>
npm run build
npm run deploy
```

### 9.3 Data Recovery

**Firebase Data Retention**:
- Keep Firebase project active for 30 days post-migration
- Export daily backups during migration period
- Maintain read access for verification

**SQLite Backups**:
- Daily automated backups
- Pre-migration snapshot
- Post-migration verification snapshot

---

## 10. Timeline & Milestones

### 10.1 Detailed Timeline

```
Week 1-2: Phase 1 - SQLite Infrastructure
├── Day 1-2: Environment setup and SQLite activation
├── Day 3-4: Testing and validation
├── Day 5-7: Performance benchmarking
└── Milestone 1: ✅ SQLite operational for daily tasks

Week 3-4: Phase 2 - Simple Services Migration
├── Week 3: Highlights service migration
├── Week 4: Notes service migration
└── Milestone 2: ✅ Simple services migrated and tested

Week 5-7: Phase 3 - Core Systems Migration
├── Week 5: User-level service repository layer
├── Week 6: Community service migration
├── Week 7: Testing and optimization
└── Milestone 3: ✅ Core systems migrated

Week 8-10: Phase 4 - Authentication Replacement
├── Week 8: NextAuth.js setup and configuration
├── Week 9: User migration and testing
├── Week 10: Firebase removal and final verification
└── Milestone 4: ✅ Complete Firebase removal

Week 11: Final Testing and Deployment
├── Comprehensive E2E testing
├── Performance validation
├── User acceptance testing
└── Production deployment
```

### 10.2 Key Milestones

| Milestone | Target Date | Success Criteria |
|-----------|-------------|------------------|
| M1: SQLite Operational | End of Week 2 | Daily tasks work with SQLite |
| M2: Simple Services | End of Week 4 | Highlights & Notes migrated |
| M3: Core Systems | End of Week 7 | User-level & Community migrated |
| M4: Auth Replacement | End of Week 10 | NextAuth.js fully functional |
| M5: Production Ready | End of Week 11 | All tests pass, performance validated |

### 10.3 Critical Path

```
SQLite Setup → Simple Services → Core Systems → Auth → Production
    (2w)          (2w)              (3w)         (3w)      (1w)
     ▼             ▼                 ▼            ▼         ▼
    M1 ────────→ M2 ──────────────→ M3 ────────→ M4 ─────→ M5
```

**Dependencies**:
- Phase 2 depends on Phase 1 completion
- Phase 3 depends on Phase 2 completion
- Phase 4 can start after Phase 3 (minor overlap possible)

---

## 11. Resource Requirements

### 11.1 Human Resources

**Development Team**:
- 1 Senior Backend Developer (Lead) - Full-time, 11 weeks
- 1 Backend Developer - Full-time, 11 weeks
- 1 QA Engineer - Part-time (50%), 11 weeks
- 1 DevOps Engineer - Part-time (25%), weeks 10-11

**Estimated Effort**:
- Development: ~350 hours
- Testing: ~100 hours
- Documentation: ~50 hours
- **Total**: ~500 hours

### 11.2 Technical Resources

**Infrastructure**:
- Development environment with WSL
- SQLite3 database
- better-sqlite3 native module
- Node.js 18+ environment

**Tools**:
- Database migration tools
- Performance profiling tools
- Automated testing framework
- CI/CD pipeline

**Budget**:
- No additional cloud costs (removing Firebase)
- Potential one-time costs for tools/licenses: < $500

---

## 12. Success Criteria

### 12.1 Functional Requirements

- ✅ All features work identically to Firebase version
- ✅ Zero data loss during migration
- ✅ User authentication works seamlessly
- ✅ All tests pass (unit, integration, E2E)

### 12.2 Performance Requirements

- ✅ Database queries < 10ms average
- ✅ Page load time < 2 seconds
- ✅ API response time < 100ms
- ✅ Support 100+ concurrent users

### 12.3 Quality Requirements

- ✅ Code coverage > 90%
- ✅ Zero critical bugs in production
- ✅ Zero security vulnerabilities
- ✅ Complete documentation

### 12.4 Operational Requirements

- ✅ 100% offline capability
- ✅ Automated backup and restore
- ✅ Monitoring and logging in place
- ✅ Rollback plan tested

---

## 13. Appendix

### 13.1 Glossary

- **Firebase**: Google's Backend-as-a-Service platform
- **SQLite**: Embedded relational database
- **NextAuth.js**: Authentication library for Next.js
- **Repository Pattern**: Design pattern separating data access logic
- **ACID**: Atomicity, Consistency, Isolation, Durability
- **JWT**: JSON Web Token for authentication

### 13.2 References

- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [better-sqlite3 API](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md)
- [Firebase Migration Guide](https://firebase.google.com/docs/firestore/manage-data/export-import)

### 13.3 Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-10-29 | Initial draft | Development Team |

---

**Document Status**: ✅ Ready for Review
**Next Steps**:
1. Review and approve this planning document
2. Create detailed TASK.md with all tasks
3. Begin Phase 1 implementation

**Approval Required From**:
- [ ] Project Manager
- [ ] Technical Lead
- [ ] QA Lead
- [ ] Product Owner

---

*End of Planning Specification Document*
