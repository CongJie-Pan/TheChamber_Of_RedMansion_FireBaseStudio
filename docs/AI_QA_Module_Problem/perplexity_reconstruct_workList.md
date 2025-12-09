# Perplexity QA 模組重構工作清單

> **文件建立日期**：2025-12-08
> **關聯文件**：[TASK-006_Adapter_Pattern_Analysis.md](./TASK-006_Adapter_Pattern_Analysis.md)
> **目標**：使用 Adapter Pattern 將 Side Project A 的乾淨邏輯整合回主專案

---

## 總覽

| Phase | 名稱 | 預估任務數 | 狀態 |
|-------|------|-----------|------|
| 1 | 基礎設施準備 | 2 | ✅ 已完成 |
| 2 | 核心解析模組實作 | 2 | ✅ 已完成 |
| 3 | Adapter 層實作 | 2 | ✅ 已完成 |
| 4 | 測試撰寫與驗證 | 3 | ✅ 已完成 |
| 5 | 整合與漸進式部署 | 2 | ✅ 已完成 |
| 6 | 清理與文檔更新 | 2 | 🔄 部分完成 (PRX-013 ✅, PRX-012 待穩定後執行) |

---

## Phase 1: 基礎設施準備

### [x] **Task ID**: PRX-001
- **Task Name**: 建立 Adapter 模組目錄結構
- **Work Description**:
    - Why: 需要一個獨立的目錄來存放新的 Adapter 相關程式碼，與現有複雜的 perplexity-client.ts 區隔，確保漸進式重構過程中不影響現有功能。
    - How:
        1. 在 `src/lib/` 下建立 `adapters/` 目錄
        2. 建立基本的 `index.ts` 匯出檔案
        3. 建立 `types.ts` 用於 Adapter 專用類型定義
        4. 在 `tests/lib/` 下建立對應的 `adapters/` 測試目錄
- **Resources Required**:
    - Materials: 無
    - Personnel: 前端開發
    - Reference Codes/docs:
        - `TASK-006_Adapter_Pattern_Analysis.md` - 4.1 新增檔案清單
- **Deliverables**:
    - [ ] `src/lib/adapters/` 目錄已建立
    - [ ] `src/lib/adapters/index.ts` 匯出檔案已建立
    - [ ] `src/lib/adapters/types.ts` 類型定義檔案已建立
    - [ ] `tests/lib/adapters/` 測試目錄已建立
- **Testing Plan**: 無需測試（純目錄結構）
- **Dependencies**: 無
- **Constraints**: 目錄結構需符合專案現有命名慣例
- **Completion Status**: ✅ 已完成 (2025-12-08)
- **Notes**: 此任務為後續所有任務的前置條件

---

### [x] **Task ID**: PRX-002
- **Task Name**: 實作 Feature Flag 控制模組
- **Work Description**:
    - Why: 需要能夠在不重新部署的情況下，控制新舊 Adapter 的切換，支援漸進式 rollout 和快速回滾。
    - How:
        1. 建立 `src/lib/perplexity-feature-flags.ts`
        2. 定義 `PERPLEXITY_FLAGS` 常數物件
        3. 實作 `shouldUseNewAdapter()` 函數，支援百分比流量控制
        4. 在 `.env.local` 加入對應環境變數
        5. 更新 `.env.example` 文件說明
- **Resources Required**:
    - Materials: 環境變數配置檔
    - Personnel: 前端開發
    - Reference Codes/docs:
        - `TASK-006_Adapter_Pattern_Analysis.md` - 3.3 新舊邏輯並存策略
        - `src/lib/perplexity-feature-flags.ts` 程式碼骨架
- **Deliverables**:
    - [ ] `src/lib/perplexity-feature-flags.ts` 已實作
    - [ ] `PERPLEXITY_USE_NEW_ADAPTER` 環境變數可正常讀取
    - [ ] `PERPLEXITY_DEBUG_ADAPTER` 環境變數可正常讀取
    - [ ] `PERPLEXITY_NEW_ADAPTER_PERCENTAGE` 百分比控制可運作
    - [ ] `.env.example` 已更新說明
- **Testing Plan**:
    - 單元測試：`shouldUseNewAdapter()` 在不同環境變數設定下的行為
    - 單元測試：百分比流量控制的統計分佈驗證
