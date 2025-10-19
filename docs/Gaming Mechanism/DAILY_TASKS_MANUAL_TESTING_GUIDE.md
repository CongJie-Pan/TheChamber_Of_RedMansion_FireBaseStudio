# Daily Task System - Manual Testing Guide

## Overview

This guide provides comprehensive manual testing procedures for the Daily Task System (GAME-002 Phase 4). Use this guide to validate all features when automated tests experience environment issues.

---

## Prerequisites

Before starting manual testing:

1. **Development Server Running**
   ```bash
   npm run dev
   ```
   Server should be accessible at `http://localhost:3000`

2. **Test User Accounts**
   - Create at least 3 test user accounts with different levels (0, 3, 6)
   - Note: Use different emails for each test user

3. **Browser DevTools Open**
   - Keep Console tab open to monitor logs
   - Keep Network tab open to monitor API calls

4. **Test Data Preparation**
   - Have sample responses ready for each task type
   - Prepare both good quality (>100 chars) and poor quality (<30 chars) responses

---

## Testing Protocol

### Phase 1: Unit-Level Feature Testing

#### Test Suite 1.1: Task Generation

**Objective**: Verify that tasks are correctly generated for users

**Test Case 1.1.1: First-Time Task Generation**
```
Steps:
1. Log in as new user (Level 0, 0 XP)
2. Navigate to /daily-tasks
3. Observe task generation

Expected Results:
✅ 3-5 tasks displayed
✅ All tasks have type, title, description, difficulty, XP reward
✅ Difficulty is mostly EASY for Level 0 users
✅ Each task has a unique sourceId
✅ Tasks saved to Firestore collection 'dailyTasks'

Pass/Fail: _______
Notes: _______________
```

**Test Case 1.1.2: Existing Tasks Retrieval**
```
Steps:
1. Log in as user who already has today's tasks
2. Navigate to /daily-tasks
3. Observe task loading

Expected Results:
✅ Same tasks from earlier are displayed (no new generation)
✅ Completed tasks show completion status
✅ Progress bar shows correct completion percentage
✅ No duplicate tasks created

Pass/Fail: _______
Notes: _______________
```

**Test Case 1.1.3: Difficulty Adaptation by Level**
```
Steps:
1. Test with 3 users: Level 0, Level 3, Level 6
2. For each user, generate tasks and note difficulty distribution

Expected Results:
✅ Level 0: Mostly EASY tasks
✅ Level 3: Mix of EASY and MEDIUM tasks
✅ Level 6: Mix of MEDIUM and HARD tasks
✅ Difficulty adapts to user capability

Pass/Fail: _______
Notes: _______________
```

**Test Case 1.1.4: Weekday Rotation**
```
Steps:
1. Manually change system date (or test across multiple days)
2. Generate tasks on Monday, Tuesday, Wednesday, Thursday, Friday

Expected Results:
✅ Monday: More MORNING_READING tasks (1.5x weight)
✅ Tuesday: More POETRY tasks (1.5x weight)
✅ Wednesday: More CHARACTER_INSIGHT tasks (1.5x weight)
✅ Thursday: More CULTURAL_EXPLORATION tasks (1.5x weight)
✅ Friday: More COMMENTARY_DECODE tasks (1.5x weight)
✅ Weekend: Balanced distribution

Pass/Fail: _______
Notes: _______________
```

---

#### Test Suite 1.2: Task Completion & Rewards

**Test Case 1.2.1: Basic Task Completion**
```
Steps:
1. Log in as test user
2. Click on first uncompleted task
3. Enter response (>50 chars): "這段文字展現了賈寶玉對林黛玉的深厚情感，通過細膩的心理描寫..."
4. Submit task

Expected Results:
✅ Task modal closes
✅ AI evaluation completes within 3 seconds
✅ Result modal displays score (0-100)
✅ XP awarded (10-50 based on difficulty)
✅ Coins awarded (5-25 based on difficulty)
✅ Toast notification shows "+XX XP"
✅ Progress bar updates
✅ Task marked as completed

Pass/Fail: _______
Score Received: _______
XP Awarded: _______
Time Taken: _______
```

