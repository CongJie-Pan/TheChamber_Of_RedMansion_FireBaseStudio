/**
 * @fileOverview ParallaxSection Component
 *
 * This component provides sophisticated parallax depth effects for the Red Mansion
 * learning platform, creating immersive layered experiences that enhance the
 * traditional Chinese garden aesthetic. It supports multiple parallax layers,
 * smooth animations, and performance-optimized scrolling effects.
 *
 * Key Features:
 * - Multi-layer parallax effects with configurable speeds
 * - Hardware-accelerated transforms for smooth performance
 * - Support for both horizontal and vertical parallax
 * - Intersection Observer for performance optimization
 * - Traditional Chinese depth principles (近、中、遠景)
 * - Responsive parallax scaling based on viewport
 * - Customizable easing functions and animation curves
 * - Accessibility considerations with reduced motion support
 *
 * Technical Implementation:
 * - Uses transform3d for hardware acceleration
 * - Intersection Observer for efficient scroll handling
 * - RequestAnimationFrame for smooth animations
 * - CSS variables for dynamic parallax values
 * - Optimized for mobile and touch devices
 */

"use client";

import React, { useRef, useEffect, useState, useCallback, type ReactNode, type CSSProperties } from 'react';
import { useLanguage } from '@/hooks/useLanguage';

export interface ParallaxLayerProps {
  children: ReactNode;
  speed?: number; // Parallax speed multiplier (-1 to 1, where 0 = no parallax)
  offset?: number; // Initial offset in pixels
  className?: string;
  style?: CSSProperties;
}

export interface ParallaxSectionProps {
  children: ReactNode;
  className?: string;
  height?: string | number;
  enableHorizontal?: boolean; // Enable horizontal parallax
  enableVertical?: boolean; // Enable vertical parallax
  perspective?: number; // 3D perspective value in pixels
  baseline?: 'top' | 'center' | 'bottom'; // Parallax calculation baseline
  easing?: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  threshold?: number; // Intersection observer threshold
  onScrollProgress?: (progress: number) => void; // Callback for scroll progress
}

interface ScrollState {
  scrollX: number;
  scrollY: number;
  progress: number;
  isVisible: boolean;
}

/**
 * ParallaxLayer Component
 *
 * Individual layer within a parallax section with its own speed and offset.
 */
export const ParallaxLayer: React.FC<ParallaxLayerProps> = ({
  children,
  speed = 0,
  offset = 0,
  className = '',
  style = {},
}) => {
  return (
    <div
      className={`parallax-layer absolute inset-0 ${className}`}
      data-parallax-speed={speed}
      data-parallax-offset={offset}
      style={{
        ...style,
        willChange: 'transform',
        backfaceVisibility: 'hidden',
        transform: `translate3d(0, ${offset}px, 0)`,
      }}
    >
      {children}
    </div>
  );
};

/**
 * ParallaxSection Component
 *
 * Creates sophisticated parallax depth effects with multiple configurable layers
 * and performance optimizations for smooth scrolling experiences.
 */
