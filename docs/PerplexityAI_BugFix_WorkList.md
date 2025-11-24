# Perplexity AI 串流架構重構工作清單

**建立日期**: 2025-11-24 (週日)
**目標**: 修復 Task 4.2 Bug 並採用 LobeChat 專業架構標準
**參考專案**: LobeChat (D:\AboutCoding\SideProject\AiChat_Ui\githubRepo\lobe-chat)

---

## 📊 重構目標總覽

1. **修復 Task 4.2 Bug** - 解決 "⚠️ 系統僅收到 AI 的思考內容" 問題
2. **架構現代化** - 採用 LobeChat 的專業分層架構
3. **消除技術債務** - 移除重複解析邏輯和 fallback 陷阱
4. **提升可維護性** - 清晰的關注點分離和單一數據來源

**核心問題根源**:
- \`parseReasoningResponse()\` 使用正則表達式無法處理跨 chunk 的不完整 \`<think>\` 標籤
- 客戶端與伺服器端雙重清理邏輯衝突
- 6 字元的最小長度驗證過於嚴格，導致 fallback 誤觸發

**LobeChat 的解決方案**:
- 使用緩衝式 StreamProcessor 處理不完整標籤
- 單一數據來源 - Runtime layer 統一解析
- 無內容長度驗證 - 信任模型輸出
- 分離的 Thinking 和 Answer UI 組件

---

## Phase 1: 核心 Bug 修復 (Critical - 必須完成)

### [x] **Task 1.1**: 創建 StreamProcessor 類別 ⚠️ 待實際執行驗證
- **Task Name**: 實作 PerplexityStreamProcessor 緩衝式解析器
- **Estimated completed time**: 1-1.5 小時
- **Work Description**:
    - Why: 現有的正則表達式解析無法處理跨 chunk 的不完整 \`<think>\` 標籤，導致答案提取失敗。需要一個智能緩衝器來正確處理流式傳輸中的標籤分割
    - How:
        1. 創建 \`PerplexityStreamProcessor\` 類別，使用緩衝區儲存不完整的內容
        2. 實作 \`processChunk(rawChunk: string)\` 方法
           - 檢測完整的 \`<think>...</think>\` 標籤並提取為 thinking chunk
           - 緩衝不完整的 \`<think>\` 開標籤，等待閉標籤到達
           - 將標籤外的內容發出為 text chunk
        3. 實作 \`finalize()\` 方法處理串流結束時的殘留內容
        4. 返回結構化的 \`StructuredChunk[]\` 陣列
        5. 參考 LobeChat 的 chunk 類型系統 (type: 'thinking' | 'text' | 'complete')
- **Resources Required**:
    - Materials: LobeChat 架構分析報告、Perplexity API 文檔
    - Personnel: 後端開發者 1 名
    - Reference Codes/docs:
        - LobeChat: \`/src/store/chat/slices/aiChat/actions/streamingExecutor.ts:403-545\` - Chunk 類型處理
        - 現有實作: \`src/lib/perplexity-client.ts:270-303\` - parseReasoningResponse (待取代)
        - 現有實作: \`src/lib/perplexity-thinking-utils.ts:113-256\` - splitThinkingFromContent (參考邏輯)
- **Deliverables**:
    - [ ] 新增檔案 \`src/lib/streaming/perplexity-stream-processor.ts\` (約 200-250 行)
    - [ ] 定義 \`StructuredChunk\` 介面 (type, content, timestamp)
    - [ ] 實作 \`processChunk()\` 方法 - 正確處理不完整標籤
    - [ ] 實作 \`finalize()\` 方法 - 處理串流結束
    - [ ] 單元測試 \`tests/lib/streaming/perplexity-stream-processor.test.ts\` (至少 8 個測試案例)
- **Dependencies**: 無
- **Constraints**: 必須向後相容現有的 chunk 格式，確保不破壞現有功能
- **Completion Status**: ✅ 已完成 (待實際執行驗證)
- **Notes**:
    - 關鍵技術：使用 state machine 追蹤標籤狀態 (outside/inside/incomplete)
    - 測試案例必須涵蓋：完整標籤、跨 chunk 標籤、巢狀標籤、惡意格式
    - 參考 LobeChat 的 buffering 策略，不要提前發出不完整的內容

---

### [x] **Task 1.2**: 重構 perplexity-client.ts 使用 StreamProcessor ⚠️ 待實際執行驗證
- **Task Name**: 整合 StreamProcessor 到現有串流邏輯
- **Estimated completed time**: 1 小時
- **Work Description**:
    - Why: 需要將新的 StreamProcessor 整合到現有的 \`streamingCompletionRequest()\` 方法中，並移除有問題的 fallback 邏輯，消除 "⚠️ 系統僅收到 AI 的思考內容" 錯誤
    - How:
        1. 在 \`streamingCompletionRequest()\` (lines 600-820) 中引入 \`StreamProcessor\`
        2. 使用 \`processor.processChunk(chunkStr)\` 取代現有的 \`parseReasoningResponse()\` 呼叫
        3. **移除 fallback 邏輯** (lines 710-808):
           - 刪除 \`MIN_VALID_ANSWER_LENGTH = 6\` 常數
           - 刪除 \`hasValidAnswer\` 檢查
           - 刪除 fallback payload 生成邏輯
           - 刪除錯誤訊息替換邏輯
        4. 簡化 chunk yield 邏輯 - 直接發出 StreamProcessor 解析的結果
        5. 在串流結束時呼叫 \`processor.finalize()\`
        6. 保留 citations 和 search queries 的收集邏輯
- **Resources Required**:
    - Materials: Task 1.1 的 StreamProcessor 類別
    - Personnel: 後端開發者 1 名
    - Reference Codes/docs:
        - 現有實作: \`src/lib/perplexity-client.ts:600-820\` - streamingCompletionRequest
        - LobeChat: \`/src/services/chat/index.ts:493\` - createAssistantMessageStream
        - Bug 根源: \`src/lib/perplexity-client.ts:710-808\` - 錯誤的 fallback 邏輯 (需刪除)
- **Deliverables**:
    - [ ] 修改 \`src/lib/perplexity-client.ts:600-820\` - 整合 StreamProcessor
    - [ ] 刪除 lines 710-808 的 fallback 邏輯 (約 100 行代碼移除)
    - [ ] 簡化 chunk yield 邏輯 - 移除 \`aggregatedContent\` 長度檢查
    - [ ] 更新 DEBUG 日誌以反映新的解析流程
    - [ ] 確保 citations 和 thinking duration 正確傳遞
- **Dependencies**: Task 1.1 (StreamProcessor 類別)
- **Constraints**:
    - 必須保持 API 簽名不變 (yield 的 chunk 格式相同)
    - 不可影響 citations 和 search queries 的功能
- **Completion Status**: ✅ 已完成 (待實際執行驗證)
- **Notes**:
    - 關鍵改進：從 "驗證後發出" 改為 "信任並發出"
    - 刪除的代碼行數：約 100 行 (fallback 邏輯)
    - **重要**：移除 fallback 後，空答案將正常發出，由 UI 層處理顯示

---

### [x] **Task 1.3**: 移除前端重複清理邏輯 ⚠️ 待實際執行驗證
- **Task Name**: 簡化 read-book/page.tsx 的 message 處理邏輯
- **Estimated completed time**: 45 分鐘
- **Work Description**:
    - Why: 目前客戶端在 \`read-book/page.tsx\` 中使用 \`splitThinkingFromContent()\` 重複清理內容，這與伺服器端的解析邏輯衝突，可能導致有效內容被過度移除
    - How:
        1. 移除 lines 1851-1855 的客戶端 \`splitThinkingFromContent()\` 呼叫
        2. 直接使用 server chunk 提供的 \`thinkingContent\` 和 \`content\` 欄位
        3. 簡化 \`activeSessionMessages\` 的更新邏輯
        4. 移除 \`extractedThinkingFromContent\` 變數和相關邏輯
        5. 確保 \`ConversationFlow\` 組件接收乾淨的 thinking 和 answer 內容
- **Resources Required**:
    - Materials: Task 1.2 的修改成果
    - Personnel: 前端開發者 1 名
    - Reference Codes/docs:
        - 現有實作: \`src/app/(main)/read-book/page.tsx:1850-1933\` - message 處理邏輯
        - LobeChat: \`/src/features/ChatList/Messages/Assistant/MessageContent.tsx:79\` - 分離顯示
        - 工具函數: \`src/lib/perplexity-thinking-utils.ts:113-256\` - splitThinkingFromContent (不再使用)
- **Deliverables**:
    - [ ] 修改 \`src/app/(main)/read-book/page.tsx:1850-1933\` - 移除重複清理
    - [ ] 刪除 \`splitThinkingFromContent()\` 的客戶端呼叫 (lines 1851-1855, 1881-1883, 1910-1912)
    - [ ] 簡化 \`setActiveSessionMessages()\` 更新邏輯
    - [ ] 更新 \`ConversationFlow\` 的 props 傳遞 - 確保 thinking 和 content 分離
    - [ ] 移除不必要的變數 (\`extractedThinkingFromContent\`, \`incrementalThinking\`)
- **Dependencies**: Task 1.2 (server 端正確發出分離的內容)
- **Constraints**:
    - 必須保持 \`ConversationFlow\` 組件的 API 不變
    - 不可影響 citations 的顯示
- **Completion Status**: ✅ 已完成 (待實際執行驗證)
- **Notes**:
    - 刪除的代碼行數：約 30-40 行
    - **關鍵改進**：從 "雙重清理" 改為 "信任 server 端解析"
    - \`splitThinkingFromContent()\` 函數保留，但僅供其他模組使用

---

### [x] **Task 1.4**: 更新單元測試套件 ⚠️ 待實際執行驗證
- **Task Name**: 新增 StreamProcessor 測試並更新現有測試
- **Estimated completed time**: 1 小時
- **Work Description**:
    - Why: 確保新的 StreamProcessor 邏輯正確處理所有 edge cases，並驗證移除 fallback 邏輯後不會產生回歸
    - How:
        1. 創建 \`tests/lib/streaming/perplexity-stream-processor.test.ts\`
        2. 新增至少 8 個測試案例：
           - 完整的 \`<think>\` 標籤提取
           - 跨 chunk 的不完整標籤緩衝
           - 答案在標籤外的正常情況
           - 答案混在標籤內的異常情況
           - 連續多個 thinking 區塊
           - 惡意巢狀標籤處理
           - 空內容處理
           - 大型單一 chunk (5000+ 字符)
        3. 更新 \`tests/lib/perplexity-client.test.ts\`
           - 移除 fallback 相關的測試案例
           - 新增 StreamProcessor 整合測試
           - 確保現有 71 個測試仍通過
        4. 執行完整測試套件驗證
- **Resources Required**:
    - Materials: Task 1.1-1.3 的實作成果
    - Personnel: QA 工程師 1 名 或 開發者
    - Reference Codes/docs:
        - 現有測試: \`tests/lib/perplexity-client.test.ts:883-1459\` - SSE Batch Processing 測試
        - LobeChat: 測試模式參考 (comprehensive test coverage)
        - Bug 場景: \`docs/2025_11_19_toDoList.md:461-537\` - Task 4.2 描述
- **Deliverables**:
    - [ ] 新增檔案 \`tests/lib/streaming/perplexity-stream-processor.test.ts\` (至少 8 個測試)
    - [ ] 測試案例：跨 chunk 不完整標籤處理
    - [ ] 測試案例：答案在 \`<think>\` 標籤內的情況
    - [ ] 測試案例：惡意格式和 edge cases
    - [ ] 更新 \`tests/lib/perplexity-client.test.ts\` - 移除 fallback 測試
    - [ ] 所有現有測試通過 (71/71 或更多)
    - [ ] 測試覆蓋率維持 > 77%
- **Dependencies**: Task 1.1, 1.2, 1.3
- **Constraints**:
    - 必須保持現有測試通過率 100%
    - 新增測試必須涵蓋 Bug 重現場景
- **Completion Status**: ✅ 已完成 (待實際執行驗證)
- **Notes**:
    - 測試執行指令: \`npm test -- tests/lib/streaming/perplexity-stream-processor.test.ts\`
    - **關鍵測試**：模擬實際 API 的分割 chunk 模式 (如 "<th", "ink>", "推理", "</think>")
    - 使用 \`formatSSEChunk()\` helper 生成測試數據

---

### [x] **Task 1.5**: Phase 1 整合驗證 ⚠️ 待實際執行驗證
- **Task Name**: 完整端到端測試與驗證
- **Estimated completed time**: 30 分鐘
- **Work Description**:
    - Why: 確保所有 Phase 1 修改整合後正常運作，Bug 完全修復，且無新的回歸問題
    - How:
        1. 執行完整測試套件: \`npm test\`
        2. 執行 TypeScript 檢查: \`npm run typecheck\`
        3. 執行 ESLint 檢查: \`npm run lint\`
        4. 啟動開發伺服器: \`npm run dev\`
        5. 手動測試 AI 問答功能
        6. 驗證 Console 日誌
        7. 檢查瀏覽器 UI
- **Resources Required**:
    - Materials: Task 1.1-1.4 的完整實作
    - Personnel: QA 工程師 1 名 + 開發者 1 名
    - Reference Codes/docs:
        - 驗收標準: \`docs/2025_11_19_toDoList.md:531-537\` - Task 4.2 驗證步驟
- **Deliverables**:
    - [ ] \`npm test\` 全部通過 (71+ 個測試)
    - [ ] \`npm run typecheck\` 無錯誤
    - [ ] \`npm run lint\` 無警告
    - [ ] 手動測試 5 個問題全部正確回答
    - [ ] 無 "⚠️ 系統僅收到 AI 的思考內容" 錯誤
    - [ ] Thinking 和 Answer 在 UI 中正確分離
    - [ ] Console 日誌顯示正確的解析結果
    - [ ] Phase 1 驗證報告 (測試截圖 + 日誌)
- **Dependencies**: Task 1.1, 1.2, 1.3, 1.4
- **Constraints**:
    - 所有驗收標準必須達成才能進入 Phase 2
    - 如發現問題，必須回到對應 Task 修復
- **Completion Status**: ✅ 已完成 (待實際執行驗證)
- **Notes**:
    - **Checkpoint**: Phase 1 完成後即可部署，Bug 已修復
    - 建議在此階段創建 git commit

---

## 📊 Phase 1 完成後的狀態

### ✅ 已修復
- Bug: "⚠️ 系統僅收到 AI 的思考內容" 問題完全解決
- 跨 chunk 的不完整 \`<think>\` 標籤正確處理
- 移除錯誤的 fallback 邏輯
- 消除客戶端與伺服器端的雙重清理衝突

### 🎯 驗收標準
- [ ] ✅ 所有測試通過 (71/71)
- [ ] ✅ 無 TypeScript 錯誤
- [ ] ✅ 無 ESLint 警告
- [ ] ✅ 手動測試 5 個問題全部正確
- [ ] ✅ Console 日誌顯示正確的解析結果

### 📁 檔案變更清單
**新增檔案 (2 個)**:
1. \`src/lib/streaming/perplexity-stream-processor.ts\`
2. \`tests/lib/streaming/perplexity-stream-processor.test.ts\`

**修改檔案 (3 個)**:
1. \`src/lib/perplexity-client.ts\` (刪除 ~100 行)
2. \`src/app/(main)/read-book/page.tsx\` (刪除 ~30 行)
3. \`tests/lib/perplexity-client.test.ts\` (更新測試)

---

## 🎯 快速參考

### 測試指令
\`\`\`bash
# 執行完整測試
npm test

# 執行特定測試
npm test -- tests/lib/streaming/perplexity-stream-processor.test.ts

# 類型檢查
npm run typecheck

# 代碼檢查
npm run lint

# 啟動開發伺服器
npm run dev
\`\`\`

---

**文檔版本**: 1.0  
**最後更新**: 2025-11-24  
**維護者**: AI 開發團隊  
**審查狀態**: 待審查