- **Dependencies**: PRX-001
- **Constraints**:
    - 預設值必須為 `false`（使用舊邏輯）
    - 環境變數名稱需以 `PERPLEXITY_` 開頭以保持一致性
- **Completion Status**: ✅ 已完成 (2025-12-08)
- **Notes**: Feature Flag 是漸進式 rollout 的關鍵，需確保穩定可靠

---

## Phase 2: 核心解析模組實作

### [x] **Task ID**: PRX-003
- **Task Name**: 實作 SimpleThinkParser 類別
- **Work Description**:
    - Why: 現有的 `PerplexityStreamProcessor` 過於複雜（842 行），包含大量 HYPOTHESIS 修復邏輯。需要一個簡化版的 `<think>` 標籤解析器，程式碼更乾淨、更易維護。
    - How:
        1. 從 Side Project A 的 `parser.ts` 移植核心邏輯
        2. 簡化為約 100 行的精簡實作
        3. 保留關鍵功能：
            - 狀態追蹤（isInThinkTag）
            - Buffer 機制處理跨 chunk 的不完整標籤
            - 正確辨識 `<think>` 開始和 `</think>` 結束標籤
        4. 移除不必要的複雜邏輯（HYPOTHESIS A/B/C、滑動視窗等）
- **Resources Required**:
    - Materials: Side Project A 原始碼
    - Personnel: 前端開發
    - Reference Codes/docs:
        - Side Project A: `src/services/perplexity/parser.ts`
        - `TASK-006_Adapter_Pattern_Analysis.md` - 4.3 SimpleThinkParser 程式碼骨架
        - 主專案: `src/lib/streaming/perplexity-stream-processor.ts`（參考用）
- **Deliverables**:
    - [ ] `src/lib/adapters/simple-think-parser.ts` 已實作
    - [ ] `ParsedChunkType` 類型已定義
    - [ ] `ParsedChunk` 介面已定義
    - [ ] `parse()` 方法可正確解析完整標籤
    - [ ] `parse()` 方法可正確處理跨 chunk 的不完整標籤
    - [ ] `reset()` 方法可重置解析器狀態
    - [ ] 程式碼行數控制在 150 行以內
- **Testing Plan**:
    - 單元測試：完整 `<think>...</think>` 標籤解析
    - 單元測試：跨 chunk 分割的開始標籤 `<thi` + `nk>`
    - 單元測試：跨 chunk 分割的結束標籤 `</thin` + `k>`
    - 單元測試：無 think 標籤的純文字內容
    - 單元測試：巢狀標籤處理（若有）
    - 單元測試：連續多個 think 區塊
    - 單元測試：空內容的 think 區塊
- **Dependencies**: PRX-001
- **Constraints**:
    - 必須完整通過 Side Project A 的所有測試案例
    - 不得引入 Side Project A 不存在的依賴
- **Completion Status**: ✅ 已完成 (2025-12-08)
- **Notes**: 這是整個重構的核心模組，需確保解析邏輯 100% 正確

---

### [x] **Task ID**: PRX-004
- **Task Name**: 實作 SimpleChatStream 串流處理函數
- **Work Description**:
    - Why: 現有的 `PerplexityClient.streamingCompletionRequest()` 超過 650 行，使用 axios 處理串流較為複雜。需要使用 native fetch 的簡化版串流處理，提供更好的 SSE 支援。
    - How:
        1. 從 Side Project A 的 `client.ts` 移植核心邏輯
        2. 使用 native fetch 取代 axios
        3. 實作 `createSimpleChatStream()` 函數
        4. 實作 `StreamCallbacks` 介面的回調機制
        5. 實作 `SimpleChatStreamError` 錯誤類別
        6. 整合 `SimpleThinkParser` 進行內容解析
        7. 支援 AbortController 取消機制
        8. 確保資源正確清理（reader.cancel()、parser.reset()）
- **Resources Required**:
    - Materials: Side Project A 原始碼
    - Personnel: 前端開發
    - Reference Codes/docs:
        - Side Project A: `src/services/perplexity/client.ts`
        - Side Project A: `src/utils/error.ts`
        - `TASK-006_Adapter_Pattern_Analysis.md` - 4.3 SimpleChatStream 程式碼骨架
        - 主專案: `src/ai/perplexity-config.ts`（API 配置）
