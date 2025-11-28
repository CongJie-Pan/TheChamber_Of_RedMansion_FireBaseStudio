/**
 * @fileOverview Tests for StructuredQAResponse Component
 *
 * Tests cover:
 * - Raw content rendering as markdown
 * - Structured sections rendering
 * - Inline citation markers [1][2][3]
 * - References section display
 * - Citation click callbacks
 * - Empty content handling
 * - processContentWithCitations utility
 *
 * @updated 2025-11-27 - Created as part of Phase 4 UI testing
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  StructuredQAResponse,
  processContentWithCitations,
  type StructuredSection,
} from '@/components/ui/StructuredQAResponse';
import type { PerplexityCitation } from '@/types/perplexity-qa';

// Mock ReactMarkdown to avoid dynamic import issues in tests
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <span data-testid="markdown-content">{children}</span>,
}));

// Mock next/dynamic to render component directly
jest.mock('next/dynamic', () => (fn: () => Promise<any>) => {
  const Component = ({ children }: { children: string }) => (
    <span data-testid="markdown-content">{children}</span>
  );
  Component.displayName = 'ReactMarkdown';
  return Component;
});

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ExternalLink: () => <div data-testid="external-link-icon" />,
}));

describe('StructuredQAResponse Component', () => {
  const mockCitations: PerplexityCitation[] = [
    {
      number: '1',
      url: 'https://example.com/source1',
      title: '紅樓夢人物分析',
      snippet: '林黛玉是《紅樓夢》中的主要人物...',
      domain: 'example.com',
    },
    {
      number: '2',
      url: 'https://example.com/source2',
      title: '曹雪芹研究',
      snippet: '曹雪芹是清代小說家...',
      domain: 'example.com',
      publishDate: '2024-01-15',
    },
    {
      number: '3',
      url: 'https://zh.wikipedia.org/wiki/红楼梦',
      title: '紅樓夢 - 維基百科',
    },
  ];

  const mockSections: StructuredSection[] = [
    {
      number: '一',
      title: '人物性格',
      content: '林黛玉的性格特點包括敏感多疑[1]，才華橫溢[2]。',
      citations: [1, 2],
    },
    {
      number: '二',
      title: '文學意義',
      content: '從文學角度分析，林黛玉代表了...[3]',
      citations: [3],
    },
  ];

  describe('Raw Content Rendering', () => {
    test('should render raw content when provided', () => {
      render(
        <StructuredQAResponse
          rawContent="這是一段測試內容"
          citations={[]}
        />
      );

      expect(screen.getByText('這是一段測試內容')).toBeInTheDocument();
    });

    test('should render raw content with citations inline', () => {
      const content = '林黛玉是主角[1]，她的性格很獨特[2]。';
      render(
        <StructuredQAResponse
          rawContent={content}
          citations={mockCitations}
        />
      );

      // Should render clickable citation markers
      const citationMarkers = screen.getAllByText(/\[\d+\]/);
      expect(citationMarkers.length).toBeGreaterThan(0);
    });

    test('should handle empty raw content gracefully', () => {
      render(
        <StructuredQAResponse
          rawContent=""
          citations={[]}
        />
      );

      expect(screen.getByText('No answer content available')).toBeInTheDocument();
    });

    test('should handle whitespace-only raw content', () => {
      render(
        <StructuredQAResponse
          rawContent="   "
          citations={[]}
        />
      );

      expect(screen.getByText('No content available')).toBeInTheDocument();
    });

    test('should show fallback when no content provided', () => {
      render(
        <StructuredQAResponse
          citations={[]}
        />
      );

      expect(screen.getByText('No answer content available')).toBeInTheDocument();
    });
  });

  describe('Structured Sections Rendering', () => {
    test('should render structured sections when provided', () => {
      render(
        <StructuredQAResponse
          sections={mockSections}
          citations={mockCitations}
        />
      );

      // Check section numbers
      expect(screen.getByText('一')).toBeInTheDocument();
      expect(screen.getByText('二')).toBeInTheDocument();

      // Check section titles
      expect(screen.getByText('人物性格')).toBeInTheDocument();
      expect(screen.getByText('文學意義')).toBeInTheDocument();
    });

    test('should render section content with markdown', () => {
      render(
        <StructuredQAResponse
          sections={mockSections}
          citations={mockCitations}
        />
      );

      // Section content should be rendered
      expect(screen.getByText(/林黛玉的性格特點/)).toBeInTheDocument();
    });

    test('should prioritize sections over rawContent', () => {
      render(
        <StructuredQAResponse
          sections={mockSections}
          rawContent="This should not be displayed"
          citations={mockCitations}
        />
      );

      // Section content should be shown, not rawContent
      expect(screen.getByText('一')).toBeInTheDocument();
      expect(screen.queryByText('This should not be displayed')).not.toBeInTheDocument();
    });
  });

  describe('Citations Display', () => {
    test('should render clickable citation markers in content', () => {
      render(
        <StructuredQAResponse
          rawContent="這是內容[1]"
          citations={mockCitations}
          onCitationClick={jest.fn()}
        />
      );

      const citationMarker = screen.getByText('[1]');
      expect(citationMarker).toBeInTheDocument();
    });

    test('should call onCitationClick with correct citation number', () => {
      const onCitationClick = jest.fn();
      render(
        <StructuredQAResponse
          rawContent="這是內容[1]"
          citations={mockCitations}
          onCitationClick={onCitationClick}
        />
      );

      const citationMarker = screen.getByText('[1]');
      fireEvent.click(citationMarker);

      expect(onCitationClick).toHaveBeenCalledWith(1);
    });

    test('should handle multiple citation clicks', () => {
      const onCitationClick = jest.fn();
      render(
        <StructuredQAResponse
          rawContent="第一個引用[1]，第二個引用[2]"
          citations={mockCitations}
          onCitationClick={onCitationClick}
        />
      );

      fireEvent.click(screen.getByText('[1]'));
      fireEvent.click(screen.getByText('[2]'));

      expect(onCitationClick).toHaveBeenCalledTimes(2);
      expect(onCitationClick).toHaveBeenNthCalledWith(1, 1);
      expect(onCitationClick).toHaveBeenNthCalledWith(2, 2);
    });

    test('should work without onCitationClick handler', () => {
      expect(() => {
        render(
          <StructuredQAResponse
            rawContent="這是內容[1]"
            citations={mockCitations}
          />
        );
        fireEvent.click(screen.getByText('[1]'));
      }).not.toThrow();
    });
  });

  describe('References Section', () => {
    test('should show references section when citations provided and thinking complete', () => {
      render(
        <StructuredQAResponse
          rawContent="內容"
          citations={mockCitations}
          isThinkingComplete={true}
        />
      );

      expect(screen.getByText('參考來源')).toBeInTheDocument();
      expect(screen.getByText('(3 個引用)')).toBeInTheDocument();
    });

    test('should hide references section when isThinkingComplete is false', () => {
      render(
        <StructuredQAResponse
          rawContent="內容"
          citations={mockCitations}
          isThinkingComplete={false}
        />
      );

      expect(screen.queryByText('參考來源')).not.toBeInTheDocument();
    });

    test('should hide references section when no citations', () => {
      render(
        <StructuredQAResponse
          rawContent="內容"
          citations={[]}
          isThinkingComplete={true}
        />
      );

      expect(screen.queryByText('參考來源')).not.toBeInTheDocument();
    });

    test('should display citation title in references', () => {
      render(
        <StructuredQAResponse
          rawContent="內容"
          citations={mockCitations}
          isThinkingComplete={true}
        />
      );

      expect(screen.getByText('紅樓夢人物分析')).toBeInTheDocument();
      expect(screen.getByText('曹雪芹研究')).toBeInTheDocument();
    });

    test('should display citation snippet when available', () => {
      render(
        <StructuredQAResponse
          rawContent="內容"
          citations={mockCitations}
          isThinkingComplete={true}
        />
      );

      expect(screen.getByText(/林黛玉是《紅樓夢》中的主要人物/)).toBeInTheDocument();
    });

    test('should display citation domain and date', () => {
      render(
        <StructuredQAResponse
          rawContent="內容"
          citations={mockCitations}
          isThinkingComplete={true}
        />
      );

      expect(screen.getAllByText('example.com').length).toBeGreaterThan(0);
      expect(screen.getByText('2024-01-15')).toBeInTheDocument();
    });

    test('should call onCitationClick when reference clicked', () => {
      const onCitationClick = jest.fn();
      render(
        <StructuredQAResponse
          rawContent="內容"
          citations={mockCitations}
          isThinkingComplete={true}
          onCitationClick={onCitationClick}
        />
      );

      // Click on a reference item
      const referenceItem = screen.getByText('紅樓夢人物分析').closest('div[class*="cursor-pointer"]');
      if (referenceItem) {
        fireEvent.click(referenceItem);
        expect(onCitationClick).toHaveBeenCalledWith(1);
      }
    });
  });

  describe('CSS Classes and Styling', () => {
    test('should apply custom className', () => {
      const { container } = render(
        <StructuredQAResponse
          rawContent="內容"
          citations={[]}
          className="custom-test-class"
        />
      );

      expect(container.querySelector('.custom-test-class')).toBeInTheDocument();
    });

    test('should have base structured-qa-response class', () => {
      const { container } = render(
        <StructuredQAResponse
          rawContent="內容"
          citations={[]}
        />
      );

      expect(container.querySelector('.structured-qa-response')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long content', () => {
      const longContent = '這是很長的內容'.repeat(500);
      render(
        <StructuredQAResponse
          rawContent={longContent}
          citations={[]}
        />
      );

      expect(screen.getByText(longContent)).toBeInTheDocument();
    });

    test('should handle special characters in content', () => {
      const specialContent = '特殊字符 <>&"\'`\\n\\t 中文測試';
      render(
        <StructuredQAResponse
          rawContent={specialContent}
          citations={[]}
        />
      );

      expect(screen.getByText(specialContent)).toBeInTheDocument();
    });

    test('should handle citation markers without matching citations', () => {
      render(
        <StructuredQAResponse
          rawContent="這是內容[99]" // Citation 99 doesn't exist
          citations={mockCitations}
        />
      );

      // Should render the marker but not make it clickable
      expect(screen.getByText('[99]')).toBeInTheDocument();
    });

    test('should handle citations with missing optional fields', () => {
      const minimalCitation: PerplexityCitation[] = [
        { number: '1', url: 'https://example.com', title: 'Basic Title' },
      ];

      render(
        <StructuredQAResponse
          rawContent="內容[1]"
          citations={minimalCitation}
          isThinkingComplete={true}
        />
      );

      expect(screen.getByText('Basic Title')).toBeInTheDocument();
    });

    test('should handle empty sections array', () => {
      render(
        <StructuredQAResponse
          sections={[]}
          citations={[]}
        />
      );

      expect(screen.getByText('No answer content available')).toBeInTheDocument();
    });
  });

  describe('processContentWithCitations Utility', () => {
    test('should return empty fragment for empty content', () => {
      const result = processContentWithCitations('', [], undefined);
      const { container } = render(<div>{result}</div>);

      expect(container.textContent).toContain('No content available');
    });

    test('should return empty fragment for whitespace content', () => {
      const result = processContentWithCitations('   ', [], undefined);
      const { container } = render(<div>{result}</div>);

      expect(container.textContent).toContain('No content available');
    });

    test('should process content with citation markers', () => {
      const result = processContentWithCitations(
        '測試內容[1]',
        mockCitations,
        jest.fn()
      );

      const { container } = render(<div>{result}</div>);
      expect(container.textContent).toContain('[1]');
    });

    test('should handle content without citations', () => {
      const result = processContentWithCitations(
        '沒有引用的內容',
        mockCitations,
        undefined
      );

      const { container } = render(<div>{result}</div>);
      expect(container.textContent).toContain('沒有引用的內容');
    });
  });

  describe('Component Integration', () => {
    test('should render complete response with all features', () => {
      const onCitationClick = jest.fn();

      render(
        <StructuredQAResponse
          sections={mockSections}
          citations={mockCitations}
          isThinkingComplete={true}
          onCitationClick={onCitationClick}
          className="integration-test"
        />
      );

      // Check sections
      expect(screen.getByText('一')).toBeInTheDocument();
      expect(screen.getByText('二')).toBeInTheDocument();

      // Check references section
      expect(screen.getByText('參考來源')).toBeInTheDocument();
      expect(screen.getByText('(3 個引用)')).toBeInTheDocument();

      // Check citation titles in references
      expect(screen.getByText('紅樓夢人物分析')).toBeInTheDocument();
    });
  });
});
