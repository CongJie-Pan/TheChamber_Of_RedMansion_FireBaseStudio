/**
 * @fileOverview Chinese Window Navigation Button Component
 *
 * A specialized navigation button component that displays traditional Chinese
 * window frame effects on hover. This component integrates classical Chinese
 * garden architecture aesthetics (borrowed scenery - 借景) with modern web UI.
 *
 * Key Features:
 * - Hover-activated geometric window frames (月門、六角窗、八角窗、四葉窗)
 * - Smooth CSS animations using clip-path
 * - Badge support for notifications
 * - Active state visual feedback
 * - Keyboard navigation and accessibility
 * - Responsive design
 *
 * Technical Implementation:
 * - Uses CSS clip-path for efficient window frame rendering
 * - Implements micro-interactions with cubic-bezier easing
 * - Integrates with Next.js Link for client-side navigation
 * - Fully typed with TypeScript for type safety
 *
 * Design Philosophy:
 * - Minimalist design with cultural authenticity
 * - Subtle animations that don't distract
 * - Accessibility-first approach
 * - Performance-optimized CSS-only effects
 */

"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type {
  ChineseWindowNavButtonProps,
  WindowShape,
} from '@/types/chinese-window';
import { getWindowClipPath, getWindowFrameConfig } from '@/types/chinese-window';

/**
 * ChineseWindowNavButton Component
 *
 * Navigation button with traditional Chinese window frame hover effects.
 * Designed for use in AppShell sidebar navigation.
 *
 * @example
 * ```tsx
 * <ChineseWindowNavButton
 *   icon={BookOpen}
 *   label="閱讀"
 *   href="/read"
 *   isActive={pathname === '/read'}
 *   windowShape="hexagonal"
 *   badge={false}
 * />
 * ```
 */
export const ChineseWindowNavButton = React.forwardRef<
  HTMLAnchorElement | HTMLButtonElement,
  ChineseWindowNavButtonProps
