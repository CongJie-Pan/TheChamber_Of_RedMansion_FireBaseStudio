/**
 * @fileOverview Poetry Quality Assessment AI Flow
 *
 * This AI flow evaluates user recitations or compositions of poetry from
 * "Dream of the Red Chamber". It assesses accuracy, completeness, rhythm,
 * and literary quality to provide detailed feedback.
 *
 * Key features:
 * - Accuracy assessment (character-by-character comparison)
 * - Completeness evaluation (missing lines or verses)
 * - Overall quality score (0-100)
 * - Detailed mistake identification
 * - Constructive feedback in Traditional Chinese
 * - Literary analysis and appreciation guidance
 *
 * Usage: Called by DailyTaskService when users submit poetry task answers
 *
 * @phase Phase 2.2 - AI Integration & Scoring System
 */

'use server'; // Required for server-side AI processing

// Import the configured AI instance from GenKit
import { ai } from '@/ai/genkit';
// Import Zod for schema validation and type inference
import { z } from 'genkit';

/**
 * Input schema for poetry quality assessment
 * 詩詞質量評估的輸入結構
 */
const PoetryQualityInputSchema = z.object({
  poemTitle: z.string().describe('The title of the poem from Red Mansion. Used for context and reference.'),
  originalPoem: z.string().describe('The original correct text of the poem. Used as the gold standard for comparison.'),
  userRecitation: z.string().describe('The user\'s recitation or writing of the poem. This will be compared against the original.'),
  author: z.string().optional().describe('The author or character who composed the poem in the novel. Adds context to the assessment.'),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('The difficulty level of the poetry task. Affects scoring strictness and feedback tone.'),
});

/**
 * TypeScript type inferred from the input schema
 * 從輸入結構推斷的 TypeScript 類型
 */
export type PoetryQualityInput = z.infer<typeof PoetryQualityInputSchema>;

/**
 * Output schema for poetry quality assessment results
 * 詩詞質量評估結果的輸出結構
 */
const PoetryQualityOutputSchema = z.object({
  accuracy: z.number().min(0).max(100).describe('Character-level accuracy percentage (0-100). Measures how many characters match the original poem.'),
  completeness: z.number().min(0).max(100).describe('Completeness percentage (0-100). Measures whether all lines and verses are included.'),
  overallScore: z.number().min(0).max(100).describe('Overall quality score (0-100). Weighted combination of accuracy, completeness, and literary quality.'),
  mistakes: z.array(z.object({
    line: z.number().describe('Line number where the mistake occurred (1-indexed).'),
    expected: z.string().describe('The correct text that should have been written.'),
    actual: z.string().describe('What the user actually wrote.'),
    type: z.enum(['missing', 'incorrect', 'extra']).describe('Type of mistake: missing line, incorrect characters, or extra content.'),
  })).describe('List of specific mistakes found in the recitation. Empty array if perfect.'),
  feedback: z.string().describe('Constructive feedback in Traditional Chinese (繁體中文). Highlights achievements and provides improvement guidance.'),
  literaryAnalysis: z.string().describe('Literary appreciation and analysis of the poem in Markdown format. Explains the beauty, themes, and techniques. Use Traditional Chinese (繁體中文).'),
});

/**
 * TypeScript type inferred from the output schema
 * 從輸出結構推斷的 TypeScript 類型
 */
export type PoetryQualityOutput = z.infer<typeof PoetryQualityOutputSchema>;

/**
 * Define the AI prompt for poetry quality assessment
 * 定義詩詞質量評估的 AI 提示
 */
