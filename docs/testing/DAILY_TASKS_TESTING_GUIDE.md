# 每日修身系統測試實施指南

## 📋 概覽

本文檔提供完整的測試實施指南，確保每日修身系統的 4 個關鍵問題不會再次發生：
1. SQLite 架構不匹配
2. 任務重複生成
3. XP 更新失敗
4. 頁面載入緩慢

---

## ✅ 已完成的修復

### **代碼修復 (已提交)**
- ✅ `src/lib/sqlite-db.ts` - Graceful fallback mechanism
- ✅ `src/lib/daily-task-service.ts` - Dynamic SQLite availability check
- ✅ `src/app/(main)/daily-tasks/page.tsx` - Non-blocking task generation

### **測試框架 (進行中)**
- 🟡 `tests/lib/sqlite-db-fallback.test.ts` - 測試框架已創建，需要調試 mock 策略

---

## 🧪 測試實施計劃

### **Phase 1: 核心單元測試** (預計 3 天)

#### **1. SQLite Fallback Tests** ⭐ 優先級最高
**檔案**: `tests/lib/sqlite-db-fallback.test.ts`
**狀態**: 框架已創建，需要修復 mock 策略

**當前問題**:
- Jest module reset 與 singleton pattern 衝突
- Mock strategy 需要調整以處理條件式 require()

**解決方案**:
```typescript
// 使用 jest.isolateModules() 來隔離每個測試
jest.isolateModules(() => {
  const sqliteDb = require('@/lib/sqlite-db');
  // 測試代碼
});

// 或者使用 factory function 模式
beforeEach(() => {
  jest.resetModules();
  // Re-mock after reset
  jest.mock('better-sqlite3', () => mockImplementation);
});
```

**測試案例** (12 個):
- [x] 成功初始化
- [x] 架構不匹配檢測 (ERR_DLOPEN_FAILED, Win32, ELF)
- [x] Fallback 行為（返回 null 而不是 throw）
- [x] 初始化標誌管理
- [x] isSQLiteAvailable() helper
- [x] Database cleanup

---

#### **2. Daily Task Service Fallback Tests**
**檔案**: `tests/lib/daily-task-service-sqlite-fallback.test.ts`
**狀態**: 待實施

**測試重點**:
```typescript
describe('DailyTaskService SQLite Fallback', () => {
  it('should use SQLite when available', async () => {
    // Mock isSQLiteAvailable to return true
    jest.mock('@/lib/sqlite-db', () => ({
      isSQLiteAvailable: () => true,
      getDatabase: () => mockDatabase,
    }));

    const service = new DailyTaskService();
    const tasks = await service.generateDailyTasks('user1');

    expect(taskRepository.batchCreateTasks).toHaveBeenCalled();
    expect(mockFirestore.setDoc).not.toHaveBeenCalled();
  });

  it('should fallback to Firebase when SQLite unavailable', async () => {
    // Mock isSQLiteAvailable to return false
    jest.mock('@/lib/sqlite-db', () => ({
      isSQLiteAvailable: () => false,
    }));

    const service = new DailyTaskService();
    const tasks = await service.generateDailyTasks('user1');

    expect(mockFirestore.setDoc).toHaveBeenCalled();
  });
});
```

---

#### **3. Task Generation Idempotency Tests**
**檔案**: `tests/lib/daily-task-service-idempotency.test.ts`
**狀態**: 待實施

**關鍵測試**:
```typescript
describe('Task Generation Idempotency', () => {
  it('should not regenerate tasks if progress exists', async () => {
    // Setup: Existing progress
    const existingProgress = {
      userId: 'user1',
      date: '2025-10-28',
      tasks: [...],
    };

    jest.spyOn(dailyTaskService, 'getUserDailyProgress')
      .mockResolvedValue(existingProgress);

    // Act: Try to generate again
    const tasks = await dailyTaskService.generateDailyTasks('user1');

    // Assert: Should return existing tasks, not generate new ones
    expect(taskGenerator.generateTasksForUser).not.toHaveBeenCalled();
    expect(tasks).toHaveLength(existingProgress.tasks.length);
  });

  it('should handle concurrent generation requests', async () => {
    // Simulate concurrent requests
    const promises = Promise.all([
      dailyTaskService.generateDailyTasks('user1'),
      dailyTaskService.generateDailyTasks('user1'),
      dailyTaskService.generateDailyTasks('user1'),
    ]);

    const results = await promises;

    // All should return same tasks
    expect(results[0]).toEqual(results[1]);
    expect(results[1]).toEqual(results[2]);

    // Generator called only once
    expect(taskGenerator.generateTasksForUser).toHaveBeenCalledTimes(1);
  });
});
```

