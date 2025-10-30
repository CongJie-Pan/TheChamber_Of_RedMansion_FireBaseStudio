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
 * @updated Migrated from GenKit/Gemini to OpenAI GPT-4-mini
 */

'use server'; // Required for server-side AI processing

// Import OpenAI client for AI processing
import { getOpenAIClient } from '@/lib/openai-client';
// Import Zod for schema validation and type inference
import { z } from 'zod';

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
 * Build the assessment prompt for OpenAI
 * 構建 OpenAI 評估提示
 */
function buildPoetryAssessmentPrompt(input: PoetryQualityInput): string {
  const authorSection = input.author ? `\n**作者/吟詠者：** ${input.author}` : '';

  return `你是一位資深的中國古典詩詞專家，正在評估學生對《紅樓夢》詩詞的背誦或默寫質量。

**詩詞標題：** ${input.poemTitle}${authorSection}

**原詩正確版本：**
${input.originalPoem}

**學生背誦/默寫版本：**
${input.userRecitation}

**任務難度：** ${input.difficulty}

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

請以 JSON 格式回應，包含以下欄位：
{
  "accuracy": 0-100的準確度百分比,
  "completeness": 0-100的完整度百分比,
  "overallScore": 0-100的綜合評分,
  "mistakes": [
    {
      "line": 行號(從1開始),
      "expected": "正確的文字",
      "actual": "學生寫的文字",
      "type": "missing/incorrect/extra"
    }
  ],
  "feedback": "80-120字的鼓勵性反饋，指出優點和改進方向",
  "literaryAnalysis": "200-300字的詩詞賞析，使用 Markdown 格式，包含：詩詞的主題和意境（用 **粗體** 強調關鍵詞）、修辭手法和藝術特色（用列表格式）、在《紅樓夢》故事中的意義"
}

請以繁體中文回應，語氣專業且富有鼓勵性。確保回覆格式為有效的 JSON。`;
}

/**
 * Parse OpenAI response and validate schema
 * 解析 OpenAI 回應並驗證結構
 */
function parsePoetryAssessmentResponse(responseText: string): PoetryQualityOutput {
  try {
    // Try to parse JSON response
    const parsed = JSON.parse(responseText);

    // Validate and sanitize scores
    const accuracy = typeof parsed.accuracy === 'number'
      ? Math.max(0, Math.min(100, Math.round(parsed.accuracy)))
      : 0;

    const completeness = typeof parsed.completeness === 'number'
      ? Math.max(0, Math.min(100, Math.round(parsed.completeness)))
      : 0;

    const overallScore = typeof parsed.overallScore === 'number'
      ? Math.max(0, Math.min(100, Math.round(parsed.overallScore)))
      : 50;

    // Validate and sanitize mistakes array
    const mistakes = Array.isArray(parsed.mistakes)
      ? parsed.mistakes.map((m: any) => ({
          line: typeof m.line === 'number' ? m.line : 1,
          expected: typeof m.expected === 'string' ? m.expected : '',
          actual: typeof m.actual === 'string' ? m.actual : '',
          type: ['missing', 'incorrect', 'extra'].includes(m.type) ? m.type : 'incorrect',
        }))
      : [];

    // Validate and sanitize text fields
    const feedback = typeof parsed.feedback === 'string' && parsed.feedback.length > 0
      ? parsed.feedback
      : '感謝您的詩詞背誦，請繼續努力！';

    const literaryAnalysis = typeof parsed.literaryAnalysis === 'string' && parsed.literaryAnalysis.length > 0
      ? parsed.literaryAnalysis
      : '# 詩詞賞析\n\n這是一首優美的詩詞作品。';

    return {
      accuracy,
      completeness,
      overallScore,
      mistakes,
      feedback,
      literaryAnalysis,
    };
  } catch (error) {
    // If JSON parsing fails, throw error
    console.error('Failed to parse OpenAI response as JSON:', error);
    throw new Error('AI response parsing failed');
  }
}

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
  try {
    // Get OpenAI client
    const openai = getOpenAIClient();

    // Build assessment prompt
    const prompt = buildPoetryAssessmentPrompt(input);

    // Call OpenAI API with GPT-4-mini
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-mini',
      messages: [
        {
          role: 'system',
          content: '你是一位資深的中國古典詩詞專家，擅長評估學生的詩詞背誦質量。請以 JSON 格式回應。',
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
    return parsePoetryAssessmentResponse(responseText);

  } catch (error) {
    // Log error only in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error in assessPoetryQuality:', error);
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
