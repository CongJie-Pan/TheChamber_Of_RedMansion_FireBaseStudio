# AI Migration Testing Guide - Windows CMD Environment

**Date:** 2025-10-30
**Migration:** GenKit/Gemini → OpenAI GPT-4-mini + Perplexity Sonar
**Testing Environment:** Windows Command Prompt (CMD)

## Overview

This guide provides step-by-step instructions for testing the AI migration in a Windows CMD environment. All AI flows have been migrated from GenKit/Gemini to OpenAI GPT-4-mini (scoring tasks) and Perplexity Sonar (analysis tasks).

---

## Prerequisites

### 1. Environment Variables

Ensure the following environment variables are set in your `.env.local` file:

```env
# OpenAI API Key (required for scoring flows)
OPENAI_API_KEY=sk-...

# Perplexity API Key (required for analysis flows)
PERPLEXITYAI_API_KEY=pplx-...

# Other required variables
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
# ... (other Firebase config)
```

### 2. Install Dependencies

Open CMD and navigate to the project directory:

```cmd
cd D:\AboutUniversity\114 NSTC_and_SeniorProject\2025-IM-senior-project\TheChamber_Of_RedMansion_FireBaseStudio
npm install
```

---

## Test Execution Commands

### Run All Tests

```cmd
npm test
```

**Expected Output:**
- Test suite should complete without errors
- All tests should pass (100% pass rate)
- No compilation errors

### Run Tests in Watch Mode

```cmd
npm test -- --watch
```

**Note:** This will keep tests running and re-run on file changes. Press `Ctrl+C` to exit.

### Run Tests with Coverage

```cmd
npm test -- --coverage
```

**Expected Output:**
- Coverage report should show >75% overall coverage
- AI flow tests should have high coverage for critical paths

---

## AI Flow Specific Tests

### Test All AI Flows

```cmd
npm test -- tests/ai/flows/
```

**Migrated Flows to Test:**
- ✅ character-analysis-scoring (OpenAI)
- ✅ commentary-interpretation (OpenAI)
- ✅ poetry-quality-assessment (OpenAI)
- ✅ cultural-quiz-grading (OpenAI)
- ✅ daily-reading-comprehension (OpenAI)
- ✅ context-aware-analysis (Perplexity)
- ✅ explain-text-selection (Perplexity)

### Test Individual AI Flows

#### OpenAI-Powered Flows (Scoring/Grading)

```cmd
REM Character Analysis Scoring
npm test -- tests/ai/flows/character-analysis-scoring.test.ts

REM Commentary Interpretation
npm test -- tests/ai/flows/commentary-interpretation.test.ts

REM Poetry Quality Assessment
npm test -- tests/ai/flows/poetry-quality-assessment.test.ts

REM Cultural Quiz Grading
npm test -- tests/ai/flows/cultural-quiz-grading.test.ts

REM Daily Reading Comprehension
npm test -- tests/ai/flows/daily-reading-comprehension.test.ts
```

#### Perplexity-Powered Flows (Analysis)

```cmd
REM Context-Aware Analysis
npm test -- tests/ai/flows/context-aware-analysis.test.ts

REM Explain Text Selection
npm test -- tests/ai/flows/explain-text-selection.test.ts
```

---

## Verification Steps

### Step 1: TypeScript Compilation

Verify no TypeScript errors after migration:

```cmd
npm run typecheck
```

**Expected Output:**
- No TypeScript errors
- All type definitions should resolve correctly

### Step 2: Linting

Run ESLint to check code quality:

```cmd
npm run lint
```

**Expected Output:**
- No linting errors related to AI flows
- No unused imports from removed GenKit dependencies

### Step 3: Build Verification

Build the production application:

```cmd
npm run build
```

**Expected Output:**
- Build should complete successfully
- No errors related to AI flows
- No missing module errors

---

## Test Output Interpretation

### Successful Test Output Example

