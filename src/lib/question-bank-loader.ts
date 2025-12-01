/**
 * @fileOverview Question Bank Loader
 *
 * This module loads pre-generated questions from the question bank JSON file.
 * It provides random selection based on task type and difficulty level.
 *
 * @phase Task 3.2 - Pre-generated Question System
 */

import {
  DailyTaskType,
  TaskDifficulty,
  TextPassage,
  CharacterPrompt,
  CulturalElement,
  CommentaryContent,
} from './types/daily-task';

/**
 * Question bank structure matching question-bank.json
 */
interface QuestionBank {
  metadata: {
    version: string;
    lastUpdated: string;
    description: string;
    totalQuestions: number;
  };
  morning_reading: {
    easy: TextPassage[];
    medium: TextPassage[];
    hard: TextPassage[];
  };
  character_insight: {
    easy: CharacterPrompt[];
    medium: CharacterPrompt[];
    hard: CharacterPrompt[];
  };
  cultural_exploration: {
    easy: CulturalElement[];
    medium: CulturalElement[];
    hard: CulturalElement[];
  };
  commentary_decode: {
    easy: CommentaryContent[];
    medium: CommentaryContent[];
    hard: CommentaryContent[];
  };
}

/**
 * Cached question bank data
 */
let questionBankCache: QuestionBank | null = null;

/**
 * Track recently used question IDs to avoid repetition
 * Key: taskType_difficulty, Value: Set of recently used IDs
 */
const recentlyUsedIds: Map<string, Set<string>> = new Map();

/**
 * Maximum number of recently used IDs to track per category
 */
const MAX_RECENT_IDS = 5;

/**
 * Load question bank from JSON file
 * Uses dynamic import to load the JSON at runtime
 */
async function loadQuestionBank(): Promise<QuestionBank> {
  if (questionBankCache) {
    return questionBankCache;
  }

  try {
    // Dynamic import of JSON file
    const questionBankModule = await import('../../data/task-questions/question-bank.json');
    questionBankCache = questionBankModule.default as QuestionBank;

    console.log(`✅ Question bank loaded: ${questionBankCache.metadata.totalQuestions} questions`);
    return questionBankCache;
  } catch (error) {
    console.error('❌ Failed to load question bank:', error);
    throw new Error('Question bank file not found or invalid');
  }
}

/**
 * Get a random item from an array, avoiding recently used items
 */
function getRandomItem<T extends { id?: string; chapter?: number; characterId?: string }>(
  items: T[],
  recentKey: string
): T | null {
  if (!items || items.length === 0) {
    return null;
  }

  // Get or create the set of recently used IDs
  if (!recentlyUsedIds.has(recentKey)) {
    recentlyUsedIds.set(recentKey, new Set());
  }
  const recentIds = recentlyUsedIds.get(recentKey)!;

  // Try to find an item that hasn't been used recently
  const availableItems = items.filter((item) => {
    const itemId = item.id || item.characterId || `chapter-${item.chapter}`;
    return !recentIds.has(itemId);
  });

  // If all items have been used recently, reset and use all items
  const candidateItems = availableItems.length > 0 ? availableItems : items;

  // Random selection
  const randomIndex = Math.floor(Math.random() * candidateItems.length);
  const selectedItem = candidateItems[randomIndex];

  // Track the used ID
  const selectedId = selectedItem.id || selectedItem.characterId || `chapter-${selectedItem.chapter}`;
  recentIds.add(selectedId);

  // Limit the size of recently used IDs
  if (recentIds.size > MAX_RECENT_IDS) {
    const idsArray = Array.from(recentIds);
    recentIds.delete(idsArray[0]); // Remove oldest
  }

  return selectedItem;
}

/**
 * Map TaskDifficulty enum to question bank difficulty key
 */
function mapDifficultyKey(difficulty: TaskDifficulty): 'easy' | 'medium' | 'hard' {
  switch (difficulty) {
    case TaskDifficulty.EASY:
      return 'easy';
    case TaskDifficulty.MEDIUM:
      return 'medium';
    case TaskDifficulty.HARD:
      return 'hard';
    default:
      return 'easy';
  }
}

/**
 * Get a random morning reading passage from the question bank
 */
export async function getRandomMorningReading(
  difficulty: TaskDifficulty
): Promise<TextPassage | null> {
  try {
    const bank = await loadQuestionBank();
    const difficultyKey = mapDifficultyKey(difficulty);
    const passages = bank.morning_reading[difficultyKey];

    if (!passages || passages.length === 0) {
      console.warn(`⚠️ No morning_reading questions found for difficulty: ${difficultyKey}`);
      return null;
    }

    const recentKey = `morning_reading_${difficultyKey}`;
    return getRandomItem(passages, recentKey);
  } catch (error) {
    console.error('❌ Error getting morning reading:', error);
    return null;
  }
}

