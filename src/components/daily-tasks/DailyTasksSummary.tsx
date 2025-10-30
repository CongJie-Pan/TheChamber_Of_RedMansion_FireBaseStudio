/**
 * @fileOverview DailyTasksSummary Component - Dashboard Quick View
 *
 * This component provides a quick overview of daily tasks for the dashboard.
 * Shows today's completion status and provides a quick access button.
 *
 * Features:
 * - Today's task completion progress
 * - Current streak display
 * - Quick access to daily tasks page
 * - Visual progress indicators
 * - Motivational messages
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  CheckCircle2,
  Flame,
  ArrowRight,
  Loader2
} from "lucide-react";
import Link from 'next/link';

import { dailyTaskClientService } from '@/lib/daily-task-client-service';
import { DailyTaskProgress, TaskStatus } from '@/lib/types/daily-task';
import { useAuth } from '@/hooks/useAuth';

/**
 * DailyTasksSummary Component
 *
 * Displays a summary card for daily tasks on the dashboard
 */
export const DailyTasksSummary: React.FC = () => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<DailyTaskProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load today's progress
   */
  useEffect(() => {
    if (user) {
      loadProgress();
    }
  }, [user]);

  const loadProgress = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const todayProgress = await dailyTaskClientService.getUserDailyProgress(user.id);
      setProgress(todayProgress);
    } catch (error) {
      console.error('Error loading daily tasks progress:', error);
      setError('無法載入每日任務進度');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate statistics
  const totalTasks = progress?.tasks.length || 0;
  const completedTasks = progress?.completedTaskIds.length || 0;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const currentStreak = progress?.streak || 0;
  const xpEarned = progress?.totalXPEarned || 0;

  // Loading state
  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-artistic text-primary flex items-center gap-2">
            <Target className="h-6 w-6" />
            每日修身
          </CardTitle>
          <CardDescription>今日學習任務</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Link href="/daily-tasks">
            <Button className="w-full">
              前往任務頁面
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // No tasks yet
  if (!progress) {
    return (
      <Card className="shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader>
          <CardTitle className="text-xl font-artistic text-primary flex items-center gap-2">
            <Target className="h-6 w-6" />
            每日修身
          </CardTitle>
          <CardDescription>開始你的每日學習旅程</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            今天還沒有生成任務，點擊下方按鈕開始你的每日修身！
          </p>
          <Link href="/daily-tasks">
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              開始今日任務
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Has tasks - show summary
  const allCompleted = completionRate === 100;

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-artistic text-primary flex items-center gap-2">
              <Target className="h-6 w-6" />
              每日修身
            </CardTitle>
            <CardDescription>持之以恆，日積月累</CardDescription>
          </div>

          {/* Streak Badge */}
          {currentStreak > 0 && (
            <Badge
              variant="secondary"
              className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20"
            >
              <Flame className="h-3 w-3 mr-1" />
              {currentStreak} 天
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Display */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">今日進度</span>
            <span className="text-sm font-semibold text-foreground">
              {completedTasks} / {totalTasks} 完成
            </span>
          </div>
          <Progress value={completionRate} className="h-2" />
        </div>

        {/* XP Earned */}
        {xpEarned > 0 && (
          <div className="flex items-center justify-between py-2 px-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
            <span className="text-sm text-muted-foreground">今日獲得 XP</span>
            <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
              +{xpEarned}
            </span>
          </div>
        )}

        {/* Status Message */}
        {allCompleted ? (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              太棒了！今天的任務全部完成！
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              還有 {totalTasks - completedTasks} 個任務待完成
            </span>
          </div>
        )}

        {/* Action Button */}
        <Link href="/daily-tasks">
          <Button
            className="w-full"
            variant={allCompleted ? "outline" : "default"}
          >
            {allCompleted ? '查看詳情' : '前往完成任務'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};
