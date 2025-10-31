/**
 * @fileOverview User Dashboard - Learning Progress and Overview
 * 
 * The dashboard serves as the main hub for users to track their learning progress,
 * view reading statistics, access recent activities, and manage learning goals.
 * This component provides a comprehensive overview of the user's engagement
 * with the Dream of the Red Chamber learning platform.
 * 
 * Key features:
 * - Animated circular progress indicator showing chapter completion
 * - Learning statistics cards with icons and visual indicators
 * - Recent reading activity carousel with progress tracking
 * - Learning goals checklist with completion status
 * - Responsive grid layout optimized for different screen sizes
 * - Multi-language support with dynamic content translation
 * - Interactive hover effects and smooth animations
 * - Quick navigation to key platform features
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
 * - Goal-setting framework for structured learning
 * - Recent activity tracking for habit formation
 * 
 * The dashboard is designed to motivate continued learning while providing
 * clear insights into user progress and achievements within the platform.
 */

"use client"; // Required for client-side state management and animations

// UI component imports for dashboard interface
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

// Icon imports for visual indicators and navigation
import { 
  BookOpen,        // Reading activity indicator
  Activity,        // Learning activity metrics
  BarChart3,       // Statistics and analytics
  TrendingUp,      // Progress and improvement trends
  Target,          // Goals and objectives
  Edit3,           // Note-taking and writing activities
  ListChecks       // Goal management and checklists
} from "lucide-react";

// Next.js navigation
import Link from "next/link";

// React hooks for component state and lifecycle
import { useState, useEffect } from 'react';

// Utility functions and custom hooks
import { cn } from "@/lib/utils";
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';

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
 * Interface for recent reading activity items
 * Defines structure for books/content user has recently engaged with
 */
interface RecentActivityItem {
  id: string;          // Unique identifier for the reading item
  title: string;       // Display title of the book or content
  author: string;      // Author name for attribution
  progress: number;    // Reading progress percentage (0-100)
  current: boolean;    // Whether this is the currently active reading
  readLink: string;    // URL to navigate to for continuing reading
}

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

  // State for chapter progress (would come from user data in production)
  const [completedChapters, setCompletedChapters] = useState(20);
  const totalChapters = 120; // Total chapters in Dream of the Red Chamber

  // State for animated progress circle
  const [animatedProgress, setAnimatedProgress] = useState(0);

  /**
   * Progress Animation Effect
   * 
   * Animates the circular progress indicator from 0 to current completion
   * percentage using requestAnimationFrame for smooth 60fps animation.
   * Runs on component mount and when progress values change.
   */
  useEffect(() => {
    const targetProgressForDasharray = (completedChapters / totalChapters) * 100;
    
    let startTimestamp: number | null = null;
    const animationDuration = 1500; // 1.5 seconds for smooth animation

    /**
     * Animation step function
     * Calculates current animation frame progress and updates state
     */
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min((elapsed / animationDuration) * targetProgressForDasharray, targetProgressForDasharray);
      setAnimatedProgress(progress);
      if (elapsed < animationDuration) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);

  }, [completedChapters, totalChapters]);

  /**
   * Dashboard statistics configuration
   * Defines the metrics displayed in the stats grid with localized labels
   * Icons provide visual context for each statistic type
   */
  const statsData: StatCardProps[] = [
    { value: "75%", label: t('dashboard.avgUnderstanding'), icon: TrendingUp },
    { value: "35 小時", label: t('dashboard.totalLearningTime'), icon: Activity },
    { value: "5 篇", label: t('dashboard.notesCount'), icon: Edit3 },
    { value: "8 個", label: t('dashboard.goalsAchieved'), icon: Target },
  ];

  /**
   * Recent reading activity data
   * Sample data showing books user has recently engaged with
   * In production, this would be fetched from user reading history
   */
  const recentActivityData: RecentActivityItem[] = [
    { id: "hlm-gengchen", title: "紅樓夢 (庚辰本校注)", author: "曹雪芹", progress: 75, current: true, readLink: "/read-book" },
    { id: "jiangxun-youth", title: "蔣勳說紅樓夢青春版", author: "蔣勳", progress: 50, current: false, readLink: "#" },
    { id: "hlm-chengjia", title: "紅樓夢 (程甲本影印)", author: "[清] 曹雪芹 高鶚", progress: 90, current: false, readLink: "#" },
    { id: "baixianyong-detailed", title: "白先勇細說紅樓夢", author: "白先勇", progress: 20, current: false, readLink: "#" },
    { id: "oulijuan-sixviews", title: "歐麗娟 六觀紅樓(綜論卷)", author: "歐麗娟", progress: 60, current: false, readLink: "#" },
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

          {/* Right Section: Statistics Grid */}
          <div className="w-1/2 grid grid-cols-2 grid-rows-2 gap-4 pl-6">
            {statsData.map(stat => (
              <StatCard key={stat.label} value={stat.value} label={stat.label} icon={stat.icon} />
            ))}
          </div>
        </div>
      </Card>

        {/*
          Daily Tasks Summary Card
          Shows today's task completion, XP earned, and quick access to daily tasks
        */}
        <DailyTasksSummary />
      </div>

      {/*
        Recent Reading Activity Section
        Horizontal scrollable carousel of recently accessed books
        Shows progress indicators and navigation links
      */}
      <Card className="shadow-xl hover:shadow-primary/20 transition-shadow">
        <CardHeader>
          <CardTitle className="text-2xl font-artistic text-primary">{t('dashboard.recentReading')}</CardTitle>
          <CardDescription>{t('dashboard.recentReadingDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex space-x-4 pb-4">
              {recentActivityData.map((item) => (
                <Card key={item.id} className="w-[300px] flex-shrink-0 hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      {/* Book cover placeholder */}
                      <div className="w-12 h-16 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900 dark:to-red-800 rounded flex items-center justify-center flex-shrink-0">
                        <BookOpen className="h-6 w-6 text-red-600 dark:text-red-300" />
                      </div>
                      
                      {/* Book information */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-foreground truncate">{item.title}</h3>
                        <p className="text-xs text-muted-foreground mb-2">{item.author}</p>
                        
                        {/* Progress indicator */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">進度</span>
                            <span className="text-foreground font-medium">{item.progress}%</span>
                          </div>
                          <Progress value={item.progress} className="h-1.5" />
                        </div>
                        
                        {/* Current reading indicator */}
                        {item.current && (
                          <div className="flex items-center space-x-1 mt-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">當前閱讀</span>
                          </div>
                        )}
                        
                        {/* Continue reading button */}
                        <div className="mt-3">
                          <Link href={item.readLink}>
                            <Button variant="outline" size="sm" className="w-full text-xs">
                              {item.current ? t('dashboard.continueReading') : t('buttons.read')}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

    </div>
  );
}
