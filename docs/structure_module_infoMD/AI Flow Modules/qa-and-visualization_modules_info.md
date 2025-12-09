# AI Flow Modules - QA and Visualization (Updated 2025-12-08)

**Migration Status:** QA and visualization flows migrated from GenKit/Gemini to Perplexity Sonar on 2025-10-30.

**Architecture Update (2025-12-08):** Implemented Adapter Pattern for Perplexity streaming. New `PerplexityStreamAdapter` (`src/lib/adapters/`) provides cleaner streaming logic ported from Side Project A. Feature Flag control (`PERPLEXITY_USE_NEW_ADAPTER`) enables gradual rollout between legacy `PerplexityClient` and new adapter.

**Current Architecture:** All QA and relationship mapping flows use Perplexity Sonar API with web search capabilities for real-time scholarly research integration.

---

# Module: `perplexity-red-chamber-qa`

## 1. Module Summary

The `perplexity-red-chamber-qa` module implements the core AI-powered question answering system for "Dream of the Red Chamber" analysis using Perplexity Sonar API with real-time web search grounding capabilities. This module provides three operational modes (standard request, streaming response, and batch processing) along with extensive helper functions for input creation, model capability queries, and response formatting. The module serves as the primary interface between the educational platform and Perplexity's reasoning-capable AI models (sonar-pro, sonar-reasoning, sonar-reasoning-pro), enabling students to receive comprehensive literary analysis with citations, web-grounded research, and adaptive reasoning based on question complexity.

## 2. Module Dependencies

* **Internal Dependencies:**
  * `@/types/perplexity-qa` - Type definitions and validation functions (`PerplexityQAInput`, `PerplexityQAResponse`, `PerplexityStreamingChunk`, `PerplexityBatchQAInput`, `PerplexityBatchQAResponse`, `createPerplexityQAInput`, `validatePerplexityQAInput`, `DEFAULT_PERPLEXITY_QA_CONFIG`)
  * `@/lib/perplexity-client` - HTTP client for Perplexity API (`PerplexityClient`, `getDefaultPerplexityClient`)
  * `@/ai/perplexity-config` - Configuration constants and utilities (`PERPLEXITY_CONFIG`, `supportsReasoning`, type exports for `PerplexityModelKey`, `ReasoningEffort`, `QuestionContext`)
  * `@/lib/terminal-logger` - Comprehensive logging utilities (`terminalLogger`, `debugLog`, `errorLog`, `traceLog`)
  * `@/lib/perplexity-feature-flags` - Feature flag control for adapter switching (`shouldUseNewAdapter`, `PERPLEXITY_FLAGS`) **(Added 2025-12-08)**
  * `@/lib/adapters` - New Perplexity Stream Adapter module (`PerplexityStreamAdapter`) **(Added 2025-12-08)**
* **External Dependencies:**
  * `zod` - Schema validation library for runtime type checking and validation

## 3. Public API / Exports

### Core Functions

* `perplexityRedChamberQA(input: PerplexityQAInput): Promise<PerplexityQAResponse>` - Main async function for standard non-streaming Q&A requests with complete response

### Streaming Support

* `perplexityRedChamberQAStreaming(input: PerplexityQAInput): AsyncGenerator<PerplexityStreamingChunk>` - Async generator function for real-time streaming responses with progressive content delivery. Uses `for await` loop to yield chunks progressively. Validates async iterator compatibility and includes comprehensive debug logging via `terminalLogger`.

### Batch Processing

* `perplexityRedChamberQABatch(input: PerplexityBatchQAInput): Promise<PerplexityBatchQAResponse>` - Async function for processing multiple questions concurrently with semaphore-based concurrency control (default: 3 concurrent requests). Returns aggregated responses with batch metadata including total/successful/failed counts and timing statistics.

### Helper Functions

