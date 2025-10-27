/**
 * @fileOverview Task Generator Unit Tests
 *
 * Comprehensive test suite for the TaskGenerator class including:
 * - Task generation with variety and difficulty adaptation
 * - Content generation for all 5 task types
 * - XP reward calculation and grading criteria
 * - Task ID generation and uniqueness
 * - Weighted random type selection
 *
 * Test Categories:
 * 1. Expected Use Cases: Normal task generation operations
 * 2. Content Generation: Verify Red Mansion content accuracy
 * 3. Edge Cases: Boundary conditions and unusual inputs
 *
 * Each test validates the educational content quality and system integrity.
 */

import { TaskGenerator } from '@/lib/task-generator';
import {
  DailyTaskType,
  TaskDifficulty,
  DailyTask,
} from '@/lib/types/daily-task';

describe('TaskGenerator', () => {
  let generator: TaskGenerator;
  let testLogger: any;

  beforeEach(() => {
    generator = new TaskGenerator();
    testLogger = {
      logs: [],
      log: (message: string, data?: any) => {
        testLogger.logs.push({ message, data, timestamp: new Date().toISOString() });
      },
    };
  });

  describe('Task Generation - Expected Use Cases', () => {
    /**
     * Test Case 1: Generate 2 daily tasks for user
     *
     * Verifies that the correct number of tasks are generated
     */
    it('should generate 2 daily tasks for user', async () => {
      testLogger.log('Testing task generation for user');

      // Arrange
      const userId = 'user_123';
      const userLevel = 0;
      const date = '2025-01-15';

      // Act
      const tasks = await generator.generateTasksForUser(userId, userLevel, date);

      // Assert
      expect(tasks).toBeDefined();
      expect(tasks.length).toBe(2);
      expect(Array.isArray(tasks)).toBe(true);

      // Verify no duplicate types
      const types = tasks.map((t) => t.type);
      const uniqueTypes = new Set(types);
      expect(uniqueTypes.size).toBe(types.length); // No duplicates

      testLogger.log('Task generation test completed', { taskCount: tasks.length });
    });

    /**
     * Test Case 2: Adapt difficulty based on user level
     *
     * Verifies that difficulty correctly maps to user level
     */
    it('should adapt task difficulty based on user level', async () => {
      testLogger.log('Testing difficulty adaptation');

      const testCases = [
        { level: 0, expectedDifficulty: TaskDifficulty.EASY },
        { level: 2, expectedDifficulty: TaskDifficulty.EASY },
        { level: 3, expectedDifficulty: TaskDifficulty.MEDIUM },
        { level: 5, expectedDifficulty: TaskDifficulty.MEDIUM },
        { level: 6, expectedDifficulty: TaskDifficulty.HARD },
        { level: 7, expectedDifficulty: TaskDifficulty.HARD },
      ];

      for (const { level, expectedDifficulty } of testCases) {
        const tasks = await generator.generateTasksForUser(`user_${level}`, level, '2025-01-15');

        tasks.forEach((task) => {
          expect(task.difficulty).toBe(expectedDifficulty);
        });
      }

      testLogger.log('Difficulty adaptation test completed');
    });

    /**
     * Test Case 3: Generated tasks contain complete content
     *
     * Verifies all required fields are present and valid
     */
    it('should generate tasks with complete content', async () => {
      testLogger.log('Testing task completeness');

      // Arrange
      const userId = 'complete_user';
      const userLevel = 3; // Medium difficulty
      const date = '2025-01-15';

      // Act
      const tasks = await generator.generateTasksForUser(userId, userLevel, date);

      // Assert - Check all required fields
      tasks.forEach((task) => {
        // Basic fields
        expect(task.id).toBeDefined();
        expect(task.type).toBeDefined();
        expect(task.title).toBeDefined();
        expect(task.description).toBeDefined();
        expect(task.difficulty).toBe(TaskDifficulty.MEDIUM);

        // Numeric fields
        expect(task.timeEstimate).toBeGreaterThan(0);
        expect(task.xpReward).toBeGreaterThan(0);

        // Rewards
        expect(task.attributeRewards).toBeDefined();
        expect(typeof task.attributeRewards).toBe('object');

        // Content
        expect(task.content).toBeDefined();
        expect(typeof task.content).toBe('object');

        // Grading criteria
        expect(task.gradingCriteria).toBeDefined();
        expect(task.gradingCriteria?.minLength).toBeGreaterThan(0);
      });

      testLogger.log('Task completeness test passed', { tasksChecked: tasks.length });
    });

    /**
     * Test Case 4: Task ID uniqueness
     *
     * Verifies that generated task IDs are unique
     */
    it('should generate unique task IDs', async () => {
      testLogger.log('Testing task ID uniqueness');

      const userId = 'unique_user';
      const date = '2025-01-15';

      // Generate multiple sets of tasks
      const allTasks: DailyTask[] = [];
      for (let i = 0; i < 5; i++) {
        const tasks = await generator.generateTasksForUser(userId, 0, date);
        allTasks.push(...tasks);
      }

      // Check all IDs are unique
      const ids = allTasks.map((t) => t.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length); // All IDs unique

      // Verify ID format: type_difficulty_date_random_timestamp
      allTasks.forEach((task) => {
        expect(task.id).toMatch(/^[a-z_]+_[a-z]+_\d{4}-\d{2}-\d{2}_[a-z0-9]+_\d+$/);
      });

      testLogger.log('Task ID uniqueness test completed', { totalIds: ids.length });
    });

    /**
     * Test Case 5: Weighted random type selection
     *
     * Verifies that task types follow weighted distribution
     */
    it('should select task types with weighted randomness', async () => {
      testLogger.log('Testing weighted type selection');

      const userId = 'weighted_user';
      const date = '2025-01-15';

      // Generate many tasks to check distribution
      const typeCounts: Record<string, number> = {};
      const iterations = 50; // 50 days × 2 tasks = 100 tasks

      for (let i = 0; i < iterations; i++) {
        const tasks = await generator.generateTasksForUser(userId, 0, `2025-01-${15 + i}`);

        tasks.forEach((task) => {
          typeCounts[task.type] = (typeCounts[task.type] || 0) + 1;
        });
      }

      // Verify all task types appear
      const totalTasks = iterations * 2;
      expect(Object.keys(typeCounts).length).toBeGreaterThanOrEqual(3); // At least 3 types

      // Verify no single type dominates everything (should be variety)
      Object.values(typeCounts).forEach((count) => {
        expect(count).toBeLessThan(totalTasks * 0.6); // No type > 60%
      });

      testLogger.log('Weighted type selection test completed', { distribution: typeCounts });
    });
  });

  describe('Content Generation - Expected Use Cases', () => {
    /**
     * Test Case 6: Morning Reading content generation
     *
     * Verifies Red Mansion text passages are correctly generated
     */
    it('should generate morning reading content for all difficulties', async () => {
      testLogger.log('Testing morning reading content generation');

      const userId = 'reading_user';
      const date = '2025-01-15';

      // Test all difficulty levels
      for (let level = 0; level <= 7; level++) {
        const tasks = await generator.generateTasksForUser(userId, level, date);

        // Find morning reading task (if exists)
        const morningTask = tasks.find((t) => t.type === DailyTaskType.MORNING_READING);

        if (morningTask && morningTask.content.textPassage) {
          const passage = morningTask.content.textPassage;

          // Verify passage structure
          expect(passage.chapter).toBeGreaterThan(0);
          expect(passage.text).toBeDefined();
          expect(passage.text.length).toBeGreaterThan(20); // Meaningful text
          expect(passage.question).toBeDefined();
          expect(passage.expectedKeywords).toBeDefined();
          expect(Array.isArray(passage.expectedKeywords)).toBe(true);

          testLogger.log(`Morning reading content verified for level ${level}`, {
            chapter: passage.chapter,
            textLength: passage.text.length,
          });
        }
      }

      testLogger.log('Morning reading content test completed');
    });

    /**
     * Test Case 7: Poetry content generation
     *
     * Verifies Red Mansion poetry is correctly generated
     */
    it('should generate poetry content with metadata', async () => {
      testLogger.log('Testing poetry content generation');

      const userId = 'poetry_user';
      const date = '2025-01-15';

      // Test all difficulty levels
      for (let level = 0; level <= 7; level++) {
        const tasks = await generator.generateTasksForUser(userId, level, date);

        const poetryTask = tasks.find((t) => t.type === DailyTaskType.POETRY);

        if (poetryTask && poetryTask.content.poem) {
          const poem = poetryTask.content.poem;

          // Verify poem structure
          expect(poem.id).toBeDefined();
          expect(poem.title).toBeDefined();
          expect(poem.author).toBeDefined();
          expect(poem.content).toBeDefined();
          expect(poem.content.length).toBeGreaterThan(10);
          expect(poem.difficulty).toBeGreaterThan(0);
          expect(poem.theme).toBeDefined();

          // Verify chapter reference (optional)
          if (poem.chapter) {
            expect(poem.chapter).toBeGreaterThan(0);
            expect(poem.chapter).toBeLessThanOrEqual(120); // Red Mansion has 120 chapters
          }

          testLogger.log(`Poetry content verified for level ${level}`, {
            title: poem.title,
            author: poem.author,
          });
        }
      }

      testLogger.log('Poetry content test completed');
    });

    /**
     * Test Case 8: Character Insight content generation
     *
     * Verifies character analysis prompts are appropriate
     */
    it('should generate character insight content with analysis prompts', async () => {
      testLogger.log('Testing character insight content generation');

      const userId = 'character_user';
      const date = '2025-01-15';

      // Test all difficulty levels
      for (let level = 0; level <= 7; level++) {
        const tasks = await generator.generateTasksForUser(userId, level, date);

        const characterTask = tasks.find((t) => t.type === DailyTaskType.CHARACTER_INSIGHT);

        if (characterTask && characterTask.content.character) {
          const character = characterTask.content.character;

          // Verify character prompt structure
          expect(character.characterId).toBeDefined();
          expect(character.characterName).toBeDefined();
          expect(character.analysisPrompts).toBeDefined();
          expect(Array.isArray(character.analysisPrompts)).toBe(true);
          expect(character.analysisPrompts.length).toBeGreaterThan(0);

          // Verify difficulty affects prompt count
          const difficulty = characterTask.difficulty;
          if (difficulty === TaskDifficulty.HARD) {
            expect(character.analysisPrompts.length).toBeGreaterThanOrEqual(3); // More questions for hard
          }

          testLogger.log(`Character insight verified for level ${level}`, {
            character: character.characterName,
            promptCount: character.analysisPrompts.length,
          });
        }
      }

      testLogger.log('Character insight content test completed');
    });

    /**
     * Test Case 9: Cultural Exploration content generation
     *
     * Verifies quiz questions are properly structured
     */
    it('should generate cultural exploration content with quiz questions', async () => {
      testLogger.log('Testing cultural exploration content generation');

      const userId = 'cultural_user';
      const date = '2025-01-15';

      // Test all difficulty levels
      for (let level = 0; level <= 7; level++) {
        const tasks = await generator.generateTasksForUser(userId, level, date);

        const culturalTask = tasks.find((t) => t.type === DailyTaskType.CULTURAL_EXPLORATION);

        if (culturalTask && culturalTask.content.culturalElement) {
          const element = culturalTask.content.culturalElement;

          // Verify cultural element structure
          expect(element.id).toBeDefined();
          expect(element.category).toBeDefined();
          expect(element.title).toBeDefined();
          expect(element.description).toBeDefined();
          expect(element.relatedChapters).toBeDefined();
          expect(Array.isArray(element.relatedChapters)).toBe(true);
          expect(element.questions).toBeDefined();
          expect(Array.isArray(element.questions)).toBe(true);
          expect(element.questions.length).toBeGreaterThan(0);

          // Verify question structure
          element.questions.forEach((q) => {
            expect(q.id).toBeDefined();
            expect(q.question).toBeDefined();
            expect(q.type).toMatch(/multiple_choice|true_false|short_answer/);
            expect(q.correctAnswer).toBeDefined();
          });

          testLogger.log(`Cultural exploration verified for level ${level}`, {
            category: element.category,
            questionCount: element.questions.length,
          });
        }
      }

      testLogger.log('Cultural exploration content test completed');
    });

    /**
     * Test Case 10: Commentary Decode content generation
     *
     * Verifies Zhi Yan Zhai commentary content
     */
    it('should generate commentary decode content with hints', async () => {
      testLogger.log('Testing commentary decode content generation');

      const userId = 'commentary_user';
      const date = '2025-01-15';

      // Test all difficulty levels
      for (let level = 0; level <= 7; level++) {
        const tasks = await generator.generateTasksForUser(userId, level, date);

        const commentaryTask = tasks.find((t) => t.type === DailyTaskType.COMMENTARY_DECODE);

        if (commentaryTask && commentaryTask.content.commentary) {
          const commentary = commentaryTask.content.commentary;

          // Verify commentary structure
          expect(commentary.id).toBeDefined();
          expect(commentary.originalText).toBeDefined();
          expect(commentary.commentaryText).toBeDefined();
          expect(commentary.chapter).toBeGreaterThan(0);
          expect(commentary.author).toBeDefined();

          // Verify it's Zhi Yan Zhai commentary
          expect(commentary.author).toContain('脂');

          // Hint is optional but should be provided
          if (commentary.hint) {
            expect(commentary.hint.length).toBeGreaterThan(10);
          }

          testLogger.log(`Commentary decode verified for level ${level}`, {
            chapter: commentary.chapter,
            author: commentary.author,
          });
        }
      }

      testLogger.log('Commentary decode content test completed');
    });
  });

  describe('Grading Criteria - Expected Use Cases', () => {
    /**
     * Test Case 11: Difficulty affects minimum length requirement
     *
     * Verifies that harder tasks require longer responses
     */
    it('should set minimum length based on difficulty', async () => {
      testLogger.log('Testing minimum length requirements');

      const userId = 'length_user';
      const date = '2025-01-15';

      const expectedMinLengths = {
        [TaskDifficulty.EASY]: 30,
        [TaskDifficulty.MEDIUM]: 50,
        [TaskDifficulty.HARD]: 100,
      };

      // Test each difficulty level
      for (let level = 0; level <= 7; level++) {
        const tasks = await generator.generateTasksForUser(userId, level, date);

        tasks.forEach((task) => {
          const expectedMin = expectedMinLengths[task.difficulty];

          expect(task.gradingCriteria?.minLength).toBe(expectedMin);
          expect(task.gradingCriteria?.maxLength).toBe(500); // Max is constant

          testLogger.log(`Verified length for ${task.difficulty}`, {
            minLength: task.gradingCriteria?.minLength,
          });
        });
      }

      testLogger.log('Minimum length test completed');
    });

    /**
     * Test Case 12: Each task type has unique rubric
     *
     * Verifies that different task types emphasize different criteria
     */
    it('should provide task-type-specific rubrics', async () => {
      testLogger.log('Testing task-specific rubrics');

      const userId = 'rubric_user';
      const date = '2025-01-15';

      // Generate many tasks to cover all types
      const tasks: DailyTask[] = [];
      for (let i = 0; i < 10; i++) {
        const generated = await generator.generateTasksForUser(userId, 3, `2025-01-${15 + i}`);
        tasks.push(...generated);
      }

      // Check each task type has rubric
      const typeRubrics: Record<string, any> = {};

      tasks.forEach((task) => {
        if (task.gradingCriteria?.rubric) {
          const rubric = task.gradingCriteria.rubric;

          // Verify rubric components sum to 100%
          const total =
            (rubric.accuracy || 0) +
            (rubric.depth || 0) +
            (rubric.insight || 0) +
            (rubric.completeness || 0);

          expect(total).toBe(100);

          // Store rubric for this type
          if (!typeRubrics[task.type]) {
            typeRubrics[task.type] = rubric;
          }
        }
      });

      // Verify we have rubrics for multiple types
      expect(Object.keys(typeRubrics).length).toBeGreaterThanOrEqual(2);

      testLogger.log('Task-specific rubrics test completed', {
        typesWithRubrics: Object.keys(typeRubrics).length,
      });
    });

    /**
     * Test Case 13: XP reward table completeness
     *
     * Verifies all task type × difficulty combinations have XP values
     */
    it('should have XP rewards for all type-difficulty combinations', async () => {
      testLogger.log('Testing XP reward table completeness');

      const userId = 'xp_user';
      const date = '2025-01-15';

      const xpRewards: Record<string, Record<string, number>> = {};

      // Generate tasks across all levels to cover all combinations
      for (let level = 0; level <= 7; level++) {
        const tasks = await generator.generateTasksForUser(userId, level, `2025-01-${15 + level}`);

        tasks.forEach((task) => {
          if (!xpRewards[task.type]) {
            xpRewards[task.type] = {};
          }
          xpRewards[task.type][task.difficulty] = task.xpReward;

          // Verify XP is in expected range (6-28)
          expect(task.xpReward).toBeGreaterThanOrEqual(6);
          expect(task.xpReward).toBeLessThanOrEqual(28);
        });
      }

      testLogger.log('XP reward table test completed', { rewards: xpRewards });
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    /**
     * Edge Case 1: Handle invalid user levels gracefully
     *
     * Verifies that extreme level values don't break generation
     */
    it('should handle invalid user levels gracefully', async () => {
      testLogger.log('Testing invalid user level handling');

      const userId = 'edge_user';
      const date = '2025-01-15';

      // Test negative level → should default to EASY
      const tasksNegative = await generator.generateTasksForUser(userId, -5, date);
      expect(tasksNegative.length).toBe(2);
      tasksNegative.forEach((task) => {
        expect(task.difficulty).toBe(TaskDifficulty.EASY);
      });

      // Test extremely high level → should cap at HARD
      const tasksHigh = await generator.generateTasksForUser(userId, 999, date);
      expect(tasksHigh.length).toBe(2);
      tasksHigh.forEach((task) => {
        expect(task.difficulty).toBe(TaskDifficulty.HARD);
      });

      testLogger.log('Invalid user level handling test completed');
    });

    /**
     * Edge Case 2: Task type de-duplication
     *
     * Verifies that same task type is not selected twice in same day
     */
    it('should prevent duplicate task types in same day', async () => {
      testLogger.log('Testing task type de-duplication');

      const userId = 'dedup_user';
      const date = '2025-01-15';

      // Generate many task sets
      for (let i = 0; i < 20; i++) {
        const tasks = await generator.generateTasksForUser(userId, 3, `2025-01-${15 + i}`);

        // Check no duplicates
        const types = tasks.map((t) => t.type);
        const uniqueTypes = new Set(types);

        expect(uniqueTypes.size).toBe(types.length); // All types unique
        expect(types.length).toBe(2); // 2 tasks per day
      }

      testLogger.log('Task type de-duplication test completed');
    });
  });

  /**
   * Bug Fix #2: Attribute Reward Names Standardization
   *
   * Tests verify that attribute rewards use correct standardized names
   * matching the AttributePoints interface defined in user-level.ts
   *
   * Bug Description: Attribute rewards used incorrect English names
   * (literaryTalent, aestheticSense, culturalInsight, socialAwareness)
   * that didn't match the AttributePoints interface
   *
   * Fix: Updated ATTRIBUTE_REWARD_TABLE in task-generator.ts to use:
   * - poetrySkill (instead of literaryTalent/aestheticSense)
   * - culturalKnowledge (instead of culturalInsight)
   * - analyticalThinking (unchanged)
   * - socialInfluence (instead of socialAwareness)
   * - learningPersistence (unchanged)
   */
  describe('Bug Fix #2: Attribute Reward Names Standardization', () => {
    /**
     * CRITICAL BUG FIX TEST:
     * Verifies that all generated tasks use correct attribute names
     */
    it('should use standardized attribute names matching AttributePoints interface', async () => {
      testLogger.log('Testing attribute name standardization (Bug Fix #2)');

      const userId = 'attr_bugfix_user';
      const date = '2025-01-15';

      // Valid attribute names from user-level.ts
      const validAttributeNames = [
        'poetrySkill',
        'culturalKnowledge',
        'analyticalThinking',
        'socialInfluence',
        'learningPersistence',
      ];

      // Invalid OLD attribute names that should NOT appear
      const invalidAttributeNames = [
        'literaryTalent',
        'aestheticSense',
        'culturalInsight',
        'socialAwareness',
      ];

      // Generate many tasks to cover all types
      const allTasks: DailyTask[] = [];
      for (let level = 0; level <= 7; level++) {
        const tasks = await generator.generateTasksForUser(userId, level, `2025-01-${15 + level}`);
        allTasks.push(...tasks);
      }

      // Verify all tasks use valid attribute names
      allTasks.forEach((task) => {
        const attributeKeys = Object.keys(task.attributeRewards);

        attributeKeys.forEach((attrName) => {
          // CRITICAL: Attribute name MUST be in valid list
          expect(validAttributeNames).toContain(attrName);

          // CRITICAL: Attribute name MUST NOT be in invalid list
          expect(invalidAttributeNames).not.toContain(attrName);
        });

        testLogger.log(`Task ${task.id} attributes verified`, {
          taskType: task.type,
          attributes: attributeKeys,
        });
      });

      testLogger.log('Attribute name standardization verified for all tasks');
    });

    /**
     * Test that MORNING_READING uses correct attributes
     * Should give: analyticalThinking + culturalKnowledge
     * NOT: literaryTalent + culturalInsight (old incorrect names)
     */
    it('should assign correct attributes for MORNING_READING tasks', async () => {
      testLogger.log('Testing MORNING_READING attribute rewards');

      const userId = 'morning_attr_user';
      const date = '2025-01-15';

      // Generate many tasks to ensure we get MORNING_READING
      const allTasks: DailyTask[] = [];
      for (let i = 0; i < 10; i++) {
        const tasks = await generator.generateTasksForUser(userId, 0, `2025-01-${15 + i}`);
        allTasks.push(...tasks);
      }

      const morningTasks = allTasks.filter(t => t.type === DailyTaskType.MORNING_READING);
      expect(morningTasks.length).toBeGreaterThan(0);

      morningTasks.forEach((task) => {
        const attrKeys = Object.keys(task.attributeRewards);

        // Should have analyticalThinking and/or culturalKnowledge
        const hasValidAttrs = attrKeys.some(k =>
          k === 'analyticalThinking' || k === 'culturalKnowledge'
        );
        expect(hasValidAttrs).toBe(true);

        // Should NOT have old incorrect names
        expect(attrKeys).not.toContain('literaryTalent');
        expect(attrKeys).not.toContain('culturalInsight');

        testLogger.log('MORNING_READING attributes correct', { attributes: attrKeys });
      });
    });

    /**
     * Test that POETRY uses correct attributes
     * Should give: poetrySkill + culturalKnowledge
     * NOT: literaryTalent + aestheticSense (old incorrect names)
     */
    it('should assign correct attributes for POETRY tasks', async () => {
      testLogger.log('Testing POETRY attribute rewards');

      const userId = 'poetry_attr_user';
      const userLevel = 3;

      // Generate many tasks to ensure we get POETRY
      // Note: Each call generates 2 tasks (from config), so 50 iterations = 100 tasks
      // With 20% weight, we expect ~20 POETRY tasks
      const allTasks: DailyTask[] = [];
      for (let i = 0; i < 50; i++) {
        const tasks = await generator.generateTasksForUser(userId, userLevel, `2025-01-${15 + Math.floor(i / 3)}`);
        allTasks.push(...tasks);
      }

      const poetryTasks = allTasks.filter(t => t.type === DailyTaskType.POETRY);
      expect(poetryTasks.length).toBeGreaterThan(0);

      poetryTasks.forEach((task) => {
        const attrKeys = Object.keys(task.attributeRewards);

        // Should have poetrySkill and/or culturalKnowledge
        const hasPoetrySkill = attrKeys.includes('poetrySkill');
        const hasCulturalKnowledge = attrKeys.includes('culturalKnowledge');
        expect(hasPoetrySkill || hasCulturalKnowledge).toBe(true);

        // Should NOT have old incorrect names
        expect(attrKeys).not.toContain('literaryTalent');
        expect(attrKeys).not.toContain('aestheticSense');

        testLogger.log('POETRY attributes correct', { attributes: attrKeys });
      });
    });

    /**
     * Test that CHARACTER_INSIGHT uses correct attributes
     * Should give: analyticalThinking + socialInfluence
     * NOT: socialAwareness (old incorrect name)
     */
    it('should assign correct attributes for CHARACTER_INSIGHT tasks', async () => {
      testLogger.log('Testing CHARACTER_INSIGHT attribute rewards');

      const userId = 'character_attr_user';
      const date = '2025-01-15';

      // Generate many tasks to ensure we get CHARACTER_INSIGHT
      const allTasks: DailyTask[] = [];
      for (let i = 0; i < 10; i++) {
        const tasks = await generator.generateTasksForUser(userId, 6, `2025-01-${15 + i}`);
        allTasks.push(...tasks);
      }

      const characterTasks = allTasks.filter(t => t.type === DailyTaskType.CHARACTER_INSIGHT);
      expect(characterTasks.length).toBeGreaterThan(0);

      characterTasks.forEach((task) => {
        const attrKeys = Object.keys(task.attributeRewards);

        // Should have analyticalThinking and/or socialInfluence
        const hasValidAttrs = attrKeys.some(k =>
          k === 'analyticalThinking' || k === 'socialInfluence'
        );
        expect(hasValidAttrs).toBe(true);

        // Should NOT have old incorrect name
        expect(attrKeys).not.toContain('socialAwareness');

        testLogger.log('CHARACTER_INSIGHT attributes correct', { attributes: attrKeys });
      });
    });

    /**
     * Test that CULTURAL_EXPLORATION uses correct attributes
     * Should give: culturalKnowledge
     * NOT: culturalInsight (old incorrect name)
     */
    it('should assign correct attributes for CULTURAL_EXPLORATION tasks', async () => {
      testLogger.log('Testing CULTURAL_EXPLORATION attribute rewards');

      const userId = 'cultural_attr_user';
      const date = '2025-01-15';

      // Generate many tasks to ensure we get CULTURAL_EXPLORATION
      const allTasks: DailyTask[] = [];
      for (let i = 0; i < 10; i++) {
        const tasks = await generator.generateTasksForUser(userId, 3, `2025-01-${15 + i}`);
        allTasks.push(...tasks);
      }

      const culturalTasks = allTasks.filter(t => t.type === DailyTaskType.CULTURAL_EXPLORATION);
      expect(culturalTasks.length).toBeGreaterThan(0);

      culturalTasks.forEach((task) => {
        const attrKeys = Object.keys(task.attributeRewards);

        // Should have culturalKnowledge
        expect(attrKeys).toContain('culturalKnowledge');

        // Should NOT have old incorrect name
        expect(attrKeys).not.toContain('culturalInsight');

        testLogger.log('CULTURAL_EXPLORATION attributes correct', { attributes: attrKeys });
      });
    });

    /**
     * Test that COMMENTARY_DECODE uses correct attributes
     * Should give: analyticalThinking + culturalKnowledge
     * NOT: culturalInsight (old incorrect name)
     */
    it('should assign correct attributes for COMMENTARY_DECODE tasks', async () => {
      testLogger.log('Testing COMMENTARY_DECODE attribute rewards');

      const userId = 'commentary_attr_user';
      const userLevel = 6;

      // Generate many tasks to ensure we get COMMENTARY_DECODE
      // Note: Each call generates 2 tasks (from config), so 50 iterations = 100 tasks
      // With 15% weight (lowest), we expect ~15 COMMENTARY_DECODE tasks
      const allTasks: DailyTask[] = [];
      for (let i = 0; i < 50; i++) {
        const tasks = await generator.generateTasksForUser(userId, userLevel, `2025-01-${15 + Math.floor(i / 3)}`);
        allTasks.push(...tasks);
      }

      const commentaryTasks = allTasks.filter(t => t.type === DailyTaskType.COMMENTARY_DECODE);
      expect(commentaryTasks.length).toBeGreaterThan(0);

      commentaryTasks.forEach((task) => {
        const attrKeys = Object.keys(task.attributeRewards);

        // Should have analyticalThinking and/or culturalKnowledge
        const hasValidAttrs = attrKeys.some(k =>
          k === 'analyticalThinking' || k === 'culturalKnowledge'
        );
        expect(hasValidAttrs).toBe(true);

        // Should NOT have old incorrect name
        expect(attrKeys).not.toContain('culturalInsight');

        testLogger.log('COMMENTARY_DECODE attributes correct', { attributes: attrKeys });
      });
    });
  });
});
