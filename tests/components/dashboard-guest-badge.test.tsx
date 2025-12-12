/**
 * UI Tests - Dashboard Guest Badge (Phase 4-T1)
 *
 * Tests guest account indicator visibility on dashboard.
 * Validates conditional rendering based on user ID.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GUEST_USER_ID } from '@/lib/constants/guest-account';

// Mock the useAuth hook
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

// Mock other dashboard dependencies
jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value: number }) => (
    <div data-testid="progress" data-value={value} />
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={className} data-variant={variant}>
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

describe('Dashboard Guest Badge UI', () => {
  let DashboardPage: any;

  beforeEach(async () => {
    // Dynamically import the dashboard page
    DashboardPage = (await import('@/app/(main)/dashboard/page')).default;
  });

  describe('Guest account indicator visibility', () => {
    it('should show guest badge when user is guest account', () => {
      const { useAuth } = require('@/hooks/useAuth');
      useAuth.mockReturnValue({
        user: { id: GUEST_USER_ID },
        userProfile: { currentLevel: 1, currentXP: 70, totalXP: 70 },
        isLoading: false,
      });

      render(<DashboardPage />);

      // Should show guest badge
      const badge = screen.getByText('🧪 測試帳號');
      expect(badge).toBeInTheDocument();

      // Should show guest account info
      expect(screen.getByText('您正在使用訪客測試帳號')).toBeInTheDocument();
      expect(
        screen.getByText(/重新登入時重設為 70 XP • 固定 2 個每日任務/)
      ).toBeInTheDocument();
    });

    it('should not show guest badge for regular users', () => {
      const { useAuth } = require('@/hooks/useAuth');
      useAuth.mockReturnValue({
        user: { id: 'regular-user-123' },
        userProfile: { currentLevel: 2, currentXP: 150, totalXP: 150 },
        isLoading: false,
      });

      render(<DashboardPage />);

      // Should not show guest badge
      expect(screen.queryByText('🧪 測試帳號')).not.toBeInTheDocument();
      expect(
        screen.queryByText('您正在使用訪客測試帳號')
      ).not.toBeInTheDocument();
    });
  });

  describe('Guest badge styling', () => {
    it('should apply correct styling classes for visibility', () => {
      const { useAuth } = require('@/hooks/useAuth');
      useAuth.mockReturnValue({
        user: { id: GUEST_USER_ID },
        userProfile: { currentLevel: 1, currentXP: 70, totalXP: 70 },
        isLoading: false,
      });

      const { container } = render(<DashboardPage />);

      // Find the card containing guest badge
      const guestCard = container.querySelector(
        '.bg-yellow-50, .dark\\:bg-yellow-950'
      );
      expect(guestCard).toBeInTheDocument();

      // Should have yellow theme for warning/info
      expect(guestCard?.className).toMatch(/yellow/);
    });

    it('should render badge with outline variant', () => {
      const { useAuth } = require('@/hooks/useAuth');
      useAuth.mockReturnValue({
        user: { id: GUEST_USER_ID },
        userProfile: { currentLevel: 1, currentXP: 70, totalXP: 70 },
        isLoading: false,
      });

      render(<DashboardPage />);

      const badge = screen.getByText('🧪 測試帳號');
      expect(badge).toHaveAttribute('data-variant', 'outline');
    });
  });

  describe('Loading state handling', () => {
    it('should not show guest badge during loading', () => {
      const { useAuth } = require('@/hooks/useAuth');
      useAuth.mockReturnValue({
        user: null,
        userProfile: null,
        isLoading: true,
      });

      render(<DashboardPage />);

      // Should not show badge during loading
      expect(screen.queryByText('🧪 測試帳號')).not.toBeInTheDocument();
    });

    it('should show guest badge after loading completes', () => {
      const { useAuth } = require('@/hooks/useAuth');

      // Start with loading
      useAuth.mockReturnValue({
        user: null,
        userProfile: null,
        isLoading: true,
      });

      const { rerender } = render(<DashboardPage />);
      expect(screen.queryByText('🧪 測試帳號')).not.toBeInTheDocument();

      // Finish loading with guest user
      useAuth.mockReturnValue({
        user: { id: GUEST_USER_ID },
        userProfile: { currentLevel: 1, currentXP: 70, totalXP: 70 },
        isLoading: false,
      });

      rerender(<DashboardPage />);
      expect(screen.getByText('🧪 測試帳號')).toBeInTheDocument();
    });
  });
});
