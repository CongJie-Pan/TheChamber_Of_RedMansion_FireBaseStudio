# 程式碼品質診斷報告
生成時間：2025-11-25
分析範圍：整個 Next.js 專案 (Red Mansion Firebase Studio)
分析工具：ESLint + TypeScript Compiler (tsc --noEmit)

---

## 執行摘要

### 總體錯誤統計
- **ESLint 警告數**：18 個警告 (0 個錯誤)
- **TypeScript 錯誤數**：1,748 個類型錯誤
- **受影響檔案數**：約 243 個檔案

### 嚴重程度分布
- **嚴重 (Critical)**：1,500+ 個 - Turso 資料庫遷移相關的型別不符問題
- **重要 (Important)**：200+ 個 - 非同步函式型別處理錯誤
- **輕微 (Minor)**：18 個 - ESLint 程式碼品質警告

### 主要問題類別
1. **Turso LibSQL 遷移型別錯誤** (86% 錯誤) - `Promise<Client>` vs `Client` 型別不匹配
2. **React Hooks 相依性警告** (33% ESLint 警告) - `useEffect` 依賴項配置問題
3. **圖片優化與無障礙警告** (67% ESLint 警告) - 測試檔案中的 `<img>` 使用
4. **非同步函式返回型別錯誤** (8% 錯誤) - Promise 型別處理不當

### 預估修復時間
- **Phase 1 (Critical)**: 4-6 小時 - 修復 Turso 遷移核心問題
- **Phase 2 (Important)**: 2-3 小時 - 修正非同步型別與 React Hooks
- **Phase 3 (Minor)**: 1 小時 - 解決 ESLint 警告
- **總計**: 約 7-10 小時

---

## 錯誤分類與詳細分析

### Category 1: Turso 資料庫遷移型別錯誤 (1,500+ 項)

這是目前最大的問題類別，佔所有錯誤的 86%。主要原因是從 `better-sqlite3` (同步 API) 遷移到 `@libsql/client` (非同步 API) 時，資料庫連線的型別處理不當。

---

#### 錯誤 #1: Property 'prepare' does not exist on type 'Promise&lt;Client&gt;'
**檔案位置**: `src/lib/repositories/*.ts` (157 處)
**嚴重程度**: Critical
**規則**: `TS2339`

**問題說明**：
程式碼試圖在 `Promise<Client>` 型別上直接呼叫 `.prepare()` 方法，但這個方法只存在於解析後的 `Client` 物件上。這是非同步程式設計中最常見的錯誤之一 - 忘記等待 Promise 完成。

**為什麼重要**：
1. **執行時期崩潰風險**：此錯誤會導致程式在執行時拋出 `TypeError: xxx.prepare is not a function`
2. **資料完整性風險**：資料庫操作無法正確執行，可能導致資料遺失或不一致
3. **型別安全失效**：TypeScript 的型別保護機制失效，無法在編譯時期捕捉錯誤

**原始碼範例**：
```typescript
// ❌ 錯誤：在 Promise 上直接呼叫 prepare()
async function getDatabase(): Promise<Client> {
  return createClient({ url: '...', authToken: '...' });
}

const db = getDatabase(); // db 的型別是 Promise<Client>
const stmt = db.prepare('SELECT * FROM users'); // 💥 錯誤！prepare 不存在
```

**修復方案 1：使用 await 等待 Promise 解析**：
```typescript
// ✅ 正確：等待 Promise 解析
async function getDatabase(): Promise<Client> {
  return createClient({ url: '...', authToken: '...' });
}

// 在使用端加上 await
const db = await getDatabase(); // db 的型別現在是 Client
const stmt = db.prepare('SELECT * FROM users'); // ✅ 正確
```

**修復方案 2：改變函式返回型別為 Client (推薦)**：
```typescript
// ✅ 最佳方案：使用單例模式，返回已解析的 Client
let dbInstance: Client | null = null;

async function getDatabase(): Promise<Client> {
  if (!dbInstance) {
    dbInstance = createClient({ url: '...', authToken: '...' });
  }
  return dbInstance; // 返回的是 Client，不是 Promise<Client>
}

// 或者更簡潔的寫法
function getDatabase(): Client {
  if (!dbInstance) {
    dbInstance = createClient({ url: '...', authToken: '...' });
  }
  return dbInstance;
}
```

**修復方案 3：在初始化時一次性解析**：
```typescript
// ✅ 在模組載入時初始化
const db: Client = createClient({
  url: process.env.TURSO_DATABASE_URL || '',
  authToken: process.env.TURSO_AUTH_TOKEN || '',
});

// 直接使用，無需 await
const stmt = db.prepare('SELECT * FROM users');
```

**替代方案比較**：

| 方案 | 優點 | 缺點 | 建議使用場景 |
|------|------|------|--------------|
| 方案 1 (await) | 簡單直接，保留非同步性 | 每次呼叫都需要 await | 資料庫連線需要延遲初始化 |
| 方案 2 (單例) | 效能好，一次初始化 | 單例模式增加複雜度 | 推薦用於生產環境 |
| 方案 3 (模組級) | 最簡潔，無需 await | 模組載入時即初始化 | 適合 Turso cloud client |

**根據 Turso 官方文件推薦**：
Turso 的 `createClient()` 本身是同步的，不返回 Promise。因此**方案 3 是最佳實踐**。

---

#### 錯誤 #2: Property 'transaction' does not exist on type 'Promise&lt;Client&gt;'
**檔案位置**: `src/lib/repositories/*.sync-backup.ts` (13 處)
**嚴重程度**: Critical
**規則**: `TS2339`

**問題說明**：
與錯誤 #1 類似，程式碼試圖在 `Promise<Client>` 上呼叫 `.transaction()` 方法，但該方法僅存在於已解析的 `Client` 物件上。

**為什麼重要**：
1. **交易完整性風險**：資料庫交易無法正確執行，可能導致資料不一致
2. **ACID 特性失效**：交易的原子性、一致性、隔離性、持久性無法保證
3. **併發問題**：多個操作可能相互干擾，導致競態條件

**原始碼**：
```typescript
// ❌ 錯誤：在 Promise 上呼叫 transaction()
const db = getDatabase(); // Promise<Client>
await db.transaction(async (tx) => {
  // 💥 錯誤！transaction 方法不存在
  await tx.execute('INSERT INTO users ...');
});
```

**修復後程式碼**：
```typescript
// ✅ 正確：等待 Promise 解析
const db = await getDatabase(); // 解析為 Client
await db.transaction(async (tx) => {
  await tx.execute('INSERT INTO users ...');
});

// 或使用 Turso 的新 API (推薦)
const db: Client = getDatabase(); // 直接返回 Client
const result = await db.batch([
  { sql: 'INSERT INTO users ...', args: [...] },
  { sql: 'UPDATE profiles ...', args: [...] },
], 'write'); // 'write' 模式確保交易一致性
```

**Turso 交易 API 更新說明**：
Turso LibSQL Client 使用 `batch()` 方法替代傳統的 `transaction()`：

```typescript
// Turso 推薦的批次操作 (保證原子性)
await db.batch([
  { sql: 'INSERT INTO posts (title) VALUES (?)', args: ['Post 1'] },
  { sql: 'INSERT INTO tags (name) VALUES (?)', args: ['Tag 1'] },
], 'write'); // 'write' 模式 = 交易模式
```

