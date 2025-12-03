# Perplexity AI Q&A Streaming 處理流程分析

## 問題描述

AI 問答模塊在某些情況下無法正確輸出完整答案內容（fullContent），導致用戶看到空白或不完整的回應。本文檔詳細分析 streaming 處理的完整流程，協助定位問題根源。

---

## 系統架構總覽

```mermaid
flowchart TB
    subgraph Frontend["前端 (read-book/page.tsx)"]
        A[用戶提交問題] --> B[發送 POST 請求]
        B --> C[fetch /api/perplexity-qa-stream]
        C --> D[ReadableStream.getReader]
        D --> E[解析 SSE 事件]
        E --> F{事件類型}
        F -->|data: JSON| G[解析 PerplexityStreamingChunk]
        F -->|data: DONE| H[完成處理]
        G --> I[更新 UI 狀態]
        I --> J[顯示思考過程/答案]
    end

    subgraph APIRoute["API 路由 (route.ts)"]
        K[接收 POST 請求] --> L[驗證參數]
        L --> M[創建 ReadableStream]
        M --> N[調用 perplexityRedChamberQAStreaming]
        N --> O[for await chunk]
        O --> P[轉換為 SSE 格式]
        P --> Q[controller.enqueue]
        Q --> R[發送 data: DONE]
    end

    subgraph AIFlow["AI Flow (perplexity-red-chamber-qa.ts)"]
        S[驗證輸入] --> T[調用 PerplexityClient]
        T --> U[streamingCompletionRequest]
        U --> V[yield PerplexityStreamingChunk]
    end

    subgraph PerplexityClient["Perplexity Client (perplexity-client.ts)"]
        W[native fetch 請求] --> X[Perplexity API]
        X --> Y[SSE 響應流]
        Y --> Z[ReadableStream.getReader]
        Z --> AA[解碼 SSE 事件]
        AA --> AB[PerplexityStreamProcessor]
        AB --> AC[分離 thinking/text]
        AC --> AD[yield StructuredChunk]
    end

    subgraph StreamProcessor["Stream Processor"]
        AE[processChunk] --> AF{當前狀態}
        AF -->|outside| AG[檢測 &lt;think&gt;]
        AF -->|inside| AH[檢測 &lt;/think&gt;]
        AG --> AI[進入 thinking 狀態]
        AH --> AJ[滑動窗口檢測]
        AJ --> AK[完成 thinking block]
        AK --> AL[輸出 text chunk]
    end

    C --> K
    Q --> D
    N --> S
    V --> O
    U --> W
    AD --> V
    AB --> AE
```

---

## 詳細流程說明

### 1. 前端請求階段 (read-book/page.tsx)

```mermaid
sequenceDiagram
    participant User as 用戶
    participant UI as React UI
    participant Fetch as fetch API
    participant SSE as SSE Parser

    User->>UI: 輸入問題並提交
    UI->>UI: setAiInteractionState('waiting')
    UI->>Fetch: POST /api/perplexity-qa-stream
    Note over Fetch: 請求 body 包含:<br/>- userQuestion<br/>- selectedTextInfo<br/>- chapterContext<br/>- modelKey<br/>- reasoningEffort

    Fetch->>SSE: response.body.getReader()
    loop 處理 SSE 事件
        SSE->>SSE: reader.read()
        SSE->>SSE: decoder.decode(value)
        SSE->>SSE: 分割 buffer 為 lines
        alt data: JSON
            SSE->>UI: 解析 PerplexityStreamingChunk
            UI->>UI: 更新 thinkingContent
            UI->>UI: 更新 message.content
        else data: [DONE]
            SSE->>UI: 完成處理
            UI->>UI: setAiInteractionState('answered')
        end
    end
```

**關鍵程式碼位置**: `src/app/(main)/read-book/page.tsx:1936-2359`

**重要狀態變數**:
- `chunks`: 累積所有收到的 PerplexityStreamingChunk
- `latestThinkingText`: 最新的思考內容
- `thinkingContent`: 顯示在 UI 上的思考過程

---

