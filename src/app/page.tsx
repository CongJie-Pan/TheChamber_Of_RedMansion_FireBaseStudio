/**
 * @fileOverview Redesigned Homepage - Simplified Vertical Layout
 *
 * A clean, intuitive homepage design that showcases the Red Mansions study system
 * with Traditional Chinese as the primary language and clear feature presentation.
 *
 * Key Improvements:
 * - Simplified vertical scroll layout replacing complex horizontal design
 * - Prominent National Palace Museum header image integration
 * - Enhanced Traditional Chinese content and cultural aesthetics
 * - Clear feature highlighting with intuitive user flow
 * - Better visual hierarchy and reduced cognitive load
 * - Mobile-responsive design with elegant transitions
 */

"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

// UI Components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Icons
import {
  ArrowRight,
  BookOpen,
  Users,
  Sparkles,
  Crown,
  ChevronDown,
  Brain,
  MessageCircle,
  BarChart3,
  Compass,
  Star,
  Eye,
  Clock,
  TrendingUp,
  Globe,
  RefreshCw,
  Edit3,
  Flame,
} from 'lucide-react';

// Language and context
import { useLanguage } from '@/hooks/useLanguage';
import { LANGUAGES } from '@/lib/translations';
import type { Language } from '@/lib/translations';

// Authentication
import { useAuth } from '@/hooks/useAuth';

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

/**
 * Main Homepage Component with Simplified Design
 */