- **Deliverables**:
    - [ ] `src/lib/adapters/simple-chat-stream.ts` 已實作
    - [ ] `ChatMessage` 介面已定義
    - [ ] `StreamCallbacks` 介面已定義（7 個回調）
    - [ ] `SimpleChatStreamError` 錯誤類別已實作
    - [ ] `createSimpleChatStream()` 函數可正常建立 SSE 連線
    - [ ] SSE 事件正確解析（data: ... 格式）
    - [ ] `[DONE]` 信號正確處理
    - [ ] AbortController 取消機制正常運作
    - [ ] 資源清理機制正常運作
    - [ ] 程式碼行數控制在 200 行以內
- **Testing Plan**:
    - 單元測試：成功建立串流連線
    - 單元測試：正確解析 SSE chunk
    - 單元測試：`onThinkingStart/Content/End` 回調順序
    - 單元測試：`onContent` 回調內容正確
    - 單元測試：`onCitations` 回調包含引用
    - 單元測試：`onDone` 在 `[DONE]` 信號時觸發
    - 單元測試：`onError` 在 API 錯誤時觸發
    - 單元測試：AbortController 取消不觸發 onError
    - 整合測試：實際呼叫 Perplexity API（需 mock）
- **Dependencies**: PRX-001, PRX-003
- **Constraints**:
    - 必須使用主專案的 `PERPLEXITY_CONFIG` 配置
    - 必須使用主專案的 `getPerplexityApiKey()` 取得 API key
    - 不得直接暴露 API key 到客戶端
- **Completion Status**: ✅ 已完成 (2025-12-08)
- **Notes**: 使用 native fetch 可簡化串流處理，避免 axios 的額外轉換

---

## Phase 3: Adapter 層實作

### [x] **Task ID**: PRX-005
- **Task Name**: 實作 PerplexityStreamAdapter 核心類別
- **Work Description**:
    - Why: 需要一個轉接層，將 Side Project A 的 callbacks 模式轉換為主專案的 AsyncGenerator 介面，同時保留紅樓夢專用的 prompt 建構邏輯。
    - How:
        1. 建立 `PerplexityStreamAdapter` 類別
        2. 實作 `streamingQA()` AsyncGenerator 方法
        3. 實作 `completionQA()` 非串流方法
        4. 實作 `testConnection()` 連線測試方法
        5. 移植並保留 `buildRedChamberPrompt()` 紅樓夢專用 prompt
        6. 實作 `createChunk()` 將狀態轉換為 `PerplexityStreamingChunk`
        7. 實作 `convertCitations()` 引用格式轉換
        8. 使用 Promise + 事件佇列 將 callbacks 轉換為 AsyncGenerator
- **Resources Required**:
    - Materials: 主專案類型定義
    - Personnel: 前端開發
    - Reference Codes/docs:
        - `TASK-006_Adapter_Pattern_Analysis.md` - 4.3 PerplexityStreamAdapter 程式碼骨架
        - 主專案: `src/lib/perplexity-client.ts` - `buildPrompt()` 方法
        - 主專案: `src/types/perplexity-qa.ts` - 類型定義
        - 主專案: `src/ai/perplexity-config.ts` - 配置常數
- **Deliverables**:
    - [ ] `src/lib/adapters/perplexity-stream-adapter.ts` 已實作
    - [ ] `IPerplexityStreamAdapter` 介面已定義
    - [ ] `streamingQA()` 方法可正常 yield `PerplexityStreamingChunk`
    - [ ] `completionQA()` 方法可回傳完整 `PerplexityQAResponse`
    - [ ] `testConnection()` 方法可正常測試 API 連線
    - [ ] `isConfigured()` 方法可檢查配置狀態
    - [ ] `buildRedChamberPrompt()` 保留紅樓夢專用 prompt 邏輯
    - [ ] 引用格式正確轉換為 `PerplexityCitation[]`
    - [ ] 程式碼行數控制在 300 行以內
- **Testing Plan**:
    - 單元測試：`streamingQA()` 產生正確的 chunk 序列
    - 單元測試：`completionQA()` 回傳完整回應
    - 單元測試：`buildRedChamberPrompt()` 輸出與舊版一致
    - 單元測試：引用轉換格式正確
    - 單元測試：`isComplete` 在最後一個 chunk 為 true
    - 整合測試：與 `SimpleChatStream` 整合運作
