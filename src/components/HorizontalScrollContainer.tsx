/**
 * @fileOverview HorizontalScrollContainer Component
 *
 * This component implements the panoramic horizontal scrolling interface for the Red Mansion
 * learning platform. It provides smooth momentum scrolling, traditional right-to-left reading
 * flow, and elegant parallax effects that create an immersive classical Chinese garden experience.
 *
 * Key Features:
 * - Wide panoramic layout (3000-5000px) with horizontal momentum scrolling
 * - Traditional Chinese right-to-left reading flow support
 * - Smooth momentum scrolling with custom easing functions
 * - Parallax depth effects for visual layers
 * - Touch and mouse wheel support for cross-device compatibility
 * - Performance optimized with requestAnimationFrame
 * - Accessible keyboard navigation support
 *
 * Technical Implementation:
 * - Custom momentum scrolling physics simulation
 * - Intersection Observer for lazy loading content sections
 * - Transform3d for hardware-accelerated animations
 * - Responsive design maintaining cultural aesthetics
 */

"use client";

import React, { useRef, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useLanguage } from '@/hooks/useLanguage';

interface HorizontalScrollContainerProps {
  children: ReactNode;
  className?: string;
  width?: number; // Total scroll width in pixels
  enableParallax?: boolean;
  enableMomentum?: boolean;
  rtlReading?: boolean; // Traditional Chinese right-to-left reading flow
  onScroll?: (scrollLeft: number, scrollProgress: number) => void;
}

interface MomentumState {
  velocity: number;
  isScrolling: boolean;
  lastTime: number;
  lastPosition: number;
}

/**
 * HorizontalScrollContainer Component
 *
 * Creates an immersive horizontal scrolling experience with momentum physics,
 * parallax effects, and traditional Chinese reading flow support.
 */
