/**
 * @fileOverview TaskModal Component Test Suite
 *
 * Test coverage for Bug Fix #3: TaskModal content display issues
 *
 * Tests verify that all task types correctly display their content with proper
 * property names matching the type definitions.
 *
 * Bug Description: First task (and some others) had no content displayed
 * due to incorrect property name references in the UI components.
 *
 * Fixes Applied:
 * - CULTURAL_EXPLORATION: culturalKnowledge → culturalElement (lines 242-284)
 * - CHARACTER_INSIGHT: character.name → character.characterName (line 195)
 * - COMMENTARY_DECODE: commentary.text → commentary.commentaryText (line 311)
 * - COMMENTARY_DECODE: Added originalText display (lines 289-304)
 *
 * Test Categories:
 * 1. MORNING_READING Content Display Tests
 * 2. POETRY Content Display Tests
 * 3. CHARACTER_INSIGHT Content Display Tests (Bug Fix)
 * 4. CULTURAL_EXPLORATION Content Display Tests (Bug Fix)
 * 5. COMMENTARY_DECODE Content Display Tests (Bug Fix)
 * 6. User Interaction Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskModal } from '@/components/daily-tasks/TaskModal';
import { DailyTask, DailyTaskType, TaskDifficulty } from '@/lib/types/daily-task';

describe('TaskModal - Bug Fix #3: Content Display', () => {
  let testLogger: any;
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    testLogger = {
      logs: [],
      log: (message: string, data?: any) => {
        testLogger.logs.push({ message, data, timestamp: new Date().toISOString() });
      },
    };
  });

  /**
   * Test Category 1: MORNING_READING Content Display
   *
   * Verifies that morning reading tasks display text passages correctly
   */
  describe('MORNING_READING Content Display', () => {
    const morningReadingTask: DailyTask = {
      id: 'morning-1',
      type: DailyTaskType.MORNING_READING,
      title: '晨讀時光',
      description: '閱讀紅樓夢段落並回答問題',
      difficulty: TaskDifficulty.EASY,
      timeEstimate: 5,
      xpReward: 10,
      attributeRewards: { analyticalThinking: 1, culturalKnowledge: 1 },
      content: {
        textPassage: {
          chapter: 3,
          text: '黛玉方進入房時，只見兩個人攙著一位鬢髮如銀的老母迎上來...',
          question: '這段文字描寫的是誰？她給你什麼樣的第一印象？',
          expectedKeywords: ['賈母', '老太太', '慈祥'],
        },
      },
      gradingCriteria: { minLength: 30, maxLength: 500 },
    };

    it('should display text passage content correctly', () => {
      testLogger.log('Testing MORNING_READING passage display');

      render(
        <TaskModal
          task={morningReadingTask}
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Verify passage text is displayed
      expect(screen.getByText(/黛玉方進入房時/)).toBeInTheDocument();

      // Verify chapter number is displayed
      expect(screen.getByText(/第3回/)).toBeInTheDocument();

      // Verify question is displayed
      expect(screen.getByText(/這段文字描寫的是誰/)).toBeInTheDocument();

      testLogger.log('MORNING_READING passage verified');
    });

    it('should display answer input for morning reading', () => {
      testLogger.log('Testing MORNING_READING answer input');

      render(
        <TaskModal
          task={morningReadingTask}
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Verify answer textarea is present
      const textarea = screen.getByPlaceholderText(/請寫下你的理解和見解/);
      expect(textarea).toBeInTheDocument();

      testLogger.log('MORNING_READING answer input verified');
    });
  });

  /**
   * Test Category 2: POETRY Content Display
   *
   * Verifies that poetry tasks display poems correctly
   */
  describe('POETRY Content Display', () => {
    const poetryTask: DailyTask = {
      id: 'poetry-1',
      type: DailyTaskType.POETRY,
      title: '詩詞韻律',
      description: '默寫紅樓詩詞',
      difficulty: TaskDifficulty.MEDIUM,
      timeEstimate: 3,
      xpReward: 12,
      attributeRewards: { poetrySkill: 2, culturalKnowledge: 1 },
      content: {
        poem: {
          id: 'poem-1',
          title: '葬花吟',
          author: '林黛玉',
          content: '花謝花飛花滿天，紅消香斷有誰憐？\n遊絲軟繫飄春榭，落絮輕沾撲繡簾。',
          chapter: 27,
          difficulty: 3,
          theme: '哀愁',
        },
      },
      gradingCriteria: { minLength: 30, maxLength: 500 },
    };

    it('should display poem content correctly', () => {
      testLogger.log('Testing POETRY content display');

      render(
        <TaskModal
          task={poetryTask}
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Verify poem title
      expect(screen.getByText(/葬花吟/)).toBeInTheDocument();

      // Verify author
      expect(screen.getByText(/林黛玉/)).toBeInTheDocument();

      // Verify poem content
      expect(screen.getByText(/花謝花飛花滿天/)).toBeInTheDocument();

      testLogger.log('POETRY content verified');
    });

    it('should display recitation input for poetry', () => {
      testLogger.log('Testing POETRY recitation input');

      render(
        <TaskModal
          task={poetryTask}
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Verify recitation textarea is present
      const textarea = screen.getByPlaceholderText(/請在此默寫詩詞原文/);
      expect(textarea).toBeInTheDocument();

      testLogger.log('POETRY recitation input verified');
    });
  });

  /**
   * Test Category 3: CHARACTER_INSIGHT Content Display (Bug Fix)
   *
   * Verifies Bug Fix: character.name → character.characterName
   */
  describe('CHARACTER_INSIGHT Content Display - Bug Fix', () => {
    const characterTask: DailyTask = {
      id: 'character-1',
      type: DailyTaskType.CHARACTER_INSIGHT,
      title: '角色洞察',
      description: '分析角色性格與行為',
      difficulty: TaskDifficulty.HARD,
      timeEstimate: 10,
      xpReward: 20,
      attributeRewards: { analyticalThinking: 2, socialInfluence: 1 },
      content: {
        character: {
          characterId: 'char-001',
          characterName: '王熙鳳', // Bug Fix: Using characterName instead of name
          context: '第六回，劉姥姥一進榮國府，王熙鳳初次登場',
          chapter: 6,
          analysisPrompts: [
            '王熙鳳的出場方式有什麼特別之處？',
            '從她的言行舉止可以看出什麼性格特點？',
            '她在賈府中扮演什麼角色？',
          ],
        },
      },
      gradingCriteria: { minLength: 100, maxLength: 500 },
    };

    /**
     * CRITICAL BUG FIX TEST:
     * This test verifies that character.characterName is correctly displayed
     * Previously used character.name which was undefined
     */
    it('should display character name correctly (Bug Fix)', () => {
      testLogger.log('Testing CHARACTER_INSIGHT characterName bug fix');

      render(
        <TaskModal
          task={characterTask}
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // CRITICAL: Verify characterName is displayed (not undefined)
      expect(screen.getByText(/王熙鳳/)).toBeInTheDocument();

      // Verify it appears in the header
      expect(screen.getByText(/角色分析 - 王熙鳳/)).toBeInTheDocument();

      testLogger.log('CHARACTER_INSIGHT characterName bug fix verified');
    });

    it('should display character context correctly', () => {
      testLogger.log('Testing CHARACTER_INSIGHT context display');

      render(
        <TaskModal
          task={characterTask}
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Verify context is displayed
      expect(screen.getByText(/劉姥姥一進榮國府/)).toBeInTheDocument();

      // Verify chapter is displayed
      expect(screen.getByText(/第 6 回/)).toBeInTheDocument();

      testLogger.log('CHARACTER_INSIGHT context verified');
    });

    it('should display analysis prompts correctly', () => {
      testLogger.log('Testing CHARACTER_INSIGHT analysis prompts');

      render(
        <TaskModal
          task={characterTask}
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Verify all prompts are displayed
      expect(screen.getByText(/王熙鳳的出場方式有什麼特別之處/)).toBeInTheDocument();
      expect(screen.getByText(/從她的言行舉止可以看出什麼性格特點/)).toBeInTheDocument();
      expect(screen.getByText(/她在賈府中扮演什麼角色/)).toBeInTheDocument();

      testLogger.log('CHARACTER_INSIGHT analysis prompts verified');
    });
  });

  /**
   * Test Category 4: CULTURAL_EXPLORATION Content Display (Bug Fix)
   *
   * Verifies Bug Fix: culturalKnowledge → culturalElement
   */
  describe('CULTURAL_EXPLORATION Content Display - Bug Fix', () => {
    const culturalTask: DailyTask = {
      id: 'cultural-1',
      type: DailyTaskType.CULTURAL_EXPLORATION,
      title: '文化探索',
      description: '了解清代文化知識',
      difficulty: TaskDifficulty.MEDIUM,
      timeEstimate: 8,
      xpReward: 15,
      attributeRewards: { culturalKnowledge: 3 },
      content: {
        culturalElement: { // Bug Fix: Using culturalElement instead of culturalKnowledge
          id: 'culture-001',
          category: '服飾文化',
          title: '鳳冠霞帔',
          description: '鳳冠霞帔是古代貴族女子的禮服，特別用於婚禮等重要場合。鳳冠以金銀絲製成，綴以珍珠寶石，形似鳳凰。',
          relatedChapters: [3, 6],
          questions: [
            {
              id: 'q1',
              question: '鳳冠霞帔主要用於什麼場合？',
              type: 'short_answer',
              correctAnswer: '婚禮等重要場合',
            },
          ],
        },
      },
      gradingCriteria: { minLength: 50, maxLength: 500 },
    };

    /**
     * CRITICAL BUG FIX TEST:
     * This test verifies that culturalElement is correctly accessed
     * Previously used culturalKnowledge which was undefined
     */
    it('should display cultural element correctly (Bug Fix)', () => {
      testLogger.log('Testing CULTURAL_EXPLORATION culturalElement bug fix');

      render(
        <TaskModal
          task={culturalTask}
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // CRITICAL: Verify culturalElement content is displayed (not undefined)
      expect(screen.getByText(/鳳冠霞帔/)).toBeInTheDocument();

      // Verify category is displayed
      expect(screen.getByText(/文化知識 - 服飾文化/)).toBeInTheDocument();

      testLogger.log('CULTURAL_EXPLORATION culturalElement bug fix verified');
    });

    it('should display cultural element description correctly', () => {
      testLogger.log('Testing CULTURAL_EXPLORATION description display');

      render(
        <TaskModal
          task={culturalTask}
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Verify description is displayed
      expect(screen.getByText(/鳳冠以金銀絲製成/)).toBeInTheDocument();

      testLogger.log('CULTURAL_EXPLORATION description verified');
    });

    it('should display quiz question correctly', () => {
      testLogger.log('Testing CULTURAL_EXPLORATION quiz question display');

      render(
        <TaskModal
          task={culturalTask}
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Verify question is displayed
      expect(screen.getByText(/鳳冠霞帔主要用於什麼場合/)).toBeInTheDocument();

      testLogger.log('CULTURAL_EXPLORATION quiz question verified');
    });

    it('should display answer input for cultural exploration', () => {
      testLogger.log('Testing CULTURAL_EXPLORATION answer input');

      render(
        <TaskModal
          task={culturalTask}
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Verify answer textarea is present
      const textarea = screen.getByPlaceholderText(/請寫下你的答案/);
      expect(textarea).toBeInTheDocument();

      testLogger.log('CULTURAL_EXPLORATION answer input verified');
    });
  });

  /**
   * Test Category 5: COMMENTARY_DECODE Content Display (Bug Fix)
   *
   * Verifies Bug Fixes:
   * 1. commentary.text → commentary.commentaryText
   * 2. Added commentary.originalText display
   */
  describe('COMMENTARY_DECODE Content Display - Bug Fix', () => {
    const commentaryTask: DailyTask = {
      id: 'commentary-1',
      type: DailyTaskType.COMMENTARY_DECODE,
      title: '批語解讀',
      description: '理解脂硯齋批語的深層含義',
      difficulty: TaskDifficulty.HARD,
      timeEstimate: 12,
      xpReward: 22,
      attributeRewards: { analyticalThinking: 2, culturalKnowledge: 2 },
      content: {
        commentary: {
          id: 'comm-001',
          originalText: '黛玉葬花，實乃自傷身世。', // Bug Fix: Added originalText display
          commentaryText: '此處伏線千里，後文黛玉之死正應此處。', // Bug Fix: Using commentaryText not text
          chapter: 27,
          author: '脂硯齋',
          hint: '注意「伏線」二字，暗示後文發展',
        },
      },
      gradingCriteria: { minLength: 100, maxLength: 500 },
    };

    /**
     * CRITICAL BUG FIX TEST:
     * This test verifies that commentary.originalText is displayed
     * Previously this was missing entirely
     */
    it('should display original text correctly (Bug Fix)', () => {
      testLogger.log('Testing COMMENTARY_DECODE originalText bug fix');

      render(
        <TaskModal
          task={commentaryTask}
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // CRITICAL: Verify originalText is displayed (was missing before)
      expect(screen.getByText(/黛玉葬花，實乃自傷身世/)).toBeInTheDocument();

      // Verify it has proper label
      expect(screen.getByText(/📜 原文/)).toBeInTheDocument();

      testLogger.log('COMMENTARY_DECODE originalText bug fix verified');
    });

    /**
     * CRITICAL BUG FIX TEST:
     * This test verifies that commentary.commentaryText is displayed
     * Previously used commentary.text which was undefined
     */
    it('should display commentary text correctly (Bug Fix)', () => {
      testLogger.log('Testing COMMENTARY_DECODE commentaryText bug fix');

      render(
        <TaskModal
          task={commentaryTask}
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // CRITICAL: Verify commentaryText is displayed (not undefined)
      expect(screen.getByText(/此處伏線千里/)).toBeInTheDocument();

      testLogger.log('COMMENTARY_DECODE commentaryText bug fix verified');
    });

    it('should display chapter number correctly', () => {
      testLogger.log('Testing COMMENTARY_DECODE chapter display');

      render(
        <TaskModal
          task={commentaryTask}
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Verify chapter is displayed
      expect(screen.getByText(/第 27 回/)).toBeInTheDocument();

      testLogger.log('COMMENTARY_DECODE chapter verified');
    });

    it('should display author correctly', () => {
      testLogger.log('Testing COMMENTARY_DECODE author display');

      render(
        <TaskModal
          task={commentaryTask}
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Verify author is displayed in the label
      expect(screen.getByText(/脂硯齋批語/)).toBeInTheDocument();

      testLogger.log('COMMENTARY_DECODE author verified');
    });

    it('should display hint when provided', () => {
      testLogger.log('Testing COMMENTARY_DECODE hint display');

      render(
        <TaskModal
          task={commentaryTask}
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Verify hint is displayed
      expect(screen.getByText(/注意「伏線」二字/)).toBeInTheDocument();

      testLogger.log('COMMENTARY_DECODE hint verified');
    });
  });

  /**
   * Test Category 6: User Interaction Tests
   *
   * Verifies that user can interact with the modal correctly
   */
  describe('User Interaction', () => {
    const simpleTask: DailyTask = {
      id: 'test-1',
      type: DailyTaskType.MORNING_READING,
      title: '測試任務',
      description: '測試用任務',
      difficulty: TaskDifficulty.EASY,
      timeEstimate: 5,
      xpReward: 10,
      attributeRewards: {},
      content: {
        textPassage: {
          chapter: 1,
          text: '測試文本',
          question: '測試問題？',
          expectedKeywords: [],
        },
      },
      gradingCriteria: { minLength: 30, maxLength: 500 },
    };

    it('should update word count as user types', async () => {
      testLogger.log('Testing word count update');

      const user = userEvent.setup();

      render(
        <TaskModal
          task={simpleTask}
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const textarea = screen.getByPlaceholderText(/請寫下你的理解和見解/);

      // Type some text
      await user.type(textarea, '這是我的答案，包含了詳細的分析和理解。');

      // Verify word count is displayed
      expect(screen.getByText(/已輸入 \d+ 字/)).toBeInTheDocument();

      testLogger.log('Word count update verified');
    });

    it('should show validation error for empty response', async () => {
      testLogger.log('Testing empty response validation');

      const user = userEvent.setup();

      render(
        <TaskModal
          task={simpleTask}
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Try to submit without typing
      const submitButton = screen.getByText(/提交答案/);
      await user.click(submitButton);

      // Verify validation error is shown
      await waitFor(() => {
        expect(screen.getByText(/請輸入你的答案/)).toBeInTheDocument();
      });

      testLogger.log('Empty response validation verified');
    });

    it('should show validation error for response too short', async () => {
      testLogger.log('Testing short response validation');

      const user = userEvent.setup();

      render(
        <TaskModal
          task={simpleTask}
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const textarea = screen.getByPlaceholderText(/請寫下你的理解和見解/);

      // Type a very short response
      await user.type(textarea, '太短了');

      const submitButton = screen.getByText(/提交答案/);
      await user.click(submitButton);

      // Verify validation error is shown
      await waitFor(() => {
        expect(screen.getByText(/答案至少需要 30 個字/)).toBeInTheDocument();
      });

      testLogger.log('Short response validation verified');
    });

    it('should call onSubmit with valid response', async () => {
      testLogger.log('Testing successful submission');

      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);

      render(
        <TaskModal
          task={simpleTask}
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const textarea = screen.getByPlaceholderText(/請寫下你的理解和見解/);

      // Type a valid response (>30 characters)
      const validResponse = '這是一個完整的答案，包含了對文本的理解和分析，符合最低字數要求。';
      await user.type(textarea, validResponse);

      const submitButton = screen.getByText(/提交答案/);
      await user.click(submitButton);

      // Verify onSubmit was called with correct parameters
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(simpleTask.id, validResponse);
      });

      testLogger.log('Successful submission verified');
    });

    it('should close modal when cancel is clicked', async () => {
      testLogger.log('Testing modal cancel');

      const user = userEvent.setup();

      render(
        <TaskModal
          task={simpleTask}
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const cancelButton = screen.getByText(/取消/);
      await user.click(cancelButton);

      // Verify onClose was called
      expect(mockOnClose).toHaveBeenCalled();

      testLogger.log('Modal cancel verified');
    });
  });
});
