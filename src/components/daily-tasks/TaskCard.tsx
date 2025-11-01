/**
 * @fileOverview TaskCard Component - Individual Task Display Card
 *
 * This component renders a single daily task as an interactive card.
 * It displays task metadata (type, difficulty, time, rewards) and
 * visual indicators for task status and completion score.
 *
 * Features:
 * - Task type icon and name display
 * - Difficulty badge with color coding
 * - Time estimate indicator
 * - XP and attribute rewards preview
 * - Status indicator (not_started/in_progress/completed)
 * - Score display for completed tasks
 * - Hover effects and animations
 * - Click to open task modal
 */

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Feather,
  Users,
  Landmark,
  BookMarked,
  Clock,
  Sparkles,
  CheckCircle2,
  Circle,
  PlayCircle,
  TrendingUp,
  Flame,
  Brain,
  HeartHandshake
} from "lucide-react";

import { DailyTask, TaskStatus, DailyTaskType, TaskDifficulty } from '@/lib/types/daily-task';
import { cn } from '@/lib/utils';

/**
 * Props for TaskCard component
 */
interface TaskCardProps {
  task: DailyTask;
  status: TaskStatus;
  score?: number;
  onClick: () => void;
}

/**
 * Get icon for task type
 */
const getTaskTypeIcon = (type: DailyTaskType) => {
  const iconClass = "h-6 w-6";
  switch (type) {
    case DailyTaskType.MORNING_READING:
      return <BookOpen className={iconClass} />;
    case DailyTaskType.POETRY:
      return <Feather className={iconClass} />;
    case DailyTaskType.CHARACTER_INSIGHT:
      return <Users className={iconClass} />;
    case DailyTaskType.CULTURAL_EXPLORATION:
      return <Landmark className={iconClass} />;
    case DailyTaskType.COMMENTARY_DECODE:
      return <BookMarked className={iconClass} />;
    default:
      return <BookOpen className={iconClass} />;
  }
};

/**
 * Get display name for task type
 */
const getTaskTypeName = (type: DailyTaskType): string => {
  const names: Record<DailyTaskType, string> = {
    [DailyTaskType.MORNING_READING]: '晨讀時光',
    [DailyTaskType.POETRY]: '詩詞韻律',
    [DailyTaskType.CHARACTER_INSIGHT]: '人物洞察',
    [DailyTaskType.CULTURAL_EXPLORATION]: '文化探秘',
    [DailyTaskType.COMMENTARY_DECODE]: '脂批解密',
  };
  return names[type];
};

/**
 * Get color class for difficulty
 */
const getDifficultyColor = (difficulty: TaskDifficulty): string => {
  const colors: Record<TaskDifficulty, string> = {
    [TaskDifficulty.EASY]: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
    [TaskDifficulty.MEDIUM]: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
    [TaskDifficulty.HARD]: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  };
  return colors[difficulty];
};

/**
 * Get display name for difficulty
 */
const getDifficultyName = (difficulty: TaskDifficulty): string => {
  const names: Record<TaskDifficulty, string> = {
    [TaskDifficulty.EASY]: '簡單',
    [TaskDifficulty.MEDIUM]: '中等',
    [TaskDifficulty.HARD]: '困難',
  };
  return names[difficulty];
};

/**
 * Get status indicator
 */
const getStatusIndicator = (status: TaskStatus) => {
  switch (status) {
    case TaskStatus.COMPLETED:
      return (
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-medium">已完成</span>
        </div>
      );
    case TaskStatus.IN_PROGRESS:
      return (
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <PlayCircle className="h-5 w-5" />
          <span className="text-sm font-medium">進行中</span>
        </div>
      );
    default:
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Circle className="h-5 w-5" />
          <span className="text-sm font-medium">未開始</span>
        </div>
      );
  }
};

/**
 * Get icon for attribute type
 */
const getAttributeIcon = (attributeName: string) => {
  const iconClass = "h-4 w-4";
  switch (attributeName) {
    case 'poetrySkill':
      return <Feather className={iconClass} />;
    case 'culturalKnowledge':
      return <Landmark className={iconClass} />;
    case 'analyticalThinking':
      return <Brain className={iconClass} />;
    case 'socialInfluence':
      return <HeartHandshake className={iconClass} />;
    default:
      return <TrendingUp className={iconClass} />;
  }
};

/**
 * Get display name for attribute
 */
const getAttributeName = (attributeName: string): string => {
  const names: Record<string, string> = {
    poetrySkill: '詩詞造詣',
    culturalKnowledge: '文化知識',
    analyticalThinking: '分析思維',
    socialInfluence: '社交影響',
    learningPersistence: '學習毅力',
  };
  return names[attributeName] || attributeName;
};

/**
 * TaskCard Component
 *
 * Displays a single daily task with metadata and status
 */
export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  status,
  score,
  onClick
}) => {
  const isCompleted = status === TaskStatus.COMPLETED;
  const isClickable = status !== TaskStatus.COMPLETED;

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        isClickable && "cursor-pointer hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-1",
        isCompleted && "opacity-75 bg-muted/30",
        !isClickable && "cursor-default"
      )}
      onClick={isClickable ? onClick : undefined}
    >
      {/* Completion overlay */}
      {isCompleted && (
        <div className="absolute top-0 right-0 p-3">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
        </div>
      )}

      <CardContent className="p-6">
        {/* Task Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {getTaskTypeIcon(task.type)}
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">
                {getTaskTypeName(task.type)}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {task.title}
              </p>
            </div>
          </div>
        </div>

        {/* Task Description */}
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {task.description}
        </p>

        {/* Task Metadata */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Difficulty Badge */}
          <Badge
            variant="outline"
            className={cn("text-xs", getDifficultyColor(task.difficulty))}
          >
            {getDifficultyName(task.difficulty)}
          </Badge>

          {/* Time Estimate */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{task.timeEstimate} 分鐘</span>
          </div>

          {/* Status Indicator */}
          <div className="ml-auto">
            {getStatusIndicator(status)}
          </div>
        </div>

        {/* Rewards Section */}
        <div className="border-t border-border/50 pt-4 mt-4">
          <p className="text-xs text-muted-foreground mb-2">獎勵預覽：</p>
          <div className="flex items-center justify-between">
            {/* XP Reward */}
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                +{task.xpReward} XP
              </span>
            </div>

            {/* Attribute Rewards */}
            <div className="flex items-center gap-3">
              {/* Phase 4-T1: Added defensive null check to prevent TypeError */}
              {Object.entries(task.attributeRewards || {}).map(([attr, value]) => (
                value > 0 && (
                  <div key={attr} className="flex items-center gap-1" title={getAttributeName(attr)}>
                    {getAttributeIcon(attr)}
                    <span className="text-xs text-muted-foreground">
                      +{value}
                    </span>
                  </div>
                )
              ))}
            </div>
          </div>
        </div>

        {/* Score Display for Completed Tasks */}
        {isCompleted && score !== undefined && (
          <div className="border-t border-border/50 pt-4 mt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">完成分數：</span>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "px-3 py-1 rounded-full text-sm font-bold",
                  score >= 85 && "bg-green-500/20 text-green-700 dark:text-green-400",
                  score >= 70 && score < 85 && "bg-blue-500/20 text-blue-700 dark:text-blue-400",
                  score >= 60 && score < 70 && "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
                  score < 60 && "bg-red-500/20 text-red-700 dark:text-red-400"
                )}>
                  {score} 分
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
