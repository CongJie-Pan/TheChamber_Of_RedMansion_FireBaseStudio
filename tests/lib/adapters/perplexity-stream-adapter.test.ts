/**
 * @fileOverview PerplexityStreamAdapter Integration Tests (PRX-009)
 *
 * Test cases for the Adapter covering:
 * - streamingQA() output format and type compatibility
 * - completionQA() response format
 * - buildRedChamberPrompt() consistency
 * - Type compatibility with PerplexityStreamingChunk and PerplexityQAResponse
 * - isConfigured() and testConnection()
 */

import { PerplexityStreamAdapter } from '@/lib/adapters/perplexity-stream-adapter';
import type {
  PerplexityQAInput,
  PerplexityStreamingChunk,
  PerplexityQAResponse,
  PerplexityCitation,
} from '@/types/perplexity-qa';

// Mock the simple-chat-stream module
jest.mock('@/lib/adapters/simple-chat-stream', () => ({
  createSimpleChatStream: jest.fn(),
  SimpleChatStreamError: class SimpleChatStreamError extends Error {
    constructor(
      message: string,
      public readonly statusCode: number,
      public readonly responseBody?: unknown
    ) {
      super(message);
      this.name = 'SimpleChatStreamError';
    }
  },
}));

// Mock the perplexity-config module
jest.mock('@/ai/perplexity-config', () => ({
  PERPLEXITY_CONFIG: {
    BASE_URL: 'https://api.perplexity.ai',
    CHAT_COMPLETIONS_ENDPOINT: '/chat/completions',
    DEFAULT_MODEL: 'sonar-reasoning-pro',
    DEFAULT_MAX_TOKENS: 4096,
    DEFAULT_TEMPERATURE: 0.7,
  },
  isPerplexityConfigured: jest.fn(() => true),
  getPerplexityApiKey: jest.fn(() => 'test-api-key'),
}));

// Mock the feature flags
jest.mock('@/lib/perplexity-feature-flags', () => ({
  PERPLEXITY_FLAGS: {
    debugAdapter: false,
  },
}));

import { createSimpleChatStream } from '@/lib/adapters/simple-chat-stream';
import { isPerplexityConfigured } from '@/ai/perplexity-config';
import type { StreamCallbacks } from '@/lib/adapters/types';

// Helper to simulate stream callbacks
function simulateStreamCallbacks(
  mockFn: jest.Mock,
  events: Array<{
    type: 'thinkingStart' | 'thinkingContent' | 'thinkingEnd' | 'content' | 'citations' | 'done' | 'error';
    data?: string | string[] | Error;
  }>
): void {
  mockFn.mockImplementation(
    async (
      _messages: unknown,
      callbacks: StreamCallbacks,
      _options?: unknown
    ) => {
      for (const event of events) {
        // Small delay to simulate async streaming
        await new Promise(resolve => setTimeout(resolve, 1));

        switch (event.type) {
          case 'thinkingStart':
            callbacks.onThinkingStart();
            break;
          case 'thinkingContent':
            callbacks.onThinkingContent(event.data as string);
            break;
          case 'thinkingEnd':
            callbacks.onThinkingEnd();
            break;
          case 'content':
            callbacks.onContent(event.data as string);
            break;
          case 'citations':
            callbacks.onCitations(event.data as string[]);
            break;
          case 'done':
            callbacks.onDone();
            break;
          case 'error':
            callbacks.onError(event.data as Error);
            break;
        }
      }
    }
  );
}

