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
  | { culturalKnowledge: CulturalElement }
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

  // Check cache first
  const cacheKey = `${userLevel}_${taskType}_${difficulty}`;
  const cachedContent = contentCache.get(cacheKey);
  if (cachedContent) {
    console.log(`✅ Using cached task content for ${cacheKey}`);
    return cachedContent;
  }

  // If OpenAI is not available, use hardcoded content
  if (!isOpenAIAvailable()) {
    console.warn('⚠️ OpenAI not available, using hardcoded content');
    return getHardcodedContent(taskType, difficulty);
  }

  // Build AI prompt based on task type
  const prompt = buildContentGenerationPrompt(params);

  // Generate content using GPT-5-Mini with fallback
  const fallbackContent = getHardcodedContent(taskType, difficulty);

  try {
    const result = await generateCompletionWithFallback(
      {
        model: 'gpt-5-mini',
        input: prompt,
        temperature: 0.8, // Higher creativity for content generation
        max_tokens: 500,
      },
      fallbackContent,
      15000 // 15 second timeout for content generation
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

  let prompt = `你是《紅樓夢》教學內容專家，請生成適合學生的學習任務內容。

**學生資料**:
- 用戶等級: Level ${userLevel} (0-7級，越高越進階)
- 任務難度: ${getDifficultyName(difficulty)}
`;

  // Add learning context
  if (recentChapters && recentChapters.length > 0) {
    prompt += `- 最近閱讀章節: 第${recentChapters.join('、')}回\n`;
  }

  if (learningPreferences?.favoriteCharacters && learningPreferences.favoriteCharacters.length > 0) {
    prompt += `- 喜愛角色: ${learningPreferences.favoriteCharacters.join('、')}\n`;
  }

  prompt += `\n`;

  // Add task-specific requirements
  prompt += buildTaskSpecificPrompt(taskType, difficulty, userLevel);

  // Add output format requirement
  prompt += `\n**重要要求**:
- 內容必須準確符合《紅樓夢》原著
- 難度要與用戶等級匹配（Level ${userLevel}）
- 請直接輸出 JSON 格式，無需其他說明
- 使用繁體中文

請直接輸出 JSON，不要包含任何其他文字：`;

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
      return `**任務類型**: 晨讀時光 - 文本理解

請生成一個閱讀理解任務，包含：
1. 從《紅樓夢》選擇適當段落（50-100字）
2. 設計理解問題（針對該段落的主題、人物、情節）
3. 提供思考提示（引導用戶思考方向，不直接給出答案）
4. 列出預期關鍵詞（3-5個核心概念）

${userLevel <= 1 ? `**重要：用戶是新手（Level ${userLevel}），請特別注意：**
- 選擇簡單易懂的段落，如人物初次登場、基本情節介紹等
- 問題應該直接明確，避免過於抽象
- 提示應該更加詳細和引導性，幫助新手理解文本
- 避免使用艱深的文言文詞彙
` : ''}
JSON 格式：
{
  "textPassage": {
    "text": "《紅樓夢》原文段落...",
    "source": "第X回",
    "question": "理解問題？",
    "hint": "思考提示：可以從...角度思考，注意...等關鍵描述",
    "expectedKeywords": ["關鍵詞1", "關鍵詞2", "關鍵詞3"]
  }
}`;

    case DailyTaskType.POETRY:
      return `**任務類型**: 詩詞韻律 - 詩詞默寫

請選擇一首《紅樓夢》中的詩詞，適合用戶等級 ${userLevel}：
1. 選擇經典詩詞（難度: ${difficulty}）
2. 提供完整詩詞內容
3. 註明作者和出處

JSON 格式：
{
  "poem": {
    "title": "詩詞標題",
    "author": "作者（書中人物）",
    "content": "完整詩詞內容\\n分行顯示",
    "background": "詩詞背景說明（1-2句）"
  }
}`;

    case DailyTaskType.CHARACTER_INSIGHT:
      return `**任務類型**: 人物洞察 - 角色分析

請選擇一個《紅樓夢》人物進行分析任務：
1. 選擇適合等級的人物（Level ${userLevel}）
2. 提供人物描述和分析提示
3. 列出分析主題

JSON 格式：
{
  "character": {
    "name": "人物姓名",
    "description": "人物基本介紹（50-80字）",
    "analysisPrompts": ["分析角度1", "分析角度2", "分析角度3"],
    "relatedChapters": [回數1, 回數2]
  }
}`;

    case DailyTaskType.CULTURAL_EXPLORATION:
      return `**任務類型**: 文化探秘 - 知識問答

請設計一個關於《紅樓夢》的文化知識問題：
1. 選擇文化主題（服飾、飲食、建築、禮儀等）
2. 設計問題和選項
3. 提供歷史背景

JSON 格式：
{
  "culturalKnowledge": {
    "topic": "文化主題",
    "question": "問題描述",
    "options": ["選項A", "選項B", "選項C", "選項D"],
    "correctAnswer": 0,
    "historicalContext": "文化背景說明"
  }
}`;

    case DailyTaskType.COMMENTARY_DECODE:
      return `**任務類型**: 脂批解密 - 批語解讀

請選擇一段脂硯齋批語進行解讀任務：
1. 選擇經典批語（難度: ${difficulty}）
2. 提供相關原文段落
3. 列出解讀提示

JSON 格式：
{
  "commentary": {
    "commentaryText": "脂批原文",
    "originalText": "相關《紅樓夢》段落",
    "chapter": 回數,
    "interpretationHints": ["提示1", "提示2"]
  }
}`;

    default:
      return '';
  }
}