* `createPerplexityQAInputForFlow(userQuestion, selectedTextInfo?, chapterContextSnippet?, currentChapter?, options?): Promise<PerplexityQAInput>` - Helper function to create properly formatted input from flow parameters. **Used by other flows** (context-aware-analysis, explain-text-selection, interactive-character-relationship-map) to construct Perplexity inputs consistently.
* `getModelCapabilities(modelKey: PerplexityModelKey): Promise<object>` - Helper function returning capability flags (supportsReasoning, supportsStreaming, supportsCitations, supportsWebSearch) for specified model
* `getSuggestedQuestions(): Promise<Record<QuestionContext, string[]>>` - Helper function providing pre-written example questions for each context type (character, plot, theme, general)
* `formatPerplexityResponse(response: PerplexityQAResponse): Promise<object>` - Helper function formatting responses for UI display with citationSummary, processingInfo, and modelInfo fields

### Schema Exports (Server Actions Compatibility)

* `getPerplexityQAInputSchema(): Promise<ZodSchema>` - Async function returning input validation schema
* `getPerplexityQAOutputSchema(): Promise<ZodSchema>` - Async function returning output validation schema

> [!IMPORTANT]
> **Internal Dependency Hub:** This module serves as the central Perplexity integration point. Other flows (context-aware-analysis, explain-text-selection, interactive-character-relationship-map) depend on this module's `createPerplexityQAInputForFlow()` and `perplexityRedChamberQA()` functions.

## 4. Code File Breakdown

### 4.1. `perplexity-red-chamber-qa.ts`

* **Purpose:** This server-side file serves as the comprehensive orchestration layer for all Perplexity AI integration in the Red Mansion learning platform, providing three distinct operational patterns (request/response, streaming, batch) to support different UI interaction models. The module implements sophisticated input validation using Zod schemas with 13 configurable parameters, manages API communication through the PerplexityClient abstraction, and provides extensive error handling with fallback responses to ensure resilient user experiences. By exposing helper functions for input creation, capability checking, and response formatting, this module enables consistent Perplexity integration across multiple features while centralizing configuration and error handling logic.

