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
  score: z.number().min(0).max(100).describe('Overall quiz score (0-100). Average of all question scores. Irrelevant answers should score 0-20.'),
  isRelevant: z.boolean().describe('Whether the answers are relevant to the quiz questions. False if the answers are completely unrelated content (e.g., news articles, advertisements, other topics).'),
  correctCount: z.number().min(0).describe('Number of questions answered correctly.'),
  totalQuestions: z.number().min(1).describe('Total number of questions in the quiz.'),
  questionResults: z.array(QuestionResultSchema).describe('Detailed results for each question.'),
  feedback: z.string().describe('Overall feedback in Traditional Chinese (繁體中文). Summarize performance and encourage further learning. For irrelevant answers, clearly indicate the issue and encourage genuine effort.'),
  culturalInsights: z.string().describe('Cultural learning insights in Markdown format. For irrelevant answers, explain why it was deemed irrelevant. Explain interesting cultural facts, historical context, and deepen understanding. Use Traditional Chinese (繁體中文).'),
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

---

## 🚨🚨🚨 最重要：相關性檢查（必須最先執行，優先級最高）🚨🚨🚨

**在進行任何評分前，你必須先判斷學生的回答是否與《紅樓夢》和題目相關。這是最重要的評分標準！**

### 直接給 20 分並設定 isRelevant: false 的情況（無論答案多長、寫得多好）：

1. **完全無關的內容**：
   - 商業新聞（如：台積電、張忠謀、股票、企業管理）
   - 科技文章（如：AI、手機、電腦、網路）
   - 政治新聞（如：選舉、政府、政策）
   - 體育新聞（如：球賽、運動員）
   - 其他小說或文學作品（非《紅樓夢》）
   - 日常生活瑣事（與題目無關的個人經歷）
   - 廣告文案、產品介紹

2. **與題目毫無關聯**：
   - 答案完全沒有嘗試回應測驗問題
   - 答案與《紅樓夢》的文化背景完全無關
   - 明顯是複製貼上的無關文字

3. **無意義內容**：
   - 胡言亂語或無意義的文字組合
   - 重複的字詞或符號

### 判斷流程：
1. 先問：回答內容是否與《紅樓夢》或中國古典文化有關？
2. 再問：回答是否嘗試回應測驗問題？
3. 如果兩者皆「否」→ 直接給 20 分，isRelevant 設為 false

### ⚠️ 重要：對於無關內容的回應方式
- **不要分析無關內容**：不要試圖從無關內容中找出任何與《紅樓夢》的關聯
- **feedback 保持簡短**：只需說明「回答未符合題意」
- **不要給予任何鼓勵性評語**：對無關內容不需要客氣

---

## 正常評分標準（僅當回答與題目相關時使用）

請根據以下標準評估每道題目：

**評分標準：**
- **選擇題**: 完全正確 100 分，錯誤 0 分
- **開放題**: 根據答案準確性和完整度評分 0-100 分
  - **簡單難度**: 答案涵蓋基本要點即可 70+ 分
  - **中等難度**: 需要準確且較完整的回答 60-85 分區間
  - **困難難度**: 需要深入理解和詳細說明 50-90 分區間

---

請以 JSON 格式回應，包含以下欄位：
{
  "score": 所有題目平均分(0-100),
  "isRelevant": true或false（回答是否與題目相關）,
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
  "feedback": "100-150字的鼓勵性總評，指出優點和學習方向。如果回答無關，請明確指出並鼓勵學生認真作答",
  "culturalInsights": "250-350字的文化知識深化，使用 Markdown 格式。如果回答無關，請說明為何判定為無關內容"
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

    // Validate and sanitize isRelevant (default to true if not provided)
    const isRelevant = typeof parsed.isRelevant === 'boolean'
      ? parsed.isRelevant
      : true;

    // Validate and sanitize score
    // If answer is irrelevant, cap score at 20
    let score = typeof parsed.score === 'number'
      ? Math.max(0, Math.min(100, Math.round(parsed.score)))
      : 50;

    // Enforce low score for irrelevant answers
    if (!isRelevant && score > 20) {
      console.log(`⚠️ [AI Assessment] Capping score from ${score} to 20 due to irrelevant content`);
      score = 20;
    }

    const correctCount = typeof parsed.correctCount === 'number'
      ? Math.max(0, Math.min(totalQuestions, parsed.correctCount))
      : 0;

    // Validate question results array
    // Also cap individual question scores for irrelevant answers
    const questionResults = Array.isArray(parsed.questionResults)
      ? parsed.questionResults.map((result: any, index: number) => {
          let questionScore = typeof result.score === 'number'
            ? Math.max(0, Math.min(100, Math.round(result.score)))
            : 50;

          // Cap individual question scores for irrelevant content
          if (!isRelevant && questionScore > 20) {
            questionScore = 20;
          }

          return {
            questionNumber: index + 1,
            isCorrect: typeof result.isCorrect === 'boolean' ? result.isCorrect : false,
            score: questionScore,
            explanation: typeof result.explanation === 'string' && result.explanation.length > 0
              ? result.explanation
              : isRelevant ? '評分完成。' : '回答內容與題目無關。',
          };
        })
      : input.quizQuestions.map((_, index) => ({
          questionNumber: index + 1,
          isCorrect: false,
          score: isRelevant ? 50 : 20,
          explanation: isRelevant ? '評分完成。' : '回答內容與題目無關。',
        }));

    // Validate text fields
    const feedback = typeof parsed.feedback === 'string' && parsed.feedback.length > 0
      ? parsed.feedback
      : isRelevant
        ? '感謝您完成文化知識測驗！'
        : '您的回答似乎與題目無關，請仔細閱讀題目後重新作答。';

    const culturalInsights = typeof parsed.culturalInsights === 'string' && parsed.culturalInsights.length > 0
      ? parsed.culturalInsights
      : isRelevant
        ? '# 文化知識\n\n繼續探索《紅樓夢》的文化世界。'
        : '# 評估分析\n\n您的回答內容與題目無關。請仔細閱讀文化測驗題目，然後提供與《紅樓夢》文化背景相關的答案。';

    return {
      score,
      isRelevant,
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
      model: 'gpt-5-mini',
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
      isRelevant: true, // Assume relevant when AI is unavailable
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
