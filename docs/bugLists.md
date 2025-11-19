# 總系統
1. 提高每頁compliling的效率時間 提升至3-5秒內完成
2. loading畫面的預期效果沒有達成，我要的是logo旁邊 會有一圈loading的載入循環動畫。目前就看起來只是像logo旁邊有個白色邊框而已。
3. 主頁的ui畫面跑掉了，當右滑scroll bar，就會發生此情形。如 temp\mainPage_Bug.jpg
4. 在帳戶設置頁面，需要有可以更改用戶名稱、與忘記密碼更改的功能，

---

# Community 紅學社群

1. [x] 當點開留言評論與留評論後，出現以下錯誤。 

(1) 

Error Type
Console Error

Error Message
Failed to fetch comments (500)


    at fetchComments (webpack-internal:///(app-pages-browser)/./src/app/(main)/community/page.tsx:1090:15)
    at async loadComments (webpack-internal:///(app-pages-browser)/./src/app/(main)/community/page.tsx:379:38)

Next.js version: 15.5.6 (Webpack)

(2)

Error Type
Console Error

Error Message
Failed to fetch comments (500)


    at fetchComments (webpack-internal:///(app-pages-browser)/./src/app/(main)/community/page.tsx:1090:15)
    at async PostCard.useEffect.loadCommentsData (webpack-internal:///(app-pages-browser)/./src/app/(main)/community/page.tsx:322:50)

Next.js version: 15.5.6 (Webpack)

(3)

Error Type
Console Error

Error Message
Failed to fetch comments (500)


    at fetchComments (webpack-internal:///(app-pages-browser)/./src/app/(main)/community/page.tsx:1090:15)
    at async refreshComments (webpack-internal:///(app-pages-browser)/./src/app/(main)/community/page.tsx:396:38)
    at async handleSubmitComment (webpack-internal:///(app-pages-browser)/./src/app/(main)/community/page.tsx:426:13)

Next.js version: 15.5.6 (Webpack)

--> continue the debug in "To continue this session, run codex resume 019a8688-52fc-7cd0-83e1-3037064c4f2a"

2. [x] 點開評論，不要顯示載入評論的loading畫面。而是要像普通社群媒體一樣，點開就能直接看到了。(claude continue)

3. [x] 解決按讚和評論時間過長的問題。按讚和評論，完成其功能都要等個5-10秒，非常奇怪。

---

# 成就與目標

1. [x] 經驗值到了升等的時候，並沒有進行升等。例如，92 exps 但沒有升等動畫到 Level 1。[修復完成 待驗證]
   codex resume 019a99f9-cdde-7943-9bc5-b0ff7f36f278
2. 並且像是這些，都沒有實際的功能:

虛擬居所
--> 榮府外院

已解鎖內容
--> 入門指南
--> 基礎人物介紹

專屬獎勵
--> 訪客木框
--> 新來者徽章
3. [x] 我獲得的成就部分: 每個成就不需要有 分享和查看詳情按鈕。[修復完成 待驗證]
4. 然後"學習進度總覽" 要根據實際的資料去呈現，目前還只是前端雛形而已。
5. [x] 帳戶部分要有重置帳號的按鈕功能 [修復完成 待驗證]

---

# 每日修身

- [x] 每日修身的地方，當我完成其中一項任務後，就不會顯示另一個任務。例如，temp\dailyTASK_Bug.jpg。然後，我重新進來該每日修身page，就又會顯示"正在生成今日任務..."明明已經生成過了。[修復完成 2025-11-19]

  **根本原因分析：**
  1. `loadDailyTasks()` 在 useEffect 中未正確 await，導致 `hasLoadedTasksRef` 過早設定
  2. 任務完成後重載時，`getUserDailyProgress()` 因 SQLite 寫入時序問題可能返回 null
  3. API 失敗時 `setTasks([])` 無條件清空任務列表

  **修復方案：**
  1. 修復 useEffect 中 async/await 問題 - 確保 `hasLoadedTasksRef` 在 async 完成後才設定
  2. 添加 API 重試機制 - progress API 返回 null 時延遲 500ms 重試
  3. 實作樂觀更新 - 任務提交成功後立即更新本地狀態
  4. 修復狀態保護 - API 失敗時保留現有任務而非清空

  **修改檔案：** `src/app/(main)/daily-tasks/page.tsx`

- 我想將此部分，改為先預先生成好諸多題目，然後由開發者匯入，不要給ai生成題目了，速度太慢了。

將每日任務的部分 改為像得到app那樣的"計畫"介面，包含日曆。可以先用ppt設計界面樣子，讓ai去實現。然後，學習挑戰賽的功能也要實際做。

---

# 閱讀頁面

- AI 問答
  - 重新打開其Toggle 視窗，之前的對話內容會消失，要再重新輸入並送出query才會出現上次對話紀錄。
  - 目前送出query，並未如預期般的ai會進行答覆
  - 然後成就顯示只需要一次就好，例如心有疑，隨札記，成就只需要在頭一次觸發顯示通知就好，不需要時時通知。
- 補充至20回的內容(包含文字內容與圖譜)。
- 雙欄功能未實現完成，還有bug錯誤，只有顯示一半。如temp\BiColumnReadArea._Bugjpg.jpg所示。

**後續：將目前已知bug與問題列出來還有一些內容添加部分，並且列出工作清單，預計是否可以在11/25上線完成。**