**Test Case 1.2.2: Quality-Based Scoring**
```
Steps:
1. Complete same task type twice (different days)
2. First attempt: Short response (<30 chars) "這很好。"
3. Second attempt: Detailed response (>100 chars) with analysis

Expected Results:
✅ Short response: Lower score (40-60 range)
✅ Detailed response: Higher score (70-95 range)
✅ Quality impacts XP amount

Pass/Fail: _______
Short Response Score: _______
Detailed Response Score: _______
```

**Test Case 1.2.3: Attribute Rewards**
```
Steps:
1. Complete MORNING_READING task
2. Check user profile attributes

Expected Results:
✅ literaryTalent increased
✅ culturalInsight increased
✅ Attribute changes logged in console

Pass/Fail: _______
Attributes Before: _______
Attributes After: _______
```

**Test Case 1.2.4: Level-Up Trigger**
```
Steps:
1. Use user close to level threshold (e.g., 95 XP, need 100 for Level 1)
2. Complete task worth 10+ XP

Expected Results:
✅ LevelUpModal displays
✅ Confetti animation plays
✅ New level shown (Level 0 → Level 1)
✅ Unlocked permissions listed
✅ User profile updated

Pass/Fail: _______
Previous Level: _______
New Level: _______
```

---

#### Test Suite 1.3: Anti-Farming Mechanisms

**Test Case 1.3.1: sourceId Deduplication**
```
Steps:
1. Complete a task (e.g., MORNING_READING chapter-1-passage-1-10)
2. Manually create a duplicate task with same sourceId
3. Attempt to complete duplicate task

Expected Results:
✅ First completion: Success, XP awarded
✅ Duplicate completion: Error "You have already completed this content today"
✅ No XP awarded for duplicate
✅ sourceId added to usedSourceIds array in DailyTaskProgress

Pass/Fail: _______
Error Message: _______
```

**Test Case 1.3.2: Submission Cooldown (5 seconds)**
```
Steps:
1. Complete first task
2. Immediately try to complete second task (within 5 seconds)

Expected Results:
✅ First submission: Success
✅ Second submission within 5s: Error "Please wait before submitting again"
✅ After 5s: Second submission succeeds

Pass/Fail: _______
Time Between Submissions: _______
```

**Test Case 1.3.3: Duplicate Submission Prevention**
```
Steps:
1. Complete a task successfully
2. Attempt to complete the same task again

Expected Results:
✅ First submission: Success
✅ Second submission: Error "This task has already been completed"
✅ No duplicate XP awarded

Pass/Fail: _______
Error Message: _______
```

---

#### Test Suite 1.4: Streak System

**Test Case 1.4.1: Streak Calculation**
```
Steps:
1. Complete at least 1 task today
2. Check streak counter in UI

Expected Results:
✅ If completed yesterday: Streak increments by 1
✅ If missed yesterday: Streak resets to 1
✅ Streak counter displays correct number

Pass/Fail: _______
Current Streak: _______
```

**Test Case 1.4.2: Streak Milestones**
```
Steps:
1. Test with users at streak days: 2, 6, 13, 29
2. Complete tasks to reach milestones: 3, 7, 14, 30 days

Expected Results:
✅ 3 days: +10 XP bonus, toast notification
✅ 7 days: +25 XP bonus, toast notification
✅ 14 days: +50 XP bonus, toast notification
✅ 30 days: +100 XP bonus, toast notification
✅ Milestone badge/celebration displayed

Pass/Fail: _______
Milestone Reached: _______
Bonus XP: _______
```

---

### Phase 2: AI Integration Testing

#### Test Suite 2.1: AI Evaluation Accuracy

**Test Case 2.1.1: Morning Reading Evaluation**
```
Steps:
1. Get MORNING_READING task
2. Submit response: "這段文字描寫了賈府的富貴繁華，通過對建築、擺設的細節描寫，展現了賈家的社會地位。"
3. Check AI evaluation result

Expected Results:
✅ Score: 70-90 (good comprehension)
✅ Feedback in Traditional Chinese
✅ Key points covered listed
✅ Constructive suggestions provided

Pass/Fail: _______
Score: _______
Feedback Quality (1-5): _______
```