/**
 * Parse and validate AI-generated content
 */
function parseAndValidateContent(
  aiOutput: string,
  taskType: DailyTaskType
): GeneratedTaskContent | null {
  try {
    // Try to extract JSON from the output
    const jsonMatch = aiOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ No JSON found in AI output');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate based on task type
    switch (taskType) {
      case DailyTaskType.MORNING_READING:
        if (parsed.textPassage && parsed.textPassage.text && parsed.textPassage.question) {
          return { textPassage: parsed.textPassage };
        }
        break;

      case DailyTaskType.POETRY:
        if (parsed.poem && parsed.poem.title && parsed.poem.content) {
          return { poem: parsed.poem };
        }
        break;

      case DailyTaskType.CHARACTER_INSIGHT:
        if (parsed.character && parsed.character.name && parsed.character.description) {
          return { character: parsed.character };
        }
        break;

      case DailyTaskType.CULTURAL_EXPLORATION:
        if (parsed.culturalKnowledge && parsed.culturalKnowledge.question) {
          return { culturalKnowledge: parsed.culturalKnowledge };
        }
        break;

      case DailyTaskType.COMMENTARY_DECODE:
        if (parsed.commentary && parsed.commentary.commentaryText) {
          return { commentary: parsed.commentary };
        }
        break;
    }

    console.error('❌ AI content validation failed for task type:', taskType);
    return null;
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
          source: '第三回', // For backward compatibility with tests
          question: '這段文字描述了黛玉初見何人？',
          hint: '思考提示：注意描述中「鬢髮如銀的老母」這個關鍵特徵，以及黛玉如何認出對方的。',
          expectedKeywords: ['外祖母', '賈母', '初見'],
        } as any,
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
          background: '黛玉葬花時所吟，表達對命運的感傷', // For backward compatibility with tests
        } as any,
      };

    case DailyTaskType.CHARACTER_INSIGHT:
      return {
        character: {
          characterId: 'char_lindaiyu_001',
          characterName: '林黛玉',
          name: '林黛玉', // For backward compatibility with tests
          description: '賈母的外孫女，才華橫溢卻體弱多病，初到賈府時步步留心，時時在意，與寶玉有深厚情誼。', // For backward compatibility
          analysisPrompts: ['分析黛玉的性格特點', '探討黛玉與寶玉的關係', '黛玉的命運悲劇'],
          chapter: 3,
          context: '賈母的外孫女，才華橫溢卻體弱多病，初到賈府時步步留心，時時在意，與寶玉有深厚情誼。',
          relatedChapters: [3, 27, 98], // For backward compatibility with tests
        } as any,
      };

    case DailyTaskType.CULTURAL_EXPLORATION:
      return {
        culturalKnowledge: {
          topic: '清代服飾',
          question: '《紅樓夢》中，貴族女性常穿的外衣稱為什麼？',
          options: ['襖', '褂', '裙', '袍'],
          correctAnswer: 0,
          historicalContext: '清代貴族女性服飾講究，襖為常見外衣',
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
          interpretationHints: ['夢境隱喻', '人物命運預示'], // For backward compatibility with tests
        } as any,
      };

    default:
      // Default to reading passage
      return {
        textPassage: {
          text: '默認閱讀段落',
          source: '第一回',
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
