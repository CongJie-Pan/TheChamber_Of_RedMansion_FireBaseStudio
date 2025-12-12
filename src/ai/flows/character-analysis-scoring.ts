/**
 * @fileOverview Character Analysis Scoring AI Flow
 *
 * This AI flow evaluates user analyses of characters from "Dream of the Red Chamber".
 * It assesses depth of understanding, insight into personality, relationship awareness,
 * and literary interpretation quality.
 *
 * Key features:
 * - Quality assessment (0-100 score)
 * - Depth evaluation (superficial vs. profound analysis)
 * - Insight measurement (character psychology and motivations)
 * - Literary context awareness
 * - Constructive feedback in Traditional Chinese
 * - Guidance for deeper character understanding
 *
 * Usage: Called by DailyTaskService when users submit character insight task answers
 *
 * @phase Phase 2.3 - AI Integration & Scoring System
 * @updated Migrated from GenKit/Gemini to OpenAI GPT-5-mini
 */

'use server'; // Required for server-side AI processing

// Import OpenAI client for AI processing
import { getOpenAIClient } from '@/lib/openai-client';
// Import Zod for schema validation and type inference
import { z } from 'zod';

/**
 * Input schema for character analysis scoring
 * 人物分析評分的輸入結構
 */
const CharacterAnalysisScoringInputSchema = z.object({
  characterName: z.string().describe('The name of the character being analyzed from Red Mansion.'),
  characterDescription: z.string().describe('Background information about the character. Provides context for evaluating the analysis.'),
  analysisPrompt: z.string().describe('The specific question or prompt given to the user about the character.'),
  userAnalysis: z.string().describe('The user\'s written analysis of the character. This will be evaluated for depth, insight, and quality.'),
  expectedThemes: z.array(z.string()).describe('Key themes or aspects that should be covered in a complete analysis (e.g., personality, relationships, symbolism).'),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('The difficulty level of the character analysis task. Affects scoring criteria.'),
});

/**
 * TypeScript type inferred from the input schema
 * 從輸入結構推斷的 TypeScript 類型
 */
export type CharacterAnalysisScoringInput = z.infer<typeof CharacterAnalysisScoringInputSchema>;

/**
 * Output schema for character analysis scoring results
 * 人物分析評分結果的輸出結構
 */
const CharacterAnalysisScoringOutputSchema = z.object({
  qualityScore: z.number().min(0).max(100).describe('Overall quality score from 0-100. Based on depth, insight, accuracy, and literary awareness. Irrelevant answers should score 0-20.'),
  isRelevant: z.boolean().describe('Whether the answer is relevant to the character and question. False if the answer is completely unrelated content (e.g., news articles, advertisements, other novels).'),
  depth: z.enum(['superficial', 'moderate', 'profound']).describe('Assessment of analysis depth: superficial (表面), moderate (中等), or profound (深刻).'),
  insight: z.number().min(0).max(100).describe('Insight score (0-100). Measures psychological understanding and character motivation interpretation.'),
  themesCovered: z.array(z.string()).describe('List of expected themes that the user successfully addressed in their analysis.'),
  themesMissed: z.array(z.string()).describe('List of important themes or aspects that the user did not explore.'),
  feedback: z.string().describe('Constructive feedback in Traditional Chinese (繁體中文). Highlights strengths and suggests deeper exploration areas. For irrelevant answers, clearly indicate the issue and encourage genuine effort.'),
  detailedAnalysis: z.string().describe('Detailed evaluation of the analysis quality in Markdown format. For irrelevant answers, explain why it was deemed irrelevant. Include specific examples, character insights, and improvement suggestions. Use Traditional Chinese (繁體中文).'),
});

/**
 * TypeScript type inferred from the output schema
 * 從輸出結構推斷的 TypeScript 類型
 */
export type CharacterAnalysisScoringOutput = z.infer<typeof CharacterAnalysisScoringOutputSchema>;

