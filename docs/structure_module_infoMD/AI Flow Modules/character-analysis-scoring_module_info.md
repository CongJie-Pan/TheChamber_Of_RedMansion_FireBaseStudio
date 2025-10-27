# Module: `character-analysis-scoring`

## 1. Module Summary

The `character-analysis-scoring` module implements an AI-powered evaluation system for assessing user analyses of characters from "Dream of the Red Chamber" by measuring depth of understanding, psychological insight, and literary interpretation quality. This GenKit-based flow evaluates character analyses across multiple dimensions (superficial/moderate/profound depth, 0-100 insight score, 0-100 quality score) while tracking theme coverage to provide comprehensive feedback that guides students toward deeper character understanding. The module emphasizes literary criticism skills by assessing whether analyses move beyond surface descriptions to explore complex personality, motivations, symbolic significance, and character development arcs.

## 2. Module Dependencies

* **Internal Dependencies:**
  * `@/ai/genkit` - Core GenKit instance (`ai`) providing `definePrompt` and `defineFlow` APIs
* **External Dependencies:**
  * `genkit` - GenKit framework providing `z` (Zod) schema validation re-export

## 3. Public API / Exports

* `scoreCharacterAnalysis(input: CharacterAnalysisScoringInput): Promise<CharacterAnalysisScoringOutput>` - Main async function for grading character analysis submissions
* `CharacterAnalysisScoringInput` - TypeScript type for input containing character info, analysis prompt, user analysis, expected themes, and difficulty
* `CharacterAnalysisScoringOutput` - TypeScript type for output containing quality score, depth assessment, insight score, themes covered/missed, feedback, and detailed analysis

## 4. Code File Breakdown

### 4.1. `character-analysis-scoring.ts`

* **Purpose:** This server-side file implements sophisticated literary criticism assessment by evaluating how deeply students understand character psychology, motivations, and narrative significance in the novel. The module distinguishes between superficial descriptions (external behaviors only), moderate analyses (personality and motivations explored), and profound insights (psychological depth, growth trajectories, symbolic meanings uncovered) to encourage advanced literary interpretation skills. By tracking theme coverage and providing targeted guidance for deeper exploration, this flow helps students develop critical thinking and analytical writing abilities essential for classical literature study.

* **Functions:**
    * `scoreCharacterAnalysis(input: CharacterAnalysisScoringInput): Promise<CharacterAnalysisScoringOutput>` - Public async function serving as API entry point, delegates to internal `characterAnalysisScoringFlow` with provided input. Returns Promise directly without transformation. Throws errors propagated from underlying flow.

