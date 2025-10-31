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

[x] 任務生成功能失敗之關鍵模組定位:                                                                                                                                                                      
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
[x] 此外，不需要詩詞韻律，那樣背誦的任務，因為答案可以複製貼上。
[x] 每日修身，點開"文化探秘 - 傳統啟蒙" 沒有產生任務內容。
[x] 增加執行效率，解決 Linter Problem

[] 資料庫問題
  - 需要增加刪除帳戶的按鈕功能(在用戶設定那)
  - continue run the tests of the bugs

### 10/31 bugs

1. 為何我打開閱讀頁面，node終端就會持續的刷訊息，例如終端持續刷以下訊息:
- 📖 [API /user/profile] Fetching profile for user: aa6c084b-a092-4c6e-a8a6-ff7d05b1fd31

    SELECT * FROM users WHERE id = 'aa6c084b-a092-4c6e-a8a6-ff7d05b1'/*+4 bytes*/

✅ [API /user/profile] Profile fetched successfully for aa6c084b-a092-4c6e-a8a6-ff7d05b1fd31
 GET /api/user/profile?userId=aa6c084b-a092-4c6e-a8a6-ff7d05b1fd31 200 in 60ms
🎁 [API] Awarding 15 XP to user aa6c084b-a092-4c6e-a8a6-ff7d05b1fd31 for: Welcome to reading! First-time reader bonus
🗄️  [UserLevelService] Awarding XP: aa6c084b-a092-4c6e-a8a6-ff7d05b1fd31, amount=15, source=reading, sourceId=welcome-bonus-aa6c084b-a092-4c6e-a8a6-ff7d05b1fd31

    SELECT COUNT(*) as count
    FROM xp_transaction_locks
    WHERE userId = 'aa6c084b-a092-4c6e-a8a6-ff7d05b1'/*+4 bytes*/ AND sourceId = 'welcome-bonus-aa6c084b-a092-4c6e'/*+18 bytes*/

2. 圖譜節點會持續抖動、並且用戶不能隨意縮放大小，只要用戶進行縮放動作，就會自動回調到0.5x

3. 每日任務 : 

每日任務 會持續的進行任務輸出，是不是沒有個限制，就只要兩個任務就好。希望的話可以把系統開啟後，就自動進行任務產出工作，否則不要讓用戶等太久。也不要每次開啟該頁面就是要重刷重產出一次。

4. 當我給了任務的答案後，就會出現以下訊息:

## Error Type
Console ReferenceError

## Error Message
dailyTaskService is not defined


    at loadDailyTasks (webpack-internal:///(app-pages-browser)/./src/app/(main)/daily-tasks/page.tsx:335:34)

Next.js version: 15.5.6 (Webpack)

然後頁面顯示:
載入失敗
無法載入每日任務，請稍後再試。

終端有gpt的回應，但是沒法顯示，系統看來是標示為完成(主頁顯示)，但是我只完成一個，但是主頁的狀態說我都已經全完成(1 / 1 完成)，正確來講，是會有兩個任務，這裡邏輯出了什麼問題。並且先前終端有出現這個訊息:

  297 |
> 298 |       stmt.run(
      |            ^
  299 |         id,
  300 |         taskType,
  301 |         difficulty, {
  code: 'SQLITE_CONSTRAINT_NOTNULL'
}
D:\AboutUniversity\114 NSTC_and_SeniorProject\2025-IM-senior-project\TheChamber_Of_RedMansion_FireBaseStudio\node_modules\next\dist\server\next-server.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: TypeError [ERR_INVALID_ARG_TYPE]: The "payload" argument must be of type object. Received null
D:\AboutUniversity\114 NSTC_and_SeniorProject\2025-IM-senior-project\TheChamber_Of_RedMansion_FireBaseStudio\node_modules\next\dist\server\dev\next-dev-server.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: TypeError [ERR_INVALID_ARG_TYPE]: The "payload" argument must be of type object. Received null
D:\AboutUniversity\114 NSTC_and_SeniorProject\2025-IM-senior-project\TheChamber_Of_RedMansion_FireBaseStudio\node_modules\next\dist\trace\trace.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: TypeError [ERR_INVALID_ARG_TYPE]: The "payload" argument must be of type object. Received null  
D:\AboutUniversity\114 NSTC_and_SeniorProject\2025-IM-senior-project\TheChamber_Of_RedMansion_FireBaseStudio\node_modules\next\dist\server\lib\router-server.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: TypeError [ERR_INVALID_ARG_TYPE]: The "payload" argument must be of type object. Received null
D:\AboutUniversity\114 NSTC_and_SeniorProject\2025-IM-senior-project\TheChamber_Of_RedMansion_FireBaseStudio\node_modules\next\dist\server\lib\start-server.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: TypeError [ERR_INVALID_ARG_TYPE]: The "payload" argument must be of type object. Received null
Generate daily tasks failed, falling back to ephemeral tasks: Error: Failed to generate daily tasks. Please try again.
    at DailyTaskService.generateDailyTasks (src\lib\daily-task-service.ts:319:13)
    at async POST (src\app\api\daily-tasks\generate\route.ts:62:19)
  317 |     } catch (error) {
  318 |       console.error('Error generating daily tasks:', error);
> 319 |       throw new Error('Failed to generate daily tasks. Please try again.');
      |             ^
  320 |     }
  321 |   }
  322 |
  
3. 當我在社群上發送"你好"的文後，出現以下錯誤:
1) ## Error Type
Console Error

## Error Message
Each child in a list should have a unique "key" prop.