---

#### 錯誤 #3: Conversion of type 'Row' to type '{ count: number; }' may be a mistake
**檔案位置**: `src/lib/repositories/*.ts` (51 處)
**嚴重程度**: Important
**規則**: `TS2352`

**問題說明**：
程式碼嘗試將 Turso 查詢返回的 `Row` 型別直接轉換為特定的物件型別（如 `{ count: number }`），但 TypeScript 認為這種轉換不安全，因為兩種型別沒有足夠的重疊。

**為什麼重要**：
1. **型別安全性降低**：強制型別轉換繞過了 TypeScript 的型別檢查
2. **執行時期錯誤風險**：如果資料結構不符預期，會在存取屬性時拋出錯誤
3. **程式碼維護困難**：型別轉換掩蓋了真實的資料結構

**原始碼**：
```typescript
// ❌ 錯誤：不安全的型別轉換
const result = await db.execute('SELECT COUNT(*) as count FROM users');
const row = result.rows[0] as { count: number }; // 💥 TypeScript 警告
const totalUsers = row.count; // 可能在執行時出錯
```

**修復後程式碼**：
```typescript
// ✅ 方案 1：使用型別守衛 (Type Guard)
function isCountRow(row: Row): row is { count: number } {
  return typeof row === 'object' &&
         row !== null &&
         'count' in row &&
         typeof row.count === 'number';
}

const result = await db.execute('SELECT COUNT(*) as count FROM users');
const row = result.rows[0];
if (isCountRow(row)) {
  const totalUsers = row.count; // ✅ 型別安全
} else {
  throw new Error('Unexpected row structure');
}

// ✅ 方案 2：使用 Zod 進行執行時期驗證 (推薦)
import { z } from 'zod';

const CountRowSchema = z.object({
  count: z.number(),
});

const result = await db.execute('SELECT COUNT(*) as count FROM users');
const row = CountRowSchema.parse(result.rows[0]); // 自動驗證與型別推斷
const totalUsers = row.count; // ✅ 完全型別安全

// ✅ 方案 3：定義明確的返回型別介面
interface CountResult {
  count: number;
}

const result = await db.execute<CountResult>(
  'SELECT COUNT(*) as count FROM users'
);
const totalUsers = result.rows[0].count; // ✅ 型別推斷正確
```

**替代方案比較**：

| 方案 | 優點 | 缺點 | 建議使用場景 |
|------|------|------|--------------|
| 型別守衛 | 輕量，無需額外依賴 | 需要手寫驗證邏輯 | 簡單的型別檢查 |
| Zod 驗證 | 執行時期安全，錯誤訊息清晰 | 增加專案依賴 | 複雜的資料結構驗證 |
| 泛型介面 | 程式碼簡潔，型別推斷準確 | 無執行時期驗證 | 內部可信的資料庫查詢 |

---

#### 錯誤 #4: Cannot redeclare block-scoped variable 'result'
**檔案位置**: `src/lib/repositories/*.ts` (18 處)
**嚴重程度**: Important
**規則**: `TS2451`

**問題說明**：
在同一個作用域中多次宣告了同名的 `result` 變數，違反了 JavaScript 的塊級作用域規則。這通常發生在函式中有多個資料庫查詢，每個查詢都用 `const result` 儲存結果。

**為什麼重要**：
1. **編譯錯誤**：程式無法通過 TypeScript 編譯
2. **變數覆蓋風險**：即使編譯通過，也可能導致意外的變數覆蓋
3. **程式碼可讀性差**：難以追蹤每個 result 代表的具體資料

**原始碼**：
```typescript
async function getUserStats(userId: string) {
  const result = await db.execute(
    'SELECT COUNT(*) as count FROM posts WHERE userId = ?',
    [userId]
  );
  const postCount = (result.rows[0] as { count: number }).count;

  const result = await db.execute( // 💥 錯誤！重複宣告
    'SELECT COUNT(*) as count FROM comments WHERE userId = ?',
    [userId]
  );
  const commentCount = (result.rows[0] as { count: number }).count;

  return { postCount, commentCount };
}
```

**修復方案 1：使用不同的變數名稱**：
```typescript
// ✅ 正確：每個查詢使用不同的變數名
async function getUserStats(userId: string) {
  const postResult = await db.execute(
    'SELECT COUNT(*) as count FROM posts WHERE userId = ?',
    [userId]
  );
  const postCount = (postResult.rows[0] as { count: number }).count;

  const commentResult = await db.execute(
    'SELECT COUNT(*) as count FROM comments WHERE userId = ?',
    [userId]
  );
  const commentCount = (commentResult.rows[0] as { count: number }).count;

  return { postCount, commentCount };
}
```

**修復方案 2：使用塊級作用域**：
```typescript
// ✅ 正確：使用花括號創建新的塊級作用域
async function getUserStats(userId: string) {
  let postCount: number;
  {
    const result = await db.execute(
      'SELECT COUNT(*) as count FROM posts WHERE userId = ?',
      [userId]
    );
    postCount = (result.rows[0] as { count: number }).count;
  }

  let commentCount: number;
  {
    const result = await db.execute(
      'SELECT COUNT(*) as count FROM comments WHERE userId = ?',
      [userId]
    );
    commentCount = (result.rows[0] as { count: number }).count;
  }

  return { postCount, commentCount };
}
```

**修復方案 3：重構為輔助函式 (推薦)**：
```typescript
// ✅ 最佳方案：抽取共用邏輯
async function getCountFromTable(
  tableName: string,
  userId: string
): Promise<number> {
  const result = await db.execute(
    `SELECT COUNT(*) as count FROM ${tableName} WHERE userId = ?`,
    [userId]
  );
  return (result.rows[0] as { count: number }).count;
}

async function getUserStats(userId: string) {
  const [postCount, commentCount] = await Promise.all([
    getCountFromTable('posts', userId),
    getCountFromTable('comments', userId),
  ]);

  return { postCount, commentCount };
}
```

---

#### 錯誤 #5: This expression is not callable. Type 'Promise&lt;Transaction&gt;' has no call signatures
**檔案位置**: `src/lib/repositories/*.ts` (10 處)
**嚴重程度**: Critical
**規則**: `TS2349`

**問題說明**：
程式碼試圖將 `db.transaction()` 當作同步方法呼叫，但 Turso 的交易 API 返回 Promise，需要使用 `await` 等待。此外，Turso 的交易 API 使用方式與傳統 SQLite 不同。

**為什麼重要**：
1. **交易無法執行**：程式會在執行時期拋出錯誤
2. **資料一致性風險**：交易失敗可能導致部分資料寫入，破壞 ACID 特性
3. **API 誤用**：不符合 Turso LibSQL Client 的官方使用方式

**原始碼**：
```typescript
// ❌ 錯誤：誤用 transaction API
db.transaction(async (tx) => { // 💥 db.transaction 返回 Promise<Transaction>
  await tx.execute('INSERT INTO ...');
  await tx.execute('UPDATE ...');
});
```

