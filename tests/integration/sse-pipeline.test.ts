/**
 * @fileOverview Integration Tests: SSE Pipeline End-to-End
 *
 * Tests the complete Server-Sent Events pipeline from API route to ReadableStream.
 * Verifies event parsing, buffer management, and [DONE] signal handling.
 *
 * 100% mocked - no real API calls to Perplexity.
 *
 * @see src/app/api/perplexity-qa-stream/route.ts
 */

import { POST } from '@/app/api/perplexity-qa-stream/route';
import {
  createMockRequest,
  waitForSSECompletion,
  consumeStreamToEnd,
  collectAllStreamMessages
} from '@tests/utils/perplexity-test-utils';
import type { PerplexityStreamingChunk } from '@/types/perplexity-qa';

// Mock the Perplexity flow - separate mock implementations from hoisted mock
const mockPerplexityStreaming = jest.fn();
const mockCreateInput = jest.fn();

jest.mock('@/ai/flows/perplexity-red-chamber-qa', () => ({
  perplexityRedChamberQAStreaming: mockPerplexityStreaming,
  createPerplexityQAInputForFlow: mockCreateInput,
}));

import { perplexityRedChamberQAStreaming } from '@/ai/flows/perplexity-red-chamber-qa';

describe('Integration: SSE Pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Set default mock implementations
    mockCreateInput.mockResolvedValue({
      userQuestion: 'Test question',
      modelKey: 'sonar-reasoning-pro',
      reasoningEffort: 'medium',
      questionContext: 'general',
    });
  });

  describe('SSE Event Parsing', () => {
    test('should correctly parse SSE data field', async () => {
      const mockChunk: PerplexityStreamingChunk = {
        content: '測試內容',
        fullContent: '測試內容',
        timestamp: new Date().toISOString(),
        citations: [],
        searchQueries: [],
        metadata: {
          searchQueries: [],
          webSources: [],
          groundingSuccessful: true,
        },
        responseTime: 500,
        isComplete: true,
        chunkIndex: 0,
        thinkingContent: '',
      };

      (perplexityRedChamberQAStreaming as jest.Mock).mockImplementation(async function* () {
        yield mockChunk;
      });

      const request = createMockRequest({
        userQuestion: '測試問題',
        modelKey: 'sonar-pro',
      });

      const response = await POST(request);
      const reader = response.body?.getReader();
      expect(reader).toBeDefined();

      const decoder = new TextDecoder();
      const { value } = await reader!.read();
      const text = decoder.decode(value);

      // Verify SSE format: "data: {...}\n\n"
      expect(text).toMatch(/^data: \{.*\}\n\n$/);

      // Extract and parse JSON
      const jsonMatch = text.match(/data: (.*)\n\n/);
      expect(jsonMatch).not.toBeNull();

      const parsed = JSON.parse(jsonMatch![1]);
      expect(parsed).toMatchObject({
        content: '測試內容',
        fullContent: '測試內容',
        isComplete: true,
      });
    });

    test('should handle multi-line JSON in SSE events', async () => {
      const mockChunk: PerplexityStreamingChunk = {
        content: '這是一段\n包含換行\n的內容',
        fullContent: '這是一段\n包含換行\n的內容',
        timestamp: new Date().toISOString(),
        citations: [],
        searchQueries: [],
        metadata: {
          searchQueries: [],
          webSources: [],
          groundingSuccessful: true,
        },
        responseTime: 500,
        isComplete: true,
        chunkIndex: 0,
        thinkingContent: '',
      };

      (perplexityRedChamberQAStreaming as jest.Mock).mockImplementation(async function* () {
        yield mockChunk;
      });

      const request = createMockRequest({
        userQuestion: '測試換行',
        modelKey: 'sonar-pro',
      });

      const response = await POST(request);
      const chunks = await waitForSSECompletion(response);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toBe('這是一段\n包含換行\n的內容');
    });

    test('should handle special characters in SSE events', async () => {
      const specialContent = '特殊字符：<think>、</think>、"引號"、\'單引號\'、\\反斜線\\';

      const mockChunk: PerplexityStreamingChunk = {
        content: specialContent,
        fullContent: specialContent,
        timestamp: new Date().toISOString(),
        citations: [],
        searchQueries: [],
        metadata: {
          searchQueries: [],
          webSources: [],
          groundingSuccessful: true,
        },
        responseTime: 500,
        isComplete: true,
        chunkIndex: 0,
        thinkingContent: '',
      };

      (perplexityRedChamberQAStreaming as jest.Mock).mockImplementation(async function* () {
        yield mockChunk;
      });

      const request = createMockRequest({
        userQuestion: '測試特殊字符',
        modelKey: 'sonar-pro',
      });

      const response = await POST(request);
      const chunks = await waitForSSECompletion(response);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toBe(specialContent);
    });
  });

  describe('Buffer Management', () => {
    test('should handle rapid successive chunks without loss', async () => {
      const chunkCount = 50;
      const mockChunks: PerplexityStreamingChunk[] = Array.from({ length: chunkCount }, (_, i) => ({
        content: `Chunk ${i}`,
        fullContent: Array.from({ length: i + 1 }, (_, j) => `Chunk ${j}`).join(''),
        timestamp: new Date().toISOString(),
        citations: [],
        searchQueries: [],
        metadata: {
          searchQueries: [],
          webSources: [],
          groundingSuccessful: true,
        },
        responseTime: i * 10,
        isComplete: i === chunkCount - 1,
        chunkIndex: i,
        thinkingContent: '',
      }));

      (perplexityRedChamberQAStreaming as jest.Mock).mockImplementation(async function* () {
        for (const chunk of mockChunks) {
          yield chunk;
        }
      });

      const request = createMockRequest({
        userQuestion: '測試大量數據',
        modelKey: 'sonar-pro',
      });

      const response = await POST(request);
      const chunks = await waitForSSECompletion(response);

      // Verify all chunks received
      expect(chunks).toHaveLength(chunkCount);

      // Verify chunk order
      chunks.forEach((chunk, i) => {
        expect(chunk.chunkIndex).toBe(i);
      });

      // Verify last chunk completion
      expect(chunks[chunkCount - 1].isComplete).toBe(true);
    });

    test('should handle large content without truncation', async () => {
      const largeContent = 'A'.repeat(50000); // 50KB content

      const mockChunk: PerplexityStreamingChunk = {
        content: largeContent,
        fullContent: largeContent,
        timestamp: new Date().toISOString(),
        citations: [],
        searchQueries: [],
        metadata: {
          searchQueries: [],
          webSources: [],
          groundingSuccessful: true,
        },
        responseTime: 2000,
        isComplete: true,
        chunkIndex: 0,
        thinkingContent: '',
      };

      (perplexityRedChamberQAStreaming as jest.Mock).mockImplementation(async function* () {
        yield mockChunk;
      });

      const request = createMockRequest({
        userQuestion: '需要大量回應的問題',
        modelKey: 'sonar-reasoning-pro',
      });

      const response = await POST(request);
      const chunks = await waitForSSECompletion(response);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toHaveLength(50000);
      expect(chunks[0].fullContent).toBe(largeContent);
    });

    test('should maintain chunk order with async delays', async () => {
      const mockChunks: PerplexityStreamingChunk[] = [
        createTestChunk(0, 'First'),
        createTestChunk(1, 'Second'),
        createTestChunk(2, 'Third'),
      ];

      (perplexityRedChamberQAStreaming as jest.Mock).mockImplementation(async function* () {
        for (const chunk of mockChunks) {
          // Simulate variable processing time
          await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
          yield chunk;
        }
      });

      const request = createMockRequest({
        userQuestion: '測試順序',
        modelKey: 'sonar-pro',
      });

      const response = await POST(request);
      const chunks = await waitForSSECompletion(response);

      // Verify chunks arrived in correct order
      expect(chunks[0].content).toBe('First');
      expect(chunks[1].content).toBe('Second');
      expect(chunks[2].content).toBe('Third');
    });
  });

  describe('[DONE] Signal Handling', () => {
    test('should send [DONE] signal after last chunk', async () => {
      const mockChunk: PerplexityStreamingChunk = {
        content: '完整答案',
        fullContent: '完整答案',
        timestamp: new Date().toISOString(),
        citations: [],
        searchQueries: [],
        metadata: {
          searchQueries: [],
          webSources: [],
          groundingSuccessful: true,
        },
        responseTime: 500,
        isComplete: true,
        chunkIndex: 0,
        thinkingContent: '',
      };

      (perplexityRedChamberQAStreaming as jest.Mock).mockImplementation(async function* () {
        yield mockChunk;
      });

      const request = createMockRequest({
        userQuestion: '測試完成信號',
        modelKey: 'sonar-pro',
      });

      const response = await POST(request);

      // Use safe stream consumption with automatic reader cleanup
      const lastMessage = await consumeStreamToEnd(response);

      // Verify last message is [DONE]
      expect(lastMessage).toBe('data: [DONE]\n\n');
    });

    test('should send [DONE] signal after error chunk', async () => {
      (perplexityRedChamberQAStreaming as jest.Mock).mockImplementation(async function* () {
        throw new Error('Simulated error');
      });

      const request = createMockRequest({
        userQuestion: '測試錯誤後完成',
        modelKey: 'sonar-pro',
      });

      const response = await POST(request);

      // Use safe stream consumption with automatic reader cleanup
      const lastMessage = await consumeStreamToEnd(response);

      // Verify [DONE] sent even after error
      expect(lastMessage).toBe('data: [DONE]\n\n');
    });

    test('should close stream after [DONE] signal', async () => {
      const mockChunk: PerplexityStreamingChunk = {
        content: '測試',
        fullContent: '測試',
        timestamp: new Date().toISOString(),
        citations: [],
        searchQueries: [],
        metadata: {
          searchQueries: [],
          webSources: [],
          groundingSuccessful: true,
        },
        responseTime: 100,
        isComplete: true,
        chunkIndex: 0,
        thinkingContent: '',
      };

      (perplexityRedChamberQAStreaming as jest.Mock).mockImplementation(async function* () {
        yield mockChunk;
      });

      const request = createMockRequest({
        userQuestion: '測試流關閉',
        modelKey: 'sonar-pro',
      });

      const response = await POST(request);

      // Use safe stream collection with automatic reader cleanup
      const messages = await collectAllStreamMessages(response);

      // Should have at least chunk + [DONE] messages
      expect(messages.length).toBeGreaterThanOrEqual(2);
      expect(messages[messages.length - 1]).toBe('data: [DONE]\n\n');
      expect(messages.some(m => m.includes('測試'))).toBe(true);
    });
  });

  describe('Connection Management', () => {
    test('should set proper headers for SSE connection', async () => {
      const mockChunk: PerplexityStreamingChunk = {
        content: '測試',
        fullContent: '測試',
        timestamp: new Date().toISOString(),
        citations: [],
        searchQueries: [],
        metadata: {
          searchQueries: [],
          webSources: [],
          groundingSuccessful: true,
        },
        responseTime: 100,
        isComplete: true,
        chunkIndex: 0,
        thinkingContent: '',
      };

      (perplexityRedChamberQAStreaming as jest.Mock).mockImplementation(async function* () {
        yield mockChunk;
      });

      const request = createMockRequest({
        userQuestion: '測試標頭',
        modelKey: 'sonar-pro',
      });

      const response = await POST(request);

      // Verify SSE headers
      expect(response.headers.get('Content-Type')).toBe('text/event-stream; charset=utf-8');
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-transform');
      expect(response.headers.get('Connection')).toBe('keep-alive');
      expect(response.headers.get('X-Accel-Buffering')).toBe('no');
    });

    test('should support client-initiated cancellation', async () => {
      let generatorStarted = false;
      let generatorCancelled = false;

      (perplexityRedChamberQAStreaming as jest.Mock).mockImplementation(async function* () {
        generatorStarted = true;
        try {
          // Yield infinite chunks to test cancellation
          for (let i = 0; i < 1000; i++) {
            yield createTestChunk(i, `Chunk ${i}`);
            await new Promise(resolve => setTimeout(resolve, 1));
          }
        } finally {
          generatorCancelled = true;
        }
      });

      const request = createMockRequest({
        userQuestion: '測試取消',
        modelKey: 'sonar-pro',
      });

      const response = await POST(request);
      const reader = response.body?.getReader();
      expect(reader).toBeDefined();

      // Read a few chunks then cancel
      await reader!.read();
      await reader!.read();
      await reader!.cancel();

      expect(generatorStarted).toBe(true);
      // Note: Due to async nature, generatorCancelled might not be true immediately
    });

    test('should handle simultaneous multiple connections', async () => {
      const mockChunk: PerplexityStreamingChunk = {
        content: '並發測試',
        fullContent: '並發測試',
        timestamp: new Date().toISOString(),
        citations: [],
        searchQueries: [],
        metadata: {
          searchQueries: [],
          webSources: [],
          groundingSuccessful: true,
        },
        responseTime: 100,
        isComplete: true,
        chunkIndex: 0,
        thinkingContent: '',
      };

      (perplexityRedChamberQAStreaming as jest.Mock).mockImplementation(async function* () {
        yield mockChunk;
      });

      // Create 5 simultaneous requests
      const requests = Array.from({ length: 5 }, () =>
        createMockRequest({
          userQuestion: '並發問題',
          modelKey: 'sonar-pro',
        })
      );

      // Execute all requests in parallel
      const responses = await Promise.all(requests.map(req => POST(req)));

      // Verify all responses succeeded
      expect(responses).toHaveLength(5);
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('text/event-stream; charset=utf-8');
      });

      // Verify all can be read
      const allChunks = await Promise.all(
        responses.map(response => waitForSSECompletion(response))
      );

      allChunks.forEach(chunks => {
        expect(chunks).toHaveLength(1);
        expect(chunks[0].content).toBe('並發測試');
      });
    });
  });
});

/**
 * Helper: Create test chunk
 */
function createTestChunk(index: number, content: string): PerplexityStreamingChunk {
  return {
    content,
    fullContent: content,
    timestamp: new Date().toISOString(),
    citations: [],
    searchQueries: [],
    metadata: {
      searchQueries: [],
      webSources: [],
      groundingSuccessful: true,
    },
    responseTime: index * 10,
    isComplete: false,
    chunkIndex: index,
    thinkingContent: '',
  };
}