/**
 * Get a random character insight prompt from the question bank
 */
export async function getRandomCharacterInsight(
  difficulty: TaskDifficulty
): Promise<CharacterPrompt | null> {
  try {
    const bank = await loadQuestionBank();
    const difficultyKey = mapDifficultyKey(difficulty);
    const prompts = bank.character_insight[difficultyKey];

    if (!prompts || prompts.length === 0) {
      console.warn(`⚠️ No character_insight questions found for difficulty: ${difficultyKey}`);
      return null;
    }

    const recentKey = `character_insight_${difficultyKey}`;
    return getRandomItem(prompts, recentKey);
  } catch (error) {
    console.error('❌ Error getting character insight:', error);
    return null;
  }
}

/**
 * Get a random cultural exploration element from the question bank
 */
export async function getRandomCulturalExploration(
  difficulty: TaskDifficulty
): Promise<CulturalElement | null> {
  try {
    const bank = await loadQuestionBank();
    const difficultyKey = mapDifficultyKey(difficulty);
    const elements = bank.cultural_exploration[difficultyKey];

    if (!elements || elements.length === 0) {
      console.warn(`⚠️ No cultural_exploration questions found for difficulty: ${difficultyKey}`);
      return null;
    }

    const recentKey = `cultural_exploration_${difficultyKey}`;
    return getRandomItem(elements, recentKey);
  } catch (error) {
    console.error('❌ Error getting cultural exploration:', error);
    return null;
  }
}

/**
 * Get a random commentary decode content from the question bank
 */
export async function getRandomCommentaryDecode(
  difficulty: TaskDifficulty
): Promise<CommentaryContent | null> {
  try {
    const bank = await loadQuestionBank();
    const difficultyKey = mapDifficultyKey(difficulty);
    const commentaries = bank.commentary_decode[difficultyKey];

    if (!commentaries || commentaries.length === 0) {
      console.warn(`⚠️ No commentary_decode questions found for difficulty: ${difficultyKey}`);
      return null;
    }

    const recentKey = `commentary_decode_${difficultyKey}`;
    return getRandomItem(commentaries, recentKey);
  } catch (error) {
    console.error('❌ Error getting commentary decode:', error);
    return null;
  }
}

/**
 * Get random content based on task type and difficulty
 * Returns the appropriate content type for the given task
 */
export async function getRandomQuestionByType(
  taskType: DailyTaskType,
  difficulty: TaskDifficulty
): Promise<TextPassage | CharacterPrompt | CulturalElement | CommentaryContent | null> {
  switch (taskType) {
    case DailyTaskType.MORNING_READING:
      return getRandomMorningReading(difficulty);
    case DailyTaskType.CHARACTER_INSIGHT:
      return getRandomCharacterInsight(difficulty);
    case DailyTaskType.CULTURAL_EXPLORATION:
      return getRandomCulturalExploration(difficulty);
    case DailyTaskType.COMMENTARY_DECODE:
      return getRandomCommentaryDecode(difficulty);
    default:
      console.warn(`⚠️ Unknown task type: ${taskType}`);
      return null;
  }
}

/**
 * Get question bank statistics
 */
export async function getQuestionBankStats(): Promise<{
  totalQuestions: number;
  byType: Record<string, { easy: number; medium: number; hard: number }>;
}> {
  try {
    const bank = await loadQuestionBank();

    return {
      totalQuestions: bank.metadata.totalQuestions,
      byType: {
        morning_reading: {
          easy: bank.morning_reading.easy.length,
          medium: bank.morning_reading.medium.length,
          hard: bank.morning_reading.hard.length,
        },
        character_insight: {
          easy: bank.character_insight.easy.length,
          medium: bank.character_insight.medium.length,
          hard: bank.character_insight.hard.length,
        },
        cultural_exploration: {
          easy: bank.cultural_exploration.easy.length,
          medium: bank.cultural_exploration.medium.length,
          hard: bank.cultural_exploration.hard.length,
        },
        commentary_decode: {
          easy: bank.commentary_decode.easy.length,
          medium: bank.commentary_decode.medium.length,
          hard: bank.commentary_decode.hard.length,
        },
      },
    };
  } catch (error) {
    console.error('❌ Error getting question bank stats:', error);
    return {
      totalQuestions: 0,
      byType: {
        morning_reading: { easy: 0, medium: 0, hard: 0 },
        character_insight: { easy: 0, medium: 0, hard: 0 },
        cultural_exploration: { easy: 0, medium: 0, hard: 0 },
        commentary_decode: { easy: 0, medium: 0, hard: 0 },
      },
    };
  }
}

/**
 * Clear the question bank cache (useful for testing or when JSON is updated)
 */
export function clearQuestionBankCache(): void {
  questionBankCache = null;
  recentlyUsedIds.clear();
  console.log('🔄 Question bank cache cleared');
}
