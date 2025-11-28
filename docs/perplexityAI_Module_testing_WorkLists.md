# Perplexity AI Module Testing Work Lists

**Project**: Red Mansion Learning Platform - Perplexity Q&A Testing Suite
**Strategy**: 100% Mock Testing (LobeChat Pattern)
**Total Estimated Time**: 8-10 hours
**Current Status**: Phase 1 Complete, Phase 3.1 Complete (16/16 tests passing)
**Last Updated**: 2025-11-27

---

## Recent Updates (2025-11-27)

### Streaming Fix Changes Requiring Test Coverage
The following changes were made to fix the AI Q&A streaming issue:

1. **`src/lib/perplexity-client.ts`**:
   - Removed `shouldStopAfterCurrentBatch` early exit logic
   - Now waits for explicit `[DONE]` signal before ending stream
   - `[DONE]` handler always yields final completion chunk

2. **`src/app/(main)/read-book/page.tsx`**:
   - Removed hardcoded thinking placeholder text
   - Now uses empty string for initial thinking state

3. **`src/ai/perplexity-config.ts`**:
   - Added temperature constraint (< 2)
   - Added CORS limitation documentation

---

## Overview

This document tracks the comprehensive testing implementation for Perplexity Q&A functionality. All tests follow the 100% mock strategy (no real API calls) based on LobeChat's best practices.

### Testing Architecture
- **Layer 1**: Unit Tests (pure logic, fast)
- **Layer 2**: Integration Tests (mocked APIs, component collaboration)
- **Layer 3**: UI Component Tests (React rendering)
- **Layer 4**: E2E Simulation Tests (complete user flow, all mocked)
- **Layer 5**: Regression Tests (prevent historical bugs)

### Key Metrics
- **Target Coverage**: 85%+ (from current 77.37%)
- **New Tests**: ~90 tests
- **New Test Files**: 8 files
- **Test Utilities**: 1 comprehensive utility library

---

## Phase 1: Testing Infrastructure Setup

### [x] **Task ID**: TEST-INFRA-001
- **Task Name**: Create Perplexity Test Utilities Library
- **Work Description**:
    - **Why**: Provide reusable mock functions and test scenarios for all Perplexity tests. Eliminate code duplication and ensure consistent testing patterns across the suite.
    - **How**:
        1. Create comprehensive utility functions for SSE stream mocking
        2. Define 7 realistic test scenarios based on production behavior
        3. Implement 5 error scenarios for edge case testing
        4. Provide helper functions for chunk validation and request creation
- **Resources Required**:
    - **Materials**: TypeScript, Jest testing library
    - **Personnel**: 1 developer (30 minutes)
    - **Reference Codes/docs**:
        - `/src/lib/perplexity-client.ts` (chunk structure reference)
        - `/src/lib/streaming/perplexity-stream-processor.ts` (streaming patterns)
        - LobeChat testing patterns: `D:\AboutCoding\SideProject\AiChat_Ui\githubRepo\lobe-chat`
- **Deliverables**:
    - [x] `tests/utils/perplexity-test-utils.ts` (500+ lines)
    - [x] `createMockSSEStream()` function
    - [x] `createMockPerplexityChunk()` function
    - [x] `createMockPerplexityClient()` factory
    - [x] `MOCK_QA_SCENARIOS` - 7 predefined scenarios
    - [x] `MOCK_ERROR_SCENARIOS` - 5 error scenarios
    - [x] `waitForSSECompletion()` helper
    - [x] `assertValidChunk()` validation helper
- **Dependencies**: None
- **Constraints**: Must match actual Perplexity API response structure
- **Completion Status**:  **COMPLETED** (2025-11-24)
- **Notes**:
    - Includes scenarios: STANDARD_QA, THINKING_ONLY, SHORT_ANSWER, MULTIPLE_THINKING, LARGE_RESPONSE, WITH_CITATIONS, WITH_SELECTED_TEXT
    - All scenarios based on real production behavior and historical bugs

---

### [x] **Task ID**: TEST-INFRA-002
- **Task Name**: Update Jest Configuration for Test Classification
- **Work Description**:
    - **Why**: Enable selective test execution (e.g., run only unit tests, only integration tests). Improve CI/CD efficiency and developer experience.
    - **How**:
        1. Add `projects` configuration to jest.config.js
        2. Define 5 test categories: unit, integration, ui, e2e, regression
        3. Set up proper testMatch patterns for each category
- **Resources Required**:
    - **Materials**: Jest configuration knowledge
    - **Personnel**: 1 developer (10 minutes)
    - **Reference Codes/docs**:
        - `jest.config.js` (existing configuration)
        - Jest documentation (projects configuration)