* **Functions:**
    * `perplexityRedChamberQA(input: PerplexityQAInput): Promise<PerplexityQAResponse>` - Main Q&A function that validates input using `validatePerplexityQAInput()`, applies defaults via `createPerplexityQAInput()`, retrieves default Perplexity client, executes `client.completionRequest()`, logs request/response metadata (question length, model, success status, answer length, citation count, processing time), and returns complete response object. On error, catches exceptions, logs only in non-test environments, and returns error response object with `success: false`, error message in Chinese, empty citations/grounding arrays, and metadata placeholders. Never throws errors; always returns valid `PerplexityQAResponse` structure.

    * `perplexityRedChamberQAStreaming(input: PerplexityQAInput): AsyncGenerator<PerplexityStreamingChunk>` - Async generator function for real-time streaming that validates input, forces `enableStreaming: true` in processed input, retrieves Perplexity client, invokes `client.streamingCompletionRequest()` which returns an async iterable, validates that returned value has `Symbol.asyncIterator` (throws TypeError if not async iterable), iterates over chunks with `for await`, yields each chunk to caller, logs completion when `chunk.isComplete === true`, breaks iteration on completion. Extensive debug logging at each step using `terminalLogger.logAsyncGeneratorStart()`, `debugLog()`, and `terminalLogger.logForAwaitStart()`. On error, catches exceptions, logs with `terminalLogger.logAsyncGeneratorError()`, and yields single error chunk with Chinese error message, empty arrays, and `isComplete: true`. Used by streaming API endpoints for progressive UI updates.

    * `perplexityRedChamberQABatch(input: PerplexityBatchQAInput): Promise<PerplexityBatchQAResponse>` - Batch processing function that accepts array of questions with shared config, implements semaphore-based concurrency control (default 3 concurrent requests), processes each question by merging with `sharedConfig`, calls `perplexityRedChamberQA()` for each, tracks successes/failures, releases semaphore slots after completion, waits for all promises with `Promise.all()`, calculates total and average processing times, returns batch response with all individual responses, metadata summary (total/successful/failed counts, timing), success flag, and error array if any failures occurred. Enables efficient processing of multiple questions while respecting API rate limits through controlled concurrency.

    * `createPerplexityQAInputForFlow(userQuestion: string, selectedTextInfo?: {text: string; position: any; range: any} | null, chapterContextSnippet?: string, currentChapter?: string, options?: Partial<PerplexityQAInput>): Promise<PerplexityQAInput>` - Helper function that constructs properly formatted `PerplexityQAInput` by extracting text from `selectedTextInfo?.text`, passing chapter context and current chapter, merging additional options, and delegating to core `createPerplexityQAInput()` function from types module. Used by other AI flows (like explain-text-selection) to consistently format inputs without understanding full Perplexity schema details.

    * `getModelCapabilities(modelKey: PerplexityModelKey): Promise<object>` - Async helper function returning static capability object for specified model with four boolean flags: `supportsReasoning` (determined by calling `supportsReasoning(modelKey)`), `supportsStreaming: true` (all models support streaming), `supportsCitations: true` (all models support citations), `supportsWebSearch: true` (all models support web search grounding). Used by UI to conditionally render features based on selected model.

    * `getSuggestedQuestions(): Promise<Record<QuestionContext, string[]>>` - Async helper function returning hard-coded object mapping each of 4 question contexts (`character`, `plot`, `theme`, `general`) to arrays of 4 example questions in Traditional Chinese. Questions are domain-specific literary analysis queries about Red Mansion (e.g., character personality questions for 'character' context, plot structure questions for 'plot' context). Used by UI to provide question templates and inspire user queries.

    * `formatPerplexityResponse(response: PerplexityQAResponse): Promise<object>` - Async helper function that enhances response object with additional formatted fields for UI display: `formattedAnswer` (unchanged answer), `citationSummary` (Chinese string "找到 X 個引用來源"), `processingInfo` (Chinese string "處理時間: X.XX秒"), `modelInfo` (Chinese string combining model key and optional reasoning effort). Returns augmented object with original response fields plus new display fields.

    * `getPerplexityQAInputSchema(): Promise<ZodSchema>` - Async function wrapper around `PerplexityQAInputSchemaObject` constant, required for Next.js Server Actions compatibility which cannot directly export Zod schemas. Returns the input validation schema for runtime use.

    * `getPerplexityQAOutputSchema(): Promise<ZodSchema>` - Async function wrapper around `PerplexityQAOutputSchemaObject` constant, required for Server Actions compatibility. Returns the output validation schema.

* **Key Classes / Constants / Variables:**
    * `PerplexityQAInputSchemaObject`: Comprehensive Zod object schema with 13 fields defining complete input contract:
      - `userQuestion` (string, 1-1000 chars, required): User's question about Red Mansion
      - `selectedText` (string, optional): Selected text snippet from novel
      - `chapterContext` (string, optional): Current chapter context snippet
      - `currentChapter` (string, optional): Current chapter name/number
      - `modelKey` (enum: 'sonar-pro' | 'sonar-reasoning' | 'sonar-reasoning-pro', optional): Preferred model
      - `reasoningEffort` (enum: 'low' | 'medium' | 'high', optional): Reasoning intensity for reasoning-capable models
      - `questionContext` (enum: 'character' | 'plot' | 'theme' | 'general', optional): Question context type for specialized prompting
      - `enableStreaming` (boolean, default true): Enable streaming responses
      - `includeDetailedCitations` (boolean, default true): Include detailed citation information
      - `showThinkingProcess` (boolean, default true): Display AI reasoning process
      - `temperature` (number, 0-1, optional): Generation randomness
      - `maxTokens` (number, 1-8000, optional): Maximum response tokens
      All descriptions in Traditional Chinese. Used for runtime validation and TypeScript inference.

    * `PerplexityQAOutputSchemaObject`: Comprehensive Zod object schema with 20 fields defining complete response contract including: `question`, `answer`, `rawAnswer`, `citations` (array of citation objects with number/title/url/type/snippet/publishDate/domain), `groundingMetadata` (searchQueries/webSources/confidenceScore/groundingSuccessful/rawMetadata), `modelUsed`, `modelKey`, `reasoningEffort`, `questionContext`, `processingTime`, `success`, `streaming`, `chunkCount`, `stoppedByUser`, `timestamp`, `answerLength`, `questionLength`, `citationCount`, `error`, `metadata`. All descriptions in Traditional Chinese.

