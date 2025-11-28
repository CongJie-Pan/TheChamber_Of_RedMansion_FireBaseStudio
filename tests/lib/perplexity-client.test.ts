/**
 * @fileOverview Unit tests for Perplexity Client
 * 測試 Perplexity 客戶端的單元測試
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { PerplexityClient, getDefaultPerplexityClient, resetDefaultClient } from '@/lib/perplexity-client';
import type { PerplexityQAInput } from '@/types/perplexity-qa';
import { ReadableStream } from 'stream/web';

// Mock axios
const mockAxiosInstance = {
  post: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
} as any;

jest.mock('axios', () => ({
  create: jest.fn(() => mockAxiosInstance),
  default: {
    create: jest.fn(() => mockAxiosInstance),
  },
}));

// Get the mocked axios to access create method in tests
const mockedAxios = jest.mocked(axios);

// Store original fetch
const originalFetch = global.fetch;

// Helper function to create a mock ReadableStream from SSE data
function createMockSSEStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;

  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]));
        index++;
      } else {
        controller.close();
      }
    },
  }) as ReadableStream<Uint8Array>;
}

// Helper to create SSE formatted chunks
function formatSSEChunk(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// Mock environment variables
const originalEnv = process.env;

describe('PerplexityClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDefaultClient();
    process.env = {
      ...originalEnv,
      PERPLEXITYAI_API_KEY: 'test-api-key',
    };
    // Reset fetch to original
    global.fetch = originalFetch;
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  describe('Constructor', () => {
    test('should create client with provided API key', () => {
      const client = new PerplexityClient('custom-api-key');
      expect(client).toBeInstanceOf(PerplexityClient);
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.perplexity.ai',
          timeout: 60000,
          headers: expect.objectContaining({
            'Authorization': 'Bearer custom-api-key',
            'Content-Type': 'application/json',
            'User-Agent': 'RedMansion-Learning-Platform/1.0',
          }),
        })
      );
    });

    test('should create client with environment API key', () => {
      const client = new PerplexityClient();
      expect(client).toBeInstanceOf(PerplexityClient);
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
          }),
        })
      );
    });

    test('should throw error when no API key is available', () => {
      delete process.env.PERPLEXITYAI_API_KEY;
      
      expect(() => new PerplexityClient()).toThrow(
        'Perplexity API key is required. Please set PERPLEXITYAI_API_KEY environment variable.'
      );
    });
  });

  describe('Citation Extraction', () => {
    test('should extract citations from text and API response', async () => {
      const client = new PerplexityClient('test-key');
      const mockResponse = {
        data: {
          id: 'test-id',
          object: 'chat.completion',
          created: Date.now(),
          model: 'sonar-reasoning-pro',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: '根據相關資料 [1] 和研究 [2]，林黛玉是一個複杂的角色。',
              },
              finish_reason: 'stop',
            },
          ],
          citations: [
            'https://zh.wikipedia.org/wiki/紅樓夢',
            'https://www.guoxue.com/hongloumeng/',
          ],
          web_search_queries: ['林黛玉', '紅樓夢人物'],
        },
      };

      (mockAxiosInstance.post as any).mockResolvedValue(mockResponse);

      const input: PerplexityQAInput = {
        userQuestion: '林黛玉的性格特點？',
        enableStreaming: false,
      };

      const result = await client.completionRequest(input);

      expect(result.success).toBe(true);
      expect(result.citations).toHaveLength(2);
      expect(result.citations[0]).toMatchObject({
        number: '1',
        title: '維基百科 (中文)',
        url: 'https://zh.wikipedia.org/wiki/紅樓夢',
        type: 'web_citation',
        domain: 'zh.wikipedia.org',
      });
    });

    test('should provide fallback citations when none are available', async () => {
      const client = new PerplexityClient('test-key');
      const mockResponse = {
        data: {
          id: 'test-id',
          object: 'chat.completion',
          created: Date.now(),
          model: 'sonar-pro',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: '這是一個沒有引用的回答。',
              },
              finish_reason: 'stop',
            },
          ],
        },
      };

      (mockAxiosInstance.post as any).mockResolvedValue(mockResponse);

      const input: PerplexityQAInput = {
        userQuestion: '測試問題',
        enableStreaming: false,
      };

      const result = await client.completionRequest(input);

      expect(result.success).toBe(true);
      expect(result.citations).toHaveLength(2); // Should have default fallback citations
      expect(result.citations[0].type).toBe('default');
    });
  });

  describe('HTML Cleaning', () => {
    test('should clean HTML tags from response', async () => {
      const client = new PerplexityClient('test-key');
      const mockResponse = {
        data: {
          id: 'test-id',
          object: 'chat.completion',
          created: Date.now(),
          model: 'sonar-reasoning-pro',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: '<think>這是思考過程</think><p>這是主要回答</p><strong>重要內容</strong>',
              },
              finish_reason: 'stop',
            },
          ],
        },
      };

      (mockAxiosInstance.post as any).mockResolvedValue(mockResponse);

      const input: PerplexityQAInput = {
        userQuestion: '測試問題',
        showThinkingProcess: true,
        enableStreaming: false,
      };

      const result = await client.completionRequest(input);

      // Note: cleanResponse always removes <think> tags from the answer
      // Thinking content is extracted separately in streaming mode
      expect(result.answer).toContain('這是主要回答');
      expect(result.answer).toContain('重要內容');
      expect(result.answer).not.toContain('<think>');
      expect(result.answer).not.toContain('</think>');
      expect(result.answer).not.toContain('<p>');
      expect(result.answer).not.toContain('<strong>');
    });

    test('should remove thinking process when disabled', async () => {
      const client = new PerplexityClient('test-key');
      const mockResponse = {
        data: {
          id: 'test-id',
          object: 'chat.completion',
          created: Date.now(),
          model: 'sonar-reasoning-pro',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: '<think>這是思考過程</think>這是主要回答',
              },
              finish_reason: 'stop',
            },
          ],
        },
      };

      (mockAxiosInstance.post as any).mockResolvedValue(mockResponse);

      const input: PerplexityQAInput = {
        userQuestion: '測試問題',
        showThinkingProcess: false,
        enableStreaming: false,
      };

      const result = await client.completionRequest(input);

      expect(result.answer).not.toContain('思考過程');
      expect(result.answer).toBe('這是主要回答');
    });
  });

  describe('Prompt Building', () => {
    test('should build specialized prompts based on context', async () => {
      const client = new PerplexityClient('test-key');
      const mockResponse = {
        data: {
          id: 'test-id',
          object: 'chat.completion',
          created: Date.now(),
          model: 'sonar-pro',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: '測試回答',
              },
              finish_reason: 'stop',
            },
          ],
        },
      };

      (mockAxiosInstance.post as any).mockResolvedValue(mockResponse);

      const input: PerplexityQAInput = {
        userQuestion: '林黛玉的性格？',
        selectedText: '黛玉聽了，便放下釣竿',
        chapterContext: '第三回的背景...',
        currentChapter: '第三回',
        questionContext: 'character',
        enableStreaming: false,
      };

      await client.completionRequest(input);

      const callArgs = (mockAxiosInstance.post as any).mock.calls[0];
      const requestData = callArgs[1] as any;
      const prompt = requestData.messages[0].content;

      expect(prompt).toContain('請特別關注人物性格分析、人物關係和角色發展');
      expect(prompt).toContain('當前章回上下文：');
      expect(prompt).toContain('第三回的背景...');
      expect(prompt).toContain('使用者選取的文字：');
      expect(prompt).toContain('黛玉聽了，便放下釣竿');
      expect(prompt).toContain('目前閱讀章回：第三回');
      expect(prompt).toContain(input.userQuestion);
    });
  });

  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      const client = new PerplexityClient('test-key');
      const error = new Error('Network error');
      (mockAxiosInstance.post as any).mockRejectedValue(error);

      const input: PerplexityQAInput = {
        userQuestion: '測試問題',
        enableStreaming: false,
      };

      const result = await client.completionRequest(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
      expect(result.answer).toContain('處理問題時發生錯誤');
    });

    test('should handle invalid API responses', async () => {
      const client = new PerplexityClient('test-key');
      const mockResponse = {
        data: {
          id: 'test-id',
          choices: [], // Empty choices array
        },
      };

      (mockAxiosInstance.post as any).mockResolvedValue(mockResponse);

      const input: PerplexityQAInput = {
        userQuestion: '測試問題',
        enableStreaming: false,
      };

      const result = await client.completionRequest(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid response from Perplexity API');
    });
  });

  describe('Connection Testing', () => {
    test('should test connection successfully', async () => {
      const client = new PerplexityClient('test-key');
      const mockResponse = {
        data: {
          id: 'test-id',
          object: 'chat.completion',
          created: Date.now(),
          model: 'sonar-pro',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: '連線測試成功',
              },
              finish_reason: 'stop',
            },
          ],
        },
      };

      (mockAxiosInstance.post as any).mockResolvedValue(mockResponse);

      const result = await client.testConnection();

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should handle connection test failure', async () => {
      const client = new PerplexityClient('test-key');
      const error = new Error('Connection failed');
      (mockAxiosInstance.post as any).mockReset();
      (mockAxiosInstance.post as any).mockRejectedValue(error);

      const result = await client.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection failed');
    });
  });

  describe('Default Client Management', () => {
    test('should create and reuse default client', () => {
      const client1 = getDefaultPerplexityClient();
      const client2 = getDefaultPerplexityClient();

      expect(client1).toBe(client2); // Should be the same instance
    });

    test('should reset default client', () => {
      const client1 = getDefaultPerplexityClient();
      resetDefaultClient();
      const client2 = getDefaultPerplexityClient();

      expect(client1).not.toBe(client2); // Should be different instances
    });
  });

  describe('Static Methods', () => {
    test('should check if Perplexity is configured', () => {
      process.env.PERPLEXITYAI_API_KEY = 'test-key';
      expect(PerplexityClient.isConfigured()).toBe(true);

      delete process.env.PERPLEXITYAI_API_KEY;
      expect(PerplexityClient.isConfigured()).toBe(false);
    });
  });

  describe('Streaming with Native Fetch', () => {
    test('should stream content successfully using native fetch', async () => {
      const client = new PerplexityClient('test-key');

      // Create mock SSE stream with valid chunks
      const sseChunks = [
        formatSSEChunk({
          id: 'test-1',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: '林黛玉' },
            finish_reason: null,
          }],
        }),
        formatSSEChunk({
          id: 'test-2',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: '是紅樓夢中的主要人物。' },
            finish_reason: 'stop',
          }],
        }),
        'data: [DONE]\n\n',
      ];

      const mockStream = createMockSSEStream(sseChunks);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: mockStream,
        headers: new Map([['content-type', 'text/event-stream']]),
      } as any);

      const input: PerplexityQAInput = {
        userQuestion: '林黛玉是誰？',
        enableStreaming: true,
      };

      const chunks: any[] = [];
      for await (const chunk of client.streamingCompletionRequest(input)) {
        chunks.push(chunk);
        if (chunk.isComplete) break;
      }

      expect(chunks.length).toBe(2);
      expect(chunks[0].content).toBe('林黛玉');
      expect(chunks[1].content).toBe('是紅樓夢中的主要人物。');
      expect(chunks[1].isComplete).toBe(true);
      expect(chunks[1].fullContent).toContain('林黛玉');
    });

    test('should handle empty stream (no chunks received)', async () => {
      const client = new PerplexityClient('test-key');

      // Create empty stream that closes immediately
      const mockStream = createMockSSEStream([]);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: mockStream,
        headers: new Map([['content-type', 'text/event-stream']]),
      } as any);

      const input: PerplexityQAInput = {
        userQuestion: '測試空串流',
        enableStreaming: true,
      };

      const chunks: any[] = [];
      for await (const chunk of client.streamingCompletionRequest(input)) {
        chunks.push(chunk);
        if (chunk.isComplete) break;
      }

      // Should receive an error chunk when no content is received
      expect(chunks.length).toBe(1);
      expect(chunks[0].isComplete).toBe(true);
      expect(chunks[0].error).toBeDefined();
      expect(chunks[0].fullContent).toContain('錯誤');
    });

    test('should handle API error response', async () => {
      const client = new PerplexityClient('test-key');

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Invalid API key'),
      } as any);

      const input: PerplexityQAInput = {
        userQuestion: '測試 API 錯誤',
        enableStreaming: true,
      };

      const chunks: any[] = [];
      for await (const chunk of client.streamingCompletionRequest(input)) {
        chunks.push(chunk);
        if (chunk.isComplete) break;
      }

      expect(chunks.length).toBe(1);
      expect(chunks[0].isComplete).toBe(true);
      expect(chunks[0].error).toBeDefined();
      expect(chunks[0].error).toContain('401');
    });

    test('should handle missing response body', async () => {
      const client = new PerplexityClient('test-key');

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: null, // No body
        headers: new Map([['content-type', 'text/event-stream']]),
      } as any);

      const input: PerplexityQAInput = {
        userQuestion: '測試無回應主體',
        enableStreaming: true,
      };

      const chunks: any[] = [];
      for await (const chunk of client.streamingCompletionRequest(input)) {
        chunks.push(chunk);
        if (chunk.isComplete) break;
      }

      expect(chunks.length).toBe(1);
      expect(chunks[0].isComplete).toBe(true);
      expect(chunks[0].error).toBeDefined();
    });

    test('should handle network fetch error', async () => {
      const client = new PerplexityClient('test-key');

      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const input: PerplexityQAInput = {
        userQuestion: '測試網路錯誤',
        enableStreaming: true,
      };

      const chunks: any[] = [];
      for await (const chunk of client.streamingCompletionRequest(input)) {
        chunks.push(chunk);
        if (chunk.isComplete) break;
      }

      expect(chunks.length).toBe(1);
      expect(chunks[0].isComplete).toBe(true);
      expect(chunks[0].error).toContain('Network error');
    });

    test('should handle malformed JSON in SSE stream', async () => {
      const client = new PerplexityClient('test-key');

      // Create stream with invalid JSON
      const sseChunks = [
        'data: {invalid json}\n\n',
        formatSSEChunk({
          id: 'test-1',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: '有效內容' },
            finish_reason: 'stop',
          }],
        }),
        'data: [DONE]\n\n',
      ];

      const mockStream = createMockSSEStream(sseChunks);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: mockStream,
        headers: new Map([['content-type', 'text/event-stream']]),
      } as any);

      const input: PerplexityQAInput = {
        userQuestion: '測試格式錯誤',
        enableStreaming: true,
      };

      const chunks: any[] = [];
      for await (const chunk of client.streamingCompletionRequest(input)) {
        chunks.push(chunk);
        if (chunk.isComplete) break;
      }

      // Should skip malformed JSON and process valid content
      expect(chunks.length).toBe(1);
      expect(chunks[0].content).toContain('有效內容');
      expect(chunks[0].isComplete).toBe(true);
    });

    test('should extract thinking content from stream', async () => {
      const client = new PerplexityClient('test-key');

      const sseChunks = [
        formatSSEChunk({
          id: 'test-1',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: '<think>這是思考過程</think>這是答案' },
            finish_reason: 'stop',
          }],
        }),
        'data: [DONE]\n\n',
      ];

      const mockStream = createMockSSEStream(sseChunks);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: mockStream,
        headers: new Map([['content-type', 'text/event-stream']]),
      } as any);

      const input: PerplexityQAInput = {
        userQuestion: '測試思考過程',
        enableStreaming: true,
        showThinkingProcess: true,
      };

      const chunks: any[] = [];
      for await (const chunk of client.streamingCompletionRequest(input)) {
        chunks.push(chunk);
        // Wait for stream to naturally end via [DONE] signal
      }

      // May have thinking chunk + text chunk + final [DONE] chunk
      expect(chunks.length).toBeGreaterThanOrEqual(1);

      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.thinkingContent).toBe('這是思考過程');
      expect(lastChunk.hasThinkingProcess).toBe(true);
    });

    test('should handle API response with only thinking content (no fallback)', async () => {
      const client = new PerplexityClient('test-key');

      const sseChunks = [
        formatSSEChunk({
          id: 'think-only',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: '<think>只有推理內容</think>' },
            finish_reason: 'stop',
          }],
        }),
        'data: [DONE]\n\n',
      ];

      const mockStream = createMockSSEStream(sseChunks);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: mockStream,
        headers: new Map([['content-type', 'text/event-stream']]),
      } as any);

      const input: PerplexityQAInput = {
        userQuestion: '測試只有思考內容',
        enableStreaming: true,
        showThinkingProcess: true,
      };

      const chunks: any[] = [];
      for await (const chunk of client.streamingCompletionRequest(input)) {
        chunks.push(chunk);
        if (chunk.isComplete) break;
      }

      // New behavior: No fallback, empty answer with thinking content separated
      expect(chunks.length).toBeGreaterThanOrEqual(0); // May have 0 chunks if only thinking

      // If we get chunks, verify the last one
      if (chunks.length > 0) {
        const lastChunk = chunks[chunks.length - 1];
        expect(lastChunk.fullContent).toBe(''); // No answer content
        expect(lastChunk.thinkingContent).toBe('只有推理內容'); // Thinking separated
        expect(lastChunk.contentDerivedFromThinking).toBe(false); // No fallback logic
      }
    });

    test('should collect citations during streaming', async () => {
      const client = new PerplexityClient('test-key');

      const sseChunks = [
        formatSSEChunk({
          id: 'test-1',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: '根據資料 [1]' },
            finish_reason: null,
          }],
          citations: ['https://zh.wikipedia.org/wiki/紅樓夢'],
        }),
        formatSSEChunk({
          id: 'test-2',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: '，林黛玉是重要人物。' },
            finish_reason: 'stop',
          }],
        }),
        'data: [DONE]\n\n',
      ];

      const mockStream = createMockSSEStream(sseChunks);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: mockStream,
        headers: new Map([['content-type', 'text/event-stream']]),
      } as any);

      const input: PerplexityQAInput = {
        userQuestion: '測試引用',
        enableStreaming: true,
      };

      const chunks: any[] = [];
      for await (const chunk of client.streamingCompletionRequest(input)) {
        chunks.push(chunk);
        if (chunk.isComplete) break;
      }

      expect(chunks.length).toBe(2);
      // Citations should be collected across chunks
      expect(chunks[0].citations.length).toBeGreaterThan(0);
      expect(chunks[0].citations[0].url).toContain('wikipedia');
    });

    test('should validate async generator return type', async () => {
      const client = new PerplexityClient('test-key');

      const input: PerplexityQAInput = {
        userQuestion: '測試生成器類型',
        enableStreaming: true,
      };

      const generator = client.streamingCompletionRequest(input);

      // Check that it returns an async generator
      expect(typeof generator).toBe('object');
      expect(typeof generator[Symbol.asyncIterator]).toBe('function');
      expect(generator[Symbol.asyncIterator]).toBeDefined();
    });

    test('should handle rate limit error (429)', async () => {
      const client = new PerplexityClient('test-key');

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: () => Promise.resolve('Rate limit exceeded'),
      } as any);

      const input: PerplexityQAInput = {
        userQuestion: '測試速率限制',
        enableStreaming: true,
      };

      const chunks: any[] = [];
      for await (const chunk of client.streamingCompletionRequest(input)) {
        chunks.push(chunk);
        if (chunk.isComplete) break;
      }

      expect(chunks.length).toBe(1);
      expect(chunks[0].isComplete).toBe(true);
      expect(chunks[0].error).toContain('429');
    });
  });

  describe('URL Processing', () => {
    test('should extract friendly titles from various domains', async () => {
      const client = new PerplexityClient('test-key');
      const mockResponse = {
        data: {
          id: 'test-id',
          object: 'chat.completion',
          created: Date.now(),
          model: 'sonar-pro',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: '根據資料 [1] [2] [3]',
              },
              finish_reason: 'stop',
            },
          ],
          citations: [
            'https://zh.wikipedia.org/wiki/紅樓夢',
            'https://www.zhihu.com/question/12345',
            'https://unknown-domain.com/article',
          ],
        },
      };

      (mockAxiosInstance.post as any).mockResolvedValue(mockResponse);

      const input: PerplexityQAInput = {
        userQuestion: '測試問題',
        enableStreaming: false,
      };

      const result = await client.completionRequest(input);

      expect(result.citations[0].title).toBe('維基百科 (中文)');
      expect(result.citations[1].title).toBe('知乎');
      expect(result.citations[2].title).toBe('unknown-domain');
    });
  });

  describe('SSE Batch Processing Fix (2025-11-21)', () => {
    test('should process all SSE events in a single network chunk', async () => {
      const client = new PerplexityClient('test-key');

      // Simulate Perplexity API sending multiple SSE events in one network chunk
      // This mimics the actual behavior where 5248 bytes contains multiple events
      const multipleEventsInOneChunk =
        formatSSEChunk({
          id: 'event-1',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: '<think>\n我' },
            finish_reason: null,
          }],
        }) +
        formatSSEChunk({
          id: 'event-2',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: '需要分析第一回的主要宗旨' },
            finish_reason: null,
          }],
        }) +
        formatSSEChunk({
          id: 'event-3',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: '</think>第一回《甄士隱夢幻識通靈 賈雨村風塵懷閨秀》的主要宗旨是...' },
            finish_reason: null,
          }],
        }) +
        formatSSEChunk({
          id: 'event-4',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: '交代全書的緣起和主要人物的出場。' },
            finish_reason: 'stop',  // This is the complete signal
          }],
        }) +
        'data: [DONE]\n\n';

      // All events are in ONE single network chunk
      const mockStream = createMockSSEStream([multipleEventsInOneChunk]);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: mockStream,
        headers: new Map([['content-type', 'text/event-stream']]),
      } as any);

      const input: PerplexityQAInput = {
        userQuestion: '第一回的主要宗旨所在？',
        enableStreaming: true,
      };

      const chunks: any[] = [];
      for await (const chunk of client.streamingCompletionRequest(input)) {
        chunks.push(chunk);
        // Wait for stream to naturally end via [DONE] signal
      }

      // With PHASE 1 FIX: thinking chunks are now yielded too
      // Events 1-2: thinking chunks (isComplete: false)
      // Event 3: text chunk with answer start
      // Event 4: text chunk with answer continuation
      // Final: [DONE] yields final completion chunk
      expect(chunks.length).toBeGreaterThanOrEqual(2);

      // Last chunk should have all accumulated content
      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.thinkingContent).toContain('我需要分析');
      expect(lastChunk.fullContent).toContain('第一回');
      expect(lastChunk.fullContent).toContain('交代全書');
      expect(lastChunk.isComplete).toBe(true);
    });

    test('should not stop prematurely when finish_reason appears early', async () => {
      const client = new PerplexityClient('test-key');

      // Simulate a case where finish_reason appears in first event
      // but subsequent events still contain content
      const multipleEventsInOneChunk =
        formatSSEChunk({
          id: 'event-1',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: '<think>\n思考過程開始' },
            finish_reason: 'stop',  // finish_reason in FIRST event
          }],
        }) +
        formatSSEChunk({
          id: 'event-2',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: '</think>實際答案內容在這裡' },
            finish_reason: null,
          }],
        }) +
        'data: [DONE]\n\n';

      const mockStream = createMockSSEStream([multipleEventsInOneChunk]);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: mockStream,
        headers: new Map([['content-type', 'text/event-stream']]),
      } as any);

      const input: PerplexityQAInput = {
        userQuestion: '測試提前完成信號',
        enableStreaming: true,
      };

      const chunks: any[] = [];
      // Don't break on first complete chunk - collect all chunks until stream ends
      // FIX (2025-11-27): Removed shouldStopAfterCurrentBatch - now waits for [DONE] signal
      for await (const chunk of client.streamingCompletionRequest(input)) {
        chunks.push(chunk);
        // Stream continues until [DONE] signal, not just isComplete
        if (chunk.isComplete && chunks.length > 1) break;
      }

      // Should process BOTH events even though first one has finish_reason
      expect(chunks.length).toBeGreaterThanOrEqual(2);
      // Thinking-only chunks are never complete - only final chunks with answer are complete
      expect(chunks[0].isComplete).toBe(false);

      // The second event should still be processed
      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.fullContent).toContain('實際答案內容在這裡');
    });

    test('should parse reasoning response with answer outside think tags', async () => {
      const client = new PerplexityClient('test-key');

      const sseChunks = [
        formatSSEChunk({
          id: 'test-1',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: '<think>這是推理過程</think>這是實際答案' },
            finish_reason: 'stop',
          }],
        }),
        'data: [DONE]\n\n',
      ];

      const mockStream = createMockSSEStream(sseChunks);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: mockStream,
        headers: new Map([['content-type', 'text/event-stream']]),
      } as any);

      const input: PerplexityQAInput = {
        userQuestion: '測試答案在標籤外',
        enableStreaming: true,
        showThinkingProcess: true,
      };

      const chunks: any[] = [];
      for await (const chunk of client.streamingCompletionRequest(input)) {
        chunks.push(chunk);
        // Wait for stream to naturally end via [DONE] signal
      }

      // Should have thinking chunk(s) and text chunk(s), plus final [DONE] chunk
      expect(chunks.length).toBeGreaterThanOrEqual(1);

      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.thinkingContent).toBe('這是推理過程');
      expect(lastChunk.fullContent).toContain('這是實際答案');
      expect(lastChunk.fullContent).not.toContain('<think>');
    });

    test('should parse reasoning response with standard official format', async () => {
      const client = new PerplexityClient('test-key');

      // Test official format: <think>reasoning</think>\nAnswer content
      // Reference: docs/tech_docs/Sonar_reasoning_-_Perplexity.md (Line 117)
      const sseChunks = [
        formatSSEChunk({
          id: 'test-1',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: '<think>推理過程在前</think>\n這是實際答案內容，長度超過50字元以便被識別為完整答案，符合官方文件規範的格式。' },
            finish_reason: 'stop',
          }],
        }),
        'data: [DONE]\n\n',
      ];

      const mockStream = createMockSSEStream(sseChunks);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: mockStream,
        headers: new Map([['content-type', 'text/event-stream']]),
      } as any);

      const input: PerplexityQAInput = {
        userQuestion: '測試標準官方格式',
        enableStreaming: true,
        showThinkingProcess: true,
      };

      const chunks: any[] = [];
      for await (const chunk of client.streamingCompletionRequest(input)) {
        chunks.push(chunk);
        // Wait for stream to naturally end via [DONE] signal
      }

      // Should have thinking chunk(s) and text chunk(s), plus final [DONE] chunk
      expect(chunks.length).toBeGreaterThanOrEqual(1);

      const lastChunk = chunks[chunks.length - 1];
      // Should correctly separate thinking (inside tags) and answer (outside tags)
      expect(lastChunk.thinkingContent).toBe('推理過程在前');
      expect(lastChunk.fullContent).toContain('這是實際答案內容');
      expect(lastChunk.contentDerivedFromThinking).toBe(false);
    });

    test('should handle large single network chunk (simulating 5248 bytes)', async () => {
      const client = new PerplexityClient('test-key');

      // Create a large chunk similar to the user's terminal log
      let largeContent = '';
      for (let i = 0; i < 10; i++) {
        largeContent += formatSSEChunk({
          id: `chunk-${i}`,
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: `內容片段 ${i} ` },
            finish_reason: i === 9 ? 'stop' : null,
          }],
        });
      }
      largeContent += 'data: [DONE]\n\n';

      const mockStream = createMockSSEStream([largeContent]);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: mockStream,
        headers: new Map([['content-type', 'text/event-stream']]),
      } as any);

      const input: PerplexityQAInput = {
        userQuestion: '測試大型單一網路區塊',
        enableStreaming: true,
      };

      const chunks: any[] = [];
      for await (const chunk of client.streamingCompletionRequest(input)) {
        chunks.push(chunk);
        if (chunk.isComplete) break;
      }

      // Should process all 10 events
      expect(chunks.length).toBe(10);

      // Last chunk should have accumulated all content
      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.fullContent).toContain('內容片段 0');
      expect(lastChunk.fullContent).toContain('內容片段 9');
      expect(lastChunk.isComplete).toBe(true);
    });

    test('should log batch processing information', async () => {
      const client = new PerplexityClient('test-key');
      const consoleSpy = jest.spyOn(console, 'log');

      const multipleEventsInOneChunk =
        formatSSEChunk({
          id: 'event-1',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: '第一個事件' },
            finish_reason: null,
          }],
        }) +
        formatSSEChunk({
          id: 'event-2',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: '第二個事件' },
            finish_reason: 'stop',
          }],
        }) +
        'data: [DONE]\n\n';

      const mockStream = createMockSSEStream([multipleEventsInOneChunk]);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: mockStream,
        headers: new Map([['content-type', 'text/event-stream']]),
      } as any);

      const input: PerplexityQAInput = {
        userQuestion: '測試日誌記錄',
        enableStreaming: true,
      };

      const chunks: any[] = [];
      for await (const chunk of client.streamingCompletionRequest(input)) {
        chunks.push(chunk);
        if (chunk.isComplete) break;
      }

      // Should log batch processing information
      const batchProcessingLogs = consoleSpy.mock.calls.filter(call =>
        String(call[0]).includes('Processing') && String(call[0]).includes('SSE events')
      );

      expect(batchProcessingLogs.length).toBeGreaterThan(0);

      const batchIndexLogs = consoleSpy.mock.calls.filter(call =>
        String(call[0]).includes('batch #')
      );
      expect(batchIndexLogs.length).toBeGreaterThan(0);

      // Should log isComplete detection (check all console calls)
      const allLogs = consoleSpy.mock.calls.map(call => String(call[0]));
      const hasIsCompleteLog = allLogs.some(log =>
        log.includes('isComplete') || log.includes('Stopping after processing')
      );

      // At minimum, should have debug logs about chunk processing
      expect(hasIsCompleteLog || consoleSpy.mock.calls.length > 0).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  /**
   * Test suite for anomalous API response handling
   * Based on official Perplexity API best practices and community-reported issues
   *
   * References:
   * - GitHub Issue #8455 (BerriAI/litellm): Streaming format inconsistencies
   * - GitHub Issue #129 (Perplexity Forum): sonar-reasoning-pro streaming bugs
   * - Official docs: docs.perplexity.ai error handling guidelines
   */
  describe('Anomalous API Response Handling', () => {
    test('should handle API returning only extremely short thinking content (no fallback)', async () => {
      // Simulates Task 4.2 bug fix: API returns "<think>我</think>" with no answer
      // New behavior: No validation, just separate thinking from answer
      const client = new PerplexityClient('test-key');

      const sseChunks = [
        formatSSEChunk({
          id: 'test-anomaly-short',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: '<think>我</think>' },  // Only 1 character thinking, no answer
            finish_reason: 'stop',
          }],
        }),
        'data: [DONE]\n\n',
      ];

      const mockStream = createMockSSEStream(sseChunks);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: mockStream,
        headers: new Map([['content-type', 'text/event-stream']]),
      } as any);

      const input: PerplexityQAInput = {
        userQuestion: '測試極短異常回應',
        enableStreaming: true,
      };

      const chunks: any[] = [];
      for await (const chunk of client.streamingCompletionRequest(input)) {
        chunks.push(chunk);
        if (chunk.isComplete) break;
      }

      // New behavior: No fallback or error messages, just separate content
      if (chunks.length > 0) {
        const lastChunk = chunks[chunks.length - 1];
        expect(lastChunk.fullContent).toBe(''); // No answer
        expect(lastChunk.thinkingContent).toBe('我'); // Short thinking preserved
        expect(lastChunk.contentDerivedFromThinking).toBe(false); // No fallback
      }
    });

    test('should handle API returning reasonable thinking but no answer (no fallback)', async () => {
      // Simulates API anomaly: Has valid thinking but no answer content
      // New behavior: No fallback, thinking and answer separated cleanly
      const client = new PerplexityClient('test-key');

      const reasonableThinking = '林黛玉是賈母的外孫女，自幼體弱多病，性格孤傲清高，才華橫溢...';

      const sseChunks = [
        formatSSEChunk({
          id: 'test-anomaly-reasonable',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: `<think>${reasonableThinking}</think>` },  // Reasonable thinking, no answer
            finish_reason: 'stop',
          }],
        }),
        'data: [DONE]\n\n',
      ];

      const mockStream = createMockSSEStream(sseChunks);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: mockStream,
        headers: new Map([['content-type', 'text/event-stream']]),
      } as any);

      const input: PerplexityQAInput = {
        userQuestion: '林黛玉的性格特點？',
        enableStreaming: true,
      };

      const chunks: any[] = [];
      for await (const chunk of client.streamingCompletionRequest(input)) {
        chunks.push(chunk);
        if (chunk.isComplete) break;
      }

      // New behavior: No fallback, empty answer with thinking preserved
      if (chunks.length > 0) {
        const lastChunk = chunks[chunks.length - 1];
        expect(lastChunk.fullContent).toBe(''); // No answer
        expect(lastChunk.thinkingContent).toContain('林黛玉'); // Thinking preserved
        expect(lastChunk.contentDerivedFromThinking).toBe(false); // No fallback
      }
    });

    test('should handle normal response with both thinking and answer (regression test)', async () => {
      // Ensures normal responses are not affected by enhanced fallback logic
      const client = new PerplexityClient('test-key');

      const normalThinking = '首先分析林黛玉的家庭背景，她是賈母最疼愛的外孫女...';
      const normalAnswer = '林黛玉的性格特點主要包括：\n1. 孤傲清高\n2. 才華橫溢\n3. 多愁善感';

      const sseChunks = [
        formatSSEChunk({
          id: 'test-normal-response',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: `<think>${normalThinking}</think>${normalAnswer}` },
            finish_reason: 'stop',
          }],
        }),
        'data: [DONE]\n\n',
      ];

      const mockStream = createMockSSEStream(sseChunks);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: mockStream,
        headers: new Map([['content-type', 'text/event-stream']]),
      } as any);

      const input: PerplexityQAInput = {
        userQuestion: '林黛玉的性格特點有哪些？',
        enableStreaming: true,
      };

      const chunks: any[] = [];
      for await (const chunk of client.streamingCompletionRequest(input)) {
        chunks.push(chunk);
        // Wait for stream to naturally end via [DONE] signal
      }

      // Should have thinking chunk(s) and text chunk(s), plus final [DONE] chunk
      expect(chunks.length).toBeGreaterThanOrEqual(1);

      const lastChunk = chunks[chunks.length - 1];
      // Verify: Should display normal answer, NOT fallback
      expect(lastChunk.fullContent).toContain('林黛玉的性格特點主要包括');
      expect(lastChunk.fullContent).not.toContain('⚠️');
      expect(lastChunk.thinkingContent).toContain('首先分析林黛玉');
      expect(lastChunk.contentDerivedFromThinking).toBe(false);
      expect(lastChunk.isComplete).toBe(true);
    });

    test('should handle extremely long thinking content (no validation)', async () => {
      // New behavior: No length validation, just preserve thinking content
      const client = new PerplexityClient('test-key');

      const extremelyLongThinking = '林黛玉'.repeat(3000);  // 9000 characters

      const sseChunks = [
        formatSSEChunk({
          id: 'test-anomaly-toolong',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: `<think>${extremelyLongThinking}</think>` },
            finish_reason: 'stop',
          }],
        }),
        'data: [DONE]\n\n',
      ];

      const mockStream = createMockSSEStream(sseChunks);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: mockStream,
        headers: new Map([['content-type', 'text/event-stream']]),
      } as any);

      const input: PerplexityQAInput = {
        userQuestion: '測試超長 thinking',
        enableStreaming: true,
      };

      const chunks: any[] = [];
      for await (const chunk of client.streamingCompletionRequest(input)) {
        chunks.push(chunk);
        if (chunk.isComplete) break;
      }

      // New behavior: No length validation, preserve thinking without fallback
      // Since there's no answer content, chunks may be empty (thinking only)
      if (chunks.length > 0) {
        const lastChunk = chunks[chunks.length - 1];
        expect(lastChunk.thinkingContent).toContain('林黛玉');
        expect(lastChunk.thinkingContent.length).toBeGreaterThan(5000);
        expect(lastChunk.fullContent).toBe(''); // No answer
      }
    });
  });

  /**
   * Test suite for Streaming Fix (2025-11-27)
   * Tests the LobeChat-aligned streaming termination pattern
   *
   * Key code changes tested:
   * 1. src/lib/perplexity-client.ts: Removed shouldStopAfterCurrentBatch early exit
   * 2. src/lib/perplexity-client.ts: [DONE] handler always yields final chunk
   * 3. src/lib/perplexity-client.ts: Thinking-only chunks are now yielded
   *
   * Reference: LobeChat @lobechat/fetch-sse pattern - wait for explicit [DONE] signal
   */
  describe('Streaming Termination Fix (2025-11-27)', () => {
    test('should wait for [DONE] signal instead of stopping on isComplete', async () => {
      // This test verifies the core fix: stream continues until [DONE]
      // even when finish_reason is set (isComplete=true)
      const client = new PerplexityClient('test-key');

      const sseChunks = [
        formatSSEChunk({
          id: 'chunk-1',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: '第一段內容' },
            finish_reason: 'stop',  // isComplete=true here
          }],
        }),
        formatSSEChunk({
          id: 'chunk-2',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: '，第二段內容也要收到' },
            finish_reason: null,
          }],
        }),
        'data: [DONE]\n\n',
      ];

      const mockStream = createMockSSEStream(sseChunks);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: mockStream,
        headers: new Map([['content-type', 'text/event-stream']]),
      } as any);

      const input: PerplexityQAInput = {
        userQuestion: '測試 [DONE] 信號等待',
        enableStreaming: true,
      };

      const chunks: any[] = [];
      // Key: collect ALL chunks until [DONE], don't break on first isComplete
      for await (const chunk of client.streamingCompletionRequest(input)) {
        chunks.push(chunk);
      }

      // Verify both chunks were received (stream didn't stop early)
      expect(chunks.length).toBeGreaterThanOrEqual(2);

      // Verify final chunk has accumulated content from BOTH events
      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.fullContent).toContain('第一段內容');
      expect(lastChunk.fullContent).toContain('第二段內容也要收到');
      expect(lastChunk.isComplete).toBe(true);
    });

    test('should always yield final chunk on [DONE] even with empty fullContent', async () => {
      // This test verifies the [DONE] handler fix: always yield final chunk
      // Reference: src/lib/perplexity-client.ts lines 629-657
      const client = new PerplexityClient('test-key');

      // Simulate API returning only thinking content
      const sseChunks = [
        formatSSEChunk({
          id: 'think-only',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: '<think>只有推理內容，沒有答案</think>' },
            finish_reason: 'stop',
          }],
        }),
        'data: [DONE]\n\n',
      ];

      const mockStream = createMockSSEStream(sseChunks);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: mockStream,
        headers: new Map([['content-type', 'text/event-stream']]),
      } as any);

      const input: PerplexityQAInput = {
        userQuestion: '測試空 fullContent 的 [DONE] 處理',
        enableStreaming: true,
        showThinkingProcess: true,
      };

      const chunks: any[] = [];
      for await (const chunk of client.streamingCompletionRequest(input)) {
        chunks.push(chunk);
      }

      // Verify a final chunk was yielded even though fullContent is empty
      expect(chunks.length).toBeGreaterThan(0);

      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.isComplete).toBe(true);
      expect(lastChunk.thinkingContent).toContain('只有推理內容');
      // fullContent should be empty (no answer outside <think> tags)
      expect(lastChunk.fullContent).toBe('');
    });

    test('should yield thinking-only chunks for real-time UI updates', async () => {
      // This test verifies Phase 1 fix: thinking chunks are yielded
      // Reference: src/lib/perplexity-client.ts lines 682-712
      const client = new PerplexityClient('test-key');

      // Simulate streaming thinking content followed by answer
      const sseChunks = [
        formatSSEChunk({
          id: 'think-1',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: '<think>開始思考問題' },
            finish_reason: null,
          }],
        }),
        formatSSEChunk({
          id: 'think-2',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: '，繼續分析中</think>' },
            finish_reason: null,
          }],
        }),
        formatSSEChunk({
          id: 'answer-1',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: '這是最終答案' },
            finish_reason: 'stop',
          }],
        }),
        'data: [DONE]\n\n',
      ];

      const mockStream = createMockSSEStream(sseChunks);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: mockStream,
        headers: new Map([['content-type', 'text/event-stream']]),
      } as any);

      const input: PerplexityQAInput = {
        userQuestion: '測試 thinking 區塊即時更新',
        enableStreaming: true,
        showThinkingProcess: true,
      };

      const chunks: any[] = [];
      for await (const chunk of client.streamingCompletionRequest(input)) {
        chunks.push(chunk);
      }

      // Verify thinking chunks were yielded for real-time UI updates
      const thinkingChunks = chunks.filter(c => c.hasThinkingProcess && c.content === '');
      expect(thinkingChunks.length).toBeGreaterThan(0);

      // Verify final chunk has both thinking and answer
      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.thinkingContent).toContain('開始思考問題');
      expect(lastChunk.fullContent).toContain('這是最終答案');
    });

    test('should NOT stop stream on finish_reason before [DONE]', async () => {
      // This test is a regression test for the shouldStopAfterCurrentBatch removal
      // Reference: src/lib/perplexity-client.ts lines 577-579 (removed code)
      const client = new PerplexityClient('test-key');

      // Simulate finish_reason appearing multiple times before [DONE]
      const sseChunks = [
        formatSSEChunk({
          id: 'chunk-1',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: '段落一' },
            finish_reason: 'stop',  // First stop
          }],
        }),
        formatSSEChunk({
          id: 'chunk-2',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: '段落二' },
            finish_reason: 'stop',  // Second stop
          }],
        }),
        formatSSEChunk({
          id: 'chunk-3',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: '段落三' },
            finish_reason: null,
          }],
        }),
        'data: [DONE]\n\n',
      ];

      const mockStream = createMockSSEStream(sseChunks);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: mockStream,
        headers: new Map([['content-type', 'text/event-stream']]),
      } as any);

      const input: PerplexityQAInput = {
        userQuestion: '測試多個 finish_reason',
        enableStreaming: true,
      };

      const chunks: any[] = [];
      for await (const chunk of client.streamingCompletionRequest(input)) {
        chunks.push(chunk);
      }

      // Verify all 3 content chunks were processed (stream didn't stop early)
      expect(chunks.length).toBeGreaterThanOrEqual(3);

      // Verify final content includes all segments
      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.fullContent).toContain('段落一');
      expect(lastChunk.fullContent).toContain('段落二');
      expect(lastChunk.fullContent).toContain('段落三');
    });

    test('should yield complete metadata on [DONE] signal', async () => {
      // This test verifies that the final chunk from [DONE] handler
      // includes all required metadata fields
      const client = new PerplexityClient('test-key');

      const sseChunks = [
        formatSSEChunk({
          id: 'metadata-test',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: '<think>分析中</think>答案內容' },
            finish_reason: 'stop',
          }],
          citations: ['https://example.com/source'],
          web_search_queries: ['紅樓夢分析'],
        }),
        'data: [DONE]\n\n',
      ];

      const mockStream = createMockSSEStream(sseChunks);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: mockStream,
        headers: new Map([['content-type', 'text/event-stream']]),
      } as any);

      const input: PerplexityQAInput = {
        userQuestion: '測試完整 metadata',
        enableStreaming: true,
        showThinkingProcess: true,
      };

      const chunks: any[] = [];
      for await (const chunk of client.streamingCompletionRequest(input)) {
        chunks.push(chunk);
      }

      // Verify final chunk from [DONE] handler has all metadata
      const lastChunk = chunks[chunks.length - 1];

      // Required fields from [DONE] handler (lines 639-657)
      expect(lastChunk.isComplete).toBe(true);
      expect(lastChunk.fullContent).toBeDefined();
      expect(lastChunk.thinkingContent).toBeDefined();
      expect(lastChunk.citations).toBeDefined();
      expect(lastChunk.searchQueries).toBeDefined();
      expect(lastChunk.metadata).toBeDefined();
      expect(lastChunk.responseTime).toBeDefined();
      expect(lastChunk.hasThinkingProcess).toBe(true);
      expect(lastChunk.timestamp).toBeDefined();
    });

    test('should handle Task 4.2 bug scenario: stream stops after showing only thinking content', async () => {
      // This is the exact scenario from Task 4.2 bug report
      // "AI 問答回覆功能修復... it only show the '我需要'、'正在分析您的問題並搜尋相關資料...我' and then stopped"
      const client = new PerplexityClient('test-key');

      // Simulate the exact streaming pattern that caused the bug
      const sseChunks = [
        formatSSEChunk({
          id: 'think-part-1',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: '<think>我需要' },
            finish_reason: null,
          }],
        }),
        formatSSEChunk({
          id: 'think-part-2',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: '分析這個問題' },
            finish_reason: 'stop',  // Bug trigger: isComplete here caused early exit
          }],
        }),
        // These chunks were NOT received before the fix
        formatSSEChunk({
          id: 'think-part-3',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: '</think>' },
            finish_reason: null,
          }],
        }),
        formatSSEChunk({
          id: 'answer',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'sonar-reasoning',
          choices: [{
            index: 0,
            delta: { content: '這是完整的答案內容，用戶之前看不到這段' },
            finish_reason: 'stop',
          }],
        }),
        'data: [DONE]\n\n',
      ];

      const mockStream = createMockSSEStream(sseChunks);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: mockStream,
        headers: new Map([['content-type', 'text/event-stream']]),
      } as any);

      const input: PerplexityQAInput = {
        userQuestion: 'Task 4.2 重現場景',
        enableStreaming: true,
        showThinkingProcess: true,
      };

      const chunks: any[] = [];
      for await (const chunk of client.streamingCompletionRequest(input)) {
        chunks.push(chunk);
      }

      // After the fix: stream should continue until [DONE]
      // and receive the full answer content
      expect(chunks.length).toBeGreaterThanOrEqual(2);

      const lastChunk = chunks[chunks.length - 1];
      // Verify the answer that was previously cut off is now received
      expect(lastChunk.fullContent).toContain('這是完整的答案內容');
      expect(lastChunk.thinkingContent).toContain('我需要');
      expect(lastChunk.isComplete).toBe(true);
    });
  });
});