- **Deliverables**:
    - [x] Updated `jest.config.js` with projects configuration
    - [x] 5 test categories defined
    - [x] Proper testMatch patterns for selective execution
- **Dependencies**: None
- **Constraints**: Must maintain backward compatibility with existing tests
- **Completion Status**:  **COMPLETED** (2025-11-24)
- **Notes**: Allows commands like `npm test -- --selectProjects unit`

---

### [x] **Task ID**: TEST-INFRA-003
- **Task Name**: Add npm Test Scripts
- **Work Description**:
    - **Why**: Provide convenient commands for running different test categories.
    - **How**:
        1. Add 6 new npm scripts to package.json
        2. Configure scripts to use Jest projects
- **Resources Required**:
    - **Materials**: npm scripts knowledge
    - **Personnel**: 1 developer (5 minutes)
    - **Reference Codes/docs**:
        - `package.json` (existing scripts)
- **Deliverables**:
    - [x] `npm run test:unit`
    - [x] `npm run test:integration`
    - [x] `npm run test:ui`
    - [x] `npm run test:e2e`
    - [x] `npm run test:regression`
    - [x] `npm run test:perplexity`
- **Dependencies**: TEST-INFRA-002
- **Constraints**: Must work on all platforms
- **Completion Status**:  **COMPLETED** (2025-11-24)
- **Notes**: All scripts include `--passWithNoTests` flag

---

## Phase 2: Unit Tests

### [ ] **Task ID**: TEST-UNIT-001
- **Task Name**: Error Handler Unit Tests
- **Work Description**:
    - **Why**: Error handler is critical for UX. Must validate error classification and user messaging.
    - **How**:
        1. Test `classifyError()` for all error types
        2. Test `formatErrorForUser()` for message generation
        3. Test retry logic and backoff delays
- **Resources Required**:
    - **Materials**: Jest, TypeScript
    - **Personnel**: 1 developer (1 hour)
    - **Reference Codes/docs**:
        - `/src/lib/perplexity-error-handler.ts`
        - `tests/utils/perplexity-test-utils.ts`
- **Deliverables**:
    - [ ] `tests/lib/perplexity-error-handler.test.ts` (~200 lines, 8 tests)
    - [ ] Test error classification
    - [ ] Test message formatting
    - [ ] Test retry logic
- **Dependencies**: TEST-INFRA-001
- **Constraints**: Must cover all error types
- **Completion Status**: � **PENDING**
- **Notes**: Expected coverage increase: +2%

---

## Phase 3: Integration Tests

### [x] **Task ID**: TEST-INTEG-001
- **Task Name**: API Route Integration Tests
- **Work Description**:
    - **Why**: API Route is COMPLETELY UNTESTED. Critical bridge between frontend and Perplexity.
    - **How**:
        1. Mock perplexityRedChamberQAStreaming
        2. Test request validation
        3. Test SSE format
        4. Test error handling
        5. Test context integration
- **Resources Required**:
    - **Materials**: Jest, Next.js Request/Response mocking
    - **Personnel**: 1 developer (1.5 hours)
    - **Reference Codes/docs**:
        - `/src/app/api/perplexity-qa-stream/route.ts`
        - `tests/utils/perplexity-test-utils.ts`
- **Deliverables**:
    - [x] `tests/api/perplexity-qa-stream.test.ts` (~500 lines, 16 tests)
    - [x] Request validation tests (4 tests)
    - [x] SSE format tests (4 tests)
    - [x] Error handling tests (3 tests)
    - [x] Streaming lifecycle tests (3 tests)
    - [x] Context integration tests (2 tests)
- **Dependencies**: TEST-INFRA-001
- **Constraints**: Must test exact SSE format
- **Completion Status**:  **COMPLETED** (2025-11-24)
- **Notes**:
    - HIGHEST PRIORITY test gap filled
    - Covers Task 4.2 bug scenario
    - All 16 tests passing (100% pass rate)
    - Fixed issues: Content-Type header charset, timeout error format, function call validation
    - Actual coverage increase: +5-7%

---

### [ ] **Task ID**: TEST-INTEG-002
- **Task Name**: Client + StreamProcessor Integration Tests
- **Work Description**:
    - **Why**: Verify PerplexityClient and StreamProcessor work correctly together after Task 1.2 refactoring.
    - **How**:
        1. Test client-processor chunk flow
        2. Test thinking/answer separation
        3. Test error propagation
