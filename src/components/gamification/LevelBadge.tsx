/**
 * @fileOverview Level Badge Component
 *
 * A compact, visually appealing component that displays user's current level.
 * Designed to be reusable across the application in various contexts.
 *
 * Key Features:
 * - Three display variants (compact, full, minimal)
 * - Color-coded level tiers for visual hierarchy
 * - Responsive design adapting to different screen sizes
 * - Graceful handling when userProfile is unavailable
 * - Multi-language support (zh-TW, zh-CN, en-US)
 * - Optional click interactions for detail views
 *
 * Design Philosophy:
 * - Level 0-1: Gray (#9CA3AF) - Newcomer tier
 * - Level 2-3: Blue (#3B82F6) - Learning tier
 * - Level 4-5: Purple (#8B5CF6) - Proficient tier
 * - Level 6-7: Gold (#F59E0B) - Master tier
 *
 * Usage Examples:
 * ```tsx
 * // Compact badge for navigation
 * <LevelBadge variant="compact" />
 *
 * // Full badge with title
 * <LevelBadge variant="full" showTitle />
 *
 * // Minimal badge for inline display
 * <LevelBadge variant="minimal" />
 *
 * // Interactive badge with click handler
 * <LevelBadge variant="full" onClick={() => router.push('/achievements')} />
 * ```
 */

"use client"; // Required for client-side state and hooks

// React imports
import React, { useMemo } from 'react';

// UI component imports
import { Badge } from '@/components/ui/badge';

// Icon imports for visual elements
import { Trophy, Star, Sparkles } from 'lucide-react';

// Custom hooks
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';

// Level configuration
import { getLevelConfig } from '@/lib/config/levels-config';

// Utility for className merging
import { cn } from '@/lib/utils';

/**
 * Props interface for LevelBadge component
 */
interface LevelBadgeProps {
  /**
   * Display variant controlling size and detail level
   * - 'compact': Small badge with level number only
   * - 'full': Larger badge with level number and title
   * - 'minimal': Tiny badge for inline use
   */
  variant?: 'compact' | 'full' | 'minimal';

  /**
   * Override level value (useful for previews or testing)
   * If not provided, uses current user's level from userProfile
   */
  level?: number;

  /**
   * Whether to display the level title text
   * Only applies to 'full' variant
   */
  showTitle?: boolean;

  /**
   * Additional CSS classes for styling
   */
  className?: string;

  /**
   * Optional click handler for interactive badges
   * Typically used to navigate to achievements or level details page
   */
  onClick?: () => void;
}

/**
 * Get color scheme based on level tier
 *
 * Returns Tailwind CSS classes for background, border, and text colors
 * that correspond to the user's achievement level.
 *
 * @param level - Current user level (0-7)
 * @returns Object containing color classes for different UI states
 */
function getLevelColorClasses(level: number): {
  bg: string;
  border: string;
  text: string;
  glow: string;
} {
  // Newcomer tier (賈府訪客, 陪讀書僮)
  if (level <= 1) {
    return {
      bg: 'bg-gray-100 dark:bg-gray-800',
      border: 'border-gray-300 dark:border-gray-600',
      text: 'text-gray-700 dark:text-gray-300',
      glow: 'shadow-gray-200 dark:shadow-gray-700',
    };
  }

  // Learning tier (門第清客, 庶務管事)
  if (level <= 3) {
    return {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      border: 'border-blue-300 dark:border-blue-600',
      text: 'text-blue-700 dark:text-blue-300',
      glow: 'shadow-blue-200 dark:shadow-blue-700',
    };
  }

  // Proficient tier (詩社雅士, 府中幕賓)
  if (level <= 5) {
    return {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      border: 'border-purple-300 dark:border-purple-600',
      text: 'text-purple-700 dark:text-purple-300',
      glow: 'shadow-purple-200 dark:shadow-purple-700',
    };
  }

  // Master tier (紅學通儒, 一代宗師)
  return {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    border: 'border-amber-300 dark:border-amber-600',
    text: 'text-amber-700 dark:text-amber-300',
    glow: 'shadow-amber-200 dark:shadow-amber-700',
  };
}

/**
 * Get appropriate icon based on level tier
 *
 * @param level - Current user level (0-7)
 * @returns Lucide icon component for the level tier
 */
function getLevelIcon(level: number) {
  if (level <= 1) return Trophy;
  if (level <= 3) return Star;
  if (level <= 5) return Star;
  return Sparkles; // Master tier gets special sparkles icon
}

/**
 * Level Badge Component
 *
 * Displays the user's current level as a styled badge with appropriate
 * color coding and optional interactivity. Supports three variants for
 * different use cases and seamlessly handles missing user data.
 *
 * @param variant - Display style variant
 * @param level - Override level (defaults to user's actual level)
 * @param showTitle - Whether to show level title text
 * @param className - Additional CSS classes
 * @param onClick - Optional click handler
 */
export function LevelBadge({
  variant = 'compact',
  level: levelOverride,
  showTitle = false,
  className = '',
  onClick,
}: LevelBadgeProps) {
  const { userProfile, isLoading } = useAuth();
  const { t } = useLanguage();

  // Determine actual level to display
  const level = levelOverride ?? userProfile?.currentLevel ?? 0;

  // Get level configuration
  const levelConfig = getLevelConfig(level);

  // Get color classes for current level
  const colors = getLevelColorClasses(level);

  // Get icon component for current level (memoized as JSX element, not component)
  const iconElement = useMemo(() => {
    const IconComponent = getLevelIcon(level);
    return IconComponent;
  }, [level]);

  // Loading state
  if (isLoading && levelOverride === undefined) {
    return (
      <div className={cn(
        'animate-pulse rounded-full',
        variant === 'minimal' ? 'h-6 w-12' : variant === 'compact' ? 'h-8 w-20' : 'h-10 w-32',
        'bg-muted',
        className
      )} />
    );
  }

  // Minimal variant - tiny badge for inline use
  if (variant === 'minimal') {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center',
          'h-5 px-2 rounded-full',
          'text-xs font-semibold',
          colors.bg,
          colors.text,
          colors.border,
          'border',
          onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
          className
        )}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        Lv.{level}
      </span>
    );
  }

  // Compact variant - small badge with level number and icon
  if (variant === 'compact') {
    return (
      <Badge
        variant="outline"
        className={cn(
          'inline-flex items-center gap-1.5',
          'px-2.5 py-1',
          colors.bg,
          colors.text,
          colors.border,
          onClick && 'cursor-pointer hover:shadow-md transition-shadow',
          className
        )}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        {iconElement && <iconElement.type className="h-3.5 w-3.5" />}
        <span className="font-semibold">Lv.{level}</span>
      </Badge>
    );
  }

  // Full variant - larger badge with level number, icon, and optional title
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2',
        'px-3 py-2 rounded-lg',
        'border-2',
        colors.bg,
        colors.text,
        colors.border,
        colors.glow,
        'shadow-sm',
        onClick && 'cursor-pointer hover:shadow-lg transition-all hover:scale-105',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-center gap-1.5">
        {iconElement && <iconElement.type className="h-5 w-5" />}
        <span className="font-bold text-lg">Lv.{level}</span>
      </div>

      {showTitle && levelConfig && (
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-medium">{levelConfig.title}</span>
          <span className="text-xs opacity-75">{levelConfig.titleEn}</span>
        </div>
      )}
    </div>
  );
}