**Test Case 2.1.2: Poetry Quality Assessment**
```
Steps:
1. Get POETRY task with poem
2. Submit recitation (try to match original poem)
3. Check accuracy score

Expected Results:
✅ Accuracy score (0-100)
✅ Completeness score (0-100)
✅ Mistakes highlighted
✅ Literary analysis provided

Pass/Fail: _______
Accuracy: _______
Completeness: _______
Mistakes Count: _______
```

**Test Case 2.1.3: Character Analysis Scoring**
```
Steps:
1. Get CHARACTER_INSIGHT task
2. Submit analysis: "林黛玉的性格具有多面性，她既敏感脆弱又聰慧堅強..."
3. Check depth assessment

Expected Results:
✅ Quality score (0-100)
✅ Depth level: superficial/moderate/profound
✅ Insight score (0-100)
✅ Feedback mentions themes

Pass/Fail: _______
Quality Score: _______
Depth Level: _______
```

**Test Case 2.1.4: AI Response Time**
```
Steps:
1. Complete any task
2. Measure time from submit to result display

Expected Results:
✅ AI evaluation completes in <3 seconds
✅ If timeout: Fallback score (60) returned
✅ Console logs execution time
✅ No hanging or infinite loading

Pass/Fail: _______
Response Time: _______
```

---

#### Test Suite 2.2: AI Error Handling

**Test Case 2.2.1: AI Service Unavailable**
```
Steps:
1. Disconnect internet or block Gemini API
2. Submit task completion

Expected Results:
✅ Task submission still succeeds
✅ Fallback score (60) assigned
✅ No error thrown to user
✅ XP still awarded
✅ Toast notification shows completion

Pass/Fail: _______
Fallback Behavior: _______
```

**Test Case 2.2.2: Invalid AI Response**
```
Steps:
1. Submit task with edge case content (empty, special chars)
2. Observe AI handling

Expected Results:
✅ Graceful handling of edge cases
✅ Valid score returned (or fallback)
✅ No crashes or errors

Pass/Fail: _______
Notes: _______
```

---

### Phase 3: End-to-End Integration Testing

#### Test Suite 3.1: Complete User Journey

**Test Case 3.1.1: New User Full Flow**
```
Steps:
1. Register new user account
2. Navigate to /daily-tasks
3. Generate tasks (should be 3-5 tasks)
4. Complete 1 task with quality response
5. Check rewards and progress
6. Complete all remaining tasks
7. Check final progress and streak

Expected Results:
✅ Step 1: User registered, profile initialized
✅ Step 2: Daily tasks page loads without errors
✅ Step 3: Tasks generated based on Level 0
✅ Step 4: Task completed, XP awarded
✅ Step 5: Progress bar shows 1/N completed
✅ Step 6: All tasks marked complete
✅ Step 7: Streak = 1, total XP > 0

Pass/Fail: _______
Total XP Earned: _______
Tasks Completed: _______
Time Spent: _______
```

**Test Case 3.1.2: Multi-Day Streak Flow**
```
Steps:
1. Day 1: Complete all tasks
2. Day 2: Complete all tasks
3. Day 3: Complete all tasks
4. Check streak and milestone

Expected Results:
✅ Day 1: Streak = 1
✅ Day 2: Streak = 2
✅ Day 3: Streak = 3, +10 XP bonus
✅ Milestone celebration displayed

Pass/Fail: _______
Final Streak: _______
Milestone Bonus: _______
```

---

#### Test Suite 3.2: Cron Job Integration

**Test Case 3.2.1: Manual Cron Trigger**
```
Steps:
1. Call API endpoint manually:
   curl -X GET \
     -H "Authorization: Bearer YOUR_CRON_SECRET" \
     http://localhost:3000/api/cron/daily-tasks

Expected Results:
✅ Response: 200 OK
✅ Response body shows processed user count
✅ Processing time logged
✅ New tasks generated for active users
✅ Batch processing (10 users/batch)

Pass/Fail: _______
Users Processed: _______
Processing Time: _______
```

**Test Case 3.2.2: Cron Security**
```
Steps:
1. Call API without Authorization header
2. Call API with incorrect CRON_SECRET

Expected Results:
✅ No header: 401 Unauthorized
✅ Wrong secret: 401 Unauthorized
✅ Correct secret: 200 OK

Pass/Fail: _______
```