/**
 * Build the assessment prompt for OpenAI
 * 構建 OpenAI 評估提示
 */
function buildCharacterAnalysisPrompt(input: CharacterAnalysisScoringInput): string {
  const themesList = input.expectedThemes.map(theme => `- ${theme}`).join('\n');

  return `你是一位專精《紅樓夢》人物研究的文學評論家，正在評估學生對小說人物的分析質量。

**分析人物：** ${input.characterName}

**人物背景：**
${input.characterDescription}

**分析題目：**
${input.analysisPrompt}

**學生分析：**
${input.userAnalysis}

**預期主題：**
${themesList}

**任務難度：** ${input.difficulty}

---

## 🚨 最重要：相關性檢查（必須最先執行）

在進行任何評分前，你必須先判斷學生的回答是否與題目相關：

**直接給 0-20 分的情況（無論答案多長）：**
- 回答內容與《紅樓夢》完全無關（如：新聞報導、科技文章、其他小說內容、廣告文案）
- 回答內容與本題的人物分析毫無關聯
- 明顯是複製貼上的無關文字
- 胡言亂語或無意義的文字組合

**判斷方法：**
1. 回答是否提及被分析的人物 ${input.characterName}？
2. 回答是否嘗試回應分析題目？
3. 回答是否與《紅樓夢》的世界觀相關？

如果以上三點都是「否」，請將 isRelevant 設為 false，並給予 0-20 分，不需要進行後續評分。

---

## 正常評分標準（僅當回答與題目相關時使用）

請根據以下標準評估學生的人物分析：

1. **深度 (depth)**: 分析是否深入人物內心世界，還是僅停留在表面描述
   - **superficial (表面)**: 只描述外在行為和簡單特徵
   - **moderate (中等)**: 嘗試探討性格和動機，但不夠深入
   - **profound (深刻)**: 深入剖析心理、動機、成長軌跡和象徵意義

2. **洞察力 (insight)**: 對人物心理、動機、命運的理解程度 (0-100 分)
   - 是否理解人物的矛盾性和複雜性
   - 是否注意到人物的成長變化
   - 是否理解人物在故事中的象徵意義

3. **綜合質量 (qualityScore)**: 基於深度、洞察力、文學素養的綜合評分 (0-100 分)

**評分標準：**
- **簡單難度 (easy)**: 提供基本性格描述和 1-2 個主題分析即可 70+ 分
- **中等難度 (medium)**: 需要涵蓋多個主題，展現一定洞察力，70-85 分區間
- **困難難度 (hard)**: 需要深刻洞察、全面主題覆蓋、文學分析，才能獲得高分

---

請以 JSON 格式回應，包含以下欄位：
{
  "qualityScore": 0-100的綜合質量分,
  "isRelevant": true或false（回答是否與題目相關）,
  "depth": "superficial/moderate/profound",
  "insight": 0-100的洞察力分數,
  "themesCovered": ["學生成功探討的主題1", "主題2"],
  "themesMissed": ["學生未探討但應該包含的主題1", "主題2"],
  "feedback": "80-120字的鼓勵性反饋，讚揚亮點並指出深化方向。如果回答無關，請明確指出並鼓勵學生認真作答",
  "detailedAnalysis": "250-350字的深入評析，使用 Markdown 格式。如果回答無關，請說明為何判定為無關內容"
}

請以繁體中文回應，語氣專業且具有啟發性。確保回覆格式為有效的 JSON。`;
}

/**
 * Parse OpenAI response and validate schema
 * 解析 OpenAI 回應並驗證結構
 */