### 2. API 路由處理階段 (route.ts)

```mermaid
flowchart TD
    A[POST 請求進入] --> B{驗證 userQuestion}
    B -->|無效| C[返回 400 錯誤]
    B -->|有效| D[創建 PerplexityQAInput]
    D --> E[計算 adaptiveTimeout]
    E --> F[創建 ReadableStream]

    subgraph StreamProcessing["Stream 處理"]
        F --> G[設置 timeout handler]
        G --> H[for await perplexityRedChamberQAStreaming]
        H --> I{chunk.isComplete?}
        I -->|否| J[發送 SSE: data JSON]
        J --> H
        I -->|是| K[清除 timeout]
        K --> L[發送 SSE: data DONE]
    end

    L --> M[controller.close]

    subgraph ErrorHandling["錯誤處理"]
        N[捕獲異常] --> O[classifyError]
        O --> P[formatErrorForUser]
        P --> Q[發送錯誤 chunk]
        Q --> R[發送 DONE 並關閉]
    end
```

**關鍵程式碼位置**: `src/app/api/perplexity-qa-stream/route.ts:32-251`

**SSE 訊息格式**:
```
data: {"content":"...","fullContent":"...","thinkingContent":"...","isComplete":false,...}\n\n
data: [DONE]\n\n
```

---

### 3. Perplexity Client Streaming 處理

```mermaid
flowchart TD
    A[streamingCompletionRequest 開始] --> B[buildPrompt]
    B --> C[createPerplexityConfig]
    C --> D[native fetch POST]
    D --> E{response.ok?}
    E -->|否| F[拋出 PerplexityQAError]
    E -->|是| G[response.body.getReader]

    subgraph MainLoop["主處理迴圈"]
        G --> H[reader.read]
        H --> I{done?}
        I -->|是| J[finalize processor]
        I -->|否| K[decoder.decode]
        K --> L[分割為 SSE lines]
        L --> M{data 類型}
        M -->|DONE| N[處理完成 chunk]
        M -->|JSON| O[解析 PerplexityStreamChunk]
        O --> P[提取 delta.content]
        P --> Q[processor.processChunk]
        Q --> R{chunk.type}
        R -->|thinking| S[累積 accumulatedThinking]
        R -->|text| T[累積 fullContent]
        S --> U[yield thinking chunk]
        T --> V[yield text chunk]
        U --> H
        V --> H
    end

    J --> W{fullContent 有內容?}
    W -->|是| X[yield 完成 chunk]
    W -->|否| Y[deriveAnswerFromThinking]
    Y --> Z[使用 thinking 作為 answer]
    Z --> X
```

**關鍵程式碼位置**: `src/lib/perplexity-client.ts:506-1133`

**重要變數追蹤**:
- `fullContent`: 累積的答案文本
- `accumulatedThinking`: 累積的思考內容
- `rawContentChunkCount`: 原始內容 chunk 計數
- `sawThinkClose`: 是否看到 `</think>` 標籤

---

### 4. Stream Processor 核心邏輯

```mermaid
stateDiagram-v2
    [*] --> outside: 初始狀態

    outside --> inside: 檢測到 &lt;think&gt;
    inside --> outside: 檢測到 &lt;/think&gt;
    outside --> incomplete_open: 潛在不完整標籤
    incomplete_open --> outside: 新 chunk 到達

    state outside {
        [*] --> 掃描buffer
        掃描buffer --> 發現opening_tag: 找到 &lt;think&gt;
        掃描buffer --> 發現closing_tag: 找到 &lt;/think&gt;
        掃描buffer --> 累積text: 普通字符
        發現opening_tag --> 切換狀態
        發現closing_tag --> 處理unmatched
        累積text --> emit_text_chunk
    }

    state inside {
        [*] --> 滑動窗口檢測
        滑動窗口檢測 --> 找到closing_in_window: 跨邊界 &lt;/think&gt;
        滑動窗口檢測 --> 累積thinking: 無閉合標籤
        找到closing_in_window --> emit_thinking_chunk
        找到closing_in_window --> 處理remaining
        累積thinking --> 添加到thinkingBuffer
    }
```

