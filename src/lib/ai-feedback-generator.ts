/**
 * @fileOverview AI-Powered Feedback Generator for Daily Tasks
 *
 * This module uses GPT-5-Mini to generate personalized, detailed feedback
 * for user task submissions. It replaces the hardcoded template-based
 * feedback system with dynamic AI analysis.
 *
 * Key features:
 * - Personalized feedback based on actual user answers
 * - Task-type-specific evaluation criteria
 * - Difficulty-aware feedback (easy/medium/hard)
 * - Traditional Chinese output with encouraging tone
 * - Fallback to template feedback if AI fails
 * - Detailed analysis with specific strengths and weaknesses
 *
 * Usage:
 * ```typescript
 * const feedback = await generatePersonalizedFeedback({
 *   taskType: DailyTaskType.MORNING_READING,
 *   userAnswer: '這段文字描述了...',
 *   score: 75,
 *   difficulty: 'medium',
 *   taskContent: { textPassage: { text: '...', question: '...' } }
 * });
 * ```
 *
 * @phase Phase 2.8.2 - AI Feedback Generation Service
 */

import { generateCompletionWithFallback } from './openai-client';
import { DailyTaskType, TaskDifficulty, DailyTask } from './types/daily-task';

/**
 * Parameters for feedback generation
 */
export interface FeedbackGenerationParams {
  taskType: DailyTaskType;
  userAnswer: string;
  score: number;
  difficulty: TaskDifficulty;
  taskContent: DailyTask['content'];
  taskTitle?: string;
}

/**
 * Generate personalized feedback using GPT-5-Mini
 *
 * Analyzes the user's answer and provides detailed, constructive feedback
 * in Traditional Chinese. Falls back to template feedback if AI is unavailable.
 *
 * @param params - Feedback generation parameters
 * @returns Promise with personalized feedback string
 */
export async function generatePersonalizedFeedback(
  params: FeedbackGenerationParams
): Promise<string> {
  const { taskType, userAnswer, score, difficulty, taskContent, taskTitle } = params;
  const fallbackFeedback =
    '優點：展現出用心研讀的態度。不足：內容略顯簡略，容易被視為缺乏實質內容。建議：補充具體段落與觀點，維持傳統中文書寫並繼續加油！';

  // 🎓 記錄回饋生成開始
  console.log('\n' + '🎓'.repeat(40));
  console.log('📚 [AI Feedback Generator] 開始生成個性化回饋');
  console.log('🎓'.repeat(40));
  console.log(`📌 任務類型: ${getTaskTypeDisplayName(taskType)}`);
  console.log(`📝 任務標題: ${taskTitle || '學習任務'}`);
  console.log(`⭐ 學生得分: ${score}/100`);
  console.log(`📊 難度等級: ${getDifficultyDisplayName(difficulty)}`);
  console.log(`📏 答案長度: ${userAnswer.length} 字元`);

  console.log('\n🔍 學生答案預覽:');
  console.log('-'.repeat(80));
  console.log(userAnswer.substring(0, 200));
  if (userAnswer.length > 200) {
    console.log(`\n... (還有 ${userAnswer.length - 200} 個字元)`);
  }
  console.log('-'.repeat(80));

  // Truncate long answers to avoid token limit issues
  // GPT-5-mini has token limits, and long answers can cause finish_reason: "length"
  const truncatedAnswer = userAnswer.length > 500
    ? userAnswer.substring(0, 500) + '...\n[答案過長已截斷，以上為前500字元]'
    : userAnswer;

  if (userAnswer.length > 500) {
    console.log(`⚠️  [Feedback] 學生答案過長 (${userAnswer.length} 字元)，已截斷至 500 字元以節省 tokens`);
  }

  // Build AI prompt based on task type with truncated answer
  const truncatedParams = {
    ...params,
    userAnswer: truncatedAnswer,
  };
  const prompt = buildFeedbackPrompt(truncatedParams);

  try {
    console.log('\n🚀 準備呼叫 GPT-5-Mini API...\n');
    const templateFallback = generateTemplateFeedback(taskType, score);

    // GPT-5-mini uses reasoning tokens (like o1/o3), so we need adequate max_tokens
    // to allow for both reasoning (internal) and output (actual feedback text)
    // Increased from 600 to 2000 to prevent empty responses due to reasoning token exhaustion
    const aiResult = await generateCompletionWithFallback(
      {
        model: 'gpt-5-mini',
        input: prompt,
        max_tokens: 2000, // Increased from 600 to accommodate GPT-5-mini reasoning tokens
        verbosity: 'medium', // Control response length
        reasoning_effort: 'minimal', // Faster responses for feedback
      },
      templateFallback || fallbackFeedback,
      30000 // 30 second timeout (increased from 20s for GPT-5-mini reasoning)
    );

    const rawFeedback =
      typeof aiResult === 'string' ? aiResult : aiResult.output_text;
    const feedback = rawFeedback && rawFeedback.trim().length > 0
      ? rawFeedback.trim()
      : fallbackFeedback;

    console.log('\n✅ [Feedback] AI 回饋生成完成');
    console.log(`   📏 回饋長度: ${feedback.length} 字元`);
    if (typeof aiResult !== 'string') {
      console.log(`   🎯 模型: ${aiResult.model}`);
      if (aiResult.usage) {
        console.log(`   📊 使用 Tokens: ${aiResult.usage.total_tokens}`);
      }
    } else {
      console.log('   🎯 模型: fallback (timeout/template)');
    }
    console.log('🎓'.repeat(40) + '\n');

    return feedback;

  } catch (error) {
    console.error('\n❌ [Feedback] AI 生成失敗:');
    console.error(error);
    console.log('🎓'.repeat(40) + '\n');
    return fallbackFeedback;
  }
}

