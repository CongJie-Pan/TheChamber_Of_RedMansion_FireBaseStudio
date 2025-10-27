/**
 * @fileOverview Daily Reading Comprehension Assessment AI Flow
 *
 * This AI flow evaluates user responses to daily morning reading tasks from
 * "Dream of the Red Chamber". It assesses comprehension depth, accuracy, and
 * literary insight to provide meaningful feedback and scores.
 *
 * Key features:
 * - Comprehension assessment (0-100 score)
 * - Keyword matching and semantic analysis
 * - Constructive feedback in Traditional Chinese
 * - Identification of key points covered/missed
 * - Detailed analysis with improvement suggestions
 *
 * Usage: Called by DailyTaskService when users submit morning reading task answers
 *
 * @phase Phase 2.1 - AI Integration & Scoring System
 */

'use server'; // Required for server-side AI processing

// Import the configured AI instance from GenKit
import { ai } from '@/ai/genkit';
// Import Zod for schema validation and type inference
import { z } from 'genkit';

/**
 * Input schema for reading comprehension assessment
 * 晨讀理解評估的輸入結構
 */
const ReadingComprehensionInputSchema = z.object({
  passage: z.string().describe('The text passage from Red Mansion that the user read. Provides context for evaluating the answer quality.'),
  question: z.string().describe('The comprehension question asked to the user. Used to determine if the answer is on-topic and complete.'),
  userAnswer: z.string().describe('The user\'s written response to the comprehension question. This will be evaluated for accuracy, depth, and insight.'),
  expectedKeywords: z.array(z.string()).describe('Key concepts or terms that should appear in a complete answer. Used to assess coverage of important points.'),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('The difficulty level of the task. Affects scoring criteria and feedback tone.'),
});

/**
 * TypeScript type inferred from the input schema
 * 從輸入結構推斷的 TypeScript 類型
 */
export type ReadingComprehensionInput = z.infer<typeof ReadingComprehensionInputSchema>;

/**
 * Output schema for reading comprehension assessment results
 * 晨讀理解評估結果的輸出結構
 */
const ReadingComprehensionOutputSchema = z.object({
  score: z.number().min(0).max(100).describe('Overall comprehension score from 0-100. Based on accuracy, completeness, depth, and keyword coverage.'),
  feedback: z.string().describe('Constructive feedback in Traditional Chinese (繁體中文). Highlights strengths and areas for improvement. Use encouraging and educational tone.'),
  keyPointsCovered: z.array(z.string()).describe('List of key points or keywords that the user successfully addressed in their answer.'),
  keyPointsMissed: z.array(z.string()).describe('List of important points or keywords that the user did not mention. Used to guide improvement.'),
  detailedAnalysis: z.string().describe('Detailed analysis of the answer quality in Markdown format. Include specific examples, suggestions, and praise. Use Traditional Chinese (繁體中文).'),
});

/**
 * TypeScript type inferred from the output schema
 * 從輸出結構推斷的 TypeScript 類型
 */
export type ReadingComprehensionOutput = z.infer<typeof ReadingComprehensionOutputSchema>;

/**
 * Define the AI prompt for reading comprehension assessment
 * 定義晨讀理解評估的 AI 提示
 */
const readingComprehensionPrompt = ai.definePrompt({
  name: 'readingComprehensionPrompt',
  input: { schema: ReadingComprehensionInputSchema },
  output: { schema: ReadingComprehensionOutputSchema },
  prompt: `你是一位專業的《紅樓夢》文學教師，正在評估學生對早晨閱讀段落的理解程度。

**閱讀段落：**
{{{passage}}}

**問題：**
{{{question}}}

**學生回答：**
{{{userAnswer}}}

**預期關鍵詞：**
{{#each expectedKeywords}}
- {{this}}
{{/each}}

**任務難度：** {{difficulty}}

請根據以下標準評估學生的回答：

1. **準確性 (30%)**: 回答是否正確理解了文本內容，沒有明顯錯誤
2. **完整性 (25%)**: 是否涵蓋了預期的關鍵詞和重點
3. **深度 (25%)**: 是否有深入的分析和見解，而非僅停留在表面
4. **文學素養 (20%)**: 是否展現對《紅樓夢》文學特色的理解

**評分指南：**
- **簡單難度 (easy)**: 只要回答基本正確且提到 1-2 個關鍵詞，即可給予 70+ 分
- **中等難度 (medium)**: 需要回答準確、涵蓋多數關鍵詞、有一定分析深度，才能給予 70+ 分
- **困難難度 (hard)**: 需要深入分析、全面涵蓋關鍵詞、展現文學洞察，才能給予 70+ 分

請提供：
1. **分數 (score)**: 0-100 的整數分數
2. **反饋 (feedback)**: 鼓勵性的簡短反饋 (50-100字)，指出優點和改進方向
3. **已涵蓋要點 (keyPointsCovered)**: 學生成功提到的關鍵詞列表
4. **遺漏要點 (keyPointsMissed)**: 學生未提到但應該包含的關鍵詞列表
5. **詳細分析 (detailedAnalysis)**: 200-300字的詳細評析，使用 Markdown 格式，包含：
   - 回答的亮點（用 **粗體** 標註）
   - 具體的改進建議（用列表格式）
   - 延伸閱讀建議（如適用）

請以繁體中文回應，語氣友善且富有教育性。`,
});

/**
 * Define the AI flow for reading comprehension assessment
 * 定義晨讀理解評估的 AI 流程
 */
const readingComprehensionFlow = ai.defineFlow(
  {
    name: 'readingComprehensionFlow',
    inputSchema: ReadingComprehensionInputSchema,
    outputSchema: ReadingComprehensionOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await readingComprehensionPrompt(input);

      // Validate output completeness
      if (!output || typeof output.score !== 'number' || !output.feedback) {
        console.error('AI flow readingComprehensionFlow produced incomplete output:', output);
        throw new Error('AI 模型未能生成有效的閱讀理解評估。');
      }

      // Ensure score is within valid range
      const validatedScore = Math.max(0, Math.min(100, Math.round(output.score)));

      return {
        score: validatedScore,
        feedback: output.feedback || '感謝您的回答，請繼續努力！',
        keyPointsCovered: output.keyPointsCovered || [],
        keyPointsMissed: output.keyPointsMissed || [],
        detailedAnalysis: output.detailedAnalysis || '# 評估分析\n\n您的回答已收到，請繼續學習。',
      };
    } catch (error) {
      // Log error only in non-test environments
      if (process.env.NODE_ENV !== 'test') {
        console.error('Error in readingComprehensionFlow:', error);
      }

      // Return fallback assessment
      return {
        score: 50,
        feedback: '很抱歉，AI 評分系統暫時無法使用。您的回答已記錄，我們會盡快人工審核。',
        keyPointsCovered: [],
        keyPointsMissed: input.expectedKeywords,
        detailedAnalysis: '## 系統提示\n\n評分系統暫時無法使用，請稍後查看詳細反饋。',
      };
    }
  }
);

/**
 * Main exported function for reading comprehension assessment
 * 晨讀理解評估的主要導出函數
 *
 * @param input - Reading comprehension task data including passage, question, and user answer
 * @returns Assessment results with score, feedback, and detailed analysis
 */
export async function assessReadingComprehension(
  input: ReadingComprehensionInput
): Promise<ReadingComprehensionOutput> {
  return readingComprehensionFlow(input);
}
