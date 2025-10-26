/**
 * @fileOverview CharacterGarden Component
 *
 * This component implements a character-based navigation system inspired by traditional
 * Chinese gardens, where Red Mansions characters are represented as interactive elements
 * within a beautiful garden layout. Each character is positioned with garden aesthetics,
 * creating an immersive and culturally authentic way to explore character relationships
 * and stories.
 *
 * Key Features:
 * - Character-based navigation with garden visual metaphors
 * - Interactive character portraits with hover animations
 * - Relationship connections visualized as garden paths
 * - Traditional Chinese garden layout principles
 * - Seasonal garden transformations and time-based changes
 * - Character groupings by family, residence, or relationship type
 * - Dynamic overlapping characters with cultural typography
 * - Responsive design maintaining garden aesthetics
 *
 * Design Philosophy:
 * - Inspired by classical Chinese garden design
 * - Characters positioned like pavilions in a garden
 * - Relationship paths like garden walkways
 * - Seasonal changes reflect story progression
 * - Cultural authenticity in visual presentation
 */

"use client";

import React, { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users,
  Heart,
  Crown,
  Home,
  Flower,
  Trees,
  Sparkles,
  ArrowRight,
  Info,
  BookOpen,
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

export interface Character {
  id: string;
  name: string;
  chineseName: string;
  title?: string;
  description: string;
  image: string;
  imageAlt?: string;
  residence?: string;
  family?: string;
  status?: 'main' | 'secondary' | 'minor';
  relationships?: string[]; // Array of character IDs
  traits?: string[];
  chapter?: number; // First appearance chapter
  significance?: 'high' | 'medium' | 'low';
  position?: { x: number; y: number }; // Garden position (percentage)
  gardenElement?: 'pavilion' | 'bridge' | 'pond' | 'tree' | 'flower' | 'rock';
  season?: 'spring' | 'summer' | 'autumn' | 'winter' | 'all';
}

export interface CharacterGardenProps {
  characters: Character[];
  width?: number;
  height?: number;
  showRelationships?: boolean;
  enableSeasonal?: boolean;
  groupBy?: 'family' | 'residence' | 'status' | 'none';
  selectedCharacter?: string | null;
  hoveredCharacter?: string | null;
  onCharacterSelect?: (character: Character) => void;
  onCharacterHover?: (character: Character | null) => void;
  onRelationshipExplore?: (fromCharacter: Character, toCharacter: Character) => void;
  className?: string;
}

/**
 * CharacterGarden Component
 *
 * Creates an interactive character navigation system with traditional Chinese
 * garden aesthetics and cultural design principles.
 */
export const CharacterGarden: React.FC<CharacterGardenProps> = ({
  characters,
  width = 1200,
  height = 800,
  showRelationships = true,
  enableSeasonal = true,
  groupBy = 'family',
  selectedCharacter = null,
  hoveredCharacter = null,
  onCharacterSelect,
  onCharacterHover,
  onRelationshipExplore,
  className = '',
}) => {
  const [currentSeason, setCurrentSeason] = useState<'spring' | 'summer' | 'autumn' | 'winter'>('spring');
  const [visibleCharacters, setVisibleCharacters] = useState<Character[]>(characters);
  const [activeConnections, setActiveConnections] = useState<string[]>([]);
  const gardenRef = useRef<SVGSVGElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const { t } = useLanguage();

  /**
   * Initialize character positions if not provided
   */
  const initializeCharacterPositions = useCallback(() => {
    const positionedCharacters = characters.map((character, index) => {
      if (character.position) return character;

      // Auto-generate positions based on grouping
      let x, y;

      switch (groupBy) {
        case 'family':
          const familyIndex = characters.filter(c => c.family === character.family).findIndex(c => c.id === character.id);
          const familyGroup = Math.floor(index / 8);
          x = (familyGroup * 25 + familyIndex * 3 + 10) % 90;
          y = (familyIndex * 15 + familyGroup * 20 + 15) % 80;
          break;

        case 'residence':
          const residenceHash = character.residence?.charCodeAt(0) || 0;
          x = (residenceHash * 7 + index * 5) % 90 + 5;
          y = (residenceHash * 3 + index * 8) % 80 + 10;
          break;

        case 'status':
          const statusMultiplier = character.status === 'main' ? 1 : character.status === 'secondary' ? 2 : 3;
          x = (index * 12 + statusMultiplier * 25) % 90 + 5;
          y = (statusMultiplier * 20 + index * 6) % 80 + 10;
          break;

        default:
          // Organic garden-like distribution
          const angle = (index / characters.length) * 2 * Math.PI;
          const radius = 20 + (index % 3) * 15;
          x = 50 + radius * Math.cos(angle);
          y = 50 + radius * Math.sin(angle);
      }

      return {
        ...character,
        position: { x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) },
      };
    });

    setVisibleCharacters(positionedCharacters);
    setIsInitialized(true);
  }, [characters, groupBy]);

  /**
   * Filter characters by current season
   */
  const filterCharactersBySeason = useCallback(() => {
    if (!enableSeasonal) {
      setVisibleCharacters(characters);
      return;
    }

    const seasonalCharacters = characters.filter(
      character => character.season === currentSeason || character.season === 'all' || !character.season
    );

    setVisibleCharacters(seasonalCharacters);
  }, [characters, currentSeason, enableSeasonal]);

  /**
   * Handle character interaction
   */
  const handleCharacterClick = (character: Character) => {
    if (onCharacterSelect) {
      onCharacterSelect(character);
    }

    // Update active connections
    if (showRelationships && character.relationships) {
      setActiveConnections(character.relationships);
    }
  };

  /**
   * Handle character hover
   */
  const handleCharacterHover = (character: Character | null) => {
    if (onCharacterHover) {
      onCharacterHover(character);
    }

    // Show relationship connections on hover
    if (character && showRelationships && character.relationships) {
      setActiveConnections(character.relationships);
    } else if (!character) {
      setActiveConnections([]);
    }
  };

  /**
   * Get character visual style based on properties
   */
  const getCharacterStyle = (character: Character) => {
    const baseSize = character.status === 'main' ? 80 : character.status === 'secondary' ? 60 : 40;
    const isSelected = selectedCharacter === character.id;
    const isHovered = hoveredCharacter === character.id;
    const isConnected = activeConnections.includes(character.id);

    return {
      width: baseSize,
      height: baseSize,
      opacity: isSelected || isHovered || isConnected || activeConnections.length === 0 ? 1 : 0.6,
      transform: `scale(${isSelected ? 1.2 : isHovered ? 1.1 : 1})`,
      zIndex: isSelected ? 30 : isHovered ? 20 : isConnected ? 15 : 10,
    };
  };

  /**
   * Get garden element decoration for character
   */
  const getGardenElementDecoration = (character: Character) => {
    switch (character.gardenElement) {
      case 'pavilion':
        return <Home className="w-4 h-4 text-primary" />;
      case 'bridge':
        return <span className="text-primary text-xs">橋</span>;
      case 'pond':
        return <span className="text-blue-400 text-xs">池</span>;
      case 'tree':
        return <Trees className="w-4 h-4 text-green-400" />;
      case 'flower':
        return <Flower className="w-4 h-4 text-pink-400" />;
      case 'rock':
        return <span className="text-gray-400 text-xs">石</span>;
      default:
        return null;
    }
  };

  /**
   * Render relationship connections as SVG paths
   */
  const renderConnections = () => {
    if (!showRelationships || activeConnections.length === 0) return null;

    return visibleCharacters
      .filter(char => activeConnections.includes(char.id))
      .map(targetChar => {
        const sourceChar = visibleCharacters.find(c => c.id === selectedCharacter || c.id === hoveredCharacter);
        if (!sourceChar || !targetChar.position || !sourceChar.position) return null;

        const x1 = (sourceChar.position.x / 100) * width;
        const y1 = (sourceChar.position.y / 100) * height;
        const x2 = (targetChar.position.x / 100) * width;
        const y2 = (targetChar.position.y / 100) * height;

        // Create curved path like garden walkway
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const controlX = midX + (y2 - y1) * 0.2;
        const controlY = midY - (x2 - x1) * 0.2;

        return (
          <path
            key={`connection-${sourceChar.id}-${targetChar.id}`}
            d={`M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`}
            stroke="hsl(var(--accent))"
            strokeWidth="2"
            fill="none"
            strokeDasharray="5,5"
            opacity="0.7"
            className="animate-pulse"
          />
        );
      });
  };

  /**
   * Update season based on time
   */
  useEffect(() => {
    if (!enableSeasonal) return;

    const updateSeason = () => {
      const month = new Date().getMonth();
      if (month >= 2 && month <= 4) setCurrentSeason('spring');
      else if (month >= 5 && month <= 7) setCurrentSeason('summer');
      else if (month >= 8 && month <= 10) setCurrentSeason('autumn');
      else setCurrentSeason('winter');
    };

    updateSeason();
    const interval = setInterval(updateSeason, 60000);
    return () => clearInterval(interval);
  }, [enableSeasonal]);

  /**
   * Initialize component
   */
  useEffect(() => {
    initializeCharacterPositions();
  }, [initializeCharacterPositions]);

  /**
   * Update character visibility based on season
   */
  useEffect(() => {
    filterCharactersBySeason();
  }, [filterCharactersBySeason]);

  if (!isInitialized) {
    return <div className="animate-pulse bg-muted rounded-lg" style={{ width, height }} />;
  }

  return (
    <div
      className={`character-garden relative overflow-hidden rounded-lg ${className}`}
      style={{ width, height }}
    >
      {/* Garden background */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-emerald-800/10 to-green-700/20"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(34, 197, 94, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 80%, rgba(236, 72, 153, 0.1) 0%, transparent 50%)
          `,
          filter: enableSeasonal ? getSeasonalFilter() : 'none',
        }}
      />

      {/* SVG for connections */}
      <svg
        ref={gardenRef}
        className="absolute inset-0 w-full h-full"
        width={width}
        height={height}
        style={{ pointerEvents: 'none' }}
      >
        {renderConnections()}
      </svg>

      {/* Character elements */}
      <div className="relative w-full h-full">
        {visibleCharacters.map((character) => (
          <div
            key={character.id}
            className="character-garden-item absolute cursor-pointer transition-all duration-300 ease-out"
            style={{
              left: `${character.position?.x}%`,
              top: `${character.position?.y}%`,
              ...getCharacterStyle(character),
              transform: `translate(-50%, -50%) ${getCharacterStyle(character).transform || ''}`,
            }}
            onClick={() => handleCharacterClick(character)}
            onMouseEnter={() => handleCharacterHover(character)}
            onMouseLeave={() => handleCharacterHover(null)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCharacterClick(character);
              }
            }}
          >
            {/* Character portrait */}
            <div className="relative">
              <div className="relative overflow-hidden rounded-full border-2 border-accent/30 shadow-lg">
                <Image
                  src={character.image}
                  alt={character.imageAlt || character.name}
                  width={getCharacterStyle(character).width}
                  height={getCharacterStyle(character).height}
                  className="object-cover transition-all duration-300 hover:scale-110"
                />

                {/* Status indicator */}
                <div className="absolute top-1 right-1">
                  {character.status === 'main' && (
                    <div className="bg-primary/90 rounded-full p-1">
                      <Crown className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                  {character.significance === 'high' && (
                    <div className="bg-accent/90 rounded-full p-1">
                      <Sparkles className="w-3 h-3 text-accent-foreground" />
                    </div>
                  )}
                </div>

                {/* Garden element decoration */}
                <div className="absolute bottom-1 left-1">
                  {getGardenElementDecoration(character)}
                </div>
              </div>

              {/* Character info tooltip */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50">
                <Card className="bg-museum-panel border border-accent/30 shadow-xl max-w-xs">
                  <CardContent className="p-3 space-y-2">
                    <div className="text-center">
                      <h4 className="font-artistic text-sm font-bold text-foreground">
                        {character.name}
                      </h4>
                      <p className="text-xs text-accent font-medium">
                        {character.chineseName}
                      </p>
                      {character.title && (
                        <p className="text-xs text-muted-foreground">
                          {character.title}
                        </p>
                      )}
                    </div>

                    <p className="text-xs text-foreground/80 text-center line-clamp-2">
                      {character.description}
                    </p>

                    {character.residence && (
                      <div className="flex items-center justify-center space-x-1">
                        <Home className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {character.residence}
                        </span>
                      </div>
                    )}

                    {character.relationships && character.relationships.length > 0 && (
                      <div className="flex items-center justify-center space-x-1">
                        <Users className="w-3 h-3 text-accent" />
                        <span className="text-xs text-accent">
                          {character.relationships.length} {t('relationships') || 'relationships'}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Character name label */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-center">
              <p className="text-xs font-artistic font-bold text-foreground bg-museum-panel px-2 py-1 rounded border border-accent/20">
                {character.chineseName}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Garden controls */}
      <div className="absolute top-4 right-4 space-y-2">
        {/* Season indicator */}
        {enableSeasonal && (
          <div className="bg-museum-panel px-3 py-1 rounded-full border border-border/30">
            <span className="text-xs text-muted-foreground">
              {getSeasonEmoji(currentSeason)} {t(`seasons.${currentSeason}`) || currentSeason}
            </span>
          </div>
        )}

        {/* Character count */}
        <div className="bg-museum-panel px-3 py-1 rounded-full border border-border/30">
          <span className="text-xs text-muted-foreground">
            {visibleCharacters.length} {t('characters') || 'characters'}
          </span>
        </div>
      </div>
    </div>
  );

  /**
   * Get seasonal filter effects
   */
  function getSeasonalFilter(): string {
    switch (currentSeason) {
      case 'spring':
        return 'hue-rotate(10deg) saturate(1.2) brightness(1.1)';
      case 'summer':
        return 'saturate(1.3) brightness(1.15) contrast(1.05)';
      case 'autumn':
        return 'hue-rotate(-20deg) saturate(1.1) sepia(0.15)';
      case 'winter':
        return 'saturate(0.8) brightness(0.9) contrast(1.1) blur(0.5px)';
      default:
        return 'none';
    }
  }

  /**
   * Get season emoji
   */
  function getSeasonEmoji(season: string): string {
    switch (season) {
      case 'spring': return '🌸';
      case 'summer': return '🌞';
      case 'autumn': return '🍂';
      case 'winter': return '❄️';
      default: return '🌿';
    }
  }
};

export default CharacterGarden;