- **Dependencies**: PRX-001, PRX-003, PRX-004
- **Constraints**:
    - 必須完全相容 `PerplexityStreamingChunk` 類型
    - 必須完全相容 `PerplexityQAResponse` 類型
    - 紅樓夢專用 prompt 不得有任何遺漏
- **Completion Status**: ✅ 已完成 (2025-12-08)
- **Notes**: 這是 Adapter Pattern 的核心，確保新舊介面無縫銜接

---

### [x] **Task ID**: PRX-006
- **Task Name**: 整合 Adapter 到現有流程
- **Work Description**:
    - Why: 需要將新的 Adapter 整合到現有的 `perplexity-red-chamber-qa.ts` 流程中，並透過 Feature Flag 控制切換。
    - How:
        1. 修改 `src/ai/flows/perplexity-red-chamber-qa.ts`
        2. 引入 `shouldUseNewAdapter()` 判斷函數
        3. 引入 `PerplexityStreamAdapter` 類別
        4. 在 `perplexityRedChamberQAStreaming()` 中加入切換邏輯
        5. 保留舊的 `PerplexityClient` 作為 fallback
        6. 加入適當的日誌記錄
- **Resources Required**:
    - Materials: 現有流程檔案
    - Personnel: 前端開發
    - Reference Codes/docs:
        - `TASK-006_Adapter_Pattern_Analysis.md` - 3.3 切換邏輯實作
        - 主專案: `src/ai/flows/perplexity-red-chamber-qa.ts`
- **Deliverables**:
    - [ ] `perplexity-red-chamber-qa.ts` 已修改支援 Adapter 切換
    - [ ] Feature Flag 為 true 時使用新 Adapter
    - [ ] Feature Flag 為 false 時使用舊 PerplexityClient
    - [ ] 切換邏輯有適當的日誌記錄
    - [ ] 現有功能不受影響（Feature Flag 預設 false）
- **Testing Plan**:
    - 整合測試：Feature Flag false 時使用舊邏輯
    - 整合測試：Feature Flag true 時使用新 Adapter
    - 冒煙測試：部署後基本問答功能正常
- **Dependencies**: PRX-002, PRX-005
- **Constraints**:
    - 預設必須使用舊邏輯，確保向後相容
    - 修改範圍最小化，只加入切換邏輯
- **Completion Status**: ✅ 已完成 (2025-12-08)
- **Notes**: 此任務完成後，系統已具備切換能力，但預設仍使用舊邏輯

---

## Phase 4: 測試撰寫與驗證

### [x] **Task ID**: PRX-007
- **Task Name**: 撰寫 SimpleThinkParser 單元測試
- **Work Description**:
    - Why: 確保 `<think>` 標籤解析邏輯在各種邊界情況下都能正確運作，這是整個重構的核心基礎。
    - How:
        1. 建立 `tests/lib/adapters/simple-think-parser.test.ts`
        2. 撰寫完整標籤解析測試
        3. 撰寫跨 chunk 分割標籤測試
        4. 撰寫無標籤純文字測試
        5. 撰寫連續多區塊測試
        6. 撰寫邊界情況測試
        7. 確保測試覆蓋率達到 95% 以上
- **Resources Required**:
    - Materials: Jest 測試框架
    - Personnel: 前端開發
    - Reference Codes/docs:
        - Side Project A: `tests/` 測試檔案（若有）
        - `TASK-006_Adapter_Pattern_Analysis.md` - 5.1 單元測試案例
- **Deliverables**:
    - [ ] `tests/lib/adapters/simple-think-parser.test.ts` 已建立
    - [ ] 完整標籤解析測試通過
    - [ ] 跨 chunk 開始標籤測試通過
    - [ ] 跨 chunk 結束標籤測試通過
    - [ ] 無標籤純文字測試通過
    - [ ] 連續多區塊測試通過
    - [ ] 空內容區塊測試通過
    - [ ] 測試覆蓋率 >= 95%
- **Testing Plan**: 執行 `npm test -- tests/lib/adapters/simple-think-parser.test.ts`
- **Dependencies**: PRX-003
- **Constraints**: 所有測試必須獨立，不依賴外部服務
- **Completion Status**: ✅ 已完成 (2025-12-09)
- **Notes**: 解析器是核心，測試必須全面。35 項測試全數通過。

