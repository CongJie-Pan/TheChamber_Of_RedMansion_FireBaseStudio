### 20250926

今天Claude Code AI 寫的系統概述書初版給我了，但還是有一些地方要改。

以及大概了解系統概述書的評審原則在哪裡了，大概應該是這樣的:

創新性(AI創新應用、影響力、創意、構想、整合性等)	50%
技術性(AI模型開發、精準度、功能性、穩定性等)	20%
實用性(可執行度、整合性、使用端接受度等)	20%
擴充性(包含延展性等)	10%

那麼我給Claude Code AI 打分結果和建議是這樣的:

│ │ 基於您在 proposal.typ 中的詳細規劃，我將提供更精準的評審建議：
│ │ 總評分：83/100
│ │ 具體優化建議：  
│ │ 1. 商業模式量化：將您的三級火箭模式增加具體數據目標（DAU增長15%/月，付費轉換率5-8%）
│ │ 2. 北一女中合作深化：制定3個月pilot program，包含教師培訓課程和效果量化指標
│ │ 3. LLM Agent技ㄉ術強化：建立《紅樓夢》專用標註資料集，設定圖譜準確率benchmark（≥90%）
│ │ 4. 用戶體驗優化：基於您的用戶流程圖，增加7天onboarding和用戶留存機制
│ │ 5. 成就系統經濟學：在您的徽章系統基礎上，設計稀有度分布和社交炫耀機制
│ │ 6. 技術架構強化：為您的微服務架構增加限流策略、熔斷機制和分片準備
│ │ 7. 市場差異化：在您的競爭分析基礎上，補充效果指標對比和技術護城河
│ │ 8. 社群運營深化：基於您的紅學社設計，增加KOL培育和內容運營策略
│ │ 9. 風險控制：建立AI模型降級方案和競爭應對策略

之後，我預留了這些意見，因為我覺得這些都還太抽象，不太具體。

於是我又回去改了概述書，把前言的部分換上我之前計畫書的內容，把大意一次講完。但是前言之後的部分，例如創意描述、系統功能簡介、系統特色等等的，我就不太知道如何寫了，因為總覺得不夠具體，但我想讀者不是真正想了解這個系統的細節，而是想要大概知道創意發想，和一些方案而已。因此，定位還是在把這份計畫書寫的動人、有價值和延展性，而不是非常具體和細節，畢竟讀者並非工程師。這樣來看的話，這個概述書就好寫了。

---

### 2025/10/7
run the repo, change to use : pnpm run dev

在ai問答區域 有以下內容需要更改

在ai問答區域 有以下內容需要更改

1. 用戶的藍色bubble太長，如圖片所示(temp\qa_module_problem04.jpg)
2. 當用戶馬上送出query後，ai問答的頭像就要先出來，而不是回答和ai頭像一起出來，以免用戶認為卡頓(當回答慢了一些。)
3. 當用戶query 送出直至 ai回覆完畢 送出btn改為停止鍵，不用輸入文字區域改為禁用，但建議按鈕可以當用戶query 送出直至 ai回覆完畢改為禁用。
4. 思考過程文字需要變小、且縮排，並且可以收縮，像"temp\qa_module_example.jpg"所示。(但目前這功能在點擊用戶輸入欄位上面的詢問按鈕後，會有這個功能，但是做的不完善，就是收縮文字的思考內容，是上一則ai回覆的思考內容，當則回覆的思考內容沒有收縮到。)
5. 在ai回覆和user bubble 後面，當message發出完成可以在下方加入複製按鈕
6. 請移除最下方引用區域。並且內文中的引用按鈕，例如[1] 此類按鈕請改成其網域名稱(如圖"temp\citationEg01.jpg")，當滑鼠hover上去會顯示其來源之網站圖標、標題、網域名稱，如圖"temp\citationEg02.jpg"。此處的citaion請參考此兩張圖設計。
7. ai 回答時，可以自由在ui裡滑動，不會受限於當ai回覆時不能隨意滑動。
8. 當ai問答視窗收起來後，再點按鈕打開會把紀錄清空。
9. ai 問答中，建議詢問的選項按鈕滑鼠hover上去，其按鈕背景請改為粉色，文字皆不變為黑色。
10. ai問答中，用戶送出的按鈕需要改為圓形按鈕，其中的箭頭需要是粗的，像"temp\btn_reference.jpg" 那樣。
11. 當用戶問了第一個問題，需要根據query的內容，更改ai問答視窗的標題，例如未問之前是"開啟新對話"。當問了例如: 林黛玉是誰之後? 其標題就要改成"林黛玉的身分確認"。
12. ai 回覆的速度有點慢，確認是否有速率限制。
13. 當選取閱讀內文按下問ai並不會引用閱讀內文在對話內繼續詢問。

