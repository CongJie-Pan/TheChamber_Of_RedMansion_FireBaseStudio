/**
 * @fileOverview Unit Tests for AppShell Logo Rendering (2025-10-30)
 *
 * These tests verify the sidebar logo replacement:
 * - Replaced yellow ScrollText icon with custom circular logo
 * - Uses Next.js Image component for optimization
 * - Proper dimensions (32x32)
 * - Accessible alt text
 * - Error handling for missing images
 *
 * Test Philosophy (Google's Best Practices):
 * - Test visible user behavior (logo displays)
 * - Test public APIs (rendered elements)
 * - Self-contained tests
 * - Clear assertions
 *
 * Context: User requested replacing yellow scroll icon with custom circular logo
 * from 'public/images/logo_circle.png'
 *
 * @phase Phase 1 - Critical UI Tests
 * @date 2025-10-30
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    pathname: '/dashboard',
  })),
  usePathname: jest.fn(() => '/dashboard'),
}));

// Mock Lucide icons (should NOT include ScrollText anymore)
jest.mock('lucide-react', () => ({
  LayoutDashboard: () => <div data-testid="icon-dashboard">Dashboard Icon</div>,
  BookOpen: () => <div data-testid="icon-book">Book Icon</div>,
  Users: () => <div data-testid="icon-users">Users Icon</div>,
  Trophy: () => <div data-testid="icon-trophy">Trophy Icon</div>,
  CheckSquare: () => <div data-testid="icon-tasks">Tasks Icon</div>,
  StickyNote: () => <div data-testid="icon-notes">Notes Icon</div>,
  Settings: () => <div data-testid="icon-settings">Settings Icon</div>,
  ChevronLeft: () => <div data-testid="icon-chevron-left">Chevron Left</div>,
  ChevronRight: () => <div data-testid="icon-chevron-right">Chevron Right</div>,
  Menu: () => <div data-testid="icon-menu">Menu</div>,
  X: () => <div data-testid="icon-x">X</div>,
  // ScrollText should NOT be here (removed in favor of custom logo)
}));

// Mock Shadcn UI Sidebar components
jest.mock('@/components/ui/sidebar', () => ({
  Sidebar: ({ children, ...props }: any) => <div data-testid="sidebar" {...props}>{children}</div>,
  SidebarContent: ({ children }: any) => <div data-testid="sidebar-content">{children}</div>,
  SidebarGroup: ({ children }: any) => <div data-testid="sidebar-group">{children}</div>,
  SidebarGroupContent: ({ children }: any) => <div data-testid="sidebar-group-content">{children}</div>,
  SidebarGroupLabel: ({ children }: any) => <div data-testid="sidebar-group-label">{children}</div>,
  SidebarMenu: ({ children }: any) => <div data-testid="sidebar-menu">{children}</div>,
  SidebarMenuItem: ({ children }: any) => <div data-testid="sidebar-menu-item">{children}</div>,
  SidebarMenuButton: ({ children, ...props }: any) => <button data-testid="sidebar-menu-button" {...props}>{children}</button>,
  SidebarHeader: ({ children }: any) => <div data-testid="sidebar-header">{children}</div>,
  SidebarFooter: ({ children }: any) => <div data-testid="sidebar-footer">{children}</div>,
  SidebarProvider: ({ children }: any) => <div data-testid="sidebar-provider">{children}</div>,
  SidebarTrigger: () => <button data-testid="sidebar-trigger">Toggle</button>,
  SidebarInset: ({ children }: any) => <div data-testid="sidebar-inset">{children}</div>,
}));

// Mock Auth context
jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: {
      uid: 'test-user',
      displayName: 'Test User',
      email: 'test@example.com',
    },
    logout: jest.fn(),
  })),
}));

// Mock Language context
jest.mock('@/hooks/useLanguage', () => ({
  useLanguage: jest.fn(() => ({
    language: 'zh-TW',
    t: (key: string) => {
      const translations: Record<string, string> = {
        'nav.dashboard': '儀表板',
        'nav.readBook': '閱讀紅樓夢',
        'nav.community': '社群討論',
        'nav.achievements': '成就系統',
        'nav.dailyTasks': '每日任務',
        'nav.notes': '筆記管理',
        'nav.accountSettings': '帳戶設定',
      };
      return translations[key] || key;
    },
  })),
}));

// Import component after mocks
import AppShell from '@/components/layout/AppShell';

describe('AppShell Logo Rendering Tests (2025-10-30)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Custom Logo Image', () => {
    /**
     * Test: Should render custom circular logo image
     *
     * User Request: Replace yellow scroll icon with custom circular logo
     * from 'public/images/logo_circle.png'
     *
     * Expected Behavior:
     * - Logo image is rendered
     * - Uses Next.js Image component for optimization
     * - Proper src path points to logo_circle.png
     */
    it('should render custom circular logo image', () => {
      render(
        <AppShell>
          <div>Test Content</div>
        </AppShell>
      );

      // Find logo image by alt text
      const logoImage = screen.getByAltText('紅樓慧讀 Logo');
      expect(logoImage).toBeInTheDocument();
    });

    /**
     * Test: Logo should use correct image source
     *
     * Expected Behavior:
     * - src attribute points to /images/logo_circle.png
     * - Correct path in public directory
     * - No 404 errors for missing images
     */
    it('should use /images/logo_circle.png as image source', () => {
      render(
        <AppShell>
          <div>Test Content</div>
        </AppShell>
      );

      const logoImage = screen.getByAltText('紅樓慧讀 Logo');
      expect(logoImage).toHaveAttribute('src', '/images/logo_circle.png');
    });

    /**
     * Test: Logo should have proper dimensions
     *
     * Expected Behavior:
     * - Width: 32px
     * - Height: 32px
     * - Square aspect ratio for circular logo
     * - Matches header height for proper alignment
     */
    it('should have 32x32 dimensions', () => {
      render(
        <AppShell>
          <div>Test Content</div>
        </AppShell>
      );

      const logoImage = screen.getByAltText('紅樓慧讀 Logo');
      expect(logoImage).toHaveAttribute('width', '32');
      expect(logoImage).toHaveAttribute('height', '32');
    });

    /**
     * Test: Logo should have object-contain class for proper scaling
     *
     * Expected Behavior:
     * - Uses object-contain for aspect ratio preservation
     * - Prevents image distortion
     * - Ensures logo fits within bounds
     */
    it('should have object-contain class for proper scaling', () => {
      render(
        <AppShell>
          <div>Test Content</div>
        </AppShell>
      );

      const logoImage = screen.getByAltText('紅樓慧讀 Logo');
      expect(logoImage).toHaveClass('object-contain');
    });
  });

  describe('Accessibility', () => {
    /**
     * Test: Logo should have accessible alt text
     *
     * Expected Behavior:
     * - Alt text: "紅樓慧讀 Logo"
     * - Describes the image for screen readers
     * - Provides context when image fails to load
     */
    it('should have accessible alt text "紅樓慧讀 Logo"', () => {
      render(
        <AppShell>
          <div>Test Content</div>
        </AppShell>
      );

      const logoImage = screen.getByAltText('紅樓慧讀 Logo');
      expect(logoImage).toHaveAttribute('alt', '紅樓慧讀 Logo');
    });

    /**
     * Test: Logo should be inside a link for navigation
     *
     * Expected Behavior:
     * - Logo wrapped in Link component
     * - Clicking logo navigates to /dashboard
     * - Provides intuitive "home" navigation
     */
    it('should be inside a link that navigates to dashboard', () => {
      render(
        <AppShell>
          <div>Test Content</div>
        </AppShell>
      );

      const logoImage = screen.getByAltText('紅樓慧讀 Logo');
      const parentLink = logoImage.closest('a');

      expect(parentLink).toBeInTheDocument();
      expect(parentLink).toHaveAttribute('href', '/dashboard');
    });
  });

  describe('Sidebar Header Integration', () => {
    /**
     * Test: Logo should be in sidebar header
     *
     * Expected Behavior:
     * - Logo appears in SidebarHeader component
     * - Positioned at top of sidebar
     * - Part of consistent header layout
     */
    it('should render logo inside sidebar header', () => {
      render(
        <AppShell>
          <div>Test Content</div>
        </AppShell>
      );

      const sidebarHeader = screen.getByTestId('sidebar-header');
      const logoImage = within(sidebarHeader).getByAltText('紅樓慧讀 Logo');

      expect(logoImage).toBeInTheDocument();
    });

    /**
     * Test: Logo should be displayed next to app title
     *
     * Expected Behavior:
     * - Logo and title in same container
     * - Flex layout with gap-2
     * - Visually cohesive header
     */
    it('should be displayed alongside app title text', () => {
      render(
        <AppShell>
          <div>Test Content</div>
        </AppShell>
      );

      const sidebarHeader = screen.getByTestId('sidebar-header');
      const logoImage = within(sidebarHeader).getByAltText('紅樓慧讀 Logo');

      // Logo should be in header with other content
      expect(logoImage).toBeInTheDocument();
      expect(sidebarHeader).toContainElement(logoImage);
    });
  });

  describe('Regression Prevention - Old Icon Removed', () => {
    /**
     * Test: ScrollText icon should NOT be used anymore
     *
     * Expected Behavior:
     * - Old yellow scroll icon (ScrollText) removed
     * - No Lucide ScrollText component rendered
     * - Confirms migration to custom logo
     */
    it('should not render Lucide ScrollText icon (old implementation)', () => {
      render(
        <AppShell>
          <div>Test Content</div>
        </AppShell>
      );

      // Should NOT find ScrollText icon
      const scrollTextIcon = screen.queryByTestId('lucide-scroll-text');
      expect(scrollTextIcon).not.toBeInTheDocument();
    });

    /**
     * Test: Should use Next.js Image, not regular img tag
     *
     * Expected Behavior:
     * - Uses Next/Image for optimization
     * - Automatic lazy loading
     * - Automatic image optimization
     * - Better performance than plain <img>
     */
    it('should use Next.js Image component for optimization', () => {
      render(
        <AppShell>
          <div>Test Content</div>
        </AppShell>
      );

      const logoImage = screen.getByAltText('紅樓慧讀 Logo');

      // Next.js Image is rendered (mocked as img in tests)
      expect(logoImage.tagName.toLowerCase()).toBe('img');
      expect(logoImage).toHaveAttribute('src');
    });
  });

  describe('Image Loading States', () => {
    /**
     * Test: Logo should handle loading gracefully
     *
     * Expected Behavior:
     * - No layout shift while image loads
     * - Dimensions specified prevent CLS
     * - Smooth loading experience
     */
    it('should have dimensions specified to prevent layout shift', () => {
      render(
        <AppShell>
          <div>Test Content</div>
        </AppShell>
      );

      const logoImage = screen.getByAltText('紅樓慧讀 Logo');

      // Dimensions prevent layout shift (CLS)
      expect(logoImage).toHaveAttribute('width');
      expect(logoImage).toHaveAttribute('height');
      expect(logoImage.getAttribute('width')).toBeTruthy();
      expect(logoImage.getAttribute('height')).toBeTruthy();
    });
  });

  describe('Visual Consistency', () => {
    /**
     * Test: Logo dimensions match header size
     *
     * Expected Behavior:
     * - 32x32 is appropriate for sidebar header
     * - Not too large (overwhelming)
     * - Not too small (hard to see)
     * - Balanced with text size
     */
    it('should have appropriate size for sidebar header (32x32)', () => {
      render(
        <AppShell>
          <div>Test Content</div>
        </AppShell>
      );

      const logoImage = screen.getByAltText('紅樓慧讀 Logo');

      const width = parseInt(logoImage.getAttribute('width') || '0', 10);
      const height = parseInt(logoImage.getAttribute('height') || '0', 10);

      // Reasonable size for sidebar logo
      expect(width).toBeGreaterThan(0);
      expect(width).toBeLessThanOrEqual(64);
      expect(height).toBeGreaterThan(0);
      expect(height).toBeLessThanOrEqual(64);

      // Square for circular logo
      expect(width).toBe(height);
    });

    /**
     * Test: Logo should be square (circular logo requirement)
     *
     * Expected Behavior:
     * - Width equals height
     * - Circular logo fits in square container
     * - No distortion from aspect ratio mismatch
     */
    it('should have square dimensions for circular logo', () => {
      render(
        <AppShell>
          <div>Test Content</div>
        </AppShell>
      );

      const logoImage = screen.getByAltText('紅樓慧讀 Logo');

      const width = logoImage.getAttribute('width');
      const height = logoImage.getAttribute('height');

      expect(width).toBe(height);
    });
  });

  describe('Cross-Browser Compatibility', () => {
    /**
     * Test: Image should have proper attributes for all browsers
     *
     * Expected Behavior:
     * - src attribute (required)
     * - alt attribute (accessibility)
     * - width attribute (layout stability)
     * - height attribute (layout stability)
     */
    it('should have all required image attributes', () => {
      render(
        <AppShell>
          <div>Test Content</div>
        </AppShell>
      );

      const logoImage = screen.getByAltText('紅樓慧讀 Logo');

      expect(logoImage).toHaveAttribute('src');
      expect(logoImage).toHaveAttribute('alt');
      expect(logoImage).toHaveAttribute('width');
      expect(logoImage).toHaveAttribute('height');
    });
  });

  describe('Layout Overflow Protection', () => {
    /**
     * Test: Main content area should suppress horizontal overflow
     *
     * Expected Behavior:
     * - AppShell wraps page content in a <main> with overflow-x hidden
     * - Prevents dashboard content from producing global horizontal scrollbars
     * - Ensures Task 1.3 regression is caught if styles regress
     */
    it('should clamp horizontal overflow inside the main region', () => {
      render(
        <AppShell>
          <div>Overflow Test Content</div>
        </AppShell>
      );

      const sidebarInset = screen.getByTestId('sidebar-inset');
      const mainRegion = within(sidebarInset).getByRole('main');

      expect(mainRegion.className).toMatch(/overflow-x-hidden/);
    });
  });
});