export const HorizontalScrollContainer: React.FC<HorizontalScrollContainerProps> = ({
  children,
  className = '',
  width = 4000, // Default 4000px wide panoramic view
  enableParallax = true,
  enableMomentum = true,
  rtlReading = true, // Default to traditional Chinese reading flow
  onScroll,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const momentum = useRef<MomentumState>({
    velocity: 0,
    isScrolling: false,
    lastTime: 0,
    lastPosition: 0,
  });
  const animationFrame = useRef<number>();

  const { language } = useLanguage();

  /**
   * Calculate scroll physics with smooth easing
   */
  const updateMomentum = useCallback((currentTime: number, currentPosition: number) => {
    const deltaTime = currentTime - momentum.current.lastTime;
    const deltaPosition = currentPosition - momentum.current.lastPosition;

    if (deltaTime > 0) {
      momentum.current.velocity = deltaPosition / deltaTime;
    }

    momentum.current.lastTime = currentTime;
    momentum.current.lastPosition = currentPosition;
  }, []);

  /**
   * Apply momentum scrolling with physics simulation
   * Using useCallback with proper dependency to ensure stable reference
   */
  const applyMomentumScroll = useCallback(function applyMomentumScrollImpl() {
    if (!enableMomentum || !containerRef.current) return;

    const container = containerRef.current;
    const currentVelocity = momentum.current.velocity;

    // Apply friction to velocity
    momentum.current.velocity *= 0.95;

    // Continue scrolling if velocity is significant
    if (Math.abs(momentum.current.velocity) > 0.1) {
      const newScrollLeft = container.scrollLeft + momentum.current.velocity * 16; // 16ms frame time
      const maxScroll = container.scrollWidth - container.clientWidth;

      // Clamp scroll position within bounds
      container.scrollLeft = Math.max(0, Math.min(newScrollLeft, maxScroll));

      momentum.current.isScrolling = true;
      animationFrame.current = requestAnimationFrame(applyMomentumScrollImpl);
    } else {
      momentum.current.isScrolling = false;
      momentum.current.velocity = 0;
      setIsScrolling(false);
    }
  }, [enableMomentum, setIsScrolling]);

  /**
   * Handle scroll events with momentum calculation
   */
  const handleScroll = useCallback((event: Event) => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const currentTime = performance.now();
    const currentPosition = container.scrollLeft;

    // Update momentum physics
    updateMomentum(currentTime, currentPosition);

    // Calculate scroll progress (0 to 1)
    const maxScroll = container.scrollWidth - container.clientWidth;
    const progress = maxScroll > 0 ? currentPosition / maxScroll : 0;
    setScrollProgress(progress);

    // Notify parent component
    if (onScroll) {
      onScroll(currentPosition, progress);
    }

    // Set scrolling state
    if (!isScrolling) {
      setIsScrolling(true);
    }

    // Clear existing momentum animation
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
    }

    // Start momentum scrolling after scroll ends
    if (enableMomentum) {
      setTimeout(() => {
        if (!momentum.current.isScrolling) {
          applyMomentumScroll();
        }
      }, 50);
    }
  }, [updateMomentum, onScroll, isScrolling, enableMomentum, applyMomentumScroll]);

  /**
   * Handle mouse wheel events for smooth scrolling
   */
  const handleWheel = useCallback((event: WheelEvent) => {
    if (!containerRef.current) return;

    event.preventDefault();
    const container = containerRef.current;

    // Convert vertical wheel to horizontal scroll
    const deltaX = event.deltaX || event.deltaY;
    const scrollMultiplier = 2; // Enhance scroll sensitivity

    // Apply smooth scroll increment
    container.scrollLeft += deltaX * scrollMultiplier;

    // Update momentum for wheel scrolling
    const currentTime = performance.now();
    updateMomentum(currentTime, container.scrollLeft);
  }, [updateMomentum]);

  /**
   * Handle keyboard navigation for accessibility
   */
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scrollAmount = 200; // Keyboard scroll increment

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        container.scrollLeft -= rtlReading ? -scrollAmount : scrollAmount;
        break;
      case 'ArrowRight':
        event.preventDefault();
        container.scrollLeft += rtlReading ? -scrollAmount : scrollAmount;
        break;
      case 'Home':
        event.preventDefault();
        container.scrollLeft = rtlReading ? container.scrollWidth : 0;
        break;
      case 'End':
        event.preventDefault();
        container.scrollLeft = rtlReading ? 0 : container.scrollWidth;
        break;
    }
  }, [rtlReading]);

  /**
   * Setup event listeners and cleanup
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Add event listeners
    container.addEventListener('scroll', handleScroll, { passive: true });
    container.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('keydown', handleKeyDown);

    // Initialize momentum state
    momentum.current.lastTime = performance.now();
    momentum.current.lastPosition = container.scrollLeft;

    return () => {
      // Cleanup event listeners
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', handleWheel);
      document.removeEventListener('keydown', handleKeyDown);

      // Cancel animation frame
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [handleScroll, handleWheel, handleKeyDown]);

  /**
   * Apply parallax effects to child elements
   */
  useEffect(() => {
    if (!enableParallax || !containerRef.current) return;

    const updateParallax = () => {
      const container = containerRef.current;
      if (!container) return;

      const scrollLeft = container.scrollLeft;
      const parallaxElements = container.querySelectorAll('[data-parallax]');

      parallaxElements.forEach((element) => {
        const speed = parseFloat((element as HTMLElement).dataset.parallax || '0');
        const transform = `translateX(${scrollLeft * speed}px)`;
        (element as HTMLElement).style.transform = transform;
      });
    };

    const container = containerRef.current;
    container.addEventListener('scroll', updateParallax, { passive: true });

    return () => {
      container.removeEventListener('scroll', updateParallax);
    };
  }, [enableParallax]);

  /**
   * Combine CSS classes for styling
   */
  const containerClasses = [
    'horizontal-scroll',
    'momentum-scroll',
    rtlReading ? 'reading-flow-traditional' : '',
    isScrolling ? 'scrolling' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      style={{
        width: '100%',
        height: '100vh',
        overflowX: 'auto',
        overflowY: 'hidden',
        position: 'relative',
        scrollBehavior: enableMomentum ? 'auto' : 'smooth',
      }}
      role="region"
      aria-label={`${language === 'en-US' ? 'Horizontal scrolling content' : '水平滾動內容'}`}
      tabIndex={0}
    >
      <div
        ref={contentRef}
        style={{
          width: `${width}px`,
          height: '100%',
          display: 'flex',
          alignItems: 'stretch',
          direction: rtlReading ? 'rtl' : 'ltr',
        }}
        className="relative"
      >
        {children}
      </div>

      {/* Scroll progress indicator */}
      <div
        className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50"
        style={{ pointerEvents: 'none' }}
      >
        <div className="bg-museum-panel px-4 py-2 rounded-full border border-accent/30">
          <div className="flex items-center space-x-2">
            <div className="w-32 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300 ease-out"
                style={{ width: `${scrollProgress * 100}%` }}
              />
            </div>
            <span className="text-xs text-foreground/70 font-mono">
              {Math.round(scrollProgress * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HorizontalScrollContainer;