## 5. System and Data Flow

### 5.1. System Flowchart (Control Flow)

```mermaid
flowchart TD
    A[perplexityRedChamberQA called] --> B[Log request metadata]
    B --> C[Call validatePerplexityQAInput]
    C --> D{Validation valid?}
    D -- False --> E[Throw Error: 輸入驗證失敗]
    D -- True --> F[Call createPerplexityQAInput for defaults]

    F --> G[Get default Perplexity client]
    G --> H[Call client.completionRequest]

    H --> I[Log completion metadata]
    I --> J[Return response]

    E --> K[Catch Error]
    H --> K
    K --> L{process.env.NODE_ENV !== 'test'?}
    L -- True --> M[Log error to console]
    L -- False --> N[Skip logging]
    M --> O[Build error response object]
    N --> O
    O --> P[Return error response with success: false]

    Q[perplexityRedChamberQAStreaming called] --> R[Log streaming request]
    R --> S[Validate input]
    S --> T{Valid?}
    T -- False --> U[Yield error chunk]
    T -- True --> V[Force enableStreaming: true]
    V --> W[Get Perplexity client]
    W --> X[Call client.streamingCompletionRequest]
    X --> Y{Is AsyncIterable?}
    Y -- False --> Z[Throw TypeError]
    Y -- True --> AA[for await chunk of generator]
    AA --> AB[Yield chunk]
    AB --> AC{chunk.isComplete?}
    AC -- True --> AD[Log completion, break]
    AC -- False --> AA
    Z --> AE[Catch Error]
    AD --> AF[Generator complete]
    AE --> AG[Yield error chunk with isComplete: true]

    AH[perplexityRedChamberQABatch called] --> AI[Initialize semaphore array]
    AI --> AJ[Create processing promises for all questions]
    AJ --> AK{Wait for semaphore slot]
    AK -- Available --> AL[Merge question with sharedConfig]
    AL --> AM[Call perplexityRedChamberQA]
    AM --> AN[Track success/failure]
    AN --> AO[Release semaphore slot]
    AO --> AP{More questions?}
    AP -- Yes --> AK
    AP -- No --> AQ[Wait Promise.all]
    AQ --> AR[Calculate timing metrics]
    AR --> AS[Return batch response]
```

### 5.2. Data Flow Diagram (Data Transformation)

