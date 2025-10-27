# Module: `commentary-interpretation`

## 1. Module Summary

The `commentary-interpretation` module implements an AI-powered evaluation system for assessing user interpretations of Zhiyanzhai (脂硯齋) commentaries - critical annotations that provide profound insights into "Dream of the Red Chamber's" hidden meanings, symbolism, and authorial intent. This GenKit-based flow measures interpretation quality across four insight levels (surface, moderate, deep, profound), calculates literary sensitivity scores (0-100) for symbolic language understanding, and provides authoritative explanations of commentary meanings to guide students into advanced Red Mansion scholarship. The module bridges student interpretations with scholarly understanding through detailed feedback that highlights captured insights, missed symbolic meanings, and research methodology guidance.

## 2. Module Dependencies

* **Internal Dependencies:**
  * `@/ai/genkit` - Core GenKit instance (`ai`) providing `definePrompt` and `defineFlow` APIs
* **External Dependencies:**
  * `genkit` - GenKit framework providing `z` (Zod) schema validation re-export

## 3. Public API / Exports

* `scoreCommentaryInterpretation(input: CommentaryInterpretationInput): Promise<CommentaryInterpretationOutput>` - Main async function for grading Zhiyanzhai commentary interpretations
* `CommentaryInterpretationInput` - TypeScript type for input containing commentary text, related passage, chapter context, user interpretation, hints, and difficulty
* `CommentaryInterpretationOutput` - TypeScript type for output containing score, insight level, literary sensitivity, captured/missed insights, feedback, detailed analysis, and authoritative commentary explanation

## 4. Code File Breakdown

### 4.1. `commentary-interpretation.ts`

* **Purpose:** This server-side file implements advanced literary criticism assessment by evaluating how well students decode Zhiyanzhai commentaries - one of the most sophisticated aspects of Red Mansion scholarship requiring understanding of foreshadowing, symbolism, metaphor, hidden narrative layers, and authorial intent signals. The module uses a four-tier insight classification system (surface: literal understanding only; moderate: notices some implications; deep: understands major symbolism/foreshadowing; profound: grasps multilayered meanings and literary value) to differentiate between basic comprehension and scholarly interpretation. By providing authoritative commentary explanations alongside student assessment, this flow serves both evaluation and education functions, enabling students to compare their interpretations with scholarly consensus and learn the methodology of reading annotated classical texts.

* **Functions:**
    * `scoreCommentaryInterpretation(input: CommentaryInterpretationInput): Promise<CommentaryInterpretationOutput>` - Public async function serving as API entry point, delegates to internal `commentaryInterpretationFlow` with provided input. Returns Promise directly without transformation. Throws errors propagated from underlying flow.

