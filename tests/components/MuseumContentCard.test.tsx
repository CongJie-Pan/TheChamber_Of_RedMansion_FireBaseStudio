/**
 * @fileOverview MuseumContentCard Component Tests
 *
 * Comprehensive test suite for the MuseumContentCard component,
 * testing museum exhibition styling, interactive features, accessibility,
 * and responsive behavior.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import MuseumContentCard, { type MuseumContentCardProps } from '@/components/MuseumContentCard';

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} data-testid="next-image" />;
  };
});

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  BookOpen: () => <svg data-testid="book-open-icon" />,
  Heart: ({ className }: any) => <svg data-testid="heart-icon" className={className} />,
  Share2: () => <svg data-testid="share2-icon" />,
  Bookmark: ({ className }: any) => <svg data-testid="bookmark-icon" className={className} />,
  ArrowRight: () => <svg data-testid="arrow-right-icon" />,
  Sparkles: () => <svg data-testid="sparkles-icon" />,
  Star: () => <svg data-testid="star-icon" />,
  Eye: () => <svg data-testid="eye-icon" />,
}));

// Mock useLanguage hook
jest.mock('@/hooks/useLanguage', () => ({
  useLanguage: jest.fn(() => ({
    t: jest.fn((key: string) => {
      const translations: Record<string, string> = {
        'buttons.readMore': 'Read More',
        'relationships': 'relationships',
      };
      return translations[key] || key;
    }),
  })),
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div className={className} {...props} data-testid="card">
      {children}
    </div>
  ),
  CardContent: ({ children, className, ...props }: any) => (
    <div className={className} {...props} data-testid="card-content">
      {children}
    </div>
  ),
  CardHeader: ({ children, className, ...props }: any) => (
    <div className={className} {...props} data-testid="card-header">
      {children}
    </div>
  ),
  CardTitle: ({ children, className, ...props }: any) => (
    <h3 className={className} {...props} data-testid="card-title">
      {children}
    </h3>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, ...props }: any) => (
    <span className={className} {...props} data-testid="badge">
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, className, onClick, ...props }: any) => (
    <button className={className} onClick={onClick} {...props} data-testid="button">
      {children}
    </button>
  ),
}));

describe('MuseumContentCard', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let mockOnClick: jest.Mock;
  let mockOnBookmark: jest.Mock;
  let mockOnShare: jest.Mock;

  const defaultProps: MuseumContentCardProps = {
    title: 'Test Title',
    description: 'Test description for the museum content card.',
    image: 'https://example.com/test-image.jpg',
    imageAlt: 'Test image',
    category: 'Test Category',
    tags: ['tag1', 'tag2', 'tag3'],
    size: 'medium',
    variant: 'default',
    featured: false,
    interactive: true,
    bookmarkable: true,
    shareable: true,
    metadata: {
      readTime: '5 min',
      difficulty: 'beginner',
      views: 150,
      likes: 25,
      bookmarks: 10,
    },
  };

  beforeEach(() => {
    user = userEvent.setup();
    mockOnClick = jest.fn();
    mockOnBookmark = jest.fn();
    mockOnShare = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders basic card with required props', () => {
      render(
        <MuseumContentCard
          title="Test Title"
          description="Test description"
        />
      );

      expect(screen.getByTestId('card-title')).toHaveTextContent('Test Title');
      expect(screen.getByText('Test description')).toBeInTheDocument();
    });

    test('renders with all props provided', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          onClick={mockOnClick}
          onBookmark={mockOnBookmark}
          onShare={mockOnShare}
        />
      );

      expect(screen.getByTestId('card-title')).toHaveTextContent('Test Title');
      expect(screen.getByText('Test description for the museum content card.')).toBeInTheDocument();
      expect(screen.getByTestId('next-image')).toHaveAttribute('src', 'https://example.com/test-image.jpg');
      expect(screen.getByText('Test Category')).toBeInTheDocument();
    });

    test('renders subtitle when provided', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          subtitle="Test Subtitle"
        />
      );

      expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
    });

    test('renders tags correctly', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          tags={['React', 'TypeScript', 'Testing']}
        />
      );

      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
      expect(screen.getByText('Testing')).toBeInTheDocument();
    });

    test('limits tag display to first 3 tags', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          tags={['tag1', 'tag2', 'tag3', 'tag4', 'tag5']}
        />
      );

      expect(screen.getByText('tag1')).toBeInTheDocument();
      expect(screen.getByText('tag2')).toBeInTheDocument();
      expect(screen.getByText('tag3')).toBeInTheDocument();
      expect(screen.getByText('+2')).toBeInTheDocument();
      expect(screen.queryByText('tag4')).not.toBeInTheDocument();
    });

    test('renders featured indicator when featured', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          featured={true}
        />
      );

      const featuredIndicator = document.querySelector('.absolute.top-3.right-3');
      expect(featuredIndicator).toBeInTheDocument();
    });

    test('renders category badge when provided', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          category="Literature"
        />
      );

      expect(screen.getByText('Literature')).toBeInTheDocument();
    });

    test('renders children content when provided', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
        >
          <div data-testid="custom-content">Custom Content</div>
        </MuseumContentCard>
      );

      expect(screen.getByTestId('custom-content')).toBeInTheDocument();
      expect(screen.getByText('Custom Content')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    test('applies small size classes', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          size="small"
        />
      );

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('w-64', 'h-80', 'text-sm');
    });

    test('applies medium size classes by default', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          size="medium"
        />
      );

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('w-80', 'h-96');
    });

    test('applies large size classes', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          size="large"
        />
      );

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('w-96', 'h-112');
    });

    test('applies wide size classes', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          size="wide"
        />
      );

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('w-112', 'h-64');
    });
  });

  describe('Variant Styling', () => {
    test('applies character variant styling', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          variant="character"
        />
      );

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('border-l-4', 'border-l-accent');
    });

    test('applies chapter variant styling', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          variant="chapter"
        />
      );

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('border-l-4', 'border-l-primary');
    });

    test('applies analysis variant styling', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          variant="analysis"
        />
      );

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('border-l-4', 'border-l-secondary');
    });

    test('applies poem variant styling', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          variant="poem"
        />
      );

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('border-l-4', 'border-l-accent-hover');
    });

    test('applies location variant styling', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          variant="location"
        />
      );

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('border-l-4', 'border-l-muted-foreground');
    });
  });

  describe('Metadata Display', () => {
    test('displays read time when provided', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          metadata={{ readTime: '10 min' }}
        />
      );

      expect(screen.getByText('10 min')).toBeInTheDocument();
    });

    test('displays view count when provided', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          metadata={{ views: 1250 }}
        />
      );

      expect(screen.getByText('1.3k')).toBeInTheDocument();
    });

    test('displays view count under 1000 as is', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          metadata={{ views: 500 }}
        />
      );

      expect(screen.getByText('500')).toBeInTheDocument();
    });

    test('displays difficulty badges correctly', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          metadata={{ difficulty: 'advanced' }}
        />
      );

      expect(screen.getByText('advanced')).toBeInTheDocument();
    });

    test('displays likes count in action buttons', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          metadata={{ likes: 42 }}
        />
      );

      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  describe('Interactive Features', () => {
    test('handles card click when interactive', async () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          interactive={true}
          onClick={mockOnClick}
        />
      );

      const card = screen.getByTestId('card');
      await user.click(card);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    test('does not handle card click when not interactive', async () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          interactive={false}
          onClick={mockOnClick}
        />
      );

      const card = screen.getByTestId('card');
      await user.click(card);

      expect(mockOnClick).not.toHaveBeenCalled();
    });

    test('handles bookmark button click', async () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          bookmarkable={true}
          onBookmark={mockOnBookmark}
        />
      );

      const bookmarkIcon = screen.getByTestId('bookmark-icon');
      const bookmarkButton = bookmarkIcon.closest('button');

      if (bookmarkButton) {
        await user.click(bookmarkButton);
        expect(mockOnBookmark).toHaveBeenCalledTimes(1);
      }
    });

    test('handles share button click', async () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          shareable={true}
          onShare={mockOnShare}
        />
      );

      const shareIcon = screen.getByTestId('share2-icon');
      const shareButton = shareIcon.closest('button');

      if (shareButton) {
        await user.click(shareButton);
        expect(mockOnShare).toHaveBeenCalledTimes(1);
      }
    });

    test('handles like button toggle', async () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          metadata={{ likes: 10 }}
        />
      );

      const likeButtons = screen.getAllByTestId('button');
      const likeButton = likeButtons.find(btn =>
        btn.textContent?.includes('10')
      );

      if (likeButton) {
        await user.click(likeButton);
        expect(screen.getByText('11')).toBeInTheDocument();
      }
    });

    test('toggles bookmark state correctly', async () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          bookmarkable={true}
        />
      );

      const bookmarkIcon = screen.getByTestId('bookmark-icon');
      const bookmarkButton = bookmarkIcon.closest('button');

      if (bookmarkButton) {
        // Initially not bookmarked
        expect(bookmarkButton).not.toHaveClass('text-accent');

        await user.click(bookmarkButton);

        // Should be bookmarked after click
        expect(bookmarkButton).toHaveClass('text-accent');
      }
    });
  });

  describe('Keyboard Navigation', () => {
    test('supports Enter key interaction', async () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          interactive={true}
          onClick={mockOnClick}
        />
      );

      const card = screen.getByTestId('card');
      card.focus();
      await user.keyboard('[Enter]');

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    test('supports Space key interaction', async () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          interactive={true}
          onClick={mockOnClick}
        />
      );

      const card = screen.getByTestId('card');
      card.focus();
      await user.keyboard(' ');

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    test('has proper tabIndex for interactive cards', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          interactive={true}
        />
      );

      const card = screen.getByTestId('card');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    test('does not have tabIndex for non-interactive cards', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          interactive={false}
        />
      );

      const card = screen.getByTestId('card');
      expect(card).not.toHaveAttribute('tabIndex');
    });
  });

  describe('Accessibility', () => {
    test('has proper role for interactive cards', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          interactive={true}
        />
      );

      const card = screen.getByTestId('card');
      expect(card).toHaveAttribute('role', 'button');
    });

    test('has proper role for non-interactive cards', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          interactive={false}
        />
      );

      const card = screen.getByTestId('card');
      expect(card).toHaveAttribute('role', 'article');
    });

    test('provides alt text for images', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          image="https://example.com/test.jpg"
          imageAlt="Test image description"
        />
      );

      const image = screen.getByTestId('next-image');
      expect(image).toHaveAttribute('alt', 'Test image description');
    });

    test('truncates long text appropriately', () => {
      const longDescription = 'This is a very long description that should be truncated to maintain good visual design and prevent the card from becoming too tall and disrupting the layout.';

      render(
        <MuseumContentCard
          {...defaultProps}
          description={longDescription}
        />
      );

      const descriptionElement = screen.getByText(longDescription);
      expect(descriptionElement).toHaveClass('line-clamp-3');
    });
  });

  describe('Museum Styling', () => {
    test('applies museum card styling classes', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
        />
      );

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('museum-card', 'group', 'cursor-pointer');
    });

    test('applies hover pulse class when specified', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          className="hover-pulse"
        />
      );

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('hover-pulse');
    });

    test('applies featured ring styling when featured', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          featured={true}
        />
      );

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('ring-2', 'ring-accent/30');
    });

    test('applies shadow and transition effects', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
        />
      );

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('transition-all', 'duration-500');
    });
  });

  describe('Error Handling', () => {
    test('handles missing image gracefully', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          image={undefined}
        />
      );

      expect(screen.queryByTestId('next-image')).not.toBeInTheDocument();
      expect(screen.getByTestId('card-title')).toBeInTheDocument();
    });

    test('handles missing metadata gracefully', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          metadata={undefined}
        />
      );

      expect(screen.getByTestId('card-title')).toBeInTheDocument();
    });

    test('handles empty tags array', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          tags={[]}
        />
      );

      expect(screen.getByTestId('card-title')).toBeInTheDocument();
    });

    test('handles missing callbacks gracefully', async () => {
      render(
        <MuseumContentCard
          {...defaultProps}
          onClick={undefined}
          onBookmark={undefined}
          onShare={undefined}
        />
      );

      const card = screen.getByTestId('card');
      await user.click(card);

      // Should not throw errors
      expect(card).toBeInTheDocument();
    });
  });

  describe('Custom Content', () => {
    test('renders custom children in bordered section', () => {
      render(
        <MuseumContentCard
          {...defaultProps}
        >
          <div data-testid="custom-section">
            <p>Custom content here</p>
          </div>
        </MuseumContentCard>
      );

      expect(screen.getByTestId('custom-section')).toBeInTheDocument();
      expect(screen.getByText('Custom content here')).toBeInTheDocument();

      // Should be in a bordered section
      const customSection = screen.getByTestId('custom-section').parentElement;
      expect(customSection).toHaveClass('border-t', 'border-border/30', 'pt-4');
    });
  });
});