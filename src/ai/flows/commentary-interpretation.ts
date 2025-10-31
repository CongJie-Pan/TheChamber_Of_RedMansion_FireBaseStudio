/**
 * @fileOverview Commentary Interpretation Scoring AI Flow
 *
 * This AI flow evaluates user interpretations of Zhiyanzhai (脂硯齋) commentaries
 * from "Dream of the Red Chamber". These commentaries are critical annotations that
 * provide profound insights into the novel's hidden meanings, symbolism, and authorial intent.
 *
 * Key features:
 * - Interpretation quality assessment (0-100 score)
 * - Insight level measurement (surface vs. deep understanding)
 * - Literary sensitivity evaluation
 * - Understanding of symbolic meanings
 * - Constructive feedback in Traditional Chinese
 * - Guidance for deeper commentary appreciation
 *
 * Usage: Called by DailyTaskService when users submit commentary decoding task answers
 *
 * @phase Phase 2.5 - AI Integration & Scoring System
 * @updated Migrated from GenKit/Gemini to OpenAI GPT-4-mini
 */

'use server'; // Required for server-side AI processing

// Import OpenAI client for AI processing
import { getOpenAIClient } from '@/lib/openai-client';
// Import Zod for schema validation and type inference
import { z } from 'zod';

/**
 * Input schema for commentary interpretation scoring
 * 脂批解讀評分的輸入結構
 */
const CommentaryInterpretationInputSchema = z.object({
  commentaryText: z.string().describe('The original Zhiyanzhai commentary text from Red Mansion. This is the annotation being interpreted.'),
  relatedPassage: z.string().describe('The text passage from the novel that the commentary refers to. Provides context for interpretation.'),
  chapterContext: z.string().describe('Chapter number and context information. Helps understand the narrative position.'),
  userInterpretation: z.string().describe('The user\'s interpretation or explanation of what the commentary means. This will be evaluated for insight and accuracy.'),
  interpretationHints: z.array(z.string()).describe('Key themes or symbolic meanings that the commentary typically reveals (e.g., foreshadowing, symbolism, character fate).'),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('The difficulty level of the commentary interpretation task. Affects scoring criteria.'),
});

/**
 * TypeScript type inferred from the input schema
 * 從輸入結構推斷的 TypeScript 類型
 */
export type CommentaryInterpretationInput = z.infer<typeof CommentaryInterpretationInputSchema>;

/**
 * Output schema for commentary interpretation scoring results
 * 脂批解讀評分結果的輸出結構
 */
const CommentaryInterpretationOutputSchema = z.object({
  score: z.number().min(0).max(100).describe('Overall interpretation quality score (0-100). Based on insight, accuracy, and literary sensitivity.'),
  insightLevel: z.enum(['surface', 'moderate', 'deep', 'profound']).describe('Depth of interpretation insight: surface (表面), moderate (中等), deep (深入), or profound (透徹).'),
  literarySensitivity: z.number().min(0).max(100).describe('Literary sensitivity score (0-100). Measures understanding of symbolic language, metaphor, and hidden meanings.'),
  keyInsightsCaptured: z.array(z.string()).describe('List of key interpretations or symbolic meanings that the user successfully identified.'),
  keyInsightsMissed: z.array(z.string()).describe('Important insights or symbolic meanings that the user did not mention.'),
  feedback: z.string().describe('Constructive feedback in Traditional Chinese (繁體中文). Praise insightful observations and guide toward deeper understanding.'),
  detailedAnalysis: z.string().describe('Detailed evaluation of the interpretation in Markdown format. Explain the commentary\'s true meaning, symbolism, and literary significance. Use Traditional Chinese (繁體中文).'),
  commentaryExplanation: z.string().describe('Authoritative explanation of what the Zhiyanzhai commentary actually reveals. Helps users understand the correct interpretation. Use Traditional Chinese (繁體中文).'),
});

/**
 * TypeScript type inferred from the output schema
 * 從輸出結構推斷的 TypeScript 類型
 */
export type CommentaryInterpretationOutput = z.infer<typeof CommentaryInterpretationOutputSchema>;

/**
 * Build the assessment prompt for OpenAI
 * 構建 OpenAI 評估提示
 */