/**
 * Build AI prompt for feedback generation
 */
function buildFeedbackPrompt(params: FeedbackGenerationParams): string {
  const { taskType, userAnswer, score, difficulty, taskContent, taskTitle } = params;

  // Simplified prompt template for better GPT-5-mini understanding
  let prompt = `你是《紅樓夢》教師，評估學生作答。

任務：${taskTitle || getTaskTypeDisplayName(taskType)}
得分：${score}/100

`;

  // Add task-specific context
  prompt += buildTaskSpecificContext(taskType, taskContent);

  // Add user answer
  prompt += `學生回答：
${userAnswer}

`;

  // Simplified evaluation criteria
  prompt += `請用繁體中文寫150-300字評語，包含：
1. 優點（具體說明好的地方）
2. 不足（需要改進的地方）
3. 建議（如何進步）

直接輸出評語，無需格式：`;

  return prompt;
}

/**
 * Build task-specific context for the prompt
 */
function buildTaskSpecificContext(
  taskType: DailyTaskType,
  taskContent: DailyTask['content']
): string {
  let context = '';

  switch (taskType) {
    case DailyTaskType.MORNING_READING:
      if (taskContent.textPassage) {
        context += `原文：${taskContent.textPassage.text}
問題：${taskContent.textPassage.question}

`;
      }
      break;

    case DailyTaskType.CHARACTER_INSIGHT:
      if (taskContent.character) {
        context += `人物：${taskContent.character.characterName}
背景：${taskContent.character.context || ''}

`;
      }
      break;

    case DailyTaskType.CULTURAL_EXPLORATION:
      if (taskContent.culturalElement) {
        context += `主題：${taskContent.culturalElement.title}
說明：${taskContent.culturalElement.description}
問題：${taskContent.culturalElement.questions && taskContent.culturalElement.questions.length > 0 ? taskContent.culturalElement.questions[0].question : ''}

`;
      }
      break;

    case DailyTaskType.COMMENTARY_DECODE:
      if (taskContent.commentary) {
        context += `脂批：${taskContent.commentary.commentaryText}
原文：${taskContent.commentary.originalText || '（見原文）'}

`;
      }
      break;

    default:
      context += '《紅樓夢》學習任務\n\n';
  }

  return context;
}

/**
 * Get display name for task type (in Traditional Chinese)
 */
function getTaskTypeDisplayName(taskType: DailyTaskType): string {
  const displayNames: Record<DailyTaskType, string> = {
    [DailyTaskType.MORNING_READING]: '晨讀時光 - 文本理解',
    [DailyTaskType.CHARACTER_INSIGHT]: '人物洞察 - 角色分析',
    [DailyTaskType.CULTURAL_EXPLORATION]: '文化探秘 - 知識問答',
    [DailyTaskType.COMMENTARY_DECODE]: '脂批解密 - 批語解讀',
  };
  return displayNames[taskType] || '學習任務';
}

/**
 * Get display name for difficulty (in Traditional Chinese)
 */
function getDifficultyDisplayName(difficulty: TaskDifficulty): string {
  const displayNames: Record<TaskDifficulty, string> = {
    [TaskDifficulty.EASY]: '簡單',
    [TaskDifficulty.MEDIUM]: '中等',
    [TaskDifficulty.HARD]: '困難',
  };
  return displayNames[difficulty] || '中等';
}

/**
 * Generate template-based feedback (fallback mechanism)
 *
 * Used when GPT-5-Mini is unavailable or fails
 */
function generateTemplateFeedback(taskType: DailyTaskType, score: number): string {
  const feedbackTemplates = {
    excellent: [
      '優點：分析深入且條理清楚。不足：仍可補充關鍵語句引用。建議：維持這份細緻度並繼續擴展觀點，繼續加油！',
      '優點：關鍵情節掌握到位。不足：背景連結略顯簡略。建議：加入更多文本細節，讓回答更全面，繼續加油！',
      '優點：觀點成熟、例證充分。不足：若能整理比較將更精彩。建議：延伸多角度分析，持續精進並繼續加油！',
    ],
    good: [
      '優點：主題掌握正確。不足：段落仍可更深入。建議：補上具體細節並繼續練習，進步空間很大，繼續加油！',
      '優點：條理清晰。不足：分析深度稍嫌不足。建議：再加上兩三個例子，就能把答案推向更高層次，繼續加油！',
      '優點：整體方向正確。不足：缺少對角色心理的延伸。建議：練習比較法，會幫助你更快提升，繼續加油！',
    ],
    average: [
      '優點：已點出問題重點。不足：例證偏少。建議：從原文挑出關鍵句，加以說明，繼續加油！',
      '優點：語意清楚。不足：欠缺情節連結。建議：補充人物動機與情境描述，讓答案更飽滿並繼續加油！',
      '優點：回答完整。不足：觀點較為概述。建議：從角色特質或象徵出發，深化理解並繼續加油！',
    ],
    needsWork: [
      '優點：保持了回答意願。不足：內容過於簡略，容易被視為缺乏實質內容。建議：重新閱讀題目段落，列出兩個重點再作答，繼續加油！',
      '優點：抓住了部分關鍵字。不足：論述尚未展開。建議：依序說明背景、人物與感受，答案會更完整，繼續加油！',
      '優點：語句通順。不足：缺乏實質內容或例子。建議：先寫出角色事件，再分享你的理解，認真作答就能看見進步，繼續加油！',
    ],
  };

  let category: keyof typeof feedbackTemplates;
  if (score >= 85) {
    category = 'excellent';
  } else if (score >= 70) {
    category = 'good';
  } else if (score >= 60) {
    category = 'average';
  } else {
    category = 'needsWork';
  }

  const templates = feedbackTemplates[category];
  return templates[Math.floor(Math.random() * templates.length)];
}