```
 PASS  tests/ai/flows/daily-reading-comprehension.test.ts
  daily-reading-comprehension AI flow
    ✓ should assess reading comprehension with valid input (25ms)
    ✓ should clamp scores to 0-100 range (18ms)
    ✓ should track covered and missed keywords (22ms)
    ✓ should handle errors gracefully (15ms)

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
Snapshots:   0 total
Time:        2.134s
```

### Failed Test Output Example

```
 FAIL  tests/ai/flows/daily-reading-comprehension.test.ts
  ● daily-reading-comprehension AI flow › should assess reading comprehension with valid input

    Expected: {"score": 85, "feedback": "..."}
    Received: undefined

    Error: AI flow returned undefined
```

**Troubleshooting Failed Tests:**
1. Check environment variables are set correctly
2. Verify API keys are valid and have quota
3. Check network connectivity
4. Review test mocks are correctly configured

---

## Common Issues and Solutions

### Issue 1: "Cannot find module '@/ai/genkit'"

**Cause:** Old imports not updated during migration

**Solution:**
```cmd
REM Search for remaining GenKit imports
findstr /s /i "from '@/ai/genkit'" src\*.ts
findstr /s /i "from 'genkit'" src\*.ts

REM These should return no results
```

### Issue 2: Tests Timing Out

**Cause:** API calls not mocked properly or network issues

**Solution:**
- Verify all API calls in tests are mocked
- Check Jest timeout configuration
- Ensure no actual API calls during tests

```cmd
REM Run tests with verbose output
npm test -- --verbose
```

### Issue 3: Environment Variables Not Loading

**Cause:** `.env.local` file not in correct location or format

**Solution:**
```cmd
REM Verify .env.local exists
dir .env.local

REM Check if environment variables are loaded (PowerShell alternative)
REM For CMD, you'll need to manually verify the file contents
type .env.local
```

### Issue 4: Module Resolution Errors

**Cause:** node_modules not properly installed

**Solution:**
```cmd
REM Clean and reinstall dependencies
rmdir /s /q node_modules
del package-lock.json
npm install
```

---

## Regression Testing Checklist

Use this checklist to verify all AI functionality works correctly:

### OpenAI GPT-4-mini Flows (Scoring)

- [ ] **Character Analysis Scoring**
  - [ ] Returns valid score (0-100)
  - [ ] Depth classification (superficial/moderate/profound)
  - [ ] Tracks themes covered and missed
  - [ ] Provides Traditional Chinese feedback

- [ ] **Commentary Interpretation**
  - [ ] Returns valid score (0-100)
  - [ ] Insight level classification (surface/moderate/deep/profound)
  - [ ] Literary sensitivity score calculated
  - [ ] Provides authoritative commentary explanation

- [ ] **Poetry Quality Assessment**
  - [ ] Accuracy percentage calculated
  - [ ] Completeness percentage calculated
  - [ ] Mistakes array with line numbers
  - [ ] Literary analysis provided

- [ ] **Cultural Quiz Grading**
  - [ ] Multiple-choice questions scored 100/0
  - [ ] Open-ended questions scaled 0-100
  - [ ] Per-question explanations provided
  - [ ] Cultural insights generated

- [ ] **Daily Reading Comprehension**
  - [ ] Score based on rubric (Accuracy 30%, Completeness 25%, Depth 25%, Literary 20%)
  - [ ] Keywords tracked (covered/missed)
  - [ ] Difficulty-adaptive scoring
  - [ ] Detailed analysis in markdown

### Perplexity Sonar Flows (Analysis)

- [ ] **Context-Aware Analysis**
  - [ ] Adapts to user's reading progress
  - [ ] Avoids spoilers for unread chapters
  - [ ] Includes scholarly citations
  - [ ] Web search integration working

- [ ] **Explain Text Selection**
  - [ ] Multi-dimensional analysis (literal, historical, symbolic)
  - [ ] Scholarly references provided
  - [ ] Web search integration working
  - [ ] Question transformation effective

---

## Performance Benchmarks

### Test Execution Time

Expected test suite execution times:

