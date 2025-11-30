/**
 * @fileOverview Tests for AIMessageBubble Component
 *
 * Tests cover:
 * - Thinking section rendering and collapsibility
 * - Answer content rendering
 * - Citation interaction
 * - Streaming indicator
 * - Edge cases (no thinking, empty citations, etc.)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AIMessageBubble } from '@/components/ui/AIMessageBubble';
import type { PerplexityCitation } from '@/types/perplexity-qa';

// Mock StructuredQAResponse component
jest.mock('@/components/ui/StructuredQAResponse', () => ({
  StructuredQAResponse: ({ rawContent, citations, onCitationClick }: any) => (
    <div data-testid="structured-qa-response">
      <div data-testid="answer-content">{rawContent}</div>
      <div data-testid="citations-count">{citations.length}</div>
      {citations.map((citation: PerplexityCitation, index: number) => (
        <button
          key={index}
          data-testid={`citation-${citation.number}`}
          onClick={() => onCitationClick?.(parseInt(citation.number, 10))}
        >
          Citation {citation.number}
        </button>
      ))}
    </div>
  ),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  ChevronRight: () => <div data-testid="chevron-right-icon" />,
}));

describe('AIMessageBubble Component', () => {
  const mockCitations: PerplexityCitation[] = [
    { number: '1', url: 'https://example.com/1', title: 'Source 1' },
    { number: '2', url: 'https://example.com/2', title: 'Source 2' },
  ];

  const defaultProps = {
    answer: 'This is the AI answer content.',
    citations: mockCitations,
    thinkingProcess: 'This is the thinking process...',
    thinkingDuration: 15,
    isThinkingComplete: true,
    isStreaming: false,
  };

  describe('Thinking Section Rendering', () => {
    test('should render thinking section when thinkingProcess provided', () => {
      render(<AIMessageBubble {...defaultProps} />);

      expect(screen.getByText('Thought for 15 seconds')).toBeInTheDocument();
    });

    test('should hide thinking section when showThinkingInline is false', () => {
      render(
        <AIMessageBubble
          {...defaultProps}
          showThinkingInline={false}
        />
      );

      expect(screen.queryByText(/Thought for/)).not.toBeInTheDocument();
    });

    test('should NOT render thinking section when thinkingProcess is undefined', () => {
      render(
        <AIMessageBubble
          {...defaultProps}
          thinkingProcess={undefined}
        />
      );

      expect(screen.queryByText(/Thought for/)).not.toBeInTheDocument();
    });

    test('should NOT render thinking section when thinkingProcess is empty string', () => {
      render(
        <AIMessageBubble
          {...defaultProps}
          thinkingProcess=""
        />
      );

      expect(screen.queryByText(/Thought for/)).not.toBeInTheDocument();
    });

    test('should NOT render thinking section when thinkingProcess is whitespace only', () => {
      render(
        <AIMessageBubble
          {...defaultProps}
          thinkingProcess="   "
        />
      );

      expect(screen.queryByText(/Thought for/)).not.toBeInTheDocument();
    });

    test('should show "Thinking…" when thinking not complete', () => {
      render(
        <AIMessageBubble
          {...defaultProps}
          isThinkingComplete={false}
        />
      );

      expect(screen.getByText('Thinking…')).toBeInTheDocument();
    });

    test('should show generic completion label when duration is not provided', () => {
      render(
        <AIMessageBubble
          {...defaultProps}
          thinkingDuration={undefined}
        />
      );

      expect(screen.getByText('Thought complete')).toBeInTheDocument();
    });
  });

  describe('Thinking Section Collapsibility', () => {
    test('should toggle thinking section visibility on click', () => {
      render(<AIMessageBubble {...defaultProps} />);

      const toggleButton = screen.getByLabelText('收合思考過程');

      // Initially expanded
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

      // Collapse
      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

      // Expand again
      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Answer Section Rendering', () => {
    test('should render answer content via StructuredQAResponse', () => {
      render(<AIMessageBubble {...defaultProps} />);

      expect(screen.getByTestId('structured-qa-response')).toBeInTheDocument();
      expect(screen.getByTestId('answer-content')).toHaveTextContent(defaultProps.answer);
    });

    test('should pass citations to StructuredQAResponse', () => {
      render(<AIMessageBubble {...defaultProps} />);

      expect(screen.getByTestId('citations-count')).toHaveTextContent('2');
    });

    test('should handle empty answer gracefully', () => {
      render(<AIMessageBubble {...defaultProps} answer="" />);

      expect(screen.getByTestId('answer-content')).toBeInTheDocument();
      expect(screen.getByTestId('answer-content')).toHaveTextContent('');
    });

    test('should handle empty citations array', () => {
      render(<AIMessageBubble {...defaultProps} citations={[]} />);

      expect(screen.getByTestId('citations-count')).toHaveTextContent('0');
    });
  });

  describe('Citation Click Handling', () => {
    test('should call onCitationClick with correct citation ID', () => {
      const onCitationClick = jest.fn();
      render(<AIMessageBubble {...defaultProps} onCitationClick={onCitationClick} />);

      const citation1Button = screen.getByTestId('citation-1');
      fireEvent.click(citation1Button);

      expect(onCitationClick).toHaveBeenCalledWith(1);
    });

    test('should handle multiple citation clicks', () => {
      const onCitationClick = jest.fn();
      render(<AIMessageBubble {...defaultProps} onCitationClick={onCitationClick} />);

      fireEvent.click(screen.getByTestId('citation-1'));
      fireEvent.click(screen.getByTestId('citation-2'));

      expect(onCitationClick).toHaveBeenCalledTimes(2);
      expect(onCitationClick).toHaveBeenNthCalledWith(1, 1);
      expect(onCitationClick).toHaveBeenNthCalledWith(2, 2);
    });

    test('should work without onCitationClick handler', () => {
      expect(() => {
        render(<AIMessageBubble {...defaultProps} onCitationClick={undefined} />);
        fireEvent.click(screen.getByTestId('citation-1'));
      }).not.toThrow();
    });
  });

  describe('Streaming Indicator', () => {
    test('should show streaming indicator when isStreaming is true', () => {
      render(<AIMessageBubble {...defaultProps} isStreaming={true} />);

      expect(screen.getByText('AI 正在回答中...')).toBeInTheDocument();
    });

    test('should NOT show streaming indicator when isStreaming is false', () => {
      render(<AIMessageBubble {...defaultProps} isStreaming={false} />);

      expect(screen.queryByText('AI 正在回答中...')).not.toBeInTheDocument();
    });

    test('should NOT show streaming indicator by default', () => {
      const { isStreaming, ...propsWithoutStreaming } = defaultProps;
      render(<AIMessageBubble {...propsWithoutStreaming} />);

      expect(screen.queryByText('AI 正在回答中...')).not.toBeInTheDocument();
    });

    test('should show animated dots when streaming', () => {
      const { container } = render(<AIMessageBubble {...defaultProps} isStreaming={true} />);

      const dots = container.querySelectorAll('.animate-bounce');
      expect(dots).toHaveLength(3);
    });
  });

  describe('CSS Classes and Styling', () => {
    test('should apply custom className', () => {
      const { container } = render(
        <AIMessageBubble {...defaultProps} className="custom-test-class" />
      );

      expect(container.querySelector('.custom-test-class')).toBeInTheDocument();
    });

    test('should have base ai-message-bubble class', () => {
      const { container } = render(<AIMessageBubble {...defaultProps} />);

      expect(container.querySelector('.ai-message-bubble')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long thinking process text', () => {
      const longThinkingProcess = 'A'.repeat(5000);
      render(
        <AIMessageBubble
          {...defaultProps}
          thinkingProcess={longThinkingProcess}
        />
      );

      expect(screen.getByText(longThinkingProcess)).toBeInTheDocument();
    });

    test('should handle very long answer text', () => {
      const longAnswer = 'B'.repeat(5000);
      render(<AIMessageBubble {...defaultProps} answer={longAnswer} />);

      expect(screen.getByTestId('answer-content')).toHaveTextContent(longAnswer);
    });

    test('should handle special characters in thinking process', () => {
      const specialChars = '特殊字符 <>&"\'`\\n\\t';
      render(
        <AIMessageBubble
          {...defaultProps}
          thinkingProcess={specialChars}
        />
      );

      expect(screen.getByText(specialChars)).toBeInTheDocument();
    });

    test('should handle zero thinking duration', () => {
      render(<AIMessageBubble {...defaultProps} thinkingDuration={0} />);

      expect(screen.getByText('Thought for 0 seconds')).toBeInTheDocument();
    });

    test('should handle very large thinking duration', () => {
      render(<AIMessageBubble {...defaultProps} thinkingDuration={9999} />);

      expect(screen.getByText('Thought for 9999 seconds')).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    test('should render all sections together correctly', () => {
      const { container } = render(<AIMessageBubble {...defaultProps} />);

      // Check all sections exist
      expect(container.querySelector('.thinking-section')).toBeInTheDocument();
      expect(container.querySelector('.answer-section')).toBeInTheDocument();
      expect(screen.getByTestId('structured-qa-response')).toBeInTheDocument();
    });

    test('should maintain state across re-renders', () => {
      const { rerender } = render(<AIMessageBubble {...defaultProps} />);

      const toggleButton = screen.getByLabelText('收合思考過程');

      // Collapse then expand to simulate interaction
      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

      // Re-render with different answer
      rerender(<AIMessageBubble {...defaultProps} answer="New answer content" />);

      // Thinking should still be expanded
      expect(screen.getByText(defaultProps.thinkingProcess)).toBeInTheDocument();
      expect(screen.getByTestId('answer-content')).toHaveTextContent('New answer content');
    });
  });

  /**
   * Task 4.2 Fix - Bug #3: Thinking Expanded Preference Tests
   *
   * Tests for the new props added to persist user's thinking panel preference:
   * - thinkingExpandedPreference: 'auto' | 'collapsed' | 'expanded'
   * - onThinkingToggle: (isExpanded: boolean) => void
   */
  describe('Thinking Expanded Preference (Task 4.2 Fix)', () => {
    describe('Initial State Based on Preference', () => {
      test('should start collapsed when thinkingExpandedPreference is "collapsed"', () => {
        render(
          <AIMessageBubble
            {...defaultProps}
            thinkingExpandedPreference="collapsed"
          />
        );

        const toggleButton = screen.getByLabelText('展開思考過程');
        expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
      });

      test('should start expanded when thinkingExpandedPreference is "expanded"', () => {
        render(
          <AIMessageBubble
            {...defaultProps}
            thinkingExpandedPreference="expanded"
          />
        );

        const toggleButton = screen.getByLabelText('收合思考過程');
        expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
      });

      test('should auto-expand when thinkingExpandedPreference is "auto" (default)', () => {
        render(<AIMessageBubble {...defaultProps} />);

        const toggleButton = screen.getByLabelText('收合思考過程');
        expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
      });
    });

    describe('onThinkingToggle Callback', () => {
      test('should call onThinkingToggle with false when collapsing', () => {
        const onThinkingToggle = jest.fn();
        render(
          <AIMessageBubble
            {...defaultProps}
            onThinkingToggle={onThinkingToggle}
          />
        );

        const toggleButton = screen.getByLabelText('收合思考過程');
        fireEvent.click(toggleButton);

        expect(onThinkingToggle).toHaveBeenCalledWith(false);
      });

      test('should call onThinkingToggle with true when expanding', () => {
        const onThinkingToggle = jest.fn();
        render(
          <AIMessageBubble
            {...defaultProps}
            thinkingExpandedPreference="collapsed"
            onThinkingToggle={onThinkingToggle}
          />
        );

        const toggleButton = screen.getByLabelText('展開思考過程');
        fireEvent.click(toggleButton);

        expect(onThinkingToggle).toHaveBeenCalledWith(true);
      });

      test('should work without onThinkingToggle handler (backward compatibility)', () => {
        expect(() => {
          render(<AIMessageBubble {...defaultProps} onThinkingToggle={undefined} />);
          const toggleButton = screen.getByLabelText('收合思考過程');
          fireEvent.click(toggleButton);
        }).not.toThrow();
      });
    });

    describe('Preference Persistence Across Re-renders', () => {
      test('should respect collapsed preference across content updates', () => {
        const { rerender } = render(
          <AIMessageBubble
            {...defaultProps}
            thinkingExpandedPreference="collapsed"
          />
        );

        // Verify initially collapsed
        const toggleButton = screen.getByLabelText('展開思考過程');
        expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

        // Re-render with new answer (simulating streaming update)
        rerender(
          <AIMessageBubble
            {...defaultProps}
            answer="Updated answer content"
            thinkingExpandedPreference="collapsed"
          />
        );

        // Should still be collapsed
        expect(screen.getByLabelText('展開思考過程')).toHaveAttribute('aria-expanded', 'false');
      });

      test('should respect expanded preference across content updates', () => {
        const { rerender } = render(
          <AIMessageBubble
            {...defaultProps}
            thinkingExpandedPreference="expanded"
          />
        );

        // Verify initially expanded
        expect(screen.getByLabelText('收合思考過程')).toHaveAttribute('aria-expanded', 'true');

        // Re-render with new thinking content (simulating streaming)
        rerender(
          <AIMessageBubble
            {...defaultProps}
            thinkingProcess="Updated thinking process..."
            thinkingExpandedPreference="expanded"
          />
        );

        // Should still be expanded
        expect(screen.getByLabelText('收合思考過程')).toHaveAttribute('aria-expanded', 'true');
      });

      test('should update state when preference changes from collapsed to expanded', () => {
        const { rerender } = render(
          <AIMessageBubble
            {...defaultProps}
            thinkingExpandedPreference="collapsed"
          />
        );

        // Initially collapsed
        expect(screen.getByLabelText('展開思考過程')).toHaveAttribute('aria-expanded', 'false');

        // Parent updates preference to expanded
        rerender(
          <AIMessageBubble
            {...defaultProps}
            thinkingExpandedPreference="expanded"
          />
        );

        // Should now be expanded
        expect(screen.getByLabelText('收合思考過程')).toHaveAttribute('aria-expanded', 'true');
      });
    });
  });
});
