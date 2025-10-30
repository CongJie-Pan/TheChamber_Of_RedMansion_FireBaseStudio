1101_necessaryWorkLists

---

[] 閱讀介面筆記文字，在搜尋中無法有不會有underline黃色。(是否是畫紅色的線不能和underline黃色同時存在?)
[x] 閱讀頁面 當閱讀完第一回和ai問答後，應該是加總44exp 但得到的卻是88
[x] 當我在紅學社累積到level 1 經驗值時，不會有升等動畫。(讓升等動畫只要觸發升等都會顯示)
[x] 我在閱讀頁面閱讀完第一回、問了ai應該是，20+25 = 45 才對，怎麼回到主頁exp就變成55了
[x] 怎麼我才在社群發一個評論獲得2 exp 回到主頁看，原本 55 就已經變成98exp了? 這是不是把每日修身沒有加到的35 exp 加進去了 ?
[x] 社群按讚 計入的exp不能重複。讚數是要看帳號的，如果是同一支帳號按重複同一篇文 就不能計入exp 
[x] 首頁頁面的 我的學習目標 (示例) 不用顯示其Panel 功能
[x] 當評論是屬於敏感的信息被屏蔽掉的，就不能有經驗值。

[x] 當詩詞韻律的任務的答案送出時，可是返回的卻是程式硬寫好的內容，不是GPT-5-mini的回傳。並返回以下錯誤

( GET /daily-tasks 200 in 2611ms
 ⨯ [Error [GenkitError]: FAILED_PRECONDITION: Please pass in the API key or set the GEMINI_API_KEY or GOOGLE_API_KEY environment variable.
For more details see https://firebase.google.com/docs/genkit/plugins/google-genai] {
  source: undefined,
  status: 'FAILED_PRECONDITION',
  detail: undefined,
  code: 400,
  originalMessage: 'Please pass in the API key or set the GEMINI_API_KEY or GOOGLE_API_KEY environment variable.\n' +
    'For more details see https://firebase.google.com/docs/genkit/plugins/google-genai',
  traceId: 'c6728b9ac6039519cc98bd99f5e64dfe',
  digest: '4238146825'
}
 POST /daily-tasks 500 in 5518ms) 

[] 任務生成功能失敗之關鍵模組定位:                                                                                                                                                                      
  - 主要根因: docs/structure_module_infoMD/Core Service Modules/sqlite-db_module_info.md                                                                                 
      - better‑sqlite3 原生模組架構不相容導致 SQLite 初始化失敗 → 服務改用 Firebase 後又遇到權限不足，造成「每日任務不持久化、刷新重生」、「EXP 不更新」等連鎖問題。     
                                                                                                                                                                         
  問題對應模組                                                                                                                                                 
  - 問題 1（載入太慢、應先顯示頁面再背景生成）                                                                                                                           
      - UI 狀態顯示：docs/structure_module_infoMD/Daily Task Component Modules/TaskCard_module_info.md、DailyTasksSummary_module_info.md（任務卡應顯示「載入中」狀態）。 
  - 問題 2（刷新即重產，應每日一次）
      - docs/structure_module_infoMD/Core Service Modules/daily-task-service_module_info.md：應先查詢當日進度再決定是否生成；目前因持久層失敗走「短暫任務(ephemeral)」導 
        致每次刷新重產。
      - docs/structure_module_infoMD/Core Service Modules/sqlite-db_module_info.md：SQLite 無法啟動是直接原因。
      - docs/structure_module_infoMD/Core Service Modules/firebase_module_info.md、firebase-admin_module_info.md：Firebase 權限不足（permission-denied）使得持久化       
        fallback 也失敗。
      - 定時預生成（避免進頁才等生成）：docs/structure_module_infoMD/API_Route_Modules/cron_reset_daily_tasks_module_info.md。
  - 問題 3（完成後 EXP 不自動更新）
      - docs/structure_module_infoMD/API_Route_Modules/daily_tasks_submit_module_info.md：提交/評分/獎勵發放的 API 路徑。
      - docs/structure_module_infoMD/Core Service Modules/user-level-service_module_info.md：XP 發放與等級邏輯；若持久化層失敗則不會落盤更新。
      - 資料層同前：sqlite-db_module_info.md、firebase_module_info.md（權限/持久化失敗）。
  - 問題 4（終端錯誤：OpenAI timeout、better-sqlite3、Firebase 權限）
      - OpenAI 超時與回退：docs/structure_module_infoMD/Core Service Modules/ai-feedback-generator_module_info.md、openai-client_module_info.md。
      - SQLite 架構不相容：docs/structure_module_infoMD/Core Service Modules/sqlite-db_module_info.md。
      - Firebase 權限不足：docs/structure_module_infoMD/Core Service Modules/firebase_module_info.md、firebase-admin_module_info.md。

  結論

  - 單一最核心的問題模組在 Core Service Modules/sqlite-db_module_info.md（SQLite 初始化失敗）；
  - 其直接牽動 daily-task-service 與兩個 API 路由（generate/submit），以及 user-level-service 的 XP 落盤；
  - UI 僅需補齊「生成中」的狀態顯示，但根因仍在資料層與服務編排模組上。

[x] 資料庫遷移至本地SQL Lite 、刪除Google模型
[] 儀錶板功能完善、雙欄模式正常，主頁TaskBar UI 改善
  - 請修正雙欄模式為可以左右鍵正常翻頁的功能，目前沒法這樣。
  - [x] 主頁TASKBar 的ui 很普通，請改個較為美觀簡約一些，如果可以的話，希望hover每個btn有古典中國窗的效果
  - [x] 介紹頁裡面有圖不能正確顯示，並且語言設定沒有成效。
  - [x] 介紹頁
    - 左上角的logo需要和最左側的邊界有隔距離，而不是和紅樓慧讀 隔距離
    - 探索學習內容下方的每個區塊的文字需要調整
    - 刪除: 已有超過 1,200 名學習者選擇了我們的平台
    - 沒有轉成思源宋體
[] 此外，不需要詩詞韻律，那樣背誦的任務，因為答案可以複製貼上。
[] 每日修身，點開"文化探秘 - 傳統啟蒙" 沒有產生任務內容。
[] 增加執行效率，解決 Linter Problem

[] 資料庫問題
  - 需要增加刪除帳戶的按鈕功能(在用戶設定那)
  - continue run the tests of the bugs

[] 最後測試 (Smoking Test)

