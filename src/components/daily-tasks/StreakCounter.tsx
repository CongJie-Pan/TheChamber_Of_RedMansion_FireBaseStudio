/**
 * @fileOverview StreakCounter Component - Streak Display Widget
 *
 * This component displays the user's current streak (consecutive days of task completion).
 * Features milestone indicators and motivational messaging.
 *
 * Features:
 * - Flame icon with animated glow effect
 * - Current streak counter
 * - Milestone badges (7/30/100 days)
 * - Motivational text
 * - Size variants (small, medium, large)
 */

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Trophy, Award } from "lucide-react";
import { cn } from '@/lib/utils';

interface StreakCounterProps {
  currentStreak: number;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

/**
 * Streak milestones
 */
const MILESTONES = [
  { days: 7, label: '週度堅持', icon: Flame, color: 'text-orange-500' },
  { days: 30, label: '月度成就', icon: Award, color: 'text-yellow-500' },
  { days: 100, label: '百日修行', icon: Trophy, color: 'text-purple-500' },
];

/**
 * Get the next milestone
 */
const getNextMilestone = (currentStreak: number) => {
  return MILESTONES.find(m => m.days > currentStreak) || null;
};

/**
 * Get achieved milestones
 */
const getAchievedMilestones = (currentStreak: number) => {
  return MILESTONES.filter(m => currentStreak >= m.days);
};

/**
 * StreakCounter Component
 */
export const StreakCounter: React.FC<StreakCounterProps> = ({
  currentStreak,
  size = 'medium',
  className
}) => {
  const nextMilestone = getNextMilestone(currentStreak);
  const achievedMilestones = getAchievedMilestones(currentStreak);
  const latestAchieved = achievedMilestones[achievedMilestones.length - 1];

  // Size configurations
  const sizeConfig = {
    small: {
      card: 'p-3',
      flame: 'h-6 w-6',
      text: 'text-lg',
      label: 'text-xs'
    },
    medium: {
      card: 'p-4',
      flame: 'h-8 w-8',
      text: 'text-2xl',
      label: 'text-sm'
    },
    large: {
      card: 'p-6',
      flame: 'h-12 w-12',
      text: 'text-4xl',
      label: 'text-base'
    }
  };

  const config = sizeConfig[size];

  return (
    <Card className={cn("bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20", className)}>
      <CardContent className={config.card}>
        <div className="flex items-center gap-4">
          {/* Flame Icon with Glow */}
          <div className="relative">
            <div className="absolute inset-0 animate-pulse">
              <Flame className={cn(config.flame, "text-orange-500/30 blur-md")} />
            </div>
            <Flame className={cn(config.flame, "relative text-orange-500 drop-shadow-lg")} />
          </div>

          {/* Streak Counter */}
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className={cn(config.text, "font-bold text-orange-600 dark:text-orange-400")}>
                {currentStreak}
              </span>
              <span className={cn(config.label, "text-muted-foreground")}>
                天連擊
              </span>
            </div>

            {/* Milestone Info */}
            {latestAchieved && (
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="secondary"
                  className="text-xs bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30"
                >
                  <latestAchieved.icon className="h-3 w-3 mr-1" />
                  {latestAchieved.label}
                </Badge>
              </div>
            )}

            {/* Next Milestone */}
            {nextMilestone && (
              <p className={cn(config.label, "text-muted-foreground mt-1")}>
                距離「{nextMilestone.label}」還差 {nextMilestone.days - currentStreak} 天
              </p>
            )}

            {/* Max Milestone Reached */}
            {!nextMilestone && currentStreak >= 100 && (
              <p className={cn(config.label, "text-purple-600 dark:text-purple-400 font-medium mt-1")}>
                🎉 已達最高成就！持續保持！
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