const poetryQualityPrompt = ai.definePrompt({
  name: 'poetryQualityPrompt',
  input: { schema: PoetryQualityInputSchema },
  output: { schema: PoetryQualityOutputSchema },
  prompt: `你是一位資深的中國古典詩詞專家，正在評估學生對《紅樓夢》詩詞的背誦或默寫質量。

**詩詞標題：** {{poemTitle}}
{{#if author}}
**作者/吟詠者：** {{author}}
{{/if}}

**原詩正確版本：**
{{{originalPoem}}}

**學生背誦/默寫版本：**
{{{userRecitation}}}

**任務難度：** {{difficulty}}

請仔細比對學生的版本與原詩，提供詳細的評估：

1. **準確度 (accuracy)**: 逐字比對，計算正確字符的百分比
2. **完整度 (completeness)**: 是否遺漏了詩句或詩節
3. **綜合評分 (overallScore)**: 基於準確度、完整度和整體質量的綜合分數

**評分標準：**
- **簡單難度 (easy)**: 允許 1-2 個小錯誤，仍可給予 80+ 分
- **中等難度 (medium)**: 允許少量錯誤，但需要較高完整度，70-90 分區間
- **困難難度 (hard)**: 要求高準確度和完整度，錯誤會明顯影響分數

**錯誤類型 (mistakes)**:
- **missing**: 遺漏的詩句
- **incorrect**: 寫錯的字詞
- **extra**: 多餘的內容

請提供：
1. **準確度百分比 (accuracy)**: 0-100
2. **完整度百分比 (completeness)**: 0-100
3. **綜合評分 (overallScore)**: 0-100
4. **錯誤列表 (mistakes)**: 每個錯誤包含行號、預期內容、實際內容和錯誤類型
5. **反饋 (feedback)**: 80-120字的鼓勵性反饋，指出優點和改進方向
6. **文學賞析 (literaryAnalysis)**: 200-300字的詩詞賞析，使用 Markdown 格式，包含：
   - 詩詞的主題和意境（用 **粗體** 強調關鍵詞）
   - 修辭手法和藝術特色（用列表格式）
   - 在《紅樓夢》故事中的意義

請以繁體中文回應，語氣專業且富有鼓勵性。`,
});

/**
 * Define the AI flow for poetry quality assessment
 * 定義詩詞質量評估的 AI 流程
 */
const poetryQualityFlow = ai.defineFlow(
  {
    name: 'poetryQualityFlow',
    inputSchema: PoetryQualityInputSchema,
    outputSchema: PoetryQualityOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await poetryQualityPrompt(input);

      // Validate output completeness
      if (!output || typeof output.overallScore !== 'number') {
        console.error('AI flow poetryQualityFlow produced incomplete output:', output);
        throw new Error('AI 模型未能生成有效的詩詞質量評估。');
      }

      // Ensure scores are within valid range
      const validatedOutput = {
        accuracy: Math.max(0, Math.min(100, Math.round(output.accuracy || 0))),
        completeness: Math.max(0, Math.min(100, Math.round(output.completeness || 0))),
        overallScore: Math.max(0, Math.min(100, Math.round(output.overallScore))),
        mistakes: output.mistakes || [],
        feedback: output.feedback || '感謝您的詩詞背誦，請繼續努力！',
        literaryAnalysis: output.literaryAnalysis || '# 詩詞賞析\n\n這是一首優美的詩詞作品。',
      };

      return validatedOutput;
    } catch (error) {
      // Log error only in non-test environments
      if (process.env.NODE_ENV !== 'test') {
        console.error('Error in poetryQualityFlow:', error);
      }

      // Return fallback assessment
      return {
        accuracy: 50,
        completeness: 50,
        overallScore: 50,
        mistakes: [],
        feedback: '很抱歉，AI 評分系統暫時無法使用。您的詩詞背誦已記錄，我們會盡快人工審核。',
        literaryAnalysis: '## 系統提示\n\n評分系統暫時無法使用，請稍後查看詳細賞析。',
      };
    }
  }
);

/**
 * Main exported function for poetry quality assessment
 * 詩詞質量評估的主要導出函數
 *
 * @param input - Poetry task data including original poem and user recitation
 * @returns Assessment results with accuracy, completeness, mistakes, and literary analysis
 */
export async function assessPoetryQuality(
  input: PoetryQualityInput
): Promise<PoetryQualityOutput> {
  return poetryQualityFlow(input);
}
