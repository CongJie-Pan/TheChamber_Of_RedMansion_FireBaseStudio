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

import { generateCompletionWithFallback, isOpenAIAvailable } from './openai-client';
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

  // If OpenAI is not available, use fallback templates
  if (!isOpenAIAvailable()) {
    console.warn('\n⚠️  [Feedback] OpenAI 不可用，使用模板回饋');
    console.log('🎓'.repeat(40) + '\n');
    return generateTemplateFeedback(taskType, score);
  }

  // Build AI prompt based on task type
  const prompt = buildFeedbackPrompt(params);

  // Generate feedback using GPT-5-Mini with fallback
  const fallbackFeedback = generateTemplateFeedback(taskType, score);

  try {
    console.log('\n🚀 準備呼叫 GPT-5-Mini API...\n');

    const result = await generateCompletionWithFallback(
      {
        model: 'gpt-5-mini',
        input: prompt,
        temperature: 0.7, // Slightly creative for varied feedback
        max_tokens: 300, // Limit feedback length (150-300 characters in Chinese)
      },
      fallbackFeedback,
      10000 // 10 second timeout
    );

    // If result is a string (fallback), return it directly
    if (typeof result === 'string') {
      console.log('\n⚠️  [Feedback] 使用模板回饋 (API 超時或失敗)');
      console.log('🎓'.repeat(40) + '\n');
      return result;
    }

    // Extract and validate AI-generated feedback
    const aiFeedback = result.output_text.trim();

    // Ensure feedback is not empty and is in Chinese
    if (aiFeedback.length > 0 && /[\u4e00-\u9fa5]/.test(aiFeedback)) {
      console.log('\n✅ [Feedback] 成功生成個性化回饋');
      console.log(`   📏 回饋長度: ${aiFeedback.length} 字元`);
      console.log(`   🎯 模型: ${result.model}`);
      if (result.usage) {
        console.log(`   📊 使用 Tokens: ${result.usage.total_tokens}`);
      }
      console.log('🎓'.repeat(40) + '\n');
      return aiFeedback;
    } else {
      console.warn('\n⚠️  [Feedback] AI 回饋驗證失敗（不包含中文或為空），使用模板');
      console.log('🎓'.repeat(40) + '\n');
      return fallbackFeedback;
    }
  } catch (error) {
    console.error('\n❌ [Feedback] 生成 AI 回饋時發生錯誤:');
    console.error(error);
    console.log('⚠️  降級使用模板回饋');
    console.log('🎓'.repeat(40) + '\n');
    return fallbackFeedback;
  }
}

/**
 * Build AI prompt for feedback generation
 */
function buildFeedbackPrompt(params: FeedbackGenerationParams): string {
  const { taskType, userAnswer, score, difficulty, taskContent, taskTitle } = params;

  // Base prompt template
  let prompt = `你是一位專業的《紅樓夢》文學教師，正在評估學生的任務完成情況。

**任務類型**: ${getTaskTypeDisplayName(taskType)}
**任務標題**: ${taskTitle || '學習任務'}
**難度等級**: ${getDifficultyDisplayName(difficulty)}
**學生得分**: ${score}/100

`;

  // Add task-specific context
  prompt += buildTaskSpecificContext(taskType, taskContent);

  // Add user answer
  prompt += `**學生回答**:
${userAnswer}

`;

  // Add evaluation criteria
  prompt += `**評估要求**:
請根據學生的實際回答內容，提供個性化的反饋評語（150-300字）。

評語應該包含：
1. **優點**：具體指出回答中的亮點和正確之處
2. **不足**：明確指出需要改進的地方
3. **建議**：提供具體、可操作的改進方向

評分參考：
- 85-100分：「出色」 - 給予高度肯定，鼓勵保持
- 70-84分：「良好」 - 肯定成果，指出進步空間
- 60-69分：「及格」 - 溫和指出問題，鼓勵繼續努力
- 0-59分：「需加強」 - 明確指出問題，提供具體改進建議

**重要**：
- 必須使用繁體中文
- 語氣要友善、專業、鼓勵性
- 避免過於模板化的用語
- 針對實際答案內容進行評價，不要籠統描述
- 如果答案明顯無意義（如"000000"），請明確指出並要求認真作答

請直接輸出評語內容，無需其他格式：`;

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
        context += `**閱讀段落**:
${taskContent.textPassage.text}

**理解問題**:
${taskContent.textPassage.question}

`;
      }
      break;

    case DailyTaskType.POETRY:
      if (taskContent.poem) {
        context += `**詩詞原文**:
《${taskContent.poem.title}》- ${taskContent.poem.author}
${taskContent.poem.content}

**任務**: 默寫詩詞並理解其意境

`;
      }
      break;

    case DailyTaskType.CHARACTER_INSIGHT:
      if (taskContent.character) {
        context += `**人物**: ${taskContent.character.characterName}
**人物背景**: ${taskContent.character.context || ''}

**分析要求**: 深入分析人物性格特點與命運

`;
      }
      break;

    case DailyTaskType.CULTURAL_EXPLORATION:
      if (taskContent.culturalElement) {
        context += `**文化主題**: ${taskContent.culturalElement.title}
**文化背景**: ${taskContent.culturalElement.description}
**問題**: ${taskContent.culturalElement.questions && taskContent.culturalElement.questions.length > 0 ? taskContent.culturalElement.questions[0].question : ''}

`;
      }
      break;

    case DailyTaskType.COMMENTARY_DECODE:
      if (taskContent.commentary) {
        context += `**脂批原文**: ${taskContent.commentary.commentaryText}
**相關段落**: ${taskContent.commentary.originalText || '（見原文）'}

**任務**: 解讀批語的深層含義

`;
      }
      break;

    default:
      context += '**任務內容**: 《紅樓夢》學習任務\n\n';
  }

  return context;
}

/**
 * Get display name for task type (in Traditional Chinese)
 */
function getTaskTypeDisplayName(taskType: DailyTaskType): string {
  const displayNames: Record<DailyTaskType, string> = {
    [DailyTaskType.MORNING_READING]: '晨讀時光 - 文本理解',
    [DailyTaskType.POETRY]: '詩詞韻律 - 詩詞默寫',
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
      '太棒了！您的分析深入透徹，展現了對紅樓夢的深刻理解。',
      '出色的表現！您的見解令人印象深刻，繼續保持！',
      '精彩！您已經掌握了這部分內容的精髓。',
    ],
    good: [
      '很好！您的理解基本正確，繼續努力會更好。',
      '不錯的表現！多加練習會有更大進步。',
      '良好！您已經掌握了大部分要點。',
    ],
    average: [
      '還不錯，但還有進步空間。建議多閱讀相關章節。',
      '基本達標，繼續加油！建議深入思考文本含義。',
      '合格，但可以做得更好。試著從多角度分析。',
    ],
    needsWork: [
      '需要更多努力。建議重新閱讀相關內容，仔細思考。',
      '還需要加強。不要氣餒，學習需要時間和耐心。',
      '繼續努力！建議先掌握基礎知識，再深入學習。',
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
