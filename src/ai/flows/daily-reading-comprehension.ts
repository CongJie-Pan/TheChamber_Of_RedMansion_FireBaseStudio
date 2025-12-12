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
 * @updated Migrated from GenKit/Gemini to OpenAI GPT-5-mini
 */

'use server'; // Required for server-side AI processing

// Import OpenAI client for AI processing
import { getOpenAIClient } from '@/lib/openai-client';
// Import Zod for schema validation and type inference
import { z } from 'zod';

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
  score: z.number().min(0).max(100).describe('Overall comprehension score from 0-100. Based on relevance, accuracy, completeness, depth, and keyword coverage. Irrelevant answers should score 0-20.'),
  isRelevant: z.boolean().describe('Whether the answer is relevant to the question and passage. False if the answer is completely unrelated content (e.g., news articles, advertisements, other novels).'),
  feedback: z.string().describe('Constructive feedback in Traditional Chinese (繁體中文). Highlights strengths and areas for improvement. For irrelevant answers, clearly indicate the issue and encourage genuine effort.'),
  keyPointsCovered: z.array(z.string()).describe('List of key points or keywords that the user successfully addressed in their answer.'),
  keyPointsMissed: z.array(z.string()).describe('List of important points or keywords that the user did not mention. Used to guide improvement.'),
  detailedAnalysis: z.string().describe('Detailed analysis of the answer quality in Markdown format. For irrelevant answers, explain why it was deemed irrelevant. Use Traditional Chinese (繁體中文).'),
});

/**
 * TypeScript type inferred from the output schema
 * 從輸出結構推斷的 TypeScript 類型
 */
export type ReadingComprehensionOutput = z.infer<typeof ReadingComprehensionOutputSchema>;

/**
 * Build the assessment prompt for OpenAI
 * 構建 OpenAI 評估提示
 */
function buildAssessmentPrompt(input: ReadingComprehensionInput): string {
  const keywordsList = input.expectedKeywords.map(k => `- ${k}`).join('\n');

  return `你是一位專業且嚴格的《紅樓夢》文學教師，正在評估學生對早晨閱讀段落的理解程度。

**閱讀段落：**
${input.passage}

**問題：**
${input.question}

**學生回答：**
${input.userAnswer}

**預期關鍵詞：**
${keywordsList}

**任務難度：** ${input.difficulty}

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
   - 答案內容完全沒有提到題目中的人物、情節、或概念
   - 答案沒有嘗試回應問題
   - 明顯是複製貼上的無關文字

3. **無意義內容**：
   - 胡言亂語或無意義的文字組合
   - 重複的字詞或符號

### 判斷流程：
1. 先問：回答內容是否與《紅樓夢》這部小說有關？
2. 再問：回答是否嘗試回應本題的問題？
3. 如果兩者皆「否」→ 直接給 20 分，isRelevant 設為 false

### ⚠️ 重要：對於無關內容的回應方式
- **不要分析無關內容**：不要試圖從無關內容中找出任何與《紅樓夢》的關聯
- **feedback 保持簡短**：只需說明「回答未符合題意」
- **不要給予任何鼓勵性評語**：對無關內容不需要客氣

---

## 正常評分標準（僅當回答與題目相關時使用）

1. **準確性 (30%)**: 回答是否正確理解了文本內容，沒有明顯錯誤
2. **完整性 (25%)**: 是否涵蓋了預期的關鍵詞和重點
3. **深度 (25%)**: 是否有深入的分析和見解，而非僅停留在表面
4. **文學素養 (20%)**: 是否展現對《紅樓夢》文學特色的理解

**評分指南：**
- **簡單難度 (easy)**: 只要回答基本正確且提到 1-2 個關鍵詞，即可給予 70+ 分
- **中等難度 (medium)**: 需要回答準確、涵蓋多數關鍵詞、有一定分析深度，才能給予 70+ 分
- **困難難度 (hard)**: 需要深入分析、全面涵蓋關鍵詞、展現文學洞察，才能給予 70+ 分

---

請以 JSON 格式回應，包含以下欄位：

**如果回答與題目相關 (isRelevant: true)：**
{
  "score": 根據評分標準給予的分數 (0-100),
  "isRelevant": true,
  "feedback": "鼓勵性的簡短反饋 (50-100字)，指出優點和改進方向",
  "keyPointsCovered": ["學生成功提到的關鍵詞1", "關鍵詞2"],
  "keyPointsMissed": ["學生未提到但應該包含的關鍵詞1", "關鍵詞2"],
  "detailedAnalysis": "200-300字的詳細評析，使用 Markdown 格式"
}

**如果回答與題目無關 (isRelevant: false)：**
{
  "score": 20,
  "isRelevant": false,
  "feedback": "您的回答未符合題意，內容與《紅樓夢》及本題無關。",
  "keyPointsCovered": [],
  "keyPointsMissed": ["所有預期關鍵詞"],
  "detailedAnalysis": "您提交的內容與本題要求無關。請仔細閱讀題目，提供與《紅樓夢》相關的回答。"
}

請以繁體中文回應。對於相關內容語氣友善，對於無關內容則直接指出問題。確保回覆格式為有效的 JSON。`;
}