**關鍵程式碼位置**: `src/lib/streaming/perplexity-stream-processor.ts:65-598`

---

### 5. 滑動窗口閉合標籤檢測

```mermaid
flowchart LR
    subgraph PreviousChunk["前一個 Chunk (thinkingBuffer 尾部)"]
        A1["...content"]
        A2["&lt;/th"]
    end

    subgraph CurrentChunk["當前 Chunk (rawChunk)"]
        B1["ink&gt;"]
        B2["Answer text..."]
    end

    subgraph LookbackBuffer["Lookback Buffer (合併後)"]
        C1["&lt;/th"]
        C2["ink&gt;"]
        C3["Answer text..."]
    end

    A2 --> C1
    B1 --> C2
    B2 --> C3

    C1 --> D{搜索 &lt;/think&gt;}
    D -->|找到| E[計算位置]
    E --> F[分離 thinking 和 answer]
```

**核心邏輯說明**:

當 `</think>` 標籤被分割在兩個 chunk 之間時（例如：前一個 chunk 以 `</th` 結尾，當前 chunk 以 `ink>` 開頭），單獨檢測任一 chunk 都無法找到完整標籤。

**滑動窗口解決方案**:
1. 取 `thinkingBuffer` 最後 8 個字符（`</think>` 長度）
2. 與當前 `rawChunk` 合併成 `lookbackBuffer`
3. 在 `lookbackBuffer` 中搜索 `</think>`
4. 計算標籤在原始 buffer 中的實際位置
5. 正確分離 thinking 內容和 answer 內容

---

## 可能的問題點分析

### 問題假設 A：StreamProcessor 未正確檢測 `</think>`

**症狀**: `fullContent` 為空或非常短，但 `thinkingContent` 包含完整回答

**可能原因**:
1. 滑動窗口計算錯誤
2. `actualLookbackSize` 與 `maxLookbackSize` 混淆
3. `remainingStartInRaw` 計算導致答案內容被截斷

**診斷日誌位置**:
```typescript
// perplexity-stream-processor.ts:205-226
console.log('[StreamProcessor] 🔍 REMAINING CALCULATION DEBUG:');
```

### 問題假設 B：後端 chunk 未包含正確的 fullContent

**症狀**: 前端收到的 chunk 中 `fullContent` 始終為空

**可能原因**:
1. `processChunk` 未返回 `text` 類型的 chunk
2. 所有內容都被歸類為 `thinking`
3. `</think>` 後的內容未被遞歸處理

**診斷日誌位置**:
```typescript
// perplexity-client.ts:838-873
console.log('[HYPOTHESIS B] 🅱️ StreamProcessor Output Analysis');
```

### 問題假設 C：前端處理邏輯錯誤

**症狀**: 後端日誌顯示 `fullContent` 正確，但前端顯示錯誤

**可能原因**:
1. SSE 解析錯誤
2. chunk 合併邏輯問題
3. 狀態更新時機問題

**診斷日誌位置**:
```typescript
// read-book/page.tsx:2237-2271
console.log('[HYPOTHESIS B - Frontend] 🅱️ Chunk Received from Backend');
```

---

## 完整資料流圖

