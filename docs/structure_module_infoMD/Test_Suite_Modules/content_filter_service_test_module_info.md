# Module: `content-filter-service.test.ts`

## 1. Module Summary

This enterprise-grade test suite provides exhaustive validation of the automated content moderation system with 42 comprehensive test cases achieving 91.51% code coverage. It tests multi-language profanity detection (Traditional Chinese and English), spam content identification through pattern matching and repetition analysis, hate speech detection with severity classification, personal information masking (phone numbers, emails, LINE IDs), content moderation action determination (allow/filter/hide/block), warning message generation in Chinese, configuration sensitivity levels, and performance benchmarks to ensure real-time filtering responsiveness.

## 2. Module Dependencies

* **Internal Dependencies:**
  * `@/lib/content-filter-service` - ContentFilterService class, ModerationAction type

* **External Dependencies:**
  * `jest` - Testing framework
  * `firebase/firestore` - Mocked (collection, addDoc, serverTimestamp, Timestamp)
  * `@/lib/firebase` - Mocked (db object)

## 3. Public API / Exports

This test module validates:
* `ContentFilterService` class: Main service class with analyzeContent() and processContent() methods
* `analyzeContent()`: Analyzes content returning {isAppropriate, violations, suggestedAction, confidence, warningMessage, filteredContent}
* `processContent()`: Processes content with contentId, contentType, userId tracking, returns {shouldBlock, processedContent, action, warningMessage, analysis}
* `ModerationAction` type: 'allow' | 'filter' | 'hide' | 'block' | 'flag-for-review'

## 4. Code File Breakdown

### 4.1. `content-filter-service.test.ts`

* **Purpose:** Provides mission-critical test coverage for the content moderation system that protects community safety and user experience. This file validates detection accuracy across 4 violation categories (profanity, spam, hate-speech, personal-info) with proper severity classification (low/medium/high), ensures correct moderation actions are suggested based on violation combinations and confidence scores, verifies filtered content properly masks violations with asterisks and [個人資訊已隱藏] placeholders, tests warning message generation in Chinese for user education, validates configuration flexibility through sensitivity levels, and benchmarks processing performance to maintain <100ms response times for real-time filtering.