---

### Phase 4: Performance Testing

#### Test Suite 4.1: Load Performance

**Test Case 4.1.1: Task List Loading Time**
```
Steps:
1. Open /daily-tasks page
2. Measure time from page load to tasks displayed
3. Test with browser cache disabled

Expected Results:
✅ First load (cache miss): <500ms
✅ Second load (cache hit): <100ms
✅ No layout shift or flicker
✅ Skeleton loaders displayed while loading

Pass/Fail: _______
First Load Time: _______
Cached Load Time: _______
```

**Test Case 4.1.2: Task Submission Performance**
```
Steps:
1. Submit task completion
2. Measure total time from click to result displayed

Expected Results:
✅ Total time: <5 seconds
✅ AI evaluation: <3 seconds
✅ XP update: <1 second
✅ No UI freezing

Pass/Fail: _______
Total Time: _______
AI Time: _______
```

**Test Case 4.1.3: Concurrent Operations**
```
Steps:
1. Open /daily-tasks in 3 tabs simultaneously
2. Complete tasks in parallel

Expected Results:
✅ All submissions handled correctly
✅ No race conditions
✅ Progress synced across tabs
✅ No duplicate XP awarded

Pass/Fail: _______
Notes: _______
```

---

### Phase 5: Expectations Checklist Validation

Use the 15-point checklist from TASK.md (lines 557-572) to validate production readiness:

**Checklist Validation**

1. ⬜ **自動化任務生成**: Vercel Cron 每日 UTC+8 00:00 自動觸發任務生成
   - Status: _______
   - Notes: _______

2. ⬜ **Cron API 安全性**: CRON_SECRET 驗證機制防止未授權訪問
   - Status: _______
   - Notes: _______

3. ⬜ **批處理效能**: 能處理 1000+ 活躍用戶，每批次 10 人，批次間延遲 100ms
   - Status: _______
   - Notes: _______

4. ⬜ **任務生成報告**: Cron 執行完成後提供詳細報告（成功/失敗用戶數、執行時間）
   - Status: _______
   - Notes: _______

5. ⬜ **星期輪換機制**: 根據星期幾調整任務類型權重（週一晨讀 1.5x、週三人物 1.5x 等）
   - Status: _______
   - Notes: _______

6. ⬜ **自適應難度**: 根據用戶最近 30 次任務表現動態調整難度（<60 降低、>85 提高）
   - Status: _______
   - Notes: _______

7. ⬜ **防刷機制**: sourceId 去重確保同一內容當日不可重複獲得 XP
   - Status: _______
   - Notes: _______

8. ⬜ **提交冷卻**: 5 秒提交間隔限制防止垃圾提交
   - Status: _______
   - Notes: _______

9. ⬜ **AI 響應時間**: AI 評分在 3 秒內完成或返回預設分數 (60 分)
   - Status: _______
   - Notes: _______

10. ⬜ **任務快取**: 任務列表載入使用 5 分鐘快取，減少 Firestore 讀取
    - Status: _______
    - Notes: _______

11. ⬜ **性能日誌**: AI 評分完成後記錄實際執行時間供監控
    - Status: _______
    - Notes: _______

12. ⬜ **優雅降級**: AI 超時或失敗時不影響用戶完成任務流程
    - Status: _______
    - Notes: _______

13. ⬜ **整合測試**: 11 個整合測試涵蓋端到端流程、防刷、連擊、AI、升級
    - Status: _______
    - Notes: _______

14. ⬜ **錯誤處理**: 所有異常情況有友善錯誤訊息，不拋出未捕獲異常
    - Status: _______
    - Notes: _______

15. ⬜ **文檔完整**: JSDoc 註解完整，TASK.md 詳細記錄實現過程與決策
    - Status: ✅ COMPLETE
    - Notes: API docs + Developer Guide completed

---

## Testing Results Summary

**Test Session Information**
- Date: _______________
- Tester: _______________
- Environment: _______________
- Browser: _______________

**Pass/Fail Summary**

