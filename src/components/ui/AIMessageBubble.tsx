'use client';

/**
 * @fileOverview AI Message Bubble Component
 *
 * Unified AI message component that combines:
 * - Collapsible thinking process section (at top)
 * - Structured answer content (in middle)
 * - Citations section (at bottom)
 *
 * Follows the design pattern from qa_module_example.jpg:
 * - "Thought for X seconds" collapsible header
 * - Thinking content in lighter, italic, smaller text
 * - Clear answer in normal weight text
 * - Citations at bottom
 *
 * This fixes Issue #4 from the problem report.
 */

import React, { useEffect, useState, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PerplexityCitation } from '@/types/perplexity-qa';
import { StructuredQAResponse } from './StructuredQAResponse';

/**
 * User's thinking panel preference (persists across messages in a session)
 * - 'auto': System decides (auto-expand on first appearance)
 * - 'collapsed': User prefers collapsed (respects user's manual collapse)
 * - 'expanded': User prefers expanded (respects user's manual expand)
 */
export type ThinkingExpandedPreference = 'auto' | 'collapsed' | 'expanded';

/**
 * Component props interface
 */
export interface AIMessageBubbleProps {
  /** AI answer content */
  answer: string;

  /** Citations array */
  citations: PerplexityCitation[];

  /** Thinking process content (optional) */
  thinkingProcess?: string;

  /** Thinking duration in seconds (for display) */
  thinkingDuration?: number;

  /** Whether thinking is complete */
  isThinkingComplete: boolean;

  /** Whether answer is currently streaming */
  isStreaming?: boolean;

  /** Callback when citation is clicked */
  onCitationClick?: (citationId: number) => void;

  /** Additional CSS classes */
  className?: string;

  /** Whether to render thinking process inline with the answer bubble */
  showThinkingInline?: boolean;

  /**
   * User's thinking panel preference (Task 4.2 Fix - Bug #3)
   * Controlled by parent to persist across messages in a session.
   * - 'auto': Auto-expand on first appearance (default)
   * - 'collapsed': User manually collapsed, respect this choice
   * - 'expanded': User manually expanded, respect this choice
   */
  thinkingExpandedPreference?: ThinkingExpandedPreference;

  /**
   * Callback when user manually toggles thinking panel (Task 4.2 Fix - Bug #3)
   * Parent should update thinkingExpandedPreference based on this callback.
   */
  onThinkingToggle?: (isExpanded: boolean) => void;
}

/**
 * AI Message Bubble Component
 */
export function AIMessageBubble({
  answer,
  citations,
  thinkingProcess,
  thinkingDuration,
  isThinkingComplete,
  isStreaming = false,
  onCitationClick,
  className,
  showThinkingInline = true,
  thinkingExpandedPreference = 'auto',
  onThinkingToggle,
}: AIMessageBubbleProps) {
  const hasThinkingContent = Boolean(thinkingProcess && thinkingProcess.trim().length > 0);
  // Show the thinking section ONLY when actual thinking content exists
  const showThinkingSection = hasThinkingContent && showThinkingInline;

  // Determine expanded state based on preference (Task 4.2 Fix - Bug #3)
  // - 'auto': Expand when content is shown
  // - 'collapsed': User prefers collapsed
  // - 'expanded': User prefers expanded
  // Track if user has manually overridden the preference within this component
  const [hasLocalOverride, setHasLocalOverride] = useState(false);
  const [localExpandedState, setLocalExpandedState] = useState(true);
  const collapseId = useId();

  // Compute effective expanded state from preference when no local override
  // This avoids calling setState in useEffect by deriving state from props
  const isThinkingExpanded = hasLocalOverride
    ? localExpandedState
    : (showThinkingSection && thinkingExpandedPreference !== 'collapsed');

  // Handler for manual toggle - notifies parent to persist preference (Task 4.2 Fix - Bug #3)
  const handleToggleThinking = () => {
    const newState = !isThinkingExpanded;
    // Task 4.2 Logging: Track thinking panel toggle
    console.log('[AIBubble] Thinking toggle - newState:', newState, ', preference:', thinkingExpandedPreference);
    setHasLocalOverride(true);
    setLocalExpandedState(newState);
    // Notify parent so it can persist the preference across all messages
    onThinkingToggle?.(newState);
  };

  return (
    <div className={cn('ai-message-bubble space-y-3', className)}>
      {/* Thinking Process Section - Collapsible */}
      {showThinkingSection && (
        <div className="thinking-section">
          {/* Thinking Header - Clickable to expand/collapse */}
          <button
            type="button"
            onClick={handleToggleThinking}
            className={cn(
              'flex items-center gap-2 w-full text-[13px] text-muted-foreground',
              'hover:text-foreground transition-colors',
              'py-1 px-2 rounded hover:bg-accent/50'
            )}
            aria-expanded={isThinkingExpanded}
            aria-controls={`thinking-collapse-${collapseId}`}
            aria-label={isThinkingExpanded ? '收合思考過程' : '展開思考過程'}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleToggleThinking();
              }
            }}
          >
            <ChevronDown className={cn('w-4 h-4 flex-shrink-0 transition-transform', isThinkingExpanded ? 'rotate-0' : '-rotate-90')} />
            <span className="font-medium">
              {isThinkingComplete
                ? (typeof thinkingDuration === 'number' ? `Thought for ${Math.max(0, thinkingDuration)} seconds` : 'Thought complete')
                : 'Thinking…'}
            </span>
          </button>

          {/* Thinking Content - Collapsible with smooth height transition and scrolling (Task 4.2 Fix) */}
          <div
            id={`thinking-collapse-${collapseId}`}
            className={cn(
              'mt-2 px-2 transition-[max-height,opacity] duration-300 ease-in-out',
              isThinkingExpanded ? 'max-h-[200px] opacity-100 overflow-y-auto' : 'max-h-0 opacity-0 overflow-hidden pointer-events-none'
            )}
            aria-hidden={!isThinkingExpanded}
          >
            {hasThinkingContent && (
            <div
              className={cn(
                'text-[12px] italic text-muted-foreground/90',
                'leading-6 whitespace-pre-wrap',
                'border-l-[2px] border-border pl-4 ml-2'
              )}
            >
              {thinkingProcess}
            </div>
            )}
          </div>
        </div>
      )}

      {/* Answer Section - Main Content */}
      <div className="answer-section">
        {/* Loading skeleton when content is empty but streaming (Fix Issue #2) */}
        {answer.length === 0 && isStreaming ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-5/6"></div>
          </div>
        ) : (
          <StructuredQAResponse
            rawContent={answer}
            citations={citations}
            isThinkingComplete={isThinkingComplete}
            onCitationClick={onCitationClick}
          />
        )}
      </div>

      {/* Streaming Indicator */}
      {isStreaming && (
        <div className="streaming-indicator flex items-center gap-2 text-xs text-muted-foreground px-2">
          <div className="flex space-x-1">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span>AI 正在回答中...</span>
        </div>
      )}
    </div>
  );
}

/**
 * Default export
 */
export default AIMessageBubble;