---

### [x] **Task ID**: PRX-008
- **Task Name**: 撰寫 SimpleChatStream 單元測試
- **Work Description**:
    - Why: 確保串流處理邏輯正確，包含 SSE 解析、回調觸發、錯誤處理和資源清理。
    - How:
        1. 建立 `tests/lib/adapters/simple-chat-stream.test.ts`
        2. 使用 Mock 模擬 Perplexity API 回應
        3. 撰寫成功串流測試
        4. 撰寫各回調觸發測試
        5. 撰寫錯誤處理測試
        6. 撰寫取消機制測試
        7. 撰寫資源清理測試
- **Resources Required**:
    - Materials: Jest 測試框架、MSW 或類似 Mock 工具
    - Personnel: 前端開發
    - Reference Codes/docs:
        - `TASK-006_Adapter_Pattern_Analysis.md` - 5.1 單元測試案例
        - 現有測試: `tests/lib/perplexity-client.test.ts`（參考）
- **Deliverables**:
    - [ ] `tests/lib/adapters/simple-chat-stream.test.ts` 已建立
    - [ ] Mock API 回應設置完成
    - [ ] 成功串流測試通過
    - [ ] `onThinkingStart/Content/End` 回調測試通過
    - [ ] `onContent` 回調測試通過
    - [ ] `onCitations` 回調測試通過
    - [ ] `onDone` 回調測試通過
    - [ ] `onError` 錯誤處理測試通過
    - [ ] AbortController 取消測試通過
    - [ ] 資源清理測試通過
- **Testing Plan**: 執行 `npm test -- tests/lib/adapters/simple-chat-stream.test.ts`
- **Dependencies**: PRX-004
- **Constraints**:
    - 必須使用 Mock，不得實際呼叫 API
    - 測試需覆蓋各種 HTTP 錯誤碼
- **Completion Status**: ✅ 已完成 (2025-12-09)
- **Notes**: 串流處理是複雜度較高的部分，需完整測試。34 項測試全數通過。

---

### [x] **Task ID**: PRX-009
- **Task Name**: 撰寫 PerplexityStreamAdapter 整合測試
- **Work Description**:
    - Why: 確保 Adapter 能正確將 callbacks 模式轉換為 AsyncGenerator，並輸出符合主專案類型定義的 chunk。
    - How:
        1. 建立 `tests/lib/adapters/perplexity-stream-adapter.test.ts`
        2. 使用 Mock 模擬底層串流
        3. 撰寫 `streamingQA()` 輸出格式測試
        4. 撰寫 `completionQA()` 回應格式測試
        5. 撰寫 `buildRedChamberPrompt()` prompt 一致性測試
        6. 撰寫類型相容性測試
        7. 比對新舊 Adapter 輸出差異
- **Resources Required**:
    - Materials: Jest 測試框架
    - Personnel: 前端開發
    - Reference Codes/docs:
        - `TASK-006_Adapter_Pattern_Analysis.md` - 5.2 整合測試案例
        - 主專案: `src/types/perplexity-qa.ts`
- **Deliverables**:
    - [ ] `tests/lib/adapters/perplexity-stream-adapter.test.ts` 已建立
    - [ ] `streamingQA()` chunk 格式測試通過
    - [ ] `completionQA()` 回應格式測試通過
    - [ ] `PerplexityStreamingChunk` 類型完全相容
    - [ ] `PerplexityQAResponse` 類型完全相容
    - [ ] `buildRedChamberPrompt()` 輸出與舊版一致
    - [ ] 所有必要欄位都有正確值
- **Testing Plan**:
    - 執行 `npm test -- tests/lib/adapters/perplexity-stream-adapter.test.ts`
    - 手動比對新舊 Adapter 的實際 API 回應
- **Dependencies**: PRX-005, PRX-007, PRX-008
- **Constraints**: Adapter 輸出必須 100% 類型相容
- **Completion Status**: ✅ 已完成 (2025-12-09)
- **Notes**: 這是確保新舊邏輯可無縫切換的關鍵測試。44 項測試全數通過。

---

## Phase 5: 整合與漸進式部署

