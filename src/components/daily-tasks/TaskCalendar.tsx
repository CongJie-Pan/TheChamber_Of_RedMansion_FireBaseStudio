/**
 * @fileOverview TaskCalendar Component - Historical Task Completion Calendar
 *
 * This component displays a monthly calendar view showing which days the user
 * completed their daily tasks. Provides visual feedback on consistency and streaks.
 *
 * Features:
 * - Monthly calendar grid
 * - Completion indicators (completed/partial/missed)
 * - Current day highlight
 * - Month navigation
 * - Hover tooltips with task details
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, XCircle } from "lucide-react";
import { cn } from '@/lib/utils';
import { dailyTaskClientService } from '@/lib/daily-task-client-service';
import { TaskHistoryRecord } from '@/lib/types/daily-task';

interface TaskCalendarProps {
  userId: string;
}

/**
 * Day cell data
 */
interface DayData {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  completionStatus: 'completed' | 'partial' | 'missed' | 'none';
  completedCount?: number;
  totalCount?: number;
}

/**
 * Get days in month as calendar grid (including previous/next month padding)
 */
const getMonthDays = (year: number, month: number): DayData[] => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const today = new Date();

  const days: DayData[] = [];

  // Add padding from previous month
  const firstDayOfWeek = firstDay.getDay();
  if (firstDayOfWeek > 0) {
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
        isToday: false,
        completionStatus: 'none'
      });
    }
  }

  // Add current month days
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    days.push({
      date,
      isCurrentMonth: true,
      isToday: date.toDateString() === today.toDateString(),
      completionStatus: 'none'
    });
  }

  // Add padding from next month
  const remainingDays = 42 - days.length; // 6 rows * 7 days
  for (let day = 1; day <= remainingDays; day++) {
    days.push({
      date: new Date(year, month + 1, day),
      isCurrentMonth: false,
      isToday: false,
      completionStatus: 'none'
    });
  }

  return days;
};

/**
 * TaskCalendar Component
 */
export const TaskCalendar: React.FC<TaskCalendarProps> = ({ userId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [days, setDays] = useState<DayData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  /**
   * Load task history and populate calendar
   */
  useEffect(() => {
    loadCalendarData();
  }, [userId, year, month]);

  const loadCalendarData = async () => {
    setIsLoading(true);

    try {
      // Get month days
      const monthDays = getMonthDays(year, month);

      // Get task history for this period
      const history = await dailyTaskClientService.getTaskHistory(userId, 100);

      // Group history by date
      const historyByDate = new Map<string, TaskHistoryRecord[]>();
      history.forEach(record => {
        const existing = historyByDate.get(record.date) || [];
        historyByDate.set(record.date, [...existing, record]);
      });

      // Update day data with completion status
      const updatedDays = monthDays.map(day => {
        const dateStr = day.date.toISOString().split('T')[0];
        const dayHistory = historyByDate.get(dateStr) || [];

        if (dayHistory.length === 0) {
          return { ...day, completionStatus: 'none' as const };
        }

        // For now, assume 2 tasks per day
        const expectedTasks = 2;
        const completedCount = dayHistory.length;

        let status: 'completed' | 'partial' | 'missed' = 'missed';
        if (completedCount >= expectedTasks) {
          status = 'completed';
        } else if (completedCount > 0) {
          status = 'partial';
        }

        return {
          ...day,
          completionStatus: status,
          completedCount,
          totalCount: expectedTasks
        };
      });

      setDays(updatedDays);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Navigate to previous month
   */
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  /**
   * Navigate to next month
   */
  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  /**
   * Get status indicator for a day
   */
  const getStatusIndicator = (day: DayData) => {
    const iconClass = "h-4 w-4";

    if (!day.isCurrentMonth) return null;

    switch (day.completionStatus) {
      case 'completed':
        return <CheckCircle2 className={cn(iconClass, "text-green-500")} />;
      case 'partial':
        return <Circle className={cn(iconClass, "text-yellow-500 fill-yellow-500/50")} />;
      case 'missed':
        return <XCircle className={cn(iconClass, "text-red-500")} />;
      default:
        return null;
    }
  };

  const monthNames = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ];

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {year} 年 {monthNames[month]}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevMonth}
              disabled={isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextMonth}
              disabled={isLoading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => (
            <div
              key={index}
              className={cn(
                "relative h-12 rounded-md border flex items-center justify-center transition-colors",
                day.isCurrentMonth
                  ? "bg-background hover:bg-muted/50 cursor-pointer"
                  : "bg-muted/20 text-muted-foreground/50",
                day.isToday && "ring-2 ring-primary border-primary"
              )}
              title={day.completedCount !== undefined
                ? `${day.completedCount}/${day.totalCount} 任務完成`
                : '無任務記錄'
              }
            >
              <span className={cn(
                "text-sm",
                day.isToday && "font-bold"
              )}>
                {day.date.getDate()}
              </span>
              <div className="absolute bottom-1 right-1">
                {getStatusIndicator(day)}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-xs text-muted-foreground">全部完成</span>
          </div>
          <div className="flex items-center gap-2">
            <Circle className="h-4 w-4 text-yellow-500 fill-yellow-500/50" />
            <span className="text-xs text-muted-foreground">部分完成</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-xs text-muted-foreground">未完成</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