* **Key Classes / Constants / Variables:**
    * `CharacterAnalysisScoringInputSchema`: Zod object schema with 6 fields:
      - `characterName` (string, required): Name of character being analyzed from Red Mansion
      - `characterDescription` (string, required): Background information about character providing evaluation context
      - `analysisPrompt` (string, required): Specific question or prompt given to user about the character
      - `userAnalysis` (string, required): User's written analysis to evaluate for depth, insight, and quality
      - `expectedThemes` (string array, required): Key themes/aspects for complete analysis (e.g., personality, relationships, symbolism)
      - `difficulty` (enum: 'easy' | 'medium' | 'hard', required): Task difficulty affecting scoring criteria

    * `CharacterAnalysisScoringInput`: Exported TypeScript type inferred from input schema.

    * `CharacterAnalysisScoringOutputSchema`: Zod object schema with 7 fields:
      - `qualityScore` (number, 0-100): Overall quality score based on depth, insight, accuracy, literary awareness
      - `depth` (enum: 'superficial' | 'moderate' | 'profound'): Analysis depth assessment:
        * superficial (表面): Only describes external behaviors and simple features
        * moderate (中等): Attempts to explore personality and motivations but not deep enough
        * profound (深刻): Deep analysis of psychology, motivations, growth trajectory, symbolic significance
      - `insight` (number, 0-100): Insight score measuring psychological understanding and character motivation interpretation
      - `themesCovered` (string array): Expected themes user successfully addressed in analysis
      - `themesMissed` (string array): Important themes/aspects user didn't explore
      - `feedback` (string): Constructive Traditional Chinese feedback (80-120 chars) highlighting strengths and suggesting deeper exploration areas
      - `detailedAnalysis` (string): Markdown-formatted detailed evaluation (250-350 chars) including analysis highlights in bold, deepening angles in lists, recommended reading chapters, extended thinking directions

    * `CharacterAnalysisScoringOutput`: Exported TypeScript type inferred from output schema.

    * `characterAnalysisScoringPrompt`: GenKit prompt definition with:
      - `name: 'characterAnalysisScoringPrompt'`
      - Role: Literary critic specializing in Red Mansion character research
      - Template variables: `{{characterName}}`, `{{{characterDescription}}}`, `{{{analysisPrompt}}}`, `{{{userAnalysis}}}`, `{{#each expectedThemes}}`, `{{difficulty}}`
      - Evaluation criteria:
        * Depth assessment (superficial: only external behaviors; moderate: explores personality/motivations but shallow; profound: deep psychological analysis, growth trajectories, symbolic meanings)
        * Insight measurement (0-100): Understanding character contradictions/complexity, noticing character growth/change, understanding symbolic significance in story
        * Quality score (0-100): Comprehensive assessment combining depth, insight, literary literacy
      - Difficulty-specific scoring: easy (70+ for basic personality description + 1-2 themes), medium (70-85 for multiple themes + some insight), hard (high scores require profound insight + full theme coverage + literary analysis)
      - Output requirements: qualityScore (0-100), depth (enum value), insight (0-100), themesCovered/themesMissed arrays, feedback (80-120 chars encouragement), detailedAnalysis (250-350 chars Markdown with analysis strengths in bold, deepening angles as lists, recommended chapters, extended thinking directions)

    * `characterAnalysisScoringFlow`: GenKit flow definition executing assessment:
      - Invokes `characterAnalysisScoringPrompt(input)`
      - Validates output completeness (checks `typeof qualityScore === 'number' && depth exists`)
      - Throws Chinese error if validation fails
      - Validates scores within 0-100 range using `Math.max(0, Math.min(100, Math.round()))`
      - Provides defaults for optional fields (depth defaults to 'moderate', insight to 50, empty theme arrays, default feedback/analysis)
      - Catches errors (logged only in non-test environments)
      - Returns fallback assessment on error: qualityScore 50, depth 'moderate', insight 50, empty themesCovered, all expected themes as missed, apologetic feedback, system message analysis

## 5. System and Data Flow

### 5.1. System Flowchart (Control Flow)

```mermaid
flowchart TD
    A[scoreCharacterAnalysis called] --> B[Delegate to characterAnalysisScoringFlow]
    B --> C[Flow executor invoked]
    C --> D[Call characterAnalysisScoringPrompt]
    D --> E[Render template: character, description, prompt, analysis, themes, difficulty]
    E --> F[Send to Gemini 2.5 Pro]

    F --> G[AI evaluates depth and insight]
    G --> H{Validate: output && typeof qualityScore === 'number' && depth?}
    H -- Invalid --> I[Log error to console]
    I --> J[Throw Error: AI模型未能生成有效的人物分析評分]

    H -- Valid --> K[Validate qualityScore range 0-100]
    K --> L[Validate insight range 0-100]
    L --> M[Apply defaults: depth || 'moderate', insight || 50]
    M --> N[Apply defaults for theme arrays and feedback]
    N --> O[Return validated output]

    J --> P[Catch Error]
    P --> Q{process.env.NODE_ENV !== 'test'?}
    Q -- True --> R[Log error to console]
    Q -- False --> S[Skip logging]
    R --> T[Return fallback: all scores/depth moderate]
    S --> T
    T --> U[Return fallback to caller]
    O --> V[Return valid assessment to caller]
```

### 5.2. Data Flow Diagram (Data Transformation)