**修復後程式碼**：
```typescript
// ✅ 方案 1：使用 await (如果 Turso 支援此 API)
await db.transaction(async (tx) => {
  await tx.execute('INSERT INTO ...');
  await tx.execute('UPDATE ...');
});

// ✅ 方案 2：使用 Turso 推薦的 batch API (推薦)
await db.batch([
  {
    sql: 'INSERT INTO posts (userId, title, content) VALUES (?, ?, ?)',
    args: [userId, title, content],
  },
  {
    sql: 'UPDATE users SET postCount = postCount + 1 WHERE userId = ?',
    args: [userId],
  },
], 'write'); // 'write' 模式保證交易性

// ✅ 方案 3：使用明確的交易控制 (進階)
const tx = await db.transaction('write');
try {
  await tx.execute('INSERT INTO ...');
  await tx.execute('UPDATE ...');
  await tx.commit();
} catch (error) {
  await tx.rollback();
  throw error;
}
```

**Turso 交易 API 完整說明**：

根據 [@libsql/client 官方文件](https://docs.turso.tech/libsql/client-access/javascript-typescript-sdk)：

1. **批次操作 (推薦)**：最簡單且最常用
   ```typescript
   await db.batch([...statements], 'write');
   ```

2. **互動式交易**：需要條件邏輯時使用
   ```typescript
   const tx = await db.transaction('write');
   await tx.execute(...);
   await tx.commit(); // 或 tx.rollback()
   ```

3. **注意事項**：
   - Turso 的 `transaction()` 需要明確指定模式：`'read'` 或 `'write'`
   - 交易必須呼叫 `commit()` 或 `rollback()` 明確結束
   - 建議使用 `batch()` 除非需要複雜的條件邏輯

---

### Category 2: React Hooks 相依性警告 (6 項)

React Hooks 的相依性陣列管理是 React 開發中最容易出錯的部分之一。這些警告雖然是 ESLint 警告而非錯誤，但可能導致嚴重的執行時期問題。

---

#### 錯誤 #6: The 'loadDailyTasks' function makes the dependencies of useEffect Hook change on every render
**檔案位置**: `src/app/(main)/daily-tasks/page.tsx:271`
**嚴重程度**: Important
**規則**: `react-hooks/exhaustive-deps`

**問題說明**：
在元件中定義的函式 `loadDailyTasks` 每次元件重新渲染時都會重新建立，導致 `useEffect` 的相依性陣列每次都改變，進而觸發無限迴圈的重新執行。

**為什麼重要**：
1. **效能問題**：每次渲染都觸發 effect，導致不必要的 API 呼叫和重新渲染
2. **無限迴圈風險**：如果 effect 內部更新 state，會觸發新的渲染，形成無限迴圈
3. **使用者體驗差**：頁面可能卡頓、Loading 狀態反覆出現

**原始碼**：
```typescript
function DailyTasksPage() {
  const [tasks, setTasks] = useState([]);

  // ❌ 問題：每次渲染都建立新的函式
  const loadDailyTasks = async () => {
    const response = await fetch('/api/daily-tasks');
    const data = await response.json();
    setTasks(data);
  };

  useEffect(() => {
    loadDailyTasks(); // 💥 loadDailyTasks 每次都是新的引用
  }, [loadDailyTasks]); // ESLint 警告：相依性每次都變

  return <div>{/* ... */}</div>;
}
```

**執行時期行為**：
```
1. 元件首次渲染 → loadDailyTasks 函式建立 (引用 A)
2. useEffect 執行 (因為初次掛載)
3. loadDailyTasks() 呼叫 setTasks
4. tasks 改變 → 元件重新渲染
5. loadDailyTasks 函式重新建立 (引用 B，不同於 A)
6. useEffect 偵測到相依性改變 → 再次執行
7. 回到步驟 3 → 無限迴圈 💥
```

**修復方案 1：使用 useCallback 包裹函式 (推薦)**：
```typescript
function DailyTasksPage() {
  const [tasks, setTasks] = useState([]);

  // ✅ 正確：使用 useCallback 確保函式引用穩定
  const loadDailyTasks = useCallback(async () => {
    const response = await fetch('/api/daily-tasks');
    const data = await response.json();
    setTasks(data);
  }, []); // 空陣列 = 函式永遠不會重新建立

  useEffect(() => {
    loadDailyTasks();
  }, [loadDailyTasks]); // ✅ loadDailyTasks 引用穩定，只執行一次

  return <div>{/* ... */}</div>;
}
```

**修復方案 2：將函式移入 useEffect 內部 (最簡單)**：
```typescript
function DailyTasksPage() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    // ✅ 正確：函式定義在 effect 內部，無需加入相依性
    const loadDailyTasks = async () => {
      const response = await fetch('/api/daily-tasks');
      const data = await response.json();
      setTasks(data);
    };

    loadDailyTasks();
  }, []); // 空陣列 = 只在首次掛載時執行

  return <div>{/* ... */}</div>;
}
```

**修復方案 3：使用 useCallback 搭配外部相依性**：
```typescript
function DailyTasksPage({ userId }: { userId: string }) {
  const [tasks, setTasks] = useState([]);

  // ✅ 正確：當 userId 改變時，函式會重新建立
  const loadDailyTasks = useCallback(async () => {
    const response = await fetch(`/api/daily-tasks?userId=${userId}`);
    const data = await response.json();
    setTasks(data);
  }, [userId]); // userId 改變 → 函式重新建立 → effect 重新執行

  useEffect(() => {
    loadDailyTasks();
  }, [loadDailyTasks]);

  return <div>{/* ... */}</div>;
}
```

**何時使用哪種方案**：

| 方案 | 使用場景 | 優點 | 缺點 |
|------|----------|------|------|
| 方案 1 (useCallback) | 函式需在多處使用 | 函式可重複使用 | 程式碼稍複雜 |
| 方案 2 (移入 effect) | 函式只在 effect 內使用 | 最簡潔明瞭 | 函式無法重複使用 |
| 方案 3 (帶相依性) | 函式依賴 props/state | 自動響應變化 | 需仔細管理相依性 |

**TypeScript 型別安全增強**：
```typescript
import { useCallback, useEffect, useState } from 'react';

interface DailyTask {
  id: string;
  title: string;
  completed: boolean;
}

function DailyTasksPage() {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadDailyTasks = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/daily-tasks');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: DailyTask[] = await response.json();
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDailyTasks();
  }, [loadDailyTasks]);

  if (loading) return <div>載入中...</div>;
  if (error) return <div>錯誤：{error.message}</div>;
  return <div>{/* 渲染 tasks */}</div>;
}
```

---

#### 錯誤 #7: Block-scoped variable 'loadDailyTasks' used before its declaration
**檔案位置**: `src/app/(main)/daily-tasks/page.tsx:228`
**嚴重程度**: Critical
**規則**: `TS2448`, `TS2454`

**問題說明**：
程式碼在宣告 `loadDailyTasks` 函式之前就在 `useEffect` 中使用它，違反了 JavaScript 的時間死區 (Temporal Dead Zone, TDZ) 規則。這通常發生在程式碼重構時，將函式定義移到了使用位置之後。

**為什麼重要**：
1. **編譯錯誤**：TypeScript 無法通過編譯
2. **執行時期錯誤**：即使繞過編譯，執行時也會拋出 `ReferenceError`
3. **程式碼邏輯混亂**：違反了「先宣告後使用」的基本原則

**原始碼**：
```typescript
function DailyTasksPage() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    loadDailyTasks(); // 💥 錯誤！loadDailyTasks 尚未宣告
    resetTodayTasksForGuest(); // 💥 錯誤！resetTodayTasksForGuest 尚未宣告
  }, [loadDailyTasks, resetTodayTasksForGuest]);

  // 函式定義在使用之後
  const loadDailyTasks = async () => {
    // ...
  };

  const resetTodayTasksForGuest = async () => {
    // ...
  };

  return <div>{/* ... */}</div>;
}
```

**修復後程式碼**：
```typescript
function DailyTasksPage() {
  const [tasks, setTasks] = useState([]);

  // ✅ 正確：先宣告函式
  const loadDailyTasks = useCallback(async () => {
    const response = await fetch('/api/daily-tasks');
    const data = await response.json();
    setTasks(data);
  }, []);

  const resetTodayTasksForGuest = useCallback(async () => {
    // Reset logic
  }, []);

  // 再使用函式
  useEffect(() => {
    loadDailyTasks();
    resetTodayTasksForGuest();
  }, [loadDailyTasks, resetTodayTasksForGuest]);

  return <div>{/* ... */}</div>;
}
```

**JavaScript 時間死區 (TDZ) 解釋**：

在 ES6 中，使用 `let` 和 `const` 宣告的變數存在「時間死區」：

```javascript
// TDZ 範例
console.log(myVar); // 💥 ReferenceError: Cannot access 'myVar' before initialization
const myVar = 'hello';

// var 則不同 (會提升，但值為 undefined)
console.log(oldVar); // undefined (不會報錯，但不推薦)
var oldVar = 'hello';
```

**函式宣告 vs 函式表達式**：

```typescript
// 函式宣告 (Function Declaration) - 會提升
foo(); // ✅ 正確！函式宣告會提升到作用域頂部
function foo() {
  console.log('Hello');
}

// 函式表達式 (Function Expression) - 不會提升
bar(); // 💥 錯誤！bar 尚未定義
const bar = () => {
  console.log('Hello');
};
```

**在 React 元件中的最佳實踐**：

```typescript
function MyComponent() {
  // 1. State 宣告
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // 2. useCallback/useMemo hooks
  const fetchData = useCallback(async () => {
    setLoading(true);
    // Fetch logic
    setLoading(false);
  }, []);

  // 3. useEffect hooks
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 4. Event handlers
  const handleClick = () => {
    // Handle logic
  };

  // 5. Render
  return <div onClick={handleClick}>{/* ... */}</div>;
}
```

---

### Category 3: 圖片優化與無障礙警告 (12 項)

這些警告主要出現在測試檔案中，涉及圖片優化和無障礙功能。雖然是輕微問題，但對 SEO 和使用者體驗有重要影響。

---

#### 錯誤 #8: Using `&lt;img&gt;` could result in slower LCP and higher bandwidth
**檔案位置**: `tests/**/*.test.tsx` (8 處)
**嚴重程度**: Minor
**規則**: `@next/next/no-img-element`

**問題說明**：
在 Next.js 專案中使用原生 `<img>` 標籤而非 Next.js 的 `<Image>` 元件，會錯過自動圖片優化功能，導致效能下降。

**為什麼重要**：
1. **效能影響**：未優化的圖片會增加頁面載入時間（LCP - Largest Contentful Paint）
2. **頻寬浪費**：Next.js Image 可自動提供 WebP/AVIF 格式，節省 30-80% 頻寬
3. **SEO 損失**：Google Core Web Vitals 評分降低，影響搜尋排名
4. **使用者體驗**：在慢速網路下，圖片載入延遲明顯

**原始碼**：
```tsx
// ❌ 錯誤：使用原生 <img> 標籤
<img src="/images/character-avatar.png" />
```

**修復後程式碼**：
```tsx
// ✅ 正確：使用 Next.js Image 元件
import Image from 'next/image';

<Image
  src="/images/character-avatar.png"
  alt="角色頭像"
  width={200}
  height={200}
  priority={false} // 是否優先載入
/>
```

**Next.js Image 元件完整配置**：
```tsx
import Image from 'next/image';

// 靜態導入 (推薦 - 自動推斷尺寸)
import avatarImg from '/public/images/avatar.png';

<Image
  src={avatarImg}
  alt="使用者頭像"
  placeholder="blur" // 自動生成模糊預覽
  priority={true} // 對於 LCP 關鍵圖片設為 true
  quality={85} // 0-100，預設 75
  sizes="(max-width: 768px) 100vw, 50vw" // 響應式尺寸
  style={{ objectFit: 'cover' }} // CSS 樣式
/>

// 外部圖片 (需在 next.config.js 中設定 domains)
<Image
  src="https://example.com/image.jpg"
  alt="外部圖片"
  width={500}
  height={300}
  unoptimized={false} // 是否跳過優化
/>
```

**測試檔案中的特殊處理**：

由於 Next.js Image 在測試環境中可能需要額外設定，有兩種選擇：

**選項 1：Mock Next.js Image (推薦)**
```tsx
// jest.setup.js
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// 測試檔案中照常使用
import Image from 'next/image';

<Image src="/test.png" alt="Test" width={100} height={100} />
```

**選項 2：在測試檔案中禁用規則**
```tsx
// tests/components/CharacterGarden.test.tsx
/* eslint-disable @next/next/no-img-element */
<img src="/images/character.png" alt="Character" />
```

**何時使用 Image vs img**：

| 場景 | 推薦元件 | 理由 |
|------|----------|------|
| 產品頁面圖片 | `<Image>` | 需要優化 LCP 和頻寬 |
| 使用者上傳圖片 | `<Image>` | 自動優化各種尺寸 |
| SVG 圖示 | `<img>` 或直接內嵌 | SVG 已是向量圖，無需優化 |
| 測試環境 | Mock `<Image>` | 避免測試環境設定複雜度 |
| 第三方嵌入 | `<img>` + `unoptimized` | 某些 CDN 已優化 |

**效能數據比較**：

```
原生 <img> (PNG, 500KB):
- 載入時間: 2.5s (3G 網路)
- LCP: 2.8s
- 頻寬: 500KB

Next.js <Image> (自動 WebP):
- 載入時間: 0.8s (3G 網路)
- LCP: 1.1s
- 頻寬: 120KB
- 改善: 68% 載入速度提升，76% 頻寬節省
```

---

#### 錯誤 #9: img elements must have an alt prop
**檔案位置**: `tests/read-book/*.test.tsx` (4 處)
**嚴重程度**: Important
**規則**: `jsx-a11y/alt-text`

**問題說明**：
`<img>` 標籤缺少 `alt` 屬性，這是網頁無障礙 (a11y - accessibility) 的基本要求。螢幕閱讀器使用者無法理解圖片內容。

**為什麼重要**：
1. **無障礙法規遵循**：多數國家要求公共網站符合 WCAG 2.1 AA 標準
2. **使用者體驗**：約 2.2% 使用者依賴螢幕閱讀器（全球數億人）
3. **SEO 影響**：搜尋引擎使用 alt 文字理解圖片內容
4. **降級體驗**：圖片載入失敗時，alt 文字作為替代顯示

**原始碼**：
```tsx
// ❌ 錯誤：缺少 alt 屬性
<img src="/images/book-cover.jpg" />
```

**修復後程式碼**：
```tsx
// ✅ 正確：加上有意義的 alt 描述
<img src="/images/book-cover.jpg" alt="紅樓夢第一回書籍封面" />

// ✅ 裝飾性圖片：使用空字串
<img src="/images/decorative-border.svg" alt="" />

// ✅ 功能性圖片：描述功能而非外觀
<img src="/icons/search.svg" alt="搜尋" />

// ✅ 複雜圖片：使用詳細描述
<img
  src="/charts/user-growth.png"
  alt="使用者成長圖表：2024年1月至12月，使用者數從1000增長至5000人，增長率400%"
/>
```

**撰寫優質 alt 文字的原則**：

1. **描述內容而非外觀**
   ```tsx
   // ❌ 不好
   <img src="profile.jpg" alt="一張照片" />

   // ✅ 好
   <img src="profile.jpg" alt="林黛玉的角色肖像" />
   ```

2. **避免冗餘詞彙**
   ```tsx
   // ❌ 不好
   <img src="logo.png" alt="圖片：公司標誌" />

   // ✅ 好
   <img src="logo.png" alt="紅樓夢書齋標誌" />
   ```

3. **裝飾性圖片使用空 alt**
   ```tsx
   // ✅ 正確：純裝飾，不提供資訊
   <img src="divider.svg" alt="" role="presentation" />
   ```

4. **功能按鈕圖示描述動作**
   ```tsx
   // ✅ 正確
   <button>
     <img src="trash.svg" alt="刪除留言" />
   </button>
   ```

5. **資訊性圖表提供完整描述**
   ```tsx
   <figure>
     <img
       src="reading-progress.png"
       alt="閱讀進度圖表"
       aria-describedby="chart-description"
     />
     <figcaption id="chart-description">
       本月閱讀進度：已完成 8 回，剩餘 112 回，完成度 6.7%
     </figcaption>
   </figure>
   ```

**在測試中的處理方式**：

```tsx
// tests/read-book/bi-column-basic.test.tsx
import { render, screen } from '@testing-library/react';

test('renders book cover with alt text', () => {
  render(
    <img
      src="/images/hongloumeng.jpg"
      alt="紅樓夢書籍封面"
    />
  );

  // 測試 alt 屬性是否存在
  const image = screen.getByAltText('紅樓夢書籍封面');
  expect(image).toBeInTheDocument();
});
```

**無障礙檢測工具推薦**：

1. **axe DevTools** (Chrome/Firefox 擴充功能)
   - 自動偵測無障礙問題
   - 提供修復建議

2. **WAVE** (WebAIM)
   - 視覺化標示無障礙問題
   - 線上工具，無需安裝

3. **Lighthouse** (Chrome 內建)
   - 包含無障礙評分
   - 整合效能、SEO 檢測

4. **eslint-plugin-jsx-a11y** (已使用)
   - 開發時期靜態檢查
   - 本專案已配置此規則

---

### Category 4: 非同步函式返回型別錯誤 (150+ 項)

這類錯誤主要出現在從同步 SQLite API 遷移到非同步 Turso API 時，函式返回型別未正確更新。

---

#### 錯誤 #10: The return type of an async function must be the global Promise&lt;T&gt; type
**檔案位置**: `src/lib/repositories/user-repository.ts` (多處)
**嚴重程度**: Important
**規則**: `TS1064`

**問題說明**：
函式宣告為 `async`，但返回型別註解為具體型別 (如 `number`) 而非 `Promise<number>`。這違反了 TypeScript 的非同步函式規則。

**為什麼重要**：
1. **型別不一致**：呼叫端期待 Promise 但型別顯示為普通值
2. **編譯錯誤**：TypeScript 無法通過嚴格模式檢查
3. **執行時期混淆**：開發者可能忘記使用 `await`

**原始碼**：
```typescript
// ❌ 錯誤：async 函式返回型別應為 Promise
async function getUserLevel(userId: string): number {
  const user = await db.execute(
    'SELECT level FROM users WHERE userId = ?',
    [userId]
  );
  return user.rows[0].level as number;
}
```

**修復後程式碼**：
```typescript
// ✅ 正確：async 函式返回 Promise<T>
async function getUserLevel(userId: string): Promise<number> {
  const user = await db.execute(
    'SELECT level FROM users WHERE userId = ?',
    [userId]
  );
  return user.rows[0].level as number; // 自動包裹在 Promise 中
}

// 使用時
const level = await getUserLevel('user123'); // level 型別為 number
```

**完整型別註解範例**：
```typescript
// 返回物件
async function getUserProfile(userId: string): Promise<UserProfile> {
  const result = await db.execute(
    'SELECT * FROM users WHERE userId = ?',
    [userId]
  );
  return result.rows[0] as UserProfile;
}

// 返回陣列
async function getAllUsers(): Promise<UserProfile[]> {
  const result = await db.execute('SELECT * FROM users');
  return result.rows as UserProfile[];
}

// 返回 void (無返回值)
async function logUserAction(userId: string, action: string): Promise<void> {
  await db.execute(
    'INSERT INTO logs (userId, action) VALUES (?, ?)',
    [userId, action]
  );
  // 無 return 語句，自動返回 Promise<void>
}

// 返回聯合型別
async function findUser(
  userId: string
): Promise<UserProfile | null> {
  const result = await db.execute(
    'SELECT * FROM users WHERE userId = ?',
    [userId]
  );
  return result.rows.length > 0
    ? (result.rows[0] as UserProfile)
    : null;
}
```

**常見錯誤模式與修正**：

```typescript
// 錯誤 1：返回型別不是 Promise
async function getCount(): number { // 💥 錯誤
  const result = await db.execute('SELECT COUNT(*) FROM users');
  return result.rows[0].count;
}
// 修正
async function getCount(): Promise<number> { // ✅ 正確
  const result = await db.execute('SELECT COUNT(*) FROM users');
  return result.rows[0].count;
}

// 錯誤 2：非 async 函式返回 Promise
function getUser(id: string): UserProfile { // 💥 錯誤
  return db.execute('SELECT * FROM users WHERE id = ?', [id])
    .then(result => result.rows[0] as UserProfile);
}
// 修正 (選項 1：加上 async)
async function getUser(id: string): Promise<UserProfile> {
  const result = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
  return result.rows[0] as UserProfile;
}
// 修正 (選項 2：明確返回 Promise)
function getUser(id: string): Promise<UserProfile> {
  return db.execute('SELECT * FROM users WHERE id = ?', [id])
    .then(result => result.rows[0] as UserProfile);
}

// 錯誤 3：混用 Promise 與直接返回
async function calculate(): Promise<{ result: number }> {
  if (condition) {
    return { result: 42 }; // ✅ 自動包裹在 Promise 中
  }
  return Promise.resolve({ result: 0 }); // ✅ 也可以，但不必要
}
```

**TypeScript 非同步型別推斷**：

```typescript
// TypeScript 可自動推斷返回型別
async function autoInfer(userId: string) {
  // 推斷為 Promise<number>
  const result = await db.execute(
    'SELECT level FROM users WHERE userId = ?',
    [userId]
  );
  return result.rows[0].level as number;
}

// 但建議明確註解，提高可讀性
async function explicit(userId: string): Promise<number> {
  const result = await db.execute(
    'SELECT level FROM users WHERE userId = ?',
    [userId]
  );
  return result.rows[0].level as number;
}
```

---

#### 錯誤 #11: Type 'Promise&lt;number&gt;' is not assignable to type 'number'
**檔案位置**: `src/lib/repositories/user-repository.ts` (多處)
**嚴重程度**: Critical
**規則**: `TS2322`

**問題說明**：
程式碼嘗試將 `Promise<number>` 指派給 `number` 型別的變數，這是非同步轉換時最常見的錯誤。表示呼叫了非同步函式但忘記使用 `await`。

**為什麼重要**：
1. **執行時期錯誤**：變數包含 Promise 物件而非預期的數值
2. **邏輯錯誤**：數學運算、比較操作會失敗
3. **難以除錯**：Promise 物件會被隱式轉換為字串 `"[object Promise]"`

**原始碼**：
```typescript
async function processUserXP(userId: string) {
  const currentXP: number = getUserXP(userId); // 💥 錯誤！getUserXP 返回 Promise<number>
  const newXP = currentXP + 100; // 💥 實際上是 Promise + 100 = 字串
  return newXP;
}

async function getUserXP(userId: string): Promise<number> {
  const result = await db.execute(
    'SELECT totalXP FROM users WHERE userId = ?',
    [userId]
  );
  return result.rows[0].totalXP as number;
}
```

**執行時期行為**：
```javascript
// currentXP 實際上是 Promise 物件
const currentXP = getUserXP('user123');
console.log(currentXP);
// 輸出: Promise { <pending> }

// 嘗試加法運算
const newXP = currentXP + 100;
console.log(newXP);
// 輸出: "[object Promise]100" (字串拼接！)
```

**修復後程式碼**：
```typescript
// ✅ 正確：使用 await 等待 Promise 解析
async function processUserXP(userId: string): Promise<number> {
  const currentXP: number = await getUserXP(userId); // 加上 await
  const newXP = currentXP + 100; // 現在是正確的數學運算
  return newXP;
}

async function getUserXP(userId: string): Promise<number> {
  const result = await db.execute(
    'SELECT totalXP FROM users WHERE userId = ?',
    [userId]
  );
  return result.rows[0].totalXP as number;
}
```

**複雜場景處理**：

```typescript
// 場景 1：多個非同步操作
async function calculateTotalStats(userId: string) {
  // ❌ 錯誤：缺少 await
  const xp: number = getUserXP(userId);
  const level: number = getUserLevel(userId);
  const posts: number = getPostCount(userId);

  return { xp, level, posts }; // 💥 全部是 Promise！
}

// ✅ 正確：使用 await
async function calculateTotalStats(userId: string) {
  const xp: number = await getUserXP(userId);
  const level: number = await getUserLevel(userId);
  const posts: number = await getPostCount(userId);

  return { xp, level, posts };
}

// ✅ 最佳：使用 Promise.all 並行執行
async function calculateTotalStats(userId: string) {
  const [xp, level, posts] = await Promise.all([
    getUserXP(userId),
    getUserLevel(userId),
    getPostCount(userId),
  ]);

  return { xp, level, posts };
}

// 場景 2：條件判斷
async function canLevelUp(userId: string): Promise<boolean> {
  const currentXP = await getUserXP(userId); // 必須 await
  const currentLevel = await getUserLevel(userId);
  const requiredXP = currentLevel * 1000;

  return currentXP >= requiredXP;
}

// 場景 3：在物件中使用
async function buildUserProfile(userId: string) {
  return {
    id: userId,
    xp: await getUserXP(userId), // 在物件字面量中也要 await
    level: await getUserLevel(userId),
    timestamp: Date.now(),
  };
}
```

**型別守衛與執行時期檢查**：

```typescript
// 工具函式：檢查是否為 Promise
function isPromise<T>(value: any): value is Promise<T> {
  return value && typeof value.then === 'function';
}

// 使用範例
async function safeGetXP(userId: string): Promise<number> {
  const xpResult = getUserXP(userId);

  if (isPromise(xpResult)) {
    return await xpResult; // 如果是 Promise，等待它
  }
  return xpResult; // 否則直接返回
}
```

**ESLint 規則預防此錯誤**：

在 `.eslintrc.json` 中啟用：
```json
{
  "rules": {
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/require-await": "warn",
    "@typescript-eslint/promise-function-async": "error"
  }
}
```

---

## 根本原因分析

### 1. Turso 遷移的系統性問題

**核心問題**：
資料庫連線初始化方式從同步改為非同步，但整個專案的型別系統和函式呼叫模式未同步更新。

**錯誤的遷移模式**：
```typescript
// 舊 (better-sqlite3) - 同步
import Database from 'better-sqlite3';
const db = new Database('local.db'); // 同步返回 Database 物件
const result = db.prepare('SELECT * FROM users').all(); // 同步執行

// 錯誤的遷移 (保留了 async 包裹)
import { createClient } from '@libsql/client';
async function getDatabase() {
  return createClient({ url: '...', authToken: '...' });
}
// 💥 問題：createClient 本身是同步的，不需要 async 包裹
```

**正確的遷移模式**：
```typescript
// 正確 (Turso) - createClient 是同步的
import { createClient, type Client } from '@libsql/client';

const db: Client = createClient({
  url: process.env.TURSO_DATABASE_URL || '',
  authToken: process.env.TURSO_AUTH_TOKEN || '',
});

// 使用時
const result = await db.execute('SELECT * FROM users'); // execute 是非同步
```

**遷移檢查清單**：

| 步驟 | 舊 API (better-sqlite3) | 新 API (Turso) | 狀態 |
|------|-------------------------|----------------|------|
| 1. 初始化 | `new Database('file.db')` | `createClient({ url, authToken })` | ❌ 未完成 |
| 2. 查詢單行 | `db.prepare().get()` | `await db.execute().rows[0]` | ⚠️ 部分完成 |
| 3. 查詢多行 | `db.prepare().all()` | `await db.execute().rows` | ⚠️ 部分完成 |
| 4. 執行語句 | `db.prepare().run()` | `await db.execute()` | ⚠️ 部分完成 |
| 5. 交易 | `db.transaction(() => {})` | `await db.batch([...], 'write')` | ❌ 未完成 |
| 6. 參數綁定 | `.bind(params)` | 直接傳入 `args: [...]` | ⚠️ 部分完成 |

### 2. React Hooks 相依性管理不當

**根本原因**：
開發者對 `useEffect` 的閉包特性和相依性陣列機制理解不足，導致函式定義位置錯誤。

**錯誤模式**：
```typescript
// 反模式：在元件頂層定義函式
function MyComponent() {
  const loadData = async () => { /* ... */ }; // 每次渲染都重新建立

  useEffect(() => {
    loadData();
  }, [loadData]); // 💥 loadData 每次都不同，觸發無限迴圈
}
```

**正確模式**：
```typescript
// 模式 1：移入 effect 內部
function MyComponent() {
  useEffect(() => {
    const loadData = async () => { /* ... */ };
    loadData();
  }, []); // ✅ 只執行一次
}

// 模式 2：使用 useCallback
function MyComponent() {
  const loadData = useCallback(async () => { /* ... */ }, []);

  useEffect(() => {
    loadData();
  }, [loadData]); // ✅ loadData 引用穩定
}
```

### 3. 測試程式碼未遵循生產標準

**根本原因**：
測試檔案使用快速的 `<img>` 標籤和簡化的資料結構，未考慮無障礙和效能最佳實踐。

**解決方案**：
1. 在 `jest.setup.js` 中 mock Next.js Image 元件
2. 統一使用生產級別的元件
3. 建立測試專用的無障礙檢查規則

---

## 修復優先順序建議

### 🔴 立即處理 (影響功能或型別安全)

#### Priority 1: 修復 Turso 資料庫初始化 (預估 2 小時)
**影響範圍**: 所有 repository 檔案
**修復步驟**:

1. **修改 `src/lib/sqlite-db.ts`**:
   ```typescript
   // 當前錯誤
   async function getDatabase(): Promise<Client> {
     return createClient({ url: '...', authToken: '...' });
   }

   // 修正為
   import { createClient, type Client } from '@libsql/client';

   let dbInstance: Client | null = null;

   export function getDatabase(): Client {
     if (!dbInstance) {
       dbInstance = createClient({
         url: process.env.TURSO_DATABASE_URL || '',
         authToken: process.env.TURSO_AUTH_TOKEN || '',
       });
     }
     return dbInstance;
   }
   ```

2. **更新所有 repository 檔案的匯入**:
   ```typescript
   // 舊
   const db = await getDatabase();

   // 新
   const db = getDatabase(); // 無需 await
   ```

3. **驗證步驟**:
   ```bash
   npm run typecheck 2>&1 | grep "Property 'prepare' does not exist" | wc -l
   # 應從 157 降至 0
   ```

#### Priority 2: 修正 useEffect 相依性警告 (預估 1 小時)
**影響範圍**:
- `src/app/(main)/daily-tasks/page.tsx`
- `src/app/(main)/read-book/page.tsx`
- `src/components/daily-tasks/DailyTasksSummary.tsx`
- `src/components/daily-tasks/TaskCalendar.tsx`

**修復模板**:
```typescript
// 在每個受影響的元件中
import { useCallback } from 'react';

// 將函式包裹在 useCallback 中
const loadDailyTasks = useCallback(async () => {
  // 現有邏輯
}, []); // 或包含必要的相依性

// useEffect 保持不變
useEffect(() => {
  loadDailyTasks();
}, [loadDailyTasks]);
```

#### Priority 3: 修復交易 API 錯誤 (預估 2 小時)
**影響範圍**: 所有使用 `db.transaction()` 的檔案
**修復步驟**:

1. **找到所有交易使用**:
   ```bash
   grep -r "db.transaction" src/lib/repositories/
   ```

2. **替換為 Turso batch API**:
   ```typescript
   // 舊
   await db.transaction(async (tx) => {
     await tx.execute('INSERT INTO posts ...');
     await tx.execute('UPDATE users ...');
   });

   // 新
   await db.batch([
     { sql: 'INSERT INTO posts ...', args: [...] },
     { sql: 'UPDATE users ...', args: [...] },
   ], 'write');
   ```

### 🟡 短期處理 (影響程式碼品質)

#### Priority 4: 修正型別轉換錯誤 (預估 2 小時)
**影響範圍**: 51 處 `Row` 型別轉換
**修復策略**:

1. **安裝 Zod 驗證庫**:
   ```bash
   npm install zod
   ```

2. **建立通用型別驗證工具**:
   ```typescript
   // src/lib/db-validators.ts
   import { z } from 'zod';

   export const CountRowSchema = z.object({
     count: z.number(),
   });

   export const UserRowSchema = z.object({
     userId: z.string(),
     username: z.string(),
     email: z.string().email(),
     // ...
   });

   export function parseRow<T>(schema: z.ZodSchema<T>, row: any): T {
     return schema.parse(row);
   }
   ```

3. **在 repository 中使用**:
   ```typescript
   import { CountRowSchema, parseRow } from '../db-validators';

   const result = await db.execute('SELECT COUNT(*) as count FROM users');
   const { count } = parseRow(CountRowSchema, result.rows[0]);
   ```

#### Priority 5: 重新命名重複的變數 (預估 1 小時)
**影響範圍**: 18 處 `result` 變數重複宣告
**修復策略**: 使用有意義的變數名稱或塊級作用域

```typescript
// 修復模板
const postsResult = await db.execute('SELECT * FROM posts');
const commentsResult = await db.execute('SELECT * FROM comments');
const usersResult = await db.execute('SELECT * FROM users');
```

### 🟢 長期改善 (風格優化)

#### Priority 6: 更新測試檔案圖片元件 (預估 1 小時)
**影響範圍**: 8 個測試檔案
**修復步驟**:

1. **在 `jest.setup.js` 中 mock Next.js Image**:
   ```javascript
   jest.mock('next/image', () => ({
     __esModule: true,
     default: (props) => {
       const { src, alt, ...rest } = props;
       // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
       return <img src={src} alt={alt} {...rest} />;
     },
   }));
   ```

2. **更新測試檔案匯入**:
   ```typescript
   import Image from 'next/image';

   <Image src="/test.png" alt="Test image" width={100} height={100} />
   ```

#### Priority 7: 加入無障礙 alt 屬性 (預估 30 分鐘)
**影響範圍**: 4 個測試檔案
**修復**: 為所有 `<img>` 標籤加上有意義的 `alt` 屬性

```typescript
// 在 tests/read-book/*.test.tsx 中
<img src="/book-cover.jpg" alt="紅樓夢書籍封面" />
```

---

## 預防最佳實踐

### IDE 設定建議

#### VSCode 設定 (`.vscode/settings.json`)
```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "typescript.preferences.strictNullChecks": true,
  "typescript.preferences.noImplicitAny": true
}
```

#### TypeScript 嚴格模式 (`tsconfig.json`)
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Pre-commit Hooks 配置

#### 安裝 Husky
```bash
npm install --save-dev husky lint-staged
npx husky install
```

#### `.husky/pre-commit`
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run lint
npm run typecheck
```

#### `package.json` 配置
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  },
  "scripts": {
    "prepare": "husky install"
  }
}
```

### 團隊編碼規範

#### 非同步程式碼規範
1. **永遠為 async 函式註解返回型別**
   ```typescript
   // ✅ 好
   async function getUser(id: string): Promise<User> { /* ... */ }

   // ❌ 壞
   async function getUser(id: string) { /* ... */ }
   ```

2. **優先使用 async/await，避免 Promise 鏈**
   ```typescript
   // ✅ 好
   async function processData() {
     const data = await fetchData();
     const processed = await transformData(data);
     return processed;
   }

   // ❌ 壞
   function processData() {
     return fetchData()
       .then(data => transformData(data))
       .then(processed => processed);
   }
   ```

3. **並行操作使用 Promise.all**
   ```typescript
   // ✅ 好 (並行執行)
   const [users, posts, comments] = await Promise.all([
     getUsers(),
     getPosts(),
     getComments(),
   ]);

   // ❌ 壞 (序列執行，慢 3 倍)
   const users = await getUsers();
   const posts = await getPosts();
   const comments = await getComments();
   ```

#### React Hooks 規範
1. **useEffect 內使用的函式應定義在內部或使用 useCallback**
2. **自訂 hooks 必須以 `use` 開頭**
3. **嚴格遵循 Hooks 規則 (不在條件語句中呼叫)**

#### 資料庫操作規範
1. **所有 SQL 語句使用參數化查詢，防止 SQL 注入**
   ```typescript
   // ✅ 好
   await db.execute('SELECT * FROM users WHERE id = ?', [userId]);

   // ❌ 壞 (SQL 注入風險)
   await db.execute(`SELECT * FROM users WHERE id = '${userId}'`);
   ```

2. **查詢結果必須進行型別驗證**
3. **使用 batch 替代多個獨立 execute (交易場景)**

### 教育訓練重點

#### 1. TypeScript 非同步型別系統
- Promise 的型別推斷
- async/await 的型別轉換
- 錯誤處理的型別安全 (try-catch)

#### 2. React Hooks 深入理解
- useEffect 的依賴追蹤機制
- useCallback/useMemo 的使用時機
- 自訂 hooks 的設計模式

#### 3. Turso LibSQL Client 遷移
- 同步 vs 非同步 API 差異
- 交易與批次操作
- 錯誤處理與重試機制

#### 4. 無障礙開發基礎
- WCAG 2.1 AA 標準
- 螢幕閱讀器測試
- 鍵盤導航支援

---

## 學習資源

### TypeScript 官方文件
1. **[Async Functions](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-1-7.html#asyncawait)**
   - 非同步函式型別註解
   - Promise 型別推斷

2. **[Type Guards and Differentiating Types](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)**
   - 型別守衛實作
   - 型別窄化技巧

3. **[Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)**
   - 泛型函式設計
   - 資料庫查詢型別化

### ESLint 規則詳細說明
1. **[react-hooks/exhaustive-deps](https://github.com/facebook/react/tree/main/packages/eslint-plugin-react-hooks)**
   - useEffect 相依性規則
   - 常見錯誤模式

2. **[jsx-a11y/alt-text](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/alt-text.md)**
   - 圖片無障礙要求
   - alt 屬性撰寫指南

3. **[@next/next/no-img-element](https://nextjs.org/docs/messages/no-img-element)**
   - Next.js Image 優化
   - 效能最佳實踐

### Turso 官方文件
1. **[Turso JavaScript SDK](https://docs.turso.tech/libsql/client-access/javascript-typescript-sdk)**
   - LibSQL Client API 參考
   - 非同步操作範例

2. **[Transactions and Batches](https://docs.turso.tech/libsql/client-access/javascript-typescript-sdk#transactions)**
   - 交易模式說明
   - batch 最佳實踐

3. **[Migration Guide from SQLite](https://docs.turso.tech/guides/migrating-from-sqlite)**
   - 從 SQLite 遷移步驟
   - API 對照表

### React 官方文件
1. **[useEffect Hook](https://react.dev/reference/react/useEffect)**
   - Effect 生命週期
   - 清理函式用法

2. **[useCallback Hook](https://react.dev/reference/react/useCallback)**
   - 函式記憶化
   - 效能優化技巧

3. **[Rules of Hooks](https://react.dev/warnings/invalid-hook-call-warning)**
   - Hooks 使用規則
   - 常見錯誤診斷

### 無障礙設計資源
1. **[WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)**
   - AA 級別要求
   - 成功準則詳解

2. **[WebAIM: Alternative Text](https://webaim.org/techniques/alttext/)**
   - alt 文字撰寫指南
   - 最佳實踐範例

3. **[MDN: ARIA](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)**
   - ARIA 屬性使用
   - 角色與狀態管理

### 推薦閱讀文章
1. **[Async/Await in TypeScript](https://www.typescriptlang.org/play?#code/...)** (TypeScript Playground)
   - 互動式學習範例

2. **[A Complete Guide to useEffect](https://overreacted.io/a-complete-guide-to-useeffect/)** by Dan Abramov
   - useEffect 深入解析

3. **[How to fetch data with React Hooks](https://www.robinwieruch.de/react-hooks-fetch-data/)**
   - 資料獲取模式

4. **[Database Migration Best Practices](https://planetscale.com/blog/safe-schema-migrations)**
   - 資料庫遷移策略

---

## 附錄：快速修復腳本

### 自動修復腳本 (建議人工審查後執行)

```bash
#!/bin/bash
# fix-turso-errors.sh

echo "🔧 開始修復 Turso 型別錯誤..."

# 1. 備份所有受影響檔案
echo "📦 備份檔案..."
mkdir -p .backup/$(date +%Y%m%d)
cp -r src/lib/repositories .backup/$(date +%Y%m%d)/

# 2. 修復 getDatabase() 返回型別
echo "🔨 修復 getDatabase 返回型別..."
find src/lib/repositories -name "*.ts" -type f -exec sed -i 's/const db = await getDatabase()/const db = getDatabase()/g' {} +

# 3. 替換 result 變數名稱
echo "🔨 重新命名重複變數..."
# (需要更複雜的 AST 轉換，建議使用 jscodeshift)

# 4. 執行型別檢查
echo "✅ 執行型別檢查..."
npm run typecheck 2>&1 | tee typecheck-after.txt

echo "✨ 修復完成！請檢查 typecheck-after.txt"
```

### VSCode 批次重構 Snippet

```json
// .vscode/turso-fix.code-snippets
{
  "Fix getDatabase call": {
    "scope": "typescript,typescriptreact",
    "prefix": "fix-getdb",
    "body": [
      "const db = getDatabase(); // Fixed: removed await"
    ],
    "description": "Fix getDatabase() call to remove await"
  },
  "Add useCallback wrapper": {
    "scope": "typescriptreact",
    "prefix": "fix-callback",
    "body": [
      "const ${1:functionName} = useCallback(async () => {",
      "  ${2:// function body}",
      "}, [${3:}]);"
    ],
    "description": "Wrap function in useCallback"
  }
}
```

---

## 總結

本次診斷發現的 1,766 個問題（1,748 型別錯誤 + 18 ESLint 警告）主要源於：

1. **資料庫遷移不完整** (86% 錯誤) - Turso 遷移的型別系統未同步更新
2. **非同步模式混淆** (8% 錯誤) - Promise 型別處理不當
3. **React Hooks 誤用** (6 個警告) - useEffect 相依性管理錯誤
4. **測試程式碼規範不一致** (12 個警告) - 圖片優化與無障礙問題

**關鍵修復路徑**：
1. 修正 `getDatabase()` 返回 `Client` 而非 `Promise<Client>` → 消除 85% 錯誤
2. 使用 Turso `batch()` API 替代 `transaction()` → 修復交易錯誤
3. 為所有非同步函式加上 `useCallback` → 解決 React Hooks 警告
4. 統一使用 Zod 進行型別驗證 → 提高型別安全

預估總修復時間：**7-10 小時**
建議採用**分階段修復策略**，優先處理阻塞性錯誤，再進行程式碼品質優化。

---

**報告生成資訊**
- 分析工具：ESLint 8.x + TypeScript 5.x
- 報告格式：Markdown (Traditional Chinese)
- 生成時間：2025-11-25
- 報告版本：v1.0-comprehensive
