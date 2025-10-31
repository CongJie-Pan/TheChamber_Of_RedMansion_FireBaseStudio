/**
 * @fileOverview Chinese Window Frame Type Definitions
 *
 * This module defines TypeScript types and configurations for traditional Chinese
 * window frame shapes used in navigation components. These shapes are inspired by
 * classical Chinese garden architecture and provide cultural authenticity.
 *
 * Supported Window Shapes:
 * - Circular (月門 Moon Gate): Symbolizes completeness and harmony
 * - Hexagonal (六角窗 Hexagonal Window): Represents six directions
 * - Octagonal (八角窗 Octagonal Window): Symbolizes eight trigrams (八卦)
 * - Quatrefoil (四葉窗 Four-leaf Window): Represents four seasons
 */

import type { LucideIcon } from 'lucide-react';

/**
 * Available traditional Chinese window frame shapes
 */
export type WindowShape = 'circular' | 'hexagonal' | 'octagonal' | 'quatrefoil';

/**
 * Configuration for a specific window frame shape
 *
 * @interface WindowFrameConfig
 * @property {WindowShape} shape - The geometric shape identifier
 * @property {string} label - Chinese name of the window shape
 * @property {string} description - Cultural meaning and symbolism
 * @property {string} clipPath - CSS clip-path value for the shape
 * @property {string} svgPath - Optional SVG path for complex rendering
 */
export interface WindowFrameConfig {
  shape: WindowShape;
  label: string;
  description: string;
  clipPath: string;
  svgPath?: string;
}

/**
 * Comprehensive configuration mapping for all window shapes
 *
 * Each shape includes:
 * - Traditional Chinese name and cultural significance
 * - CSS clip-path for efficient rendering
 * - Optional SVG path for advanced graphics
 */
export const WINDOW_SHAPES: Record<WindowShape, WindowFrameConfig> = {
  circular: {
    shape: 'circular',
    label: '月門',
    description: '圓形象徵圓滿和諧，常見於園林設計中的月門',
    clipPath: 'circle(45% at 50% 50%)',
  },
  hexagonal: {
    shape: 'hexagonal',
    label: '六角窗',
    description: '六角形代表六合（天地四方），寓意空間的完整性',
    clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
  },
  octagonal: {
    shape: 'octagonal',
    label: '八角窗',
    description: '八角形象徵八卦，代表易經中的宇宙觀',
    clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
  },
  quatrefoil: {
    shape: 'quatrefoil',
    label: '四葉窗',
    description: '四葉形代表四季輪迴，寓意生命循環',
    clipPath: 'polygon(20% 0%, 0% 20%, 0% 80%, 20% 100%, 80% 100%, 100% 80%, 100% 20%, 80% 0%)',
  },
};

/**
 * Props interface for Chinese window navigation button component
 *
 * @interface ChineseWindowNavButtonProps
 */
export interface ChineseWindowNavButtonProps {
  /** Navigation icon from lucide-react */
  icon: LucideIcon;

  /** Display label text */
  label: string;

  /** Optional link destination (if used with Next.js Link) */
  href?: string;

  /** Whether this navigation item is currently active/selected */
  isActive?: boolean;

  /** Window frame shape to display on hover */
  windowShape?: WindowShape;

  /** Optional badge indicator (boolean for dot, number for count) */
  badge?: boolean | number;

  /** Click handler callback */
  onClick?: () => void;

  /** Additional CSS classes */
  className?: string;

  /** Tooltip text (defaults to label) */
  tooltip?: string;
}

/**
 * Helper function to get window frame configuration
 *
 * @param shape - The window shape identifier
 * @returns Window frame configuration object
 */
export function getWindowFrameConfig(shape: WindowShape): WindowFrameConfig {
  return WINDOW_SHAPES[shape];
}

/**
 * Helper function to get CSS clip-path for a window shape
 *
 * @param shape - The window shape identifier
 * @returns CSS clip-path string
 */
export function getWindowClipPath(shape: WindowShape): string {
  return WINDOW_SHAPES[shape].clipPath;
}