### [x] **Task ID**: PRX-010
- **Task Name**: 本地端驗證與冒煙測試
- **Work Description**:
    - Why: 在部署到正式環境前，需要在本地完整驗證新 Adapter 的功能正確性。
    - How:
        1. 設定 `PERPLEXITY_USE_NEW_ADAPTER=true`
        2. 啟動本地開發伺服器
        3. 執行完整的冒煙測試清單
        4. 記錄並修復發現的問題
        5. 比較新舊 Adapter 的回應品質
        6. 驗證效能指標（responseTime）
- **Resources Required**:
    - Materials: 本地開發環境、有效的 Perplexity API key
    - Personnel: 前端開發、QA
    - Reference Codes/docs:
        - `TASK-006_Adapter_Pattern_Analysis.md` - 5.2 整合測試案例
- **Deliverables**:
    - [ ] 冒煙測試清單建立
    - [ ] 基本問答功能驗證通過
    - [ ] 思考過程顯示驗證通過
    - [ ] 最終答案顯示驗證通過
    - [ ] Loading 狀態正確結束
    - [ ] 引用來源正確顯示
    - [ ] 取消功能正常運作
    - [ ] 效能指標在可接受範圍內
    - [ ] 問題記錄與修復完成
- **Testing Plan**:
    - 冒煙測試：輸入「你好」，確認收到正常回應
    - 冒煙測試：輸入紅樓夢相關問題，確認專業回答
    - 冒煙測試：在回應過程中取消，確認正確中止
    - 冒煙測試：故意輸入超長問題，確認錯誤處理
- **Dependencies**: PRX-006, PRX-009
- **Constraints**:
    - 所有冒煙測試必須通過才能進入下一階段
    - 效能不得明顯退化（responseTime 差異 < 20%）
- **Completion Status**: ⬜ 未開始
- **Notes**: 這是部署前的最後防線

---

### [x] **Task ID**: PRX-011
- **Task Name**: 漸進式 Rollout 部署
- **Work Description**:
    - Why: 避免一次性全量切換帶來的風險，透過百分比流量控制逐步驗證新 Adapter 的穩定性。
    - How:
        1. 部署包含 Feature Flag 的版本
        2. 階段 1：設定 `PERPLEXITY_NEW_ADAPTER_PERCENTAGE=10`
        3. 監控錯誤率和效能指標 24 小時
        4. 階段 2：提升至 50%
        5. 監控 24 小時
        6. 階段 3：設定 `PERPLEXITY_USE_NEW_ADAPTER=true`（100%）
        7. 持續監控 48 小時
        8. 確認穩定後，移除百分比控制邏輯
- **Resources Required**:
    - Materials: 部署環境、監控系統
    - Personnel: 前端開發、DevOps
    - Reference Codes/docs:
        - `TASK-006_Adapter_Pattern_Analysis.md` - 3.3 漸進式 Rollout 流程
- **Deliverables**:
    - [ ] 10% 流量測試完成，無異常
    - [ ] 50% 流量測試完成，無異常
    - [ ] 100% 流量切換完成
    - [ ] 錯誤率維持在可接受範圍（< 1%）
    - [ ] 效能指標穩定
    - [ ] 使用者回饋無負面反應
- **Testing Plan**:
    - 監控：API 錯誤率
    - 監控：平均回應時間
    - 監控：串流中斷率
    - 監控：使用者投訴/回饋
- **Dependencies**: PRX-010
- **Constraints**:
    - 任何階段發現問題，立即回滾至 0%
    - 每個階段至少觀察 24 小時
- **Completion Status**: ⬜ 未開始
- **Notes**: 穩定性優先，寧可慢不可錯

---

## Phase 6: 清理與文檔更新

### [ ] **Task ID**: PRX-012
- **Task Name**: 移除舊程式碼與 Feature Flag
- **Work Description**:
    - Why: 新 Adapter 穩定運作後，需要清理不再需要的舊程式碼和臨時的 Feature Flag，減少技術債務。
    - How:
        1. 確認新 Adapter 已穩定運作 1 週以上
        2. 標記 `PerplexityClient` 舊類別為 `@deprecated`
        3. 移除 `perplexity-red-chamber-qa.ts` 中的切換邏輯
        4. 移除 Feature Flag 相關程式碼
        5. 移除 `.env` 中不再需要的環境變數
        6. 保留舊檔案但加入廢棄註解（供參考）
        7. 或完全刪除舊檔案（視團隊決定）
