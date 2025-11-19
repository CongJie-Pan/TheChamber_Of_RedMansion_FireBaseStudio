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
 * @updated Migrated from GenKit/Gemini to OpenAI GPT-5-mini
 */

'use server'; // Required for server-side AI processing

// Import OpenAI client for AI processing
import { getOpenAIClient } from '@/lib/openai-client';
// Import Zod for schema validation and type inference
import { z } from 'zod';

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
 * Build the grading prompt for OpenAI
 * 構建 OpenAI 評分提示
 */
function buildCulturalQuizPrompt(input: CulturalQuizGradingInput): string {
  const questionsSection = input.quizQuestions.map((q, idx) => {
    const optionsSection = q.options && q.options.length > 0
      ? `選項：\n${q.options.map(opt => `  - ${opt}`).join('\n')}\n`
      : '';

    return `---
**題目 ${idx + 1}:**
問題：${q.question}
${optionsSection}
正確答案：${q.correctAnswer}
學生回答：${q.userAnswer}

文化背景：${q.culturalContext}
---`;
  }).join('\n\n');

  return `你是一位精通中國古典文化和《紅樓夢》時代背景的歷史學者，正在評估學生對文化知識的掌握程度。

**測驗主題：** ${input.quizTitle}
**任務難度：** ${input.difficulty}

**測驗題目與回答：**
${questionsSection}

請根據以下標準評估每道題目：

**評分標準：**
- **選擇題**: 完全正確 100 分，錯誤 0 分
- **開放題**: 根據答案準確性和完整度評分 0-100 分
  - **簡單難度**: 答案涵蓋基本要點即可 70+ 分
  - **中等難度**: 需要準確且較完整的回答 60-85 分區間
  - **困難難度**: 需要深入理解和詳細說明 50-90 分區間

請以 JSON 格式回應，包含以下欄位：
{
  "score": 所有題目平均分(0-100),
  "correctCount": 完全正確的題目數量,
  "totalQuestions": ${input.quizQuestions.length},
  "questionResults": [
    {
      "questionNumber": 1,
      "isCorrect": true/false,
      "score": 0-100,
      "explanation": "正確：簡短讚揚並補充文化知識 (50-80字) 或 錯誤：說明正確答案並解釋文化背景 (80-120字)"
    }
  ],
  "feedback": "100-150字的鼓勵性總評，指出優點和學習方向",
  "culturalInsights": "250-350字的文化知識深化，使用 Markdown 格式，包含：相關文化背景的延伸介紹（用 **粗體** 強調重點）、《紅樓夢》中的具體體現（用列表格式）、推薦的延伸閱讀主題"
}

請以繁體中文回應，語氣友善且富有啟發性。確保回覆格式為有效的 JSON。`;
}

/**
 * Parse OpenAI response and validate schema
 * 解析 OpenAI 回應並驗證結構
 */
function parseCulturalQuizResponse(responseText: string, input: CulturalQuizGradingInput): CulturalQuizGradingOutput {
  try {
    // Try to parse JSON response
    const parsed = JSON.parse(responseText);

    const totalQuestions = input.quizQuestions.length;

    // Validate and sanitize score
    const score = typeof parsed.score === 'number'
      ? Math.max(0, Math.min(100, Math.round(parsed.score)))
      : 50;

    const correctCount = typeof parsed.correctCount === 'number'
      ? Math.max(0, Math.min(totalQuestions, parsed.correctCount))
      : 0;

    // Validate question results array
    const questionResults = Array.isArray(parsed.questionResults)
      ? parsed.questionResults.map((result: any, index: number) => ({
          questionNumber: index + 1,
          isCorrect: typeof result.isCorrect === 'boolean' ? result.isCorrect : false,
          score: typeof result.score === 'number'
            ? Math.max(0, Math.min(100, Math.round(result.score)))
            : 50,
          explanation: typeof result.explanation === 'string' && result.explanation.length > 0
            ? result.explanation
            : '評分完成。',
        }))
      : input.quizQuestions.map((_, index) => ({
          questionNumber: index + 1,
          isCorrect: false,
          score: 50,
          explanation: '評分完成。',
        }));

    // Validate text fields
    const feedback = typeof parsed.feedback === 'string' && parsed.feedback.length > 0
      ? parsed.feedback
      : '感謝您完成文化知識測驗！';

    const culturalInsights = typeof parsed.culturalInsights === 'string' && parsed.culturalInsights.length > 0
      ? parsed.culturalInsights
      : '# 文化知識\n\n繼續探索《紅樓夢》的文化世界。';

    return {
      score,
      correctCount,
      totalQuestions,
      questionResults,
      feedback,
      culturalInsights,
    };
  } catch (error) {
    // If JSON parsing fails, throw error
    console.error('Failed to parse OpenAI response as JSON:', error);
    throw new Error('AI response parsing failed');
  }
}

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
  try {
    // Get OpenAI client
    const openai = getOpenAIClient();

    // Build grading prompt
    const prompt = buildCulturalQuizPrompt(input);

    // Call OpenAI API with GPT-5-mini
    const completion = await openai.chat.completions.create({
      model: 'GPT-5-mini',
      messages: [
        {
          role: 'system',
          content: '你是一位精通中國古典文化和《紅樓夢》時代背景的歷史學者，擅長評估學生的文化知識掌握程度。請以 JSON 格式回應。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2500,
      response_format: { type: 'json_object' }, // Request JSON response
    });

    // Extract response content
    const responseText = completion.choices[0]?.message?.content;

    if (!responseText) {
      throw new Error('OpenAI returned empty response');
    }

    // Parse and validate response
    return parseCulturalQuizResponse(responseText, input);

  } catch (error) {
    // Log error only in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error in gradeCulturalQuiz:', error);
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
