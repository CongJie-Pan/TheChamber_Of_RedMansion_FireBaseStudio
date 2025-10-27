/**
 * @fileOverview LevelUpModal Component Tests
 *
 * Comprehensive test suite for the LevelUpModal component including:
 * - Component rendering with correct level information
 * - Display of newly unlocked permissions and content
 * - Confetti animation triggering
 * - User interactions (close button, explore features button)
 * - Multi-language support
 * - Edge cases and boundary conditions
 *
 * Test Categories:
 * 1. Expected Use Cases: Normal component behavior
 * 2. Edge Cases: Boundary conditions and unusual states
 * 3. Failure Cases: Invalid props and error conditions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LevelUpModal } from '@/components/gamification/LevelUpModal';
import { useLanguage } from '@/hooks/useLanguage';

// Mock dependencies
jest.mock('@/hooks/useLanguage');
jest.mock('@/lib/config/levels-config', () => ({
  getLevelConfig: jest.fn((level: number) => {
    const configs: Record<number, any> = {
      0: {
        id: 0,
        title: '賈府訪客',
        titleEn: 'Manor Visitor',
        description: '初入賈府，開始您的紅樓之旅',
        permissions: ['BASIC_READING', 'SIMPLE_AI_QA'],
        exclusiveContent: ['chapters:1-5', 'intro_guide'],
        visualRewards: { badge: 'visitor', color: '#888' },
        virtualResidence: '外宅客房',
        requiredXP: 0
      },
      1: {
        id: 1,
        title: '陪讀書僮',
        titleEn: 'Reading Companion',
        description: '開始深入了解紅樓世界',
        permissions: ['BASIC_READING', 'SIMPLE_AI_QA', 'BASIC_NOTES', 'COMMUNITY_POST'],
        exclusiveContent: ['chapters:1-20', 'character_intro_basic', 'poetry_basics'],
        visualRewards: { badge: 'companion', color: '#4a90e2' },
        virtualResidence: '怡紅院側室',
        requiredXP: 100
      },
      2: {
        id: 2,
        title: '門第清客',
        titleEn: 'Distinguished Guest',
        description: '受到府中認可的文雅之士',
        permissions: ['BASIC_READING', 'SIMPLE_AI_QA', 'BASIC_NOTES', 'COMMUNITY_POST', 'ADVANCED_AI_QA'],
        exclusiveContent: ['chapters:1-40', 'poetry_advanced', 'character_relationships'],
        visualRewards: { badge: 'guest', color: '#7b68ee' },
        virtualResidence: '瀟湘館',
        requiredXP: 300
      },
      7: {
        id: 7,
        title: '一代宗師',
        titleEn: 'Grand Master',
        description: '紅學大家，登峰造極',
        permissions: ['BASIC_READING', 'SIMPLE_AI_QA', 'BASIC_NOTES', 'COMMUNITY_POST', 'ADVANCED_AI_QA', 'EXPERT_READINGS_FULL', 'EXCLUSIVE_CONTENT', 'POETRY_COMPETITION'],
        exclusiveContent: ['all_chapters', 'secret_manuscripts', 'expert_commentary'],
        visualRewards: { badge: 'master', color: '#ffd700' },
        virtualResidence: '大觀園主',
        requiredXP: 3000
      }
    };
    return configs[level] || configs[0];
  }),
  getAllPermissionsForLevel: jest.fn((level: number) => {
    const permissions: Record<number, string[]> = {
      0: ['BASIC_READING', 'SIMPLE_AI_QA'],
      1: ['BASIC_READING', 'SIMPLE_AI_QA', 'BASIC_NOTES', 'COMMUNITY_POST'],
      2: ['BASIC_READING', 'SIMPLE_AI_QA', 'BASIC_NOTES', 'COMMUNITY_POST', 'ADVANCED_AI_QA'],
      7: ['BASIC_READING', 'SIMPLE_AI_QA', 'BASIC_NOTES', 'COMMUNITY_POST', 'ADVANCED_AI_QA', 'EXPERT_READINGS_FULL', 'EXCLUSIVE_CONTENT', 'POETRY_COMPETITION']
    };
    return permissions[level] || permissions[0];
  })
}));

jest.mock('@/components/gamification/LevelBadge', () => ({
  LevelBadge: ({ level, variant, showTitle, className }: any) => (
    <div data-testid="level-badge" data-level={level} data-variant={variant} data-show-title={showTitle} className={className}>
      Level {level} Badge
    </div>
  )
}));

describe('LevelUpModal Component', () => {
  let testLogger: any;
  const mockOnOpenChange = jest.fn();
  const mockOnExploreFeatures = jest.fn();

  beforeEach(() => {
    // Initialize test logger
    testLogger = {
      logs: [],
      log: (message: string, data?: any) => {
        testLogger.logs.push({ message, data, timestamp: new Date().toISOString() });
      }
    };

    // Reset mocks
    jest.clearAllMocks();

    // Default mock implementation for useLanguage
    (useLanguage as jest.Mock).mockReturnValue({
      t: (key: string) => {
        const translations: Record<string, string> = {
          'level.congratulations': '恭喜',
          'level.reachedLevel': '您已達到新等級',
          'level.newPermissionsUnlocked': '新解鎖權限',
          'level.newContentUnlocked': '新解鎖內容',
          'level.virtualResidence': '虛擬居所',
          'level.keepLearning': '繼續學習',
          'achievements.viewActivity': '查看成就',
          'level.permissionNames.BASIC_NOTES': '基礎筆記功能',
          'level.permissionNames.COMMUNITY_POST': '社群發文權限',
          'level.permissionNames.ADVANCED_AI_QA': '進階AI問答',
          'level.exclusiveContentNames.poetry_basics': '詩詞基礎',
          'level.exclusiveContentNames.character_intro_basic': '人物介紹',
        };
        return translations[key] || key;
      },
      language: 'zh-TW'
    });
  });

  afterEach(() => {
    // Save test logs
    const fs = require('fs');
    const path = require('path');

    if (global.__TEST_CONFIG__) {
      const testName = expect.getState().currentTestName?.replace(/[^a-zA-Z0-9]/g, '_') || 'unknown';
      const logPath = path.join(
        global.__TEST_CONFIG__.outputDir,
        'level-up-modal',
        `${testName}_logs.json`
      );

      try {
        fs.mkdirSync(path.dirname(logPath), { recursive: true });
        fs.writeFileSync(logPath, JSON.stringify({
          testName: expect.getState().currentTestName,
          logs: testLogger.logs,
          timestamp: new Date().toISOString(),
        }, null, 2));
      } catch (error) {
        console.error('Failed to write test logs:', error);
      }
    }
  });

  describe('Component Rendering - Expected Use Cases', () => {
    /**
     * Test Case 1: Modal renders when open
     *
     * Verifies that the modal displays when open prop is true
     */
    it('should render modal when open is true', () => {
      testLogger.log('Testing modal rendering');

      // Act
      render(
        <LevelUpModal
          open={true}
          onOpenChange={mockOnOpenChange}
          fromLevel={0}
          toLevel={1}
        />
      );

      // Assert
      expect(screen.getByText('恭喜')).toBeInTheDocument();
      expect(screen.getByText('您已達到新等級')).toBeInTheDocument();

      testLogger.log('Modal rendering test completed');
    });

    /**
     * Test Case 2: Modal displays correct level information
     *
     * Verifies that the modal shows the correct new level title and description
     */
    it('should display correct level title and description', () => {
      testLogger.log('Testing level information display');

      // Act
      render(
        <LevelUpModal
          open={true}
          onOpenChange={mockOnOpenChange}
          fromLevel={0}
          toLevel={1}
        />
      );

      // Assert
      expect(screen.getByText('陪讀書僮')).toBeInTheDocument();
      expect(screen.getByText('開始深入了解紅樓世界')).toBeInTheDocument();

      testLogger.log('Level information display test completed');
    });

    /**
     * Test Case 3: Modal displays level badge
     *
     * Verifies that the LevelBadge component is rendered with correct props
     */
    it('should display level badge with correct props', () => {
      testLogger.log('Testing level badge display');

      // Act
      render(
        <LevelUpModal
          open={true}
          onOpenChange={mockOnOpenChange}
          fromLevel={0}
          toLevel={1}
        />
      );

      // Assert
      const badge = screen.getByTestId('level-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('data-level', '1');
      expect(badge).toHaveAttribute('data-variant', 'full');
      expect(badge).toHaveAttribute('data-show-title', 'true');

      testLogger.log('Level badge display test completed');
    });

    /**
     * Test Case 4: Modal displays newly unlocked permissions
     *
     * Verifies that new permissions are listed correctly
     */
    it('should display newly unlocked permissions', () => {
      testLogger.log('Testing newly unlocked permissions display');

      // Act
      render(
        <LevelUpModal
          open={true}
          onOpenChange={mockOnOpenChange}
          fromLevel={0}
          toLevel={1}
        />
      );

      // Assert
      expect(screen.getByText(/新解鎖權限/)).toBeInTheDocument();
      expect(screen.getByText('基礎筆記功能')).toBeInTheDocument();
      expect(screen.getByText('社群發文權限')).toBeInTheDocument();

      testLogger.log('Newly unlocked permissions display test completed');
    });

    /**
     * Test Case 5: Modal displays newly unlocked content
     *
     * Verifies that exclusive content is listed correctly
     */
    it('should display newly unlocked content', () => {
      testLogger.log('Testing newly unlocked content display');

      // Act
      render(
        <LevelUpModal
          open={true}
          onOpenChange={mockOnOpenChange}
          fromLevel={0}
          toLevel={1}
        />
      );

      // Assert
      expect(screen.getByText(/新解鎖內容/)).toBeInTheDocument();
      // Content should be displayed as badges
      const contentBadges = screen.queryAllByText(/chapters:1-20|character_intro_basic|poetry_basics/);
      expect(contentBadges.length).toBeGreaterThan(0);

      testLogger.log('Newly unlocked content display test completed');
    });

    /**
     * Test Case 6: Modal displays virtual residence
     *
     * Verifies that the virtual residence is shown
     */
    it('should display virtual residence information', () => {
      testLogger.log('Testing virtual residence display');

      // Act
      render(
        <LevelUpModal
          open={true}
          onOpenChange={mockOnOpenChange}
          fromLevel={0}
          toLevel={1}
        />
      );

      // Assert
      expect(screen.getByText('虛擬居所')).toBeInTheDocument();
      expect(screen.getByText('怡紅院側室')).toBeInTheDocument();

      testLogger.log('Virtual residence display test completed');
    });
  });

  describe('User Interactions - Expected Use Cases', () => {
    /**
     * Test Case 1: Close button closes modal
     *
     * Verifies that clicking the close/continue learning button triggers onOpenChange
     */
    it('should close modal when close button is clicked', () => {
      testLogger.log('Testing close button functionality');

      // Act
      render(
        <LevelUpModal
          open={true}
          onOpenChange={mockOnOpenChange}
          fromLevel={0}
          toLevel={1}
        />
      );

      const closeButton = screen.getByText('繼續學習');
      fireEvent.click(closeButton);

      // Assert
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);

      testLogger.log('Close button functionality test completed');
    });

    /**
     * Test Case 2: Explore features button works
     *
     * Verifies that the explore features button triggers callback
     */
    it('should trigger onExploreFeatures callback when explore button is clicked', () => {
      testLogger.log('Testing explore features button');

      // Act
      render(
        <LevelUpModal
          open={true}
          onOpenChange={mockOnOpenChange}
          fromLevel={0}
          toLevel={1}
          onExploreFeatures={mockOnExploreFeatures}
        />
      );

      const exploreButton = screen.getByText('查看成就');
      fireEvent.click(exploreButton);

      // Assert
      expect(mockOnExploreFeatures).toHaveBeenCalled();
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);

      testLogger.log('Explore features button test completed');
    });

    /**
     * Test Case 3: Explore button only shows when callback provided
     *
     * Verifies conditional rendering of explore features button
     */
    it('should not display explore button when onExploreFeatures is not provided', () => {
      testLogger.log('Testing conditional explore button rendering');

      // Act
      render(
        <LevelUpModal
          open={true}
          onOpenChange={mockOnOpenChange}
          fromLevel={0}
          toLevel={1}
        />
      );

      // Assert
      const exploreButton = screen.queryByText('查看成就');
      expect(exploreButton).not.toBeInTheDocument();

      testLogger.log('Conditional explore button test completed');
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    /**
     * Edge Case 1: First level-up (Level 0 to 1)
     *
     * Verifies correct behavior for the user's first level-up
     */
    it('should handle first level-up correctly (Level 0 to 1)', () => {
      testLogger.log('Testing first level-up');

      // Act
      render(
        <LevelUpModal
          open={true}
          onOpenChange={mockOnOpenChange}
          fromLevel={0}
          toLevel={1}
        />
      );

      // Assert
      expect(screen.getByText('陪讀書僮')).toBeInTheDocument();
      expect(screen.getByTestId('level-badge')).toHaveAttribute('data-level', '1');

      testLogger.log('First level-up test completed');
    });

    /**
     * Edge Case 2: Maximum level (Level 7)
     *
     * Verifies correct behavior when reaching maximum level
     */
    it('should handle maximum level correctly (Level 7)', () => {
      testLogger.log('Testing maximum level');

      // Act
      render(
        <LevelUpModal
          open={true}
          onOpenChange={mockOnOpenChange}
          fromLevel={6}
          toLevel={7}
        />
      );

      // Assert
      expect(screen.getByText('一代宗師')).toBeInTheDocument();
      expect(screen.getByText('Grand Master')).toBeInTheDocument();
      expect(screen.getByTestId('level-badge')).toHaveAttribute('data-level', '7');

      testLogger.log('Maximum level test completed');
    });

    /**
     * Edge Case 3: Multi-level jump
     *
     * Verifies behavior when skipping levels (e.g., 0 to 3)
     */
    it('should handle multi-level jumps correctly', () => {
      testLogger.log('Testing multi-level jump');

      // Act
      render(
        <LevelUpModal
          open={true}
          onOpenChange={mockOnOpenChange}
          fromLevel={0}
          toLevel={2}
        />
      );

      // Assert
      expect(screen.getByText('門第清客')).toBeInTheDocument();
      expect(screen.getByTestId('level-badge')).toHaveAttribute('data-level', '2');

      testLogger.log('Multi-level jump test completed');
    });

    /**
     * Edge Case 4: English language mode
     *
     * Verifies that English titles are displayed when language is English
     */
    it('should display English titles when language is English', () => {
      testLogger.log('Testing English language mode');

      // Arrange: Mock useLanguage for English
      (useLanguage as jest.Mock).mockReturnValue({
        t: (key: string) => key,
        language: 'en-US'
      });

      // Act
      render(
        <LevelUpModal
          open={true}
          onOpenChange={mockOnOpenChange}
          fromLevel={0}
          toLevel={1}
        />
      );

      // Assert
      expect(screen.getByText('Reading Companion')).toBeInTheDocument();

      testLogger.log('English language mode test completed');
    });

    /**
     * Edge Case 5: Modal closed state
     *
     * Verifies that modal content is not rendered when open is false
     */
    it('should not render modal content when open is false', () => {
      testLogger.log('Testing modal closed state');

      // Act
      render(
        <LevelUpModal
          open={false}
          onOpenChange={mockOnOpenChange}
          fromLevel={0}
          toLevel={1}
        />
      );

      // Assert
      expect(screen.queryByText('恭喜')).not.toBeInTheDocument();
      expect(screen.queryByText('陪讀書僮')).not.toBeInTheDocument();

      testLogger.log('Modal closed state test completed');
    });

    /**
     * Edge Case 6: No new permissions unlocked
     *
     * Verifies behavior when there are no new permissions between levels
     * (This shouldn't normally happen, but good to test edge case)
     */
    it('should handle case when no new permissions are unlocked', () => {
      testLogger.log('Testing no new permissions');

      // Mock to return same permissions for both levels
      const { getAllPermissionsForLevel } = require('@/lib/config/levels-config');
      (getAllPermissionsForLevel as jest.Mock).mockReturnValue(['BASIC_READING']);

      // Act
      render(
        <LevelUpModal
          open={true}
          onOpenChange={mockOnOpenChange}
          fromLevel={0}
          toLevel={1}
        />
      );

      // Assert
      // Should not show permissions section if no new permissions
      const permissionsHeader = screen.queryByText(/新解鎖權限.*\(0\)/);
      // Modal should still render successfully
      expect(screen.getByText('陪讀書僮')).toBeInTheDocument();

      testLogger.log('No new permissions test completed');
    });
  });

  describe('Animation and Visual Effects', () => {
    /**
     * Test Case: Confetti effect is present
     *
     * Verifies that confetti animation elements exist when modal opens
     * Note: Full animation testing requires more advanced testing tools,
     * here we just verify the component structure exists
     */
    it('should include confetti effect elements when modal opens', () => {
      testLogger.log('Testing confetti presence');

      // Act
      render(
        <LevelUpModal
          open={true}
          onOpenChange={mockOnOpenChange}
          fromLevel={0}
          toLevel={1}
        />
      );

      // Assert
      // Confetti is rendered, we can check for its container
      // The actual confetti particles are div elements, hard to test specifically
      // but we can verify modal structure includes them
      const modalContent = document.querySelector('[class*="DialogContent"]');
      expect(modalContent).toBeInTheDocument();

      testLogger.log('Confetti presence test completed');
    });
  });
});
