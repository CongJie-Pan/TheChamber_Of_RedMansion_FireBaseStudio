/**
 * @fileOverview Level Up Modal Component
 *
 * A celebratory modal that appears when users level up, providing
 * positive feedback and showcasing newly unlocked features.
 *
 * Key Features:
 * - Celebratory animations and visual effects
 * - Display of new level with animated badge
 * - List of newly unlocked permissions
 * - List of newly unlocked content
 * - Call-to-action buttons (close, explore features)
 * - Multi-language support
 * - Responsive design
 * - Keyboard accessible
 *
 * Design Philosophy:
 * - Create a moment of celebration and achievement
 * - Clearly communicate progression value
 * - Motivate continued engagement
 * - Traditional Chinese aesthetics with modern animation
 *
 * Usage Examples:
 * ```tsx
 * // Controlled modal
 * const [isOpen, setIsOpen] = useState(false);
 * <LevelUpModal
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   fromLevel={2}
 *   toLevel={3}
 * />
 *
 * // With custom callbacks
 * <LevelUpModal
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   fromLevel={2}
 *   toLevel={3}
 *   onExploreFeatures={() => router.push('/achievements')}
 * />
 * ```
 */

"use client"; // Required for client-side state and animations

// React imports
import React, { useEffect, useState } from 'react';

// UI component imports
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// Icon imports
import { Sparkles, Gift, ArrowRight, CheckCircle2 } from 'lucide-react';

// Custom hooks
import { useLanguage } from '@/hooks/useLanguage';

// Gamification components
import { LevelBadge } from './LevelBadge';

// Level configuration
import { getLevelConfig, getAllPermissionsForLevel } from '@/lib/config/levels-config';
import { LevelPermission } from '@/lib/types/user-level';

// Utility for className merging
import { cn } from '@/lib/utils';

// Translation function
import { Language } from '@/lib/translations';

/**
 * Props interface for LevelUpModal component
 */
interface LevelUpModalProps {
  /**
   * Whether the modal is open
   */
  open: boolean;

  /**
   * Callback when modal open state changes
   */
  onOpenChange: (open: boolean) => void;

  /**
   * Previous level (before level up)
   */
  fromLevel: number;

  /**
   * New level (after level up)
   */
  toLevel: number;

  /**
   * Optional callback when user clicks "Explore Features"
   * Typically used to navigate to achievements or dashboard
   */
  onExploreFeatures?: () => void;

  /**
   * Additional CSS classes for the dialog content
   */
  className?: string;
}

/**
 * Get translated permission name
 *
 * Returns the localized name for a permission based on current language
 *
 * @param permission - Permission type
 * @param t - Translation function from useLanguage
 * @returns Translated permission name
 */
function getPermissionName(permission: LevelPermission, t: (key: string) => string): string {
  // Try to get translation for the permission
  const translationKey = `level.permissionNames.${permission}`;
  const translated = t(translationKey);

  // If translation is the same as the key, fall back to formatted name
  if (translated === translationKey) {
    return permission
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  return translated;
}

/**
 * Get translated exclusive content name
 *
 * Returns the localized name for exclusive content based on current language
 *
 * @param content - Content identifier
 * @param t - Translation function from useLanguage
 * @returns Translated content name
 */
function getExclusiveContentName(content: string, t: (key: string) => string): string {
  // Try to get translation for the content
  const translationKey = `level.exclusiveContentNames.${content}`;
  const translated = t(translationKey);

  // If translation is the same as the key, return the original content name
  if (translated === translationKey) {
    return content;
  }

  return translated;
}

/**
 * Get newly unlocked permissions
 *
 * Compares permissions between two levels to find new additions
 *
 * @param fromLevel - Previous level
 * @param toLevel - New level
 * @returns Array of newly unlocked permissions
 */
function getNewlyUnlockedPermissions(fromLevel: number, toLevel: number): LevelPermission[] {
  const oldPermissions = getAllPermissionsForLevel(fromLevel);
  const newPermissions = getAllPermissionsForLevel(toLevel);

  return newPermissions.filter(permission => !oldPermissions.includes(permission));
}

/**
 * Confetti animation component
 *
 * Creates a simple CSS-based confetti effect
 * Uses useState to ensure stable rendering and avoid calling impure functions during render
 */
function ConfettiEffect() {
  // Generate stable random values on mount using useState
  // This ensures Math.random() is only called during initialization, not during render
  const [confettiParticles] = React.useState(() => {
    return Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      opacity: Math.random() * 0.8 + 0.2,
      endX: (Math.random() - 0.5) * 200,
      endY: Math.random() * 400 + 200,
      colorClass: i % 5 === 0 ? 'bg-amber-400' :
                  i % 5 === 1 ? 'bg-purple-400' :
                  i % 5 === 2 ? 'bg-blue-400' :
                  i % 5 === 3 ? 'bg-pink-400' :
                  'bg-green-400',
    }));
  });

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Confetti particles using CSS animations */}
      {confettiParticles.map((particle) => (
        <div
          key={particle.id}
          className={cn(
            'absolute w-2 h-2 rounded-full',
            particle.colorClass,
            'animate-[confetti_3s_ease-out_forwards]'
          )}
          style={{
            left: `${particle.left}%`,
            top: '-10px',
            animationDelay: `${particle.delay}s`,
            opacity: particle.opacity,
            '--confetti-end-x': `${particle.endX}px`,
            '--confetti-end-y': `${particle.endY}px`,
          } as React.CSSProperties}
        />
      ))}

      {/* CSS keyframe animation injected via style tag */}
      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(var(--confetti-end-x, 0), var(--confetti-end-y, 300px)) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Level Up Modal Component
 *
 * Displays a celebratory modal when users level up, showcasing
 * their achievement and newly unlocked features. Includes animations
 * and clear call-to-action buttons.
 *
 * @param open - Whether the modal is open
 * @param onOpenChange - Callback when modal state changes
 * @param fromLevel - Previous level
 * @param toLevel - New level
 * @param onExploreFeatures - Optional callback for explore button
 * @param className - Additional CSS classes
 */