### 2025/10/13 
繼續解決 "docs\improvement_report\QA_Module\QA_Module_improvement02_task.md" Phase 3 的問題。詢問以下的Prompt:
"""
目前又有問題了，請你閱讀 "temp\qa_module_problem07.jpg" 然後問題是思考內容的部分超過最大顯示範圍就會被吃掉，這部分可以解決嗎? 然後在思考過程的輸出中，發現有思考內容出現在正文的輸出處了，也請你分析這類問題。以上問題請分析根本原因，並且告訴我其原因和解方，等待我的批准，你方可繼續實行解決。
"""

### 2025/10/16

"GAME-001" complete. continue to the phase "GAME-002".

---

### 2025/10/22

- 紅樓夢學習數據，可以經由賀嘉生老師的課程內容，可以思考看看如何做這類的數據分析。
- [x] 請子傑再發一次git，我這邊核准之後，他就可以merge進來了(master)，merge到master分支。
- 實際程式測試 每日修身 GPT-5-mini 嵌入功能。

### 2025/11/22

- continue Task 4.2, Task 4.5 fix 

---

### 2025/11/24
- 進度: 4.2, 4.5 complete and versel 上線

the below both add the new claude session window:

- continue to fix the "docs\2025_11_19_toDoList.md" of TASK 4.2
  - [] "docs\PerplexityQA_Bug\testOutput\2025_11_24_bugRecord.md"
  - [] "docs\PerplexityAI_BugFix_WorkList.md" 
- continue to fix the "docs\2025_11_19_toDoList.md" of "Task 4.5"
  - [] "docs\BiColumn_BugFix_WorkList.md"

---

### 2025/12/5

- lint and type error fix.

---

### 2025/12/8

2025/12/8
- continue `perplexity_qa`專案 修復: 
停止功能ok了\
但我沒辦法再接續對話了會顯示"An error occurred while processing your request."\
{"timestamp":"2025-12-08T09:38:20.212Z","level":"error","message":"Perplexity API error","context":{"status":400,"statusText":"Bad Request","clientId":"::1"}}
 POST /api/chat 400 in 264ms (compile: 4ms, render: 260ms)
請用debug agent 進行偵錯分析

- 解決完成就使用以下指令，進行重構遷移工作 :