```mermaid
graph LR
    CharAnalysisTask[Character Analysis Task] -- character info + user analysis + themes --> Input[CharacterAnalysisScoringInput]
    Input --> Flow[characterAnalysisScoringFlow]

    Flow -- input --> Prompt[characterAnalysisScoringPrompt]
    CriticRole[Literary Critic Persona] --> Prompt
    Prompt -- Evaluation Instructions --> AI[Gemini 2.5 Pro]

    AI -- Surface vs Deep Analysis --> DepthAssess[Assess Depth: superficial/moderate/profound]
    AI -- Psychological Understanding --> InsightCalc[Calculate Insight Score 0-100]
    AI -- Holistic Quality --> QualityCalc[Calculate Quality Score 0-100]
    AI -- Theme Tracking --> ThemeAnalysis[Identify Covered/Missed Themes]

    DepthAssess --> Validation{Output Validation}
    InsightCalc --> Validation
    QualityCalc --> Validation
    ThemeAnalysis --> Validation

    Validation -- Valid --> ScoreClamping[Clamp scores 0-100]
    ScoreClamping --> DefaultsApp[Apply defaults for optionals]

    DefaultsApp -- qualityScore --> QualField[qualityScore: number]
    DefaultsApp -- depth --> DepthField[depth: enum]
    DefaultsApp -- insight --> InsightField[insight: number]
    DefaultsApp -- themesCovered --> CoveredArray[covered: string[]]
    DefaultsApp -- themesMissed --> MissedArray[missed: string[]]
    DefaultsApp -- feedback --> FeedbackText[feedback: string]
    DefaultsApp -- detailedAnalysis --> AnalysisMarkdown[analysis: markdown]

    QualField --> Output[CharacterAnalysisScoringOutput]
    DepthField --> Output
    InsightField --> Output
    CoveredArray --> Output
    MissedArray --> Output
    FeedbackText --> Output
    AnalysisMarkdown --> Output

    Validation -- Invalid --> ErrorHandler[Error Handling]
    ErrorHandler --> FallbackBuilder[Build Fallback: moderate depth, scores 50]
    FallbackBuilder --> Output

    Output --> TaskService[DailyTaskService]
    TaskService --> UserDashboard[Character Analysis Results Display]
```

## 6. Usage Example & Testing

* **Usage:**
```typescript
import { scoreCharacterAnalysis } from '@/ai/flows/character-analysis-scoring';

const result = await scoreCharacterAnalysis({
  characterName: "林黛玉",
  characterDescription: "賈母的外孫女，寄居賈府，多愁善感，才華橫溢...",
  analysisPrompt: "分析林黛玉的性格特點和悲劇命運的關係",
  userAnalysis: "林黛玉性格敏感多疑，這種性格源於她寄人籬下的處境。她的才華使她自尊心強，但同時也讓她更加孤獨。她與寶玉的愛情注定悲劇...",
  expectedThemes: ["性格特點", "寄居身份", "才華與自尊", "愛情悲劇", "命運象徵"],
  difficulty: "hard"
});

console.log(result.qualityScore); // 88
console.log(result.depth); // "profound"
console.log(result.insight); // 85
console.log(result.themesCovered); // ["性格特點", "寄居身份", "才華與自尊", "愛情悲劇"]
console.log(result.themesMissed); // ["命運象徵"]
```

* **Testing:** This module is tested through DailyTaskService integration tests which invoke character analysis assessment with varying analysis depths. No dedicated unit test file exists. The GenKit development UI (`npm run genkit:dev`) enables manual testing with sample character analyses. Testing strategy includes: verifying depth classification accuracy (superficial vs profound distinction), confirming insight scoring reflects psychological understanding, validating theme tracking against expected themes, testing difficulty-adaptive scoring (easy: basic = 70+, hard: requires profound insights), ensuring markdown formatting in detailed analysis includes bold highlights and list recommendations, and checking fallback behavior maintains user experience when AI services fail.