export function LevelUpModal({
  open,
  onOpenChange,
  fromLevel,
  toLevel,
  onExploreFeatures,
  className = '',
}: LevelUpModalProps) {
  const { t, language } = useLanguage();
  const [showConfetti, setShowConfetti] = useState(false);

  // Get level configurations
  const newLevelConfig = getLevelConfig(toLevel);

  // Get newly unlocked items
  const newlyUnlockedPermissions = getNewlyUnlockedPermissions(fromLevel, toLevel);
  const newlyUnlockedContent = newLevelConfig?.exclusiveContent || [];

  // Check if current language is English
  const isEnglish = language === 'en-US';

  // Trigger confetti animation when modal opens
  useEffect(() => {
    if (open) {
      // Defer state update to next tick to avoid cascading render
      const showTimer = setTimeout(() => setShowConfetti(true), 0);
      const hideTimer = setTimeout(() => setShowConfetti(false), 3000);
      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [open]);

  // Handle explore features click
  const handleExploreFeatures = () => {
    onExploreFeatures?.();
    onOpenChange(false);
  };

  if (!newLevelConfig) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col',
          className
        )}
      >
        {/* Confetti Effect */}
        {showConfetti && <ConfettiEffect />}

        {/* Header with celebration */}
        <DialogHeader className="relative z-10">
          <div className="flex flex-col items-center space-y-4 pb-4">
            {/* Sparkle icon with animation */}
            <div className="relative">
              <Sparkles className="h-16 w-16 text-amber-500 animate-pulse" />
              <div className="absolute inset-0 animate-ping">
                <Sparkles className="h-16 w-16 text-amber-500 opacity-20" />
              </div>
            </div>

            {/* Title */}
            <DialogTitle className="text-3xl text-center">
              {t('level.congratulations')}! 🎉
            </DialogTitle>

            {/* Description */}
            <DialogDescription className="text-center text-base">
              {t('level.reachedLevel')}
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Main Content - Scrollable */}
        <div className="space-y-6 py-4 relative z-10 overflow-y-auto">
          {/* New Level Badge - Animated entrance */}
          <div className="flex justify-center animate-[bounce_1s_ease-in-out]">
            <div className="transform scale-125">
              <LevelBadge
                level={toLevel}
                variant="full"
                showTitle
                className="shadow-xl"
              />
            </div>
          </div>

          {/* Level Title and Description */}
          <div className="text-center space-y-2 px-4">
            <h3 className="text-2xl font-bold">{newLevelConfig.title}</h3>
            {isEnglish && (
              <p className="text-sm text-muted-foreground italic">
                {newLevelConfig.titleEn}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {newLevelConfig.description}
            </p>
          </div>

          <Separator />

          {/* Newly Unlocked Permissions */}
          {newlyUnlockedPermissions.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Gift className="h-4 w-4 text-primary" />
                {t('level.newPermissionsUnlocked')} ({newlyUnlockedPermissions.length})
              </h4>
              <div className="grid gap-2 pl-6">
                {newlyUnlockedPermissions.map((permission, index) => (
                  <div
                    key={permission}
                    className="flex items-center gap-2 text-sm animate-[slideInLeft_0.5s_ease-out]"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>{getPermissionName(permission, t)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Newly Unlocked Content */}
          {newlyUnlockedContent.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Gift className="h-4 w-4 text-primary" />
                {t('level.newContentUnlocked')} ({newlyUnlockedContent.length})
              </h4>
              <div className="flex flex-wrap gap-2 pl-6">
                {newlyUnlockedContent.map((content, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="text-xs animate-[fadeIn_0.5s_ease-out]"
                    style={{ animationDelay: `${(newlyUnlockedPermissions.length + index) * 0.1}s` }}
                  >
                    {getExclusiveContentName(content, t)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Virtual Residence */}
          {newLevelConfig.virtualResidence && (
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">
                {t('level.virtualResidence')}
              </p>
              <p className="text-base font-semibold">
                {newLevelConfig.virtualResidence}
              </p>
            </div>
          )}
        </div>

        {/* Footer with action buttons */}
        <DialogFooter className="flex-col sm:flex-row gap-2 relative z-10">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            {t('level.keepLearning')}
          </Button>
          {onExploreFeatures && (
            <Button
              onClick={handleExploreFeatures}
              className="w-full sm:w-auto"
            >
              <span>{t('achievements.viewActivity')}</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </DialogFooter>

        {/* Additional CSS for custom animations */}
        <style jsx>{`
          @keyframes slideInLeft {
            from {
              opacity: 0;
              transform: translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
