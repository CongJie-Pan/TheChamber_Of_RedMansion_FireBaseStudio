/**
 * @fileOverview Daily Tasks Page Loading Tests
 *
 * Tests the page loading behavior and performance optimizations to ensure
 * the page loads quickly without blocking on task generation.
 *
 * Key Features Tested:
 * - Non-blocking page load (shows UI immediately)
 * - Background task generation with loading states
 * - Error handling and error states
 * - Empty state during generation
 * - Loading indicators and skeleton states
 * - User feedback during async operations
 *
 * Prevents Regression:
 * - Issue #1: Page loading too slow (blocking on task generation)
 * - Tasks blocking UI while generating
 * - Missing loading indicators
 * - Poor user experience during async operations
 *
 * @phase Phase 2.9 - Daily Task System Testing
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DailyTasksPage from '@/app/(main)/daily-tasks/page';
import type { DailyTaskProgress, DailyTask } from '@/lib/types/daily-task';

// Mock hooks
const mockUseAuth = jest.fn();
const mockUseLanguage = jest.fn();
const mockUseToast = jest.fn();

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => mockUseLanguage(),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => mockUseToast(),
}));

// Mock services
const mockGetUserDailyProgress = jest.fn();
const mockGenerateDailyTasks = jest.fn();
const mockDeleteTodayProgress = jest.fn();

jest.mock('@/lib/daily-task-service', () => ({
  dailyTaskService: {
    getUserDailyProgress: () => mockGetUserDailyProgress(),
    generateDailyTasks: () => mockGenerateDailyTasks(),
    deleteTodayProgress: () => mockDeleteTodayProgress(),
  },
}));

jest.mock('@/lib/user-level-service', () => ({
  userLevelService: {
    getUserProfile: jest.fn(() => Promise.resolve({
      uid: 'test-user',
      currentLevel: 2,
      totalXP: 100,
    })),
  },
}));

// Mock Firebase auth
const mockGetIdToken = jest.fn(() => Promise.resolve('mock-token'));
jest.mock('@/lib/firebase', () => ({
  db: {},
  auth: {
    currentUser: {
      getIdToken: () => mockGetIdToken(),
    },
  },
}));

// Mock UI components
jest.mock('@/components/daily-tasks/TaskCard', () => ({
  TaskCard: ({ task }: { task: DailyTask }) => (
    <div data-testid={`task-card-${task.id}`}>
      <h3>{task.title}</h3>
      <p>{task.description}</p>
    </div>
  ),
}));

jest.mock('@/components/daily-tasks/TaskModal', () => ({
  TaskModal: () => <div data-testid="task-modal">Task Modal</div>,
}));

jest.mock('@/components/daily-tasks/TaskResultModal', () => ({
  TaskResultModal: () => <div data-testid="task-result-modal">Task Result Modal</div>,
}));

jest.mock('@/components/daily-tasks/StreakCounter', () => ({
  StreakCounter: ({ streak }: { streak: number }) => (
    <div data-testid="streak-counter">Streak: {streak}</div>
  ),
}));

jest.mock('@/components/daily-tasks/TaskCalendar', () => ({
  TaskCalendar: () => <div data-testid="task-calendar">Task Calendar</div>,
}));

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Daily Tasks Page Loading', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockUseAuth.mockReturnValue({
      user: {
        uid: 'test-user',
        displayName: 'Test User',
        email: 'test@example.com',
        isAnonymous: false,
      },
      refreshUserProfile: jest.fn(),
    });

    mockUseLanguage.mockReturnValue({
      t: (key: string) => key,
      language: 'zh-TW',
    });

    mockUseToast.mockReturnValue({
      toast: jest.fn(),
    });

    // Suppress console output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Non-Blocking Page Load', () => {
    test('should render page immediately without waiting for tasks', async () => {
      // Arrange: Mock slow task loading
      mockGetUserDailyProgress.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(null), 2000))
      );

      // Act: Render page
      const startTime = performance.now();
      render(<DailyTasksPage />);
      const renderTime = performance.now() - startTime;

      // Assert: Page should render quickly (<100ms), not wait for 2s task loading
      expect(renderTime).toBeLessThan(1000); // Generous allowance for React rendering

      // Page structure should be visible immediately
      await waitFor(() => {
        expect(screen.queryByText(/每日修身|Daily Tasks/i)).toBeInTheDocument();
      }, { timeout: 500 });
    });

    test('should show empty state while tasks are generating', async () => {
      // Arrange: No existing progress
      mockGetUserDailyProgress.mockResolvedValue(null);

      // Mock slow API response
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ tasks: [] }),
        }), 1000))
      );

      // Act
      render(<DailyTasksPage />);

      // Assert: Should show generating state immediately
      await waitFor(() => {
        expect(screen.getByText(/正在生成今日任務|Generating tasks/i)).toBeInTheDocument();
      });
    });

    test('should display loading indicators during task generation', async () => {
      // Arrange
      mockGetUserDailyProgress.mockResolvedValue(null);
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ tasks: [] }),
        }), 500))
      );

      // Act
      render(<DailyTasksPage />);

      // Assert: Loading spinner should be visible
      await waitFor(() => {
        const loadingSpinner = screen.queryByTestId('loader-icon');
        const loadingText = screen.queryByText(/正在生成|Generating/i);
        expect(loadingSpinner || loadingText).toBeTruthy();
      });
    });
  });

  describe('Background Task Generation', () => {
    test('should load existing tasks without generation', async () => {
      // Arrange: Existing progress with tasks
      const mockProgress: DailyTaskProgress = {
        id: 'test-user_2025-10-28',
        userId: 'test-user',
        date: '2025-10-28',
        tasks: [
          {
            taskId: 'task-1',
            assignedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
            status: 'NOT_STARTED' as const,
          },
        ],
        completedTaskIds: [],
        skippedTaskIds: [],
        totalXPEarned: 0,
        totalAttributeGains: {},
        usedSourceIds: [],
        streak: 5,
        createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
        updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
      };

      mockGetUserDailyProgress.mockResolvedValue(mockProgress);

      // Act
      render(<DailyTasksPage />);

      // Assert: Should not call generation API
      await waitFor(() => {
        expect(global.fetch).not.toHaveBeenCalledWith(
          expect.stringContaining('/api/daily-tasks/generate'),
          expect.anything()
        );
      });
    });

    test('should generate tasks in background when no progress exists', async () => {
      // Arrange: No existing progress
      mockGetUserDailyProgress.mockResolvedValue(null);

      const mockTasks: DailyTask[] = [
        {
          id: 'task-1',
          type: 'MORNING_READING',
          difficulty: 'MEDIUM',
          title: 'Test Task',
          description: 'Test Description',
          baseXP: 10,
          content: { textPassage: { text: 'Sample', question: 'Q?' } },
          sourceId: 'chapter-1',
          attributeRewards: { culturalKnowledge: 1 },
          timeEstimate: 5,
          gradingCriteria: { minLength: 30 },
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ tasks: mockTasks }),
      });

      // Act
      render(<DailyTasksPage />);

      // Assert: Should call generation API
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/daily-tasks/generate'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'Authorization': 'Bearer mock-token',
            }),
          })
        );
      });
    });

    test('should update UI after background generation completes', async () => {
      // Arrange
      mockGetUserDailyProgress.mockResolvedValue(null);

      const mockTasks: DailyTask[] = [
        {
          id: 'task-1',
          type: 'MORNING_READING',
          difficulty: 'MEDIUM',
          title: 'Generated Task',
          description: 'This task was generated',
          baseXP: 10,
          content: { textPassage: { text: 'Sample', question: 'Q?' } },
          sourceId: 'chapter-1',
          attributeRewards: { culturalKnowledge: 1 },
          timeEstimate: 5,
          gradingCriteria: { minLength: 30 },
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ tasks: mockTasks }),
      });

      // Act
      render(<DailyTasksPage />);

      // Assert: Tasks should appear after generation
      await waitFor(() => {
        expect(screen.getByText('Generated Task')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Error Handling', () => {
    test('should display error message when task generation fails', async () => {
      // Arrange
      mockGetUserDailyProgress.mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal Server Error' }),
      });

      const mockToast = jest.fn();
      mockUseToast.mockReturnValue({ toast: mockToast });

      // Act
      render(<DailyTasksPage />);

      // Assert: Should show error toast
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.any(String),
            description: expect.stringContaining(/失敗|failed|error/i),
            variant: 'destructive',
          })
        );
      }, { timeout: 2000 });
    });

    test('should handle network errors gracefully', async () => {
      // Arrange
      mockGetUserDailyProgress.mockResolvedValue(null);
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const mockToast = jest.fn();
      mockUseToast.mockReturnValue({ toast: mockToast });

      // Act
      render(<DailyTasksPage />);

      // Assert: Should display error state
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    test('should allow retry after error', async () => {
      // Arrange
      mockGetUserDailyProgress.mockResolvedValue(null);

      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: 'Error' }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ tasks: [] }),
        });
      });

      // Act: First render will fail, user can refresh page
      const { rerender } = render(<DailyTasksPage />);

      await waitFor(() => {
        expect(callCount).toBe(1);
      });

      // Simulate page refresh
      mockGetUserDailyProgress.mockClear();
      mockGetUserDailyProgress.mockResolvedValue(null);
      rerender(<DailyTasksPage />);

      // Assert: Second attempt should succeed
      await waitFor(() => {
        expect(callCount).toBe(2);
      }, { timeout: 2000 });
    });
  });

  describe('Loading States', () => {
    test('should hide initial loading state after data fetch', async () => {
      // Arrange
      const mockProgress: DailyTaskProgress = {
        id: 'test-user_2025-10-28',
        userId: 'test-user',
        date: '2025-10-28',
        tasks: [],
        completedTaskIds: [],
        skippedTaskIds: [],
        totalXPEarned: 0,
        totalAttributeGains: {},
        usedSourceIds: [],
        streak: 0,
        createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
        updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
      };

      mockGetUserDailyProgress.mockResolvedValue(mockProgress);

      // Act
      render(<DailyTasksPage />);

      // Assert: Loading spinner should disappear
      await waitFor(() => {
        const initialLoader = screen.queryByTestId('initial-loader');
        expect(initialLoader).not.toBeInTheDocument();
      });
    });

    test('should show generating state independently from loading state', async () => {
      // Arrange: No progress, will trigger generation
      mockGetUserDailyProgress.mockResolvedValue(null);
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ tasks: [] }),
        }), 1000))
      );

      // Act
      render(<DailyTasksPage />);

      // Assert: Should show generating indicator
      await waitFor(() => {
        const generatingText = screen.queryByText(/正在生成|Generating/i);
        expect(generatingText).toBeInTheDocument();
      }, { timeout: 500 });
    });

    test('should clear generating state after completion', async () => {
      // Arrange
      mockGetUserDailyProgress.mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ tasks: [] }),
      });

      // Act
      render(<DailyTasksPage />);

      // Wait for generation to start
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // Assert: Generating state should clear after completion
      await waitFor(() => {
        const generatingText = screen.queryByText(/正在生成|Generating/i);
        expect(generatingText).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Performance Optimization', () => {
    test('should not block UI thread during task generation', async () => {
      // Arrange
      mockGetUserDailyProgress.mockResolvedValue(null);
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ tasks: [] }),
        }), 1000))
      );

      // Act
      const startTime = performance.now();
      render(<DailyTasksPage />);
      const renderTime = performance.now() - startTime;

      // Assert: Initial render should be fast
      expect(renderTime).toBeLessThan(1000);

      // Page should be interactive immediately
      await waitFor(() => {
        const pageContent = screen.queryByRole('main') || screen.queryByTestId('page-content');
        expect(pageContent).toBeTruthy();
      }, { timeout: 500 });
    });
  });
});
