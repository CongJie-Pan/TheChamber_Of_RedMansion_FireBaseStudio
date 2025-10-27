/**
 * @fileOverview Cultural Quiz Grading AI Flow
 *
 * This AI flow evaluates user responses to cultural knowledge quizzes about
 * "Dream of the Red Chamber" era. It assesses understanding of historical context,
 * social customs, traditions, and cultural elements depicted in the novel.
 *
 * Key features:
 * - Multi-question quiz grading
 * - Accuracy assessment for each question
 * - Overall score calculation (0-100)
 * - Detailed feedback for incorrect answers
 * - Cultural context explanations
 * - Learning guidance in Traditional Chinese
 *
 * Usage: Called by DailyTaskService when users submit cultural exploration task answers
 *
 * @phase Phase 2.4 - AI Integration & Scoring System
 */

'use server'; // Required for server-side AI processing

// Import the configured AI instance from GenKit
import { ai } from '@/ai/genkit';
// Import Zod for schema validation and type inference
import { z } from 'genkit';

/**
 * Schema for individual quiz question and answer
 * 單個測驗題目和答案的結構
 */
const QuizQuestionSchema = z.object({
  question: z.string().describe('The quiz question about cultural aspects of Red Mansion era.'),
  options: z.array(z.string()).optional().describe('Multiple choice options if applicable. Empty for open-ended questions.'),
  correctAnswer: z.string().describe('The correct answer or key points that should be included.'),
  userAnswer: z.string().describe('The user\'s response to this question.'),
  culturalContext: z.string().describe('Background information about the cultural aspect being tested.'),
});

/**
 * Input schema for cultural quiz grading
 * 文化知識測驗評分的輸入結構
 */
const CulturalQuizGradingInputSchema = z.object({
  quizTitle: z.string().describe('The title or theme of the cultural quiz (e.g., "清代服飾文化", "賈府禮儀規範").'),
  quizQuestions: z.array(QuizQuestionSchema).describe('Array of quiz questions with correct answers and user responses.'),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('The difficulty level of the cultural quiz. Affects scoring strictness.'),
});

/**
 * TypeScript type inferred from the input schema
 * 從輸入結構推斷的 TypeScript 類型
 */
export type CulturalQuizGradingInput = z.infer<typeof CulturalQuizGradingInputSchema>;

/**
 * Schema for individual question result
 * 單個題目評分結果的結構
 */
const QuestionResultSchema = z.object({
  questionNumber: z.number().describe('Question number (1-indexed).'),
  isCorrect: z.boolean().describe('Whether the user\'s answer is correct.'),
  score: z.number().min(0).max(100).describe('Score for this question (0-100).'),
  explanation: z.string().describe('Explanation in Traditional Chinese. For correct answers: praise. For incorrect: explain the right answer and cultural context.'),
});

/**
 * Output schema for cultural quiz grading results
 * 文化知識測驗評分結果的輸出結構
 */
const CulturalQuizGradingOutputSchema = z.object({
  score: z.number().min(0).max(100).describe('Overall quiz score (0-100). Average of all question scores.'),
  correctCount: z.number().min(0).describe('Number of questions answered correctly.'),
  totalQuestions: z.number().min(1).describe('Total number of questions in the quiz.'),
  questionResults: z.array(QuestionResultSchema).describe('Detailed results for each question.'),
  feedback: z.string().describe('Overall feedback in Traditional Chinese (繁體中文). Summarize performance and encourage further learning.'),
  culturalInsights: z.string().describe('Cultural learning insights in Markdown format. Explain interesting cultural facts, historical context, and deepen understanding. Use Traditional Chinese (繁體中文).'),
});

/**
 * TypeScript type inferred from the output schema
 * 從輸出結構推斷的 TypeScript 類型
 */
export type CulturalQuizGradingOutput = z.infer<typeof CulturalQuizGradingOutputSchema>;

/**
 * Define the AI prompt for cultural quiz grading
 * 定義文化知識測驗評分的 AI 提示
 */