| Test Suite | Expected Time | Notes |
|------------|--------------|-------|
| All Tests | < 30 seconds | With mocked APIs |
| AI Flow Tests Only | < 10 seconds | 7 AI flows |
| Individual Flow Test | < 2 seconds | Single flow |

### If Tests Are Slower

```cmd
REM Check for unmocked API calls
npm test -- --detectOpenHandles

REM Run tests without coverage for speed
npm test -- --no-coverage
```

---

## Automated Test Scripts

### Create a Test Batch Script

Create a file named `test-ai-migration.bat` in the project root:

```batch
@echo off
echo ========================================
echo AI Migration Testing Suite
echo ========================================
echo.

echo [1/5] Running TypeScript type check...
call npm run typecheck
if errorlevel 1 (
    echo ERROR: TypeScript compilation failed
    exit /b 1
)
echo PASSED: TypeScript type check
echo.

echo [2/5] Running ESLint...
call npm run lint
if errorlevel 1 (
    echo WARNING: Linting issues found
)
echo COMPLETED: ESLint check
echo.

echo [3/5] Running all AI flow tests...
call npm test -- tests/ai/flows/
if errorlevel 1 (
    echo ERROR: AI flow tests failed
    exit /b 1
)
echo PASSED: AI flow tests
echo.

echo [4/5] Running full test suite...
call npm test
if errorlevel 1 (
    echo ERROR: Full test suite failed
    exit /b 1
)
echo PASSED: Full test suite
echo.

echo [5/5] Running production build...
call npm run build
if errorlevel 1 (
    echo ERROR: Production build failed
    exit /b 1
)
echo PASSED: Production build
echo.

echo ========================================
echo ALL TESTS PASSED SUCCESSFULLY
echo ========================================
```

**Usage:**

```cmd
test-ai-migration.bat
```

---

## Post-Testing Verification

After all tests pass, verify the following:

### 1. Check Git Status

```cmd
git status
```

**Expected:** Only documentation files should be modified (no code changes needed if tests pass)

### 2. Verify No Deprecated Dependencies

```cmd
npm list genkit
npm list @genkit-ai/googleai
npm list @genkit-ai/next
```

**Expected:** All should return "npm ERR! code ELSPROBLEMS" (package not found) - this is correct

### 3. Verify New Dependencies

```cmd
npm list openai
npm list @anthropic-ai/sdk
```

**Expected:** Should show installed versions

---

## Reporting Results

If all tests pass, document the results:

```
✅ AI Migration Testing Complete

Environment: Windows CMD
Date: 2025-10-30
Test Status: PASSED

Test Results:
- TypeScript Compilation: PASSED
- ESLint: PASSED
- AI Flow Tests: PASSED (7/7 flows)
- Full Test Suite: PASSED
- Production Build: PASSED

Migration Status: COMPLETE
```

If tests fail, provide:
1. Failed test names
2. Error messages
3. Environment details (Node version, npm version)
4. Screenshot of error output

---

## Next Steps

After successful testing:

1. **Commit Documentation Updates**
   ```cmd
   git add docs/
   git commit -m "docs(migration): update AI flow documentation for OpenAI + Perplexity migration"
   ```

2. **Optional: Run Application Locally**
   ```cmd
   npm run dev
   ```
   - Visit `http://localhost:3001`
   - Test AI features in the UI
   - Verify API endpoints work correctly

3. **Deploy** (if tests pass)
   ```cmd
   npm run build
   npm start
   ```

---

## Support and Troubleshooting

### Get Help

If you encounter issues:

1. Check this guide's "Common Issues" section
2. Review test output carefully
3. Verify environment variables
4. Check API key quotas and validity
5. Review recent commits for any breaking changes

### Additional Commands

```cmd
REM Check Node and npm versions
node --version
npm --version

REM Clear Jest cache if tests behave unexpectedly
npm test -- --clearCache

REM Run tests with full error details
npm test -- --verbose --no-coverage
```

---

**Document Version:** 1.0
**Last Updated:** 2025-10-30
**Author:** Development Team
**Status:** Ready for Testing
