
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

// Icon imports for achievement categories and actions
import { 
  Award,          // Achievement badges and recognition
  Star,           // Favorite/rating achievements
  Target,         // Goal-setting and objectives
  BookOpen,       // Reading-related achievements
  CalendarDays,   // Time-based achievements and streaks
  CheckCircle,    // Completion indicators
  Users,          // Community and social achievements
  Trophy,         // Major accomplishments and milestones
  Share2,         // Social sharing functionality
  ShieldCheck,    // Mastery and expertise badges
  BarChart3,      // Statistics and analytics
  Edit,           // Writing and note-taking achievements
  Settings2,      // Goal customization and settings
  ListChecks,     // Task completion and checklists
  Clock,          // Time-based goals and tracking
  Zap             // Special achievements and power-ups
} from "lucide-react";

// React hooks for component state management
import { useState } from "react";

// Custom hooks for application functionality
import { useLanguage } from '@/hooks/useLanguage';

// Gamification components
import { LevelDisplay } from '@/components/gamification';

// Placeholder Data - In a real app, these would come from a backend or state management
const getAchievedAchievementsData = (t: (key: string) => string) => [
  { id: "ach1", icon: Award, name: "初窺門徑", description: "完成《紅樓夢》第一回閱讀", date: "2024-05-10", points: 50, category: "閱讀進度" },
  { id: "ach2", icon: Star, name: "日積月累", description: "連續學習 7 天", date: "2024-05-15", points: 100, category: "學習習慣" },
  { id: "ach3", icon: BookOpen, name: "博覽群書", description: "閱讀 3 部專家解讀著作", date: "2024-06-01", points: 150, category: "知識廣度" },
  { id: "ach4", icon: ShieldCheck, name: "判詞解析者", description: "完成所有金陵十二釵判詞筆記", date: "2024-06-20", points: 200, category: "深度理解" },
];

const getLearningStatsData = (t: (key: string) => string) => ({
  totalReadingTime: `42 ${t('achievements.totalReadingTime').includes('Hours') ? 'Hours' : '小時'}`, // Example dynamic unit
  chaptersCompleted: 35,
  totalChapters: 120,
  notesTaken: 12,
  currentStreak: 10,
});

const getAchievableGoalsData = (t: (key: string) => string) => [
  { id: "goal1", icon: Target, name: "完成前四十回", description: "繼續您的閱讀旅程，完成《紅樓夢》前四十回。", currentProgress: 35, targetProgress: 40, unit: t('achievements.chaptersUnit') },
  { id: "goal2", icon: CalendarDays, name: "持續學習獎章", description: "保持連續學習15天，解鎖新的獎章。", currentProgress: 10, targetProgress: 15, unit: t('achievements.currentStreak').includes('Days') ? 'Days' : '天' },
  { id: "goal3", icon: Edit, name: "筆記大師", description: "撰寫至少20篇有深度的閱讀筆記。", currentProgress: 12, targetProgress: 20, unit: t('dashboard.notesCount').includes('Notes') ? 'Notes' : '篇' },
];

const getChallengesData = (t: (key: string) => string) => ({
  daily: [
    { id: "daily1", name: "今日閱讀挑戰", description: "今日閱讀《紅樓夢》30分鐘", reward: "20 成就點", active: true },
    { id: "daily2", name: "每日一問", description: "回答一個關於今日閱讀內容的問題", reward: "10 成就點", active: false },
  ],
  weekly: [
    { id: "weekly1", name: "本週章回衝刺", description: "本週完成3個章回的閱讀與筆記", reward: "100 成就點", active: true },
  ],
  special: [
    { id: "special1", name: "紅樓詩詞大賞", description: "參與《紅樓夢》詩詞賞析與創作活動", reward: "特殊徽章 + 200點", active: false },
  ],
});