```mermaid
graph LR
    UserQ[User Question + Context] -- Raw Input --> Validator[validatePerplexityQAInput]
    Validator -- ValidationResult --> Decision{valid?}
    Decision -- True --> DefaultApplier[createPerplexityQAInput]
    Decision -- False --> ErrorBuilder[Build Error]

    DefaultApplier -- PerplexityQAInput --> ClientGetter[getDefaultPerplexityClient]
    ClientGetter -- PerplexityClient --> APICall[client.completionRequest]

    Config[PERPLEXITY_CONFIG] --> APICall
    ModelInfo[Model Capabilities] --> APICall

    APICall -- HTTP Request --> PerplexityAPI[Perplexity Sonar API]
    PerplexityAPI -- HTTP Response --> ResponseParser[Response Parsing]

    ResponseParser -- answer --> AnswerField[Answer Field]
    ResponseParser -- citations --> CitationsArray[Citations Array]
    ResponseParser -- metadata --> MetadataObj[Grounding Metadata]

    AnswerField --> FinalResponse[PerplexityQAResponse]
    CitationsArray --> FinalResponse
    MetadataObj --> FinalResponse
    ProcessingTime[Timing Calculation] --> FinalResponse

    FinalResponse -- success: true --> UIDisplay[UI Display]
    ErrorBuilder -- success: false --> UIDisplay]

    StreamInput[Streaming Input] -- enableStreaming: true --> StreamClient[client.streamingCompletionRequest]
    StreamClient -- AsyncGenerator --> ChunkIterator[for await loop]
    ChunkIterator -- Progressive Chunks --> StreamYield[yield chunks]
    StreamYield --> UIStream[Progressive UI Updates]

    BatchInput[Question Array] --> Semaphore[Concurrency Control]
    Semaphore -- Controlled Parallel --> MultipleAPICalls[Multiple completionRequest calls]
    MultipleAPICalls -- Individual Responses --> ResponseAggregator[Aggregate Results]
    ResponseAggregator -- Batch Metadata --> BatchOutput[PerplexityBatchQAResponse]
```

## 6. Usage Example & Testing

* **Usage:**
```typescript
import {
  perplexityRedChamberQA,
  perplexityRedChamberQAStreaming,
  createPerplexityQAInputForFlow
} from '@/ai/flows/perplexity-red-chamber-qa';

// Standard request
const response = await perplexityRedChamberQA({
  userQuestion: "林黛玉的性格特點有哪些？",
  modelKey: 'sonar-reasoning-pro',
  reasoningEffort: 'high',
  questionContext: 'character'
});
console.log(response.answer);
console.log(response.citations);

// Streaming request
const stream = perplexityRedChamberQAStreaming({
  userQuestion: "《紅樓夢》的主要藝術成就有哪些？",
  enableStreaming: true,
  showThinkingProcess: true
});

for await (const chunk of stream) {
  console.log(chunk.content); // Progressive content
  if (chunk.isComplete) {
    console.log(chunk.citations);
    break;
  }
}

// Using helper for other flows
const input = await createPerplexityQAInputForFlow(
  "這段話是什麼意思？",
  { text: "黛玉聽了..." },
  "第三十二回內容...",
  "第三十二回",
  { reasoningEffort: 'medium' }
);
```

* **Testing:** This module is integration-tested through API route testing in `/src/app/api/perplexity-qa-stream/` which consumes the streaming function. The module uses environment variable checks (`process.env.NODE_ENV !== 'test'`) to suppress logging during test execution. Perplexity client interactions are mocked in tests through the `@/lib/perplexity-client` abstraction. Input validation is tested by providing invalid schemas and confirming validation error messages. Streaming behavior is tested by mocking async generator responses and verifying chunk yielding. Error handling is validated by forcing client errors and confirming fallback response structure matches expected schema.


# Module: `interactive-character-relationship-map`

## 1. Module Summary

The `interactive-character-relationship-map` module implements a streamlined AI-powered flow for extracting and describing character relationships from text passages to support interactive graph visualization in the Red Mansion learning platform. This module uses **Perplexity Sonar** (specifically the `sonar-reasoning` model) to analyze a given text passage, identify all mentioned characters, and generate comprehensive Traditional Chinese descriptions of their relationships (familial, romantic, adversarial, etc.). The module provides verbose, detailed relationship descriptions structured for easy parsing and rendering as interactive network graphs, helping students visualize the complex character dynamics in the novel.

## 2. Module Dependencies

* **Internal Dependencies:**
  * `@/ai/flows/perplexity-red-chamber-qa` - Core Perplexity QA flow (`perplexityRedChamberQA`, `createPerplexityQAInputForFlow`)
* **External Dependencies:**
  * `zod` - Schema validation library for type-safe inputs and outputs

## 3. Public API / Exports