你是一位有大型系統重構經驗的資深軟體架構師與後端工程師，專精於：
  - Adapter Pattern（轉接器模式）與漸進式重構
  - Next.js + TypeScript 全端開發
  - Server-Sent Events (SSE) 串流處理
  - AI API 整合（Perplexity Sonar API）

  ---

  # 工作目標

  我有一個**主專案**（紅樓夢學習平台）和一個已驗證可行的 **Side Project A**（Perplexity QA 聊天介面）。

  **問題背景（TASK-006）：**
  - 主專案的 AI 問答功能無法正常運作
  - 輸入問題後返回「發生未知錯誤」或一直顯示「AI正在深度思考中」不會結束
  - 問題根源疑似在 streaming 處理邏輯過於複雜（`perplexity-client.ts` 超過 1300 行）

  **目標：**
  - 依照「轉接器模式（Adapter Pattern）」的思路
  - 將 Side Project A 乾淨、可運作的 Perplexity 串流處理邏輯安全整合回主專案
  - 不直接重寫整個模組，而是建立轉接層逐步取代

  ---

  # 技術背景

  ## 語言與框架
  - **共同使用**：Next.js 14+ / TypeScript / React 18

  ## 主專案（紅樓夢學習平台）
  - **位置**：`D:\AboutUniversity\...\TheChamber_Of_RedMansion_FireBaseStudio`
  - **主要功能**：紅樓夢文學學習平台，包含 AI 問答、章節閱讀、知識圖譜等功能
  - **Perplexity 相關模組**：
    - `src/lib/perplexity-client.ts` (1315 行，使用 axios，邏輯複雜)
    - `src/lib/streaming/perplexity-stream-processor.ts`
    - `src/app/api/perplexity-qa-stream/route.ts`
    - `src/ai/flows/perplexity-red-chamber-qa.ts`
    - `src/types/perplexity-qa.ts`

  ## Side Project A（Perplexity QA 聊天介面）
  - **位置**：`D:\AboutCoding\SideProject\AiChat_Ui\perplexity_qa`
  - **用途**：純粹的 Perplexity AI 聊天介面，已驗證可正常運作
  - **解決的問題**：SSE 串流處理、`<think>` 標籤解析、錯誤處理
  - **關鍵特點**：
    - 使用 native fetch 而非 axios（更好的串流支援）
    - 乾淨的 ThinkTagParser 類（197 行，有 buffer 管理）
    - 結構化 callbacks 模式（onThinkingStart/Content/End, onContent, onDone, onError）
    - 完善的 API 路由（rate limiting, 錯誤處理）

  ---

  # 請依照以下步驟進行分析與產出

  ## 步驟 1：分析 Side Project A 程式碼
  請閱讀我提供的 Side Project A 程式碼，用條列方式整理：

  1. **功能目標**：此模組要達成什麼？
  2. **主要資料流**：
     - Input：前端傳入什麼參數？
     - Output：後端回傳什麼資料結構？
     - 串流過程中的 chunk 格式？
  3. **重要物件或資料結構**：
     - 類別定義（class）
     - 介面定義（interface/type）
     - 狀態管理結構
  4. **關鍵邏輯步驟**：
     - SSE 連線建立與錯誤處理
     - `<think>` 標籤解析流程
     - 串流終止與資源清理

  ## 步驟 2：分析主專案相關模組程式碼
  請閱讀我提供的主專案舊功能實作，說明：

  1. **對外公開的介面**：
     - API 端點路徑與 HTTP method
     - Request/Response 參數格式
     - 前端元件使用的 props/callbacks
  2. **內部相依的其他服務或模組**：
     - 被哪些元件/頁面呼叫？
     - 依賴哪些工具函數或配置？
  3. **可能產生耦合或風險較高的點**：
     - 狀態管理的耦合
     - 類型定義的相依
     - 錯誤處理的差異

  ## 步驟 3：設計「轉接層（Adapter）」方案
  設計清楚的 Adapter 方案：

  1. **Adapter 介面定義**：
     - 這個 Adapter 對主專案暴露什麼方法與參數？
     - 回傳值格式如何對應到現有類型？
  2. **內部實作**：
     - 如何包裝 Side Project A 的邏輯？
     - 需要做哪些資料格式轉換？
  3. **新舊邏輯並存策略**：
     - 使用 Feature Flag 或環境變數切換
     - 如何做漸進式 rollout？

  ## 步驟 4：產出具體的程式碼與修改建議

  ### 4.1 新增檔案清單
  | 檔名 | 職責說明 |
  |------|---------|
  | ... | ... |

  ### 4.2 修改檔案清單
  | 檔名 | 要改什麼 | 為何要改 |
  |------|---------|---------|
  | ... | ... | ... |

  ### 4.3 程式碼骨架（TypeScript）
  提供 Adapter 類別/服務的實作骨架

  ## 步驟 5：測試與風險控管建議

  ### 5.1 單元測試案例
  列出 3-5 個具體測試案例

  ### 5.2 整合測試案例
  列出 2-3 個端對端測試情境

  ### 5.3 最大的 3 個風險點與緩解方式
  | 風險 | 影響 | 緩解方式 |
  |-----|------|---------|
  | ... | ... | ... |

  ---

  # 輸出格式要求

  1. 使用條列與小節標題整理結果
  2. 程式碼範例使用 TypeScript + Next.js 風格
  3. 若資訊不足，請列出需要補充的檔案或上下文，不要直接假設
  4. 請特別注意：
     - 主專案使用 axios，Side Project 使用 native fetch
     - 主專案有複雜的 `<think>` 標籤處理邏輯，需要確認是否可簡化
     - 主專案有紅樓夢專用的 prompt 建構邏輯，這部分應該保留

  ---

  # 接下來請你閱讀並根據以上步驟進行分析與產出，並且撰寫md檔於"/docs/AI_QA_Moule_Promblem"：

  1. **Side Project A 的專案結構與關鍵檔案內容**：
     - `src/services/perplexity/client.ts`
     - `src/services/perplexity/parser.ts`
     - `src/services/perplexity/types.ts`
     - `src/app/api/chat/route.ts`
     - `src/utils/error.ts`

  2. **主專案中舊功能的相關檔案內容**：
     - `src/lib/perplexity-client.ts`
     - `src/lib/streaming/perplexity-stream-processor.ts`
     - `src/app/api/perplexity-qa-stream/route.ts`
     - `src/types/perplexity-qa.ts`
     - `src/ai/perplexity-config.ts`

