/**
 * @fileOverview Daily Tasks Page - 每日修身系統主頁面
 *
 * This page serves as the main hub for the Daily Task System (每日修身).
 * Users can view their daily tasks, track progress, maintain streaks, and complete
 * learning activities designed to build consistent study habits.
 *
 * Key features:
 * - Display daily task list with status indicators
 * - Show today's progress statistics
 * - Streak counter with milestone indicators
 * - Task calendar view for historical progress
 * - Task execution modals for each task type
 * - Results display with AI feedback and XP rewards
 *
 * Design principles:
 * - Gamification elements (XP, streaks, achievements)
 * - Clear visual hierarchy for task priorities
 * - Motivational UI with progress indicators
 * - Responsive design for all devices
 * - Multi-language support
 *
 * Technical implementation:
 * - React functional component with hooks
 * - Integration with daily-task-service
 * - Real-time progress updates
 * - Firebase Firestore for data persistence
 * - AI-powered task evaluation
 */

"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Flame,
  Target,
  Award,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Trophy,
  Sparkles,
  TrendingUp,
  Loader2
} from "lucide-react";

// Custom hooks
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useToast } from '@/hooks/use-toast';

// Services
import { dailyTaskService } from '@/lib/daily-task-service';
import { userLevelService } from '@/lib/user-level-service';

// Types
import {
  DailyTask,
  DailyTaskProgress,
  TaskStatus,
  DailyTaskType,
  TaskDifficulty,
  TaskCompletionResult
} from '@/lib/types/daily-task';

// Components (to be implemented)
import { TaskCard } from '@/components/daily-tasks/TaskCard';
import { TaskModal } from '@/components/daily-tasks/TaskModal';
import { TaskResultModal } from '@/components/daily-tasks/TaskResultModal';
import { StreakCounter } from '@/components/daily-tasks/StreakCounter';
import { TaskCalendar } from '@/components/daily-tasks/TaskCalendar';

/**
 * Task statistics for dashboard display
 */
interface TaskStats {
  totalTasks: number;
  completedTasks: number;
  xpEarned: number;
  currentStreak: number;
  completionRate: number;
}

/**
 * Daily Tasks Page Component
 *
 * Main page for the Daily Task System (每日修身)
 * Displays task list, progress statistics, and streak counter
 */