>(
  (
    {
      icon: Icon,
      label,
      href,
      isActive = false,
      windowShape = 'circular',
      badge,
      onClick,
      className,
      tooltip,
    },
    ref
  ) => {
    const [isHovered, setIsHovered] = useState(false);

    // Get window frame configuration
    const frameConfig = getWindowFrameConfig(windowShape);
    const clipPath = getWindowClipPath(windowShape);

    /**
     * Common button styles shared between Link and button variants
     */
    const buttonClasses = cn(
      // Base styles
      'relative w-full flex items-center gap-3 px-4 py-3 rounded-lg',
      'transition-all duration-300 ease-out',
      'group overflow-visible',

      // Typography
      'text-sm font-medium',

      // Focus styles (accessibility)
      'focus-visible:outline-none focus-visible:ring-2',
      'focus-visible:ring-primary focus-visible:ring-offset-2',
      'focus-visible:ring-offset-background',

      // Hover effects
      'hover:bg-accent/50',

      // Active state
      isActive && 'bg-primary/10 text-primary',
      !isActive && 'text-muted-foreground hover:text-foreground',

      // Custom classes
      className
    );

    /**
     * Window frame border element (shown on hover)
     *
     * Uses dual-layer technique to create visible border outline:
     * - Outer layer: Larger window shape with gradient + glow
     * - Inner layer: Slightly smaller window shape (transparent)
     * - The difference creates the border effect
     */
    const WindowFrameBorder = () => (
      <>
        {/* Outer layer: Creates the glowing border frame */}
        <div
          className={cn(
            // Positioning - extends beyond button bounds
            'absolute pointer-events-none',
            'transition-all duration-500 ease-out',

            // Initial state (hidden)
            'opacity-0 scale-90',

            // Hover state (visible with expansion)
            isHovered && 'opacity-100 scale-105',

            // Z-index layering - on top of button content
            'z-10'
          )}
          style={{
            // Extend 8px beyond button to create "floating frame" effect
            inset: '-8px',

            // Gradient background for modern aesthetic
            background:
              'linear-gradient(135deg, hsl(var(--primary)/0.85), hsl(var(--accent)/0.7), hsl(var(--primary)/0.85))',

            // Clip to window shape
            clipPath: clipPath,

            // Multi-layered glow effect
            boxShadow: isHovered
              ? `0 0 24px 2px hsl(var(--primary)/0.6),
                 0 0 12px 1px hsl(var(--accent)/0.5),
                 inset 0 0 20px hsl(var(--primary)/0.3)`
              : 'none',

            // Enhanced outline visibility
            filter: 'drop-shadow(0 0 8px hsl(var(--primary)/0.4))',

            animation: isHovered ? 'window-glow 0.6s ease-out' : 'none',
          }}
          aria-hidden="true"
        />

        {/* Inner layer: Creates transparent "cutout" for border effect */}
        <div
          className={cn(
            'absolute pointer-events-none',
            'transition-all duration-500 ease-out',
            isHovered ? 'opacity-100 scale-105' : 'opacity-0 scale-90',
            'z-10'
          )}
          style={{
            // Slightly smaller to create border thickness
            inset: '-4px',

            // Transparent background creates the border gap
            background: 'transparent',

            // Match parent clip-path but slightly smaller
            clipPath: clipPath,

            // Inner shadow for depth
            boxShadow: isHovered
              ? 'inset 0 0 15px 2px hsl(var(--background)/0.9)'
              : 'none',
          }}
          aria-hidden="true"
        />
      </>
    );

    /**
     * Active state background element (subtle frame shown when active)
     */
    const ActiveFrameBackground = () =>
      isActive ? (
        <div
          className="absolute inset-0 pointer-events-none opacity-40 z-0"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)/0.2), hsl(var(--accent)/0.12), hsl(var(--primary)/0.15))',
            clipPath: clipPath,
          }}
          aria-hidden="true"
        />
      ) : null;

    /**
     * Badge indicator element
     */
    const BadgeIndicator = () => {
      if (!badge) return null;

      // Numeric badge
      if (typeof badge === 'number') {
        return (
          <span
            className={cn(
              'ml-auto flex h-5 min-w-5 items-center justify-center',
              'rounded-full bg-red-500 text-white',
              'text-xs font-semibold px-1.5',
              'relative z-30'
            )}
            aria-label={`${badge} notifications`}
          >
            {badge > 99 ? '99+' : badge}
          </span>
        );
      }

      // Dot badge (boolean)
      return (
        <span
          className={cn(
            'ml-auto flex h-2 w-2 rounded-full bg-red-500',
            'relative z-30',
            'animate-pulse'
          )}
          aria-label="Has notifications"
        >
          <span className="sr-only">New notifications</span>
        </span>
      );
    };

    /**
     * Button content JSX (icon + label + badge)
     * Stored as JSX element to avoid creating components during render
     */
    const buttonContentJSX = (
      <>
        {/* Window frame effects - Layer 1 (background) */}
        <ActiveFrameBackground />

        {/* Window frame border - REMOVED for simpler styling */}
        {/* <WindowFrameBorder /> */}

        {/* Icon - Layer 3 (content) */}
        <Icon
          className={cn(
            'h-5 w-5 shrink-0 relative z-20',
            'transition-transform duration-300',
            isHovered && 'scale-110'
          )}
          aria-hidden="true"
        />

        {/* Label - Layer 3 (content) */}
        <span className="truncate relative z-20">{label}</span>

        {/* Badge - Layer 4 (top) */}
        <BadgeIndicator />
      </>
    );

    /**
     * Event handlers
     */
    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => setIsHovered(false);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick?.();
      }
    };

    /**
     * Render as Link (for navigation) or button (for actions)
     */
    if (href && !onClick) {
      return (
        <Link
          ref={ref as React.ForwardedRef<HTMLAnchorElement>}
          href={href}
          className={buttonClasses}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          aria-current={isActive ? 'page' : undefined}
          title={tooltip || label}
        >
          {buttonContentJSX}
        </Link>
      );
    }

    return (
      <button
        ref={ref as React.ForwardedRef<HTMLButtonElement>}
        type="button"
        className={buttonClasses}
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onKeyDown={handleKeyDown}
        aria-current={isActive ? 'page' : undefined}
        aria-label={tooltip || label}
        title={tooltip || label}
      >
        {buttonContentJSX}
      </button>
    );
  }
);

ChineseWindowNavButton.displayName = 'ChineseWindowNavButton';

export default ChineseWindowNavButton;