export const ParallaxSection: React.FC<ParallaxSectionProps> = ({
  children,
  className = '',
  height = '100vh',
  enableHorizontal = true,
  enableVertical = false,
  perspective = 1000,
  baseline = 'center',
  easing = 'ease-out',
  threshold = 0.1,
  onScrollProgress,
}) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState<ScrollState>({
    scrollX: 0,
    scrollY: 0,
    progress: 0,
    isVisible: false,
  });
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const rafId = useRef<number>();
  const lastScrollTime = useRef<number>(0);

  const { language } = useLanguage();

  /**
   * Check for reduced motion preference
   */
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsReducedMotion(e.matches);
    };

    // Initialize state from media query
    handleChange(mediaQuery);

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  /**
   * Calculate parallax transform values
   */
  const calculateParallaxTransform = useCallback((
    element: HTMLElement,
    scrollX: number,
    scrollY: number,
    sectionRect: DOMRect,
    viewportWidth: number,
    viewportHeight: number
  ) => {
    const speed = parseFloat(element.dataset.parallaxSpeed || '0');
    const offset = parseFloat(element.dataset.parallaxOffset || '0');

    if (speed === 0) return 'translate3d(0, 0, 0)';

    let translateX = 0;
    let translateY = offset;

    // Calculate horizontal parallax
    if (enableHorizontal) {
      const sectionProgress = scrollX / (sectionRect.width - viewportWidth);
      translateX = sectionProgress * speed * viewportWidth;
    }

    // Calculate vertical parallax
    if (enableVertical) {
      let verticalProgress;

      switch (baseline) {
        case 'top':
          verticalProgress = (scrollY - sectionRect.top) / viewportHeight;
          break;
        case 'bottom':
          verticalProgress = (scrollY - (sectionRect.bottom - viewportHeight)) / viewportHeight;
          break;
        case 'center':
        default:
          verticalProgress = (scrollY - (sectionRect.top - viewportHeight / 2)) / viewportHeight;
          break;
      }

      translateY += verticalProgress * speed * viewportHeight;
    }

    return `translate3d(${translateX}px, ${translateY}px, 0)`;
  }, [enableHorizontal, enableVertical, baseline]);

  /**
   * Apply easing function to parallax values
   */
  const applyEasing = useCallback((value: number, easingType: string): number => {
    switch (easingType) {
      case 'ease-in':
        return value * value;
      case 'ease-out':
        return 1 - Math.pow(1 - value, 2);
      case 'ease-in-out':
        return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
      case 'ease':
        return 1 - Math.pow(1 - value, 3);
      case 'linear':
      default:
        return value;
    }
  }, []);

  /**
   * Update parallax transforms
   */
  const updateParallax = useCallback(() => {
    if (!sectionRef.current || isReducedMotion) return;

    const section = sectionRef.current;
    const sectionRect = section.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Get current scroll position
    const scrollX = window.scrollX || document.documentElement.scrollLeft;
    const scrollY = window.scrollY || document.documentElement.scrollTop;

    // Calculate section visibility and progress
    const isVisible = sectionRect.bottom >= 0 && sectionRect.top <= viewportHeight;
    const progress = Math.max(0, Math.min(1,
      (viewportHeight - sectionRect.top) / (viewportHeight + sectionRect.height)
    ));

    // Update scroll state
    const newScrollState = {
      scrollX,
      scrollY,
      progress: applyEasing(progress, easing),
      isVisible,
    };

    setScrollState(newScrollState);

    // Notify parent of scroll progress
    if (onScrollProgress) {
      onScrollProgress(newScrollState.progress);
    }

    // Update parallax layers
    if (isVisible) {
      const parallaxLayers = section.querySelectorAll('[data-parallax-speed]');

      parallaxLayers.forEach((layer) => {
        const element = layer as HTMLElement;
        const transform = calculateParallaxTransform(
          element,
          scrollX,
          scrollY,
          sectionRect,
          viewportWidth,
          viewportHeight
        );

        element.style.transform = transform;
      });
    }
  }, [isReducedMotion, calculateParallaxTransform, applyEasing, easing, onScrollProgress]);

  /**
   * Throttled scroll handler using requestAnimationFrame
   */
  const handleScroll = useCallback(() => {
    const now = performance.now();

    // Throttle to 60fps
    if (now - lastScrollTime.current < 16.67) return;

    lastScrollTime.current = now;

    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }

    rafId.current = requestAnimationFrame(updateParallax);
  }, [updateParallax]);

  /**
   * Setup scroll listeners and intersection observer
   */
  useEffect(() => {
    if (!sectionRef.current || isReducedMotion) return;

    // Initial parallax calculation
    updateParallax();

    // Setup scroll listeners
    const scrollHandler = () => handleScroll();
    const resizeHandler = () => updateParallax();

    window.addEventListener('scroll', scrollHandler, { passive: true });
    window.addEventListener('resize', resizeHandler, { passive: true });

    // Setup intersection observer for performance
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            window.addEventListener('scroll', scrollHandler, { passive: true });
          } else {
            window.removeEventListener('scroll', scrollHandler);
          }
        });
      },
      { threshold }
    );

    observer.observe(sectionRef.current);

    return () => {
      window.removeEventListener('scroll', scrollHandler);
      window.removeEventListener('resize', resizeHandler);
      observer.disconnect();

      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [handleScroll, updateParallax, isReducedMotion, threshold]);

  /**
   * Get section height style
   */
  const getSectionHeight = (): string | number => {
    if (typeof height === 'number') {
      return `${height}px`;
    }
    return height;
  };

  /**
   * Combine CSS classes
   */
  const sectionClasses = [
    'parallax-section',
    'relative',
    'overflow-hidden',
    isReducedMotion ? 'motion-reduce' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={sectionRef}
      className={sectionClasses}
      style={{
        height: getSectionHeight(),
        perspective: `${perspective}px`,
        transformStyle: 'preserve-3d',
      }}
      data-parallax-progress={scrollState.progress}
      data-parallax-visible={scrollState.isVisible}
    >
      {/* Parallax container */}
      <div
        className="parallax-container absolute inset-0"
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        {children}
      </div>

      {/* Debug information (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 left-4 bg-black/50 text-white p-2 rounded text-xs font-mono">
          <div>Progress: {Math.round(scrollState.progress * 100)}%</div>
          <div>Visible: {scrollState.isVisible ? 'Yes' : 'No'}</div>
          <div>ScrollX: {Math.round(scrollState.scrollX)}</div>
          <div>ScrollY: {Math.round(scrollState.scrollY)}</div>
        </div>
      )}
    </div>
  );
};

/**
 * Predefined parallax layer presets for common use cases
 */
export const ParallaxPresets = {
  // Traditional Chinese depth layers (近景、中景、远景)
  Foreground: { speed: 0.2, className: 'parallax-near' }, // 近景
  Midground: { speed: 0.5, className: 'parallax-mid' },   // 中景
  Background: { speed: 0.8, className: 'parallax-far' },  // 远景

  // Content-specific presets
  Character: { speed: 0.1, className: 'z-20' },
  Garden: { speed: 0.3, className: 'z-10' },
  Sky: { speed: 0.9, className: 'z-0' },
  Text: { speed: 0, className: 'z-30' }, // No parallax for readability

  // Interactive elements
  FloatingCard: { speed: -0.2, className: 'z-25' }, // Reverse parallax
  Decoration: { speed: 0.6, className: 'z-5' },
};

export default ParallaxSection;