export default function DailyTasksPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();

  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Task data
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [progress, setProgress] = useState<DailyTaskProgress | null>(null);
  const [stats, setStats] = useState<TaskStats>({
    totalTasks: 0,
    completedTasks: 0,
    xpEarned: 0,
    currentStreak: 0,
    completionRate: 0
  });

  // UI states
  const [selectedTask, setSelectedTask] = useState<DailyTask | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [taskResult, setTaskResult] = useState<TaskCompletionResult | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  /**
   * Load daily tasks and progress on component mount
   */
  useEffect(() => {
    if (user) {
      loadDailyTasks();
    }
  }, [user]);

  /**
   * Load or generate daily tasks for the user
   */
  const loadDailyTasks = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      // Try to get existing progress first
      let dailyProgress = await dailyTaskService.getUserDailyProgress(user.uid);

      // If no progress exists, generate new tasks
      if (!dailyProgress) {
        console.log('📝 No existing tasks found, generating new daily tasks...');
        const generatedTasks = await dailyTaskService.generateDailyTasks(user.uid);
        setTasks(generatedTasks);

        // Fetch the newly created progress
        dailyProgress = await dailyTaskService.getUserDailyProgress(user.uid);
      } else {
        // Load existing tasks from assignments
        const taskIds = dailyProgress.tasks.map(t => t.taskId);
        const loadedTasks: DailyTask[] = [];

        for (const taskId of taskIds) {
          const task = await (dailyTaskService as any).getTaskById(taskId);
          if (task) loadedTasks.push(task);
        }

        setTasks(loadedTasks);
      }

      setProgress(dailyProgress);

      // Calculate statistics
      if (dailyProgress) {
        const completedCount = dailyProgress.completedTaskIds.length;
        const totalCount = dailyProgress.tasks.length;

        setStats({
          totalTasks: totalCount,
          completedTasks: completedCount,
          xpEarned: dailyProgress.totalXPEarned,
          currentStreak: dailyProgress.streak,
          completionRate: totalCount > 0 ? (completedCount / totalCount) * 100 : 0
        });
      }

      console.log('✅ Daily tasks loaded successfully');
    } catch (error) {
      console.error('Error loading daily tasks:', error);
      setError('無法載入每日任務，請稍後再試。');
      toast({
        title: '載入失敗',
        description: '無法載入每日任務，請重新整理頁面。',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle task card click - open task modal
   */
  const handleTaskClick = (task: DailyTask) => {
    // Check if task is already completed
    const assignment = progress?.tasks.find(t => t.taskId === task.id);
    if (assignment?.status === TaskStatus.COMPLETED) {
      toast({
        title: '任務已完成',
        description: '這個任務今天已經完成了！',
        duration: 3000,
      });
      return;
    }

    setSelectedTask(task);
    setShowTaskModal(true);
  };

  /**
   * Handle task submission
   */
  const handleTaskSubmit = async (taskId: string, userResponse: string) => {
    if (!user) return;

    try {
      // Submit task completion
      const result = await dailyTaskService.submitTaskCompletion(
        user.uid,
        taskId,
        userResponse
      );

      // Close task modal
      setShowTaskModal(false);
      setSelectedTask(null);

      // Show result modal with AI feedback
      setTaskResult(result);
      setShowResultModal(true);

      // Reload progress
      await loadDailyTasks();

      console.log('✅ Task submitted successfully:', result);
    } catch (error) {
      console.error('Error submitting task:', error);
      toast({
        title: '提交失敗',
        description: error instanceof Error ? error.message : '提交任務時發生錯誤，請稍後再試。',
        variant: 'destructive',
        duration: 5000,
      });
    }
  };

  /**
   * Handle result modal close
   */
  const handleResultClose = () => {
    setShowResultModal(false);
    setTaskResult(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">載入每日任務中...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">載入失敗</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={loadDailyTasks} className="w-full">
              重新載入
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 py-6">
      {/* Page Header with Streak Counter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-artistic text-primary flex items-center gap-3">
            <Target className="h-8 w-8" />
            每日修身
          </h1>
          <p className="text-muted-foreground mt-1">
            持之以恆，日積月累。完成每日任務，提升紅樓學識！
          </p>
        </div>

        {/* Streak Counter */}
        <StreakCounter
          currentStreak={stats.currentStreak}
          size="large"
        />
      </div>

      {/* Progress Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">今日任務</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.completedTasks}/{stats.totalTasks}
                </p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <Progress
              value={stats.completionRate}
              className="mt-3"
            />
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">獲得 XP</p>
                <p className="text-2xl font-bold text-primary">
                  +{stats.xpEarned}
                </p>
              </div>
              <Sparkles className="h-10 w-10 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">連續天數</p>
                <p className="text-2xl font-bold text-orange-500">
                  {stats.currentStreak}
                </p>
              </div>
              <Flame className="h-10 w-10 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">完成率</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.completionRate.toFixed(0)}%
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Tasks List */}
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-artistic text-primary">
                今日任務清單
              </CardTitle>
              <CardDescription>
                完成任務獲得 XP 和屬性點數，提升你的紅樓造詣
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCalendar(!showCalendar)}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              {showCalendar ? '隱藏日曆' : '查看日曆'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Task Calendar (collapsible) */}
          {showCalendar && (
            <div className="mb-6">
              <TaskCalendar userId={user?.uid || ''} />
            </div>
          )}

          {/* Task Cards */}
          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">
                今天還沒有任務，請稍後再試！
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tasks.map((task) => {
                const assignment = progress?.tasks.find(t => t.taskId === task.id);
                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    status={assignment?.status || TaskStatus.NOT_STARTED}
                    score={assignment?.aiScore}
                    onClick={() => handleTaskClick(task)}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Execution Modal */}
      {showTaskModal && selectedTask && (
        <TaskModal
          task={selectedTask}
          open={showTaskModal}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTask(null);
          }}
          onSubmit={handleTaskSubmit}
        />
      )}

      {/* Task Result Modal */}
      {showResultModal && taskResult && (
        <TaskResultModal
          result={taskResult}
          open={showResultModal}
          onClose={handleResultClose}
        />
      )}
    </div>
  );
}