- **Resources Required**:
    - **Materials**: Jest, TypeScript
    - **Personnel**: 1 developer (1 hour)
    - **Reference Codes/docs**:
        - `/src/lib/perplexity-client.ts`
        - `/src/lib/streaming/perplexity-stream-processor.ts`
- **Deliverables**:
    - [ ] `tests/integration/client-processor-integration.test.ts` (~300 lines, 10 tests)
- **Dependencies**: TEST-INFRA-001
- **Constraints**: Must verify Task 1.2 refactoring
- **Completion Status**: � **PENDING**
- **Notes**: Expected coverage increase: +3%

---

### [ ] **Task ID**: TEST-INTEG-003
- **Task Name**: SSE Pipeline Integration Tests
- **Work Description**:
    - **Why**: Ensure complete SSE pipeline works end-to-end.
    - **How**: Test event parsing, buffer management, [DONE] signal
- **Resources Required**:
    - **Materials**: Jest, ReadableStream
    - **Personnel**: 1 developer (1 hour)
    - **Reference Codes/docs**:
        - `/src/app/api/perplexity-qa-stream/route.ts`
- **Deliverables**:
    - [ ] `tests/integration/sse-pipeline.test.ts` (~250 lines, 8 tests)
- **Dependencies**: TEST-INTEG-001
- **Completion Status**: � **PENDING**
- **Notes**: Expected coverage increase: +2%

---

## Phase 4: UI Component Tests

**Updated 2025-11-27**: Based on LobeChat analysis, the following test patterns are recommended:
- Test streaming state transitions (thinking → answering → complete)
- Test empty state handling (no hardcoded placeholders)
- Test citation click interactions
- Test auto-scroll behavior with user scroll intent detection

### [x] **Task ID**: TEST-UI-001
- **Task Name**: AIMessageBubble Component Tests
- **Work Description**:
    - **Why**: NO test coverage. Critical unified AI message component combining thinking process, answer, and citations.
    - **How**:
        1. Test thinking section visibility based on `hasThinkingContent`
        2. Test collapsible thinking toggle (expand/collapse)
        3. Test loading skeleton when streaming with empty answer
        4. Test streaming indicator display
        5. Test thinking duration display ("Thought for X seconds")
        6. Test accessibility attributes (aria-expanded, aria-controls)
- **Resources Required**:
    - **Materials**: Jest, React Testing Library
    - **Personnel**: 1 developer (45 minutes)
    - **Reference Codes/docs**:
        - `/src/components/ui/AIMessageBubble.tsx`
        - LobeChat: `/src/features/ChatItem/components/MessageContent.tsx`
- **Deliverables**:
    - [ ] `tests/components/ui/AIMessageBubble.test.tsx` (~300 lines, 12 tests)
    - [ ] Test: renders answer content correctly
    - [ ] Test: shows thinking section when thinkingProcess provided
    - [ ] Test: hides thinking section when thinkingProcess empty
    - [ ] Test: toggles thinking content on header click
    - [ ] Test: shows loading skeleton when streaming with empty answer
    - [ ] Test: shows streaming indicator when isStreaming=true
    - [ ] Test: displays correct thinking duration
    - [ ] Test: renders citations via StructuredQAResponse
    - [ ] Test: accessibility attributes correct
    - [ ] Test: keyboard navigation (Enter/Space to toggle)
    - [ ] Test: handles empty answer gracefully
    - [ ] Test: syncs expanded state with showThinkingSection prop
- **Dependencies**: TEST-INFRA-001
- **Completion Status**: ✅ **COMPLETED** (2025-11-27)
- **Notes**:
    - Already existed: `tests/components/ui/AIMessageBubble.test.tsx`
    - 27 tests covering all scenarios
    - Expected coverage increase: +3%

---

### [x] **Task ID**: TEST-UI-002
- **Task Name**: ConversationFlow Component Tests
- **Work Description**:
    - **Why**: NO test coverage. Manages message history with user/AI message bubbles.
    - **How**:
        1. Test message rendering for different roles (user, ai, system)
        2. Test empty state display
        3. Test auto-scroll behavior
        4. Test new conversation separator
        5. Test custom render function support
        6. Test timestamp formatting
- **Resources Required**:
    - **Materials**: Jest, React Testing Library
    - **Personnel**: 1 developer (1 hour)
    - **Reference Codes/docs**:
        - `/src/components/ui/ConversationFlow.tsx`
        - LobeChat: `/src/features/ChatItem/ChatItem.tsx`