* **Functions:**
    * **Test Category: Clean Content**
      * `should allow appropriate Chinese content` - Tests '我很喜歡讀紅樓夢，這是一本很好的古典小說' returns isAppropriate=true, violations=[], suggestedAction='allow', confidence=0, warningMessage=''
      * `should allow appropriate English content` - Tests 'Dream of the Red Chamber is a masterpiece' returns isAppropriate=true, suggestedAction='allow'
      * `should handle empty content` - Tests empty string returns isAppropriate=true, suggestedAction='allow'
      * `should handle very short content` - Tests single character '好' returns isAppropriate=true

    * **Test Category: Profanity Detection**
      * `should detect Chinese profanity` - Tests '你這個白痴在說什麼' detects profanity violation with type='profanity', severity='medium', matchedTerms=['白痴'], suggestedAction='filter' or 'hide', filteredContent contains '**'
      * `should detect English profanity` - Tests 'You are so stupid and idiotic' detects profanity, filteredContent contains '*'
      * `should handle multiple profanity instances` - Tests '你這個白痴智障真的很蠢' detects severity='medium' (實際邏輯：只有>2個才是high), matchedTerms.length >1
      * `should generate appropriate profanity warning` - Tests '白痴' generates warningMessage containing '不當用語'

    * **Test Category: Spam Detection**
      * `should detect repeated characters as spam` - Tests 'aaaaaaaa來看看這個優惠!!!!!!' detects spam violation, suggestedAction='hide'
      * `should detect promotional spam patterns` - Tests '限時優惠！買一送一，免費註冊加LINE:12345' detects spam with matchedTerms.length > 0
      * `should detect excessive word repetition` - Tests '賺錢' repeated 10 times detects spam
      * `should generate appropriate spam warning` - Tests 'aaaaaaaa' generates warningMessage containing '垃圾信息'

    * **Test Category: Hate Speech Detection**
      * `should detect Chinese hate speech` - Tests '你這個廢物滾出去' detects hate-speech violation with severity='high', suggestedAction='hide' (實際邏輯：hasHighSeverity優先返回hide)
      * `should detect English hate speech` - Tests 'You are trash and don\'t deserve to be here' detects hate-speech, suggestedAction='hide'
      * `should generate appropriate hate speech warning` - Tests '你這個廢物' generates warningMessage containing '仇恨言論'

    * **Test Category: Personal Information Detection**
      * `should detect Taiwan mobile phone numbers` - Tests '有問題可以打電話給我 0912345678' detects personal-info violation, filteredContent contains '[個人資訊已隱藏]'
      * `should detect email addresses` - Tests '聯絡我的email: test@example.com' detects personal-info, masks email
      * `should detect LINE ID sharing` - Tests '加我line id: testuser123' detects personal-info or spam (可能同時觸發), masks LINE ID
      * `should generate appropriate personal info warning` - Tests '0912345678' generates warningMessage containing '個人資訊'

    * **Test Category: Mixed Violations**
      * `should handle multiple violation types` - Tests '你這個白痴 0912345678 aaaaaaaa' detects 3+ violations: profanity, personal-info, spam
      * `should prioritize most severe action - hate speech over others` - Tests '你這個廢物滾出去 0912345678' returns suggestedAction='hide' (實際邏輯：hasHighSeverity優先)
      * `should combine multiple warning messages` - Tests '白痴 0912345678' combines '不當用語' and '個人資訊' warnings

    * **Test Category: processContent Method**
      * `should process clean content without blocking` - Tests processContent() with clean text returns shouldBlock=false, action='allow', warningMessage=''
      * `should block content with hate speech` - Tests hate speech returns shouldBlock=true, action='hide' (實際返回hide而不是block)
      * `should filter profanity but not block` - Tests profanity returns shouldBlock=false, processedContent contains '*', action='filter'
      * `should hide spam content` - Tests spam returns shouldBlock=true, action='hide'
      * `should mask personal information` - Tests personal info returns shouldBlock=false, processedContent contains '[個人資訊已隱藏]', action='filter'

    * **Test Category: Configuration Sensitivity**
      * `should respect low sensitivity settings` - Tests '白痴' with sensitivity='low', autoHideThreshold=0.9 returns less restrictive action
      * `should respect high sensitivity settings` - Tests 'stupid' with sensitivity='high', autoHideThreshold=0.3 returns stricter action not 'allow'
      * `should allow disabling specific filters` - Tests '白痴' with enableProfanityFilter=false returns isAppropriate=true, violations=[]

    * **Test Category: Edge Cases and Error Handling**
      * `should handle very long content` - Tests '紅樓夢' repeated 1000 times returns isAppropriate=true, suggestedAction='allow'
      * `should handle content with special characters` - Tests '《紅樓夢》第一章：甄士隱夢幻識通靈 賈雨村風塵懷閨秀' returns isAppropriate=true
      * `should handle errors gracefully in analyzeContent` - Tests null input returns isAppropriate=true, suggestedAction='flag-for-review', console.error called
      * `should handle errors gracefully in processContent` - Tests null input returns shouldBlock=false, action='flag-for-review', console.error called

    * **Test Category: Moderation Actions Logic**
      * `should determine correct action for high confidence violations` - Tests '你這個廢物白痴滾出去 aaaaaaaa' with confidence >0.7 returns suggestedAction='hide'
      * `should flag ambiguous content for review` - Tests content with violations but confidence <0.7 returns 'flag-for-review'

    * **Test Category: Content Type Handling**
      * `should handle post content type` - Tests '白痴' with contentType='post' detects profanity
      * `should handle comment content type` - Tests '白痴' with contentType='comment' detects profanity

    * **Test Category: Real-world Content Examples**
      * `should handle typical forum discussions appropriately` - Tests 5 real-world forum posts about 紅樓夢 all return isAppropriate=true, suggestedAction='allow'
      * `should properly escalate severe violations` - Tests '你這個廢物滾出去不配活在這個世界上' returns shouldBlock=true, action='hide', warningMessage defined

    * **Test Category: Performance and Efficiency**
      * `should process content efficiently` - Benchmarks '這是一個測試內容，包含一些文字用來測試處理速度' processing time <100ms
      * `should handle batch processing` - Tests array of 5 different contents (clean, profanity, spam, personal-info, normal) all process successfully