---

### 2025/12/08

## TASK-006 Perplexity Stream Adapter 實作完成

今天完成了 TASK-006 AI 問答功能修復的 Adapter Pattern 重構工作，將 Side Project A 的乾淨串流邏輯整合到主專案中。

### 完成的工作

**Phase 1: 基礎設施準備 (PRX-001, PRX-002)**
- 建立 `src/lib/adapters/` 模組目錄結構
- 實作 Feature Flag 控制模組 (`perplexity-feature-flags.ts`)
- 支援環境變數控制和百分比流量控制

**Phase 2: 核心解析模組實作 (PRX-003, PRX-004)**
- 實作 `SimpleThinkParser` 類別 (~220 行)
- 實作 `createSimpleChatStream()` 串流處理函數 (~360 行)
- 使用 native fetch 取代 axios，提供更好的 SSE 支援

**Phase 3: Adapter 層實作 (PRX-005, PRX-006)**
- 實作 `PerplexityStreamAdapter` 核心類別 (~450 行)
- 整合到 `perplexity-red-chamber-qa.ts` 的串流函數
- 透過 Feature Flag 控制新舊 Adapter 切換

**Phase 5: 整合與漸進式部署 (PRX-010, PRX-011)**
- 建立冒煙測試指南文件
- 設定漸進式 rollout 配置說明

**Phase 6: 文檔更新 (PRX-013)**
- 更新模組文檔 `qa-and-visualization_modules_info.md`
- 更新工作清單 `perplexity_reconstruct_workList.md`

### 新增檔案

| 檔案 | 用途 |
|------|------|
| `src/lib/adapters/index.ts` | 模組匯出 |
| `src/lib/adapters/types.ts` | 類型定義 |
| `src/lib/adapters/simple-think-parser.ts` | `<think>` 標籤解析器 |
| `src/lib/adapters/simple-chat-stream.ts` | SSE 串流處理 |
| `src/lib/adapters/perplexity-stream-adapter.ts` | AsyncGenerator 轉接器 |
| `src/lib/perplexity-feature-flags.ts` | Feature Flag 控制 |
| `docs/AI_QA_Module_Problem/smoke_test_guide.md` | 冒煙測試指南 |

### 啟用方式

```bash
# 在 .env.local 中設定
PERPLEXITY_USE_NEW_ADAPTER=true  # 啟用新 Adapter
PERPLEXITY_DEBUG_ADAPTER=true    # 啟用除錯日誌
```

### 待完成工作

- PRX-012: 移除舊程式碼與 Feature Flag（需在新 Adapter 穩定運作 1 週以上後執行）
- PRX-007, PRX-008, PRX-009: 補充單元測試（Phase 4）

### 程式碼精簡成果

| 指標 | 舊邏輯 | 新 Adapter | 精簡比例 |
|------|--------|-----------|----------|
| perplexity-client.ts | 1,315 行 | - | - |
| perplexity-stream-processor.ts | 842 行 | - | - |
| 新增 adapters/ 模組 | - | ~1,195 行 | - |
| **總計** | **2,157 行** | **~1,195 行** | **~45% 精簡** |