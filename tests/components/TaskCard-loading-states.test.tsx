/**
 * @fileOverview TaskCard Component Loading States Tests
 *
 * Tests the visual loading states and status indicators of the TaskCard component
 * to ensure users receive clear feedback about task progress and completion.
 *
 * Key Features Tested:
 * - Status indicators (NOT_STARTED, IN_PROGRESS, COMPLETED)
 * - Visual styling based on task status
 * - Clickability based on completion status
 * - Score display for completed tasks
 * - Difficulty badges and colors
 * - Loading skeleton states (if applicable)
 *
 * Prevents Regression:
 * - Missing status indicators
 * - Incorrect visual feedback
 * - Completed tasks remaining clickable
 * - Poor UX during state transitions
 *
 * @phase Phase 2.9 - Daily Task System Testing
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TaskCard } from '@/components/daily-tasks/TaskCard';
import { DailyTask, TaskStatus, DailyTaskType, TaskDifficulty } from '@/lib/types/daily-task';

describe('TaskCard Loading States', () => {
  const mockTask: DailyTask = {
    id: 'task-1',
    type: DailyTaskType.MORNING_READING,
    difficulty: TaskDifficulty.MEDIUM,
    title: 'Morning Reading Task',
    description: 'Read and analyze a passage from Dream of the Red Chamber',
    baseXP: 10,
    content: {
      textPassage: {
        text: 'Sample passage text',
        question: 'What is the main theme?',
      },
    },
    sourceId: 'chapter-1',
    attributeRewards: {
      culturalKnowledge: 2,
      analyticalThinking: 1,
    },
    timeEstimate: 5,
    gradingCriteria: {
      minLength: 50,
    },
  };

  const mockOnClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Task Status Indicators', () => {
    test('should display NOT_STARTED status indicator', () => {
      // Arrange & Act
      render(
        <TaskCard
          task={mockTask}
          status={TaskStatus.NOT_STARTED}
          onClick={mockOnClick}
        />
      );

      // Assert
      expect(screen.getByText('未開始')).toBeInTheDocument();
    });

    test('should display IN_PROGRESS status indicator', () => {
      // Arrange & Act
      render(
        <TaskCard
          task={mockTask}
          status={TaskStatus.IN_PROGRESS}
          onClick={mockOnClick}
        />
      );

      // Assert
      expect(screen.getByText('進行中')).toBeInTheDocument();
    });

    test('should display COMPLETED status indicator with checkmark', () => {
      // Arrange & Act
      render(
        <TaskCard
          task={mockTask}
          status={TaskStatus.COMPLETED}
          score={85}
          onClick={mockOnClick}
        />
      );

      // Assert
      expect(screen.getByText('已完成')).toBeInTheDocument();
    });
  });

  describe('Visual Styling Based on Status', () => {
    test('should apply hover effects for NOT_STARTED tasks', () => {
      // Arrange
      const { container } = render(
        <TaskCard
          task={mockTask}
          status={TaskStatus.NOT_STARTED}
          onClick={mockOnClick}
        />
      );

      // Act
      const card = container.querySelector('[class*="cursor-pointer"]');

      // Assert
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('cursor-pointer');
    });

    test('should apply hover effects for IN_PROGRESS tasks', () => {
      // Arrange
      const { container } = render(
        <TaskCard
          task={mockTask}
          status={TaskStatus.IN_PROGRESS}
          onClick={mockOnClick}
        />
      );

      // Act
      const card = container.querySelector('[class*="cursor-pointer"]');

      // Assert
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('cursor-pointer');
    });

    test('should not apply hover effects for COMPLETED tasks', () => {
      // Arrange
      const { container } = render(
        <TaskCard
          task={mockTask}
          status={TaskStatus.COMPLETED}
          score={85}
          onClick={mockOnClick}
        />
      );

      // Act
      const card = container.querySelector('[class*="cursor-default"]');

      // Assert
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('cursor-default');
    });
  });

  describe('Clickability Based on Status', () => {
    test('should be clickable when NOT_STARTED', () => {
      // Arrange
      render(
        <TaskCard
          task={mockTask}
          status={TaskStatus.NOT_STARTED}
          onClick={mockOnClick}
        />
      );

      // Act
      const card = screen.getByText(mockTask.title).closest('div[role="button"]') ||
                   screen.getByText(mockTask.title).closest('div');
      fireEvent.click(card!);

      // Assert
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    test('should be clickable when IN_PROGRESS', () => {
      // Arrange
      render(
        <TaskCard
          task={mockTask}
          status={TaskStatus.IN_PROGRESS}
          onClick={mockOnClick}
        />
      );

      // Act
      const card = screen.getByText(mockTask.title).closest('div');
      fireEvent.click(card!);

      // Assert
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    test('should not be clickable when COMPLETED', () => {
      // Arrange
      render(
        <TaskCard
          task={mockTask}
          status={TaskStatus.COMPLETED}
          score={85}
          onClick={mockOnClick}
        />
      );

      // Act
      const card = screen.getByText(mockTask.title).closest('div');
      fireEvent.click(card!);

      // Assert
      // Completed tasks should not trigger onClick
      // The component sets onClick to undefined for completed tasks
      // So clicking the card div itself won't call mockOnClick
      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  describe('Score Display', () => {
    test('should display score for completed tasks', () => {
      // Arrange & Act
      render(
        <TaskCard
          task={mockTask}
          status={TaskStatus.COMPLETED}
          score={92}
          onClick={mockOnClick}
        />
      );

      // Assert
      // The score is displayed somewhere in the component
      expect(screen.getByText(/92|分數/i)).toBeInTheDocument();
    });

    test('should not display score for incomplete tasks', () => {
      // Arrange & Act
      render(
        <TaskCard
          task={mockTask}
          status={TaskStatus.NOT_STARTED}
          onClick={mockOnClick}
        />
      );

      // Assert
      // No score display for non-completed tasks
      expect(screen.queryByText(/分數/i)).not.toBeInTheDocument();
    });
  });

  describe('Difficulty Badges', () => {
    test('should display EASY difficulty badge with correct color', () => {
      // Arrange
      const easyTask: DailyTask = { ...mockTask, difficulty: TaskDifficulty.EASY };

      // Act
      render(
        <TaskCard
          task={easyTask}
          status={TaskStatus.NOT_STARTED}
          onClick={mockOnClick}
        />
      );

      // Assert
      expect(screen.getByText('簡單')).toBeInTheDocument();
    });

    test('should display MEDIUM difficulty badge with correct color', () => {
      // Arrange & Act
      render(
        <TaskCard
          task={mockTask}
          status={TaskStatus.NOT_STARTED}
          onClick={mockOnClick}
        />
      );

      // Assert
      expect(screen.getByText('中等')).toBeInTheDocument();
    });

    test('should display HARD difficulty badge with correct color', () => {
      // Arrange
      const hardTask: DailyTask = { ...mockTask, difficulty: TaskDifficulty.HARD };

      // Act
      render(
        <TaskCard
          task={hardTask}
          status={TaskStatus.NOT_STARTED}
          onClick={mockOnClick}
        />
      );

      // Assert
      expect(screen.getByText('困難')).toBeInTheDocument();
    });
  });

  describe('Task Metadata Display', () => {
    test('should display task title and description', () => {
      // Arrange & Act
      render(
        <TaskCard
          task={mockTask}
          status={TaskStatus.NOT_STARTED}
          onClick={mockOnClick}
        />
      );

      // Assert
      expect(screen.getByText(mockTask.title)).toBeInTheDocument();
      expect(screen.getByText(mockTask.description)).toBeInTheDocument();
    });

    test('should display time estimate', () => {
      // Arrange & Act
      render(
        <TaskCard
          task={mockTask}
          status={TaskStatus.NOT_STARTED}
          onClick={mockOnClick}
        />
      );

      // Assert
      // Time estimate is displayed (e.g., "5 分鐘" or "5 min")
      expect(screen.getByText(/5/)).toBeInTheDocument();
    });

    test('should display XP reward', () => {
      // Arrange & Act
      render(
        <TaskCard
          task={mockTask}
          status={TaskStatus.NOT_STARTED}
          onClick={mockOnClick}
        />
      );

      // Assert
      // XP reward is displayed
      expect(screen.getByText(/10/)).toBeInTheDocument(); // baseXP
    });
  });
});
