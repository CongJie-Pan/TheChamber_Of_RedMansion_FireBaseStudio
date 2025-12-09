# Perplexity Stream Adapter 冒煙測試指南

> **文件建立日期**：2025-12-08
> **關聯任務**：PRX-010 (Phase 5)
> **目的**：驗證新的 PerplexityStreamAdapter 功能正確性

---

## 1. 環境設定

### 1.1 啟用新 Adapter

在 `.env.local` 中添加以下環境變數：

```bash
# 啟用新的 Perplexity Stream Adapter
PERPLEXITY_USE_NEW_ADAPTER=true

# 啟用除錯日誌（可選，用於診斷問題）
PERPLEXITY_DEBUG_ADAPTER=true
```

### 1.2 使用百分比流量控制（漸進式測試）

如果想要進行漸進式測試，可以使用百分比控制：

```bash
# 10% 的請求使用新 Adapter
PERPLEXITY_NEW_ADAPTER_PERCENTAGE=10

# 記得關閉強制開關
# PERPLEXITY_USE_NEW_ADAPTER=false  # 或移除此行
```

### 1.3 確認 Perplexity API 金鑰已設定

```bash
PERPLEXITYAI_API_KEY=pplx-xxxxxxxxxxxxxxxxxxxxx
```

---

## 2. 冒煙測試清單

### 2.1 基本問答功能

| 測試項目 | 測試步驟 | 預期結果 | 通過 |
|---------|---------|---------|------|
| 簡單問答 | 輸入「你好」 | 收到正常中文回應 | [ ] |
| 紅樓夢問題 | 輸入「林黛玉的性格特點是什麼？」 | 收到專業的文學分析回答 | [ ] |
| 長問題處理 | 輸入超過 200 字的問題 | 正常回應，無超時錯誤 | [ ] |

### 2.2 思考過程顯示

| 測試項目 | 測試步驟 | 預期結果 | 通過 |
|---------|---------|---------|------|
| 思考開始 | 使用 sonar-reasoning 模型提問 | UI 顯示「思考中...」狀態 | [ ] |
| 思考內容 | 觀察回應過程 | 可看到 AI 思考過程文字 | [ ] |
| 思考結束 | 等待回應完成 | 思考過程正確結束，顯示最終答案 | [ ] |

### 2.3 串流回應

| 測試項目 | 測試步驟 | 預期結果 | 通過 |
|---------|---------|---------|------|
| 逐字顯示 | 觀察回應過程 | 文字逐步出現，非一次性顯示 | [ ] |
| Loading 狀態 | 觀察 UI 狀態 | 回應中顯示 loading，完成後消失 | [ ] |
| 回應時間 | 記錄從提問到首字的時間 | < 5 秒（正常網路條件下） | [ ] |

### 2.4 引用來源

| 測試項目 | 測試步驟 | 預期結果 | 通過 |
|---------|---------|---------|------|
| 引用顯示 | 提問後查看回應 | 回應包含引用標記 [1], [2] 等 | [ ] |
| 引用連結 | 點擊引用來源 | 可正確開啟來源網頁 | [ ] |
| 引用數量 | 檢查引用數量 | 至少有 1 個有效引用 | [ ] |

### 2.5 取消功能

| 測試項目 | 測試步驟 | 預期結果 | 通過 |
|---------|---------|---------|------|
| 取消請求 | 在回應過程中點擊取消 | 串流正確中止，無錯誤訊息 | [ ] |
| 取消後狀態 | 取消後檢查 UI | UI 恢復正常，可繼續提問 | [ ] |
| 資源清理 | 取消後檢查 console | 無 unhandled promise rejection | [ ] |

### 2.6 錯誤處理

| 測試項目 | 測試步驟 | 預期結果 | 通過 |
|---------|---------|---------|------|
| 空問題 | 提交空白問題 | 顯示驗證錯誤訊息 | [ ] |
| 超長問題 | 輸入超過 1000 字的問題 | 顯示長度限制錯誤 | [ ] |
| 網路錯誤 | 斷網後提問 | 顯示友善的錯誤訊息 | [ ] |

---

## 3. 效能比較

### 3.1 收集指標

執行相同的測試問題，分別使用新舊 Adapter，記錄以下指標：

| 指標 | 舊 Adapter | 新 Adapter | 差異 |
|------|-----------|-----------|------|
| 首字回應時間 (TTFB) | ___秒 | ___秒 | ___% |
| 完整回應時間 | ___秒 | ___秒 | ___% |
| 記憶體使用量 | ___MB | ___MB | ___% |

### 3.2 效能要求

- 首字回應時間差異：< 20%
- 完整回應時間差異：< 20%
- 無明顯記憶體洩漏

---

## 4. Console 日誌檢查

### 4.1 預期日誌（啟用 DEBUG）

當 `PERPLEXITY_DEBUG_ADAPTER=true` 時，應看到以下日誌：

```
[PerplexityFeatureFlag] Using new adapter (flag enabled)
[perplexity-red-chamber-qa] Using NEW PerplexityStreamAdapter
[SimpleChatStream] Starting request: { url: ..., model: ..., messageCount: ... }
[SimpleChatStream] Stream started, reading chunks...
[SimpleChatStream] Received [DONE] signal
[PerplexityStreamAdapter] Stream completed { totalChunks: ..., fullContentLength: ... }
```

### 4.2 異常日誌（需要關注）

如果看到以下日誌，表示有問題需要調查：

```
[SimpleChatStream] Failed to parse chunk: ...
[SimpleChatStream] Error: ...
[PerplexityStreamAdapter] Stream error: ...
```

---

## 5. 測試執行記錄

### 測試環境

- 日期：____________
- 測試人員：____________
- 環境：開發 / 測試 / 正式
- 瀏覽器：____________
- 網路條件：____________

### 測試結果摘要

- 總測試項目：18
- 通過項目：____
- 失敗項目：____
- 通過率：____%

### 發現的問題

| 問題編號 | 問題描述 | 嚴重程度 | 狀態 |
|---------|---------|---------|------|
| #1 | | | |
| #2 | | | |
| #3 | | | |

---

## 6. 回滾程序

如果測試發現嚴重問題，執行以下回滾步驟：

1. 在 `.env.local` 中設定：
   ```bash
   PERPLEXITY_USE_NEW_ADAPTER=false
   PERPLEXITY_NEW_ADAPTER_PERCENTAGE=0
   ```

2. 重新啟動開發伺服器

3. 確認已回滾到舊 Adapter：
   ```
   [perplexity-red-chamber-qa] Using LEGACY PerplexityClient
   ```

---

*文件撰寫者：Claude Code*
*最後更新：2025-12-08*
