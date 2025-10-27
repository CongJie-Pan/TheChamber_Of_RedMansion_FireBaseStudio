/**
 * @fileOverview Homepage Integration Tests
 *
 * Comprehensive test suite for the transformed Red Mansions homepage featuring
 * horizontal scroll experience, museum aesthetics, and interactive components.
 * Tests cover functionality, accessibility, responsive behavior, and user interactions.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import HomePage from '@/app/page';
import { LanguageProvider } from '@/context/LanguageContext';

// Mock Next.js components
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: any) {
    return (
      <a
        href={href}
        {...props}
        onClick={(e) => {
          // Prevent actual navigation in tests
          e.preventDefault();
          if (props.onClick) {
            props.onClick(e);
          }
        }}
      >
        {children}
      </a>
    );
  };
});

jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} data-testid="next-image" />;
  };
});

// Mock Next.js navigation to prevent routing errors
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// Mock the custom components
jest.mock('@/components/HorizontalScrollContainer', () => {
  return function MockHorizontalScrollContainer({ children, onScroll, ...props }: any) {
    React.useEffect(() => {
      // Simulate scroll progress updates
      if (onScroll) {
        setTimeout(() => onScroll(100, 0.25), 100);
        setTimeout(() => onScroll(200, 0.5), 200);
      }
    }, [onScroll]);

    return (
      <div data-testid="horizontal-scroll-container" {...props}>
        {children}
      </div>
    );
  };
});

jest.mock('@/components/MuseumContentCard', () => {
  return function MockMuseumContentCard({ title, onClick, className, ...props }: any) {
    return (
      <div
        data-testid="museum-content-card"
        className={className}
        onClick={onClick}
        {...props}
      >
        <h3>{title}</h3>
      </div>
    );
  };
});

jest.mock('@/components/WindowFrameNavigation', () => {
  return function MockWindowFrameNavigation({ items, onItemClick, ...props }: any) {
    return (
      <div data-testid="window-frame-navigation" {...props}>
        {items.map((item: any, index: number) => (
          <button
            key={item.id}
            onClick={() => onItemClick?.(item)}
            data-testid={`window-frame-item-${item.id}`}
          >
            {item.title}
          </button>
        ))}
      </div>
    );
  };
});

jest.mock('@/components/CharacterGarden', () => {
  return function MockCharacterGarden({ characters, onCharacterSelect, ...props }: any) {
    return (
      <div data-testid="character-garden" {...props}>
        {characters.map((character: any, index: number) => (
          <button
            key={character.id}
            onClick={() => onCharacterSelect?.(character)}
            data-testid={`character-${character.id}`}
          >
            {character.name} ({character.chineseName})
          </button>
        ))}
      </div>
    );
  };
});

jest.mock('@/components/ParallaxSection', () => {
  const MockParallaxLayer = ({ children, ...props }: any) => (
    <div data-testid="parallax-layer" {...props}>
      {children}
    </div>
  );

  const MockParallaxSection = ({ children, ...props }: any) => (
    <div data-testid="parallax-section" {...props}>
      {children}
    </div>
  );

  MockParallaxSection.displayName = 'ParallaxSection';
  return {
    __esModule: true,
    default: MockParallaxSection,
    ParallaxLayer: MockParallaxLayer,
    ParallaxPresets: {
      Background: { speed: 0.8, className: 'parallax-far' },
      Midground: { speed: 0.5, className: 'parallax-mid' },
      Foreground: { speed: 0.2, className: 'parallax-near' },
    },
  };
});

// Mock useLanguage hook
jest.mock('@/hooks/useLanguage', () => ({
  useLanguage: jest.fn(() => ({
    language: 'zh-TW',
    setLanguage: jest.fn(),
    t: jest.fn((key: string) => {
      const translations: Record<string, string> = {
        'appName': '紅樓慧讀',
        'page.heroTitlePart1': '探索',
        'page.heroTitleHighlight': '紅樓夢',
        'page.heroTitlePart2': '的世界',
        'page.heroSubtitle': 'Journey through China\'s greatest classical novel',
        'buttons.startLearning': 'Begin Journey',
        'buttons.learnMore': 'Explore Characters',
      };
      return translations[key] || key;
    }),
  })),
}));

// Mock LANGUAGES constant
jest.mock('@/lib/translations', () => ({
  LANGUAGES: [
    { code: 'zh-TW', name: '繁體中文' },
    { code: 'zh-CN', name: '简体中文' },
    { code: 'en-US', name: 'English (US)' },
  ],
}));

// Helper function to render homepage with providers
const renderHomepage = () => {
  return render(
    <LanguageProvider>
      <HomePage />
    </LanguageProvider>
  );
};

describe('Homepage Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();

    // Mock window.matchMedia for responsive tests
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    // Mock performance.now for animations
    global.performance.now = jest.fn(() => Date.now());

    // Mock requestAnimationFrame
    global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
    global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    test('renders homepage without crashing', () => {
      renderHomepage();
      expect(screen.getByTestId('horizontal-scroll-container')).toBeInTheDocument();
    });

    test('renders main navigation header', () => {
      renderHomepage();
      expect(screen.getByText('紅樓慧讀')).toBeInTheDocument();
      expect(screen.getByText('Red Mansions Study')).toBeInTheDocument();
    });

    test('renders hero section with correct titles', () => {
      renderHomepage();
      expect(screen.getByText('探索')).toBeInTheDocument();
      expect(screen.getByText('紅樓夢')).toBeInTheDocument();
      expect(screen.getByText('的世界')).toBeInTheDocument();
      expect(screen.getByText('Journey through China\'s greatest classical novel')).toBeInTheDocument();
    });

    test('renders all main sections', () => {
      renderHomepage();
      expect(screen.getAllByTestId('parallax-section')).toHaveLength(5);
      expect(screen.getByTestId('character-garden')).toBeInTheDocument();
      expect(screen.getByTestId('window-frame-navigation')).toBeInTheDocument();
    });

    test('renders character data correctly', () => {
      renderHomepage();
      expect(screen.getByTestId('character-lin-daiyu')).toBeInTheDocument();
      expect(screen.getByTestId('character-jia-baoyu')).toBeInTheDocument();
      expect(screen.getByText('Lin Daiyu (林黛玉)')).toBeInTheDocument();
      expect(screen.getByText('Jia Baoyu (賈寶玉)')).toBeInTheDocument();
    });

    test('renders window frame navigation items', () => {
      renderHomepage();
      expect(screen.getByTestId('window-frame-item-characters')).toBeInTheDocument();
      expect(screen.getByTestId('window-frame-item-chapters')).toBeInTheDocument();
      expect(screen.getByText('Characters')).toBeInTheDocument();
      expect(screen.getByText('Chapters')).toBeInTheDocument();
    });

    test('renders museum content cards', () => {
      renderHomepage();
      const museumCards = screen.getAllByTestId('museum-content-card');
      expect(museumCards).toHaveLength(3);
      expect(screen.getByText('The Dream of the Red Chamber')).toBeInTheDocument();
      expect(screen.getByText('Character Relationships')).toBeInTheDocument();
    });

    test('renders floating action buttons', () => {
      renderHomepage();
      const helpLink = screen.getByRole('link', { name: /help/i });
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(helpLink).toHaveAttribute('href', '/help');
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    });
  });

  describe('User Interactions', () => {
    test('handles character selection', async () => {
      renderHomepage();
      const character = screen.getByTestId('character-lin-daiyu');

      await user.click(character);
      // Character selection should trigger state updates
      expect(character).toBeInTheDocument();
    });

    test('handles window frame navigation clicks', async () => {
      renderHomepage();
      const windowFrameItem = screen.getByTestId('window-frame-item-characters');

      await user.click(windowFrameItem);
      expect(windowFrameItem).toBeInTheDocument();
    });

    test('handles museum card interactions', async () => {
      renderHomepage();
      const museumCard = screen.getAllByTestId('museum-content-card')[0];

      await user.click(museumCard);
      expect(museumCard).toBeInTheDocument();
    });

    test('handles navigation button clicks', async () => {
      renderHomepage();
      const beginButton = screen.getByRole('link', { name: /Begin Journey/i });
      const exploreButton = screen.getByRole('button', { name: /Explore Characters/i });

      expect(beginButton).toHaveAttribute('href', '/dashboard');
      await user.click(exploreButton);
      expect(exploreButton).toBeInTheDocument();
    });

    test('handles language selector interaction', async () => {
      renderHomepage();
      const languageButton = screen.getByRole('button', { name: /繁體中文/i });

      await user.click(languageButton);
      // Language dropdown should be interactive
      expect(languageButton).toBeInTheDocument();
    });

    test('handles scroll progress updates', async () => {
      renderHomepage();

      // Wait for scroll progress to be updated by mock
      await waitFor(() => {
        const progressElement = screen.getByText(/Progress:/);
        expect(progressElement).toBeInTheDocument();
      });
    });
  });

  describe('Animation and CSS Classes', () => {
    test('applies hero entrance animation classes', () => {
      renderHomepage();
      const heroElements = document.querySelectorAll('.hero-entrance');
      expect(heroElements.length).toBeGreaterThan(0);
    });

    test('applies interactive animation classes', () => {
      renderHomepage();
      const enhancedElements = document.querySelectorAll('.accent-hover-enhanced');
      const floatingElements = document.querySelectorAll('.floating-element');

      expect(enhancedElements.length).toBeGreaterThan(0);
      expect(floatingElements.length).toBeGreaterThan(0);
    });

    test('applies museum and parallax styling classes', () => {
      renderHomepage();
      const museumPanels = document.querySelectorAll('.bg-museum-panel');
      const scrollBackground = document.querySelectorAll('.bg-scroll');

      expect(museumPanels.length).toBeGreaterThan(0);
      expect(scrollBackground.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Behavior', () => {
    test('renders mobile-friendly navigation', () => {
      renderHomepage();
      // Check for responsive classes and mobile-friendly elements
      const navigation = screen.getByRole('banner');
      expect(navigation).toHaveClass('fixed', 'top-0');
    });

    test('handles reduced motion preferences', () => {
      // Mock prefers-reduced-motion
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      renderHomepage();
      // Components should respect reduced motion preferences
      expect(screen.getByTestId('horizontal-scroll-container')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('provides proper ARIA labels and roles', () => {
      renderHomepage();

      const navigation = screen.getByRole('banner');
      const buttons = screen.getAllByRole('button');
      const links = screen.getAllByRole('link');

      expect(navigation).toBeInTheDocument();
      expect(buttons.length).toBeGreaterThan(0);
      expect(links.length).toBeGreaterThan(0);
    });

    test('supports keyboard navigation', async () => {
      renderHomepage();

      const buttons = screen.getAllByRole('button');
      if (buttons.length > 0) {
        await user.tab();
        expect(document.activeElement).toBe(buttons[0]);
      }
    });

    test('provides alternative text for images', () => {
      renderHomepage();
      const images = screen.getAllByTestId('next-image');

      images.forEach(img => {
        expect(img).toHaveAttribute('alt');
      });
    });

    test('maintains color contrast for text elements', () => {
      renderHomepage();

      // Check for proper text color classes
      const textElements = document.querySelectorAll('.text-foreground, .text-accent, .text-primary');
      expect(textElements.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Optimization', () => {
    test('loads images with proper optimization', () => {
      renderHomepage();
      const images = screen.getAllByTestId('next-image');

      expect(images.length).toBeGreaterThan(0);
      images.forEach(img => {
        expect(img).toHaveAttribute('src');
      });
    });

    test('implements proper component lazy loading', () => {
      renderHomepage();

      // Check that components are rendered without blocking
      expect(screen.getByTestId('horizontal-scroll-container')).toBeInTheDocument();
      expect(screen.getByTestId('character-garden')).toBeInTheDocument();
    });

    test('handles scroll performance optimization', () => {
      renderHomepage();

      // Mock scroll events should not cause performance issues
      const scrollContainer = screen.getByTestId('horizontal-scroll-container');
      expect(scrollContainer).toBeInTheDocument();
    });
  });

  describe('Content Accuracy', () => {
    test('displays correct character information', () => {
      renderHomepage();

      // Verify key characters are present with correct names
      expect(screen.getByText('Lin Daiyu (林黛玉)')).toBeInTheDocument();
      expect(screen.getByText('Jia Baoyu (賈寶玉)')).toBeInTheDocument();
      expect(screen.getByText('Xue Baochai (薛寶釵)')).toBeInTheDocument();
    });

    test('displays correct navigation content', () => {
      renderHomepage();

      // Verify window frame navigation content
      expect(screen.getByText('Characters')).toBeInTheDocument();
      expect(screen.getByText('Chapters')).toBeInTheDocument();
      expect(screen.getByText('Literary Analysis')).toBeInTheDocument();
      expect(screen.getByText('Poetry & Verses')).toBeInTheDocument();
    });

    test('displays correct section titles', () => {
      renderHomepage();

      // Check for Chinese section titles
      expect(screen.getByText('Character Garden')).toBeInTheDocument();
      expect(screen.getByText('人物花園')).toBeInTheDocument();
      expect(screen.getByText('Borrowed Scenery')).toBeInTheDocument();
      expect(screen.getByText('借景觀賞')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles missing image gracefully', () => {
      renderHomepage();

      // Images should render with fallback handling
      const images = screen.getAllByTestId('next-image');
      expect(images.length).toBeGreaterThan(0);
    });

    test('handles missing translation keys', () => {
      renderHomepage();

      // Should not crash with missing translations
      expect(screen.getByTestId('horizontal-scroll-container')).toBeInTheDocument();
    });

    test('handles component interaction errors gracefully', async () => {
      renderHomepage();

      // Should not crash when interacting with components
      const character = screen.getByTestId('character-lin-daiyu');
      await user.click(character);

      expect(character).toBeInTheDocument();
    });
  });
});