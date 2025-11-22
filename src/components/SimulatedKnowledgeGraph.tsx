/**
 * @fileOverview Simulated Knowledge Graph Component
 * 
 * This component displays a visual knowledge graph representation for chapters of 
 * "Dream of the Red Chamber". It shows character relationships and thematic connections
 * within the context of the current reading material.
 * 
 * Key Features:
 * - Image-based knowledge graph visualization
 * - Graceful fallback content when image fails to load
 * - Responsive design that adapts to parent container
 * - Traditional Chinese cultural theming
 * - Accessibility-friendly alt text and error handling
 * 
 * Technical Implementation:
 * - Uses Next.js Image component for optimized loading
 * - Implements error state management for failed image loads
 * - Provides styled fallback with character name samples
 * - Supports both development and production image optimization
 */

"use client";
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import Image from 'next/image';
import { cn } from "@/lib/utils";
import { useState } from 'react';

/**
 * Fallback Content Component
 *
 * Displays a styled placeholder when the main image fails to load.
 * Features traditional Chinese design elements and sample character names
 * from "Dream of the Red Chamber" to maintain thematic consistency.
 *
 * @returns {JSX.Element} Styled fallback content with character samples
 */
function FallbackContent() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-red-50 via-amber-50 to-yellow-50 rounded-lg border-2 border-red-200">
      {/* Traditional Chinese pattern decoration using cherry blossom emoji */}
      <div className="text-6xl mb-4 animate-pulse">🌸</div>
      
      {/* Bilingual title in Traditional Chinese */}
      <h3 className="text-2xl font-bold text-red-800 mb-2 text-center">知識圖譜</h3>
      <h4 className="text-lg font-semibold text-amber-700 mb-4">紅樓夢人物關係圖</h4>
      
      {/* Sample character names grid layout */}
      {/* These represent major characters from the novel arranged in a visual grid */}
      <div className="grid grid-cols-3 gap-2 text-sm text-red-700 text-center mb-4">
        {/* Main protagonist */}
        <div className="bg-red-100 rounded-full px-3 py-1">賈寶玉</div>
        {/* Female lead */}
        <div className="bg-yellow-100 rounded-full px-3 py-1">林黛玉</div>
        {/* Second female lead */}
        <div className="bg-green-100 rounded-full px-3 py-1">薛寶釵</div>
        {/* Supporting family members */}
        <div className="bg-blue-100 rounded-full px-3 py-1">王夫人</div>
        <div className="bg-purple-100 rounded-full px-3 py-1">賈母</div>
        <div className="bg-pink-100 rounded-full px-3 py-1">史湘雲</div>
      </div>
      
      {/* Descriptive text explaining the component's purpose */}
      <p className="text-sm text-slate-600 text-center px-6 leading-relaxed">
        章回知識圖譜展示區域<br/>
        <span className="text-xs text-slate-500">
          Knowledge Graph Display Area<br/>
          圖片載入中或載入失敗
        </span>
      </p>
    </div>
  );
}

/**
 * SimulatedKnowledgeGraph Component
 *
 * Displays a knowledge graph visualization for the current chapter, showing
 * relationships between characters and themes in "Dream of the Red Chamber".
 *
 * @param {DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>} props - Standard div props
 * @param {string} className - Additional CSS classes for styling
 * @returns {JSX.Element} The knowledge graph visualization component
 */
export function SimulatedKnowledgeGraph({ className, ...props }: DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>) {
  // External image URL hosted on ImgBB for knowledge graph visualization
  // This could be replaced with dynamically generated graphs in future iterations
  const imageUrl = "https://i.ibb.co/8gqXHgCK/knowledge-Graph-main-Page-for-Reading-Page.jpg";

  // State to track image loading errors for fallback display
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className={cn(
        "w-full flex items-center justify-center", // Full width container with centered content
        className // Allow parent components to override or extend styling
      )}
      {...props} // Spread additional HTML attributes for flexibility
      data-ai-hint="character relationship map" // Accessibility hint for screen readers and AI
    >
      {/* Main content container - chooses between image and fallback */}
      <div className="flex items-center justify-center">
        {imageError ? (
          /**
           * Error State: Fallback Content Display
           * 
           * When image loading fails, display a styled placeholder with:
           * - Fixed dimensions matching expected image size
           * - Cultural theming consistent with the novel
           * - Character name samples for context
           */
          <div style={{
            width: '800px', // Fallback container size matching expected image dimensions
            height: '400px',
            position: 'relative',
          }}>
            <FallbackContent />
          </div>
        ) : (
          /**
           * Success State: Actual Knowledge Graph Image
           * 
           * Next.js Image component with:
           * - Optimized loading and performance
           * - Responsive sizing capabilities
           * - Error handling for graceful degradation
           * - High quality rendering for detailed graphs
           */
          <Image
            src={imageUrl}
            alt="章回知識圖譜 - 紅樓夢人物關係與事件脈絡圖" // Traditional Chinese alt text for accessibility
            width={0} // Let Next.js determine optimal dimensions based on source
            height={0} // Let Next.js determine optimal dimensions based on source
            sizes="100vw" // Responsive sizing instruction for different viewports
            style={{ 
              width: 'auto', // Maintain aspect ratio
              height: 'auto', // Maintain aspect ratio
              maxWidth: '100%', // Prevent overflow from parent container
              maxHeight: '100%' // Prevent overflow from parent container
            }}
            quality={90} // High quality setting for detailed knowledge graph visualization
            onError={() => setImageError(true)} // Error handler to trigger fallback display
            // Development optimization: bypass Next.js image optimizer during development
            // This helps with external URLs and debugging image loading issues
            unoptimized={process.env.NODE_ENV === 'development'}
          />
        )}
      </div>
    </div>
  );
}
