/**
 * @fileOverview TaskResultModal Component Test Suite
 *
 * Test coverage for Bug Fix #1: TaskResultModal overflow issue
 *
 * Tests verify that the modal correctly displays within viewport bounds
 * and includes proper scrolling when content exceeds the viewport height.
 *
 * Bug Description: When completing tasks, the result window was being cut off
 * Screenshot: temp/everyDayTask_bug01.jpg
 *
 * Fix: Added max-h-[90vh] overflow-y-auto to DialogContent (line 155)
 *
 * Test Categories:
 * 1. Modal Display and Layout Tests
 * 2. Content Overflow Handling Tests
 * 3. Responsive Behavior Tests
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { TaskResultModal } from '@/components/daily-tasks/TaskResultModal';
import { TaskCompletionResult } from '@/lib/types/daily-task';

// Mock the LevelUpModal component
jest.mock('@/components/gamification', () => ({
  LevelUpModal: ({ open, onClose, fromLevel, toLevel }: any) =>
    open ? (
      <div data-testid="level-up-modal">
        Level Up: {fromLevel} → {toLevel}
      </div>
    ) : null,
}));

describe('TaskResultModal - Bug Fix #1: Overflow Prevention', () => {
  let testLogger: any;

  beforeEach(() => {
    testLogger = {
      logs: [],
      log: (message: string, data?: any) => {
        testLogger.logs.push({ message, data, timestamp: new Date().toISOString() });
      },
    };
  });

  /**
   * Test Category 1: Modal Display and Layout Tests
   *
   * Verifies that the modal displays correctly with proper viewport constraints
   */
  describe('Modal Display and Layout', () => {
    /**
     * Test Case 1: Modal should render with viewport height constraints
     *
     * This is the core fix for the overflow bug - verifying max-h-[90vh] is applied
     */
    it('should render modal with max-height constraint to prevent overflow', () => {
      testLogger.log('Testing modal viewport height constraint');

      const mockResult: TaskCompletionResult = {
        success: true,
        taskId: 'test-task-1',
        score: 85,
        feedback: '表現優秀！你的理解深入且準確。',
        xpAwarded: 15,
        attributeGains: {
          poetrySkill: 2,
          culturalKnowledge: 1,
        },
        newStreak: 5,
        streakBonus: 5,
        isStreakMilestone: false,
        leveledUp: false,
      };

      const { container } = render(
        <TaskResultModal
          result={mockResult}
          open={true}
          onClose={() => {}}
        />
      );

      // Find the DialogContent element
      const dialogContent = container.querySelector('[role="dialog"]');
      expect(dialogContent).toBeInTheDocument();

      // Verify the element has max-height class
      const hasMaxHeight = container.querySelector('.max-h-\\[90vh\\]');
      expect(hasMaxHeight).toBeInTheDocument();

      testLogger.log('Modal viewport constraint verified', {
        hasMaxHeight: !!hasMaxHeight
      });
    });

    /**
     * Test Case 2: Modal should have scroll capability
     *
     * Verifies overflow-y-auto is applied for scrolling long content
     */
    it('should have vertical scrolling enabled for overflow content', () => {
      testLogger.log('Testing modal scroll capability');

      const mockResult: TaskCompletionResult = {
        success: true,
        taskId: 'test-task-2',
        score: 92,
        feedback: '非常棒！'.repeat(50), // Long feedback to test scrolling
        xpAwarded: 20,
        attributeGains: {
          poetrySkill: 3,
          culturalKnowledge: 2,
          analyticalThinking: 1,
        },
        newStreak: 10,
        streakBonus: 10,
        isStreakMilestone: true,
        leveledUp: false,
      };

      const { container } = render(
        <TaskResultModal
          result={mockResult}
          open={true}
          onClose={() => {}}
        />
      );

      // Verify overflow-y-auto class is present
      const hasOverflowScroll = container.querySelector('.overflow-y-auto');
      expect(hasOverflowScroll).toBeInTheDocument();

      testLogger.log('Modal scroll capability verified');
    });

    /**
     * Test Case 3: Modal should display all content sections
     *
     * Verifies all result information is rendered even with overflow constraints
     */
    it('should display all result sections within scrollable area', () => {
      testLogger.log('Testing complete result display');

      const mockResult: TaskCompletionResult = {
        success: true,
        taskId: 'test-task-3',
        score: 78,
        feedback: '回答正確，但可以更深入探討細節。建議多關注文本中的隱喻與象徵。',
        xpAwarded: 12,
        attributeGains: {
          poetrySkill: 1,
          culturalKnowledge: 1,
          analyticalThinking: 2,
        },
        newStreak: 3,
        streakBonus: 3,
        isStreakMilestone: false,
        leveledUp: false,
      };

      render(
        <TaskResultModal
          result={mockResult}
          open={true}
          onClose={() => {}}
        />
      );

      // Verify all sections are present
      expect(screen.getByText('🎉 任務完成！')).toBeInTheDocument();
      expect(screen.getByText(/78/)).toBeInTheDocument(); // Score
      expect(screen.getByText(/AI 評語/)).toBeInTheDocument();
      expect(screen.getByText(/獲得獎勵/)).toBeInTheDocument();
      expect(screen.getByText(/\+12/)).toBeInTheDocument(); // XP

      testLogger.log('All result sections verified');
    });
  });

  /**
   * Test Category 2: Content Overflow Handling Tests
   *
   * Tests various content scenarios to ensure overflow is handled correctly
   */
  describe('Content Overflow Handling', () => {
    /**
     * Test Case 4: Handle long feedback text
     *
     * Verifies that very long AI feedback doesn't break the layout
     */
    it('should handle very long feedback text without breaking layout', () => {
      testLogger.log('Testing long feedback handling');

      const longFeedback = `
你的回答展現了深厚的文學素養和敏銳的觀察力。首先，你準確地捕捉了原文的主旨，
並能夠結合具體的文本細節進行分析。其次，你對人物性格的理解相當到位，不僅看到
表面的行為，更能洞察內心的動機。第三，你的論述結構清晰，邏輯嚴密，使用的例證
恰當且具有說服力。建議在未來的分析中，可以更多地關注文本的象徵意義和隱喻手法，
這將使你的理解更加深入。同時，也可以嘗試將作品放在更廣闊的文化背景中進行解讀，
這樣能夠獲得更豐富的視角。總體來說，這是一份相當優秀的作業，繼續保持！
      `.trim();

      const mockResult: TaskCompletionResult = {
        success: true,
        taskId: 'test-task-long',
        score: 95,
        feedback: longFeedback,
        xpAwarded: 25,
        attributeGains: {
          poetrySkill: 3,
          culturalKnowledge: 3,
          analyticalThinking: 3,
          socialInfluence: 1,
        },
        newStreak: 7,
        streakBonus: 7,
        isStreakMilestone: true,
        leveledUp: false,
      };

      const { container } = render(
        <TaskResultModal
          result={mockResult}
          open={true}
          onClose={() => {}}
        />
      );

      // Verify feedback is displayed
      expect(screen.getByText(/你的回答展現了深厚的文學素養/)).toBeInTheDocument();

      // Verify modal constraints are still applied
      expect(container.querySelector('.max-h-\\[90vh\\]')).toBeInTheDocument();
      expect(container.querySelector('.overflow-y-auto')).toBeInTheDocument();

      testLogger.log('Long feedback handled correctly');
    });

    /**
     * Test Case 5: Handle multiple attribute gains
     *
     * Verifies display of many attribute rewards doesn't overflow
     */
    it('should handle multiple attribute gains without overflow', () => {
      testLogger.log('Testing multiple attribute display');

      const mockResult: TaskCompletionResult = {
        success: true,
        taskId: 'test-task-attrs',
        score: 88,
        feedback: '全面的分析，各方面都有涉及。',
        xpAwarded: 18,
        attributeGains: {
          poetrySkill: 3,
          culturalKnowledge: 2,
          analyticalThinking: 3,
          socialInfluence: 2,
          learningPersistence: 1,
        },
        newStreak: 15,
        streakBonus: 15,
        isStreakMilestone: true,
        leveledUp: true,
        fromLevel: 4,
        newLevel: 5,
      };

      render(
        <TaskResultModal
          result={mockResult}
          open={true}
          onClose={() => {}}
        />
      );

      // Verify all attributes are displayed
      expect(screen.getByText(/詩詞造詣/)).toBeInTheDocument();
      expect(screen.getByText(/文化知識/)).toBeInTheDocument();
      expect(screen.getByText(/分析思維/)).toBeInTheDocument();
      expect(screen.getByText(/社交影響/)).toBeInTheDocument();

      testLogger.log('Multiple attributes displayed correctly');
    });
  });

  /**
   * Test Category 3: Special Conditions Tests
   *
   * Tests special scenarios like level-up and streak milestones
   */
  describe('Special Conditions', () => {
    /**
     * Test Case 6: Display streak milestone notification
     *
     * Verifies streak milestone doesn't cause layout issues
     */
    it('should display streak milestone notification correctly', () => {
      testLogger.log('Testing streak milestone display');

      const mockResult: TaskCompletionResult = {
        success: true,
        taskId: 'test-streak',
        score: 80,
        feedback: '持續努力，值得鼓勵！',
        xpAwarded: 15,
        attributeGains: {
          learningPersistence: 3,
        },
        newStreak: 7,
        streakBonus: 7,
        isStreakMilestone: true,
        leveledUp: false,
      };

      render(
        <TaskResultModal
          result={mockResult}
          open={true}
          onClose={() => {}}
        />
      );

      // Verify milestone message is displayed
      expect(screen.getByText(/達成里程碑/)).toBeInTheDocument();
      expect(screen.getByText(/連續完成 7 天任務/)).toBeInTheDocument();

      testLogger.log('Streak milestone displayed correctly');
    });

    /**
     * Test Case 7: Display level-up notification
     *
     * Verifies level-up doesn't cause overflow with all other content
     */
    it('should display level-up notification with all content', () => {
      testLogger.log('Testing level-up display');

      const mockResult: TaskCompletionResult = {
        success: true,
        taskId: 'test-levelup',
        score: 90,
        feedback: '卓越的表現！你已經準備好迎接更高的挑戰了。',
        xpAwarded: 20,
        attributeGains: {
          poetrySkill: 2,
          culturalKnowledge: 2,
          analyticalThinking: 2,
        },
        newStreak: 5,
        streakBonus: 5,
        isStreakMilestone: false,
        leveledUp: true,
        fromLevel: 2,
        newLevel: 3,
      };

      render(
        <TaskResultModal
          result={mockResult}
          open={true}
          onClose={() => {}}
        />
      );

      // Verify level-up section is displayed
      expect(screen.getByText(/等級提升/)).toBeInTheDocument();
      expect(screen.getByText(/Level 2 晉升至 Level 3/)).toBeInTheDocument();

      testLogger.log('Level-up displayed correctly');
    });

    /**
     * Test Case 8: Modal closes correctly
     *
     * Verifies modal close functionality works despite overflow constraints
     */
    it('should close modal when close button is clicked', () => {
      testLogger.log('Testing modal close functionality');

      const mockOnClose = jest.fn();
      const mockResult: TaskCompletionResult = {
        success: true,
        taskId: 'test-close',
        score: 75,
        feedback: '不錯的嘗試！',
        xpAwarded: 10,
        attributeGains: {},
        newStreak: 1,
        streakBonus: 0,
        isStreakMilestone: false,
        leveledUp: false,
      };

      render(
        <TaskResultModal
          result={mockResult}
          open={true}
          onClose={mockOnClose}
        />
      );

      // Find and click close button
      const closeButton = screen.getByText(/太棒了！繼續加油/);
      expect(closeButton).toBeInTheDocument();

      closeButton.click();

      // Verify onClose was called
      expect(mockOnClose).toHaveBeenCalled();

      testLogger.log('Modal close functionality verified');
    });
  });

  /**
   * Test Category 4: Edge Cases
   *
   * Tests edge cases and boundary conditions
   */
  describe('Edge Cases', () => {
    /**
     * Test Case 9: Handle minimal result data
     *
     * Verifies modal works with minimum required data
     */
    it('should handle minimal result data', () => {
      testLogger.log('Testing minimal result data');

      const mockResult: TaskCompletionResult = {
        success: true,
        taskId: 'test-minimal',
        score: 60,
        feedback: '及格。',
        xpAwarded: 6,
        attributeGains: {},
        newStreak: 0,
        streakBonus: 0,
        isStreakMilestone: false,
        leveledUp: false,
      };

      const { container } = render(
        <TaskResultModal
          result={mockResult}
          open={true}
          onClose={() => {}}
        />
      );

      // Verify basic display still works
      expect(screen.getByText(/60/)).toBeInTheDocument();
      expect(screen.getByText(/及格/)).toBeInTheDocument();

      // Verify constraints are still applied
      expect(container.querySelector('.max-h-\\[90vh\\]')).toBeInTheDocument();

      testLogger.log('Minimal result data handled correctly');
    });

    /**
     * Test Case 10: Handle perfect score
     *
     * Verifies display of perfect score (100)
     */
    it('should handle perfect score display', () => {
      testLogger.log('Testing perfect score display');

      const mockResult: TaskCompletionResult = {
        success: true,
        taskId: 'test-perfect',
        score: 100,
        feedback: '完美！這是一份無可挑剔的答案。你展現了對文本的深刻理解和卓越的分析能力。',
        xpAwarded: 30,
        attributeGains: {
          poetrySkill: 5,
          culturalKnowledge: 5,
          analyticalThinking: 5,
        },
        newStreak: 20,
        streakBonus: 20,
        isStreakMilestone: true,
        leveledUp: true,
        fromLevel: 9,
        newLevel: 10,
      };

      render(
        <TaskResultModal
          result={mockResult}
          open={true}
          onClose={() => {}}
        />
      );

      // Verify perfect score is displayed
      expect(screen.getByText(/100/)).toBeInTheDocument();
      expect(screen.getByText(/優秀/)).toBeInTheDocument();

      testLogger.log('Perfect score displayed correctly');
    });
  });
});