* **Key Classes / Constants / Variables:**
    * `CommentaryInterpretationInputSchema`: Zod object schema with 6 fields:
      - `commentaryText` (string, required): Original Zhiyanzhai commentary text from Red Mansion, the annotation being interpreted
      - `relatedPassage` (string, required): Text passage from novel that commentary refers to, provides context for interpretation
      - `chapterContext` (string, required): Chapter number and context information, helps understand narrative position
      - `userInterpretation` (string, required): User's interpretation/explanation of commentary meaning to be evaluated for insight and accuracy
      - `interpretationHints` (string array, required): Key themes or symbolic meanings commentary typically reveals (e.g., foreshadowing, symbolism, character fate)
      - `difficulty` (enum: 'easy' | 'medium' | 'hard', required): Task difficulty affecting scoring criteria

    * `CommentaryInterpretationInput`: Exported TypeScript type inferred from input schema.

    * `CommentaryInterpretationOutputSchema`: Zod object schema with 8 fields:
      - `score` (number, 0-100, required): Overall interpretation quality score based on insight, accuracy, literary sensitivity
      - `insightLevel` (enum: 'surface' | 'moderate' | 'deep' | 'profound', required): Depth of interpretation insight
        * surface (表面): Only literal understanding, doesn't touch deep meanings
        * moderate (中等): Notices some implied meanings but not deep enough
        * deep (深入): Understands major symbolism and foreshadowing significance
        * profound (透徹): Deeply grasps multilayered meanings and literary value
      - `literarySensitivity` (number, 0-100, required): Literary sensitivity score measuring understanding of symbolic language, metaphor, hidden meanings
      - `keyInsightsCaptured` (string array, required): Key interpretations or symbolic meanings user successfully identified
      - `keyInsightsMissed` (string array, required): Important insights or symbolic meanings user didn't mention
      - `feedback` (string, required): Constructive Traditional Chinese feedback (100-150 chars) praising insightful observations and guiding toward deeper understanding
      - `detailedAnalysis` (string, required): Markdown-formatted detailed evaluation (250-350 chars) including interpretation strengths in bold, deepening angles as lists, research methodology guidance
      - `commentaryExplanation` (string, required): Authoritative explanation (200-300 chars) of what Zhiyanzhai commentary actually reveals, helps users understand correct interpretation

    * `CommentaryInterpretationOutput`: Exported TypeScript type inferred from output schema.

    * `commentaryInterpretationPrompt`: GenKit prompt definition with:
      - `name: 'commentaryInterpretationPrompt'`
      - Role: Scholar specializing in Zhiyanzhai commentary research
      - Template variables: `{{chapterContext}}`, `{{{relatedPassage}}}`, `{{{commentaryText}}}`, `{{{userInterpretation}}}`, `{{#each interpretationHints}}`, `{{difficulty}}`
      - Commentary significance explanation: Zhiyanzhai commentaries often reveal character fate foreshadowing/hints, symbolic significance and metaphorical techniques, Cao Xueqin's writing intentions, story ending clues, deep textual layer meanings
      - Evaluation criteria:
        * insightLevel (4-tier): surface (literal only), moderate (some implications noticed), deep (main symbolism understood), profound (multilayered meanings grasped)
        * literarySensitivity (0-100): Perception ability for symbolism, metaphor, foreshadowing
        * score (0-100): Comprehensive assessment based on insight level, literary sensitivity, accuracy
      - Difficulty-specific scoring: easy (65+ for basic meaning + 1 key insight), medium (60-80 for multilayered understanding + symbolism), hard (high scores require thorough understanding of metaphor, foreshadowing, deep implications)
      - Output requirements: score (0-100), insightLevel (enum), literarySensitivity (0-100), keyInsightsCaptured/Missed arrays, feedback (100-150 chars encouragement), detailedAnalysis (250-350 chars Markdown with interpretation highlights in bold, deepening angles as lists, research methodology), commentaryExplanation (200-300 chars authoritative explanation clarifying true meaning, symbolic significance, literary value)

    * `commentaryInterpretationFlow`: GenKit flow definition executing assessment:
      - Invokes `commentaryInterpretationPrompt(input)`
      - Validates output completeness (checks `typeof score === 'number' && insightLevel exists`)
      - Throws Chinese error if validation fails
      - Validates score and literarySensitivity within 0-100 range using `Math.max(0, Math.min(100, Math.round()))`
      - Provides defaults for optional fields (insightLevel defaults to 'moderate', literarySensitivity to 50, empty insight arrays, default feedback/analysis/explanation)
      - Catches errors (logged only in non-test environments)
      - Returns fallback assessment on error: score 50, insightLevel 'moderate', literarySensitivity 50, empty keyInsightsCaptured, all hints as missed, apologetic feedback, system message analysis and explanation

## 5. System and Data Flow

### 5.1. System Flowchart (Control Flow)

```mermaid
flowchart TD
    A[scoreCommentaryInterpretation called] --> B[Delegate to commentaryInterpretationFlow]
    B --> C[Flow executor invoked]
    C --> D[Call commentaryInterpretationPrompt]
    D --> E[Render template: chapterContext, relatedPassage, commentaryText, userInterpretation, hints, difficulty]
    E --> F[Send to Gemini 2.5 Pro]

    F --> G[AI evaluates interpretation depth]
    G --> H{Validate: output && typeof score === 'number' && insightLevel?}
    H -- Invalid --> I[Log error to console]
    I --> J[Throw Error: AI模型未能生成有效的脂批解讀評分]

    H -- Valid --> K[Validate score range 0-100]
    K --> L[Validate literarySensitivity range 0-100]
    L --> M[Apply defaults: insightLevel || 'moderate', literarySensitivity || 50]
    M --> N[Apply defaults for insight arrays, feedback, analysis, explanation]
    N --> O[Return validated output]

    J --> P[Catch Error]
    P --> Q{process.env.NODE_ENV !== 'test'?}
    Q -- True --> R[Log error to console]
    Q -- False --> S[Skip logging]
    R --> T[Return fallback: moderate insight, scores 50]
    S --> T
    T --> U[Return fallback to caller]
    O --> V[Return valid assessment to caller]
```

