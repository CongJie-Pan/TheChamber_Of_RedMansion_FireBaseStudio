/**
 * @fileOverview SimpleChatStream Unit Tests (PRX-008)
 *
 * Test cases for the streaming chat function covering:
 * - Successful streaming
 * - Callback triggering (thinking, content, citations, done, error)
 * - AbortController cancellation
 * - Error handling
 * - Resource cleanup
 */

import { createSimpleChatStream, SimpleChatStreamError } from '@/lib/adapters/simple-chat-stream';
import type { StreamCallbacks, ChatMessage } from '@/lib/adapters/types';

// Mock the perplexity-config module
jest.mock('@/ai/perplexity-config', () => ({
  PERPLEXITY_CONFIG: {
    BASE_URL: 'https://api.perplexity.ai',
    CHAT_COMPLETIONS_ENDPOINT: '/chat/completions',
    DEFAULT_MAX_TOKENS: 4096,
    DEFAULT_TEMPERATURE: 0.7,
  },
  getPerplexityApiKey: jest.fn(() => 'test-api-key'),
}));

// Mock the feature flags
jest.mock('@/lib/perplexity-feature-flags', () => ({
  PERPLEXITY_FLAGS: {
    debugAdapter: false,
  },
}));

// Helper to create a mock SSE stream
function createMockSSEStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;

  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]));
        index++;
      } else {
        controller.close();
      }
    },
  });
}

// Helper to create a mock fetch response
function createMockResponse(
  chunks: string[],
  options: { ok?: boolean; status?: number; statusText?: string } = {}
): Response {
  const { ok = true, status = 200, statusText = 'OK' } = options;

  return {
    ok,
    status,
    statusText,
    body: createMockSSEStream(chunks),
    json: jest.fn().mockResolvedValue({}),
    headers: new Headers(),
  } as unknown as Response;
}

// Helper to create mock callbacks
function createMockCallbacks(): StreamCallbacks & { calls: Record<string, unknown[][]> } {
  const calls: Record<string, unknown[][]> = {
    onThinkingStart: [],
    onThinkingContent: [],
    onThinkingEnd: [],
    onContent: [],
    onCitations: [],
    onDone: [],
    onError: [],
  };

  return {
    onThinkingStart: jest.fn(() => { calls.onThinkingStart.push([]); }),
    onThinkingContent: jest.fn((content: string) => { calls.onThinkingContent.push([content]); }),
    onThinkingEnd: jest.fn(() => { calls.onThinkingEnd.push([]); }),
    onContent: jest.fn((content: string) => { calls.onContent.push([content]); }),
    onCitations: jest.fn((citations: string[]) => { calls.onCitations.push([citations]); }),
    onDone: jest.fn(() => { calls.onDone.push([]); }),
    onError: jest.fn((error: Error) => { calls.onError.push([error]); }),
    calls,
  };
}

