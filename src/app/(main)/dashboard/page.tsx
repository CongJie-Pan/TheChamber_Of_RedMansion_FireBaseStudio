/**
 * @fileOverview User Dashboard - Learning Progress and Overview
 *
 * The dashboard serves as the main hub for users to track their learning progress,
 * view reading statistics, and manage learning goals.
 * This component provides a comprehensive overview of the user's engagement
 * with the Dream of the Red Chamber learning platform.
 *
 * Key features:
 * - Animated circular progress indicator showing chapter completion
 * - Learning statistics cards with icons and visual indicators
 * - Daily tasks summary with XP tracking
 * - Responsive grid layout optimized for different screen sizes
 * - Multi-language support with dynamic content translation
 * - Interactive hover effects and smooth animations
 *
 * Design principles:
 * - Clean, informative interface minimizing cognitive load
 * - Progressive disclosure of information through organized sections
 * - Visual hierarchy using cards, typography, and iconography
 * - Consistent theming matching the classical Chinese aesthetic
 * - Accessibility through proper contrast and keyboard navigation
 *
 * Technical implementation:
 * - React functional component with hooks for state management
 * - Animated SVG progress circle with smooth transitions
 * - CSS animations and transforms for enhanced user experience
 * - Responsive design using CSS Grid and Flexbox
 * - Integration with custom hooks for language and utilities
 *
 * Educational approach:
 * - Gamification elements to maintain engagement
 * - Progress visualization to encourage completion
 * - Daily tasks for structured learning
 *
 * The dashboard is designed to motivate continued learning while providing
 * clear insights into user progress and achievements within the platform.
 */

"use client"; // Required for client-side state management and animations

// UI component imports for dashboard interface
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Icon imports for visual indicators and navigation
import {
  Activity,        // Learning activity metrics
  Edit3,           // Note-taking and writing activities
  RefreshCw        // Task 2.2: Retry button icon
} from "lucide-react";

// React hooks for component state and lifecycle
import { useState, useEffect, useCallback } from 'react';

// Utility functions and custom hooks
import { formatReadingTime } from "@/lib/format-utils";
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useSession } from 'next-auth/react';

/**
 * Task 2.2: Learning stats data interface for dynamic API data
 */
interface LearningStatsData {
  totalReadingTime: string;
  totalReadingTimeMinutes: number;
  chaptersCompleted: number;
  totalChapters: number;
  notesTaken: number;
  currentStreak: number;
}

// Phase 4-T1: Guest account detection
import { isGuestAccount } from '@/lib/middleware/guest-account';

// Gamification components
import { LevelDisplay } from '@/components/gamification';

// Daily Tasks components
import { DailyTasksSummary } from '@/components/daily-tasks';


/**
 * Props interface for statistical display cards
 * Used for consistent layout and typing of dashboard statistics
 */
interface StatCardProps {
  value: string;      // The statistic value to display (e.g., "75%", "35 小時")
  label: string;      // Descriptive label for the statistic
  icon?: React.ElementType; // Optional icon component for visual representation
}

/**
 * StatCard Component - Individual Statistic Display Card
 * 
 * Displays a single learning statistic with optional icon, value, and label.
 * Features hover animations and consistent styling for dashboard metrics.
 * 
 * @param value - The numerical or text value to display prominently
 * @param label - Descriptive text below the value
 * @param icon - Optional Lucide icon component for visual context
 * @returns Styled card component with statistic information
 */
const StatCard: React.FC<StatCardProps> = ({ value, label, icon: Icon }) => (
  <Card className="w-[120px] h-[80px] bg-card flex flex-col items-center justify-center p-2 transition-transform hover:scale-105 focus:scale-105 cursor-pointer shadow-md">
    {Icon && <Icon className="h-5 w-5 mb-1 text-primary" />}
    <h2 className="text-xl font-semibold text-primary">{value}</h2>
    <p className="text-xs text-muted-foreground text-center">{label}</p>
  </Card>
);


