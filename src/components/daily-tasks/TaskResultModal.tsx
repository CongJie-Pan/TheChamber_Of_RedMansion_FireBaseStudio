/**
 * @fileOverview TaskResultModal Component - Task Completion Result Display
 *
 * This component displays the results after a user completes a daily task.
 * Shows AI-generated score, feedback, XP rewards, attribute gains, and level-up notifications.
 *
 * Features:
 * - Score display with color coding
 * - AI feedback and analysis
 * - XP gain animation
 * - Attribute points earned
 * - Streak bonus indicator
 * - Level-up celebration (if applicable)
 * - Confetti animation for high scores
 */

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Award,
  Sparkles,
  TrendingUp,
  Trophy,
  Flame,
  Star,
  Zap,
  Feather,
  Landmark,
  Brain,
  HeartHandshake
} from "lucide-react";

import { TaskCompletionResult } from '@/lib/types/daily-task';
import { LevelUpModal } from '@/components/gamification';
import { cn } from '@/lib/utils';

interface TaskResultModalProps {
  result: TaskCompletionResult;
  open: boolean;
  onClose: () => void;
}

/**
 * Get score color class
 */
const getScoreColor = (score: number): string => {
  if (score >= 85) return 'text-green-600 dark:text-green-400';
  if (score >= 70) return 'text-blue-600 dark:text-blue-400';
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

/**
 * Get score description
 */
const getScoreDescription = (score: number): string => {
  if (score >= 85) return '優秀';
  if (score >= 70) return '良好';
  if (score >= 60) return '及格';
  return '需努力';
};

/**
 * Get attribute icon
 */
const getAttributeIcon = (attributeName: string) => {
  const iconClass = "h-5 w-5";
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
 * Get attribute name
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
 * TaskResultModal Component
 */
export const TaskResultModal: React.FC<TaskResultModalProps> = ({
  result,
  open,
  onClose
}) => {
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);

  /**
   * Animate score on mount
   */
  useEffect(() => {
    if (open) {
      let startTime: number | null = null;
      const duration = 1000; // 1 second animation

      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        setAnimatedScore(Math.floor(progress * result.score));

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [open, result.score]);

  /**
   * Show level-up modal if user leveled up
   */
  useEffect(() => {
    if (result.leveledUp) {
      // Delay level-up modal to show after result modal
      setTimeout(() => {
        setShowLevelUp(true);
      }, 2000);
    }
  }, [result.leveledUp]);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-artistic text-center">
              🎉 任務完成！
            </DialogTitle>
            <DialogDescription className="text-center">
              查看你的表現和獲得的獎勵
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Score Display */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 mb-4">
                <div className="text-center">
                  <div className={cn("text-5xl font-bold", getScoreColor(result.score))}>
                    {animatedScore}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    / 100 分
                  </div>
                </div>
              </div>
              <div>
                <Badge
                  variant="secondary"
                  className={cn("text-lg px-4 py-1", getScoreColor(result.score))}
                >
                  {getScoreDescription(result.score)}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* AI Feedback */}
            <div>
              <h4 className="font-semibold text-base mb-2 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                AI 評語
              </h4>
              <div className="bg-muted/30 rounded-lg p-4 border border-border">
                <p className="text-sm leading-relaxed whitespace-pre-line">
                  {result.feedback}
                </p>
              </div>
            </div>

            <Separator />

            {/* Rewards Section */}
            <div>
              <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                獲得獎勵
              </h4>

              {/* XP Reward */}
              <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg p-4 border border-yellow-500/20 mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/20 rounded-lg">
                      <Sparkles className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-yellow-700 dark:text-yellow-300">
                        經驗值 (XP)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        提升角色等級
                      </p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    +{result.xpAwarded}
                  </div>
                </div>

                {/* Streak Bonus */}
                {result.streakBonus && result.streakBonus > 0 && (
                  <div className="mt-2 pt-2 border-t border-yellow-500/20">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                        <Flame className="h-4 w-4" />
                        連擊獎勵 ({result.newStreak} 天)
                      </span>
                      <span className="font-semibold text-orange-600 dark:text-orange-400">
                        +{result.streakBonus} XP
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Attribute Gains */}
              {Object.keys(result.attributeGains).length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(result.attributeGains).map(([attr, value]) => (
                    value > 0 && (
                      <div
                        key={attr}
                        className="bg-primary/5 rounded-lg p-3 border border-primary/20"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getAttributeIcon(attr)}
                            <span className="text-sm font-medium">
                              {getAttributeName(attr)}
                            </span>
                          </div>
                          <span className="text-lg font-bold text-primary">
                            +{value}
                          </span>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>

            {/* Streak Milestone */}
            {result.isStreakMilestone && (
              <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-lg p-4 border border-orange-500/20">
                <div className="flex items-center gap-3">
                  <Trophy className="h-8 w-8 text-orange-500" />
                  <div>
                    <p className="font-semibold text-orange-700 dark:text-orange-300">
                      🎊 達成里程碑！
                    </p>
                    <p className="text-sm text-muted-foreground">
                      你已經連續完成 {result.newStreak} 天任務！
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Level Up Preview */}
            {result.leveledUp && (
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg p-4 border border-purple-500/20">
                <div className="flex items-center gap-3">
                  <Zap className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="font-semibold text-purple-700 dark:text-purple-300">
                      🎉 等級提升！
                    </p>
                    <p className="text-sm text-muted-foreground">
                      恭喜！你已經從 Level {result.fromLevel} 晉升至 Level {result.newLevel}！
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={onClose} className="w-full">
              確認
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Level-Up Modal */}
      {result.leveledUp && result.fromLevel !== undefined && result.newLevel && (
        <LevelUpModal
          open={showLevelUp}
          onOpenChange={setShowLevelUp}
          fromLevel={result.fromLevel}
          toLevel={result.newLevel}
        />
      )}
    </>
  );
};
