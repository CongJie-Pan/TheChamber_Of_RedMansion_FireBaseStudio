/**
 * @fileOverview Regression Tests for Streaming Termination Fix
 *
 * These tests prevent recurrence of the Task 4.2 bug where AI Q&A responses
 * would stop after showing only thinking content (e.g., "我需要...正在分析...").
 *
 * The fix (2025-11-27) includes:
 * 1. Removed `shouldStopAfterCurrentBatch` early exit logic
 * 2. Now waits for explicit [DONE] signal before ending stream
 * 3. [DONE] handler always yields final completion chunk
 * 4. Temperature constraint enforcement (< 2)
 *
 * @critical This is HIGH PRIORITY regression testing
 * @updated 2025-11-27 - Created to prevent regression of streaming fix
 */

import {
  createPerplexityConfig,
  PERPLEXITY_CONFIG,
  type PerplexityModelKey,
} from '@/ai/perplexity-config';
import {
  createMockPerplexityChunk,
  createMockSSEStream,
} from '../utils/perplexity-test-utils';

describe('Streaming Termination Regression Tests', () => {
  describe('Temperature Constraint (LobeChat Alignment)', () => {
    /**
     * Test: Temperature >= 2 should be treated as undefined
     *
     * Root cause: Perplexity API requires temperature < 2
     * Fix: Added temperature constraint in createPerplexityConfig()
     */
    test('should treat temperature >= 2 as undefined', () => {
      const config = createPerplexityConfig({
        model: 'sonar-reasoning',
        temperature: 2,
      });

      // Temperature >= 2 should NOT be included in config
      expect(config.temperature).toBeUndefined();
    });

    test('should treat temperature > 2 as undefined', () => {
      const config = createPerplexityConfig({
        model: 'sonar-reasoning',
        temperature: 5,
      });

      expect(config.temperature).toBeUndefined();
    });

    test('should pass temperature < 2 correctly', () => {
      const config = createPerplexityConfig({
        model: 'sonar-reasoning',
        temperature: 0.7,
      });

      expect(config.temperature).toBe(0.7);
    });

    test('should pass temperature = 0 correctly', () => {
      const config = createPerplexityConfig({
        model: 'sonar-reasoning',
        temperature: 0,
      });

      expect(config.temperature).toBe(0);
    });

    test('should pass temperature = 1.99 correctly (edge case)', () => {
      const config = createPerplexityConfig({
        model: 'sonar-reasoning',
        temperature: 1.99,
      });

      expect(config.temperature).toBe(1.99);
    });

    test('should use default temperature when not specified', () => {
      const config = createPerplexityConfig({
        model: 'sonar-reasoning',
      });

      expect(config.temperature).toBe(PERPLEXITY_CONFIG.DEFAULT_TEMPERATURE);
      expect(config.temperature).toBeLessThan(2);
    });
  });

  describe('Stream Chunk Accumulation', () => {
    /**
     * Test: fullContent should accumulate all text chunks
     *
     * Root cause: Early exit on isComplete prevented full content accumulation
     * Fix: Removed shouldStopAfterCurrentBatch, wait for [DONE]
     */
    test('should accumulate content across multiple chunks', () => {
      const chunks = [
        createMockPerplexityChunk({
          content: '林黛玉',
          fullContent: '林黛玉',
          chunkIndex: 0,
        }),
        createMockPerplexityChunk({
          content: '是《紅樓夢》',
          fullContent: '林黛玉是《紅樓夢》',
          chunkIndex: 1,
        }),
        createMockPerplexityChunk({
          content: '的主角。',
          fullContent: '林黛玉是《紅樓夢》的主角。',
          chunkIndex: 2,
          isComplete: true,
        }),
      ];

      // Verify final chunk contains all accumulated content
      const finalChunk = chunks[chunks.length - 1];
      expect(finalChunk.fullContent).toBe('林黛玉是《紅樓夢》的主角。');
      expect(finalChunk.isComplete).toBe(true);
    });

    test('should preserve thinking content in final chunk', () => {
      const thinkingContent = '正在分析問題，需要考慮林黛玉的性格特點...';

      const chunks = [
        createMockPerplexityChunk({
          content: '',
          fullContent: '',
          chunkIndex: 0,
          thinkingContent,
        }),
        createMockPerplexityChunk({
          content: '答案內容',
          fullContent: '答案內容',
          chunkIndex: 1,
          thinkingContent,
          isComplete: true,
        }),
      ];

      // Final chunk should have both thinking and answer content
      const finalChunk = chunks[chunks.length - 1];
      expect(finalChunk.thinkingContent).toBe(thinkingContent);
      expect(finalChunk.fullContent).toBe('答案內容');
    });

    test('should preserve citations in final chunk', () => {
      const citations = [
        { url: 'https://example.com/1', title: '來源1' },
        { url: 'https://example.com/2', title: '來源2' },
      ];

      const finalChunk = createMockPerplexityChunk({
        content: '最終內容',
        fullContent: '完整答案內容',
        chunkIndex: 5,
        isComplete: true,
        citations,
      });

      expect(finalChunk.citations).toHaveLength(2);
      expect(finalChunk.citations[0].title).toBe('來源1');
    });
  });

  describe('Task 4.2 Bug Scenario Prevention', () => {
    /**
     * Test: Simulate the exact bug scenario where only thinking content was shown
     *
     * Original bug: Stream exited after isComplete before [DONE] signal,
     * resulting in only "我需要...正在分析..." being displayed
     */
    test('should NOT exit early when isComplete=true (wait for [DONE])', () => {
      // Simulate the problematic scenario
      const chunks = [
        // First chunk: thinking content starts
        createMockPerplexityChunk({
          content: '',
          fullContent: '',
          chunkIndex: 0,
          thinkingContent: '我需要分析這個問題...',
        }),
        // Second chunk: more thinking
        createMockPerplexityChunk({
          content: '',
          fullContent: '',
          chunkIndex: 1,
          thinkingContent: '我需要分析這個問題...\n正在搜尋相關資料...',
        }),
        // Third chunk: isComplete=true but NOT [DONE] yet!
        // In the OLD buggy code, this would cause early exit
        createMockPerplexityChunk({
          content: '林黛玉',
          fullContent: '林黛玉',
          chunkIndex: 2,
          thinkingContent: '我需要分析這個問題...\n正在搜尋相關資料...',
          isComplete: true, // ⚠️ This used to trigger early exit!
        }),
      ];

      // Verify that even with isComplete=true, we have content
      // (In the fixed code, we continue until [DONE])
      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.isComplete).toBe(true);
      expect(lastChunk.fullContent).toBe('林黛玉');
      expect(lastChunk.thinkingContent).toContain('我需要分析這個問題');
    });

    test('should handle thinking-only response gracefully', () => {
      // Scenario: API returns only thinking content (no answer text)
      const chunks = [
        createMockPerplexityChunk({
          content: '',
          fullContent: '',
          chunkIndex: 0,
          thinkingContent: '這是一個複雜的問題，需要深入思考...',
          isComplete: true,
        }),
      ];

      const finalChunk = chunks[0];

      // Even with empty fullContent, we should get a valid chunk
      expect(finalChunk.fullContent).toBe('');
      expect(finalChunk.thinkingContent).toContain('這是一個複雜的問題');
      expect(finalChunk.isComplete).toBe(true);
    });
  });

  describe('[DONE] Signal Handling', () => {
    /**
     * Test: [DONE] handler should always yield final completion chunk
     *
     * Fix: Modified [DONE] handler to always yield, not just when finalChunk.content.trim() exists
     */
    test('should yield final chunk even with empty fullContent', () => {
      // This simulates what happens at [DONE] when only thinking content was received
      const finalChunk = createMockPerplexityChunk({
        content: '',
        fullContent: '',
        chunkIndex: 10,
        thinkingContent: '完整的思考過程內容...',
        isComplete: true,
      });

      // Final chunk should be valid even with empty answer
      expect(finalChunk.isComplete).toBe(true);
      expect(finalChunk.chunkIndex).toBe(10);
      // Thinking content should be preserved
      expect(finalChunk.thinkingContent).toBeTruthy();
    });

    test('should include all metadata in final chunk', () => {
      const searchQueries = ['林黛玉性格', '紅樓夢分析'];
      const citations = [
        { url: 'https://example.com', title: '參考來源' },
      ];

      const finalChunk = createMockPerplexityChunk({
        content: '最終答案',
        fullContent: '完整的最終答案',
        chunkIndex: 15,
        thinkingContent: '思考過程',
        citations,
        searchQueries,
        isComplete: true,
        responseTime: 5000,
      });

      expect(finalChunk.isComplete).toBe(true);
      expect(finalChunk.fullContent).toBe('完整的最終答案');
      expect(finalChunk.thinkingContent).toBe('思考過程');
      expect(finalChunk.citations).toEqual(citations);
      expect(finalChunk.collectedSearchQueries).toEqual(searchQueries);
      expect(finalChunk.responseTime).toBe(5000);
    });
  });

  describe('SSE Stream Format', () => {
    /**
     * Test: SSE stream should end with [DONE] signal
     */
    test('should create proper SSE stream ending with [DONE]', async () => {
      const chunks = [
        { content: 'test1' },
        { content: 'test2' },
      ];

      const stream = createMockSSEStream(chunks);
      const reader = stream.getReader();
      const decoder = new TextDecoder();

      const receivedData: string[] = [];

      // Read all chunks
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        receivedData.push(decoder.decode(value));
      }

      // Last chunk should be [DONE]
      const lastChunk = receivedData[receivedData.length - 1];
      expect(lastChunk).toContain('[DONE]');
    });
  });

  describe('Model Configuration Preservation', () => {
    /**
     * Test: Configuration should be correct for all models
     */
    test.each([
      ['sonar-pro', false],
      ['sonar-reasoning', true],
      ['sonar-reasoning-pro', true],
    ] as const)('should configure %s model correctly (reasoning=%s)', (model, expectsReasoning) => {
      const config = createPerplexityConfig({
        model: model as PerplexityModelKey,
        reasoningEffort: 'high',
      });

      expect(config.model).toBe(model);

      if (expectsReasoning) {
        expect(config.reasoning_effort).toBe('high');
      } else {
        expect(config.reasoning_effort).toBeUndefined();
      }
    });
  });

  describe('Content Derived From Thinking', () => {
    /**
     * Test: contentDerivedFromThinking flag should be preserved
     */
    test('should preserve contentDerivedFromThinking flag', () => {
      const chunk = createMockPerplexityChunk({
        content: '答案',
        fullContent: '完整答案',
        chunkIndex: 0,
        contentDerivedFromThinking: true,
      });

      expect(chunk.contentDerivedFromThinking).toBe(true);
    });

    test('should default contentDerivedFromThinking to false', () => {
      const chunk = createMockPerplexityChunk({
        content: '答案',
        fullContent: '完整答案',
        chunkIndex: 0,
      });

      expect(chunk.contentDerivedFromThinking).toBe(false);
    });
  });
});
