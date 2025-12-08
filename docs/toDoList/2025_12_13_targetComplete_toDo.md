# 2025/12/13 目標完成待辦清單

> 本文件記錄需要在 2025/12/13 前完成的六項關鍵任務

---

## Phase 1: 帳戶設置功能修復

### [ ] **Task ID**: TASK-001
- **Task Name**: 帳戶設置區域頁面 - Display Name 修改功能實作
- **Work Description**:
    - Why: 目前帳戶設置頁面缺乏修改 display name 的功能。用戶需要能夠更新自己的顯示名稱（display name），同時姓名（name）欄位應該要能顯示但不允許修改，以確保用戶身份的一致性。
    - How:
        1. 在帳戶設置頁面新增 display name 編輯欄位
        2. 實作 display name 更新 API 端點
        3. 確保姓名欄位為唯讀狀態（disabled input 或純文字顯示）
        4. 從資料庫載入並顯示當初註冊時設定的姓名
        5. 新增表單驗證和錯誤處理
- **Resources Required**:
    - Materials: 帳戶設置頁面 UI 元件、表單驗證邏輯
    - Personnel: 前端開發、後端 API 開發
    - Reference Codes/docs:
        - `src/app/(main)/settings/page.tsx` - 帳戶設置頁面
        - `src/lib/repositories/user-repository.ts` - 用戶資料存取
        - `src/app/api/user/` - 用戶相關 API
- **Deliverables**:
    - [ ] Display name 編輯輸入欄位已實作
    - [ ] 姓名欄位顯示為唯讀狀態
    - [ ] 更新 display name 的 API 端點已完成
    - [ ] 表單驗證與錯誤提示已實作
    - [ ] 單元測試已撰寫並通過
- **Dependencies**: 用戶認證系統、資料庫用戶資料表結構
- **Constraints**: 姓名欄位必須顯示但不可編輯
- **Completion Status**: ⬜ 未開始
- **Notes**: 需確認資料庫中 display_name 與 name 欄位的區分

---

## Phase 2: 閱讀頁面文本顯示問題修復

### [ ] **Task ID**: TASK-002
- **Task Name**: 閱讀頁面文本初始化與筆記互動錯位問題修復
- **Work Description**:
    - Why:
        1. 閱讀頁面在初始載入時會先顯示 hardcoded 的文本內容，然後才切換到正確內容，造成不良的使用者體驗（閃爍效果）
        2. 點擊筆記時，文本會發生錯位/移動，影響閱讀體驗
    - How:
        1. 調查文本載入流程，找出 hardcoded 內容出現的原因
        2. 實作適當的 loading 狀態，避免顯示預設文本
        3. 分析筆記點擊事件處理邏輯
        4. 修復 CSS 佈局問題或 JavaScript 重新渲染問題
        5. 確保文本容器的位置在互動時保持穩定
- **Resources Required**:
    - Materials: 閱讀頁面元件、筆記系統相關元件
    - Personnel: 前端開發
    - Reference Codes/docs:
        - `src/app/(main)/read-book/page.tsx` - 閱讀頁面
        - `src/components/reading/` - 閱讀相關元件
        - `src/components/notes/` - 筆記相關元件
        - `docs/structure_module_infoMD/reading-module.md` - 閱讀模組文檔
- **Deliverables**:
    - [ ] 文本初始化不再顯示 hardcoded 內容
    - [ ] 實作適當的 loading skeleton 或 spinner
    - [ ] 筆記點擊時文本不再發生錯位
    - [ ] CSS 佈局穩定性已優化
    - [ ] 使用者體驗流暢度已提升
- **Dependencies**: 文本資料 API、筆記系統
- **Constraints**: 修復時不能影響現有筆記功能
- **Completion Status**: ⬜ 未開始
- **Notes**: 可能需要檢查 useEffect 的執行順序和狀態管理邏輯

---

## Phase 3: 圖譜頁面載入錯誤修復

### [ ] **Task ID**: TASK-003
- **Task Name**: 圖譜頁面資源載入錯誤與狀態保持問題修復
- **Work Description**:
    - Why:
        1. 點擊圖譜頁面時出現 "Loading Error - Some application resources failed to load" 錯誤
        2. 按 reload 會重新載入整個閱讀頁面
        3. 重新載入後筆記顯示消失（雖然後端資料仍存在）
        4. 這些問題嚴重影響用戶體驗和資料可靠性感知
    - How:
        1. 調查圖譜頁面載入失敗的具體資源（檢查 Network tab）
        2. 確認 lazy loading 或動態 import 是否有問題
        3. 修復資源載入邏輯，加入重試機制
        4. 實作局部重新載入而非整頁刷新
        5. 確保筆記狀態在頁面切換時正確保持