export default function HomePage() {
  const { language, setLanguage, t } = useLanguage();
  const { user, userProfile, isLoading: isAuthLoading } = useAuth();
  const { data: session, status: sessionStatus } = useSession();

  // Use useState with true to avoid setting state in useEffect
  const [isLoaded, setIsLoaded] = useState(true);

  // Task 2.2: Dynamic learning stats state for authenticated users
  const [learningStats, setLearningStats] = useState<LearningStatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  /**
   * Task 2.2: Fetch learning stats from API
   * Only fetches for authenticated users
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
          console.warn('📊 [Homepage] User not authenticated for stats');
          setStatsLoading(false);
          return;
        }
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.stats) {
        setLearningStats(data.stats);
        console.log('📊 [Homepage] Learning stats loaded:', data.stats);
      }
    } catch (error: any) {
      console.error('❌ [Homepage] Failed to fetch learning stats:', error);
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

  // Feature cards data
  const features = [
    {
      icon: Brain,
      title: t('page.feature1Title'),
      description: t('page.feature1Desc'),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: Users,
      title: t('page.feature2Title'),
      description: t('page.feature2Desc'),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      icon: BookOpen,
      title: t('page.feature3Title'),
      description: t('page.feature3Desc'),
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      icon: MessageCircle,
      title: t('page.feature4Title'),
      description: t('page.feature4Desc'),
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      icon: BarChart3,
      title: t('page.feature5Title'),
      description: t('page.feature5Desc'),
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      icon: Sparkles,
      title: t('page.feature6Title'),
      description: t('page.feature6Desc'),
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
    },
  ];

  // Learning statistics
  const stats = [
    { number: t('page.stat1Number'), label: t('page.stat1Label'), icon: Users },
    { number: t('page.stat2Number'), label: t('page.stat2Label'), icon: BookOpen },
    { number: t('page.stat3Number'), label: t('page.stat3Label'), icon: Crown },
    { number: t('page.stat4Number'), label: t('page.stat4Label'), icon: TrendingUp },
  ];

  // Content preview sections
  const contentPreviews = [
    {
      title: t('page.preview1Title'),
      subtitle: t('page.preview1Subtitle'),
      description: t('page.preview1Desc'),
      image: '/images/Hongloumeng_Tuyong_Jia_Yingchun.jpg',
      href: '/characters',
      badge: t('page.preview1Badge'),
    },
    {
      title: t('page.preview2Title'),
      subtitle: t('page.preview2Subtitle'),
      description: t('page.preview2Desc'),
      image: '/images/Jia_Baoyu_Hongloumeng_Tuyong_lookingLaptop.png',
      href: '/chapters',
      badge: t('page.preview2Badge'),
    },
    {
      title: t('page.preview3Title'),
      subtitle: t('page.preview3Subtitle'),
      description: t('page.preview3Desc'),
      image: '/images/inChung_lookingLaptop.png',
      href: '/poetry',
      badge: t('page.preview3Badge'),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-5">
            <Image
              src="/images/logo_circle.png"
              alt="紅樓慧讀 Logo"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
            <div className="text-left">
              <div className="text-xl font-bold text-foreground">紅樓慧讀</div>
              <div className="text-xs text-muted-foreground">HongLou WiseRead</div>
            </div>
          </Link>

          {/* Navigation Actions */}
          <div className="flex items-center space-x-4">
            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  {LANGUAGES.find(lang => lang.code === language)?.name || language}
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {LANGUAGES.map((langOption) => (
                  <DropdownMenuItem
                    key={langOption.code}
                    onSelect={() => setLanguage(langOption.code)}
                    disabled={language === langOption.code}
                  >
                    {langOption.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Action Buttons - Conditional based on auth state */}
            {isAuthLoading ? (
              /* Loading state */
              <div className="flex items-center space-x-2">
                <div className="w-16 h-8 bg-gray-200 animate-pulse rounded" />
                <div className="w-24 h-8 bg-gray-200 animate-pulse rounded" />
              </div>
            ) : user ? (
              /* Authenticated user - show level/XP info */
              <>
                <div className="flex items-center space-x-2 text-sm text-foreground/70 bg-muted/50 px-3 py-1.5 rounded-md">
                  <TrendingUp className="w-4 h-4" />
                  <span>Lv.{userProfile?.currentLevel || 1}</span>
                  <span className="text-muted-foreground">|</span>
                  <span>{userProfile?.currentXP || 0} XP</span>
                </div>
                <Button asChild>
                  <Link href="/dashboard">
                    <Compass className="w-4 h-4 mr-2" />
                    {t('page.navStartExplore')}
                  </Link>
                </Button>
              </>
            ) : (
              /* Not authenticated - show login button */
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login">{t('page.navLogin')}</Link>
                </Button>
                <Button asChild>
                  <Link href="/dashboard">
                    <Compass className="w-4 h-4 mr-2" />
                    {t('page.navStartExplore')}
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section with Local Header Image */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/introImage/introPageImage.JPG"
            alt="首頁封面照"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
        </div>

        {/* Hero Content */}
        <div className={`relative z-10 text-center max-w-4xl mx-auto px-6 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="space-y-6">
            <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight">
              <span className="block">{t('page.heroTitlePart1')}</span>
              <span className="block text-red-400 mt-2">{t('page.heroTitleHighlight')}{t('page.heroTitlePart2')}</span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-200 max-w-2xl mx-auto leading-relaxed">
              {t('page.heroSubtitle')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
              <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 text-lg" asChild>
                <Link href="/dashboard">
                  <BookOpen className="mr-2 h-5 w-5" />
                  {t('page.btnStartLearning')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>

              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-black px-8 py-4 text-lg">
                <Eye className="mr-2 h-5 w-5" />
                {t('page.btnLearnMore')}
              </Button>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/50 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* Task 2.2: Personal Learning Progress Section - Only for authenticated users */}
      {user && (
        <section className="py-12 bg-gradient-to-r from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                {t('page.myLearningTitle') || '我的學習進度'}
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                {t('page.myLearningSubtitle') || '繼續您的紅樓夢學習之旅'}
              </p>
            </div>

            {statsLoading ? (
              // Loading skeleton
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="p-6 text-center">
                    <div className="h-10 w-10 mx-auto mb-3 bg-muted rounded-full animate-pulse" />
                    <div className="h-8 w-16 mx-auto mb-2 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-24 mx-auto bg-muted rounded animate-pulse" />
                  </Card>
                ))}
              </div>
            ) : statsError ? (
              // Error state
              <div className="flex flex-col items-center justify-center text-center p-8">
                <p className="text-sm text-destructive mb-4">{statsError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchLearningStats()}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  {t('buttons.retry') || '重試'}
                </Button>
              </div>
            ) : learningStats ? (
              // Stats cards
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                <Card className="p-6 text-center hover:shadow-lg transition-shadow">
                  <BookOpen className="h-10 w-10 mx-auto mb-3 text-red-600" />
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {learningStats.chaptersCompleted}
                    <span className="text-lg text-gray-500">/{learningStats.totalChapters}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{t('page.statsChapters') || '已完成章節'}</p>
                </Card>

                <Card className="p-6 text-center hover:shadow-lg transition-shadow">
                  <Clock className="h-10 w-10 mx-auto mb-3 text-blue-600" />
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {learningStats.totalReadingTime}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{t('page.statsReadingTime') || '閱讀時間'}</p>
                </Card>

                <Card className="p-6 text-center hover:shadow-lg transition-shadow">
                  <Edit3 className="h-10 w-10 mx-auto mb-3 text-green-600" />
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {learningStats.notesTaken}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{t('page.statsNotes') || '學習筆記'}</p>
                </Card>

                <Card className="p-6 text-center hover:shadow-lg transition-shadow">
                  <Flame className="h-10 w-10 mx-auto mb-3 text-orange-600" />
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {learningStats.currentStreak}
                    <span className="text-lg text-gray-500"> {t('page.statsDays') || '天'}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{t('page.statsStreak') || '連續學習'}</p>
                </Card>
              </div>
            ) : null}

            {/* Continue learning button */}
            {!statsLoading && !statsError && (
              <div className="text-center mt-8">
                <Button size="lg" className="bg-red-600 hover:bg-red-700" asChild>
                  <Link href="/dashboard">
                    <ArrowRight className="mr-2 h-5 w-5" />
                    {t('page.btnContinueLearning') || '繼續學習'}
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {t('page.featuresTitle')}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t('page.featuresSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className={`p-6 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${feature.bgColor}`}>
                <CardContent className="p-0">
                  <div className={`w-12 h-12 rounded-lg ${feature.bgColor} ${feature.color} flex items-center justify-center mb-4`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Content Preview Section */}
      <section className="py-20 bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {t('page.contentPreviewTitle')}
            </h2>
            <p className="text-xl text-gray-200 max-w-2xl mx-auto">
              {t('page.contentPreviewSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {contentPreviews.map((content, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={content.image}
                    alt={content.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <Badge className="absolute top-4 left-4 bg-red-600 text-white">
                    {content.badge}
                  </Badge>
                </div>
                <CardHeader>
                  <CardTitle className="text-xl text-white">{content.title}</CardTitle>
                  <CardDescription className="text-gray-200 font-medium">
                    {content.subtitle}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-100 leading-relaxed mb-4">
                    {content.description}
                  </p>
                  <Button variant="outline" className="w-full group-hover:bg-red-600 group-hover:text-white transition-colors" asChild>
                    <Link href={content.href}>
                      {t('page.btnExplore')}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              {t('page.ctaTitle')}
            </h2>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              {t('page.ctaSubtitle')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="bg-red-600 hover:bg-red-700 px-8 py-4 text-lg" asChild>
                <Link href="/register">
                  <Star className="mr-2 h-5 w-5" />
                  {t('page.btnFreeStart')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>

              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-black px-8 py-4 text-lg" asChild>
                <Link href="/dashboard">
                  <Globe className="mr-2 h-5 w-5" />
                  {t('page.btnExploreCommunity')}
                </Link>
              </Button>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-700">
              <p className="text-gray-400 text-sm">
                {t('page.ctaStats')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <Image
                src="/images/logo_circle.png"
                alt="紅樓慧讀 Logo"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
              <div>
                <div className="text-xl font-bold">紅樓慧讀</div>
                <div className="text-sm text-gray-400">HongLou WiseRead</div>
              </div>
            </div>

            <div className="text-sm text-gray-400 text-center md:text-right">
              <p>{t('page.footerRights')}</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}