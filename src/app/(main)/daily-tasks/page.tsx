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

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Loader2,
  Zap
} from "lucide-react";

// Custom hooks
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useToast } from '@/hooks/use-toast';

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
 * ========================================
 * API Wrapper Functions
 * ========================================
 * These functions call server-side API routes to avoid loading SQLite in browser
 */

/**
 * Fetch user daily progress via API route
 */
async function getUserDailyProgress(userId: string): Promise<DailyTaskProgress | null> {
  try {
    const response = await fetch(
      `/api/daily-tasks/progress?userId=${encodeURIComponent(userId)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch daily progress: ${response.status}`);
      return null;
    }

    const progress = await response.json();
    return progress;
  } catch (error) {
    console.error('Error fetching daily progress:', error);
    return null;
  }
}

/**
 * Daily Tasks Page Component
 *
 * Main page for the Daily Task System (每日修身)
 * Displays task list, progress statistics, and streak counter
 */
export default function DailyTasksPage() {
  const { t } = useLanguage();
  const { user, userProfile, refreshUserProfile } = useAuth();
  const { toast } = useToast();
  const llmOnly = process.env.NEXT_PUBLIC_LLM_ONLY_MODE === 'true';

  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔧 PREVENT REPEATED TASK GENERATION: Track if tasks have been loaded
  const hasLoadedTasksRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);

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
  const [ephemeralMode, setEphemeralMode] = useState(false);

  // Challenges data (placeholder - in production, this would come from Firebase)
  const challengesData = {
    daily: [
      { id: "daily1", name: "今日閱讀挑戰", description: "今日閱讀《紅樓夢》30分鐘", reward: "20 XP", active: true },
      { id: "daily2", name: "每日一問", description: "回答一個關於今日閱讀內容的問題", reward: "10 XP", active: false },
    ],
    weekly: [
      { id: "weekly1", name: "本週章回衝刺", description: "本週完成3個章回的閱讀與筆記", reward: "100 XP", active: true },
    ],
    special: [
      { id: "special1", name: "紅樓詩詞大賞", description: "參與《紅樓夢》詩詞賞析與創作活動", reward: "特殊徽章 + 200 XP", active: false },
    ],
  };

  /**
   * 🔧 ENHANCED: Load daily tasks and progress on component mount with duplicate prevention
   * For guest users: Reset today's tasks ONLY on first login (not on page refresh)
   * Prevents repeated task generation by tracking load state
   */
  useEffect(() => {
    if (!user) return;

    // 🔧 PREVENT REPEATED LOADS: Check if tasks already loaded for this user
    if (hasLoadedTasksRef.current && currentUserIdRef.current === user.id) {
      console.log('✅ [DailyTasks] Tasks already loaded for this user, skipping...');
      return;
    }

    // 🔧 RESET FLAGS: If user changed, reset the loaded flag
    if (currentUserIdRef.current !== user.id) {
      console.log('🔄 [DailyTasks] User changed, resetting load flags');
      hasLoadedTasksRef.current = false;
      currentUserIdRef.current = user.id;
    }

    console.log(`📋 [DailyTasks] Loading tasks for user: ${user.id}`);

    // Check if user is a guest (anonymous user)
    if (!llmOnly && userProfile?.isGuest) {
      // Check if we've already reset tasks in this session
      const sessionKey = `guest-tasks-reset-${user.id}`;
      const hasResetInSession = sessionStorage.getItem(sessionKey);

      if (!hasResetInSession) {
        console.log('🧪 Guest user first login - resetting today\'s tasks...');
        resetTodayTasksForGuest();
        // Mark as reset in current session
        sessionStorage.setItem(sessionKey, 'true');
      } else {
        console.log('🧪 Guest user session active - loading existing tasks...');
        loadDailyTasks();
      }
    } else {
      loadDailyTasks();
    }

    // 🔧 MARK AS LOADED: Prevent repeated calls
    hasLoadedTasksRef.current = true;
  }, [user, user?.id]); // Added user.id to dependencies for better tracking

  /**
   * Reset today's tasks for guest users
   * Deletes today's progress and regenerates tasks for testing
   */
  const resetTodayTasksForGuest = async () => {
    if (!user || !userProfile?.isGuest || llmOnly) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fixed: Remove direct server-side service call
      // Guest users can refresh page to regenerate tasks
      // For now, simply reload tasks (which will regenerate if needed)
      await loadDailyTasks();

      console.log('✅ Guest user tasks reset successfully');
      toast({
        title: '重置成功',
        description: '每日任務已重新載入',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error resetting guest tasks:', error);
      setError('無法重置每日任務，請稍後再試。');
      toast({
        title: '重置失敗',
        description: '無法重置今日任務，請重新整理頁面。',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load or generate daily tasks for the user (non-blocking)
   * Shows page immediately and loads tasks in background
   */
  const loadDailyTasks = async () => {
    if (!user) return;

    // Show page immediately, load tasks in background
    setIsLoading(false);
    setError(null);

    try {
      // LLM-only mode: skip Firestore and always fetch tasks via API
      if (llmOnly) {
        // Show loading skeletons while generating
        const resp = await fetch('/api/daily-tasks/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, userLevel: 2 }),
        });
        if (!resp.ok) {
          const errJson = await resp.json().catch(() => ({}));
          throw new Error(errJson?.error || `Failed to generate tasks: ${resp.status}`);
        }
        const data = await resp.json();
        setTasks(data?.tasks || []);
        setProgress(null);
        setEphemeralMode(true);
        setStats({ totalTasks: (data?.tasks || []).length, completedTasks: 0, xpEarned: 0, currentStreak: 0, completionRate: 0 });
        return;
      }

      // Try to get existing progress first (quick check)
      let dailyProgress = await getUserDailyProgress(user.id);

      // If no progress exists, generate new tasks in background (via server API)
      if (!dailyProgress) {
        console.log('📝 No existing tasks found, generating new daily tasks in background...');
        setIsGeneratingTasks(true);

        // Generate tasks in background without blocking UI
        (async () => {
          try {
            const resp = await fetch('/api/daily-tasks/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id }),
            });
            if (!resp.ok) {
              const errJson = await resp.json().catch(() => ({}));
              throw new Error(errJson?.error || `Failed to generate tasks: ${resp.status}`);
            }
            const data = await resp.json();
            const generatedTasks = data?.tasks || [];

            // Mark ephemeral mode if server could not persist
            if (data?.ephemeral) {
              setEphemeralMode(true);
            } else {
              setEphemeralMode(false);
            }

            setTasks(generatedTasks);

            // Fetch the newly created progress only if not in ephemeral mode
            if (!data?.ephemeral) {
              const newProgress = await getUserDailyProgress(user.id);
              if (newProgress) {
                setProgress(newProgress);
                updateStats(newProgress);
              }
            }

            console.log('✅ Tasks generated successfully in background');
          } catch (e) {
            console.error('Error generating tasks in background:', e);
            setError('任務生成失敗，請重新整理頁面。');
            toast({
              title: '生成失敗',
              description: '無法生成每日任務，請重新整理頁面。',
              variant: 'destructive',
              duration: 5000,
            });
          } finally {
            setIsGeneratingTasks(false);
          }
        })();

        // Show empty state while generating
        setTasks([]);
        setProgress(null);
        setStats({ totalTasks: 0, completedTasks: 0, xpEarned: 0, currentStreak: 0, completionRate: 0 });
      } else {
        // Phase 2-T1 Fix: Use dedicated tasks endpoint to fetch existing tasks without regeneration
        // Get task IDs from progress
        const taskIds = dailyProgress.tasks.map(t => t.taskId);

        console.log(`📋 Loading existing tasks (${taskIds.length}) without regeneration`);

        // Fetch complete task details via tasks API (NOT generate API)
        const resp = await fetch(`/api/daily-tasks/tasks?taskIds=${taskIds.join(',')}`);

        if (resp.ok) {
          const data = await resp.json();
          const loadedTasks = data?.tasks || [];
          setTasks(loadedTasks);
          console.log(`✅ Loaded ${loadedTasks.length} existing tasks`);
        } else {
          console.warn('Failed to fetch task details, tasks may be missing');
          setTasks([]);
        }

        setProgress(dailyProgress);
        updateStats(dailyProgress);
      }

      console.log('✅ Daily tasks page loaded');
    } catch (error) {
      console.error('Error loading daily tasks:', error);
      setError('無法載入每日任務，請稍後再試。');
      toast({
        title: '載入失敗',
        description: '無法載入每日任務，請重新整理頁面。',
        variant: 'destructive',
        duration: 5000,
      });
    }
  };

  /**
   * Helper function to update statistics from progress
   */
  const updateStats = (dailyProgress: DailyTaskProgress) => {
    const completedCount = dailyProgress.completedTaskIds.length;
    const totalCount = dailyProgress.tasks.length;

    setStats({
      totalTasks: totalCount,
      completedTasks: completedCount,
      xpEarned: dailyProgress.totalXPEarned,
      currentStreak: dailyProgress.streak,
      completionRate: totalCount > 0 ? (completedCount / totalCount) * 100 : 0
    });
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
      // Submit task completion via server API to ensure GPT runs server-side
      const resp = await fetch('/api/daily-tasks/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, taskId, userResponse, task: selectedTask }),
      });
      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson?.error || `Failed to submit task: ${resp.status}`);
      }
      const { result } = await resp.json();

      // Close task modal
      setShowTaskModal(false);
      setSelectedTask(null);

      // Show result modal with AI feedback
      setTaskResult(result);
      setShowResultModal(true);

      // Reload progress only when not in ephemeral mode
      if (!ephemeralMode && !llmOnly) {
        // 🔧 RESET LOAD FLAG: Allow reload to fetch updated progress
        hasLoadedTasksRef.current = false;
        await loadDailyTasks();
        hasLoadedTasksRef.current = true;
        // Refresh user profile so XP/等級在所有顯示處即時更新
        await refreshUserProfile();
      }

      // Quick feedback toast for XP gain (ResultModal remains for detailed feedback)
      if (result?.xpAwarded && result.xpAwarded > 0) {
        toast({
          title: '獲得經驗值',
          description: `+${result.xpAwarded} XP`,
          duration: 3000,
        });
      }

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
            每日修身/挑戰賽
          </h1>
          <p className="text-muted-foreground mt-1">
            持之以恆，日積月累。完成每日任務與挑戰賽，提升紅樓學識！
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
              <TaskCalendar userId={user?.id || ''} />
            </div>
          )}

          {/* Task Cards */}
          {tasks.length === 0 ? (
            <div className="text-center py-12">
              {isGeneratingTasks ? (
                <>
                  <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto mb-4" />
                  <p className="text-lg text-foreground font-medium">
                    正在生成今日任務...
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    AI 正在根據您的學習進度生成個性化任務
                  </p>
                </>
              ) : (
                <>
                  <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg text-muted-foreground">
                    今天還沒有任務，請稍後再試！
                  </p>
                </>
              )}
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

      {/* 學習挑戰賽系統 */}
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Zap className="h-8 w-8 text-orange-400" />
            <div>
              <CardTitle className="text-2xl font-artistic text-primary">學習挑戰賽</CardTitle>
              <CardDescription>
                參與挑戰賽，獲得額外 XP 獎勵和榮譽徽章
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="daily">每日挑戰</TabsTrigger>
              <TabsTrigger value="weekly">每週挑戰</TabsTrigger>
              <TabsTrigger value="special">特殊活動</TabsTrigger>
            </TabsList>

            {/* 每日挑戰 */}
            <TabsContent value="daily">
              {challengesData.daily.length > 0 ? (
                <div className="space-y-3">
                  {challengesData.daily.map(challenge => (
                    <Card key={challenge.id} className={`bg-card/60 p-4 ${challenge.active ? 'border-primary' : ''}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-white">{challenge.name}</h4>
                          <p className="text-xs text-muted-foreground">{challenge.description}</p>
                          <p className="text-xs text-amber-400 mt-1">獎勵：{challenge.reward}</p>
                        </div>
                        <Button
                          size="sm"
                          variant={challenge.active ? "default" : "outline"}
                          onClick={() => alert(`參與挑戰：${challenge.name}`)}
                        >
                          {challenge.active ? '進行中' : '開始挑戰'}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">暫無每日挑戰</p>
              )}
            </TabsContent>

            {/* 每週挑戰 */}
            <TabsContent value="weekly">
              {challengesData.weekly.length > 0 ? (
                <div className="space-y-3">
                  {challengesData.weekly.map(challenge => (
                    <Card key={challenge.id} className={`bg-card/60 p-4 ${challenge.active ? 'border-primary' : ''}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-white">{challenge.name}</h4>
                          <p className="text-xs text-muted-foreground">{challenge.description}</p>
                          <p className="text-xs text-amber-400 mt-1">獎勵：{challenge.reward}</p>
                        </div>
                        <Button
                          size="sm"
                          variant={challenge.active ? "default" : "outline"}
                          onClick={() => alert(`參與挑戰：${challenge.name}`)}
                        >
                          {challenge.active ? '進行中' : '開始挑戰'}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">暫無每週挑戰</p>
              )}
            </TabsContent>

            {/* 特殊活動 */}
            <TabsContent value="special">
              {challengesData.special.length > 0 ? (
                <div className="space-y-3">
                  {challengesData.special.map(challenge => (
                    <Card key={challenge.id} className={`bg-card/60 p-4 ${challenge.active ? 'border-primary' : ''}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-white">{challenge.name}</h4>
                          <p className="text-xs text-muted-foreground">{challenge.description}</p>
                          <p className="text-xs text-amber-400 mt-1">獎勵：{challenge.reward}</p>
                        </div>
                        <Button
                          size="sm"
                          variant={challenge.active ? "default" : "outline"}
                          onClick={() => alert(`${challenge.active ? '參與挑戰' : '查看活動'}：${challenge.name}`)}
                        >
                          {challenge.active ? '進行中' : '查看活動'}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">暫無特殊活動</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