/**
 * Parse OpenAI response and validate schema
 * 解析 OpenAI 回應並驗證結構
 */
function parseAssessmentResponse(responseText: string, input: ReadingComprehensionInput): ReadingComprehensionOutput {
  try {
    // Try to parse JSON response
    const parsed = JSON.parse(responseText);

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

    // Validate and sanitize other fields
    const feedback = typeof parsed.feedback === 'string' && parsed.feedback.length > 0
      ? parsed.feedback
      : isRelevant
        ? '感謝您的回答，請繼續努力！'
        : '您的回答似乎與題目無關，請仔細閱讀題目後重新作答。';

    const keyPointsCovered = Array.isArray(parsed.keyPointsCovered)
      ? parsed.keyPointsCovered.filter((k: any): k is string => typeof k === 'string')
      : [];

    const keyPointsMissed = Array.isArray(parsed.keyPointsMissed)
      ? parsed.keyPointsMissed.filter((k: any): k is string => typeof k === 'string')
      : input.expectedKeywords;

    const detailedAnalysis = typeof parsed.detailedAnalysis === 'string' && parsed.detailedAnalysis.length > 0
      ? parsed.detailedAnalysis
      : isRelevant
        ? '# 評估分析\n\n您的回答已收到，請繼續學習。'
        : '# 評估分析\n\n您的回答內容與題目無關。請仔細閱讀閱讀段落和問題，然後提供與《紅樓夢》相關的答案。';

    return {
      score,
      isRelevant,
      feedback,
      keyPointsCovered,
      keyPointsMissed,
      detailedAnalysis,
    };
  } catch (error) {
    // If JSON parsing fails, return fallback response
    console.error('Failed to parse OpenAI response as JSON:', error);
    throw new Error('AI response parsing failed');
  }
}

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
  try {
    // Get OpenAI client
    const openai = getOpenAIClient();

    // Build assessment prompt
    const prompt = buildAssessmentPrompt(input);

    // Call OpenAI API with gpt-5-mini
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: '你是一位專業的《紅樓夢》文學教師，擅長評估學生的閱讀理解能力。請以 JSON 格式回應。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: 'json_object' }, // Request JSON response
    });

    // Extract response content
    const responseText = completion.choices[0]?.message?.content;

    if (!responseText) {
      throw new Error('OpenAI returned empty response');
    }

    // Parse and validate response
    return parseAssessmentResponse(responseText, input);

  } catch (error) {
    // Log error only in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error in assessReadingComprehension:', error);
    }

    // Return fallback assessment
    return {
      score: 50,
      isRelevant: true, // Assume relevant when AI is unavailable
      feedback: '很抱歉，AI 評分系統暫時無法使用。您的回答已記錄，我們會盡快人工審核。',
      keyPointsCovered: [],
      keyPointsMissed: input.expectedKeywords,
      detailedAnalysis: '## 系統提示\n\n評分系統暫時無法使用，請稍後查看詳細反饋。',
    };
  }
}
