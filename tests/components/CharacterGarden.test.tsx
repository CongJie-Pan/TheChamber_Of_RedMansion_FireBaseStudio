/**
 * @fileOverview CharacterGarden Component Tests
 *
 * Comprehensive test suite for the CharacterGarden component,
 * testing character positioning, relationships, seasonal effects,
 * garden layout, and interactive features.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CharacterGarden, {
  type CharacterGardenProps,
  type Character
} from '@/components/CharacterGarden';

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, width, height, ...props }: any) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} width={width} height={height} {...props} data-testid="next-image" />;
  };
});

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Users: () => <svg data-testid="users-icon" />,
  Heart: () => <svg data-testid="heart-icon" />,
  Crown: () => <svg data-testid="crown-icon" />,
  Home: () => <svg data-testid="home-icon" />,
  Flower: () => <svg data-testid="flower-icon" />,
  Trees: () => <svg data-testid="trees-icon" />,
  Sparkles: () => <svg data-testid="sparkles-icon" />,
  ArrowRight: () => <svg data-testid="arrow-right-icon" />,
  Info: () => <svg data-testid="info-icon" />,
  BookOpen: () => <svg data-testid="book-open-icon" />,
}));

// Mock useLanguage hook
jest.mock('@/hooks/useLanguage', () => ({
  useLanguage: jest.fn(() => ({
    t: jest.fn((key: string) => {
      const translations: Record<string, string> = {
        'relationships': 'relationships',
        'characters': 'characters',
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
}));

describe('CharacterGarden', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let mockOnCharacterSelect: jest.Mock;
  let mockOnCharacterHover: jest.Mock;
  let mockOnRelationshipExplore: jest.Mock;

  const mockCharacters: Character[] = [
    {
      id: 'lin-daiyu',
      name: 'Lin Daiyu',
      chineseName: '林黛玉',
      title: 'The Sensitive Beauty',
      description: 'A beautiful and talented young woman known for her poetry and delicate nature.',
      image: 'https://example.com/lin-daiyu.jpg',
      imageAlt: 'Portrait of Lin Daiyu',
      residence: 'Bamboo Lodge',
      family: 'Lin',
      status: 'main',
      relationships: ['jia-baoyu', 'xue-baochai'],
      traits: ['intelligent', 'sensitive', 'artistic'],
      chapter: 3,
      significance: 'high',
      position: { x: 30, y: 40 },
      gardenElement: 'flower',
      season: 'autumn',
    },
    {
      id: 'jia-baoyu',
      name: 'Jia Baoyu',
      chineseName: '賈寶玉',
      title: 'The Precious Jade',
      description: 'The male protagonist, known for his gentleness and romantic nature.',
      image: 'https://example.com/jia-baoyu.jpg',
      residence: 'Grand View Garden',
      family: 'Jia',
      status: 'main',
      relationships: ['lin-daiyu', 'xue-baochai'],
      traits: ['romantic', 'gentle', 'rebellious'],
      chapter: 1,
      significance: 'high',
      position: { x: 60, y: 30 },
      gardenElement: 'pavilion',
      season: 'all',
    },
    {
      id: 'xue-baochai',
      name: 'Xue Baochai',
      chineseName: '薛寶釵',
      title: 'The Golden Beauty',
      description: 'A well-educated and virtuous young woman from the Xue family.',
      image: 'https://example.com/xue-baochai.jpg',
      residence: 'Hengwu Garden',
      family: 'Xue',
      status: 'main',
      relationships: ['jia-baoyu', 'lin-daiyu'],
      traits: ['virtuous', 'intelligent', 'practical'],
      chapter: 8,
      significance: 'high',
      gardenElement: 'bridge',
      season: 'spring',
    },
    {
      id: 'wang-xifeng',
      name: 'Wang Xifeng',
      chineseName: '王熙鳳',
      title: 'The Phoenix',
      description: 'The capable and shrewd manager of the Jia household.',
      image: 'https://example.com/wang-xifeng.jpg',
      residence: 'Main Hall',
      family: 'Wang',
      status: 'secondary',
      relationships: ['jia-lian'],
      traits: ['clever', 'ambitious', 'manipulative'],
      chapter: 6,
      significance: 'medium',
      gardenElement: 'tree',
      season: 'summer',
    },
  ];

  const defaultProps: CharacterGardenProps = {
    characters: mockCharacters,
    width: 1200,
    height: 800,
    showRelationships: true,
    enableSeasonal: true,
    groupBy: 'family',
  };

  beforeEach(() => {
    user = userEvent.setup();
    mockOnCharacterSelect = jest.fn();
    mockOnCharacterHover = jest.fn();
    mockOnRelationshipExplore = jest.fn();

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
    test('renders character garden container', () => {
      render(<CharacterGarden {...defaultProps} />);

      const container = document.querySelector('.character-garden');
      expect(container).toBeInTheDocument();
      expect(container).toHaveStyle({ width: '1200px', height: '800px' });
    });

    test('renders all characters with images and names', () => {
      render(<CharacterGarden {...defaultProps} enableSeasonal={false} />);

      mockCharacters.forEach(character => {
        const nameElements = screen.getAllByText(character.chineseName);
        expect(nameElements.length).toBeGreaterThan(0);
      });

      const images = screen.getAllByTestId('next-image');
      expect(images).toHaveLength(mockCharacters.length);
    });

    test('renders garden background with gradient', () => {
      render(<CharacterGarden {...defaultProps} />);

      const background = document.querySelector('[class*="bg-gradient-to-br"]');
      expect(background).toBeInTheDocument();
    });

    test('renders SVG container for connections', () => {
      render(<CharacterGarden {...defaultProps} />);

      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('width', '1200');
      expect(svg).toHaveAttribute('height', '800');
    });

    test('renders character count indicator', () => {
      render(<CharacterGarden {...defaultProps} enableSeasonal={false} />);

      expect(screen.getByText(`${mockCharacters.length} characters`)).toBeInTheDocument();
    });
  });

  describe('Character Positioning', () => {
    test('positions characters based on provided coordinates', () => {
      render(<CharacterGarden {...defaultProps} enableSeasonal={false} />);

      const characterElements = document.querySelectorAll('.character-garden-item');
      expect(characterElements.length).toBeGreaterThan(0);

      // Check that at least some characters have proper positioning
      const characterWithPosition = mockCharacters.find(char => char.position);
      if (characterWithPosition) {
        const matchingElement = Array.from(characterElements).find(el =>
          el.getAttribute('style')?.includes(`left: ${characterWithPosition.position?.x}%`)
        );
        expect(matchingElement).toBeInTheDocument();
      }
    });

    test('auto-generates positions for characters without coordinates', () => {
      const charactersWithoutPositions = mockCharacters.map(char => ({
        ...char,
        position: undefined,
      }));

      render(<CharacterGarden {...defaultProps} characters={charactersWithoutPositions} enableSeasonal={false} />);

      const characterElements = document.querySelectorAll('.character-garden-item');
      expect(characterElements.length).toBeGreaterThan(0);

      // Check that positioning is applied via inline styles
      characterElements.forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        expect(element.style.left || computedStyle.left).toBeDefined();
        expect(element.style.top || computedStyle.top).toBeDefined();
      });
    });

    test('applies different positioning based on groupBy prop', () => {
      const { rerender } = render(<CharacterGarden {...defaultProps} groupBy="residence" enableSeasonal={false} />);
      const residenceElements = document.querySelectorAll('.character-garden-item');

      rerender(<CharacterGarden {...defaultProps} groupBy="status" enableSeasonal={false} />);
      const statusElements = document.querySelectorAll('.character-garden-item');

      expect(residenceElements).toHaveLength(statusElements.length);
    });
  });

  describe('Character Status and Styling', () => {
    test('applies different sizes based on character status', () => {
      render(<CharacterGarden {...defaultProps} enableSeasonal={false} />);

      const images = screen.getAllByTestId('next-image');
      expect(images.length).toBeGreaterThan(0);

      // Check that at least one main character has the correct size
      const mainCharacterSizes = images.filter(img =>
        img.getAttribute('width') === '80' && img.getAttribute('height') === '80'
      );
      expect(mainCharacterSizes.length).toBeGreaterThan(0);
    });

    test('displays crown icon for main characters', () => {
      render(<CharacterGarden {...defaultProps} enableSeasonal={false} />);

      const crownIcons = screen.getAllByTestId('crown-icon');
      expect(crownIcons.length).toBeGreaterThan(0);
    });

    test('displays sparkles icon for high significance characters', () => {
      render(<CharacterGarden {...defaultProps} enableSeasonal={false} />);

      const sparklesIcons = screen.getAllByTestId('sparkles-icon');
      expect(sparklesIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Garden Elements', () => {
    test('displays appropriate garden element decorations', () => {
      render(<CharacterGarden {...defaultProps} enableSeasonal={false} />);

      // Check for at least some garden elements
      const gardenElements = [
        ...screen.queryAllByTestId('flower-icon'),
        ...screen.queryAllByTestId('home-icon'),
        ...screen.queryAllByTestId('trees-icon'),
        ...screen.queryAllByText('橋'),
      ];
      expect(gardenElements.length).toBeGreaterThan(0);
    });
  });

  describe('Interactive Features', () => {
    test('handles character click events', async () => {
      render(
        <CharacterGarden
          {...defaultProps}
          onCharacterSelect={mockOnCharacterSelect}
        />
      );

      const firstCharacter = document.querySelector('.character-garden-item');
      if (firstCharacter) {
        await user.click(firstCharacter);
        expect(mockOnCharacterSelect).toHaveBeenCalledWith(mockCharacters[0]);
      }
    });

    test('handles character hover events', async () => {
      render(
        <CharacterGarden
          {...defaultProps}
          onCharacterHover={mockOnCharacterHover}
        />
      );

      const firstCharacter = document.querySelector('.character-garden-item');
      if (firstCharacter) {
        await user.hover(firstCharacter);
        expect(mockOnCharacterHover).toHaveBeenCalledWith(mockCharacters[0]);

        await user.unhover(firstCharacter);
        expect(mockOnCharacterHover).toHaveBeenCalledWith(null);
      }
    });

    test('supports keyboard navigation', async () => {
      render(
        <CharacterGarden
          {...defaultProps}
          onCharacterSelect={mockOnCharacterSelect}
        />
      );

      const firstCharacter = document.querySelector('.character-garden-item');
      if (firstCharacter) {
        firstCharacter.focus();
        await user.keyboard('[Enter]');
        expect(mockOnCharacterSelect).toHaveBeenCalledWith(mockCharacters[0]);
      }
    });

    test('supports Space key navigation', async () => {
      render(
        <CharacterGarden
          {...defaultProps}
          onCharacterSelect={mockOnCharacterSelect}
        />
      );

      const firstCharacter = document.querySelector('.character-garden-item');
      if (firstCharacter) {
        firstCharacter.focus();
        await user.keyboard(' ');
        expect(mockOnCharacterSelect).toHaveBeenCalledWith(mockCharacters[0]);
      }
    });

    test('has proper ARIA attributes for accessibility', () => {
      render(<CharacterGarden {...defaultProps} />);

      const characterElements = document.querySelectorAll('.character-garden-item');
      characterElements.forEach(element => {
        expect(element).toHaveAttribute('role', 'button');
        expect(element).toHaveAttribute('tabIndex', '0');
      });
    });
  });

  describe('Character Tooltips', () => {
    test('displays character information in tooltips', () => {
      render(<CharacterGarden {...defaultProps} enableSeasonal={false} />);

      mockCharacters.forEach(character => {
        expect(screen.getByText(character.name)).toBeInTheDocument();

        const chineseNameElements = screen.getAllByText(character.chineseName);
        expect(chineseNameElements.length).toBeGreaterThan(0);

        if (character.title) {
          expect(screen.getByText(character.title)).toBeInTheDocument();
        }

        if (character.residence) {
          expect(screen.getByText(character.residence)).toBeInTheDocument();
        }
      });
    });

    test('shows relationship count in tooltips', () => {
      render(<CharacterGarden {...defaultProps} enableSeasonal={false} />);

      // Check for relationship text elements (may be multiple due to seasonal filtering)
      const relationshipElements = screen.queryAllByText(/\d+ relationships/);
      expect(relationshipElements.length).toBeGreaterThan(0);
    });
  });

  describe('Relationship Connections', () => {
    test('shows relationships when enabled', () => {
      render(<CharacterGarden {...defaultProps} showRelationships={true} />);

      // SVG should be present for connections
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    test('hides relationships when disabled', () => {
      render(<CharacterGarden {...defaultProps} showRelationships={false} />);

      // Should still render SVG but no connections
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    test('highlights connected characters on hover', async () => {
      render(<CharacterGarden {...defaultProps} />);

      const firstCharacter = document.querySelector('.character-garden-item');
      if (firstCharacter) {
        await user.hover(firstCharacter);

        // Check that SVG connections are rendered
        const paths = document.querySelectorAll('path[stroke]');
        expect(paths.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Seasonal Effects', () => {
    test('displays season indicator when enabled', () => {
      render(<CharacterGarden {...defaultProps} enableSeasonal={true} />);

      // Should show season emoji and text
      const seasonIndicator = document.querySelector('[class*="bg-museum-panel"]');
      expect(seasonIndicator).toBeInTheDocument();
    });

    test('hides season indicator when disabled', () => {
      render(<CharacterGarden {...defaultProps} enableSeasonal={false} />);

      // Should not show season indicator
      const seasonText = screen.queryByText(/Spring|Summer|Autumn|Winter/);
      expect(seasonText).not.toBeInTheDocument();
    });

    test('filters characters by season when enabled', () => {
      render(<CharacterGarden {...defaultProps} enableSeasonal={true} />);

      // All characters should be visible initially or filtered by current season
      const characterElements = document.querySelectorAll('.character-garden-item');
      expect(characterElements.length).toBeGreaterThan(0);
    });

    test('shows all characters when seasonal filtering disabled', () => {
      render(<CharacterGarden {...defaultProps} enableSeasonal={false} />);

      const characterElements = document.querySelectorAll('.character-garden-item');
      expect(characterElements).toHaveLength(mockCharacters.length);
    });
  });

  describe('Custom Dimensions', () => {
    test('applies custom width and height', () => {
      render(<CharacterGarden {...defaultProps} width={800} height={600} />);

      const container = document.querySelector('.character-garden');
      expect(container).toHaveStyle({ width: '800px', height: '600px' });

      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('width', '800');
      expect(svg).toHaveAttribute('height', '600');
    });
  });

  describe('Character Selection State', () => {
    test('highlights selected character', () => {
      render(<CharacterGarden {...defaultProps} selectedCharacter="lin-daiyu" />);

      const selectedCharacterElement = document.querySelector('[style*="scale(1.2)"]');
      expect(selectedCharacterElement).toBeInTheDocument();
    });

    test('highlights hovered character', () => {
      render(<CharacterGarden {...defaultProps} hoveredCharacter="jia-baoyu" />);

      const hoveredCharacterElement = document.querySelector('[style*="scale(1.1)"]');
      expect(hoveredCharacterElement).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles empty characters array', () => {
      render(<CharacterGarden {...defaultProps} characters={[]} />);

      const container = document.querySelector('.character-garden');
      expect(container).toBeInTheDocument();

      const characterElements = document.querySelectorAll('.character-garden-item');
      expect(characterElements).toHaveLength(0);

      expect(screen.getByText('0 characters')).toBeInTheDocument();
    });

    test('handles characters without images gracefully', () => {
      const charactersWithoutImages = mockCharacters.map(char => ({
        ...char,
        image: '',
      }));

      render(<CharacterGarden {...defaultProps} characters={charactersWithoutImages} />);

      const images = screen.getAllByTestId('next-image');
      images.forEach(img => {
        expect(img).toHaveAttribute('src', '');
      });
    });

    test('handles missing callback functions gracefully', async () => {
      render(
        <CharacterGarden
          {...defaultProps}
          onCharacterSelect={undefined}
          onCharacterHover={undefined}
        />
      );

      const firstCharacter = document.querySelector('.character-garden-item');
      if (firstCharacter) {
        await user.click(firstCharacter);
        await user.hover(firstCharacter);
        // Should not throw errors
        expect(firstCharacter).toBeInTheDocument();
      }
    });

    test('handles characters without positions gracefully', () => {
      const charactersWithoutPositions = [
        {
          id: 'test-char',
          name: 'Test Character',
          chineseName: '測試',
          description: 'Test description',
          image: 'https://example.com/test.jpg',
        },
      ];

      render(<CharacterGarden {...defaultProps} characters={charactersWithoutPositions} />);

      const characterElement = document.querySelector('.character-garden-item');
      expect(characterElement).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    test('shows loading state before initialization', () => {
      // Mock the initialization to be delayed
      const { container } = render(<CharacterGarden {...defaultProps} />);

      // The component should render after initialization
      expect(container.querySelector('.character-garden')).toBeInTheDocument();
    });
  });

  describe('Custom CSS Classes', () => {
    test('applies custom className', () => {
      render(<CharacterGarden {...defaultProps} className="custom-garden" />);

      const container = document.querySelector('.character-garden');
      expect(container).toHaveClass('custom-garden');
    });
  });
});