- **Deliverables**:
    - [ ] `tests/components/ui/ConversationFlow.test.tsx` (~350 lines, 14 tests)
    - [ ] Test: renders empty state when no messages
    - [ ] Test: renders user messages with correct styling
    - [ ] Test: renders AI messages with correct styling
    - [ ] Test: renders system messages centered
    - [ ] Test: shows avatar for user and AI messages
    - [ ] Test: displays formatted timestamp
    - [ ] Test: shows error indicator when message hasError
    - [ ] Test: shows streaming indicator for streaming messages
    - [ ] Test: auto-scrolls to bottom on new message
    - [ ] Test: respects autoScrollEnabled prop
    - [ ] Test: shows new conversation separator
    - [ ] Test: calls onNewConversation callback
    - [ ] Test: uses custom renderMessageContent function
    - [ ] Test: createConversationMessage utility works correctly
- **Dependencies**: TEST-INFRA-001
- **Completion Status**: ✅ **COMPLETED** (2025-11-27)
- **Notes**:
    - Already existed: `tests/components/ui/ConversationFlow.test.tsx`
    - 40+ tests covering all scenarios
    - Expected coverage increase: +3%

---

### [x] **Task ID**: TEST-UI-003
- **Task Name**: StructuredQAResponse Component Tests
- **Work Description**:
    - **Why**: NO test coverage. Displays formatted answers with inline citations.
    - **How**:
        1. Test markdown rendering
        2. Test inline citation markers [1][2][3]
        3. Test references section display
        4. Test citation click callbacks
        5. Test empty content handling
- **Resources Required**:
    - **Materials**: Jest, React Testing Library
    - **Personnel**: 1 developer (45 minutes)
    - **Reference Codes/docs**:
        - `/src/components/ui/StructuredQAResponse.tsx`
- **Deliverables**:
    - [ ] `tests/components/ui/StructuredQAResponse.test.tsx` (~280 lines, 10 tests)
    - [ ] Test: renders raw content as markdown
    - [ ] Test: renders structured sections with headings
    - [ ] Test: displays inline citation markers
    - [ ] Test: citation markers are clickable
    - [ ] Test: shows references section when citations provided
    - [ ] Test: hides references when isThinkingComplete=false
    - [ ] Test: handles empty content gracefully
    - [ ] Test: calls onCitationClick with correct citation number
    - [ ] Test: displays citation title and snippet
    - [x] Test: processContentWithCitations utility works correctly
- **Dependencies**: TEST-INFRA-001
- **Completion Status**: ✅ **COMPLETED** (2025-11-27)
- **Notes**:
    - Created: `tests/components/ui/StructuredQAResponse.test.tsx`
    - 25 tests covering all scenarios
    - Expected coverage increase: +2%

---

## Phase 5: E2E Simulation Tests [OPTIONAL]

### [ ] **Task ID**: TEST-E2E-001
- **Task Name**: Complete Q&A Flow E2E Tests
- **Work Description**:
    - **Why**: Validate entire user journey. Most realistic test.
    - **How**: Mock fetch, simulate user interaction, verify complete flow
- **Resources Required**:
    - **Materials**: Jest, React Testing Library, user-event
    - **Personnel**: 1 developer (1.5 hours)
    - **Reference Codes/docs**:
        - `/src/app/(main)/read-book/page.tsx`
- **Deliverables**:
    - [ ] `tests/e2e/perplexity-qa-flow.test.ts` (~450 lines, 12 tests)
- **Dependencies**: TEST-INTEG-001, TEST-UI-001/002/003
- **Completion Status**: � **PENDING**
- **Notes**: Expected coverage increase: +4%

---

### [ ] **Task ID**: TEST-E2E-002
- **Task Name**: Error Scenarios E2E Tests
- **Work Description**:
    - **Why**: Ensure error handling provides good UX.
    - **How**: Mock error scenarios, verify user-friendly messages
- **Resources Required**:
    - **Materials**: Jest, React Testing Library
    - **Personnel**: 1 developer (45 minutes)
    - **Reference Codes/docs**:
        - `tests/utils/perplexity-test-utils.ts` (MOCK_ERROR_SCENARIOS)
- **Deliverables**:
    - [ ] `tests/e2e/error-scenarios.test.ts` (~200 lines, 6 tests)
- **Dependencies**: TEST-E2E-001
- **Completion Status**: � **PENDING**
- **Notes**: Expected coverage increase: +2%

---

### [ ] **Task ID**: TEST-E2E-003
- **Task Name**: State Management E2E Tests
- **Work Description**:
    - **Why**: Ensure state managed correctly across multiple questions.
    - **How**: Simulate multiple questions, verify state accumulation