function parseCharacterAnalysisResponse(responseText: string, input: CharacterAnalysisScoringInput): CharacterAnalysisScoringOutput {
  try {
    // Try to parse JSON response
    const parsed = JSON.parse(responseText);

    // Validate and sanitize isRelevant (default to true if not provided)
    const isRelevant = typeof parsed.isRelevant === 'boolean'
      ? parsed.isRelevant
      : true;

    // Validate and sanitize scores
    // If answer is irrelevant, cap score at 20
    let qualityScore = typeof parsed.qualityScore === 'number'
      ? Math.max(0, Math.min(100, Math.round(parsed.qualityScore)))
      : 50;

    // Enforce low score for irrelevant answers
    if (!isRelevant && qualityScore > 20) {
      console.log(`⚠️ [AI Assessment] Capping score from ${qualityScore} to 20 due to irrelevant content`);
      qualityScore = 20;
    }

    let insight = typeof parsed.insight === 'number'
      ? Math.max(0, Math.min(100, Math.round(parsed.insight)))
      : 50;

    // Also cap insight score for irrelevant answers
    if (!isRelevant && insight > 20) {
      insight = 20;
    }

    // Validate depth enum
    const depth = ['superficial', 'moderate', 'profound'].includes(parsed.depth)
      ? parsed.depth
      : 'moderate';

    // Validate arrays
    const themesCovered = Array.isArray(parsed.themesCovered)
      ? parsed.themesCovered.filter((t: any): t is string => typeof t === 'string')
      : [];

    const themesMissed = Array.isArray(parsed.themesMissed)
      ? parsed.themesMissed.filter((t: any): t is string => typeof t === 'string')
      : input.expectedThemes;

    // Validate text fields
    const feedback = typeof parsed.feedback === 'string' && parsed.feedback.length > 0
      ? parsed.feedback
      : isRelevant
        ? '感謝您的人物分析，請繼續深入探索！'
        : '您的回答似乎與題目無關，請仔細閱讀題目後重新作答。';

    const detailedAnalysis = typeof parsed.detailedAnalysis === 'string' && parsed.detailedAnalysis.length > 0
      ? parsed.detailedAnalysis
      : isRelevant
        ? '# 人物分析評價\n\n您的分析已收到。'
        : '# 評估分析\n\n您的回答內容與題目無關。請仔細閱讀人物背景和分析題目，然後提供與《紅樓夢》人物相關的答案。';

    return {
      qualityScore,
      isRelevant,
      depth,
      insight,
      themesCovered,
      themesMissed,
      feedback,
      detailedAnalysis,
    };
  } catch (error) {
    // If JSON parsing fails, throw error
    console.error('Failed to parse OpenAI response as JSON:', error);
    throw new Error('AI response parsing failed');
  }
}

/**
 * Main exported function for character analysis scoring
 * 人物分析評分的主要導出函數
 *
 * @param input - Character analysis task data including character info and user analysis
 * @returns Scoring results with quality, depth, insight, and detailed feedback
 */
export async function scoreCharacterAnalysis(
  input: CharacterAnalysisScoringInput
): Promise<CharacterAnalysisScoringOutput> {
  try {
    // Get OpenAI client
    const openai = getOpenAIClient();

    // Build assessment prompt
    const prompt = buildCharacterAnalysisPrompt(input);

    // Call OpenAI API with GPT-5-mini
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: '你是一位專精《紅樓夢》人物研究的文學評論家，擅長評估學生的人物分析質量。請以 JSON 格式回應。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' }, // Request JSON response
    });

    // Extract response content
    const responseText = completion.choices[0]?.message?.content;

    if (!responseText) {
      throw new Error('OpenAI returned empty response');
    }

    // Parse and validate response
    return parseCharacterAnalysisResponse(responseText, input);

  } catch (error) {
    // Log error only in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error in scoreCharacterAnalysis:', error);
    }

    // Return fallback assessment
    return {
      qualityScore: 50,
      isRelevant: true, // Assume relevant when AI is unavailable
      depth: 'moderate' as const,
      insight: 50,
      themesCovered: [],
      themesMissed: input.expectedThemes,
      feedback: '很抱歉，AI 評分系統暫時無法使用。您的人物分析已記錄，我們會盡快人工審核。',
      detailedAnalysis: '## 系統提示\n\n評分系統暫時無法使用，請稍後查看詳細評析。',
    };
  }
}