---

#### **4. XP Award Fallback Tests**
**檔案**: `tests/lib/user-level-service-xp-fallback.test.ts`
**狀態**: 待實施

**測試重點**:
```typescript
describe('XP Award with SQLite Fallback', () => {
  it('should award XP via Firebase when SQLite fails', async () => {
    // Mock SQLite failure
    jest.spyOn(userRepository, 'awardXP').mockImplementation(() => {
      throw new Error('SQLite unavailable');
    });

    // Mock Firebase success
    const mockUpdateDoc = jest.fn();
    jest.spyOn(mockFirestore, 'updateDoc').mockImplementation(mockUpdateDoc);

    // Act
    const result = await userLevelService.awardXP(
      'user1',
      10,
      'Task completion',
      'task',
      'task-123'
    );

    // Assert: Should succeed via Firebase
    expect(result.success).toBe(true);
    expect(result.newTotalXP).toBeGreaterThan(0);
    expect(mockUpdateDoc).toHaveBeenCalled();
  });

  it('should not lose XP data during backend switch', async () => {
    // Get initial XP
    const initialProfile = await userLevelService.getUserProfile('user1');
    const initialXP = initialProfile.totalXP;

    // Award XP (SQLite fails, fallback to Firebase)
    await userLevelService.awardXP('user1', 10, 'Test', 'task', 'task-1');

    // Verify XP increased
    const updatedProfile = await userLevelService.getUserProfile('user1');
    expect(updatedProfile.totalXP).toBe(initialXP + 10);
  });
});
```

---

#### **5. Page Loading Tests**
**檔案**: `tests/app/daily-tasks/page-loading.test.tsx`
**狀態**: 待實施

**React Testing Library 測試**:
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import DailyTasksPage from '@/app/(main)/daily-tasks/page';

