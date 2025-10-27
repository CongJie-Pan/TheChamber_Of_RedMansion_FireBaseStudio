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
 */

'use server'; // Required for server-side AI processing

// Import the configured AI instance from GenKit
import { ai } from '@/ai/genkit';
// Import Zod for schema validation and type inference
import { z } from 'genkit';

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
  qualityScore: z.number().min(0).max(100).describe('Overall quality score from 0-100. Based on depth, insight, accuracy, and literary awareness.'),
  depth: z.enum(['superficial', 'moderate', 'profound']).describe('Assessment of analysis depth: superficial (表面), moderate (中等), or profound (深刻).'),
  insight: z.number().min(0).max(100).describe('Insight score (0-100). Measures psychological understanding and character motivation interpretation.'),
  themesCovered: z.array(z.string()).describe('List of expected themes that the user successfully addressed in their analysis.'),
  themesMissed: z.array(z.string()).describe('List of important themes or aspects that the user did not explore.'),
  feedback: z.string().describe('Constructive feedback in Traditional Chinese (繁體中文). Highlights strengths and suggests deeper exploration areas.'),
  detailedAnalysis: z.string().describe('Detailed evaluation of the analysis quality in Markdown format. Include specific examples, character insights, and improvement suggestions. Use Traditional Chinese (繁體中文).'),
});

/**
 * TypeScript type inferred from the output schema
 * 從輸出結構推斷的 TypeScript 類型
 */
export type CharacterAnalysisScoringOutput = z.infer<typeof CharacterAnalysisScoringOutputSchema>;

/**
 * Define the AI prompt for character analysis scoring
 * 定義人物分析評分的 AI 提示
 */
const characterAnalysisScoringPrompt = ai.definePrompt({
  name: 'characterAnalysisScoringPrompt',
  input: { schema: CharacterAnalysisScoringInputSchema },
  output: { schema: CharacterAnalysisScoringOutputSchema },
  prompt: `你是一位專精《紅樓夢》人物研究的文學評論家，正在評估學生對小說人物的分析質量。

**分析人物：** {{characterName}}

**人物背景：**
{{{characterDescription}}}

**分析題目：**
{{{analysisPrompt}}}

**學生分析：**
{{{userAnalysis}}}

**預期主題：**
{{#each expectedThemes}}
- {{this}}
{{/each}}

**任務難度：** {{difficulty}}

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

請提供：
1. **綜合質量分 (qualityScore)**: 0-100
2. **深度評級 (depth)**: superficial, moderate, 或 profound
3. **洞察力分數 (insight)**: 0-100
4. **已涵蓋主題 (themesCovered)**: 學生成功探討的主題列表
5. **遺漏主題 (themesMissed)**: 學生未探討但應該包含的主題列表
6. **反饋 (feedback)**: 80-120 字的鼓勵性反饋，讚揚亮點並指出深化方向
7. **詳細評析 (detailedAnalysis)**: 250-350 字的深入評析，使用 Markdown 格式，包含：
   - 分析的優點（用 **粗體** 標註精彩洞察）
   - 可以深化的角度（用列表格式）
   - 推薦的閱讀章節或參考資料
   - 人物研究的延伸思考方向

請以繁體中文回應，語氣專業且具有啟發性。`,
});

/**
 * Define the AI flow for character analysis scoring
 * 定義人物分析評分的 AI 流程
 */
const characterAnalysisScoringFlow = ai.defineFlow(
  {
    name: 'characterAnalysisScoringFlow',
    inputSchema: CharacterAnalysisScoringInputSchema,
    outputSchema: CharacterAnalysisScoringOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await characterAnalysisScoringPrompt(input);

      // Validate output completeness
      if (!output || typeof output.qualityScore !== 'number' || !output.depth) {
        console.error('AI flow characterAnalysisScoringFlow produced incomplete output:', output);
        throw new Error('AI 模型未能生成有效的人物分析評分。');
      }

      // Ensure scores are within valid range
      const validatedOutput = {
        qualityScore: Math.max(0, Math.min(100, Math.round(output.qualityScore))),
        depth: output.depth || 'moderate',
        insight: Math.max(0, Math.min(100, Math.round(output.insight || 50))),
        themesCovered: output.themesCovered || [],
        themesMissed: output.themesMissed || input.expectedThemes,
        feedback: output.feedback || '感謝您的人物分析，請繼續深入探索！',
        detailedAnalysis: output.detailedAnalysis || '# 人物分析評價\n\n您的分析已收到。',
      };

      return validatedOutput;
    } catch (error) {
      // Log error only in non-test environments
      if (process.env.NODE_ENV !== 'test') {
        console.error('Error in characterAnalysisScoringFlow:', error);
      }

      // Return fallback assessment
      return {
        qualityScore: 50,
        depth: 'moderate' as const,
        insight: 50,
        themesCovered: [],
        themesMissed: input.expectedThemes,
        feedback: '很抱歉，AI 評分系統暫時無法使用。您的人物分析已記錄，我們會盡快人工審核。',
        detailedAnalysis: '## 系統提示\n\n評分系統暫時無法使用，請稍後查看詳細評析。',
      };
    }
  }
);

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
  return characterAnalysisScoringFlow(input);
}