Check the render method of `CommunityPage`. See https://react.dev/link/warning-keys for more information.


    at eval (webpack-internal:///(app-pages-browser)/./src/app/(main)/community/page.tsx:1532:152)
    at Array.map (<anonymous>:null:null)
    at CommunityPage (webpack-internal:///(app-pages-browser)/./src/app/(main)/community/page.tsx:1532:65)

Next.js version: 15.5.6 (Webpack)

## Error Type
Console Error

## Error Message
Failed to fetch posts (500)


    at fetchPosts (webpack-internal:///(app-pages-browser)/./src/app/(main)/community/page.tsx:929:15)
    at async loadPosts (webpack-internal:///(app-pages-browser)/./src/app/(main)/community/page.tsx:1099:35)

Next.js version: 15.5.6 (Webpack)

D:\AboutUniversity\114 NSTC_and_SeniorProject\2025-IM-senior-project\TheChamber_Of_RedMansion_FireBaseStudio\node_modules\next\dist\server\lib\start-server.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: TypeError [ERR_INVALID_ARG_TYPE]: The "payload" argument must be of type object. Received null
❌ [API] Error fetching posts: SyntaxError: Unexpected token 'a', "allow" is not valid JSON
    at JSON.parse (<anonymous>)
    at rowToPost (src\lib\repositories\community-repository.ts:100:51)
    at Array.map (<anonymous>)
    at getPosts (src\lib\repositories\community-repository.ts:242:15)
    at CommunityService.getPosts (src\lib\community-service.ts:194:39)
    at GET (src\app\api\community\posts\route.ts:206:42)
   98 |     status: row.status,
   99 |     isEdited: row.isEdited === 1,
> 100 |     moderationAction: row.moderationAction ? JSON.parse(row.moderationAction) : undefined,
      |                                                   ^
  101 |     originalContent: row.originalContent || undefined,
  102 |     moderationWarning: row.moderationWarning || undefined,
  103 |     createdAt: fromUnixTimestamp(row.createdAt),
 GET /api/community/posts? 500 in 136ms
D:\AboutUniversity\114 NSTC_and_SeniorProject\2025-IM-senior-project\TheChamber_Of_RedMansion_FireBaseStudio\node_modules\next\dist\server\dev\middleware-webpack.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: TypeError [ERR_INVALID_ARG_TYPE]: The "payload" argument must be of type object. Received null
D:\AboutUniversity\114 NSTC_and_SeniorProject\2025-IM-senior-project\TheChamber_Of_RedMansion_FireBaseStudio\node_modules\next\dist\server\lib\router-server.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: TypeError [ERR_INVALID_ARG_TYPE]: The "payload" argument must be of type object. Received null
D:\AboutUniversity\114 NSTC_and_SeniorProject\2025-IM-senior-project\TheChamber_Of_RedMansion_FireBaseStudio\node_modules\next\dist\server\lib\start-server.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: TypeError [ERR_INVALID_ARG_TYPE]: The "payload" argument must be of type object. Received null
[Error: x: Invalid source map. Only conformant source maps can be used to find the original code.] {
  [cause]: [Error: ENOENT: no such file or directory, open 'D:\AboutUniversity\114 NSTC_and_SeniorProject\2025-IM-senior-project\TheChamber_Of_RedMansion_FireBaseStudio\node_modules\next\dist\compiled\source-map08\mappings.wasm'] {
    errno: -4058,
    code: 'ENOENT',
    syscall: 'open',
    path: 'D:\\AboutUniversity\\114 NSTC_and_SeniorProject\\2025-IM-senior-project\\TheChamber_Of_RedMansion_FireBaseStudio\\node_modules\\next\\dist\\compiled\\source-map08\\mappings.wasm'
  }
}

然後按讚、評論也無法，會顯示以下訊息:

## Error Type
Console Error

## Error Message
Failed to like post (404)


    at togglePostLikeAPI (webpack-internal:///(app-pages-browser)/./src/app/(main)/community/page.tsx:991:19)
    at async handleLike (webpack-internal:///(app-pages-browser)/./src/app/(main)/community/page.tsx:1196:33)
    at async handleLike (webpack-internal:///(app-pages-browser)/./src/app/(main)/community/page.tsx:338:29)

Next.js version: 15.5.6 (Webpack)

## Error Type
Console Error

## Error Message
Failed to add comment


    at addCommentAPI (webpack-internal:///(app-pages-browser)/./src/app/(main)/community/page.tsx:1050:15)
    at async handleComment (webpack-internal:///(app-pages-browser)/./src/app/(main)/community/page.tsx:1248:28)
    at async handleSubmitComment (webpack-internal:///(app-pages-browser)/./src/app/(main)/community/page.tsx:384:13)

Next.js version: 15.5.6 (Webpack)

5. 當我在ai問答區域，按下了送出ai問答內容後，就出現以下錯誤，並且把ai問答的框框區域收走了

## Error Type
Console Error

## Error Message
Invalid request data


    at awardXP (webpack-internal:///(app-pages-browser)/./src/app/(main)/read-book/page.tsx:374:15)
    at async handleUserSubmitQuestion (webpack-internal:///(app-pages-browser)/./src/app/(main)/read-book/page.tsx:1416:44)

Next.js version: 15.5.6 (Webpack)

[] 建立一個專門的測試帳號(作為訪客帳號)，這個帳號專門就是將經驗值定在70 exp，且為全新紀錄的帳號，每次重開伺服器，就會重回這個設定。然後此帳號，設定成每日任務先固定(原有動態產出任務，先隱藏此任務)，然後給ai作評分就好。

[] 登入畫面中，歡迎回來上面的書卷請改為"public\images\logo_circle.png"

[] 提高每頁compliling的效率時間 提升至3-5秒內完成

[] i use npm not pnpm , is there other ways to prevent repeatly rebuild the db ?

[] 最後測試 (Smoking Test)