- **Resources Required**:
    - **Materials**: Jest, React Testing Library
    - **Personnel**: 1 developer (30 minutes)
    - **Reference Codes/docs**:
        - `/src/app/(main)/read-book/page.tsx`
- **Deliverables**:
    - [ ] `tests/e2e/state-management.test.ts` (~150 lines, 5 tests)
- **Dependencies**: TEST-E2E-001
- **Completion Status**: � **PENDING**
- **Notes**: Expected coverage increase: +1%

---

## Phase 6: Regression Tests [CRITICAL]

**Updated 2025-11-27**: Added critical regression tests for streaming termination fix.

### [x] **Task ID**: TEST-REGR-001
- **Task Name**: Streaming Termination Regression Tests
- **Work Description**:
    - **Why**: **CRITICAL** - Prevent recurrence of streaming bug where response stops after showing only thinking content. This was the Task 4.2 bug that caused "我需要...正在分析..." to appear without the actual answer.
    - **How**:
        1. Test that stream waits for [DONE] signal (not early exit on isComplete)
        2. Test that final chunk is always yielded from [DONE] handler
        3. Test that fullContent accumulates correctly across all chunks
        4. Test temperature constraint enforcement (< 2)
- **Resources Required**:
    - **Materials**: Jest, TypeScript
    - **Personnel**: 1 developer (1 hour)
    - **Reference Codes/docs**:
        - `/src/lib/perplexity-client.ts` (streaming fix)
        - `/src/ai/perplexity-config.ts` (temperature constraint)
        - `docs/PerplexityAI_BugFix_WorkList.md`
- **Deliverables**:
    - [ ] `tests/regression/streaming-termination.test.ts` (~250 lines, 8 tests)
    - [ ] Test: stream continues after isComplete until [DONE] signal
    - [ ] Test: [DONE] handler yields final chunk even with empty fullContent
    - [ ] Test: fullContent accumulates all text chunks correctly
    - [ ] Test: thinking content is preserved in final chunk
    - [ ] Test: citations are preserved in final chunk
    - [ ] Test: temperature >= 2 is treated as undefined
    - [ ] Test: temperature < 2 is passed correctly
    - [x] Test: stream does not exit early on finish_reason
- **Dependencies**: TEST-INFRA-001
- **Completion Status**: ✅ **COMPLETED** (2025-11-27)
- **Notes**:
    - Created: `tests/regression/streaming-termination.test.ts`
    - 15 tests covering all streaming fix scenarios
    - **HIGH PRIORITY** - This prevents regression of critical streaming bug
    - Expected coverage increase: +2%

---

### [ ] **Task ID**: TEST-REGR-002
- **Task Name**: Historical Bug Regression Tests
- **Work Description**:
    - **Why**: Prevent recurrence of fixed bugs (Task 1.1.1, SSE batch bug, thinking-only response).
    - **How**: Test exact bug scenarios from historical issues
- **Resources Required**:
    - **Materials**: Jest, TypeScript
    - **Personnel**: 1 developer (45 minutes)
    - **Reference Codes/docs**:
        - Git history for Task 1.1.1, Task 4.2
        - `docs/PerplexityAI_BugFix_WorkList.md`
- **Deliverables**:
    - [ ] `tests/regression/perplexity-bugs.test.ts` (~200 lines, 6 tests)
    - [ ] Test: thinking-only response is handled gracefully
    - [ ] Test: short answer (< 10 chars) is not rejected
    - [ ] Test: SSE buffer handles partial events correctly
    - [ ] Test: multiple thinking blocks are accumulated
    - [ ] Test: citations with missing fields are handled
    - [ ] Test: network timeout partial content is preserved
- **Dependencies**: TEST-INFRA-001
- **Completion Status**: 🔲 **PENDING**
- **Notes**: Expected coverage increase: +1%

---

## Summary & Status

### Completed (2025-11-24)
-  Phase 1: Testing Infrastructure (3 tasks)
-  Phase 3.1: API Route Tests (16 tests passing, 500+ lines)

### Current Progress
- **Tests Written**: 16 tests (all passing)
- **Code Written**: ~1000 lines
- **Coverage Increase**: +5-7%
- **Time Invested**: ~3 hours

### Remaining Work
- � 6 phases, 10 tasks
- � ~76 tests, ~2740 lines
- � ~9.5 hours

### Validation Commands
```bash
# Test completed work
npm test -- tests/api/perplexity-qa-stream.test.ts

# Test by category
npm run test:integration
npm run test:ui
npm run test:e2e

# Full suite
npm test

# Coverage
npm run test:coverage
```

---

**Last Updated**: 2025-11-27
**Next Review**: Upon completion of Phase 4 UI Tests
