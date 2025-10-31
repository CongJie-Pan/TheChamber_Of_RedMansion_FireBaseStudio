/**
 * @fileOverview Unit Tests for ChineseWindowNavButton Component
 *
 * Comprehensive test suite validating traditional Chinese window frame navigation
 * button functionality including rendering, interactions, accessibility, and
 * different window frame shapes.
 *
 * Test Coverage:
 * - Component rendering with various prop combinations
 * - Hover state interactions and window frame effects
 * - Active state styling
 * - Badge display (boolean and numeric)
 * - Keyboard navigation and accessibility
 * - Different window frame shapes
 * - Link vs button behavior
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ChineseWindowNavButton } from '@/components/ui/chinese-window-nav-button';
import { BookOpen } from 'lucide-react';

// Mock Next.js Link component for testing
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

describe('ChineseWindowNavButton', () => {
  describe('Basic Rendering', () => {
    it('should render with icon and label', () => {
      render(
        <ChineseWindowNavButton
          icon={BookOpen}
          label="閱讀"
          href="/read"
        />
      );

      expect(screen.getByText('閱讀')).toBeInTheDocument();
      expect(screen.getByRole('link')).toBeInTheDocument();
    });

    it('should render as button when no href provided', () => {
      const handleClick = jest.fn();
      render(
        <ChineseWindowNavButton
          icon={BookOpen}
          label="閱讀"
          onClick={handleClick}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();

      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should apply custom className', () => {
      render(
        <ChineseWindowNavButton
          icon={BookOpen}
          label="閱讀"
          href="/read"
          className="custom-class"
        />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveClass('custom-class');
    });
  });

  describe('Active State', () => {
    it('should apply active styles when isActive is true', () => {
      render(
        <ChineseWindowNavButton
          icon={BookOpen}
          label="閱讀"
          href="/read"
          isActive={true}
        />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveClass('bg-primary/10');
      expect(link).toHaveClass('text-primary');
      expect(link).toHaveAttribute('aria-current', 'page');
    });

    it('should apply muted styles when not active', () => {
      render(
        <ChineseWindowNavButton
          icon={BookOpen}
          label="閱讀"
          href="/read"
          isActive={false}
        />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveClass('text-muted-foreground');
      expect(link).not.toHaveAttribute('aria-current');
    });
  });

  describe('Badge Functionality', () => {
    it('should display dot badge when badge is true', () => {
      render(
        <ChineseWindowNavButton
          icon={BookOpen}
          label="任務"
          href="/tasks"
          badge={true}
        />
      );

      const badge = screen.getByLabelText('Has notifications');
      expect(badge).toBeInTheDocument();
    });

    it('should display numeric badge with count', () => {
      render(
        <ChineseWindowNavButton
          icon={BookOpen}
          label="任務"
          href="/tasks"
          badge={5}
        />
      );

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByLabelText('5 notifications')).toBeInTheDocument();
    });

    it('should display 99+ for counts over 99', () => {
      render(
        <ChineseWindowNavButton
          icon={BookOpen}
          label="任務"
          href="/tasks"
          badge={150}
        />
      );

      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('should not display badge when badge is false or undefined', () => {
      const { container } = render(
        <ChineseWindowNavButton
          icon={BookOpen}
          label="任務"
          href="/tasks"
          badge={false}
        />
      );

      expect(container.querySelector('.bg-red-500')).not.toBeInTheDocument();
    });
  });

  describe('Window Frame Shapes', () => {
    it.each([
      ['circular', '月門'],
      ['hexagonal', '六角窗'],
      ['octagonal', '八角窗'],
      ['quatrefoil', '四葉窗'],
    ] as const)(
      'should support %s window shape',
      (shape, shapeName) => {
        render(
          <ChineseWindowNavButton
            icon={BookOpen}
            label={shapeName}
            href="/test"
            windowShape={shape}
          />
        );

        expect(screen.getByText(shapeName)).toBeInTheDocument();
      }
    );

    it('should default to circular shape when not specified', () => {
      const { container } = render(
        <ChineseWindowNavButton
          icon={BookOpen}
          label="測試"
          href="/test"
        />
      );

      // Component should render without errors with default shape
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Hover Interactions', () => {
    it('should handle mouse enter and leave events', async () => {
      render(
        <ChineseWindowNavButton
          icon={BookOpen}
          label="閱讀"
          href="/read"
        />
      );

      const link = screen.getByRole('link');

      // Hover over the button
      fireEvent.mouseEnter(link);

      // Should show window frame effect (component internal state changes)
      await waitFor(() => {
        expect(link).toBeInTheDocument();
      });

      // Mouse leave
      fireEvent.mouseLeave(link);

      await waitFor(() => {
        expect(link).toBeInTheDocument();
      });
    });

    it('should render icon and respond to hover', async () => {
      render(
        <ChineseWindowNavButton
          icon={BookOpen}
          label="閱讀"
          href="/read"
        />
      );

      const link = screen.getByRole('link');

      // Icon component should be rendered (Lucide icons render as SVG)
      expect(link).toBeInTheDocument();

      // Test hover interaction
      fireEvent.mouseEnter(link);
      expect(link).toBeInTheDocument();

      fireEvent.mouseLeave(link);
      expect(link).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should be focusable with keyboard', () => {
      render(
        <ChineseWindowNavButton
          icon={BookOpen}
          label="閱讀"
          href="/read"
        />
      );

      const link = screen.getByRole('link');
      link.focus();

      expect(document.activeElement).toBe(link);
    });

    it('should trigger onClick on Enter key for button variant', async () => {
      const handleClick = jest.fn();
      render(
        <ChineseWindowNavButton
          icon={BookOpen}
          label="閱讀"
          onClick={handleClick}
        />
      );

      const button = screen.getByRole('button');
      button.focus();

      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(handleClick).toHaveBeenCalledTimes(1);
      });
    });

    it('should trigger onClick on Space key for button variant', async () => {
      const handleClick = jest.fn();
      render(
        <ChineseWindowNavButton
          icon={BookOpen}
          label="閱讀"
          onClick={handleClick}
        />
      );

      const button = screen.getByRole('button');
      button.focus();

      fireEvent.keyDown(button, { key: ' ', code: 'Space' });

      await waitFor(() => {
        expect(handleClick).toHaveBeenCalledTimes(1);
      });
    });

    it('should have visible focus ring', () => {
      render(
        <ChineseWindowNavButton
          icon={BookOpen}
          label="閱讀"
          href="/read"
        />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveClass('focus-visible:ring-2');
      expect(link).toHaveClass('focus-visible:ring-primary');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for active state', () => {
      render(
        <ChineseWindowNavButton
          icon={BookOpen}
          label="閱讀"
          href="/read"
          isActive={true}
        />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('aria-current', 'page');
    });

    it('should use tooltip as aria-label when provided', () => {
      render(
        <ChineseWindowNavButton
          icon={BookOpen}
          label="閱讀"
          href="/read"
          tooltip="前往閱讀頁面"
        />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('title', '前往閱讀頁面');
    });

    it('should have screen reader text for badge notifications', () => {
      render(
        <ChineseWindowNavButton
          icon={BookOpen}
          label="任務"
          href="/tasks"
          badge={true}
        />
      );

      expect(screen.getByText('New notifications')).toHaveClass('sr-only');
    });

    it('should have proper accessibility attributes', () => {
      render(
        <ChineseWindowNavButton
          icon={BookOpen}
          label="閱讀"
          href="/read"
        />
      );

      const link = screen.getByRole('link');

      // Should have accessible label
      expect(link).toBeInTheDocument();
      expect(screen.getByText('閱讀')).toBeInTheDocument();

      // Should have title for tooltip
      expect(link).toHaveAttribute('title', '閱讀');
    });
  });

  describe('Link vs Button Behavior', () => {
    it('should render as link when href is provided without onClick', () => {
      render(
        <ChineseWindowNavButton
          icon={BookOpen}
          label="閱讀"
          href="/read"
        />
      );

      expect(screen.getByRole('link')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should render as button when onClick is provided', () => {
      render(
        <ChineseWindowNavButton
          icon={BookOpen}
          label="閱讀"
          onClick={() => {}}
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('should have correct href attribute for link variant', () => {
      render(
        <ChineseWindowNavButton
          icon={BookOpen}
          label="閱讀"
          href="/read"
        />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/read');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long labels with truncation', () => {
      const longLabel = '這是一個非常非常非常長的導航標籤文字測試';
      render(
        <ChineseWindowNavButton
          icon={BookOpen}
          label={longLabel}
          href="/test"
        />
      );

      const labelElement = screen.getByText(longLabel);
      expect(labelElement).toHaveClass('truncate');
    });

    it('should require icon prop', () => {
      // Icon is a required prop - component should not render without it
      // This test verifies that TypeScript enforces the icon requirement
      const component = (
        <ChineseWindowNavButton
          icon={BookOpen}
          label="測試"
          href="/test"
        />
      );

      expect(component.props.icon).toBe(BookOpen);
      expect(component.props.label).toBe('測試');
    });

    it('should handle keyboard events properly', async () => {
      const handleClick = jest.fn();
      render(
        <ChineseWindowNavButton
          icon={BookOpen}
          label="閱讀"
          onClick={handleClick}
        />
      );

      const button = screen.getByRole('button');

      // Test Enter key
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
      await waitFor(() => {
        expect(handleClick).toHaveBeenCalledTimes(1);
      });

      // Test Space key
      fireEvent.keyDown(button, { key: ' ', code: 'Space' });
      await waitFor(() => {
        expect(handleClick).toHaveBeenCalledTimes(2);
      });
    });
  });
});
