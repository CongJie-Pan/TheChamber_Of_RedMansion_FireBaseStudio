'use client';

/**
 * @fileOverview Structured QA Response Component
 *
 * Professional display component for Perplexity AI responses with:
 * - Numbered sections (一、二、三) with thematic headings
 * - Seamless inline citation integration [1][2][3]
 * - Dedicated references section
 * - Professional typography hierarchy
 * - Markdown rendering with custom styles
 *
 * Follows the UX design pattern specified in improvement report
 */

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ExternalLink } from 'lucide-react';
import type { PerplexityCitation } from '@/types/perplexity-qa';
import { cn } from '@/lib/utils';

// Phase 4-T4: Lazy load ReactMarkdown to reduce bundle size (~30KB)
const ReactMarkdown = dynamic(
  () => import('react-markdown'),
  {
    ssr: false,
    loading: () => <span className="animate-pulse bg-muted/30 rounded inline-block h-4 w-16" />,
  }
);

/**
 * Structured section interface
 * Represents a thematic section in the response
 */
export interface StructuredSection {
  number: string; // "一", "二", "三" or "1", "2", "3"
  title: string; // Section heading
  content: string; // Section markdown content
  citations: number[]; // Citation indices used in this section
}

/**
 * Component props interface
 */
export interface StructuredQAResponseProps {
  /** Array of structured sections */
  sections?: StructuredSection[];

  /** Raw markdown content (alternative to sections) */
  rawContent?: string;

  /** Array of citations */
  citations: PerplexityCitation[];

  /** Whether thinking process is complete */
  isThinkingComplete?: boolean;

  /** Callback when citation is clicked */
  onCitationClick?: (citationId: number) => void;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Process content to inject inline citations
 * Converts markdown with citation markers to clickable citation tags
 */
function processContentWithCitations(
  content: string,
  citations: PerplexityCitation[],
  onCitationClick?: (citationId: number) => void
): React.ReactNode {
  // Handle empty content - Task 4.2 Fix: Improved visibility on dark backgrounds
  if (!content || content.trim().length === 0) {
    return <span className="text-foreground/70 italic">內容載入中...</span>;
  }

  // Split content by citation patterns like [1], [2], [3]
  const parts = content.split(/(\[\d+\])/g);

  return parts.map((part, index) => {
    // Check if part is a citation marker
    const citationMatch = part.match(/\[(\d+)\]/);

    if (citationMatch) {
      const citationNum = parseInt(citationMatch[1], 10);
      const citation = citations.find(c => parseInt(c.number, 10) === citationNum);

      if (citation) {
        return (
          <sup
            key={`citation-${index}`}
            className="inline-flex items-center ml-0.5 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900 rounded px-1 transition-colors"
            onClick={() => onCitationClick?.(citationNum)}
            title={citation.title}
          >
            <span className="text-blue-600 dark:text-blue-400 text-xs font-medium">
              [{citationNum}]
            </span>
          </sup>
        );
      }
    }

    // Regular content - render as markdown
    return (
      <ReactMarkdown
        key={`content-${index}`}
        className="inline"
        components={{
          p: ({ children }) => <span>{children}</span>,
        }}
      >
        {part}
      </ReactMarkdown>
    );
  });
}

/**
 * Citation Reference Component
 * Displays a single citation in the references section
 */
interface CitationReferenceProps {
  citation: PerplexityCitation;
  index: number;
  onCitationClick?: (citationId: number) => void;
}

function CitationReference({ citation, index, onCitationClick }: CitationReferenceProps) {
  const citationNumber = parseInt(citation.number, 10) || (index + 1);

  return (
    <div
      className="flex gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer group"
      onClick={() => onCitationClick?.(citationNumber)}
    >
      <div className="flex-shrink-0">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-sm font-semibold">
          {citationNumber}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm text-foreground line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {citation.title}
          </h4>
          <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {citation.snippet && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {citation.snippet}
          </p>
        )}

        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          {citation.domain && (
            <span className="truncate">{citation.domain}</span>
          )}
          {citation.publishDate && citation.domain && (
            <span>·</span>
          )}
          {citation.publishDate && (
            <span>{citation.publishDate}</span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Main Structured QA Response Component
 */
export function StructuredQAResponse({
  sections,
  rawContent,
  citations,
  isThinkingComplete = true,
  onCitationClick,
  className,
}: StructuredQAResponseProps) {
  // Process content with citations
  const processedContent = useMemo(() => {
    if (sections && sections.length > 0) {
      return sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="structured-section mb-6">
          <div className="section-header mb-3 pb-2 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground flex items-baseline gap-2">
              <span className="text-blue-600 dark:text-blue-400">{section.number}</span>
              <span>{section.title}</span>
            </h3>
          </div>

          <div className="section-content prose prose-sm dark:prose-invert max-w-none">
            {processContentWithCitations(section.content, citations, onCitationClick)}
          </div>
        </div>
      ));
    } else if (rawContent) {
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {processContentWithCitations(rawContent, citations, onCitationClick)}
        </div>
      );
    }

    // Fallback for when no content is provided - Task 4.2 Fix: Improved visibility
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/70 italic p-4 border border-border/30 rounded-lg bg-background/20">
        AI 回答載入中...
      </div>
    );
  }, [sections, rawContent, citations, onCitationClick]);

  return (
    <div className={cn('structured-qa-response space-y-6', className)}>
      {/* Main Content */}
      <div className="response-content">
        {processedContent}
      </div>

      {/* References Section */}
      {citations.length > 0 && isThinkingComplete && (
        <div className="references-section mt-8 pt-6 border-t border-border">
          <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <span>📚</span>
            <span>參考來源</span>
            <span className="text-sm font-normal text-muted-foreground">
              ({citations.length} 個引用)
            </span>
          </h3>

          <div className="space-y-3">
            {citations.map((citation, index) => (
              <CitationReference
                key={citation.url || index}
                citation={citation}
                index={index}
                onCitationClick={onCitationClick}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Export utility function for external use
 */
export { processContentWithCitations };
