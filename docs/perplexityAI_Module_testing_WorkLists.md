# Perplexity AI Module Testing Work Lists

**Project**: Red Mansion Learning Platform - Perplexity Q&A Testing Suite
**Strategy**: 100% Mock Testing (LobeChat Pattern)
**Total Estimated Time**: 8-10 hours
**Current Status**: Phase 1 Complete, Phase 3.1 Complete (16/16 tests passing)
**Last Updated**: 2025-11-24

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
**Let Claude Code AI read the LobeAI Chatbot to understand how it Ai conservation ui design, and how to use it in the main system of the Ai query page. Then, it completed, update this part test.**   

### [ ] **Task ID**: TEST-UI-001
- **Task Name**: ThinkingProcessIndicator Component Tests
- **Work Description**:
    - **Why**: NO test coverage. Key UX component.
    - **How**: Test status display, progress bar, duration display
- **Resources Required**:
    - **Materials**: Jest, React Testing Library
    - **Personnel**: 1 developer (45 minutes)
    - **Reference Codes/docs**:
        - `/src/components/ui/ThinkingProcessIndicator.tsx`
- **Deliverables**:
    - [ ] `tests/components/ui/ThinkingProcessIndicator.test.tsx` (~280 lines, 10 tests)
- **Dependencies**: TEST-INFRA-001
- **Completion Status**: � **PENDING**
- **Notes**: Expected coverage increase: +3%

---

### [ ] **Task ID**: TEST-UI-002
- **Task Name**: ConversationFlow Component Tests
- **Work Description**:
    - **Why**: NO test coverage. Manages message history.
    - **How**: Test message rendering, history management, auto-scroll
- **Resources Required**:
    - **Materials**: Jest, React Testing Library
    - **Personnel**: 1 developer (1 hour)
    - **Reference Codes/docs**:
        - `/src/components/ui/ConversationFlow.tsx`
- **Deliverables**:
    - [ ] `tests/components/ui/ConversationFlow.test.tsx` (~320 lines, 12 tests)
- **Dependencies**: TEST-INFRA-001
- **Completion Status**: � **PENDING**
- **Notes**: Expected coverage increase: +3%

---

### [ ] **Task ID**: TEST-UI-003
- **Task Name**: StructuredQAResponse Component Tests
- **Work Description**:
    - **Why**: NO test coverage. Displays formatted answers with citations.
    - **How**: Test markdown rendering, citation display
- **Resources Required**:
    - **Materials**: Jest, React Testing Library
    - **Personnel**: 1 developer (45 minutes)
    - **Reference Codes/docs**:
        - `/src/components/ui/StructuredQAResponse.tsx`
- **Deliverables**:
    - [ ] `tests/components/ui/StructuredQAResponse.test.tsx` (~240 lines, 8 tests)
- **Dependencies**: TEST-INFRA-001
- **Completion Status**: � **PENDING**
- **Notes**: Expected coverage increase: +2%

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

## Phase 6: Regression Tests [OPTIONAL]

### [ ] **Task ID**: TEST-REGR-001
- **Task Name**: Historical Bug Regression Tests
- **Work Description**:
    - **Why**: Prevent recurrence of fixed bugs (Task 1.1.1, Task 4.2, SSE batch bug).
    - **How**: Test exact bug scenarios
- **Resources Required**:
    - **Materials**: Jest, TypeScript
    - **Personnel**: 1 developer (1 hour)
    - **Reference Codes/docs**:
        - Git history for Task 1.1.1, Task 4.2
        - `docs/PerplexityAI_BugFix_WorkList.md`
- **Deliverables**:
    - [ ] `tests/regression/perplexity-bugs.test.ts` (~200 lines, 6 tests)
- **Dependencies**: TEST-INFRA-001
- **Completion Status**: � **PENDING**
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

**Last Updated**: 2025-11-24
**Next Review**: Upon completion of Phase 2