| Test Suite | Total Tests | Passed | Failed | Notes |
|------------|-------------|--------|--------|-------|
| 1.1 Task Generation | 4 | ___ | ___ | _____ |
| 1.2 Task Completion & Rewards | 4 | ___ | ___ | _____ |
| 1.3 Anti-Farming | 3 | ___ | ___ | _____ |
| 1.4 Streak System | 2 | ___ | ___ | _____ |
| 2.1 AI Evaluation | 4 | ___ | ___ | _____ |
| 2.2 AI Error Handling | 2 | ___ | ___ | _____ |
| 3.1 Complete User Journey | 2 | ___ | ___ | _____ |
| 3.2 Cron Job Integration | 2 | ___ | ___ | _____ |
| 4.1 Load Performance | 3 | ___ | ___ | _____ |
| **Total** | **26** | ___ | ___ | _____ |

**Overall Status**: ⬜ PASS / ⬜ FAIL

**Critical Issues Found**: _______________________________________

**Recommendations**: _______________________________________

---

## Troubleshooting Common Issues

### Issue 1: Tasks Not Generating
**Symptoms**: No tasks appear after navigation to /daily-tasks

**Debugging Steps**:
1. Check browser console for errors
2. Check Network tab for failed API calls
3. Verify user profile exists in Firestore
4. Check if Firebase connection is active

**Solution**: Usually indicates Firebase connection issue or user profile not initialized

---

### Issue 2: AI Evaluation Timeout
**Symptoms**: Task stuck on "Evaluating..." for >3 seconds

**Debugging Steps**:
1. Check Network tab for AI API calls
2. Check console for timeout warnings
3. Verify GOOGLE_GENAI_API_KEY is set

**Solution**: System should automatically return fallback score (60)

---

### Issue 3: sourceId Deduplication Not Working
**Symptoms**: Duplicate content awards XP multiple times

**Debugging Steps**:
1. Check DailyTaskProgress document in Firestore
2. Verify usedSourceIds array exists
3. Check task.sourceId field is populated

**Solution**: Ensure generateSourceId() is called during task creation

---

### Issue 4: Streak Not Incrementing
**Symptoms**: Streak remains at same value after completing tasks

**Debugging Steps**:
1. Check DailyTaskProgress.streak field
2. Verify all tasks completed for previous day
3. Check streak calculation logic

**Solution**: Streak only increments when ALL daily tasks are completed

---

## Appendix: Test Data

### Sample Responses by Task Type

**MORNING_READING (Good Quality)**:
```
這段文字通過對大觀園景色的細緻描寫，展現了賈府的富貴繁華。作者運用了比喻和象徵手法，
將自然景觀與人物命運相結合，暗示了賈府由盛轉衰的命運走向。文字優美流暢，充滿詩意。
```

**POETRY (Good Quality)**:
```
葬花吟
花謝花飛花滿天，紅消香斷有誰憐。
遊絲軟繫飄春榭，落絮輕沾撲繡簾。
(Continue with full poem...)
```

**CHARACTER_INSIGHT (Good Quality)**:
```
林黛玉是《紅樓夢》中最具悲劇色彩的人物之一。她聰慧敏感，才華橫溢，但同時又孤傲脆弱。
她與賈寶玉的愛情是整部小說的核心線索之一，兩人心靈相通，但最終因封建禮教而無法結合。
黛玉的性格特點體現在她對詩詞的熱愛、對自然的敏感以及對命運的無奈上。
```

**CULTURAL_EXPLORATION (Good Quality)**:
```
大觀園的建築設計體現了中國古典園林的精髓，融合了自然與人工、虛與實、動與靜的美學理念。
園中的怡紅院、瀟湘館等建築各具特色，反映了不同人物的性格特點。這種建築與人物性格的
呼應是曹雪芹創作的獨特手法之一。
```

**COMMENTARY_DECODE (Good Quality)**:
```
脂硯齋的這條批語深刻揭示了作者的創作意圖。通過這一細節描寫，曹雪芹不僅展現了人物的
當下狀態，更暗示了未來的命運走向。這種「草蛇灰線，伏延千里」的寫作手法是《紅樓夢》
的一大特色，需要讀者細細品味才能領會其中深意。
```

---

**End of Manual Testing Guide**

**Last Updated**: 2025-10-19
**Version**: 1.0.0
**Phase**: GAME-002 Phase 4 Testing