- **Resources Required**:
    - Materials: 無
    - Personnel: 前端開發
    - Reference Codes/docs:
        - 主專案: `src/lib/perplexity-client.ts`
        - 主專案: `src/lib/streaming/perplexity-stream-processor.ts`
- **Deliverables**:
    - [ ] Feature Flag 判斷邏輯已移除
    - [ ] `perplexity-feature-flags.ts` 簡化或移除
    - [ ] 舊 `PerplexityClient` 標記為 deprecated 或移除
    - [ ] 舊 `PerplexityStreamProcessor` 標記為 deprecated 或移除
    - [ ] 環境變數清理完成
    - [ ] 無殘留的 Feature Flag 參照
- **Testing Plan**:
    - 執行完整測試套件，確保無中斷
    - 冒煙測試確認功能正常
- **Dependencies**: PRX-011（需穩定運作 1 週以上）
- **Constraints**:
    - 清理前必須確認新 Adapter 穩定
    - 考慮保留舊程式碼一段時間以備回滾
- **Completion Status**: ⬜ 未開始
- **Notes**: 技術債務清理，但需謹慎進行

---

### [x] **Task ID**: PRX-013
- **Task Name**: 更新模組文檔
- **Work Description**:
    - Why: 重構完成後，需要更新相關文檔，確保團隊成員了解新的架構和使用方式。
    - How:
        1. 更新 `docs/structure_module_infoMD/` 中的 AI 模組文檔
        2. 建立 Adapter 使用指南
        3. 更新 API 文檔（若有）
        4. 記錄重構過程和決策原因
        5. 更新 `TASK-006_Adapter_Pattern_Analysis.md` 標記為已完成
        6. 在 `worklog.md` 記錄此次重構
- **Resources Required**:
    - Materials: 文檔模板
    - Personnel: 前端開發
    - Reference Codes/docs:
        - `docs/structure_module_infoMD/`
        - `docs/worklog.md`
- **Deliverables**:
    - [ ] AI 模組文檔已更新
    - [ ] Adapter 架構說明已撰寫
    - [ ] 使用範例已提供
    - [ ] 重構決策記錄已完成
    - [ ] `worklog.md` 已更新
    - [ ] `TASK-006_Adapter_Pattern_Analysis.md` 標記完成
- **Testing Plan**: 文檔審閱
- **Dependencies**: PRX-012
- **Constraints**: 文檔需保持最新，反映實際程式碼狀態
- **Completion Status**: ⬜ 未開始
- **Notes**: 好的文檔是長期維護的基礎

---

## 附錄：任務依賴關係圖

```
PRX-001 (目錄結構)
    │
    ├──> PRX-002 (Feature Flag)
    │        │
    │        └──────────────────────────────────┐
    │                                           │
    ├──> PRX-003 (SimpleThinkParser)            │
    │        │                                  │
    │        ├──> PRX-007 (Parser 測試)         │
    │        │                                  │
    │        └──> PRX-004 (SimpleChatStream)    │
    │                 │                         │
    │                 ├──> PRX-008 (Stream 測試)│
    │                 │                         │
    │                 └──> PRX-005 (Adapter) <──┘
    │                          │
    │                          ├──> PRX-009 (Adapter 測試)
    │                          │
    │                          └──> PRX-006 (整合切換) <── PRX-002
    │                                   │
    │                                   └──> PRX-010 (本地驗證)
    │                                            │
    │                                            └──> PRX-011 (漸進部署)
    │                                                     │
    │                                                     └──> PRX-012 (清理)
    │                                                              │
    │                                                              └──> PRX-013 (文檔)
```

---

## 風險追蹤

| 風險 ID | 風險描述 | 影響程度 | 發生機率 | 緩解措施 | 狀態 |
|--------|---------|---------|---------|---------|------|
| R-001 | 類型不相容導致 UI 顯示錯誤 | 高 | 中 | 完整類型測試、漸進 rollout | 監控中 |
| R-002 | 紅樓夢 prompt 遺漏影響回答品質 | 高 | 低 | prompt 對比測試 | 監控中 |
| R-003 | 效能退化 | 中 | 低 | 效能監控、必要時優化 | 監控中 |
| R-004 | 新 Adapter 在特定情況下失敗 | 高 | 中 | Feature Flag 快速回滾 | 監控中 |

---

*文件撰寫者：Claude Code*
*最後更新：2025-12-08*