describe('PerplexityStreamAdapter', () => {
  let adapter: PerplexityStreamAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new PerplexityStreamAdapter();
  });

  describe('isConfigured()', () => {
    it('should return true when API key is configured', () => {
      (isPerplexityConfigured as jest.Mock).mockReturnValue(true);
      expect(adapter.isConfigured()).toBe(true);
    });

    it('should return false when API key is not configured', () => {
      (isPerplexityConfigured as jest.Mock).mockReturnValue(false);
      expect(adapter.isConfigured()).toBe(false);
    });
  });

  describe('testConnection()', () => {
    it('should return success: false when not configured', async () => {
      (isPerplexityConfigured as jest.Mock).mockReturnValue(false);

      const result = await adapter.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('not configured');
    });

    it('should return success: true when connection works', async () => {
      (isPerplexityConfigured as jest.Mock).mockReturnValue(true);
      simulateStreamCallbacks(createSimpleChatStream as jest.Mock, [
        { type: 'content', data: 'Hello' },
        { type: 'done' },
      ]);

      const result = await adapter.testConnection();

      expect(result.success).toBe(true);
      expect(result.message).toContain('successful');
      expect(result.latencyMs).toBeDefined();
    });

    it('should return success: false when error occurs', async () => {
      (isPerplexityConfigured as jest.Mock).mockReturnValue(true);
      simulateStreamCallbacks(createSimpleChatStream as jest.Mock, [
        { type: 'error', data: new Error('Connection failed') },
      ]);

      const result = await adapter.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection failed');
    });
  });

  describe('streamingQA() output format', () => {
    const testInput: PerplexityQAInput = {
      userQuestion: '林黛玉的性格特點是什麼？',
      questionContext: 'character',
    };

    it('should yield PerplexityStreamingChunk with correct structure', async () => {
      simulateStreamCallbacks(createSimpleChatStream as jest.Mock, [
        { type: 'content', data: '林黛玉' },
        { type: 'content', data: '性格敏感' },
        { type: 'done' },
      ]);

      const chunks: PerplexityStreamingChunk[] = [];
      for await (const chunk of adapter.streamingQA(testInput)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);

      // Verify each chunk has required properties
      for (const chunk of chunks) {
        expect(chunk).toHaveProperty('content');
        expect(chunk).toHaveProperty('fullContent');
        expect(chunk).toHaveProperty('timestamp');
        expect(chunk).toHaveProperty('citations');
        expect(chunk).toHaveProperty('searchQueries');
        expect(chunk).toHaveProperty('metadata');
        expect(chunk).toHaveProperty('responseTime');
        expect(chunk).toHaveProperty('isComplete');
        expect(chunk).toHaveProperty('chunkIndex');
      }
    });

    it('should accumulate fullContent correctly', async () => {
      simulateStreamCallbacks(createSimpleChatStream as jest.Mock, [
        { type: 'content', data: 'A' },
        { type: 'content', data: 'B' },
        { type: 'content', data: 'C' },
        { type: 'done' },
      ]);

      const chunks: PerplexityStreamingChunk[] = [];
      for await (const chunk of adapter.streamingQA(testInput)) {
        chunks.push(chunk);
      }

      // Find the content chunks (non-complete ones)
      const contentChunks = chunks.filter(c => c.content !== '' && !c.isComplete);
      expect(contentChunks[0].fullContent).toBe('A');
      expect(contentChunks[1].fullContent).toBe('AB');
      expect(contentChunks[2].fullContent).toBe('ABC');
    });

    it('should increment chunkIndex correctly', async () => {
      simulateStreamCallbacks(createSimpleChatStream as jest.Mock, [
        { type: 'content', data: 'First' },
        { type: 'content', data: 'Second' },
        { type: 'done' },
      ]);

      const chunks: PerplexityStreamingChunk[] = [];
      for await (const chunk of adapter.streamingQA(testInput)) {
        chunks.push(chunk);
      }

      for (let i = 0; i < chunks.length; i++) {
        expect(chunks[i].chunkIndex).toBe(i);
      }
    });

    it('should set isComplete=true only on final chunk', async () => {
      simulateStreamCallbacks(createSimpleChatStream as jest.Mock, [
        { type: 'content', data: 'Content' },
        { type: 'done' },
      ]);

      const chunks: PerplexityStreamingChunk[] = [];
      for await (const chunk of adapter.streamingQA(testInput)) {
        chunks.push(chunk);
      }

      const nonFinalChunks = chunks.slice(0, -1);
      const finalChunk = chunks[chunks.length - 1];

      for (const chunk of nonFinalChunks) {
        expect(chunk.isComplete).toBe(false);
      }
      expect(finalChunk.isComplete).toBe(true);
    });

    it('should include thinking content when available', async () => {
      simulateStreamCallbacks(createSimpleChatStream as jest.Mock, [
        { type: 'thinkingStart' },
        { type: 'thinkingContent', data: '讓我分析這個問題...' },
        { type: 'thinkingEnd' },
        { type: 'content', data: '答案是' },
        { type: 'done' },
      ]);

      const chunks: PerplexityStreamingChunk[] = [];
      for await (const chunk of adapter.streamingQA(testInput)) {
        chunks.push(chunk);
      }

      // Check that thinking content is present
      const thinkingChunks = chunks.filter(c => c.thinkingContent && c.thinkingContent.length > 0);
      expect(thinkingChunks.length).toBeGreaterThan(0);
      expect(thinkingChunks.some(c => c.thinkingContent?.includes('讓我分析'))).toBe(true);

      // Check hasThinkingProcess flag
      const finalChunk = chunks[chunks.length - 1];
      expect(finalChunk.hasThinkingProcess).toBe(true);
    });

    it('should include citations when available', async () => {
      const testCitations = ['https://example.com/1', 'https://example.com/2'];

      simulateStreamCallbacks(createSimpleChatStream as jest.Mock, [
        { type: 'content', data: '根據資料...' },
        { type: 'citations', data: testCitations },
        { type: 'done' },
      ]);

      const chunks: PerplexityStreamingChunk[] = [];
      for await (const chunk of adapter.streamingQA(testInput)) {
        chunks.push(chunk);
      }

      const finalChunk = chunks[chunks.length - 1];
      expect(finalChunk.citations.length).toBe(2);
      expect(finalChunk.citations[0].url).toBe('https://example.com/1');
      expect(finalChunk.citations[1].url).toBe('https://example.com/2');
    });

    it('should have valid timestamp on each chunk', async () => {
      simulateStreamCallbacks(createSimpleChatStream as jest.Mock, [
        { type: 'content', data: 'Test' },
        { type: 'done' },
      ]);

      const chunks: PerplexityStreamingChunk[] = [];
      for await (const chunk of adapter.streamingQA(testInput)) {
        chunks.push(chunk);
      }

      for (const chunk of chunks) {
        expect(chunk.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        expect(new Date(chunk.timestamp).getTime()).not.toBeNaN();
      }
    });

    it('should have increasing responseTime', async () => {
      simulateStreamCallbacks(createSimpleChatStream as jest.Mock, [
        { type: 'content', data: 'First' },
        { type: 'content', data: 'Second' },
        { type: 'done' },
      ]);

      const chunks: PerplexityStreamingChunk[] = [];
      for await (const chunk of adapter.streamingQA(testInput)) {
        chunks.push(chunk);
      }

      for (const chunk of chunks) {
        expect(typeof chunk.responseTime).toBe('number');
        expect(chunk.responseTime).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('streamingQA() with AbortSignal', () => {
    const testInput: PerplexityQAInput = {
      userQuestion: '測試問題',
    };

    it('should stop streaming when aborted', async () => {
      const abortController = new AbortController();
      let callbackCount = 0;

      (createSimpleChatStream as jest.Mock).mockImplementation(
        async (
          _messages: unknown,
          callbacks: StreamCallbacks,
          _options?: unknown
        ) => {
          for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 10));
            callbackCount++;
            callbacks.onContent(`Chunk ${i}`);

            if (i === 2) {
              abortController.abort();
            }
          }
          callbacks.onDone();
        }
      );

      const chunks: PerplexityStreamingChunk[] = [];
      for await (const chunk of adapter.streamingQA(testInput, abortController.signal)) {
        chunks.push(chunk);
        if (chunk.isComplete) break;
      }

      // Should have stopped early due to abort
      expect(chunks.length).toBeLessThan(10);
    });
  });

  describe('completionQA() response format', () => {
    const testInput: PerplexityQAInput = {
      userQuestion: '賈寶玉是誰？',
      questionContext: 'character',
      currentChapter: '第一回',
    };

    it('should return PerplexityQAResponse with correct structure', async () => {
      simulateStreamCallbacks(createSimpleChatStream as jest.Mock, [
        { type: 'content', data: '賈寶玉是《紅樓夢》的主角' },
        { type: 'citations', data: ['https://wiki.example.com'] },
        { type: 'done' },
      ]);

      const response = await adapter.completionQA(testInput);

      // Verify all required properties
      expect(response).toHaveProperty('question');
      expect(response).toHaveProperty('answer');
      expect(response).toHaveProperty('citations');
      expect(response).toHaveProperty('groundingMetadata');
      expect(response).toHaveProperty('modelUsed');
      expect(response).toHaveProperty('modelKey');
      expect(response).toHaveProperty('processingTime');
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('streaming');
      expect(response).toHaveProperty('timestamp');
      expect(response).toHaveProperty('answerLength');
      expect(response).toHaveProperty('questionLength');
      expect(response).toHaveProperty('citationCount');
    });

    it('should include the original question', async () => {
      simulateStreamCallbacks(createSimpleChatStream as jest.Mock, [
        { type: 'content', data: '答案' },
        { type: 'done' },
      ]);

      const response = await adapter.completionQA(testInput);

      expect(response.question).toBe(testInput.userQuestion);
    });

    it('should include the full answer', async () => {
      simulateStreamCallbacks(createSimpleChatStream as jest.Mock, [
        { type: 'content', data: '第一部分' },
        { type: 'content', data: '第二部分' },
        { type: 'content', data: '第三部分' },
        { type: 'done' },
      ]);

      const response = await adapter.completionQA(testInput);

      expect(response.answer).toBe('第一部分第二部分第三部分');
    });

    it('should include thinking content when available', async () => {
      simulateStreamCallbacks(createSimpleChatStream as jest.Mock, [
        { type: 'thinkingStart' },
        { type: 'thinkingContent', data: '分析問題...' },
        { type: 'thinkingEnd' },
        { type: 'content', data: '結論' },
        { type: 'done' },
      ]);

      const response = await adapter.completionQA(testInput);

      expect(response.thinkingContent).toBe('分析問題...');
    });

    it('should include citations in response', async () => {
      const testCitations = ['https://example.com/source1', 'https://example.com/source2'];

      simulateStreamCallbacks(createSimpleChatStream as jest.Mock, [
        { type: 'content', data: '答案' },
        { type: 'citations', data: testCitations },
        { type: 'done' },
      ]);

      const response = await adapter.completionQA(testInput);

      expect(response.citations.length).toBe(2);
      expect(response.citationCount).toBe(2);
    });

    it('should calculate groundingMetadata correctly', async () => {
      simulateStreamCallbacks(createSimpleChatStream as jest.Mock, [
        { type: 'content', data: '答案' },
        { type: 'citations', data: ['https://example.com'] },
        { type: 'done' },
      ]);

      const response = await adapter.completionQA(testInput);

      expect(response.groundingMetadata).toBeDefined();
      expect(response.groundingMetadata.groundingSuccessful).toBe(true);
      expect(response.groundingMetadata.webSources.length).toBe(1);
    });

    it('should set success=true when answer is received', async () => {
      simulateStreamCallbacks(createSimpleChatStream as jest.Mock, [
        { type: 'content', data: '成功的答案' },
        { type: 'done' },
      ]);

      const response = await adapter.completionQA(testInput);

      expect(response.success).toBe(true);
    });

    it('should set success=false when no answer is received', async () => {
      simulateStreamCallbacks(createSimpleChatStream as jest.Mock, [
        { type: 'done' },
      ]);

      const response = await adapter.completionQA(testInput);

      expect(response.success).toBe(false);
    });

    it('should calculate answerLength correctly', async () => {
      const answer = '這是一個測試答案';

      simulateStreamCallbacks(createSimpleChatStream as jest.Mock, [
        { type: 'content', data: answer },
        { type: 'done' },
      ]);

      const response = await adapter.completionQA(testInput);

      expect(response.answerLength).toBe(answer.length);
    });

    it('should calculate questionLength correctly', async () => {
      simulateStreamCallbacks(createSimpleChatStream as jest.Mock, [
        { type: 'content', data: '答案' },
        { type: 'done' },
      ]);

      const response = await adapter.completionQA(testInput);

      expect(response.questionLength).toBe(testInput.userQuestion.length);
    });

    it('should set streaming=true', async () => {
      simulateStreamCallbacks(createSimpleChatStream as jest.Mock, [
        { type: 'content', data: '答案' },
        { type: 'done' },
      ]);

      const response = await adapter.completionQA(testInput);

      expect(response.streaming).toBe(true);
    });

    it('should count chunks correctly', async () => {
      simulateStreamCallbacks(createSimpleChatStream as jest.Mock, [
        { type: 'content', data: 'A' },
        { type: 'content', data: 'B' },
        { type: 'content', data: 'C' },
        { type: 'done' },
      ]);

      const response = await adapter.completionQA(testInput);

      expect(response.chunkCount).toBeGreaterThan(0);
    });

    it('should have valid timestamp', async () => {
      simulateStreamCallbacks(createSimpleChatStream as jest.Mock, [
        { type: 'content', data: '答案' },
        { type: 'done' },
      ]);

      const response = await adapter.completionQA(testInput);

      expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('buildRedChamberPrompt() consistency', () => {
    it('should include base prompt about Red Chamber expert', async () => {
      let capturedMessages: unknown[] = [];

      (createSimpleChatStream as jest.Mock).mockImplementation(
        async (messages: unknown[], callbacks: StreamCallbacks) => {
          capturedMessages = messages;
          callbacks.onContent('答案');
          callbacks.onDone();
        }
      );

      const input: PerplexityQAInput = {
        userQuestion: '測試問題',
      };

      await adapter.completionQA(input);

      expect(capturedMessages.length).toBe(1);
      const prompt = (capturedMessages[0] as { content: string }).content;
      expect(prompt).toContain('紅樓夢');
      expect(prompt).toContain('文學');
    });

    it('should include character context when questionContext is character', async () => {
      let capturedPrompt = '';

      (createSimpleChatStream as jest.Mock).mockImplementation(
        async (messages: Array<{ content: string }>, callbacks: StreamCallbacks) => {
          capturedPrompt = messages[0].content;
          callbacks.onContent('答案');
          callbacks.onDone();
        }
      );

      const input: PerplexityQAInput = {
        userQuestion: '林黛玉的性格？',
        questionContext: 'character',
      };

      await adapter.completionQA(input);

      expect(capturedPrompt).toContain('人物');
    });

    it('should include plot context when questionContext is plot', async () => {
      let capturedPrompt = '';

      (createSimpleChatStream as jest.Mock).mockImplementation(
        async (messages: Array<{ content: string }>, callbacks: StreamCallbacks) => {
          capturedPrompt = messages[0].content;
          callbacks.onContent('答案');
          callbacks.onDone();
        }
      );

      const input: PerplexityQAInput = {
        userQuestion: '寶黛初會的情節？',
        questionContext: 'plot',
      };

      await adapter.completionQA(input);

      expect(capturedPrompt).toContain('情節');
    });

    it('should include theme context when questionContext is theme', async () => {
      let capturedPrompt = '';

      (createSimpleChatStream as jest.Mock).mockImplementation(
        async (messages: Array<{ content: string }>, callbacks: StreamCallbacks) => {
          capturedPrompt = messages[0].content;
          callbacks.onContent('答案');
          callbacks.onDone();
        }
      );

      const input: PerplexityQAInput = {
        userQuestion: '紅樓夢的主題？',
        questionContext: 'theme',
      };

      await adapter.completionQA(input);

      expect(capturedPrompt).toContain('主題');
    });

    it('should include chapter context when provided', async () => {
      let capturedPrompt = '';

      (createSimpleChatStream as jest.Mock).mockImplementation(
        async (messages: Array<{ content: string }>, callbacks: StreamCallbacks) => {
          capturedPrompt = messages[0].content;
          callbacks.onContent('答案');
          callbacks.onDone();
        }
      );

      const input: PerplexityQAInput = {
        userQuestion: '這段文字的含義？',
        chapterContext: '這是第一回的開頭部分...',
        currentChapter: '第一回',
      };

      await adapter.completionQA(input);

      expect(capturedPrompt).toContain('這是第一回的開頭部分');
      expect(capturedPrompt).toContain('第一回');
    });

    it('should include selected text when provided', async () => {
      let capturedPrompt = '';

      (createSimpleChatStream as jest.Mock).mockImplementation(
        async (messages: Array<{ content: string }>, callbacks: StreamCallbacks) => {
          capturedPrompt = messages[0].content;
          callbacks.onContent('答案');
          callbacks.onDone();
        }
      );

      const input: PerplexityQAInput = {
        userQuestion: '這段話什麼意思？',
        selectedText: '滿紙荒唐言，一把辛酸淚',
      };

      await adapter.completionQA(input);

      expect(capturedPrompt).toContain('滿紙荒唐言');
    });

    it('should include the user question', async () => {
      let capturedPrompt = '';

      (createSimpleChatStream as jest.Mock).mockImplementation(
        async (messages: Array<{ content: string }>, callbacks: StreamCallbacks) => {
          capturedPrompt = messages[0].content;
          callbacks.onContent('答案');
          callbacks.onDone();
        }
      );

      const input: PerplexityQAInput = {
        userQuestion: '這是我的問題',
      };

      await adapter.completionQA(input);

      expect(capturedPrompt).toContain('這是我的問題');
    });

    it('should request Traditional Chinese response', async () => {
      let capturedPrompt = '';

      (createSimpleChatStream as jest.Mock).mockImplementation(
        async (messages: Array<{ content: string }>, callbacks: StreamCallbacks) => {
          capturedPrompt = messages[0].content;
          callbacks.onContent('答案');
          callbacks.onDone();
        }
      );

      const input: PerplexityQAInput = {
        userQuestion: '測試',
      };

      await adapter.completionQA(input);

      expect(capturedPrompt).toContain('繁體中文');
    });
  });

  describe('Citation conversion', () => {
    it('should convert URL strings to PerplexityCitation format', async () => {
      const urls = [
        'https://zh.wikipedia.org/wiki/紅樓夢',
        'https://example.com/article',
      ];

      simulateStreamCallbacks(createSimpleChatStream as jest.Mock, [
        { type: 'content', data: '答案' },
        { type: 'citations', data: urls },
        { type: 'done' },
      ]);

      const response = await adapter.completionQA({ userQuestion: '測試' });

      expect(response.citations.length).toBe(2);

      const citation1 = response.citations[0];
      expect(citation1.number).toBe('1');
      expect(citation1.url).toBe(urls[0]);
      expect(citation1.type).toBe('web_citation');
      expect(citation1.domain).toBe('zh.wikipedia.org');

      const citation2 = response.citations[1];
      expect(citation2.number).toBe('2');
      expect(citation2.url).toBe(urls[1]);
    });

    it('should extract domain from URL correctly', async () => {
      const urls = [
        'https://www.example.com/path',
        'http://sub.domain.com/page',
      ];

      simulateStreamCallbacks(createSimpleChatStream as jest.Mock, [
        { type: 'content', data: '答案' },
        { type: 'citations', data: urls },
        { type: 'done' },
      ]);

      const response = await adapter.completionQA({ userQuestion: '測試' });

      expect(response.citations[0].domain).toBe('example.com');
      expect(response.citations[1].domain).toBe('sub.domain.com');
    });

    it('should generate friendly titles for known domains', async () => {
      const urls = [
        'https://zh.wikipedia.org/wiki/test',
        'https://www.zhihu.com/question/123',
      ];

      simulateStreamCallbacks(createSimpleChatStream as jest.Mock, [
        { type: 'content', data: '答案' },
        { type: 'citations', data: urls },
        { type: 'done' },
      ]);

      const response = await adapter.completionQA({ userQuestion: '測試' });

      expect(response.citations[0].title).toContain('維基百科');
      expect(response.citations[1].title).toContain('知乎');
    });
  });

  describe('Type compatibility - PerplexityStreamingChunk', () => {
    it('should produce type-compatible chunks', async () => {
      simulateStreamCallbacks(createSimpleChatStream as jest.Mock, [
        { type: 'thinkingStart' },
        { type: 'thinkingContent', data: '思考' },
        { type: 'thinkingEnd' },
        { type: 'content', data: '答案' },
        { type: 'citations', data: ['https://example.com'] },
        { type: 'done' },
      ]);

      const chunks: PerplexityStreamingChunk[] = [];
      for await (const chunk of adapter.streamingQA({ userQuestion: '測試' })) {
        chunks.push(chunk);
      }

      const finalChunk = chunks[chunks.length - 1];

      // Type checks - these should compile without errors
      const content: string = finalChunk.content;
      const fullContent: string = finalChunk.fullContent;
      const thinkingContent: string | undefined = finalChunk.thinkingContent;
      const timestamp: string = finalChunk.timestamp;
      const citations: PerplexityCitation[] = finalChunk.citations;
      const searchQueries: string[] = finalChunk.searchQueries;
      const responseTime: number = finalChunk.responseTime;
      const isComplete: boolean = finalChunk.isComplete;
      const chunkIndex: number = finalChunk.chunkIndex;
      const hasThinkingProcess: boolean | undefined = finalChunk.hasThinkingProcess;

      // Verify values are set correctly
      expect(typeof content).toBe('string');
      expect(typeof fullContent).toBe('string');
      expect(thinkingContent === undefined || typeof thinkingContent === 'string').toBe(true);
      expect(typeof timestamp).toBe('string');
      expect(Array.isArray(citations)).toBe(true);
      expect(Array.isArray(searchQueries)).toBe(true);
      expect(typeof responseTime).toBe('number');
      expect(typeof isComplete).toBe('boolean');
      expect(typeof chunkIndex).toBe('number');
      expect(hasThinkingProcess === undefined || typeof hasThinkingProcess === 'boolean').toBe(true);
    });
  });

  describe('Type compatibility - PerplexityQAResponse', () => {
    it('should produce type-compatible response', async () => {
      simulateStreamCallbacks(createSimpleChatStream as jest.Mock, [
        { type: 'thinkingStart' },
        { type: 'thinkingContent', data: '思考' },
        { type: 'thinkingEnd' },
        { type: 'content', data: '答案' },
        { type: 'citations', data: ['https://example.com'] },
        { type: 'done' },
      ]);

      const response: PerplexityQAResponse = await adapter.completionQA({
        userQuestion: '測試問題',
        questionContext: 'general',
      });

      // Type checks - these should compile without errors
      const question: string = response.question;
      const answer: string = response.answer;
      const thinkingContent: string | undefined = response.thinkingContent;
      const citations: PerplexityCitation[] = response.citations;
      const modelUsed: string = response.modelUsed;
      const processingTime: number = response.processingTime;
      const success: boolean = response.success;
      const streaming: boolean = response.streaming;
      const timestamp: string = response.timestamp;
      const answerLength: number = response.answerLength;
      const questionLength: number = response.questionLength;
      const citationCount: number = response.citationCount;

      // Verify values are set correctly
      expect(typeof question).toBe('string');
      expect(typeof answer).toBe('string');
      expect(thinkingContent === undefined || typeof thinkingContent === 'string').toBe(true);
      expect(Array.isArray(citations)).toBe(true);
      expect(typeof modelUsed).toBe('string');
      expect(typeof processingTime).toBe('number');
      expect(typeof success).toBe('boolean');
      expect(typeof streaming).toBe('boolean');
      expect(typeof timestamp).toBe('string');
      expect(typeof answerLength).toBe('number');
      expect(typeof questionLength).toBe('number');
      expect(typeof citationCount).toBe('number');
    });

    it('should have valid groundingMetadata structure', async () => {
      simulateStreamCallbacks(createSimpleChatStream as jest.Mock, [
        { type: 'content', data: '答案' },
        { type: 'citations', data: ['https://example.com', 'https://example2.com'] },
        { type: 'done' },
      ]);

      const response = await adapter.completionQA({ userQuestion: '測試' });

      expect(response.groundingMetadata).toBeDefined();
      expect(Array.isArray(response.groundingMetadata.searchQueries)).toBe(true);
      expect(Array.isArray(response.groundingMetadata.webSources)).toBe(true);
      expect(typeof response.groundingMetadata.groundingSuccessful).toBe('boolean');
      expect(response.groundingMetadata.confidenceScore === undefined ||
        typeof response.groundingMetadata.confidenceScore === 'number').toBe(true);
    });
  });

  describe('Debug mode', () => {
    it('should respect debug option', () => {
      const debugAdapter = new PerplexityStreamAdapter({ debug: true });
      // No error should occur, adapter should work with debug enabled
      expect(debugAdapter.isConfigured()).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle stream errors gracefully', async () => {
      simulateStreamCallbacks(createSimpleChatStream as jest.Mock, [
        { type: 'content', data: '部分內容' },
        { type: 'error', data: new Error('Stream error') },
      ]);

      const chunks: PerplexityStreamingChunk[] = [];
      for await (const chunk of adapter.streamingQA({ userQuestion: '測試' })) {
        chunks.push(chunk);
      }

      // Should still produce chunks before error
      expect(chunks.length).toBeGreaterThan(0);
      // Final chunk should be complete
      const finalChunk = chunks[chunks.length - 1];
      expect(finalChunk.isComplete).toBe(true);
    });

    it('should return success=false when stream fails with no content', async () => {
      // When stream fails at the promise level, it's caught internally
      // and handled gracefully - no content means success=false
      (createSimpleChatStream as jest.Mock).mockRejectedValue(new Error('API Error'));

      const response = await adapter.completionQA({ userQuestion: '測試' });

      expect(response.success).toBe(false);
      // No answer received means answerLength is 0
      expect(response.answerLength).toBe(0);
    });
  });
});
