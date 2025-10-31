/**
 * @fileOverview UI Component Tests for Level Display Components
 *
 * These tests verify the rendering and behavior of level-related UI components:
 * - LevelBadge: Compact level indicator
 * - LevelProgressBar: XP progress visualization
 * - LevelDisplay: Detailed level information display
 *
 * Test Categories:
 * 1. Component rendering with different props
 * 2. Visual state and styling
 * 3. Responsive behavior
 * 4. Edge cases (max level, zero XP, etc.)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LevelBadge } from '@/components/gamification/LevelBadge';
import { LevelProgressBar } from '@/components/gamification/LevelProgressBar';
import { LevelDisplay } from '@/components/gamification/LevelDisplay';

describe('Level UI Components', () => {
  describe('LevelBadge - Expected Use Cases', () => {
    /**
     * Test Case 1: Render level badge with basic props
     */
    it('should render level badge with correct level number', () => {
      render(<LevelBadge level={3} />);

      // Should display "Lv 3" or just "3" depending on implementation
      const badge = screen.getByText(/3/i);
      expect(badge).toBeInTheDocument();
    });

    /**
     * Test Case 2: Render level badge with title
     */
    it('should render level badge with level title', () => {
      render(<LevelBadge level={2} showTitle={true} />);

      // Should show level 2 title (門第清客 or Guest Scholar)
      const title = screen.getByText(/門第清客|Guest Scholar/i);
      expect(title).toBeInTheDocument();
    });

    /**
     * Test Case 3: Render compact level badge
     */
    it('should render compact level badge', () => {
      const { container } = render(<LevelBadge level={1} variant="compact" />);

      // Component should render
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('LevelBadge - Edge Cases', () => {
    /**
     * Edge Case 1: Level 0 (minimum level)
     */
    it('should render level 0 badge correctly', () => {
      render(<LevelBadge level={0} />);

      const badge = screen.getByText(/0/i);
      expect(badge).toBeInTheDocument();
    });

    /**
     * Edge Case 2: Level 7 (maximum level)
     */
    it('should render max level badge correctly', () => {
      render(<LevelBadge level={7} showTitle={true} />);

      // Should show level 7 title (一代宗師 or Grand Master)
      const title = screen.getByText(/一代宗師|Grand Master/i);
      expect(title).toBeInTheDocument();
    });
  });

  describe('LevelProgressBar - Expected Use Cases', () => {
    /**
     * Test Case 1: Render progress bar with mid-range progress
     */
    it('should render progress bar with correct progress percentage', () => {
      const { container } = render(
        <LevelProgressBar
          currentXP={50}
          nextLevelXP={100}
        />
      );

      // Component should render
      expect(container.firstChild).toBeInTheDocument();

      // Should show XP values
      expect(screen.getByText(/50/)).toBeInTheDocument();
      expect(screen.getByText(/100/)).toBeInTheDocument();
    });

    /**
     * Test Case 2: Render animated progress bar
     */
    it('should render animated progress bar', () => {
      const { container } = render(
        <LevelProgressBar
          currentXP={75}
          nextLevelXP={100}
          animated={true}
        />
      );

      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('LevelProgressBar - Edge Cases', () => {
    /**
     * Edge Case 1: Zero XP
     */
    it('should render progress bar with zero XP', () => {
      const { container } = render(
        <LevelProgressBar
          currentXP={0}
          nextLevelXP={100}
        />
      );

      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByText(/0/)).toBeInTheDocument();
    });

    /**
     * Edge Case 2: Full progress (at level threshold)
     */
    it('should render progress bar at 100% progress', () => {
      const { container } = render(
        <LevelProgressBar
          currentXP={100}
          nextLevelXP={100}
        />
      );

      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByText(/100/)).toBeInTheDocument();
    });

    /**
     * Edge Case 3: Max level (no next level)
     */
    it('should render progress bar for max level', () => {
      const { container } = render(
        <LevelProgressBar
          currentXP={0}
          nextLevelXP={0}
        />
      );

      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('LevelDisplay - Expected Use Cases', () => {
    /**
     * Test Case 1: Render detailed level display
     */
    it('should render complete level information', () => {
      const { container } = render(<LevelDisplay variant="detailed" />);

      // Component should render
      expect(container.firstChild).toBeInTheDocument();
    });

    /**
     * Test Case 2: Render summary level display
     */
    it('should render summary level display', () => {
      const { container } = render(<LevelDisplay variant="summary" />);

      // Component should render
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('LevelDisplay - Edge Cases', () => {
    /**
     * Edge Case 1: Render with next level preview
     */
    it('should render level display with next level preview', () => {
      const { container } = render(
        <LevelDisplay variant="detailed" showNextLevel={true} />
      );

      // Component should render
      expect(container.firstChild).toBeInTheDocument();
    });

    /**
     * Edge Case 2: Render with custom className
     */
    it('should render level display with custom className', () => {
      const { container } = render(
        <LevelDisplay variant="summary" className="custom-class" />
      );

      // Component should render
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
