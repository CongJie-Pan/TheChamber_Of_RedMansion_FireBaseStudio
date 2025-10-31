/**
 * @fileOverview Homepage Component Test Suite
 *
 * This test file validates the homepage functionality including:
 * - Language switching between Traditional Chinese, Simplified Chinese, and English
 * - Image URL configuration and loading
 * - Translation key completeness for all UI elements
 * - Component rendering and structure
 *
 * Test Coverage:
 * - Normal cases: Language switching works correctly
 * - Edge cases: All translation keys exist
 * - Failure cases: Missing translation keys handled gracefully
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import HomePage from '@/app/page';
import { LanguageProvider } from '@/context/LanguageContext';
import { translations, LANGUAGES } from '@/lib/translations';
import type { Language } from '@/lib/translations';

// Mock useLanguage hook for testing different languages
const mockSetLanguage = jest.fn();
let currentLanguage: Language = 'zh-TW';

jest.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    language: currentLanguage,
    setLanguage: (lang: Language) => {
      currentLanguage = lang;
      mockSetLanguage(lang);
    },
    t: (key: string) => {
      const keys = key.split('.');
      let value: any = translations[currentLanguage];
      for (const k of keys) {
        if (value && typeof value === 'object') {
          value = value[k];
        } else {
          return key; // Return key if path not found
        }
      }
      return typeof value === 'string' ? value : key;
    }
  })
}));

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img src={src} alt={alt} {...props} />;
  },
}));

// Mock Next.js Link component
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Mock Radix UI DropdownMenu components
jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div data-testid="dropdown-trigger">{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onSelect }: any) => (
    <div data-testid="dropdown-item" onClick={onSelect}>{children}</div>
  ),
}));

// Mock Radix UI Card components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

// Mock Radix UI Button component
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, ...props }: any) => {
    if (asChild) {
      return <>{children}</>;
    }
    return <button {...props}>{children}</button>;
  },
}));

// Mock Radix UI Badge component
jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => <span className={className}>{children}</span>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => {
  const MockIcon = ({ className, ...props }: any) => (
    <svg className={className} {...props} data-testid="mock-icon" />
  );

  return {
    ArrowRight: MockIcon,
    BookOpen: MockIcon,
    Users: MockIcon,
    Sparkles: MockIcon,
    Crown: MockIcon,
    Heart: MockIcon,
    ScrollText: MockIcon,
    ChevronDown: MockIcon,
    Brain: MockIcon,
    Map: MockIcon,
    Feather: MockIcon,
    MessageCircle: MockIcon,
    BarChart3: MockIcon,
    Compass: MockIcon,
    Star: MockIcon,
    Eye: MockIcon,
    Clock: MockIcon,
    TrendingUp: MockIcon,
    Award: MockIcon,
    Globe: MockIcon,
    Zap: MockIcon,
  };
});

// Test wrapper with LanguageProvider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LanguageProvider>
    {children}
  </LanguageProvider>
);

describe('Homepage Component Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentLanguage = 'zh-TW'; // Reset to default language
  });

  describe('Component Rendering', () => {
    it('should render the homepage without crashing', () => {
      const { container } = render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );
      expect(container).toBeInTheDocument();
    });

    it('should display the logo and brand name', () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );
      // Logo appears in both header and footer
      expect(screen.getAllByText('紅樓慧讀').length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('Red Mansions Study').length).toBeGreaterThanOrEqual(1);
    });

    it('should render navigation buttons', () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );
      // Navigation buttons should be present
      const loginLinks = screen.getAllByText('登入');
      expect(loginLinks.length).toBeGreaterThan(0);
    });
  });

  describe('Image URL Configuration', () => {
    it('should use local images from /images directory for content previews', () => {
      const { container } = render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      const images = container.querySelectorAll('img');
      const localImages = Array.from(images).filter(img =>
        img.getAttribute('src')?.startsWith('/images/')
      );

      // Should have at least 3 local images for content previews
      expect(localImages.length).toBeGreaterThanOrEqual(3);
    });

    it('should use specific Red Mansions themed images', () => {
      const { container } = render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      const images = container.querySelectorAll('img');
      const imageSrcs = Array.from(images).map(img => img.getAttribute('src'));

      // Check for specific Red Mansions themed image files
      const hasCharacterImage = imageSrcs.some(src => src?.includes('Hongloumeng_Tuyong_Jia_Yingchun.jpg'));
      const hasBaoyuImage = imageSrcs.some(src => src?.includes('Jia_Baoyu_Hongloumeng_Tuyong_lookingLaptop.png'));
      const hasStudyImage = imageSrcs.some(src => src?.includes('inChung_lookingLaptop.png'));

      expect(hasCharacterImage).toBe(true);
      expect(hasBaoyuImage).toBe(true);
      expect(hasStudyImage).toBe(true);
    });

    it('should use correct image file extensions (jpg/png/JPG)', () => {
      const { container } = render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      const images = container.querySelectorAll('img');
      const localImages = Array.from(images)
        .filter(img => img.getAttribute('src')?.startsWith('/images/'))
        .map(img => img.getAttribute('src'));

      // All local images should have valid extensions (case-insensitive)
      const hasValidExtensions = localImages.every(src =>
        src?.toLowerCase().endsWith('.jpg') || src?.toLowerCase().endsWith('.png')
      );

      expect(hasValidExtensions).toBe(true);
    });
  });

  describe('Language Switching - Traditional Chinese', () => {
    beforeEach(() => {
      currentLanguage = 'zh-TW';
    });

    it('should display Traditional Chinese hero title', () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );
      expect(screen.getByText(/智能引航，重煥/)).toBeInTheDocument();
      expect(screen.getByText(/紅樓之夢/)).toBeInTheDocument();
    });

    it('should display Traditional Chinese feature titles', () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );
      expect(screen.getByText('AI 智能分析')).toBeInTheDocument();
      expect(screen.getByText('人物關係圖譜')).toBeInTheDocument();
      expect(screen.getByText('智能註解系統')).toBeInTheDocument();
    });

    it('should display Traditional Chinese statistics', () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );
      expect(screen.getByText('活躍學習者')).toBeInTheDocument();
      expect(screen.getByText('詳細章節解析')).toBeInTheDocument();
    });
  });

  describe('Language Switching - Simplified Chinese', () => {
    beforeEach(() => {
      currentLanguage = 'zh-CN';
    });

    it('should display Simplified Chinese hero title', () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );
      expect(screen.getByText(/智能引航，重焕/)).toBeInTheDocument();
      expect(screen.getByText(/红楼之梦/)).toBeInTheDocument();
    });

    it('should display Simplified Chinese feature titles', () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );
      expect(screen.getByText('AI 智能分析')).toBeInTheDocument();
      expect(screen.getByText('人物关系图谱')).toBeInTheDocument();
      expect(screen.getByText('智能注解系统')).toBeInTheDocument();
    });

    it('should display Simplified Chinese statistics', () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );
      expect(screen.getByText('活跃学习者')).toBeInTheDocument();
      expect(screen.getByText('详细章节解析')).toBeInTheDocument();
    });
  });

  describe('Language Switching - English', () => {
    beforeEach(() => {
      currentLanguage = 'en-US';
    });

    it('should display English hero title', () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );
      expect(screen.getAllByText(/Intelligent Guidance, Reviving the/).length).toBeGreaterThanOrEqual(1);
      // "Red Chamber" appears in multiple places (header, title, footer, etc.)
      expect(screen.getAllByText(/Red Chamber/).length).toBeGreaterThanOrEqual(1);
    });

    it('should display English feature titles', () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );
      expect(screen.getByText('AI Intelligent Analysis')).toBeInTheDocument();
      expect(screen.getByText('Character Relationship Map')).toBeInTheDocument();
      expect(screen.getByText('Intelligent Annotation System')).toBeInTheDocument();
    });

    it('should display English statistics', () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );
      expect(screen.getByText('Active Learners')).toBeInTheDocument();
      expect(screen.getByText('Detailed Chapter Analysis')).toBeInTheDocument();
    });
  });

  describe('Translation Key Completeness', () => {
    const requiredKeys = [
      // Navigation & Buttons
      'page.navLogin',
      'page.navStartExplore',
      'page.btnStartLearning',
      'page.btnLearnMore',
      'page.btnExplore',
      'page.btnFreeStart',
      'page.btnExploreCommunity',
      // Hero Section
      'page.heroTitlePart1',
      'page.heroTitleHighlight',
      'page.heroTitlePart2',
      'page.heroSubtitle',
      // Features
      'page.featuresTitle',
      'page.featuresSubtitle',
      'page.feature1Title',
      'page.feature1Desc',
      'page.feature2Title',
      'page.feature2Desc',
      'page.feature3Title',
      'page.feature3Desc',
      'page.feature4Title',
      'page.feature4Desc',
      'page.feature5Title',
      'page.feature5Desc',
      'page.feature6Title',
      'page.feature6Desc',
      // Content Preview
      'page.contentPreviewTitle',
      'page.contentPreviewSubtitle',
      'page.preview1Title',
      'page.preview1Subtitle',
      'page.preview1Desc',
      'page.preview1Badge',
      'page.preview2Title',
      'page.preview2Subtitle',
      'page.preview2Desc',
      'page.preview2Badge',
      'page.preview3Title',
      'page.preview3Subtitle',
      'page.preview3Desc',
      'page.preview3Badge',
      // Statistics
      'page.statsTitle',
      'page.statsSubtitle',
      'page.stat1Number',
      'page.stat1Label',
      'page.stat2Number',
      'page.stat2Label',
      'page.stat3Number',
      'page.stat3Label',
      'page.stat4Number',
      'page.stat4Label',
      // CTA
      'page.ctaTitle',
      'page.ctaSubtitle',
      'page.ctaStats',
      // Footer
      'page.footerRights',
    ];

    it('should have all required translation keys in Traditional Chinese', () => {
      const zhTW = translations['zh-TW'];
      requiredKeys.forEach(key => {
        const keys = key.split('.');
        let value: any = zhTW;
        for (const k of keys) {
          value = value?.[k];
        }
        expect(value).toBeDefined();
        expect(typeof value).toBe('string');
      });
    });

    it('should have all required translation keys in Simplified Chinese', () => {
      const zhCN = translations['zh-CN'];
      requiredKeys.forEach(key => {
        const keys = key.split('.');
        let value: any = zhCN;
        for (const k of keys) {
          value = value?.[k];
        }
        expect(value).toBeDefined();
        expect(typeof value).toBe('string');
      });
    });

    it('should have all required translation keys in English', () => {
      const enUS = translations['en-US'];
      requiredKeys.forEach(key => {
        const keys = key.split('.');
        let value: any = enUS;
        for (const k of keys) {
          value = value?.[k];
        }
        expect(value).toBeDefined();
        expect(typeof value).toBe('string');
      });
    });

    it('should have non-empty translation values for all keys', () => {
      LANGUAGES.forEach(({ code }) => {
        const lang = translations[code];
        requiredKeys.forEach(key => {
          const keys = key.split('.');
          let value: any = lang;
          for (const k of keys) {
            value = value?.[k];
          }
          expect(value).toBeTruthy();
          expect(value.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Sections Rendering', () => {
    it('should render hero section with background image', () => {
      const { container } = render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      // Check for local hero header image
      const images = container.querySelectorAll('img');
      const heroImage = Array.from(images).find(img =>
        img.getAttribute('src')?.includes('/images/introImage/introPageImage.JPG')
      );
      expect(heroImage).toBeDefined();
    });

    it('should render 6 feature cards', () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      // Check for feature titles (use getAllByText since they may appear multiple times)
      expect(screen.getAllByText(/AI.*分析/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/人物.*圖譜/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/註解系統/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/社群交流/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/進度追蹤/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/詩詞.*探索/).length).toBeGreaterThanOrEqual(1);
    });

    it('should render 3 content preview cards', () => {
      const { container } = render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      // Should have 3 local images for content previews
      const localImages = container.querySelectorAll('img[src^="/images/"]');
      expect(localImages.length).toBeGreaterThanOrEqual(3);
    });

    it('should render 4 statistics', () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      expect(screen.getByText('1,200+')).toBeInTheDocument();
      expect(screen.getByText('120')).toBeInTheDocument();
      expect(screen.getByText('400+')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('should render CTA section with buttons', () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      expect(screen.getAllByText(/開啟您的紅樓夢學習之旅/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/免費開始學習/).length).toBeGreaterThanOrEqual(1);
    });

    it('should render footer with copyright', () => {
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      expect(screen.getAllByText(/© 2024/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/紅樓慧讀平台/).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper alt text for images', () => {
      const { container } = render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      const images = container.querySelectorAll('img');
      images.forEach(img => {
        const alt = img.getAttribute('alt');
        expect(alt).toBeDefined();
        expect(alt).not.toBe('');
      });
    });

    it('should have semantic HTML structure', () => {
      const { container } = render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      expect(container.querySelector('header')).toBeInTheDocument();
      expect(container.querySelector('section')).toBeInTheDocument();
      expect(container.querySelector('footer')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing translation keys gracefully', () => {
      // Mock a missing translation key
      const mockT = jest.fn((key: string) => key);

      jest.spyOn(require('@/hooks/useLanguage'), 'useLanguage').mockReturnValue({
        language: 'zh-TW',
        setLanguage: jest.fn(),
        t: mockT,
      });

      const { container } = render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      // Should not crash even with missing translations
      expect(container).toBeInTheDocument();
    });

    it('should maintain state after language switch', () => {
      const { rerender } = render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      // Switch language
      currentLanguage = 'en-US';

      rerender(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      // Should render without errors
      expect(screen.getByText(/Intelligent Guidance/)).toBeInTheDocument();
    });
  });
});