- **Resources Required**:
    - Materials: 圖譜頁面元件、資源載入模組
    - Personnel: 前端開發
    - Reference Codes/docs:
        - `src/app/(main)/read-book/` - 閱讀頁面相關
        - `src/components/graph/` - 圖譜相關元件
        - 瀏覽器開發者工具 Network/Console
- **Deliverables**:
    - [ ] 圖譜頁面資源載入錯誤已修復
    - [ ] 錯誤重試機制已實作
    - [ ] 局部重新載入功能已實作（不重整整頁）
    - [ ] 筆記狀態在頁面切換時正確保持
    - [ ] 錯誤訊息對用戶更友善
- **Dependencies**: 圖譜視覺化套件、筆記系統、狀態管理
- **Constraints**: 需保持與現有系統的相容性
- **Completion Status**: ⬜ 未開始
- **Notes**: 可能是 dynamic import 或 code splitting 造成的問題

---

## Phase 4: 登入後首頁設定

### [ ] **Task ID**: TASK-004
- **Task Name**: 設定 HomePage 為登入後的首頁
- **Work Description**:
    - Why: 目前用戶登入後可能被導向到非預期的頁面，需要確保登入成功後一律導向到 HomePage，提供一致的使用者體驗。
    - How:
        1. 確認目前的路由邏輯和認證流程
        2. 修改登入成功後的重定向邏輯
        3. 更新 middleware 或認證回調函數
        4. 確保各種登入方式（一般登入、OAuth、訪客模式）都導向正確頁面
        5. 測試各種登入情境
- **Resources Required**:
    - Materials: 認證模組、路由配置
    - Personnel: 前端開發
    - Reference Codes/docs:
        - `src/app/(main)/home/page.tsx` - 首頁
        - `src/app/api/auth/` - 認證 API
        - `src/middleware.ts` - 中介軟體
        - `src/lib/auth/` - 認證相關邏輯
- **Deliverables**:
    - [ ] 一般帳號登入後導向 HomePage
    - [ ] OAuth 登入後導向 HomePage
    - [ ] 訪客模式登入後導向 HomePage
    - [ ] 路由守衛邏輯已更新
    - [ ] 所有登入情境測試通過
- **Dependencies**: 認證系統、路由系統
- **Constraints**: 不能破壞現有的認證流程
- **Completion Status**: ⬜ 未開始
- **Notes**: 需確認 callbackUrl 參數的處理邏輯

---

## Phase 5: 圖譜頁面互動與介面優化

### [ ] **Task ID**: TASK-005
- **Task Name**: 圖譜頁面縮放功能修復與介面重新設計
- **Work Description**:
    - Why:
        1. 目前圖譜頁面進行放大縮小操作後，會重新回到初始位置，無法正常瀏覽
        2. 節點持續抖動，影響視覺體驗
        3. 介面需要參照範例設計進行優化，使其更簡潔明瞭
    - How:
        1. 調查縮放操作觸發的事件和狀態更新邏輯
        2. 修復視圖位置狀態的保持機制
        3. 調整物理引擎參數，停止節點抖動
        4. 參照 `temp/knowledgeGraph_example.jpg` 重新設計介面
        5. 實作以下 UI 元素：
            - 左側：篩選控制面板（選擇人物和關係類型）
            - 右上：控制面板（重置視圖、適應屏幕、切換物理引擎）
            - 右下：圖例（節點類型、關係類型說明）
- **Resources Required**:
    - Materials: 圖譜視覺化套件（可能是 D3.js, vis.js 或 force-graph）
    - Personnel: 前端開發、UI 設計
    - Reference Codes/docs:
        - `temp/knowledgeGraph_example.jpg` - 目標介面設計參考
        - `src/components/graph/` - 現有圖譜元件
        - 圖譜套件官方文檔
- **Deliverables**:
    - [ ] 縮放操作後視圖位置正確保持
    - [ ] 節點抖動問題已解決
    - [ ] 左側篩選控制面板已實作
    - [ ] 右上控制面板已實作（重置視圖、適應屏幕、切換物理引擎按鈕）
    - [ ] 右下圖例面板已實作
    - [ ] 整體介面風格與範例一致