function buildCommentaryInterpretationPrompt(input: CommentaryInterpretationInput): string {
  const hintsList = input.interpretationHints.map(hint => `- ${hint}`).join('\n');

  return `你是一位專精脂硯齋批語研究的《紅樓夢》學者，正在評估學生對脂批的理解深度。

**章回背景：** ${input.chapterContext}

**相關原文：**
${input.relatedPassage}

**脂硯齋批語：**
${input.commentaryText}

**學生解讀：**
${input.userInterpretation}

**解讀提示：**
${hintsList}

**任務難度：** ${input.difficulty}

脂硯齋批語是《紅樓夢》研究的重要材料，往往揭示了：
- 人物命運的伏筆和暗示
- 象徵意義和隱喻手法
- 曹雪芹的寫作意圖
- 故事結局的線索
- 文本層次的深層含義

請根據以下標準評估學生的解讀：

1. **洞察層次 (insightLevel)**:
   - **surface (表面)**: 僅做字面理解，未觸及深層含義
   - **moderate (中等)**: 注意到一些隱含意義，但不夠深入
   - **deep (深入)**: 理解主要的象徵和伏筆意義
   - **profound (透徹)**: 深刻把握脂批的多層含義和文學價值

2. **文學敏感度 (literarySensitivity)**: 對象徵、隱喻、伏筆的感知能力 (0-100 分)

3. **綜合評分 (score)**: 基於洞察層次、文學敏感度和準確性的綜合分數 (0-100 分)

**評分標準：**
- **簡單難度 (easy)**: 理解基本含義和 1 個關鍵洞察即可 65+ 分
- **中等難度 (medium)**: 需要理解多層含義和象徵意義 60-80 分區間
- **困難難度 (hard)**: 需要透徹理解隱喻、伏筆和深層意涵才能獲得高分

請以 JSON 格式回應，包含以下欄位：
{
  "score": 0-100的綜合評分,
  "insightLevel": "surface/moderate/deep/profound",
  "literarySensitivity": 0-100的文學敏感度,
  "keyInsightsCaptured": ["學生成功理解的關鍵含義1", "含義2"],
  "keyInsightsMissed": ["學生未理解的重要含義1", "含義2"],
  "feedback": "100-150字的鼓勵性反饋，肯定洞察力並指出深化方向",
  "detailedAnalysis": "250-350字的深入評析，使用 Markdown 格式，包含：學生解讀的優點（用 **粗體** 標註精彩觀察）、可以深化的角度（用列表格式）、脂批研究的方法指導",
  "commentaryExplanation": "200-300字的權威解釋，闡明此批語的真正含義、象徵意義和文學價值"
}

請以繁體中文回應，語氣學術而不失親和力，引導學生進入紅學研究的深層境界。確保回覆格式為有效的 JSON。`;
}

/**
 * Parse OpenAI response and validate schema
 * 解析 OpenAI 回應並驗證結構
 */
function parseCommentaryInterpretationResponse(responseText: string, input: CommentaryInterpretationInput): CommentaryInterpretationOutput {
  try {
    // Try to parse JSON response
    const parsed = JSON.parse(responseText);

    // Validate and sanitize scores
    const score = typeof parsed.score === 'number'
      ? Math.max(0, Math.min(100, Math.round(parsed.score)))
      : 50;

    const literarySensitivity = typeof parsed.literarySensitivity === 'number'
      ? Math.max(0, Math.min(100, Math.round(parsed.literarySensitivity)))
      : 50;

    // Validate insightLevel enum
    const insightLevel = ['surface', 'moderate', 'deep', 'profound'].includes(parsed.insightLevel)
      ? parsed.insightLevel
      : 'moderate';

    // Validate arrays
    const keyInsightsCaptured = Array.isArray(parsed.keyInsightsCaptured)
      ? parsed.keyInsightsCaptured.filter((k: any): k is string => typeof k === 'string')
      : [];

    const keyInsightsMissed = Array.isArray(parsed.keyInsightsMissed)
      ? parsed.keyInsightsMissed.filter((k: any): k is string => typeof k === 'string')
      : input.interpretationHints;

    // Validate text fields
    const feedback = typeof parsed.feedback === 'string' && parsed.feedback.length > 0
      ? parsed.feedback
      : '感謝您的脂批解讀，請繼續深入研究！';

    const detailedAnalysis = typeof parsed.detailedAnalysis === 'string' && parsed.detailedAnalysis.length > 0
      ? parsed.detailedAnalysis
      : '# 脂批解讀評價\n\n您的解讀已收到。';

    const commentaryExplanation = typeof parsed.commentaryExplanation === 'string' && parsed.commentaryExplanation.length > 0
      ? parsed.commentaryExplanation
      : '# 脂批正解\n\n此批語蘊含深意，值得細細品味。';

    return {
      score,
      insightLevel,
      literarySensitivity,
      keyInsightsCaptured,
      keyInsightsMissed,
      feedback,
      detailedAnalysis,
      commentaryExplanation,
    };
  } catch (error) {
    // If JSON parsing fails, throw error
    console.error('Failed to parse OpenAI response as JSON:', error);
    throw new Error('AI response parsing failed');
  }
}

/**
 * Main exported function for commentary interpretation scoring
 * 脂批解讀評分的主要導出函數
 *
 * @param input - Commentary interpretation task data including commentary text and user interpretation
 * @returns Scoring results with insight level, literary sensitivity, and authoritative explanation
 */
export async function scoreCommentaryInterpretation(
  input: CommentaryInterpretationInput
): Promise<CommentaryInterpretationOutput> {
  try {
    // Get OpenAI client
    const openai = getOpenAIClient();

    // Build assessment prompt
    const prompt = buildCommentaryInterpretationPrompt(input);

    // Call OpenAI API with GPT-4-mini
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-mini',
      messages: [
        {
          role: 'system',
          content: '你是一位專精脂硯齋批語研究的《紅樓夢》學者，擅長評估學生對脂批的理解深度。請以 JSON 格式回應。',
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
    return parseCommentaryInterpretationResponse(responseText, input);

  } catch (error) {
    // Log error only in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error in scoreCommentaryInterpretation:', error);
    }

    // Return fallback assessment
    return {
      score: 50,
      insightLevel: 'moderate' as const,
      literarySensitivity: 50,
      keyInsightsCaptured: [],
      keyInsightsMissed: input.interpretationHints,
      feedback: '很抱歉，AI 評分系統暫時無法使用。您的脂批解讀已記錄，我們會盡快人工審核。',
      detailedAnalysis: '## 系統提示\n\n評分系統暫時無法使用，請稍後查看詳細評析。',
      commentaryExplanation: '## 系統提示\n\n評分系統暫時無法使用，請稍後查看批語正解。',
    };
  }
}