const culturalQuizGradingPrompt = ai.definePrompt({
  name: 'culturalQuizGradingPrompt',
  input: { schema: CulturalQuizGradingInputSchema },
  output: { schema: CulturalQuizGradingOutputSchema },
  prompt: `你是一位精通中國古典文化和《紅樓夢》時代背景的歷史學者，正在評估學生對文化知識的掌握程度。

**測驗主題：** {{quizTitle}}
**任務難度：** {{difficulty}}

**測驗題目與回答：**
{{#each quizQuestions}}
---
**題目 {{@index}}:**
問題：{{this.question}}
{{#if this.options}}
選項：
{{#each this.options}}
  - {{this}}
{{/each}}
{{/if}}

正確答案：{{this.correctAnswer}}
學生回答：{{this.userAnswer}}

文化背景：{{this.culturalContext}}
---
{{/each}}

請根據以下標準評估每道題目：

**評分標準：**
- **選擇題**: 完全正確 100 分，錯誤 0 分
- **開放題**: 根據答案準確性和完整度評分 0-100 分
  - **簡單難度**: 答案涵蓋基本要點即可 70+ 分
  - **中等難度**: 需要準確且較完整的回答 60-85 分區間
  - **困難難度**: 需要深入理解和詳細說明 50-90 分區間

對每道題目提供：
1. **題號 (questionNumber)**: 從 1 開始
2. **是否正確 (isCorrect)**: true/false
3. **得分 (score)**: 0-100
4. **解釋 (explanation)**:
   - 正確：簡短讚揚並補充文化知識 (50-80 字)
   - 錯誤：說明正確答案並解釋文化背景 (80-120 字)

綜合評估提供：
1. **總分 (score)**: 所有題目平均分 (0-100)
2. **正確題數 (correctCount)**: 完全正確的題目數量
3. **總題數 (totalQuestions)**: 測驗總題數
4. **題目結果 (questionResults)**: 每道題的詳細評分
5. **整體反饋 (feedback)**: 100-150 字的鼓勵性總評，指出優點和學習方向
6. **文化洞察 (culturalInsights)**: 250-350 字的文化知識深化，使用 Markdown 格式，包含：
   - 相關文化背景的延伸介紹（用 **粗體** 強調重點）
   - 《紅樓夢》中的具體體現（用列表格式）
   - 推薦的延伸閱讀主題

請以繁體中文回應，語氣友善且富有啟發性。`,
});

/**
 * Define the AI flow for cultural quiz grading
 * 定義文化知識測驗評分的 AI 流程
 */
const culturalQuizGradingFlow = ai.defineFlow(
  {
    name: 'culturalQuizGradingFlow',
    inputSchema: CulturalQuizGradingInputSchema,
    outputSchema: CulturalQuizGradingOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await culturalQuizGradingPrompt(input);

      // Validate output completeness
      if (!output || typeof output.score !== 'number' || !output.questionResults) {
        console.error('AI flow culturalQuizGradingFlow produced incomplete output:', output);
        throw new Error('AI 模型未能生成有效的文化測驗評分。');
      }

      const totalQuestions = input.quizQuestions.length;

      // Ensure all values are valid
      const validatedOutput = {
        score: Math.max(0, Math.min(100, Math.round(output.score))),
        correctCount: Math.max(0, Math.min(totalQuestions, output.correctCount || 0)),
        totalQuestions: totalQuestions,
        questionResults: output.questionResults.map((result, index) => ({
          questionNumber: index + 1,
          isCorrect: result.isCorrect || false,
          score: Math.max(0, Math.min(100, Math.round(result.score || 0))),
          explanation: result.explanation || '評分完成。',
        })),
        feedback: output.feedback || '感謝您完成文化知識測驗！',
        culturalInsights: output.culturalInsights || '# 文化知識\n\n繼續探索《紅樓夢》的文化世界。',
      };

      return validatedOutput;
    } catch (error) {
      // Log error only in non-test environments
      if (process.env.NODE_ENV !== 'test') {
        console.error('Error in culturalQuizGradingFlow:', error);
      }

      const totalQuestions = input.quizQuestions.length;

      // Return fallback assessment
      return {
        score: 50,
        correctCount: 0,
        totalQuestions: totalQuestions,
        questionResults: input.quizQuestions.map((_, index) => ({
          questionNumber: index + 1,
          isCorrect: false,
          score: 50,
          explanation: '很抱歉，AI 評分系統暫時無法使用。',
        })),
        feedback: '很抱歉，AI 評分系統暫時無法使用。您的測驗已記錄，我們會盡快人工審核。',
        culturalInsights: '## 系統提示\n\n評分系統暫時無法使用，請稍後查看文化知識解析。',
      };
    }
  }
);

/**
 * Main exported function for cultural quiz grading
 * 文化知識測驗評分的主要導出函數
 *
 * @param input - Cultural quiz data including questions, answers, and user responses
 * @returns Grading results with score, correct count, and detailed feedback for each question
 */
export async function gradeCulturalQuiz(
  input: CulturalQuizGradingInput
): Promise<CulturalQuizGradingOutput> {
  return culturalQuizGradingFlow(input);
}