export default function AchievementsPage() {
  const { t } = useLanguage();
  
  const achievedAchievementsData = getAchievedAchievementsData(t);
  const learningStatsData = getLearningStatsData(t);
  const achievableGoalsData = getAchievableGoalsData(t);
  const challengesData = getChallengesData(t);
  
  const [userAchievements, setUserAchievements] = useState(achievedAchievementsData);

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-3xl font-artistic text-primary">{t('achievements.title')}</CardTitle>
              <CardDescription>{t('achievements.description')}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* User Level System - Detailed Display */}
      <LevelDisplay variant="detailed" showNextLevel />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-artistic text-white flex items-center gap-2"><Star className="text-yellow-400" /> {t('achievements.myAchievements')}</CardTitle>
          <CardDescription>{t('achievements.myAchievementsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {userAchievements.length > 0 ? (
            <ScrollArea className="h-[300px] w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
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
                    <CardFooter className="flex justify-end gap-2">
                       <Button variant="ghost" size="sm" onClick={() => alert(`${t('buttons.share')}: ${ach.name}`)}>
                        <Share2 className="mr-1.5 h-3.5 w-3.5" /> {t('buttons.share')}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => alert(`${t('buttons.viewDetails')} ${ach.name}`)}>
                        {t('buttons.viewDetails')}
                      </Button>
                    </CardFooter>
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
        <CardHeader>
          <CardTitle className="text-xl font-artistic text-white flex items-center gap-2"><BarChart3 className="text-blue-400" /> {t('achievements.learningStats')}</CardTitle>
          <CardDescription>{t('achievements.learningStatsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-card/50 p-4 rounded-lg">
              <p className="text-2xl font-bold text-primary">{learningStatsData.totalReadingTime}</p>
              <p className="text-sm text-muted-foreground">{t('achievements.totalReadingTime')}</p>
            </div>
            <div className="bg-card/50 p-4 rounded-lg">
              <p className="text-2xl font-bold text-primary">{learningStatsData.chaptersCompleted} <span className="text-base text-muted-foreground">/ {learningStatsData.totalChapters}</span></p>
              <p className="text-sm text-muted-foreground">{t('achievements.chaptersCompletedFull')}</p>
            </div>
            <div className="bg-card/50 p-4 rounded-lg">
              <p className="text-2xl font-bold text-primary">{learningStatsData.notesTaken}</p>
              <p className="text-sm text-muted-foreground">{t('achievements.notesTaken')}</p>
            </div>
            <div className="bg-card/50 p-4 rounded-lg">
              <p className="text-2xl font-bold text-primary">{learningStatsData.currentStreak} {t('achievements.currentStreak').includes('Days') ? 'Days' : '天'}</p>
              <p className="text-sm text-muted-foreground">{t('achievements.currentStreak')}</p>
            </div>
          </div>
          <div>
            <Label htmlFor="overallProgress" className="text-sm text-muted-foreground">{t('achievements.overallProgress')}</Label>
            <Progress 
              id="overallProgress"
              value={(learningStatsData.chaptersCompleted / learningStatsData.totalChapters) * 100} 
              className="w-full h-3 mt-1" 
              indicatorClassName="bg-gradient-to-r from-primary to-yellow-400"
            />
             <p className="text-xs text-right text-muted-foreground mt-1">
              {learningStatsData.chaptersCompleted} / {learningStatsData.totalChapters} {t('achievements.chaptersUnit')}
            </p>
          </div>
           <div className="text-right">
            <Button variant="link" onClick={() => alert(t('achievements.viewDetailedAnalysis'))} className="text-primary">
              {t('achievements.viewDetailedAnalysis')} &rarr;
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-artistic text-white flex items-center gap-2"><Target className="text-green-400" /> {t('achievements.nextGoals')}</CardTitle>
            <CardDescription>{t('achievements.nextGoalsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {achievableGoalsData.map(goal => (
              <Card key={goal.id} className="bg-card/60 p-4">
                <div className="flex items-start gap-3">
                  <goal.icon className="h-7 w-7 text-green-500 mt-1" />
                  <div>
                    <h4 className="font-semibold text-white">{goal.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">{goal.description}</p>
                    <Progress value={(goal.currentProgress / goal.targetProgress) * 100} className="h-2 mb-1" indicatorClassName="bg-green-500" />
                    <p className="text-xs text-muted-foreground">{goal.currentProgress} / {goal.targetProgress} {goal.unit}</p>
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <Button size="sm" variant="outline" onClick={() => alert(`${t('buttons.startGoal')}: ${goal.name}`)}>
                    {goal.currentProgress > 0 && goal.currentProgress < goal.targetProgress ? t('buttons.continueEffort') : t('buttons.startGoal')}
                  </Button>
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-artistic text-white flex items-center gap-2"><Settings2 className="text-purple-400" /> {t('achievements.setNewGoals')}</CardTitle>
            <CardDescription>{t('achievements.setNewGoalsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="outline" className="w-full justify-start h-auto py-3 text-left" onClick={() => alert(t('achievements.goalDailyReadingTime'))}>
              <Clock className="mr-2 h-5 w-5 text-purple-400" />
              <div>
                <p className="font-medium">{t('achievements.goalDailyReadingTime')}</p>
                <p className="text-xs text-muted-foreground">{t('achievements.goalDailyReadingTimeDesc')}</p>
              </div>
            </Button>
            <Button variant="outline" className="w-full justify-start h-auto py-3 text-left" onClick={() => alert(t('achievements.goalChapterCompletion'))}>
              <ListChecks className="mr-2 h-5 w-5 text-purple-400" />
              <div>
                <p className="font-medium">{t('achievements.goalChapterCompletion')}</p>
                <p className="text-xs text-muted-foreground">{t('achievements.goalChapterCompletionDesc')}</p>
              </div>
            </Button>
            <Button variant="outline" className="w-full justify-start h-auto py-3 text-left" onClick={() => alert(t('achievements.goalStreak'))}>
              <CalendarDays className="mr-2 h-5 w-5 text-purple-400" />
              <div>
                <p className="font-medium">{t('achievements.goalStreak')}</p>
                <p className="text-xs text-muted-foreground">{t('achievements.goalStreakDesc')}</p>
              </div>
            </Button>
            <Button variant="outline" className="w-full justify-start h-auto py-3 text-left" onClick={() => alert(t('achievements.goalAccuracy'))}>
              <CheckCircle className="mr-2 h-5 w-5 text-purple-400" />
               <div>
                <p className="font-medium">{t('achievements.goalAccuracy')}</p>
                <p className="text-xs text-muted-foreground">{t('achievements.goalAccuracyDesc')}</p>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-artistic text-white flex items-center gap-2"><Zap className="text-orange-400" /> {t('achievements.challenges')}</CardTitle>
          <CardDescription>{t('achievements.challengesDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="daily">{t('achievements.tabDaily')}</TabsTrigger>
              <TabsTrigger value="weekly">{t('achievements.tabWeekly')}</TabsTrigger>
              <TabsTrigger value="special">{t('achievements.tabSpecial')}</TabsTrigger>
            </TabsList>
            <TabsContent value="daily">
              {challengesData.daily.length > 0 ? (
                <div className="space-y-3">
                  {challengesData.daily.map(challenge => (
                    <Card key={challenge.id} className={`bg-card/60 p-4 ${challenge.active ? 'border-primary' : ''}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-white">{challenge.name}</h4>
                          <p className="text-xs text-muted-foreground">{challenge.description}</p>
                          <p className="text-xs text-amber-400 mt-1">{t('achievements.rewardPrefix')}{challenge.reward}</p>
                        </div>
                        <Button size="sm" variant={challenge.active ? "default" : "outline"} onClick={() => alert(`${t('achievements.joinChallenge')}: ${challenge.name}`)}>
                          {challenge.active ? t('achievements.challengeInProgress') : t('achievements.joinChallenge')}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : <p className="text-muted-foreground text-center py-4">{t('achievements.noDailyChallenges')}</p>}
            </TabsContent>
            <TabsContent value="weekly">
              {challengesData.weekly.length > 0 ? (
                 <div className="space-y-3">
                  {challengesData.weekly.map(challenge => (
                     <Card key={challenge.id} className={`bg-card/60 p-4 ${challenge.active ? 'border-primary' : ''}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-white">{challenge.name}</h4>
                          <p className="text-xs text-muted-foreground">{challenge.description}</p>
                          <p className="text-xs text-amber-400 mt-1">{t('achievements.rewardPrefix')}{challenge.reward}</p>
                        </div>
                        <Button size="sm" variant={challenge.active ? "default" : "outline"} onClick={() => alert(`${t('achievements.joinChallenge')}: ${challenge.name}`)}>
                          {challenge.active ? t('achievements.challengeInProgress') : t('achievements.joinChallenge')}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : <p className="text-muted-foreground text-center py-4">{t('achievements.noWeeklyChallenges')}</p>}
            </TabsContent>
            <TabsContent value="special">
              {challengesData.special.length > 0 ? (
                <div className="space-y-3">
                  {challengesData.special.map(challenge => (
                    <Card key={challenge.id} className={`bg-card/60 p-4 ${challenge.active ? 'border-primary' : ''}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-white">{challenge.name}</h4>
                          <p className="text-xs text-muted-foreground">{challenge.description}</p>
                          <p className="text-xs text-amber-400 mt-1">{t('achievements.rewardPrefix')}{challenge.reward}</p>
                        </div>
                        <Button size="sm" variant={challenge.active ? "default" : "outline"} onClick={() => alert(`${t('achievements.joinChallenge')}: ${challenge.name}`)}>
                          {challenge.active ? t('achievements.challengeInProgress') : t('achievements.viewActivity')}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : <p className="text-muted-foreground text-center py-4">{t('achievements.noSpecialChallenges')}</p>}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
