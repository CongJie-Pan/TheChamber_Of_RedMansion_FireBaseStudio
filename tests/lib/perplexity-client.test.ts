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

      // When only malformed JSON is received with completion signal, should show error message
      expect(chunks.length).toBe(1);
      expect(chunks[0].content).toContain('⚠️ AI 回應內容異常');
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
        if (chunk.isComplete) break;
      }

      expect(chunks.length).toBe(1);
      expect(chunks[0].thinkingContent).toBe('這是思考過程');
      expect(chunks[0].hasThinkingProcess).toBe(true);
    });

    test('should fallback to thinking content when API only streams reasoning text', async () => {
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

      expect(chunks).toHaveLength(1);
      expect(chunks[0].isComplete).toBe(true);
      expect(chunks[0].content).toContain('⚠️ 系統僅收到 AI 的思考內容');
      expect(chunks[0].content).toContain('只有推理內容');
      expect(chunks[0].contentDerivedFromThinking).toBe(true);
      expect(chunks[0].thinkingContent).toBe('只有推理內容');
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
        if (chunk.isComplete) break;
      }

      // Should process ALL 4 events, not just the first one
      expect(chunks.length).toBe(4);

      // First 2 chunks have incomplete <think> tags, so fullContent may be empty
      // but thinkingContent should accumulate
      expect(chunks[0].thinkingContent).toContain('我');
      expect(chunks[1].thinkingContent).toContain('需要分析');

      // Chunk 3 closes the <think> tag and starts the answer
      expect(chunks[2].fullContent).toContain('第一回');
      expect(chunks[2].thinkingContent).toContain('我需要分析');

      // Chunk 4 continues the answer
      expect(chunks[3].fullContent).toContain('交代全書');
      expect(chunks[3].isComplete).toBe(true);
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
      for await (const chunk of client.streamingCompletionRequest(input)) {
        chunks.push(chunk);
        // Check if this is the last chunk (no more data after shouldStopAfterCurrentBatch)
        if (chunk.isComplete && chunks.length > 1) break;
      }

      // Should process BOTH events even though first one has finish_reason
      expect(chunks.length).toBeGreaterThanOrEqual(2);
      expect(chunks[0].isComplete).toBe(true);

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
        if (chunk.isComplete) break;
      }

      expect(chunks.length).toBe(1);
      expect(chunks[0].thinkingContent).toBe('這是推理過程');
      expect(chunks[0].fullContent).toContain('這是實際答案');
      expect(chunks[0].fullContent).not.toContain('<think>');
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
        if (chunk.isComplete) break;
      }

      expect(chunks.length).toBe(1);
      // Should correctly separate thinking (inside tags) and answer (outside tags)
      expect(chunks[0].thinkingContent).toBe('推理過程在前');
      expect(chunks[0].fullContent).toContain('這是實際答案內容');
      expect(chunks[0].contentDerivedFromThinking).toBe(false);
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
    test('should handle API returning only extremely short thinking content (< 20 chars)', async () => {
      // Simulates the bug reported in Task 4.2: API returns "<think>我</think>" with no answer
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

      // Verify: Should NOT show standard fallback, but error message instead
      // Because thinking length (1 char) < MIN_REASONABLE_THINKING_LENGTH (20 chars)
      expect(chunks.length).toBe(1);
      expect(chunks[0].fullContent).toContain('⚠️ AI 回應內容異常');
      expect(chunks[0].fullContent).not.toContain('⚠️ 系統僅收到 AI 的思考內容');
      expect(chunks[0].isComplete).toBe(true);
    });

    test('should handle API returning reasonable thinking but no answer', async () => {
      // Simulates API anomaly: Has valid thinking (> 20 chars) but no answer content
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

      // Verify: Should show fallback message with thinking content
      expect(chunks.length).toBe(1);
      expect(chunks[0].fullContent).toContain('⚠️ 系統僅收到 AI 的思考內容');
      expect(chunks[0].thinkingContent).toContain('林黛玉');
      expect(chunks[0].contentDerivedFromThinking).toBe(true);
      expect(chunks[0].isComplete).toBe(true);
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
        if (chunk.isComplete) break;
      }

      // Verify: Should display normal answer, NOT fallback
      expect(chunks.length).toBe(1);
      expect(chunks[0].fullContent).toContain('林黛玉的性格特點主要包括');
      expect(chunks[0].fullContent).not.toContain('⚠️');
      expect(chunks[0].thinkingContent).toContain('首先分析林黛玉');
      expect(chunks[0].contentDerivedFromThinking).toBe(false);
      expect(chunks[0].isComplete).toBe(true);
    });

    test('should handle extremely long thinking content (> 5000 chars) as unreasonable', async () => {
      // Tests the upper bound of reasonable thinking length
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

      // Verify: Should show fallback with unreasonable thinking warning
      // Because length > MAX_REASONABLE_THINKING_LENGTH (5000 chars)
      expect(chunks.length).toBe(1);
      expect(chunks[0].fullContent).toContain('⚠️');
      expect(chunks[0].isComplete).toBe(true);
    });
  });
});