* `generateCharacterRelationshipMap(input: CharacterRelationshipMapInput): Promise<CharacterRelationshipMapOutput>` - Main async function for generating character relationship descriptions from text
* `CharacterRelationshipMapInput` - TypeScript type for input containing text passage for relationship extraction
* `CharacterRelationshipMapOutput` - TypeScript type for output containing relationship description suitable for graph rendering

## 4. Code File Breakdown

### 4.1. `interactive-character-relationship-map.ts`

* **Purpose:** This server-side file implements a focused AI flow specifically designed to power interactive character relationship visualizations. It leverages Perplexity's reasoning capabilities (`sonar-reasoning`) to extract deep relationship insights from text passages. Unlike simple entity extraction, this flow generates rich, descriptive narratives about how characters interact, their status, and the nature of their bonds (e.g., "romantic", "familial", "adversarial"). This verbose output is then used by the frontend to construct detailed knowledge graphs.

* **Functions:**
    * `generateCharacterRelationshipMap(input: CharacterRelationshipMapInput): Promise<CharacterRelationshipMapOutput>` - Public async function serving as API entry point. It constructs a specialized prompt for Perplexity, calls the `perplexityRedChamberQA` flow with `sonar-reasoning` model and `medium` reasoning effort, and returns the generated description. Includes error handling and fallback mechanisms.

* **Key Classes / Constants / Variables:**
    * `CharacterRelationshipMapInputSchema`: Zod object schema with single field:
      - `text` (string, required): Current text from which to extract character relationships
    
    * `CharacterRelationshipMapOutputSchema`: Zod object schema with single field:
      - `description` (string, required): Description of character relationships in text, suitable for rendering as an interactive graph.

## 5. System and Data Flow

### 5.1. System Flowchart (Control Flow)

```mermaid
flowchart TD
    A[generateCharacterRelationshipMap called] --> B[Construct Analysis Prompt]
    B --> C[Create Perplexity QA Input]
    C --> D[Set Model: sonar-reasoning]
    D --> E[Call perplexityRedChamberQA]
    
    E --> F{Success?}
    F -- Yes --> G[Return AI Description]
    F -- No --> H[Log Error]
    H --> I[Return Fallback Description]
    
    G --> J[Return Output to Caller]
    I --> J
```

### 5.2. Data Flow Diagram (Data Transformation)

```mermaid
graph LR
    PassageText[Text Passage] -- text --> Input[CharacterRelationshipMapInput]
    Input --> PromptBuilder[Prompt Construction]
    
    PromptBuilder -- "Extract relationships..." --> PerplexityInput[PerplexityQAInput]
    PerplexityInput -- "sonar-reasoning" --> PerplexityAPI[Perplexity API]
    
    PerplexityAPI -- "Detailed Analysis" --> Response[PerplexityQAResponse]
    Response -- answer --> Output[CharacterRelationshipMapOutput]
    
    Output --> GraphParser[Graph Parsing Layer]
    GraphParser -- Parse Description --> Nodes[Graph Nodes: Characters]
    GraphParser -- Parse Description --> Edges[Graph Edges: Relationships]
    
    Nodes --> Visualization[Interactive Graph UI]
    Edges --> Visualization
```

## 6. Usage Example & Testing

* **Usage:**
```typescript
import { generateCharacterRelationshipMap } from '@/ai/flows/interactive-character-relationship-map';

const result = await generateCharacterRelationshipMap({
  text: `寶玉見黛玉來了，便笑道：「來了，我正想你。」黛玉聽了，臉一紅。旁邊寶釵見了，心中暗嘆。`
});

console.log(result.description);
// "在這段文字中，賈寶玉與林黛玉之間存在濃厚的情感聯繫...
//  1. 賈寶玉：榮國府公子...
//  2. 林黛玉：寶玉姑表妹...
//  3. 薛寶釵：..."
```

* **Testing:** This module is tested through integration with the knowledge graph visualization feature. Testing involves verifying that the Perplexity-generated descriptions are rich enough to be parsed into nodes and edges, and that the fallback mechanism works correctly when the API is unavailable. The switch to `sonar-reasoning` provides more accurate relationship inference compared to the previous Gemini implementation.