describe('SimpleChatStream', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Successful streaming', () => {
    it('should successfully stream a simple response', async () => {
      const sseChunks = [
        'data: {"id":"1","choices":[{"index":0,"delta":{"content":"Hello"}}]}\n\n',
        'data: {"id":"2","choices":[{"index":0,"delta":{"content":" World"}}]}\n\n',
        'data: [DONE]\n\n',
      ];

      global.fetch = jest.fn().mockResolvedValue(createMockResponse(sseChunks));

      const callbacks = createMockCallbacks();
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

      await createSimpleChatStream(messages, callbacks);

      expect(callbacks.onContent).toHaveBeenCalledWith('Hello');
      expect(callbacks.onContent).toHaveBeenCalledWith(' World');
      expect(callbacks.onDone).toHaveBeenCalled();
      expect(callbacks.onError).not.toHaveBeenCalled();
    });

    it('should handle empty content deltas', async () => {
      const sseChunks = [
        'data: {"id":"1","choices":[{"index":0,"delta":{}}]}\n\n',
        'data: {"id":"2","choices":[{"index":0,"delta":{"content":"Hello"}}]}\n\n',
        'data: [DONE]\n\n',
      ];

      global.fetch = jest.fn().mockResolvedValue(createMockResponse(sseChunks));

      const callbacks = createMockCallbacks();
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

      await createSimpleChatStream(messages, callbacks);

      expect(callbacks.onContent).toHaveBeenCalledTimes(1);
      expect(callbacks.onContent).toHaveBeenCalledWith('Hello');
      expect(callbacks.onDone).toHaveBeenCalled();
    });
  });

  describe('Thinking callbacks', () => {
    it('should trigger onThinkingStart when <think> tag starts', async () => {
      const sseChunks = [
        'data: {"id":"1","choices":[{"index":0,"delta":{"content":"<think>思考中"}}]}\n\n',
        'data: [DONE]\n\n',
      ];

      global.fetch = jest.fn().mockResolvedValue(createMockResponse(sseChunks));

      const callbacks = createMockCallbacks();
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

      await createSimpleChatStream(messages, callbacks);

      expect(callbacks.onThinkingStart).toHaveBeenCalled();
    });

    it('should trigger onThinkingContent with thinking content', async () => {
      const sseChunks = [
        'data: {"id":"1","choices":[{"index":0,"delta":{"content":"<think>分析問題中..."}}]}\n\n',
        'data: [DONE]\n\n',
      ];

      global.fetch = jest.fn().mockResolvedValue(createMockResponse(sseChunks));

      const callbacks = createMockCallbacks();
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

      await createSimpleChatStream(messages, callbacks);

      expect(callbacks.onThinkingContent).toHaveBeenCalledWith('分析問題中...');
    });

    it('should trigger onThinkingEnd when </think> tag ends', async () => {
      const sseChunks = [
        'data: {"id":"1","choices":[{"index":0,"delta":{"content":"<think>思考</think>答案"}}]}\n\n',
        'data: [DONE]\n\n',
      ];

      global.fetch = jest.fn().mockResolvedValue(createMockResponse(sseChunks));

      const callbacks = createMockCallbacks();
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

      await createSimpleChatStream(messages, callbacks);

      expect(callbacks.onThinkingStart).toHaveBeenCalled();
      expect(callbacks.onThinkingContent).toHaveBeenCalledWith('思考');
      expect(callbacks.onThinkingEnd).toHaveBeenCalled();
      expect(callbacks.onContent).toHaveBeenCalledWith('答案');
    });

    it('should handle thinking spread across multiple chunks', async () => {
      const sseChunks = [
        'data: {"id":"1","choices":[{"index":0,"delta":{"content":"<think>第一部分"}}]}\n\n',
        'data: {"id":"2","choices":[{"index":0,"delta":{"content":"第二部分"}}]}\n\n',
        'data: {"id":"3","choices":[{"index":0,"delta":{"content":"</think>答案"}}]}\n\n',
        'data: [DONE]\n\n',
      ];

      global.fetch = jest.fn().mockResolvedValue(createMockResponse(sseChunks));

      const callbacks = createMockCallbacks();
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

      await createSimpleChatStream(messages, callbacks);

      expect(callbacks.onThinkingStart).toHaveBeenCalledTimes(1);
      expect(callbacks.onThinkingContent).toHaveBeenCalledWith('第一部分');
      expect(callbacks.onThinkingContent).toHaveBeenCalledWith('第二部分');
      expect(callbacks.onThinkingEnd).toHaveBeenCalledTimes(1);
      expect(callbacks.onContent).toHaveBeenCalledWith('答案');
    });
  });

  describe('Content callback', () => {
    it('should trigger onContent for regular content', async () => {
      const sseChunks = [
        'data: {"id":"1","choices":[{"index":0,"delta":{"content":"這是"}}]}\n\n',
        'data: {"id":"2","choices":[{"index":0,"delta":{"content":"答案"}}]}\n\n',
        'data: [DONE]\n\n',
      ];

      global.fetch = jest.fn().mockResolvedValue(createMockResponse(sseChunks));

      const callbacks = createMockCallbacks();
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

      await createSimpleChatStream(messages, callbacks);

      expect(callbacks.onContent).toHaveBeenCalledWith('這是');
      expect(callbacks.onContent).toHaveBeenCalledWith('答案');
    });

    it('should trigger onContent for content after </think>', async () => {
      const sseChunks = [
        'data: {"id":"1","choices":[{"index":0,"delta":{"content":"<think>思考</think>最終答案"}}]}\n\n',
        'data: [DONE]\n\n',
      ];

      global.fetch = jest.fn().mockResolvedValue(createMockResponse(sseChunks));

      const callbacks = createMockCallbacks();
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

      await createSimpleChatStream(messages, callbacks);

      expect(callbacks.onContent).toHaveBeenCalledWith('最終答案');
    });
  });

  describe('Citations callback', () => {
    it('should trigger onCitations when citations are received', async () => {
      const sseChunks = [
        'data: {"id":"1","choices":[{"index":0,"delta":{"content":"答案"}}],"citations":["https://example.com/1","https://example.com/2"]}\n\n',
        'data: [DONE]\n\n',
      ];

      global.fetch = jest.fn().mockResolvedValue(createMockResponse(sseChunks));

      const callbacks = createMockCallbacks();
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

      await createSimpleChatStream(messages, callbacks);

      expect(callbacks.onCitations).toHaveBeenCalledWith([
        'https://example.com/1',
        'https://example.com/2',
      ]);
    });

    it('should use the latest citations when multiple are received', async () => {
      const sseChunks = [
        'data: {"id":"1","choices":[{"index":0,"delta":{"content":"第一"}}],"citations":["https://old.com"]}\n\n',
        'data: {"id":"2","choices":[{"index":0,"delta":{"content":"第二"}}],"citations":["https://new.com"]}\n\n',
        'data: [DONE]\n\n',
      ];

      global.fetch = jest.fn().mockResolvedValue(createMockResponse(sseChunks));

      const callbacks = createMockCallbacks();
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

      await createSimpleChatStream(messages, callbacks);

      // Should call onCitations with the latest citations
      expect(callbacks.onCitations).toHaveBeenCalledWith(['https://new.com']);
    });
  });

  describe('Done callback', () => {
    it('should trigger onDone when [DONE] is received', async () => {
      const sseChunks = [
        'data: {"id":"1","choices":[{"index":0,"delta":{"content":"完成"}}]}\n\n',
        'data: [DONE]\n\n',
      ];

      global.fetch = jest.fn().mockResolvedValue(createMockResponse(sseChunks));

      const callbacks = createMockCallbacks();
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

      await createSimpleChatStream(messages, callbacks);

      expect(callbacks.onDone).toHaveBeenCalledTimes(1);
    });

    it('should trigger onDone when stream ends naturally', async () => {
      const sseChunks = [
        'data: {"id":"1","choices":[{"index":0,"delta":{"content":"完成"}}]}\n\n',
        // No [DONE] signal, stream just ends
      ];

      global.fetch = jest.fn().mockResolvedValue(createMockResponse(sseChunks));

      const callbacks = createMockCallbacks();
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

      await createSimpleChatStream(messages, callbacks);

      expect(callbacks.onDone).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error handling', () => {
    it('should trigger onError for HTTP 401 errors', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: jest.fn().mockResolvedValue({ error: { message: 'Invalid API key' } }),
      } as unknown as Response);

      const callbacks = createMockCallbacks();
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

      await createSimpleChatStream(messages, callbacks);

      expect(callbacks.onError).toHaveBeenCalled();
      const error = (callbacks.onError as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(SimpleChatStreamError);
      expect(error.statusCode).toBe(401);
    });

    it('should trigger onError for HTTP 429 rate limit errors', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: jest.fn().mockResolvedValue({ error: { message: 'Rate limit exceeded' } }),
      } as unknown as Response);

      const callbacks = createMockCallbacks();
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

      await createSimpleChatStream(messages, callbacks);

      expect(callbacks.onError).toHaveBeenCalled();
      const error = (callbacks.onError as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(SimpleChatStreamError);
      expect(error.statusCode).toBe(429);
    });

    it('should trigger onError for HTTP 500 server errors', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn().mockResolvedValue({}),
      } as unknown as Response);

      const callbacks = createMockCallbacks();
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

      await createSimpleChatStream(messages, callbacks);

      expect(callbacks.onError).toHaveBeenCalled();
      const error = (callbacks.onError as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(SimpleChatStreamError);
      expect(error.statusCode).toBe(500);
    });

    it('should trigger onError for network errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const callbacks = createMockCallbacks();
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

      await createSimpleChatStream(messages, callbacks);

      expect(callbacks.onError).toHaveBeenCalled();
      const error = (callbacks.onError as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('Network error');
    });

    it('should handle missing API key', async () => {
      const { getPerplexityApiKey } = require('@/ai/perplexity-config');
      (getPerplexityApiKey as jest.Mock).mockReturnValueOnce(null);

      const callbacks = createMockCallbacks();
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

      await createSimpleChatStream(messages, callbacks);

      expect(callbacks.onError).toHaveBeenCalled();
      const error = (callbacks.onError as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(SimpleChatStreamError);
      expect(error.statusCode).toBe(401);
    });

    it('should handle no response body', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: null,
      } as unknown as Response);

      const callbacks = createMockCallbacks();
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

      await createSimpleChatStream(messages, callbacks);

      expect(callbacks.onError).toHaveBeenCalled();
      const error = (callbacks.onError as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(SimpleChatStreamError);
      expect(error.statusCode).toBe(500);
    });
  });

  describe('AbortController cancellation', () => {
    it('should not trigger onError when request is aborted', async () => {
      const abortController = new AbortController();

      // Create a stream that waits before sending data
      const slowStream = new ReadableStream<Uint8Array>({
        async start(controller) {
          // Abort before sending data
          setTimeout(() => {
            abortController.abort();
          }, 10);

          await new Promise(resolve => setTimeout(resolve, 100));
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode('data: {"id":"1","choices":[{"index":0,"delta":{"content":"Hello"}}]}\n\n'));
          controller.close();
        },
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: slowStream,
      } as unknown as Response);

      const callbacks = createMockCallbacks();
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

      await createSimpleChatStream(messages, callbacks, {
        abortSignal: abortController.signal,
      });

      expect(callbacks.onError).not.toHaveBeenCalled();
    });

    it('should return immediately if already aborted', async () => {
      const abortController = new AbortController();
      abortController.abort();

      global.fetch = jest.fn();

      const callbacks = createMockCallbacks();
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

      await createSimpleChatStream(messages, callbacks, {
        abortSignal: abortController.signal,
      });

      expect(global.fetch).not.toHaveBeenCalled();
      expect(callbacks.onDone).not.toHaveBeenCalled();
      expect(callbacks.onError).not.toHaveBeenCalled();
    });

    it('should stop processing when aborted mid-stream', async () => {
      const abortController = new AbortController();
      let chunkCount = 0;

      const controlledStream = new ReadableStream<Uint8Array>({
        async pull(controller) {
          chunkCount++;
          const encoder = new TextEncoder();

          if (chunkCount === 1) {
            controller.enqueue(encoder.encode('data: {"id":"1","choices":[{"index":0,"delta":{"content":"First"}}]}\n\n'));
          } else if (chunkCount === 2) {
            // Abort after first chunk
            abortController.abort();
            controller.enqueue(encoder.encode('data: {"id":"2","choices":[{"index":0,"delta":{"content":"Second"}}]}\n\n'));
          } else {
            controller.close();
          }
        },
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: controlledStream,
      } as unknown as Response);

      const callbacks = createMockCallbacks();
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

      await createSimpleChatStream(messages, callbacks, {
        abortSignal: abortController.signal,
      });

      // Should have received first chunk but not necessarily error
      expect(callbacks.onContent).toHaveBeenCalledWith('First');
      expect(callbacks.onError).not.toHaveBeenCalled();
    });
  });

  describe('Resource cleanup', () => {
    it('should cleanup on successful completion', async () => {
      const sseChunks = [
        'data: {"id":"1","choices":[{"index":0,"delta":{"content":"完成"}}]}\n\n',
        'data: [DONE]\n\n',
      ];

      global.fetch = jest.fn().mockResolvedValue(createMockResponse(sseChunks));

      const callbacks = createMockCallbacks();
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

      await createSimpleChatStream(messages, callbacks);

      // No errors should occur during cleanup
      expect(callbacks.onError).not.toHaveBeenCalled();
      expect(callbacks.onDone).toHaveBeenCalled();
    });

    it('should cleanup on error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Test error'));

      const callbacks = createMockCallbacks();
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

      await createSimpleChatStream(messages, callbacks);

      // Error callback should be called, but cleanup shouldn't throw
      expect(callbacks.onError).toHaveBeenCalled();
    });

    it('should remove abort listener after completion', async () => {
      const abortController = new AbortController();
      const removeEventListenerSpy = jest.spyOn(abortController.signal, 'removeEventListener');

      const sseChunks = [
        'data: {"id":"1","choices":[{"index":0,"delta":{"content":"完成"}}]}\n\n',
        'data: [DONE]\n\n',
      ];

      global.fetch = jest.fn().mockResolvedValue(createMockResponse(sseChunks));

      const callbacks = createMockCallbacks();
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

      await createSimpleChatStream(messages, callbacks, {
        abortSignal: abortController.signal,
      });

      expect(removeEventListenerSpy).toHaveBeenCalled();
    });
  });

  describe('Options handling', () => {
    it('should use custom model option', async () => {
      const sseChunks = [
        'data: {"id":"1","choices":[{"index":0,"delta":{"content":"Test"}}]}\n\n',
        'data: [DONE]\n\n',
      ];

      global.fetch = jest.fn().mockResolvedValue(createMockResponse(sseChunks));

      const callbacks = createMockCallbacks();
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

      await createSimpleChatStream(messages, callbacks, {
        model: 'sonar-pro',
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.model).toBe('sonar-pro');
    });

    it('should use custom maxTokens option', async () => {
      const sseChunks = [
        'data: {"id":"1","choices":[{"index":0,"delta":{"content":"Test"}}]}\n\n',
        'data: [DONE]\n\n',
      ];

      global.fetch = jest.fn().mockResolvedValue(createMockResponse(sseChunks));

      const callbacks = createMockCallbacks();
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

      await createSimpleChatStream(messages, callbacks, {
        maxTokens: 8192,
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.max_tokens).toBe(8192);
    });

    it('should use custom temperature option', async () => {
      const sseChunks = [
        'data: {"id":"1","choices":[{"index":0,"delta":{"content":"Test"}}]}\n\n',
        'data: [DONE]\n\n',
      ];

      global.fetch = jest.fn().mockResolvedValue(createMockResponse(sseChunks));

      const callbacks = createMockCallbacks();
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

      await createSimpleChatStream(messages, callbacks, {
        temperature: 0.5,
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.temperature).toBe(0.5);
    });
  });

  describe('SSE parsing edge cases', () => {
    it('should handle empty lines between data lines', async () => {
      const sseChunks = [
        'data: {"id":"1","choices":[{"index":0,"delta":{"content":"A"}}]}\n\n\n\n',
        'data: {"id":"2","choices":[{"index":0,"delta":{"content":"B"}}]}\n\n',
        'data: [DONE]\n\n',
      ];

      global.fetch = jest.fn().mockResolvedValue(createMockResponse(sseChunks));

      const callbacks = createMockCallbacks();
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

      await createSimpleChatStream(messages, callbacks);

      expect(callbacks.onContent).toHaveBeenCalledWith('A');
      expect(callbacks.onContent).toHaveBeenCalledWith('B');
      expect(callbacks.onDone).toHaveBeenCalled();
    });

    it('should skip non-data lines', async () => {
      const sseChunks = [
        'event: message\n',
        'id: 123\n',
        'data: {"id":"1","choices":[{"index":0,"delta":{"content":"Hello"}}]}\n\n',
        'data: [DONE]\n\n',
      ];

      global.fetch = jest.fn().mockResolvedValue(createMockResponse(sseChunks));

      const callbacks = createMockCallbacks();
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

      await createSimpleChatStream(messages, callbacks);

      expect(callbacks.onContent).toHaveBeenCalledWith('Hello');
      expect(callbacks.onDone).toHaveBeenCalled();
    });

    it('should handle malformed JSON gracefully', async () => {
      const sseChunks = [
        'data: {"id":"1","choices":[{"index":0,"delta":{"content":"Valid"}}]}\n\n',
        'data: {malformed json\n\n',
        'data: {"id":"2","choices":[{"index":0,"delta":{"content":"Also Valid"}}]}\n\n',
        'data: [DONE]\n\n',
      ];

      global.fetch = jest.fn().mockResolvedValue(createMockResponse(sseChunks));

      const callbacks = createMockCallbacks();
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

      await createSimpleChatStream(messages, callbacks);

      // Should continue processing valid chunks
      expect(callbacks.onContent).toHaveBeenCalledWith('Valid');
      expect(callbacks.onContent).toHaveBeenCalledWith('Also Valid');
      expect(callbacks.onDone).toHaveBeenCalled();
      expect(callbacks.onError).not.toHaveBeenCalled();
    });

    it('should handle chunked SSE data split across reads', async () => {
      // Simulate data split across multiple reads
      const sseChunks = [
        'data: {"id":"1","choices":[{"inde',
        'x":0,"delta":{"content":"Split"}}]}\n\ndata: [DONE]\n\n',
      ];

      global.fetch = jest.fn().mockResolvedValue(createMockResponse(sseChunks));

      const callbacks = createMockCallbacks();
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

      await createSimpleChatStream(messages, callbacks);

      expect(callbacks.onContent).toHaveBeenCalledWith('Split');
      expect(callbacks.onDone).toHaveBeenCalled();
    });
  });
});

describe('SimpleChatStreamError', () => {
  it('should create error with status code', () => {
    const error = new SimpleChatStreamError('Test error', 500);

    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(500);
    expect(error.name).toBe('SimpleChatStreamError');
  });

  it('should create error with response body', () => {
    const responseBody = { error: { code: 'rate_limit_exceeded' } };
    const error = new SimpleChatStreamError('Rate limited', 429, responseBody);

    expect(error.statusCode).toBe(429);
    expect(error.responseBody).toEqual(responseBody);
  });

  it('should be instanceof Error', () => {
    const error = new SimpleChatStreamError('Test', 400);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(SimpleChatStreamError);
  });
});