### 5.2. Data Flow Diagram (Data Transformation)

```mermaid
graph LR
    CommentaryTask[Commentary Decoding Task] -- commentary + passage + user interpretation + hints --> Input[CommentaryInterpretationInput]
    Input --> Flow[commentaryInterpretationFlow]

    Flow -- input --> Prompt[commentaryInterpretationPrompt]
    ScholarRole[Zhiyanzhai Scholar Persona] --> Prompt
    Prompt -- Evaluation Instructions --> AI[Gemini 2.5 Pro]

    AI -- Interpret Depth Analysis --> InsightLevelCalc[Classify: surface/moderate/deep/profound]
    AI -- Symbolic Understanding --> LiterarySensCalc[Calculate Literary Sensitivity 0-100]
    AI -- Holistic Assessment --> ScoreCalc[Calculate Score 0-100]
    AI -- Compare Interpretations --> InsightsTracking[Track Captured/Missed Insights]
    AI -- Generate Authoritative Explanation --> CommentaryExplain[Commentary Explanation]

    InsightLevelCalc --> Validation{Output Validation}
    LiterarySensCalc --> Validation
    ScoreCalc --> Validation
    InsightsTracking --> Validation
    CommentaryExplain --> Validation

    Validation -- Valid --> ScoreClamping[Clamp scores 0-100]
    ScoreClamping --> DefaultsApp[Apply defaults for optionals]

    DefaultsApp -- score --> ScoreField[score: number]
    DefaultsApp -- insightLevel --> InsightField[insightLevel: enum]
    DefaultsApp -- literarySensitivity --> SensField[literarySensitivity: number]
    DefaultsApp -- keyInsightsCaptured --> CapturedArray[captured: string[]]
    DefaultsApp -- keyInsightsMissed --> MissedArray[missed: string[]]
    DefaultsApp -- feedback --> FeedbackText[feedback: string]
    DefaultsApp -- detailedAnalysis --> AnalysisMarkdown[analysis: markdown]
    DefaultsApp -- commentaryExplanation --> ExplanationMarkdown[explanation: markdown]

    ScoreField --> Output[CommentaryInterpretationOutput]
    InsightField --> Output
    SensField --> Output
    CapturedArray --> Output
    MissedArray --> Output
    FeedbackText --> Output
    AnalysisMarkdown --> Output
    ExplanationMarkdown --> Output

    Validation -- Invalid --> ErrorHandler[Error Handling]
    ErrorHandler --> FallbackBuilder[Build Fallback: moderate, scores 50]
    FallbackBuilder --> Output

    Output --> TaskService[DailyTaskService]
    TaskService --> CommentaryResults[Commentary Decoding Results Display]
```

## 6. Usage Example & Testing

* **Usage:**
```typescript
import { scoreCommentaryInterpretation } from '@/ai/flows/commentary-interpretation';

const result = await scoreCommentaryInterpretation({
  commentaryText: "此回之文，草蛇灰線，伏延千里。",
  relatedPassage: "黛玉聽了，不覺一征，細嚼此語...",
  chapterContext: "第五回：賈寶玉神遊太虛境",
  userInterpretation: "這個批語說明這一回的內容有很多伏筆，會影響後面的故事發展。作者的寫作手法很隱晦，讀者需要仔細體會才能發現。",
  interpretationHints: ["伏筆手法", "命運暗示", "象徵意義", "文本多層含義"],
  difficulty: "hard"
});

console.log(result.score); // 75
console.log(result.insightLevel); // "deep"
console.log(result.literarySensitivity); // 78
console.log(result.keyInsightsCaptured); // ["伏筆手法", "文本多層含義"]
console.log(result.keyInsightsMissed); // ["命運暗示", "象徵意義"]
console.log(result.commentaryExplanation); // Authoritative explanation of the commentary
```

* **Testing:** This module is tested through DailyTaskService integration tests which invoke commentary interpretation assessment with varying interpretation depths. No dedicated unit test file exists. The GenKit development UI (`npm run genkit:dev`) enables manual testing with sample Zhiyanzhai commentaries. Testing strategy includes: verifying 4-tier insight level classification accuracy (distinguishing surface from profound), confirming literary sensitivity reflects symbolic understanding, validating authoritative commentary explanation provides scholarly consensus, testing difficulty-adaptive scoring (easy: 65+ for basic; hard: requires profound understanding for high scores), ensuring markdown formatting includes research methodology guidance, and checking that fallback maintains educational value with system message explanations.