- **Dependencies**: TASK-003（圖譜載入問題需先修復）
- **Constraints**:
    - 需維持現有資料結構和 API 相容性
    - 介面風格需符合整體應用設計語言
- **Completion Status**: ⬜ 未開始
- **Notes**:
    - 範例圖顯示的功能包括：
        - 篩選控制：可勾選人物（夏原吉、婁諒、邵元節、吳澄、張宇初、李禛、張數華...）
        - 控制面板按鈕：重置視圖、適應屏幕、切換物理引擎
        - 圖例：節點類型（主要人物、次要人物）、關係類型（血緣關係、政治關係、師承關係、著述關係、祠祀關係、朋友及社會關係）

---

## Phase 6: AI 問答功能修復

### [ ] **Task ID**: TASK-006
- **Task Name**: AI 問答無法產生正常回應問題修復
- **Work Description**:
    - Why:
        1. AI 問答功能無法產生正常回應
        2. 測試輸入 "你好" 時返回錯誤訊息：「發生未知錯誤，請稍後重試。如果問題持續，請聯繫技術支持。」
        3. 介面一直顯示「AI正在深度思考中」狀態不會結束
        4. 此問題導致核心 AI 功能完全無法使用
    - How:
        1. 檢查 AI API 端點的連線狀態和回應
        2. 驗證 API key 配置是否正確（OpenAI/Perplexity）
        3. 檢查 API 請求/回應格式是否正確
        4. 調查錯誤處理邏輯，找出「未知錯誤」的真正原因
        5. 修復 streaming 回應處理邏輯
        6. 確保 loading 狀態能正確結束
        7. 加入更詳細的錯誤日誌以利除錯
- **Resources Required**:
    - Materials: AI 服務模組、API 配置
    - Personnel: 後端開發、前端開發
    - Reference Codes/docs:
        - `src/lib/ai/` - AI 相關服務
        - `src/lib/perplexity-client.ts` - Perplexity API 客戶端
        - `src/app/api/ai/` - AI API 端點
        - `src/components/ai/` - AI 相關前端元件
        - `.env.local` - API key 配置
        - `docs/structure_module_infoMD/ai-module.md` - AI 模組文檔
- **Deliverables**:
    - [ ] API 連線問題已診斷並修復
    - [ ] AI 問答能正常回應用戶輸入
    - [ ] Loading 狀態能正確顯示並結束
    - [ ] 錯誤訊息更具體有用
    - [ ] 錯誤日誌已加強以利後續除錯
    - [ ] 基本對話測試通過
- **Dependencies**: API key 配置、網路連線
- **Constraints**:
    - 需符合 API 使用限制和費用考量
    - 不能暴露 API key 到前端
- **Completion Status**: ⬜ 未開始
- **Notes**:
    - 需要檢查的可能問題：
        1. API key 過期或無效
        2. API endpoint URL 錯誤
        3. Request/Response 格式不符合 API 規格
        4. CORS 問題
        5. Rate limiting
        6. Streaming 處理邏輯錯誤

---

## 總覽

| Task ID | Task Name | Priority | Status | Dependencies |
|---------|-----------|----------|--------|--------------|
| TASK-001 | 帳戶設置 Display Name 修改功能 | 中 | ⬜ 未開始 | 無 |
| TASK-002 | 閱讀頁面文本顯示問題修復 | 高 | ⬜ 未開始 | 無 |
| TASK-003 | 圖譜頁面載入錯誤修復 | 高 | ⬜ 未開始 | 無 |
| TASK-004 | 登入後首頁設定 | 中 | ⬜ 未開始 | 無 |
| TASK-005 | 圖譜頁面互動與介面優化 | 中 | ⬜ 未開始 | TASK-003 |
| TASK-006 | AI 問答功能修復 | 最高 | ⬜ 未開始 | 無 |

## 建議執行順序

1. **TASK-006** - AI 問答功能修復（最高優先，核心功能）
2. **TASK-003** - 圖譜頁面載入錯誤修復（TASK-005 的前置條件）
3. **TASK-002** - 閱讀頁面文本顯示問題修復（高優先，使用者體驗）
4. **TASK-004** - 登入後首頁設定（中優先）
5. **TASK-001** - 帳戶設置功能修復（中優先）
6. **TASK-005** - 圖譜頁面互動與介面優化（依賴 TASK-003）

---

*文件建立日期: 2025/12/08*
*目標完成日期: 2025/12/13*
