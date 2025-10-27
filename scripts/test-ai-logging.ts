/**
 * @fileOverview AI Logging Test Script
 *
 * Terminal script for testing AI logging functionality
 * Purpose:
 * - Clear AI content cache
 * - Force trigger AI task content generation
 * - Verify terminal log output
 *
 * Execution:
 * npm run test:ai-logging
 * or
 * npx ts-node scripts/test-ai-logging.ts
 */

import { generateTaskContent, clearContentCache } from '../src/lib/ai-task-content-generator';
import { DailyTaskType, TaskDifficulty } from '../src/lib/types/daily-task';

/**
 * Test AI logging functionality
 */
async function testAILogging() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 AI Logging Test Script');
  console.log('='.repeat(80));
  console.log('📝 Purpose: Verify terminal log output during AI content generation\n');

  // Step 1: Clear cache
  console.log('Step 1: Clearing AI content cache...');
  clearContentCache();
  console.log('✅ Cache cleared\n');

  // Step 2: Test AI generation for various task types
  const testCases = [
    {
      name: 'Morning Reading (MORNING_READING)',
      params: {
        userLevel: 3,
        taskType: DailyTaskType.MORNING_READING,
        difficulty: TaskDifficulty.MEDIUM,
        recentChapters: [3, 5, 7],
      }
    },
    {
      name: 'Poetry (POETRY)',
      params: {
        userLevel: 4,
        taskType: DailyTaskType.POETRY,
        difficulty: TaskDifficulty.HARD,
      }
    },
    {
      name: 'Character Insight (CHARACTER_INSIGHT)',
      params: {
        userLevel: 2,
        taskType: DailyTaskType.CHARACTER_INSIGHT,
        difficulty: TaskDifficulty.EASY,
      }
    }
  ];

  console.log(`Step 2: Testing AI generation for ${testCases.length} task types\n`);

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n${'▼'.repeat(80)}`);
    console.log(`🧪 Test Case ${i + 1}/${testCases.length}: ${testCase.name}`);
    console.log('▼'.repeat(80));

    try {
      const startTime = Date.now();
      const content = await generateTaskContent(testCase.params);
      const duration = Date.now() - startTime;

      console.log(`\n✅ Generation successful (Duration: ${duration}ms)`);
      console.log('Generated content summary:');
      console.log(JSON.stringify(content, null, 2).substring(0, 200) + '...');
    } catch (error) {
      console.error(`\n❌ Generation failed:`, error);
    }

    console.log('▲'.repeat(80) + '\n');

    // Wait 2 seconds before next test to avoid API rate limit
    if (i < testCases.length - 1) {
      console.log('⏳ Waiting 2 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Step 3: Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 Test Summary');
  console.log('='.repeat(80));
  console.log('✅ Test completed');
  console.log('📝 Please check the terminal output above to confirm:');
  console.log('   1. OpenAI client initialization logs');
  console.log('   2. AI content generator diagnostic logs');
  console.log('   3. OpenAI API request/response details');
  console.log('   4. Token usage statistics');
  console.log('   5. AI-generated content');
  console.log('='.repeat(80) + '\n');
}

// Execute test
testAILogging()
  .then(() => {
    console.log('🎉 Test script execution completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test script execution failed:', error);
    process.exit(1);
  });
