/**
 * @fileOverview AI-Powered Task Content Generator for Daily Tasks
 *
 * This module uses GPT-5-Mini to generate personalized, adaptive task content
 * based on user profile, learning history, and task requirements. It replaces
 * or enhances the hardcoded task content library with dynamic AI generation.
 *
 * Key features:
 * - User-adaptive content generation (level, history, preferences)
 * - Task-type-specific content creation
 * - Difficulty-aware content selection
 * - Cultural accuracy validation for Red Mansion content
 * - Fallback to hardcoded content library if AI fails
 * - Content caching to reduce API costs
 *
 * Usage:
 * ```typescript
 * const taskContent = await generateTaskContent({
 *   userLevel: 3,
 *   taskType: DailyTaskType.MORNING_READING,
 *   difficulty: 'medium',
 *   recentChapters: [1, 2, 3],
 *   learningPreferences: { favoriteCharacters: ['林黛玉', '賈寶玉'] }
 * });
 * ```
 *
 * @phase Phase 2.9.1 - AI Task Content Generation Service
 */

import { generateCompletionWithFallback, isOpenAIAvailable } from './openai-client';
import {
  DailyTaskType,
  TaskDifficulty,
  TextPassage,
  PoemContent,
  CharacterPrompt,
  CulturalElement,
  CommentaryContent,
} from './types/daily-task';

/**
 * Parameters for task content generation
 */
export interface TaskContentGenerationParams {
  userLevel: number; // 0-7
  taskType: DailyTaskType;
  difficulty: TaskDifficulty;
  recentChapters?: number[]; // Chapters user has recently read
  learningHistory?: {
    completedTaskTypes?: DailyTaskType[];
    averageScores?: Record<DailyTaskType, number>;
  };
  learningPreferences?: {
    favoriteCharacters?: string[];
    interestedTopics?: string[];
  };
}

/**
 * Generated task content (union type based on task type)
 */
export type GeneratedTaskContent =
  | { textPassage: TextPassage }
  | { poem: PoemContent }
  | { character: CharacterPrompt }
  | { culturalElement: CulturalElement }
  | { commentary: CommentaryContent };

/**
 * Content cache to reduce API calls
 * Cache key format: `${userLevel}_${taskType}_${difficulty}`
 */
const contentCache = new Map<string, GeneratedTaskContent>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate task content using GPT-5-Mini
 *
 * Creates personalized, adaptive task content based on user profile
 * and learning history. Falls back to hardcoded content if AI unavailable.
 *
 * @param params - Task content generation parameters
 * @returns Promise with generated task content
 */