/**
 * Dashboard Page Component - Main Learning Overview Interface
 * 
 * This is the primary dashboard page that users see upon logging in.
 * It provides a comprehensive overview of their learning journey including
 * progress tracking, statistics, recent activities, and goal management.
 * 
 * Component architecture:
 * 1. Animated Progress Section - Visual chapter completion indicator
 * 2. Statistics Grid - Key learning metrics with icons
 * 3. Recent Activity Carousel - Horizontal scrollable book list
 * 4. Learning Goals Checklist - Goal tracking and management
 * 
 * @returns Complete dashboard interface with all sections
 */
export default function DashboardPage() {
  // Language support for internationalization
  const { t } = useLanguage();

  // Phase 4-T1: Get user for guest account detection
  const { user } = useAuth();

  // Task 2.2: Get session for API authentication
  const { data: session, status: sessionStatus } = useSession();

  // Task 2.2: Dynamic learning stats state
  const [learningStats, setLearningStats] = useState<LearningStatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Computed values from API data or defaults
  const completedChapters = learningStats?.chaptersCompleted ?? 0;
  const totalChapters = learningStats?.totalChapters ?? 120;

  // State for animated progress circle
  const [animatedProgress, setAnimatedProgress] = useState(0);

  /**
   * Task 2.2: Fetch learning stats from API
   * Reusable callback function for initial load and retry
   */
  const fetchLearningStats = useCallback(async () => {
    // Wait for session to load
    if (sessionStatus === 'loading') return;

    // Only fetch for authenticated users
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
          console.warn('📊 [Dashboard] User not authenticated for stats');
          setStatsLoading(false);
          return;
        }
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.stats) {
        setLearningStats(data.stats);
        console.log('📊 [Dashboard] Learning stats loaded:', data.stats);
      }
    } catch (error: any) {
      console.error('❌ [Dashboard] Failed to fetch learning stats:', error);
      setStatsError(error.message || 'Failed to load learning statistics');
    } finally {
      setStatsLoading(false);
    }
  }, [session, sessionStatus]);

  /**
   * Task 2.2: Fetch stats on mount and when session changes
   */
  useEffect(() => {
    fetchLearningStats();
  }, [fetchLearningStats]);

  /**
   * Progress Animation Effect
   *
   * Animates the circular progress indicator from 0 to current completion
   * percentage using requestAnimationFrame for smooth 60fps animation.
   * Runs on component mount and when progress values change.
   * Includes cleanup to prevent memory leaks on unmount.
   */
  useEffect(() => {
    const targetProgressForDasharray = (completedChapters / totalChapters) * 100;

    let startTimestamp: number | null = null;
    const animationDuration = 1500; // 1.5 seconds for smooth animation
    let animationFrameId: number;
    let isActive = true; // Flag to prevent state updates after unmount

    /**
     * Animation step function
     * Calculates current animation frame progress and updates state
     */
    const step = (timestamp: number) => {
      if (!isActive) return; // Stop if component unmounted
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min((elapsed / animationDuration) * targetProgressForDasharray, targetProgressForDasharray);
      setAnimatedProgress(progress);
      if (elapsed < animationDuration) {
        animationFrameId = requestAnimationFrame(step);
      }
    };
    animationFrameId = requestAnimationFrame(step);

    // Cleanup function to cancel animation on unmount
    return () => {
      isActive = false;
      cancelAnimationFrame(animationFrameId);
    };
  }, [completedChapters, totalChapters]);

  /**
   * Task 2.2: Dashboard statistics configuration
   * Uses dynamic data from API - only showing supported metrics
   * Icons provide visual context for each statistic type
   */
  const statsData: StatCardProps[] = [
    {
      value: formatReadingTime(learningStats?.totalReadingTimeMinutes ?? 0, t),
      label: t('dashboard.totalLearningTime'),
      icon: Activity
    },
    {
      value: `${learningStats?.notesTaken ?? 0} ${t('time.minutesShort') === 'min' ? 'notes' : '篇'}`,
      label: t('dashboard.notesCount'),
      icon: Edit3
    },
  ];


  // SVG circle mathematics for progress animation
  const radius = 15.9155; // Optimized radius for 36x36 viewBox
  const circumference = 2 * Math.PI * radius; // Total circle circumference

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 py-6">
      {/*
        User Level Display Card
        Shows current level, XP progress, permissions, and virtual residence
        Gamification feature to motivate continued learning
      */}
      <LevelDisplay variant="summary" />

      {/* Phase 4-T1: Guest Account Indicator Badge */}
      {isGuestAccount(user?.id) && (
        <Card className="p-4 bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700">
              🧪 測試帳號
            </Badge>
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-medium">您正在使用訪客測試帳號</p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                固定 70 XP • 每次伺服器重啟時重設 • 固定 2 個每日任務
              </p>
            </div>
          </div>
        </Card>
      )}

      {/*
        Dashboard Widgets Grid
        Split view with Main Progress Card and Daily Tasks Summary
      */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/*
          Main Progress Overview Card
          Features animated circular progress indicator and statistics grid
          Uses split layout: progress circle on left, stats grid on right
        */}
        <Card className="h-[300px] p-6 shadow-xl hover:shadow-primary/20 transition-shadow">
        <div className="flex h-full items-center">
          {/* Left Section: Animated Progress Circle */}
          <div className="w-1/2 flex flex-col items-center justify-center pr-6 border-r border-border/50">
            <div className="relative w-[180px] h-[180px]">
              {/* SVG Progress Circle with Gradient */}
              <svg className="w-full h-full" viewBox="0 0 36 36" transform="rotate(-90)">
                <defs>
                  {/* Gradient definition for progress stroke */}
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: 'hsl(var(--secondary))', stopOpacity: 1 }} />
                  </linearGradient>
                </defs>
                {/* Background circle (full circumference) */}
                <circle
                  cx="18"
                  cy="18"
                  r={radius}
                  className="stroke-muted fill-none"
                  strokeWidth="2.5"
                />
                {/* Progress circle (animated dash array) */}
                <circle
                  cx="18"
                  cy="18"
                  r={radius}
                  className="fill-none"
                  stroke="url(#progressGradient)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={`${(animatedProgress / 100) * circumference}, ${circumference}`}
                  style={{ transition: 'stroke-dasharray 1.5s ease-out' }}
                />
              </svg>
              {/* Central progress text overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-foreground">{completedChapters}</span>
                <span className="text-sm text-muted-foreground">/ {totalChapters} {t('dashboard.chaptersCompleted')}</span>
              </div>
            </div>
            <p className="mt-3 text-lg font-semibold text-foreground">{t('dashboard.learningOverview')}</p>
          </div>

          {/* Right Section: Statistics Grid - Task 2.2: Dynamic data with loading/error states */}
          <div className="w-1/2 flex flex-col justify-center gap-4 pl-6">
            {statsLoading ? (
              // Loading skeleton for stats (matches StatCard dimensions: w-[120px] h-[80px])
              <>
                <Card className="w-[120px] h-[80px] bg-card flex flex-col items-center justify-center p-2 shadow-md">
                  <div className="h-5 w-5 mb-1 bg-muted rounded animate-pulse" />
                  <div className="h-6 w-16 bg-muted rounded animate-pulse mb-1" />
                  <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                </Card>
                <Card className="w-[120px] h-[80px] bg-card flex flex-col items-center justify-center p-2 shadow-md">
                  <div className="h-5 w-5 mb-1 bg-muted rounded animate-pulse" />
                  <div className="h-6 w-16 bg-muted rounded animate-pulse mb-1" />
                  <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                </Card>
              </>
            ) : statsError ? (
              // Error state with retry button
              <div className="flex flex-col items-center justify-center text-center p-4">
                <p className="text-sm text-destructive mb-2">{statsError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchLearningStats()}
                  className="gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  {t('buttons.retry') || '重試'}
                </Button>
              </div>
            ) : (
              // Stats cards with dynamic data
              statsData.map(stat => (
                <StatCard key={stat.label} value={stat.value} label={stat.label} icon={stat.icon} />
              ))
            )}
          </div>
        </div>
      </Card>

        {/*
          Daily Tasks Summary Card
          Shows today's task completion, XP earned, and quick access to daily tasks
        */}
        <DailyTasksSummary />
      </div>


    </div>
  );
}
