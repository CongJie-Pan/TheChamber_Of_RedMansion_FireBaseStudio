
/**
 * @fileOverview Achievements and Gamification System for Learning Motivation
 * 
 * This component implements a comprehensive gamification system designed to motivate
 * and reward learners throughout their journey with the Dream of the Red Chamber.
 * It combines achievement tracking, goal setting, progress visualization, and 
 * challenge systems to maintain engagement and provide clear learning milestones.
 * 
 * Key features:
 * - Achievement badge system with categorized accomplishments
 * - Learning statistics dashboard with progress visualization
 * - Customizable goal setting and tracking system
 * - Daily, weekly, and special challenge systems
 * - Social sharing features for achievements
 * - Progress analytics with detailed insights
 * - Reward point system for motivation
 * - Streak tracking for consistent learning habits
 * 
 * Gamification design principles:
 * - Clear progress indicators to maintain motivation
 * - Achievable short-term goals alongside long-term objectives
 * - Variety in challenge types to prevent monotony
 * - Social elements to encourage community engagement
 * - Visual feedback through badges, progress bars, and statistics
 * - Meaningful rewards that enhance the learning experience
 * 
 * Educational psychology considerations:
 * - Intrinsic motivation through meaningful achievements
 * - Scaffolded goal progression from simple to complex
 * - Recognition of different learning styles and preferences
 * - Balance between challenge and achievability
 * - Continuous feedback loops for learning reinforcement
 * 
 * Technical implementation:
 * - State management for dynamic achievement updates
 * - Progress calculations and animated visualizations
 * - Flexible data structures for different achievement types
 * - Integration with user authentication for personalization
 * - Multi-language support for international users
 * - Responsive design for cross-platform accessibility
 * 
 * The system is designed to transform traditional reading into an engaging,
 * game-like experience while maintaining focus on genuine learning outcomes.
 */

"use client"; // Required for interactive gamification features and state updates

// UI component imports for achievement interface
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

// Icon imports for achievement categories and actions
import {
  Award,          // Achievement badges and recognition
  Star,           // Favorite/rating achievements
  BookOpen,       // Reading-related achievements
  Trophy,         // Major accomplishments and milestones
  Share2,         // Social sharing functionality
  ShieldCheck,    // Mastery and expertise badges
  BarChart3       // Statistics and analytics
} from "lucide-react";

// React hooks for component state management
import { useState, useEffect, useCallback } from "react";

// Custom hooks for application functionality
import { useLanguage } from '@/hooks/useLanguage';
import { useSession } from 'next-auth/react';

// Shared utilities
import { formatReadingTime } from '@/lib/format-utils';

// Gamification components
import { LevelDisplay } from '@/components/gamification';

// Placeholder Data - In a real app, these would come from a backend or state management
const getAchievedAchievementsData = (t: (key: string) => string) => [
  { id: "ach1", icon: Award, name: "初窺門徑", description: "完成《紅樓夢》第一回閱讀", date: "2024-05-10", points: 50, category: "閱讀進度" },
  { id: "ach2", icon: Star, name: "日積月累", description: "連續學習 7 天", date: "2024-05-15", points: 100, category: "學習習慣" },
  { id: "ach3", icon: BookOpen, name: "博覽群書", description: "閱讀 3 部專家解讀著作", date: "2024-06-01", points: 150, category: "知識廣度" },
  { id: "ach4", icon: ShieldCheck, name: "判詞解析者", description: "完成所有金陵十二釵判詞筆記", date: "2024-06-20", points: 200, category: "深度理解" },
];

/**
 * Learning stats data interface
 * Task 2.2: Dynamic data from API
 */
interface LearningStatsData {
  totalReadingTime: string;
  totalReadingTimeMinutes: number;
  chaptersCompleted: number;
  totalChapters: number;
  notesTaken: number;
  currentStreak: number;
}

/**
 * Default/fallback learning stats
 */
const getDefaultLearningStats = (t: (key: string) => string): LearningStatsData => ({
  totalReadingTime: `0 ${t('achievements.totalReadingTime').includes('Hours') ? 'Minutes' : '分鐘'}`,
  totalReadingTimeMinutes: 0,
  chaptersCompleted: 0,
  totalChapters: 120,
  notesTaken: 0,
  currentStreak: 0,
});



