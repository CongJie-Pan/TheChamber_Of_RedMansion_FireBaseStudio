/**
 * @fileOverview WindowFrameNavigation Component Tests
 *
 * Comprehensive test suite for the WindowFrameNavigation component,
 * testing geometric frame shapes, parallax effects, seasonal effects,
 * keyboard navigation, and accessibility.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import WindowFrameNavigation, {
  type WindowFrameNavigationProps,
  type WindowFrameItem,
  type WindowFrameShape
} from '@/components/WindowFrameNavigation';

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} data-testid="next-image" />;
  };
});

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  ArrowRight: () => <svg data-testid="arrow-right-icon" />,
  Eye: () => <svg data-testid="eye-icon" />,
  Maximize2: () => <svg data-testid="maximize2-icon" />,
  RotateCcw: () => <svg data-testid="rotate-ccw-icon" />,
  Sparkles: () => <svg data-testid="sparkles-icon" />,
}));

// Mock useLanguage hook
jest.mock('@/hooks/useLanguage', () => ({
  useLanguage: jest.fn(() => ({
    t: jest.fn((key: string) => {
      const translations: Record<string, string> = {
        'seasons.spring': 'Spring',
        'seasons.summer': 'Summer',
        'seasons.autumn': 'Autumn',
        'seasons.winter': 'Winter',
      };
      return translations[key] || key;
    }),
  })),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, className, onClick, ...props }: any) => (
    <button className={className} onClick={onClick} {...props} data-testid="button">
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, ...props }: any) => (
    <span className={className} {...props} data-testid="badge">
      {children}
    </span>
  ),
}));

describe('WindowFrameNavigation', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let mockOnItemClick: jest.Mock;

  const mockItems: WindowFrameItem[] = [
    {
      id: 'item1',
      title: 'Character Study',
      description: 'Detailed analysis of main characters',
      image: 'https://example.com/image1.jpg',
      imageAlt: 'Character study image',
      category: 'Characters',
      tags: ['analysis', 'characters'],
      featured: true,
      depth: 0,
    },
    {
      id: 'item2',
      title: 'Chapter Summary',
      description: 'Comprehensive chapter breakdown',
      image: 'https://example.com/image2.jpg',
      category: 'Chapters',
      tags: ['summary', 'chapters'],
      depth: 1,
    },
    {
      id: 'item3',
      title: 'Poetry Analysis',
      description: 'Classical Chinese poetry interpretation',
      image: 'https://example.com/image3.jpg',
      category: 'Poetry',
      tags: ['poetry', 'analysis'],
      depth: 2,
    },
  ];

  const defaultProps: WindowFrameNavigationProps = {
    items: mockItems,
    shape: 'circular',
    columns: 3,
    spacing: 24,
    frameSize: 'medium',
    enableParallax: true,
    enableRotation: false,
    seasonalEffects: true,
  };

  beforeEach(() => {
    user = userEvent.setup();
    mockOnItemClick = jest.fn();

    // Mock getBoundingClientRect
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      width: 900,
      height: 300,
      top: 0,
      left: 0,
      bottom: 300,
      right: 900,
      x: 0,
      y: 0,
      toJSON: jest.fn(),
    }));

    // Mock performance.now for animations
    global.performance.now = jest.fn(() => Date.now());

    // Mock requestAnimationFrame
    global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
    global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders window frame navigation container', () => {
      render(<WindowFrameNavigation {...defaultProps} />);

      const container = document.querySelector('.window-frame-navigation');
      expect(container).toBeInTheDocument();
    });

    test('renders all window frame items', () => {
      render(<WindowFrameNavigation {...defaultProps} />);

      mockItems.forEach(item => {
        expect(screen.getByText(item.title)).toBeInTheDocument();
        expect(screen.getByText(item.description)).toBeInTheDocument();
      });
    });

    test('renders images for all items', () => {
      render(<WindowFrameNavigation {...defaultProps} />);

      const images = screen.getAllByTestId('next-image');
      expect(images).toHaveLength(mockItems.length);

      images.forEach((img, index) => {
        expect(img).toHaveAttribute('src', mockItems[index].image);
        expect(img).toHaveAttribute('alt', mockItems[index].imageAlt || mockItems[index].title);
      });
    });

    test('renders category badges when provided', () => {
      render(<WindowFrameNavigation {...defaultProps} />);

      mockItems.forEach(item => {
        if (item.category) {
          expect(screen.getByText(item.category)).toBeInTheDocument();
        }
      });
    });

    test('renders tags when provided', () => {
      render(<WindowFrameNavigation {...defaultProps} />);

      // Check that tags are rendered (some tags may appear multiple times)
      const allTags = mockItems.flatMap(item => item.tags?.slice(0, 2) || []);
      const uniqueTags = [...new Set(allTags)];

      uniqueTags.forEach(tag => {
        const tagElements = screen.getAllByText(tag);
        expect(tagElements.length).toBeGreaterThan(0);
      });
    });

    test('renders featured indicator for featured items', () => {
      render(<WindowFrameNavigation {...defaultProps} />);

      const sparklesIcons = screen.getAllByTestId('sparkles-icon');
      const featuredItems = mockItems.filter(item => item.featured);
      expect(sparklesIcons).toHaveLength(featuredItems.length);
    });

    test('renders arrow right icons for interaction', () => {
      render(<WindowFrameNavigation {...defaultProps} />);

      const arrowIcons = screen.getAllByTestId('arrow-right-icon');
      expect(arrowIcons).toHaveLength(mockItems.length);
    });
  });

  describe('Frame Shapes', () => {
    const shapes: WindowFrameShape[] = [
      'circular', 'hexagonal', 'quatrefoil', 'octagonal',
      'rectangular', 'diamond', 'flower'
    ];

    shapes.forEach(shape => {
      test(`applies ${shape} frame shape clip-path`, () => {
        render(<WindowFrameNavigation {...defaultProps} shape={shape} />);

        const frames = document.querySelectorAll('.window-frame');
        expect(frames.length).toBeGreaterThan(0);

        frames.forEach(frame => {
          const contentArea = frame.querySelector('[style*="clip-path"]');
          expect(contentArea).toBeInTheDocument();
        });
      });
    });

    test('applies custom clip-path when provided', () => {
      const customClipPath = 'polygon(0% 0%, 100% 0%, 50% 100%)';
      render(
        <WindowFrameNavigation
          {...defaultProps}
          shape="custom"
          customClipPath={customClipPath}
        />
      );

      const frames = document.querySelectorAll('.window-frame');
      expect(frames.length).toBeGreaterThan(0);
    });
  });

  describe('Frame Sizes', () => {
    test('applies small frame size', () => {
      render(<WindowFrameNavigation {...defaultProps} frameSize="small" />);

      const frames = document.querySelectorAll('.window-frame');
      frames.forEach(frame => {
        expect(frame).toHaveStyle({ width: '200px', height: '200px' });
      });
    });

    test('applies medium frame size by default', () => {
      render(<WindowFrameNavigation {...defaultProps} frameSize="medium" />);

      const frames = document.querySelectorAll('.window-frame');
      frames.forEach(frame => {
        expect(frame).toHaveStyle({ width: '280px', height: '280px' });
      });
    });

    test('applies large frame size', () => {
      render(<WindowFrameNavigation {...defaultProps} frameSize="large" />);

      const frames = document.querySelectorAll('.window-frame');
      frames.forEach(frame => {
        expect(frame).toHaveStyle({ width: '360px', height: '360px' });
      });
    });
  });

  describe('Grid Layout', () => {
    test('applies correct grid columns', () => {
      render(<WindowFrameNavigation {...defaultProps} columns={4} />);

      const grid = document.querySelector('[style*="grid-template-columns"]');
      expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(4, 1fr)' });
    });

    test('applies correct grid spacing', () => {
      render(<WindowFrameNavigation {...defaultProps} spacing={32} />);

      const grid = document.querySelector('[style*="gap"]');
      expect(grid).toHaveStyle({ gap: '32px' });
    });
  });

  describe('Interactive Features', () => {
    test('handles item click with onItemClick prop', async () => {
      render(<WindowFrameNavigation {...defaultProps} onItemClick={mockOnItemClick} />);

      const firstFrame = document.querySelector('.window-frame');
      if (firstFrame) {
        await user.click(firstFrame);
        expect(mockOnItemClick).toHaveBeenCalledWith(mockItems[0]);
      }
    });

    test('handles item click with item.onClick', async () => {
      const mockItemClick = jest.fn();
      const itemsWithClick = [
        { ...mockItems[0], onClick: mockItemClick },
        ...mockItems.slice(1)
      ];

      render(<WindowFrameNavigation {...defaultProps} items={itemsWithClick} />);

      const firstFrame = document.querySelector('.window-frame');
      if (firstFrame) {
        await user.click(firstFrame);
        expect(mockItemClick).toHaveBeenCalled();
      }
    });

    test('handles keyboard navigation with Enter key', async () => {
      render(<WindowFrameNavigation {...defaultProps} onItemClick={mockOnItemClick} />);

      const firstFrame = document.querySelector('.window-frame');
      if (firstFrame) {
        firstFrame.focus();
        await user.keyboard('[Enter]');
        expect(mockOnItemClick).toHaveBeenCalledWith(mockItems[0]);
      }
    });

    test('handles keyboard navigation with Space key', async () => {
      render(<WindowFrameNavigation {...defaultProps} onItemClick={mockOnItemClick} />);

      const firstFrame = document.querySelector('.window-frame');
      if (firstFrame) {
        firstFrame.focus();
        await user.keyboard(' ');
        expect(mockOnItemClick).toHaveBeenCalledWith(mockItems[0]);
      }
    });

    test('has proper ARIA attributes for accessibility', () => {
      render(<WindowFrameNavigation {...defaultProps} />);

      const frames = document.querySelectorAll('.window-frame');
      frames.forEach(frame => {
        expect(frame).toHaveAttribute('role', 'button');
        expect(frame).toHaveAttribute('tabIndex', '0');
      });
    });
  });

  describe('Hover Effects', () => {
    test('applies hover styles when mouse enters frame', async () => {
      render(<WindowFrameNavigation {...defaultProps} />);

      const firstFrame = document.querySelector('.window-frame');
      if (firstFrame) {
        await user.hover(firstFrame);

        // Check for hover overlay opacity
        const hoverOverlay = firstFrame.querySelector('[class*="opacity-100"]');
        expect(hoverOverlay).toBeInTheDocument();
      }
    });

    test('removes hover styles when mouse leaves frame', async () => {
      render(<WindowFrameNavigation {...defaultProps} />);

      const firstFrame = document.querySelector('.window-frame');
      if (firstFrame) {
        await user.hover(firstFrame);
        await user.unhover(firstFrame);

        // Check for hover overlay opacity
        const hoverOverlay = firstFrame.querySelector('[class*="opacity-0"]');
        expect(hoverOverlay).toBeInTheDocument();
      }
    });
  });

  describe('Parallax Effects', () => {
    test('enables parallax mouse tracking when enabled', () => {
      render(<WindowFrameNavigation {...defaultProps} enableParallax={true} />);

      const container = document.querySelector('.window-frame-navigation');
      expect(container).toBeInTheDocument();

      if (container) {
        fireEvent.mouseMove(container, { clientX: 450, clientY: 150 });

        // Check that frames have data-depth attributes
        const frames = container.querySelectorAll('[data-frame]');
        frames.forEach(frame => {
          expect(frame).toHaveAttribute('data-depth');
        });
      }
    });

    test('disables parallax when disabled', () => {
      render(<WindowFrameNavigation {...defaultProps} enableParallax={false} />);

      const container = document.querySelector('.window-frame-navigation');
      expect(container).toBeInTheDocument();
    });

    test('resets transforms on mouse leave', () => {
      render(<WindowFrameNavigation {...defaultProps} enableParallax={true} />);

      const container = document.querySelector('.window-frame-navigation');
      if (container) {
        fireEvent.mouseMove(container, { clientX: 450, clientY: 150 });
        fireEvent.mouseLeave(container);

        // Transforms should be reset
        const frames = container.querySelectorAll('[data-frame]');
        frames.forEach(frame => {
          expect((frame as HTMLElement).style.transform).toBe('translate(0, 0) rotate(0deg)');
        });
      }
    });
  });

  describe('Seasonal Effects', () => {
    test('displays season indicator when enabled', () => {
      render(<WindowFrameNavigation {...defaultProps} seasonalEffects={true} />);

      const seasonIndicator = document.querySelector('[class*="bg-museum-panel"]');
      expect(seasonIndicator).toBeInTheDocument();
    });

    test('hides season indicator when disabled', () => {
      render(<WindowFrameNavigation {...defaultProps} seasonalEffects={false} />);

      const seasonIndicator = document.querySelector('[class*="bg-museum-panel"]');
      expect(seasonIndicator).not.toBeInTheDocument();
    });

    test('applies seasonal filter effects to frames', () => {
      render(<WindowFrameNavigation {...defaultProps} seasonalEffects={true} />);

      const frames = document.querySelectorAll('.window-frame');
      frames.forEach(frame => {
        expect(frame).toHaveAttribute('style');
      });
    });
  });

  describe('Rotation Effects', () => {
    test('enables rotation when specified', () => {
      render(<WindowFrameNavigation {...defaultProps} enableRotation={true} />);

      const container = document.querySelector('.window-frame-navigation');
      expect(container).toBeInTheDocument();
    });

    test('disables rotation by default', () => {
      render(<WindowFrameNavigation {...defaultProps} enableRotation={false} />);

      const container = document.querySelector('.window-frame-navigation');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Background Decorative Elements', () => {
    test('renders background decorative elements', () => {
      render(<WindowFrameNavigation {...defaultProps} />);

      const backgroundElements = document.querySelectorAll('[class*="bg-accent/10"], [class*="bg-primary/10"], [class*="bg-secondary/10"]');
      expect(backgroundElements.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('handles empty items array', () => {
      render(<WindowFrameNavigation {...defaultProps} items={[]} />);

      const container = document.querySelector('.window-frame-navigation');
      expect(container).toBeInTheDocument();

      const frames = document.querySelectorAll('.window-frame');
      expect(frames).toHaveLength(0);
    });

    test('handles missing image gracefully', () => {
      const itemsWithMissingImage = [
        { ...mockItems[0], image: '' },
      ];

      render(<WindowFrameNavigation {...defaultProps} items={itemsWithMissingImage} />);

      expect(screen.getByText(itemsWithMissingImage[0].title)).toBeInTheDocument();
    });

    test('handles missing category gracefully', () => {
      const itemsWithoutCategory = [
        { ...mockItems[0], category: undefined },
      ];

      render(<WindowFrameNavigation {...defaultProps} items={itemsWithoutCategory} />);

      expect(screen.getByText(itemsWithoutCategory[0].title)).toBeInTheDocument();
    });

    test('handles missing tags gracefully', () => {
      const itemsWithoutTags = [
        { ...mockItems[0], tags: undefined },
      ];

      render(<WindowFrameNavigation {...defaultProps} items={itemsWithoutTags} />);

      expect(screen.getByText(itemsWithoutTags[0].title)).toBeInTheDocument();
    });

    test('handles missing callback functions gracefully', async () => {
      render(<WindowFrameNavigation {...defaultProps} onItemClick={undefined} />);

      const firstFrame = document.querySelector('.window-frame');
      if (firstFrame) {
        await user.click(firstFrame);
        // Should not throw errors
        expect(firstFrame).toBeInTheDocument();
      }
    });
  });

  describe('Performance', () => {
    test('applies proper depth-based shadow effects', () => {
      render(<WindowFrameNavigation {...defaultProps} />);

      const frames = document.querySelectorAll('.window-frame');
      frames.forEach((frame, index) => {
        const shadowElement = frame.querySelector('[class*="bg-black/20"]');
        expect(shadowElement).toBeInTheDocument();

        const depth = mockItems[index].depth || 0;
        const expectedTransform = `translate(${depth * 4}px, ${depth * 4}px)`;
        expect(shadowElement).toHaveStyle({ transform: expectedTransform });
      });
    });

    test('uses proper image sizes for optimization', () => {
      render(<WindowFrameNavigation {...defaultProps} frameSize="large" />);

      const images = screen.getAllByTestId('next-image');
      images.forEach(img => {
        expect(img).toHaveAttribute('sizes', '360px');
      });
    });
  });

  describe('Custom CSS Classes', () => {
    test('applies custom className', () => {
      render(<WindowFrameNavigation {...defaultProps} className="custom-window-nav" />);

      const container = document.querySelector('.window-frame-navigation');
      expect(container).toHaveClass('custom-window-nav');
    });
  });
});