---

## Migration Notes (2025-10-30)

### Architecture Changes

**perplexity-red-chamber-qa & interactive-character-relationship-map:**
- **From:** GenKit + Gemini 2.5 Pro
- **To:** Perplexity Sonar with web search capabilities
- **Reason:** Q&A and analysis tasks benefit from real-time web search to access contemporary scholarly research

### Benefits of Migration

- **Web Search Integration:** Real-time access to contemporary Red Chamber scholarship and academic sources
- **Citation Support:** Automatic scholarly citations with sources, URLs, and publication metadata
- **Multiple Models:** Access to sonar-pro, sonar-reasoning, and sonar-reasoning-pro for different complexity levels
- **Reasoning Capability:** Advanced reasoning effort levels (low/medium/high) for complex literary analysis
- **Streaming Support:** Progressive response delivery for better UX
- **Simplified Architecture:** Direct API integration without GenKit framework overhead

### Testing Migration

All flows now tested through Jest unit tests with mocked Perplexity API responses:
- Integration tests via API routes in `/src/app/api/perplexity-qa-stream/`
- Mocked responses for consistent testing
- Environment-aware logging (suppressed in test mode)

Run tests: `npm test -- tests/ai/flows/`

---

**Document Version:** 2.3
**Last Updated:** 2025-12-08 (Adapter Pattern implementation - added PerplexityStreamAdapter and Feature Flag support)
**Migration Date:** 2025-10-30
**Previous Version:** GenKit/Gemini-based (see git history before 2025-10-30)

---

## Adapter Pattern Architecture (2025-12-08)

### Overview

A new Adapter Pattern implementation was introduced to address complexity issues with the legacy `PerplexityClient` (1300+ lines). The new `PerplexityStreamAdapter` provides cleaner streaming logic ported from a validated Side Project.

### New Files

| File | Purpose | Lines |
|------|---------|-------|
| `src/lib/adapters/index.ts` | Module exports | ~35 |
| `src/lib/adapters/types.ts` | Adapter-specific type definitions | ~130 |
| `src/lib/adapters/simple-think-parser.ts` | `<think>` tag parser (state machine) | ~220 |
| `src/lib/adapters/simple-chat-stream.ts` | Native fetch SSE streaming | ~360 |
| `src/lib/adapters/perplexity-stream-adapter.ts` | AsyncGenerator adapter | ~450 |
| `src/lib/perplexity-feature-flags.ts` | Feature flag control | ~190 |

### Feature Flags

```bash
# Enable new adapter (100% traffic)
PERPLEXITY_USE_NEW_ADAPTER=true

# Enable debug logging
PERPLEXITY_DEBUG_ADAPTER=true

# Percentage-based rollout (0-100)
PERPLEXITY_NEW_ADAPTER_PERCENTAGE=10
```

### Usage

The `perplexityRedChamberQAStreaming()` function automatically checks `shouldUseNewAdapter()` to determine which implementation to use:

```typescript
// In perplexity-red-chamber-qa.ts
const useNewAdapter = shouldUseNewAdapter();

if (useNewAdapter) {
  // Uses PerplexityStreamAdapter (new, cleaner logic)
  const adapter = new PerplexityStreamAdapter();
  for await (const chunk of adapter.streamingQA(input)) {
    yield chunk;
  }
} else {
  // Uses PerplexityClient (legacy)
  const client = getDefaultPerplexityClient();
  for await (const chunk of client.streamingCompletionRequest(input)) {
    yield chunk;
  }
}
```

### Related Documentation

- Analysis Document: `docs/AI_QA_Module_Problem/TASK-006_Adapter_Pattern_Analysis.md`
- Work List: `docs/AI_QA_Module_Problem/perplexity_reconstruct_workList.md`
- Smoke Test Guide: `docs/AI_QA_Module_Problem/smoke_test_guide.md`

