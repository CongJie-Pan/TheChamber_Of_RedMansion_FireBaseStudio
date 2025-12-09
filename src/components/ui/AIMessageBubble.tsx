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

import React, { useState, useId } from 'react';
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

  // PRX-010 FIX: Remove fallback logic that incorrectly showed thinkingProcess in answer area.
  // With the new Adapter system, thinking and content are properly separated.
  // Empty answer should remain empty until fullContent is received.
  const displayAnswer = answer || '';
  // BUG FIX: Show thinking section header during streaming even without content
  // This ensures users see "深度思考中..." while waiting for thinking content to stream
  // Show when: (has content) OR (still streaming/thinking in progress)
  const showThinkingSection = showThinkingInline && (hasThinkingContent || !isThinkingComplete);

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
    setHasLocalOverride(true);
    setLocalExpandedState(newState);
    // Notify parent so it can persist the preference across all messages
    onThinkingToggle?.(newState);
  };

  return (
    <div className={cn('ai-message-bubble space-y-2', className)}>
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
                ? (typeof thinkingDuration === 'number' ? `思考了 ${Math.max(0, thinkingDuration)} 秒` : '思考完成')
                : '深度思考中…'}
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
                'text-sm italic text-muted-foreground/90',
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
        {/* Simple loading text when content is empty but streaming */}
        {displayAnswer.length === 0 && isStreaming ? (
          <div className="text-sm text-muted-foreground/70 py-1">
            正在生成回答...
          </div>
        ) : (
          <StructuredQAResponse
            rawContent={displayAnswer}
            citations={citations}
            isThinkingComplete={isThinkingComplete}
            onCitationClick={onCitationClick}
          />
        )}
      </div>

      {/* Streaming Indicator - Simple cursor style */}
      {isStreaming && displayAnswer.length > 0 && (
        <span className="inline-block w-0.5 h-4 bg-foreground/50 animate-pulse ml-0.5 align-middle" />
      )}
    </div>
  );
}

/**
 * Default export
 */
export default AIMessageBubble;