* **Key Classes / Constants / Variables:**
    * `contentFilterService` (test instance): ContentFilterService instance recreated in beforeEach for isolated testing

    * `testLogger` (mock logger): Object with logs array and log method for tracking test execution flow

## 5. System and Data Flow

### 5.1. System Flowchart (Control Flow)

```mermaid
flowchart TD
    A[Start: analyzeContent] --> B{Check Profanity Filter};
    B -- Enabled --> C[Scan for profanity keywords];
    C -- Found --> D[Add profanity violation];
    C -- Not found --> E;
    B -- Disabled --> E;

    E[Check Spam Filter] --> F{Detect spam patterns};
    F -- Repeated chars --> G[Add spam violation];
    F -- Promotional keywords --> G;
    F -- Word repetition --> G;
    F -- Clean --> H;
    G --> H;

    H[Check Hate Speech] --> I{Detect hate speech};
    I -- Found --> J[Add high-severity violation];
    I -- Not found --> K;
    J --> K;

    K[Check Personal Info] --> L{Detect PII};
    L -- Phone/Email/LINE --> M[Add personal-info violation];
    L -- Clean --> N;
    M --> N;

    N{Evaluate Violations} --> O[Calculate confidence];
    O --> P{hasHateSpeech?};
    P -- Yes --> Q[suggestedAction = 'hide'];
    P -- No --> R{hasHighSeverity?};
    R -- Yes --> Q;
    R -- No --> S{violation count > 0?};
    S -- Yes --> T[suggestedAction = 'filter' or 'hide'];
    S -- No --> U[suggestedAction = 'allow'];

    Q --> V[Generate warnings];
    T --> V;
    U --> V;
    V --> W[Apply filters to content];
    W --> X[Return analysis result];
```

### 5.2. Data Flow Diagram (Data Transformation)

```mermaid
graph LR
    Input[User Content] --> Analyze[Content Analyzer];
    Analyze -- Check patterns --> Profanity[Profanity Detector];
    Profanity -- Matches --> V1[Violation: profanity];
    Analyze --> Spam[Spam Detector];
    Spam -- Patterns found --> V2[Violation: spam];
    Analyze --> Hate[Hate Speech Detector];
    Hate -- Keywords --> V3[Violation: hate-speech];
    Analyze --> PII[Personal Info Detector];
    PII -- Regex matches --> V4[Violation: personal-info];

    V1 --> Aggregator[Violation Aggregator];
    V2 --> Aggregator;
    V3 --> Aggregator;
    V4 --> Aggregator;

    Aggregator --> Confidence[Confidence Calculator];
    Confidence --> Action[Action Determiner];
    Action -- allow/filter/hide/block --> Filter[Content Filter];

    Filter -- Mask profanity --> Masked1[Replace with **];
    Filter -- Mask PII --> Masked2[Replace with [個人資訊已隱藏]];

    Masked1 --> Output[Filtered Content];
    Masked2 --> Output;
    Action --> Warning[Warning Generator];
    Warning --> Output;
```

## 6. Usage Example & Testing

* **Usage:**
```typescript
// Run all content filter tests
npm test -- tests/lib/content-filter-service.test.ts

// Run specific category
npm test -- tests/lib/content-filter-service.test.ts -t "Profanity Detection"

// Run with coverage
npm test -- tests/lib/content-filter-service.test.ts --coverage
```

* **Testing:** Enterprise-grade test suite with 42 test cases achieving 91.51% code coverage:
  - **Clean Content**: 4 tests validating appropriate content passes through
  - **Profanity Detection**: 4 tests for multi-language profanity filtering
  - **Spam Detection**: 4 tests for pattern-based spam identification
  - **Hate Speech Detection**: 3 tests for severe violation handling
  - **Personal Information**: 4 tests for PII masking (phone/email/LINE)
  - **Mixed Violations**: 3 tests for multi-violation scenarios
  - **processContent**: 5 tests for full workflow integration
  - **Configuration**: 3 tests for sensitivity customization
  - **Edge Cases**: 4 tests for error handling and special inputs
  - **Actions Logic**: 2 tests for moderation decision-making
  - **Content Types**: 2 tests for post/comment differentiation
  - **Real-world Examples**: 2 tests with actual forum content
  - **Performance**: 2 tests benchmarking <100ms processing time
  - **Pass Rate**: 100%
  - **Coverage**: 91.51% (branches, functions, lines, statements)