```mermaid
flowchart TB
    subgraph PerplexityAPI["Perplexity API 回應"]
        PA1["SSE: data {choices: [{delta: {content: '&lt;think&gt;思考內容'}}]}"]
        PA2["SSE: data {choices: [{delta: {content: '&lt;/think&gt;'}}]}"]
        PA3["SSE: data {choices: [{delta: {content: '實際答案文字'}}]}"]
        PA4["SSE: data [DONE]"]
    end

    subgraph PerplexityClient["perplexity-client.ts"]
        PC1["rawContent = '&lt;think&gt;思考內容'"]
        PC2["processor.processChunk(rawContent)"]
        PC3["structuredChunks = [{type: 'thinking', content: '思考內容'}]"]
        PC4["accumulatedThinking += '思考內容'"]
        PC5["yield {thinkingContent: '...', fullContent: ''}"]

        PC6["rawContent = '&lt;/think&gt;'"]
        PC7["processor.processChunk(rawContent)"]
        PC8["完成 thinking block"]

        PC9["rawContent = '實際答案文字'"]
        PC10["processor.processChunk(rawContent)"]
        PC11["structuredChunks = [{type: 'text', content: '實際答案文字'}]"]
        PC12["fullContent += '實際答案文字'"]
        PC13["yield {fullContent: '實際答案文字', thinkingContent: '...'}"]
    end

    subgraph APIRoute["route.ts"]
        AR1["for await (chunk of streaming)"]
        AR2["sseMessage = 'data: ' + JSON.stringify(chunk)"]
        AR3["controller.enqueue(sseMessage)"]
    end

    subgraph Frontend["read-book/page.tsx"]
        FE1["reader.read()"]
        FE2["解析 JSON chunk"]
        FE3["chunks.push(chunk)"]
        FE4["更新 message.content = chunk.fullContent"]
        FE5["更新 thinkingProcess = chunk.thinkingContent"]
    end

    PA1 --> PC1
    PC1 --> PC2 --> PC3 --> PC4 --> PC5
    PA2 --> PC6 --> PC7 --> PC8
    PA3 --> PC9 --> PC10 --> PC11 --> PC12 --> PC13

    PC5 --> AR1
    PC13 --> AR1
    AR1 --> AR2 --> AR3

    AR3 --> FE1 --> FE2 --> FE3 --> FE4
    FE3 --> FE5
```

---

## 關鍵檔案索引

| 檔案路徑 | 職責 | 關鍵函數/行號 |
|---------|------|-------------|
| `src/app/(main)/read-book/page.tsx` | 前端 UI 與 SSE 消費 | `handleAskQuestion` (L1920-2400) |
| `src/app/api/perplexity-qa-stream/route.ts` | API 路由，SSE 生成 | `POST` handler (L32-251) |
| `src/ai/flows/perplexity-red-chamber-qa.ts` | AI Flow 入口 | `perplexityRedChamberQAStreaming` (L188-336) |
| `src/lib/perplexity-client.ts` | Perplexity API 客戶端 | `streamingCompletionRequest` (L506-1133) |
| `src/lib/streaming/perplexity-stream-processor.ts` | `<think>` 標籤處理 | `processChunk` (L101-466) |
| `src/lib/perplexity-thinking-utils.ts` | 思考內容清理工具 | `sanitizeThinkingContent` (L78-103) |
| `src/types/perplexity-qa.ts` | 類型定義 | `PerplexityStreamingChunk` (L130-157) |

---

## 調試建議

### 1. 啟用詳細日誌
```bash
# 設置環境變數
PERPLEXITY_DEBUG=true
```

### 2. 檢查關鍵日誌輸出

**後端 (Vercel Functions Logs / 終端機)**:
- `[StreamProcessor] 🔎 Sliding window check`
- `[StreamProcessor] 🔍 REMAINING CALCULATION DEBUG`
- `[HYPOTHESIS B] 🅱️ StreamProcessor Output Analysis`
- `[DONE] STREAM END SUMMARY`

**前端 (瀏覽器 F12 Console)**:
- `[QA Module] 🚀 AI 問答已觸發！`
- `[HYPOTHESIS B - Frontend] 🅱️ Chunk Received from Backend`
- `[QA Module] 🏁 FINAL STATE on [DONE]`

### 3. 驗證資料完整性

檢查最終 chunk 的 `fullContent` 是否包含預期的答案內容：
```javascript
// 在 [DONE] 時檢查
console.log('Final fullContent:', chunk.fullContent?.substring(0, 500));
console.log('Final thinkingContent:', chunk.thinkingContent?.substring(0, 200));
console.log('contentDerivedFromThinking:', chunk.contentDerivedFromThinking);
```

---

## 文件更新記錄

| 日期 | 版本 | 更新內容 |
|------|------|---------|
| 2025-12-03 | v1.0 | 初始版本：完整 streaming 流程分析 |