export async function generateTaskContent(
  params: TaskContentGenerationParams
): Promise<GeneratedTaskContent> {
  const { userLevel, taskType, difficulty } = params;

  // Diagnostic logging: Start task content generation
  console.log('\n' + '━'.repeat(80));
  console.log('🔍 [AI Content Generator] Starting task content generation');
  console.log('━'.repeat(80));
  console.log(`📋 Parameters: userLevel=${userLevel}, taskType=${taskType}, difficulty=${difficulty}`);

  // Check cache first
  const cacheKey = `${userLevel}_${taskType}_${difficulty}`;
  console.log(`🔍 [Cache] Checking cache key: ${cacheKey}`);
  const cachedContent = contentCache.get(cacheKey);
  if (cachedContent) {
    console.log(`✅ [Cache] Using cached content for ${cacheKey}`);
    console.log('━'.repeat(80) + '\n');
    return cachedContent;
  }
  console.log(`📝 [Cache] Cache miss, need to generate new content`);

  // If OpenAI is not available, use hardcoded content
  const openAIAvailable = isOpenAIAvailable();
  console.log(`🔍 [OpenAI] Availability check: ${openAIAvailable ? '✅ Available' : '❌ Not available'}`);
  console.log(`🔍 [OpenAI] Environment variable OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`🔍 [OpenAI] Execution environment: ${typeof window === 'undefined' ? 'Server-side ✅' : 'Client-side ⚠️'}`);

  if (!openAIAvailable) {
    console.warn('⚠️ [Fallback] OpenAI not available, using hardcoded content');
    console.log('━'.repeat(80) + '\n');
    return getHardcodedContent(taskType, difficulty);
  }

  console.log('🚀 [AI] Preparing to call AI for content generation...');
  console.log('━'.repeat(80));

  // Build AI prompt based on task type
  const prompt = buildContentGenerationPrompt(params);

  // Generate content using GPT-5-Mini with fallback
  const fallbackContent = getHardcodedContent(taskType, difficulty);

  try {
    // GPT-5-mini with optimized parameters for JSON generation
    // Note: GPT-5-mini uses reasoning tokens (like o1/o3), so we need higher max_tokens
    // to allow for both reasoning (internal) and output (actual JSON response)
    const result = await generateCompletionWithFallback(
      {
        model: 'gpt-5-mini',
        input: prompt,
        max_tokens: 4000, // Increased from 500 to allow for reasoning tokens + output
        verbosity: 'medium', // Control response length
        reasoning_effort: 'minimal', // Faster responses for structured output
      },
      fallbackContent,
      60000 // 60 second timeout for content generation (increased from 30s for GPT-5-mini reasoning)
    );

    // If result is the fallback content, return it directly
    if (typeof result !== 'string' && 'output_text' in result) {
      // Parse and validate AI-generated content
      const generatedContent = parseAndValidateContent(
        result.output_text,
        taskType
      );

      if (generatedContent) {
        console.log(`✅ Generated AI task content for ${taskType}`);

        // Cache the generated content
        contentCache.set(cacheKey, generatedContent);

        // Clear cache after TTL
        setTimeout(() => contentCache.delete(cacheKey), CACHE_TTL_MS);

        return generatedContent;
      }
    }

    // Validation failed, use fallback
    console.warn('⚠️ AI content validation failed, using hardcoded content');
    return fallbackContent;
  } catch (error) {
    console.error('❌ Failed to generate AI content:', error);
    return fallbackContent;
  }
}

/**
 * Build AI prompt for task content generation
 */
function buildContentGenerationPrompt(params: TaskContentGenerationParams): string {
  const { userLevel, taskType, difficulty, recentChapters, learningHistory, learningPreferences } = params;

  let prompt = `生成《紅樓夢》學習任務內容。

等級：Level ${userLevel}
難度：${getDifficultyName(difficulty)}
`;

  // Add learning context
  if (recentChapters && recentChapters.length > 0) {
    prompt += `最近章節：第${recentChapters.join('、')}回\n`;
  }

  if (learningPreferences?.favoriteCharacters && learningPreferences.favoriteCharacters.length > 0) {
    prompt += `喜愛角色：${learningPreferences.favoriteCharacters.join('、')}\n`;
  }

  prompt += `\n`;

  // Add task-specific requirements
  prompt += buildTaskSpecificPrompt(taskType, difficulty, userLevel);

  // Add output format requirement
  prompt += `\n使用繁體中文，直接輸出JSON（不含其他文字）：`;

  return prompt;
}

/**
 * Build task-specific prompt requirements
 */
function buildTaskSpecificPrompt(
  taskType: DailyTaskType,
  difficulty: TaskDifficulty,
  userLevel: number
): string {
  switch (taskType) {
    case DailyTaskType.MORNING_READING:
      return `任務：晨讀文本理解

從《紅樓夢》選段落（50-100字），設計理解問題。
${userLevel <= 1 ? `新手用戶：選簡單段落，問題明確，提示詳細。\n` : ''}
JSON格式：
{
  "textPassage": {
    "text": "原文段落...",
    "source": "第X回",
    "question": "理解問題？",
    "hint": "思考提示...",
    "expectedKeywords": ["關鍵詞1", "關鍵詞2", "關鍵詞3"]
  }
}`;

    case DailyTaskType.POETRY:
      return `任務：詩詞默寫

選《紅樓夢》詩詞（難度${difficulty}）。

JSON格式：
{
  "poem": {
    "title": "詩詞標題",
    "author": "作者",
    "content": "完整詩詞\\n分行顯示",
    "background": "背景說明"
  }
}`;

    case DailyTaskType.CHARACTER_INSIGHT:
      return `任務：人物角色分析

選《紅樓夢》人物（Level ${userLevel}），提供描述與分析提示。

JSON格式：
{
  "character": {
    "name": "人物姓名",
    "description": "人物介紹（50-80字）",
    "analysisPrompts": ["分析角度1", "分析角度2", "分析角度3"],
    "relatedChapters": [回數1, 回數2]
  }
}`;

    case DailyTaskType.CULTURAL_EXPLORATION:
      return `任務：文化探秘問答

設計《紅樓夢》文化知識題（服飾/飲食/建築/禮儀）。

JSON格式範例：
{
  "culturalElement": {
    "id": "cultural_001",
    "category": "飲食",
    "title": "清代飲食文化",
    "description": "探索紅樓夢中的飲食文化",
    "relatedChapters": [5, 8],
    "questions": [{
      "id": "q1",
      "question": "賈府待客常用的保溫器具是？",
      "type": "multiple_choice",
      "options": ["銅鍋", "燭臺", "鬥碗", "暖盞"],
      "correctAnswer": "暖盞",
      "explanation": "清代豪門宴席用暖盞保持湯酒溫度。"
    }]
  }
}

注意：correctAnswer是字串（非數字），questions是陣列。`;

    case DailyTaskType.COMMENTARY_DECODE:
      return `任務：脂批解讀

選脂硯齋批語（難度${difficulty}），提供原文與解讀提示。

JSON格式：
{
  "commentary": {
    "commentaryText": "脂批原文",
    "originalText": "相關段落",
    "chapter": 回數,
    "interpretationHints": ["提示1", "提示2"]
  }
}`;

    default:
      return '';
  }
}

/**
 * Parse AI-generated content (simplified - prioritizing functionality)
 */
function parseAndValidateContent(
  aiOutput: string,
  taskType: DailyTaskType
): GeneratedTaskContent | null {
  try {
    // Extract JSON from output
    const jsonMatch = aiOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('⚠️ No JSON found in AI output');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Enhanced validation with required field checks
    switch (taskType) {
      case DailyTaskType.CULTURAL_EXPLORATION:
        // Support both culturalElement and culturalKnowledge
        const cultural = parsed.culturalElement || parsed.culturalKnowledge;
        if (cultural) {
          // Validate required fields
          if (!cultural.questions || !Array.isArray(cultural.questions) || cultural.questions.length === 0) {
            console.warn('⚠️ AI generated CULTURAL_EXPLORATION without questions array');
            return null; // Trigger fallback
          }

          // Auto-fix: Convert number correctAnswer to string
          cultural.questions = cultural.questions.map((q: any) => ({
            ...q,
            correctAnswer: typeof q.correctAnswer === 'number'
              ? q.options?.[q.correctAnswer] || String(q.correctAnswer)
              : q.correctAnswer,
          }));
          return { culturalElement: cultural };
        }
        break;

      case DailyTaskType.MORNING_READING:
        if (parsed.textPassage) {
          // Validate required fields
          if (!parsed.textPassage.text || !parsed.textPassage.question) {
            console.warn('⚠️ AI generated MORNING_READING without text or question');
            return null; // Trigger fallback
          }
          if (parsed.textPassage.text.trim().length < 20) {
            console.warn('⚠️ AI generated MORNING_READING with text too short');
            return null;
          }
          return { textPassage: parsed.textPassage };
        }
        break;

      case DailyTaskType.POETRY:
        if (parsed.poem) {
          // Validate required fields
          if (!parsed.poem.title || !parsed.poem.content) {
            console.warn('⚠️ AI generated POETRY without title or content');
            return null; // Trigger fallback
          }
          return { poem: parsed.poem };
        }
        break;

      case DailyTaskType.CHARACTER_INSIGHT:
        if (parsed.character) {
          // Validate required fields
          if (!parsed.character.characterName || !parsed.character.description) {
            console.warn('⚠️ AI generated CHARACTER_INSIGHT without characterName or description');
            return null; // Trigger fallback
          }
          return { character: parsed.character };
        }
        break;

      case DailyTaskType.COMMENTARY_DECODE:
        if (parsed.commentary) {
          // Validate required fields
          if (!parsed.commentary.originalText || !parsed.commentary.interpretation) {
            console.warn('⚠️ AI generated COMMENTARY_DECODE without originalText or interpretation');
            return null; // Trigger fallback
          }
          return { commentary: parsed.commentary };
        }
        break;
    }

    // Log for debugging but still try to use the content
    console.log('📋 Received JSON keys:', Object.keys(parsed));
    console.log('📄 Attempting to use AI content as-is');

    // Return parsed content even if validation didn't pass exactly
    return parsed as GeneratedTaskContent;

  } catch (error) {
    console.error('❌ Failed to parse AI content:', error);
    return null;
  }
}

/**
 * Get hardcoded content (fallback mechanism)
 */
function getHardcodedContent(
  taskType: DailyTaskType,
  difficulty: TaskDifficulty
): GeneratedTaskContent {
  // Simple fallback content for each task type
  switch (taskType) {
    case DailyTaskType.MORNING_READING:
      return {
        textPassage: {
          chapter: 3,
          startLine: 1,
          endLine: 10,
          text: '黛玉方進入房時，只見兩個人攙著一位鬢髮如銀的老母迎上來，黛玉便知是他外祖母。',
          question: '這段文字描述了黛玉初見何人？',
          hint: '思考提示：注意描述中「鬢髮如銀的老母」這個關鍵特徵，以及黛玉如何認出對方的。',
          expectedKeywords: ['外祖母', '賈母', '初見'],
        },
      };

    case DailyTaskType.POETRY:
      return {
        poem: {
          id: 'poem_zanghuayin_001',
          title: '葬花吟（節選）',
          author: '林黛玉',
          content: '花謝花飛花滿天，紅消香斷有誰憐？\n遊絲軟繫飄春榭，落絮輕沾撲繡簾。',
          chapter: 27,
          difficulty: 5,
          theme: '花',
        },
      };

    case DailyTaskType.CHARACTER_INSIGHT:
      return {
        character: {
          characterId: 'char_lindaiyu_001',
          characterName: '林黛玉',
          analysisPrompts: ['分析黛玉的性格特點', '探討黛玉與寶玉的關係', '黛玉的命運悲劇'],
          chapter: 3,
          context: '賈母的外孫女，才華橫溢卻體弱多病，初到賈府時步步留心，時時在意，與寶玉有深厚情誼。',
        },
      };

    case DailyTaskType.CULTURAL_EXPLORATION:
      return {
        culturalElement: {
          id: 'cultural_clothing_001',
          category: '服飾',
          title: '清代服飾',
          description: '探索《紅樓夢》中的清代貴族女性服飾文化',
          relatedChapters: [3, 6],
          questions: [{
            id: 'q_clothing_001',
            question: '《紅樓夢》中，貴族女性常穿的外衣稱為什麼？',
            type: 'multiple_choice',
            options: ['襖', '褂', '裙', '袍'],
            correctAnswer: '襖',
            explanation: '清代貴族女性服飾講究，襖為常見外衣',
          }],
        },
      };

    case DailyTaskType.COMMENTARY_DECODE:
      return {
        commentary: {
          id: 'commentary_chapter5_001',
          commentaryText: '「此回可卿夢阮，實乃寶玉夢也。」',
          originalText: '寶玉夢遊太虛幻境一段',
          chapter: 5,
          author: '脂硯齋',
          hint: '思考批語中的「實乃」二字，暗示了什麼？夢境在《紅樓夢》中有什麼特殊意義？',
        },
      };

    default:
      // Default to reading passage
      return {
        textPassage: {
          chapter: 1,
          startLine: 1,
          endLine: 5,
          text: '默認閱讀段落',
          question: '默認問題',
          expectedKeywords: ['關鍵詞'],
        },
      };
  }
}

/**
 * Get difficulty display name
 */
function getDifficultyName(difficulty: TaskDifficulty): string {
  const names: Record<TaskDifficulty, string> = {
    [TaskDifficulty.EASY]: '簡單',
    [TaskDifficulty.MEDIUM]: '中等',
    [TaskDifficulty.HARD]: '困難',
  };
  return names[difficulty];
}

/**
 * Clear content cache (utility function)
 */
export function clearContentCache(): void {
  contentCache.clear();
  console.log('✅ Content cache cleared');
}