export default function AchievementsPage() {
  const { t } = useLanguage();
  const { data: session, status: sessionStatus } = useSession();

  const achievedAchievementsData = getAchievedAchievementsData(t);

  const [userAchievements, setUserAchievements] = useState(achievedAchievementsData);

  // Task 2.2: Dynamic learning stats state
  const [learningStatsData, setLearningStatsData] = useState<LearningStatsData>(getDefaultLearningStats(t));
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Task 2.2: Fetch learning stats from API (extracted to reusable function)
  const fetchLearningStats = useCallback(async () => {
    // Only fetch if user is authenticated
    if (sessionStatus === 'loading') return;

    if (sessionStatus !== 'authenticated' || !session?.user) {
      setStatsLoading(false);
      return;
    }

    try {
      setStatsLoading(true);
      setStatsError(null);

      const response = await fetch('/api/user/learning-stats');

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('📊 [Achievements] User not authenticated for stats');
          setStatsLoading(false);
          return;
        }
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.stats) {
        setLearningStatsData(data.stats);
        console.log('📊 [Achievements] Learning stats loaded:', data.stats);
      }
    } catch (error: any) {
      console.error('❌ [Achievements] Failed to fetch learning stats:', error);
      setStatsError(error.message || 'Failed to load learning statistics');
    } finally {
      setStatsLoading(false);
    }
  }, [session, sessionStatus]);

  // Task 2.2: Fetch stats on mount and when session changes
  useEffect(() => {
    fetchLearningStats();
  }, [fetchLearningStats]);

  return (
    <div className="space-y-6 sm:space-y-8 px-4 sm:px-6 lg:px-0">
      <Card className="shadow-xl">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
            <div>
              <CardTitle className="text-2xl sm:text-3xl font-artistic text-primary">{t('achievements.title')}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">{t('achievements.description')}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* User Level System - Detailed Display */}
      <LevelDisplay variant="detailed" showNextLevel />

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl font-artistic text-white flex items-center gap-2"><Star className="text-yellow-400 h-5 w-5 sm:h-6 sm:w-6" /> {t('achievements.myAchievements')}</CardTitle>
          <CardDescription className="text-xs sm:text-sm">{t('achievements.myAchievementsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          {userAchievements.length > 0 ? (
            <ScrollArea className="h-[250px] sm:h-[300px] w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-1">
                {userAchievements.map((ach) => (
                  <Card key={ach.id} className="bg-card/60 hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <ach.icon className="h-8 w-8 text-primary mt-1" />
                        <div>
                          <CardTitle className="text-lg text-white">{ach.name}</CardTitle>
                          <Badge variant="secondary" className="mt-1 text-xs">{ach.category}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">{ach.description}</p>
                      <p className="text-xs text-primary">{t('achievements.rewardPrefix')}{ach.date} (+{ach.points}點)</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <ScrollBar orientation="vertical" />
            </ScrollArea>
          ) : (
            <p className="text-muted-foreground">{t('achievements.noAchievements')}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl font-artistic text-white flex items-center gap-2"><BarChart3 className="text-blue-400 h-5 w-5 sm:h-6 sm:w-6" /> {t('achievements.learningStats')}</CardTitle>
          <CardDescription className="text-xs sm:text-sm">{t('achievements.learningStatsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
          {/* Task 2.2: Loading state */}
          {statsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-center">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-card/50 p-3 sm:p-4 rounded-lg animate-pulse">
                  <div className="h-6 sm:h-8 bg-muted rounded w-12 sm:w-16 mx-auto mb-2"></div>
                  <div className="h-3 sm:h-4 bg-muted rounded w-20 sm:w-24 mx-auto"></div>
                </div>
              ))}
            </div>
          ) : statsError ? (
            /* Task 2.2: Error state with retry using extracted function */
            <div className="text-center py-8">
              <p className="text-destructive mb-2">{statsError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchLearningStats}
              >
                {t('common.retry') || '重試'}
              </Button>
            </div>
          ) : (
            /* Task 2.2: Data display */
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-center">
                <div className="bg-card/50 p-3 sm:p-4 rounded-lg">
                  <p className="text-lg sm:text-2xl font-bold text-primary">{formatReadingTime(learningStatsData.totalReadingTimeMinutes, t)}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{t('achievements.totalReadingTime')}</p>
                </div>
                <div className="bg-card/50 p-3 sm:p-4 rounded-lg">
                  <p className="text-lg sm:text-2xl font-bold text-primary">{learningStatsData.chaptersCompleted} <span className="text-sm sm:text-base text-muted-foreground">/ {learningStatsData.totalChapters}</span></p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{t('achievements.chaptersCompletedFull')}</p>
                </div>
                <div className="bg-card/50 p-3 sm:p-4 rounded-lg">
                  <p className="text-lg sm:text-2xl font-bold text-primary">{learningStatsData.notesTaken}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{t('achievements.notesTaken')}</p>
                </div>
                <div className="bg-card/50 p-3 sm:p-4 rounded-lg">
                  <p className="text-lg sm:text-2xl font-bold text-primary">{learningStatsData.currentStreak} {t('achievements.currentStreak').includes('Days') ? 'Days' : '天'}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{t('achievements.currentStreak')}</p>
                </div>
              </div>
              <div>
                <Label htmlFor="overallProgress" className="text-sm text-muted-foreground">{t('achievements.overallProgress')}</Label>
                <Progress
                  id="overallProgress"
                  value={learningStatsData.totalChapters > 0 ? (learningStatsData.chaptersCompleted / learningStatsData.totalChapters) * 100 : 0}
                  className="w-full h-3 mt-1"
                  indicatorClassName="bg-gradient-to-r from-primary to-yellow-400"
                />
                <p className="text-xs text-right text-muted-foreground mt-1">
                  {learningStatsData.chaptersCompleted} / {learningStatsData.totalChapters} {t('achievements.chaptersUnit')}
                </p>
              </div>
            </>
          )}
          <div className="text-right">
            <Button variant="link" onClick={() => alert(t('achievements.viewDetailedAnalysis'))} className="text-primary">
              {t('achievements.viewDetailedAnalysis')} &rarr;
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
