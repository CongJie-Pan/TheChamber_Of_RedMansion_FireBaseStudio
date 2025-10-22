2025/10/21 Start

一、每日修身問題修復:

1. [x]當我在每日修身的今日任務完成第一項與第二項時，任務完成視窗超出去了，被截掉如同圖("temp\everyDayTask_bug01.jpg")
2. [x] 並且那些literayTalent、aestheticSense、culturalInsight等成就的名字都改成繁體中文呈現。
3. [x] 每日修身的第一項工作任務，沒有實際的內容。
4. [x] 便於我進行檢核測試，請在我重新登入時，將每日修身紀錄重刷，不要今天的紀錄(但是之前幾天的不要移除)。
5. [] 每日修身部分，AI 評語部分請實際接GPT-5-Mini來給實際的評語，很明顯如以下評語就是內嵌的"基本達標，繼續加油！建議深入思考文本含義。" 我打的答案只有0000000000，根本沒有回答道。並且任務的內容，也使用GPT-5-Mini根據用戶資料和任務主題要求，來適配性的產出。
6. [x] 而且完成今日任務清單，經驗值沒有相對應如上所寫增加。
7. [] 請你測試"連續天數"功能是否正常，寫個測試，測試一下，我今天是填了，但我今天想看的效果是，明天填了天數會不會積累。
8. [] 日曆的部分好像沒功能，點了其她日期沒有效果。這裡的設計可以就是這樣: 用戶可以點回今天和之前七天的每日修身內容，今天之後的因為還沒到，所以都先關閉不能進入。讓用戶給七天的回溯期，可以補填，也同樣可以獲得積分。然後填完成的天數就在日曆上，針對該天數打個勾。
9. [] 出現以下錯誤:
FirebaseError: The query requires an index. You can create it here: https://console.firebase.google.com/v1/r/project/redmansion-learning/firestore/indexes?create_composite=Clxwcm9qZWN0cy9yZWRtYW5zaW9uLWxlYXJuaW5nL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9kYWlseVRhc2tIaXN0b3J5L2luZGV4ZXMvXxABGgoKBnVzZXJJZBABGg8KC2NvbXBsZXRlZEF0EAIaDAoIX19uYW1lX18QAg
10.  [x] 每日修身的任務完成後，我切換到首頁去看，還是沒有增加exp。請看看程式有無正確實現，每日修身是否正常會計算入exp裡面，要實時更新exp值的顯示(只要有顯示等級和exp值的地方)
- 出現以下錯誤:
GenkitError: INVALID_ARGUMENT: Schema validation failed. Parse Errors:

- (root): must have required property 'commentaryText'

Provided data:

{
  "relatedPassage": "",
  "chapterContext": "Chapter unknown",
  "userInterpretation": "000000000000000000000000000000000",
  "interpretationHints": [],
  "difficulty": "easy"
}

Required JSON schema:

{
  "type": "object",
  "properties": {
    "commentaryText": {
      "type": "string",
      "description": "The original Zhiyanzhai commentary text from Red Mansion. This is the annotation being interpreted."
    },
    "relatedPassage": {
      "type": "string",
      "description": "The text passage from the novel that the commentary refers to. Provides context for interpretation."
    },
    "chapterContext": {
      "type": "string",
      "description": "Chapter number and context information. Helps understand the narrative position."
    },
    "userInterpretation": {
      "type": "string",
      "description": "The user's interpretation or explanation of what the commentary means. This will be evaluated for insight and accuracy."
    },
    "interpretationHints": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Key themes or symbolic meanings that the commentary typically reveals (e.g., foreshadowing, symbolism, character fate)."
    },
    "difficulty": {
      "type": "string",
      "enum": [
        "easy",
        "medium",
        "hard"
      ],
      "description": "The difficulty level of the commentary interpretation task. Affects scoring criteria."
    }
  },
  "required": [
    "commentaryText",
    "relatedPassage",
    "chapterContext",
    "userInterpretation",
    "interpretationHints",
    "difficulty"
  ],
  "additionalProperties": true,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
    at scoreCommentaryInterpretation (rsc://React/Server/webpack-internal:///(action-browser)/./src/ai/flows/commentary-interpretation.ts?12:190:12)
    at resolveErrorDev (webpack-internal:///(app-pages-browser)/./node_modules/.pnpm/next@15.3.2_@babel+core@7.2_318988dcf2d48d4260958dd8ed9d9c48/node_modules/next/dist/compiled/react-server-dom-webpack/cjs/react-server-dom-webpack-client.browser.development.js:1865:46)
    at processFullStringRow (webpack-internal:///(app-pages-browser)/./node_modules/.pnpm/next@15.3.2_@babel+core@7.2_318988dcf2d48d4260958dd8ed9d9c48/node_modules/next/dist/compiled/react-server-dom-webpack/cjs/react-server-dom-webpack-client.browser.development.js:2245:17)
    at processFullBinaryRow (webpack-internal:///(app-pages-browser)/./node_modules/.pnpm/next@15.3.2_@babel+core@7.2_318988dcf2d48d4260958dd8ed9d9c48/node_modules/next/dist/compiled/react-server-dom-webpack/cjs/react-server-dom-webpack-client.browser.development.js:2233:7)
    at progress (webpack-internal:///(app-pages-browser)/./node_modules/.pnpm/next@15.3.2_@babel+core@7.2_318988dcf2d48d4260958dd8ed9d9c48/node_modules/next/dist/compiled/react-server-dom-webpack/cjs/react-server-dom-webpack-client.browser.development.js:2479:17)

二、成就與目標頁面
1. [x] 刪除"下一步目標" Panel 這功能不需要
2. [x] 刪除"設定新的學習目標" Panel 這功能不需要
3. [x] "學習挑戰賽" Panel 此功能請移至每日修身，並把每日修身，改為"每日修身/挑戰賽"。並真正實作其挑戰賽功能
4. [x] 請把其中所有"權限"的名字改為繁體中文，並且不要顯示，權限的東西不要展示給用戶看。然後針對下一等級的提示不要講"新權限已解鎖: ..." 要講會有解鎖甚麼專屬獎勵。用戶心理是不喜歡被約束的，而是喜歡得到，不失歡失去的，講權限會覺得這是應該屬於我的東西，而被剝奪的感覺，這在用戶體驗設計上不好。 
5. [x] 已解鎖內容和專屬獎勵，這些也請都翻譯為繁體中文。