# 每日修身系統 Bug 修復測試指南

> **測試環境設定更新日期：** 2025-10-21
> **涵蓋的 Bug 修復：** 4 個

---

## 📋 目錄

1. [測試環境設定](#測試環境設定)
2. [測試檔案概覽](#測試檔案概覽)
3. [分批測試執行指南](#分批測試執行指南)
4. [手動驗證指南](#手動驗證指南)
5. [已知問題與解決方案](#已知問題與解決方案)

---

## 🔧 測試環境設定

### 已完成的環境優化

#### 1. 逾時設定調整

**jest.config.js** (Line 90-91):
```javascript
// Test timeout (increased for Firebase operations and daily task tests)
testTimeout: 60000, // Increased to 60 seconds for complex test suites
```

**jest.setup.js** (Line 135-136):
```javascript
// Increase timeout for async operations (especially for daily task tests)
jest.setTimeout(60000); // 60 seconds for complex test suites
```

#### 2. Firebase Mock 強化

**jest.setup.js** (Line 57-102):
- ✅ 強化 `deleteDoc` mock - 明確返回 Promise.resolve()
- ✅ 改進所有 Firestore 方法的 mock 實作
- ✅ 為 `doc`, `collection`, `getDoc` 等方法提供更完整的 mock 返回值

```javascript
deleteDoc: jest.fn(() => Promise.resolve()), // Enhanced: explicit Promise resolve
```

---

## 📁 測試檔案概覽

### 新增測試檔案

| 測試檔案 | 測試數量 | 涵蓋 Bug | 檔案位置 |
|---------|---------|---------|---------|
| `TaskResultModal.test.tsx` | 10 | Bug #1 | `tests/components/daily-tasks/` |
| `TaskModal.test.tsx` | 50+ | Bug #3 | `tests/components/daily-tasks/` |
| `task-generator.test.ts` | +6 | Bug #2 | `tests/lib/` (擴展現有檔案) |
| `daily-task-service.test.ts` | +7 | Bug #4 | `tests/lib/` (擴展現有檔案) |

### 測試分類

#### Bug Fix #1: TaskResultModal 溢出問題
**測試檔案：** `tests/components/daily-tasks/TaskResultModal.test.tsx`

```bash
# 單獨執行此測試
npm test -- tests/components/daily-tasks/TaskResultModal.test.tsx
```

**測試覆蓋：**
- ✅ Modal 視窗高度限制驗證 (`max-h-[90vh]`)
- ✅ 滾動功能驗證 (`overflow-y-auto`)
- ✅ 長內容處理
- ✅ 多屬性獎勵顯示
- ✅ 特殊條件（連擊、升級）

#### Bug Fix #2: 屬性名稱標準化
**測試檔案：** `tests/lib/task-generator.test.ts`

```bash
# 只執行 Bug Fix #2 相關測試
npm test -- tests/lib/task-generator.test.ts --testNamePattern="Bug Fix #2"
```

**測試覆蓋：**
- ✅ 驗證所有任務使用正確屬性名稱
- ✅ 確認舊的錯誤名稱不存在
- ✅ 針對每個任務類型測試特定屬性

**關鍵驗證點：**
```javascript
// 正確的屬性名稱
const validAttributeNames = [
  'poetrySkill',
  'culturalKnowledge',
  'analyticalThinking',
  'socialInfluence',
  'learningPersistence',
];

// 不應出現的錯誤名稱
const invalidAttributeNames = [
  'literaryTalent',    // ❌
  'aestheticSense',    // ❌
  'culturalInsight',   // ❌
  'socialAwareness',   // ❌
];
```

#### Bug Fix #3: TaskModal 內容顯示
**測試檔案：** `tests/components/daily-tasks/TaskModal.test.tsx`

```bash
# 單獨執行此測試
npm test -- tests/components/daily-tasks/TaskModal.test.tsx
```

**測試覆蓋：**
- ✅ MORNING_READING 內容顯示
- ✅ POETRY 內容顯示
- ✅ CHARACTER_INSIGHT 內容顯示（修復 `character.characterName`）
- ✅ CULTURAL_EXPLORATION 內容顯示（修復 `culturalElement`）
- ✅ COMMENTARY_DECODE 內容顯示（修復 `commentaryText` 和 `originalText`）
- ✅ 用戶互動（輸入驗證、字數統計、提交）

**關鍵修復驗證：**
```javascript
// Bug Fix: character.name → character.characterName
expect(screen.getByText(/王熙鳳/)).toBeInTheDocument();

// Bug Fix: culturalKnowledge → culturalElement
expect(screen.getByText(/鳳冠霞帔/)).toBeInTheDocument();

// Bug Fix: commentary.text → commentary.commentaryText
expect(screen.getByText(/此處伏線千里/)).toBeInTheDocument();
```

#### Bug Fix #4: 訪客登入重置
**測試檔案：** `tests/lib/daily-task-service.test.ts`

```bash
# 只執行 Bug Fix #4 相關測試
npm test -- tests/lib/daily-task-service.test.ts --testNamePattern="Bug Fix #4"
```

**測試覆蓋：**
- ✅ `deleteTodayProgress` 方法功能驗證
- ✅ 重置後重新生成任務流程
- ✅ 只刪除當日記錄，保留歷史
- ✅ 錯誤處理

---

## 🚀 分批測試執行指南

### 方法 1: 按 Bug 分類執行

```bash
# Bug #1: TaskResultModal 溢出測試
npm test -- tests/components/daily-tasks/TaskResultModal.test.tsx --verbose

# Bug #2: 屬性名稱測試
npm test -- tests/lib/task-generator.test.ts --testNamePattern="Bug Fix #2" --verbose

# Bug #3: TaskModal 內容顯示測試
npm test -- tests/components/daily-tasks/TaskModal.test.tsx --verbose

# Bug #4: 訪客重置功能測試
npm test -- tests/lib/daily-task-service.test.ts --testNamePattern="Bug Fix #4" --verbose
```

### 方法 2: 按測試類型執行

```bash
# 執行所有組件測試
npm test -- tests/components/daily-tasks/ --verbose

# 執行所有服務層測試
npm test -- tests/lib/task-generator.test.ts tests/lib/daily-task-service.test.ts --verbose
```

### 方法 3: 執行特定測試案例

```bash
# 只執行屬性名稱標準化的關鍵測試
npm test -- tests/lib/task-generator.test.ts -t "should use standardized attribute names"

# 只執行訪客重置的核心功能測試
npm test -- tests/lib/daily-task-service.test.ts -t "should delete todays progress"
```

---

## 🧪 手動驗證指南

如果自動化測試遇到環境問題，可以使用以下手動驗證方法：

### Bug #1: TaskResultModal 溢出驗證

**驗證步驟：**
1. 啟動開發服務器：`npm run dev`
2. 訪問每日任務頁面：`/daily-tasks`
3. 完成一個任務
4. 檢查結果視窗：
   - ✅ 視窗高度不超過螢幕 90%
   - ✅ 長內容可滾動
   - ✅ 所有內容可見

**檢查點：**
```typescript
// 檢查 TaskResultModal.tsx:155
<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
```

### Bug #2: 屬性名稱驗證

**驗證步驟：**
1. 檢查 `src/lib/task-generator.ts:87-111`
2. 確認 ATTRIBUTE_REWARD_TABLE 使用正確名稱
3. 完成任務後檢查 Firestore 資料庫
4. 確認儲存的屬性名稱正確

**檢查清單：**
- [ ] `poetrySkill` ✅（取代 literaryTalent）
- [ ] `culturalKnowledge` ✅（取代 culturalInsight）
- [ ] `analyticalThinking` ✅（保持不變）
- [ ] `socialInfluence` ✅（取代 socialAwareness）
- [ ] `learningPersistence` ✅（保持不變）

### Bug #3: TaskModal 內容驗證

**驗證步驟：**
1. 啟動開發服務器
2. 訪問每日任務頁面
3. 點擊每種任務類型
4. 確認內容正確顯示

**檢查清單：**

**CHARACTER_INSIGHT（角色洞察）：**
- [ ] 角色名稱顯示（如：王熙鳳）
- [ ] 情境背景顯示
- [ ] 分析提示顯示

**CULTURAL_EXPLORATION（文化探索）：**
- [ ] 文化標題顯示（如：鳳冠霞帔）
- [ ] 文化描述顯示
- [ ] 問題顯示

**COMMENTARY_DECODE（批語解讀）：**
- [ ] 原文顯示
- [ ] 批語文本顯示
- [ ] 解讀提示顯示

### Bug #4: 訪客重置驗證

**驗證步驟：**
1. 使用訪客登入
2. 完成一些任務
3. 登出
4. 重新使用訪客登入
5. 檢查今日任務是否已重置

**檢查點：**
```typescript
// daily-tasks/page.tsx:127-137
if (user.isAnonymous) {
  console.log('🧪 Guest user detected - resetting today\'s tasks...');
  resetTodayTasksForGuest();
}
```

**驗證結果：**
- [ ] 今日任務已重置（未完成狀態）
- [ ] 可以重新完成任務
- [ ] 昨天的任務記錄仍存在

---

## ⚠️ 已知問題與解決方案

### 問題 1: Jest 測試在 WSL 環境中逾時

**症狀：**
- 測試執行超過 60 秒仍無輸出
- 簡單測試也會逾時
- 測試進程似乎卡住

**可能原因：**
1. WSL2 與 Node.js 的相容性問題
2. Jest 工作進程無法正確啟動
3. 檔案監視問題

**解決方案：**

**方案 A: 使用 Windows PowerShell 執行測試**
```powershell
# 在 Windows PowerShell 中執行
cd D:\AboutUniversity\114 NSTC_and_SeniorProject\2025-IM-senior-project\TheChamber_Of_RedMansion_FireBaseStudio
npm test -- tests/components/daily-tasks/TaskResultModal.test.tsx
```

**方案 B: 使用單一工作進程**
```bash
# 限制 Jest 只使用一個工作進程
npm test -- --maxWorkers=1 tests/components/daily-tasks/
```

**方案 C: 清除 Jest 快取**
```bash
# 清除 Jest 快取後重試
npm test -- --clearCache
npm test -- tests/components/daily-tasks/TaskResultModal.test.tsx
```

**方案 D: 使用 --forceExit**
```bash
# 強制 Jest 在測試完成後退出
npm test -- --forceExit tests/components/daily-tasks/
```

### 問題 2: TypeScript 編譯錯誤

**症狀：**
```
error TS2339: Property 'toBeInTheDocument' does not exist
```

**原因：**
- 這是正常現象，TypeScript 檢查器看不到 Jest DOM 擴展
- 測試本身可以正常執行

**解決方案：**
- 不需要處理，測試執行時會自動載入 `@testing-library/jest-dom`

### 問題 3: Firebase Mock 未正確應用

**症狀：**
- 測試中出現實際 Firebase 連接錯誤
- deleteDoc 方法未被 mock

**解決方案：**
檢查 `jest.setup.js` 中的 Firebase mock 設定是否正確載入：

```bash
# 確認 jest.setup.js 在測試前載入
cat jest.config.js | grep setupFilesAfterEnv
```

---

## 📊 測試執行檢查清單

### 執行前檢查

- [ ] Node.js 版本 >= 18
- [ ] 所有依賴已安裝（`npm install`）
- [ ] Jest 快取已清除（`npm test -- --clearCache`）
- [ ] 沒有其他 Jest 進程在運行

### 測試執行

- [ ] Bug #1 測試通過（TaskResultModal）
- [ ] Bug #2 測試通過（屬性名稱）
- [ ] Bug #3 測試通過（TaskModal 內容）
- [ ] Bug #4 測試通過（訪客重置）

### 手動驗證

- [ ] Bug #1 手動驗證通過
- [ ] Bug #2 手動驗證通過
- [ ] Bug #3 手動驗證通過
- [ ] Bug #4 手動驗證通過

---

## 🎯 測試成功標準

### 自動化測試

每個 Bug 修復都應有：
- ✅ 至少 3 個測試案例（正常、邊界、錯誤）
- ✅ 關鍵修復點的專門測試
- ✅ 所有測試通過且無警告

### 手動驗證

每個 Bug 修復都應：
- ✅ 在開發環境中可重現修復
- ✅ 不影響其他功能
- ✅ UI/UX 符合預期

---

## 📝 測試報告範本

```markdown
## 測試執行報告

**執行日期：** YYYY-MM-DD
**執行環境：** Windows / WSL / Linux
**執行者：** [姓名]

### Bug #1: TaskResultModal 溢出

- **測試執行：** ✅ 通過 / ❌ 失敗 / ⏭️ 跳過
- **測試數量：** X / 10 通過
- **手動驗證：** ✅ 通過 / ❌ 失敗
- **備註：** [如有問題請說明]

### Bug #2: 屬性名稱標準化

- **測試執行：** ✅ 通過 / ❌ 失敗 / ⏭️ 跳過
- **測試數量：** X / 6 通過
- **手動驗證：** ✅ 通過 / ❌ 失敗
- **備註：** [如有問題請說明]

### Bug #3: TaskModal 內容顯示

- **測試執行：** ✅ 通過 / ❌ 失敗 / ⏭️ 跳過
- **測試數量：** X / 50+ 通過
- **手動驗證：** ✅ 通過 / ❌ 失敗
- **備註：** [如有問題請說明]

### Bug #4: 訪客重置功能

- **測試執行：** ✅ 通過 / ❌ 失敗 / ⏭️ 跳過
- **測試數量：** X / 7 通過
- **手動驗證：** ✅ 通過 / ❌ 失敗
- **備註：** [如有問題請說明]

### 總結

- **總測試數量：** X / 73+ 通過
- **整體狀態：** ✅ 所有修復驗證完成 / ⚠️ 部分問題 / ❌ 需要修復
- **建議：** [後續建議]
```

---

## 🔗 相關文件

- [Jest 配置文件](../../jest.config.js)
- [Jest 設定文件](../../jest.setup.js)
- [每日任務服務](../../src/lib/daily-task-service.ts)
- [任務生成器](../../src/lib/task-generator.ts)
- [TaskModal 組件](../../src/components/daily-tasks/TaskModal.tsx)
- [TaskResultModal 組件](../../src/components/daily-tasks/TaskResultModal.tsx)

---

## 📞 支援

如果遇到測試相關問題：

1. 檢查[已知問題](#已知問題與解決方案)章節
2. 嘗試使用手動驗證方法
3. 查看測試輸出的錯誤訊息
4. 記錄問題並回報給開發團隊

---

**文件版本：** 1.0
**最後更新：** 2025-10-21
**維護者：** Claude Code Development Team
