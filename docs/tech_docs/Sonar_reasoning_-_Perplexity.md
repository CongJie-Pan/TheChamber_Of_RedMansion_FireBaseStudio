 `sonar-reasoning` 模型的完整 API 調用方法、計費結構與回傳格式分析。此模型主打結合「思維鏈 (Chain-of-Thought)」與「即時搜尋」功能。

### 1. API 基本資訊 (Basic Information)

*   **Endpoint (端點):** `https://api.perplexity.ai/chat/completions`
*   **Method (方法):** `POST`
*   **Content-Type:** `application/json`
*   **Model Name:** `sonar-reasoning`
*   **Context Window:** 128k tokens

### 2. 計費結構 (Pricing)

根據文件中的 "Cost Breakdown"，此模型的費用由「Token 用量」與「搜尋請求 (Requests)」兩部分組成：

| 項目 | 費率 | 說明 |
| :--- | :--- | :--- |
| **Input Tokens** | **$1.00** / 1M tokens | 提問與上下文輸入的費用 |
| **Output Tokens** | **$5.00** / 1M tokens | 模型生成回應的費用 |
| **Request (Search)** | **$5 - $12** / 1k requests | 依搜尋情境複雜度計費 (High/Medium/Low) |

*   **Request 費用細節**：
    *   Low: $5 / 1k requests (每次 $0.005)
    *   Medium: $8 / 1k requests (每次 $0.008)
    *   High: $12 / 1k requests (每次 $0.012)
*   **範例計算**：文件中範例為 "Low" 搜尋情境，單次請求成本約為 $0.013 (Input + Output + Request)。

### 3. 請求參數 (Request Body)

最精簡的請求僅需包含 `model` 與 `messages`。

```json
{
  "model": "sonar-reasoning",
  "messages": [
    {
      "role": "user",
      "content": "您的提問內容"
    }
  ]
}
```

### 4. 呼叫範例 (Code Examples)

針對您常用的開發環境，提供 cURL 與 Python (適合您的 VS Code 流程) 兩種寫法。

#### Option A: cURL (CLI)
```bash
curl --request POST \
     --url https://api.perplexity.ai/chat/completions \
     --header "Authorization: Bearer <YOUR_API_TOKEN>" \
     --header "Content-Type: application/json" \
     --data '{
       "model": "sonar-reasoning",
       "messages": [
         {
           "role": "user",
           "content": "Provide an in-depth analysis of the impact of AI on global job markets."
         }
       ]
     }'
```

#### Option B: Python (Requests Library)
```python
import requests
import json

url = "https://api.perplexity.ai/chat/completions"

payload = {
    "model": "sonar-reasoning",
    "messages": [
        {
            "role": "user",
            "content": "Provide an in-depth analysis of the impact of AI on global job markets."
        }
    ]
}

headers = {
    "Authorization": "Bearer <YOUR_API_TOKEN>",
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)

# 解析回應並印出
if response.status_code == 200:
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
else:
    print(f"Error: {response.status_code}, {response.text}")
```

### 5. 回傳資料結構 (Response Structure)

`sonar-reasoning` 的回傳包含一般 LLM 的回應外，還多了搜尋引用 (`citations`) 與搜尋結果詳情 (`search_results`)。

*   **choices.message.content**: 模型的最終回答 (包含 `<think>` 標籤內的思考過程與 Markdown 格式的正文)。
*   **citations**: 引用來源的 URL 列表。
*   **search_results**: 詳細的搜尋來源資訊 (標題、URL、摘要、日期)。
*   **usage**: 詳細的 Token 使用量與成本計算。

**回傳 JSON 範例結構：**
```json
{
  "id": "2c87a264-...",
  "model": "sonar-reasoning",
  "object": "chat.completion",
  "created": 1756486636,
  "choices": [
    {
      "index": 0,
      "finish_reason": "stop",
      "message": {
        "role": "assistant",
        "content": "<think>...\n</think>\nArtificial intelligence is fundamentally reshaping..."
      }
    }
  ],
  "citations": [
    "https://www.nexford.edu/insights/how-will-ai-affect-jobs",
    "..."
  ],
  "search_results": [
    {
      "title": "How will Artificial Intelligence Affect Jobs 2025-2030",
      "url": "https://www.nexford.edu/insights/how-will-ai-affect-jobs",
      "snippet": "..."
    }
  ],
  "usage": {
    "prompt_tokens": 19,
    "completion_tokens": 1531,
    "total_tokens": 1550,
    "search_context_size": "low"
  }
}
```

### 重點摘要
*   **思考過程**: 回應內容開頭會包含 `<think>` 標籤，顯示模型的 CoT 推理過程，這對您研究 AI 認知模型或除錯 Prompt 很有幫助 。[1]
*   **引用整合**: 不需要額外參數，回應自動包含 `citations` 和 `search_results`，方便您進行數位人文研究時的資料溯源 。[1]

[1](https://docs.perplexity.ai/getting-started/models/models/sonar-reasoning)