describe('Daily Tasks Page Loading UX', () => {
  it('should render page immediately without blocking', async () => {
    // Mock slow task generation
    jest.spyOn(global, 'fetch').mockImplementation(() =>
      new Promise(resolve => setTimeout(resolve, 5000))
    );

    const startTime = Date.now();

    // Act: Render page
    render(<DailyTasksPage />);

    // Assert: Page renders quickly
    const renderTime = Date.now() - startTime;
    expect(renderTime).toBeLessThan(100); // < 100ms

    // Should see page structure immediately
    expect(screen.getByText(/每日修身/i)).toBeInTheDocument();
    expect(screen.getByText(/今日任務/i)).toBeInTheDocument();
  });

  it('should show loading spinner during background generation', async () => {
    // Mock no existing tasks
    jest.spyOn(dailyTaskService, 'getUserDailyProgress')
      .mockResolvedValue(null);

    // Mock slow generation
    global.fetch = jest.fn(() =>
      new Promise(resolve =>
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ tasks: [] }),
        }), 2000)
      )
    );

    // Render
    render(<DailyTasksPage />);

    // Should show loading message
    expect(await screen.findByText(/正在生成今日任務/i)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // After generation completes
    await waitFor(() => {
      expect(screen.queryByText(/正在生成/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
```

---

### **Phase 2: 整合測試** (預計 2 天)

#### **1. SQLite-Firebase Fallback Integration**
**檔案**: `tests/integration/sqlite-firebase-fallback-flow.test.ts`

**完整流程測試**:
```typescript
describe('SQLite to Firebase Fallback Flow', () => {
  beforeAll(async () => {
    // Setup Firebase emulator
    await setupFirebaseEmulator();
  });

  it('should complete full task flow with SQLite failure', async () => {
    // 1. Simulate SQLite failure
    process.env.FORCE_SQLITE_FAIL = 'true';

    // 2. Generate tasks (should use Firebase)
    const tasks = await dailyTaskService.generateDailyTasks('user1');
    expect(tasks).toHaveLength(5);

    // 3. Submit task (should use Firebase)
    const result = await dailyTaskService.submitTaskCompletion(
      'user1',
      tasks[0].id,
      'Sample answer'
    );

    // 4. Verify XP awarded via Firebase
    expect(result.success).toBe(true);
    expect(result.xpAwarded).toBeGreaterThan(0);

    // 5. Check user profile updated
    const profile = await userLevelService.getUserProfile('user1');
    expect(profile.totalXP).toBeGreaterThan(0);
  });
});
```

---

#### **2. Task Duplicate Prevention Integration**
**檔案**: `tests/integration/task-generation-duplicate-prevention.test.ts`

**並發與重複測試**:
```typescript
describe('Task Generation Duplicate Prevention', () => {
  it('should prevent duplicates under concurrent load', async () => {
    const userId = 'test-user-' + Date.now();

    // Simulate 10 concurrent requests
    const promises = Array(10).fill(null).map(() =>
      fetch('/api/daily-tasks/generate', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      }).then(r => r.json())
    );

    const results = await Promise.all(promises);

    // All should return same tasks
    const firstTaskIds = results[0].tasks.map(t => t.id).sort();

    results.forEach(result => {
      const taskIds = result.tasks.map(t => t.id).sort();
      expect(taskIds).toEqual(firstTaskIds);
    });

    // Verify only one progress record created
    const progress = await dailyTaskService.getUserDailyProgress(userId);
    expect(progress).toBeTruthy();
  });

  it('should not regenerate on page refresh', async () => {
    const userId = 'refresh-test-' + Date.now();

    // First load
    const firstResponse = await fetch('/api/daily-tasks/generate', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    const firstData = await firstResponse.json();

    // Simulate page refresh (second load)
    const secondResponse = await fetch('/api/daily-tasks/generate', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    const secondData = await secondResponse.json();

    // Should return same tasks
    expect(firstData.tasks).toEqual(secondData.tasks);
  });
});
```

---

## 🎯 Mock 策略指南

### **SQLite Mock Pattern**
```typescript
// Mock better-sqlite3 module
jest.mock('better-sqlite3', () => {
  return jest.fn().mockImplementation(() => ({
    pragma: jest.fn(),
    prepare: jest.fn(() => ({
      get: jest.fn(),
      all: jest.fn(() => []),
      run: jest.fn(),
    })),
    exec: jest.fn(),
    close: jest.fn(),
  }));
});

// Mock sqlite-db module
jest.mock('@/lib/sqlite-db', () => ({
  getDatabase: jest.fn(() => mockDatabase),
  isSQLiteAvailable: jest.fn(() => true),
  closeDatabase: jest.fn(),
}));
```

### **Firebase Mock Pattern**
```typescript
// Mock Firestore operations
const mockFirestore = {
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  getDocs: jest.fn(),
};

jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  getDoc: mockFirestore.getDoc,
  setDoc: mockFirestore.setDoc,
  updateDoc: mockFirestore.updateDoc,
}));
```

### **Repository Mock Pattern**
```typescript
// Mock user repository
jest.mock('@/lib/repositories/user-repository', () => ({
  getUserById: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  awardXP: jest.fn(),
  updateAttributes: jest.fn(),
}));
```

---

## 🚀 執行測試

### **運行特定測試**
```bash
# SQLite fallback tests
npm test -- sqlite-db-fallback

# Daily task service tests
npm test -- daily-task-service-sqlite-fallback

# All lib tests
npm test -- tests/lib

# All integration tests
npm test -- tests/integration

# With coverage
npm test -- --coverage sqlite-db-fallback
```

### **調試失敗的測試**
```bash
# Verbose output
npm test -- --verbose sqlite-db-fallback

# Run single test
npm test -- -t "should detect ERR_DLOPEN_FAILED"

# Show console logs
npm test -- --silent=false sqlite-db-fallback
```

---

## 📊 測試覆蓋率目標

### **模組級別覆蓋率**
- `sqlite-db.ts`: 50% → **95%**
- `daily-task-service.ts`: 70% → **90%**
- `user-level-service.ts`: 80% → **92%**
- `page.tsx`: 60% → **85%**
- API routes: 75% → **90%**

### **整體目標**
- 當前: 77.37%
- 目標: **85%+**
- 新增測試: ~150 個

---

## ✅ 測試完成檢查清單

### **單元測試**
- [ ] `sqlite-db-fallback.test.ts` - 12 tests ✅ 框架已創建
- [ ] `daily-task-service-sqlite-fallback.test.ts` - 15 tests
- [ ] `daily-task-service-idempotency.test.ts` - 10 tests
- [ ] `user-level-service-xp-fallback.test.ts` - 12 tests
- [ ] `page-loading.test.tsx` - 10 tests
- [ ] `sqlite-module-loading.test.ts` - 8 tests
- [ ] `daily-tasks-generate-fallback.test.ts` - 10 tests
- [ ] `TaskCard-loading-states.test.tsx` - 6 tests

### **整合測試**
- [ ] `sqlite-firebase-fallback-flow.test.ts` - 8 tests
- [ ] `task-generation-duplicate-prevention.test.ts` - 10 tests
- [ ] `xp-award-end-to-end.test.ts` - 12 tests
- [ ] `page-loading-performance.test.ts` - 8 tests

### **測試品質**
- [ ] 所有測試通過率 100%
- [ ] 測試覆蓋率 >= 85%
- [ ] 無 flaky tests
- [ ] 平均執行時間 < 60秒
- [ ] Mock 策略一致

---

## 🔧 疑難排解

### **問題 1: Jest Module Reset 與 Singleton 衝突**
**症狀**: 測試間共享狀態，無法獨立運行

**解決方案**:
```typescript
// 使用 jest.isolateModules() 隔離
test('isolated test', () => {
  jest.isolateModules(() => {
    const module = require('@/lib/sqlite-db');
    // 測試代碼
  });
});

// 或在 beforeEach 中完全重置
beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  // Re-setup mocks
});
```

### **問題 2: Mock 不生效**
**症狀**: Mock 函數未被調用或返回錯誤值

**解決方案**:
```typescript
// 確保 mock 在 require 之前
jest.mock('@/lib/module', () => mockImplementation);
const module = require('@/lib/module'); // 必須在 mock 之後

// 或使用 jest.doMock() 動態 mock
jest.doMock('@/lib/module', () => mockImplementation);
const module = require('@/lib/module');
```

### **問題 3: Async 測試超時**
**症狀**: 測試超過 60 秒超時

**解決方案**:
```typescript
// 增加特定測試的超時
test('long running test', async () => {
  // ...
}, 120000); // 120 seconds

// 或在 jest.config.js 中全局設置
testTimeout: 120000
```

---

## 📝 後續步驟

1. **修復 sqlite-db-fallback.test.ts mock 策略**
   - 使用 `jest.isolateModules()`
   - 確保每個測試獨立運行

2. **依序實施 Phase 1 測試** (3 天)
   - Day 1: SQLite fallback tests
   - Day 2: Idempotency & XP tests
   - Day 3: UI loading tests

3. **實施 Phase 2 整合測試** (2 天)
   - Setup Firebase emulator
   - 端到端流程測試

4. **回歸測試與優化** (1 天)
   - 執行完整測試套件
   - 優化慢速測試
   - 生成覆蓋率報告

---

## 📚 參考資源

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Firebase Emulator](https://firebase.google.com/docs/emulator-suite)
- [Better SQLite3 Docs](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md)

---

**文檔版本**: 1.0
**最後更新**: 2025-10-28
**維護者**: Development Team
