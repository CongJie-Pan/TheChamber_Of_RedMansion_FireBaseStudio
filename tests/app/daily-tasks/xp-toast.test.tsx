/**
 * @fileOverview Tests for Daily Tasks XP toast feedback
 *
 * Verifies that after a successful task submission, a +XP toast is shown.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DailyTasksPage from '../../../src/app/(main)/daily-tasks/page';
import { LanguageProvider } from '../../../src/context/LanguageContext';
import { Toaster } from '../../../src/components/ui/toaster';

// Mock useAuth to provide user and refresh function
jest.mock('../../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'test-user-2', displayName: 'Tester2' },
    isLoading: false,
    refreshUserProfile: jest.fn(),
  })
}));

// Mock UI child components to simplify interactions
jest.mock('../../../src/components/daily-tasks/TaskCard', () => ({
  TaskCard: ({ task, onClick }: any) => (
    <button data-testid={`task-${task.id}`} onClick={() => onClick(task)}>
      Open {task.title}
    </button>
  )
}));

jest.mock('../../../src/components/daily-tasks/TaskModal', () => ({
  TaskModal: ({ open, onSubmit, onClose, task }: any) => (
    open ? (
      <div>
        <div data-testid="task-modal">Modal for {task?.title}</div>
        <button data-testid="submit-task" onClick={() => onSubmit(task.id, 'my answer')}>Submit</button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  )
}));

jest.mock('../../../src/components/daily-tasks/TaskResultModal', () => ({
  TaskResultModal: ({ open, onClose, result }: any) => (
    open ? (
      <div data-testid="result-modal">XP: {result?.xpAwarded}</div>
    ) : null
  )
}));

// Mock dailyTaskService to provide minimal data and successful submission
jest.mock('../../../src/lib/daily-task-service', () => ({
  dailyTaskService: {
    generateDailyTasks: jest.fn(async () => ([{ id: 'task-1', title: '任務一', type: 'MORNING_READING' }])),
    getUserDailyProgress: jest.fn(async () => ({
      id: 'test-user-2_2025-01-01',
      userId: 'test-user-2',
      date: '2025-01-01',
      tasks: [{ taskId: 'task-1', status: 'NOT_STARTED' }],
      completedTaskIds: [],
      skippedTaskIds: [],
      totalXPEarned: 0,
      totalAttributeGains: {},
      usedSourceIds: [],
      streak: 0,
    })),
    submitTaskCompletion: jest.fn(async () => ({
      success: true,
      taskId: 'task-1',
      xpAwarded: 23,
      score: 80,
      feedback: '做得不錯',
      attributeGains: {},
      leveledUp: false,
      newLevel: 0,
      newStreak: 1,
      isStreakMilestone: false,
      streakBonus: 0,
    })),
  }
}));

// Silence console
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('DailyTasksPage XP toast', () => {
  test('shows "+XP" toast after successful submission', async () => {
    render(
      <LanguageProvider>
        <DailyTasksPage />
        <Toaster />
      </LanguageProvider>
    );

    // Open the mocked task modal via TaskCard button
    const taskBtn = await screen.findByTestId('task-task-1');
    taskBtn.click();

    // Submit the task in the mocked modal
    const submitBtn = await screen.findByTestId('submit-task');
    submitBtn.click();

    // Expect a toast indicating XP gained
    await waitFor(() => {
      expect(screen.getByText('獲得經驗值')).toBeInTheDocument();
      expect(screen.getByText('+23 XP')).toBeInTheDocument();
    });
  });
});

