# 總系統
1. 提高每頁compliling的效率時間 提升至3-5秒內完成

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

2. 點開評論，不要顯示載入評論的loading畫面。而是要像普通社群媒體一樣，點開就能直接看到了。(claude continue)

3. [x] 解決按讚和評論時間過長的問題。按讚和評論，完成其功能都要等個5-10秒，非常奇怪。

---

# 成就與目標

1. 經驗值到了升等的時候，並沒有進行升等。例如，92 exps 但沒有升等動畫到 Level 1。
2. 並且像是這些，都沒有實際的功能:

虛擬居所
--> 榮府外院

已解鎖內容
--> 入門指南
--> 基礎人物介紹

專屬獎勵
--> 訪客木框
--> 新來者徽章
3. 我獲得的成就部分: 每個成就不需要有 分享和查看詳情按鈕。
4. 然後"學習進度總覽" 要根據實際的資料去呈現，目前還只是前端雛形而已。

---

# 每日修身

將每日任務的部分 改為像得到app那樣的"計畫"介面，包含日曆。可以先用ppt設計界面樣子，讓ai去實現。然後，學習挑戰賽的功能也要實際做。