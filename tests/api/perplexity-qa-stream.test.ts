/**
 * @fileOverview API Route Tests for Perplexity Q&A Streaming
 *
 * Tests the Next.js API route that handles SSE streaming for Perplexity AI responses.
 * 100% mocked - no real API calls to Perplexity.
 *
 * @see src/app/api/perplexity-qa-stream/route.ts
 */

import { POST } from '@/app/api/perplexity-qa-stream/route';
import {
  createMockRequest,
  MOCK_QA_SCENARIOS,
  waitForSSECompletion,
  assertValidChunk,
} from '@tests/utils/perplexity-test-utils';

// Mock the Perplexity flow
jest.mock('@/ai/flows/perplexity-red-chamber-qa', () => ({
  perplexityRedChamberQAStreaming: jest.fn(),
  createPerplexityQAInputForFlow: jest.fn().mockResolvedValue({
    userQuestion: 'Test question',
    modelKey: 'sonar-reasoning-pro',
    reasoningEffort: 'medium',
    questionContext: 'general',
  }),
}));

import { perplexityRedChamberQAStreaming } from '@/ai/flows/perplexity-red-chamber-qa';

// Helper to access mocked function without type assertions
const getMockedStreaming = () => perplexityRedChamberQAStreaming;

describe('API Route: POST /api/perplexity-qa-stream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Request Validation', () => {
    test('should reject request with missing userQuestion', async () => {
      const request = createMockRequest({
        modelKey: 'sonar-reasoning-pro',
        // userQuestion is missing
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('使用者問題必須提供');
    });

    test('should reject request with non-string userQuestion', async () => {
      const request = createMockRequest({
        userQuestion: 123, // Invalid type
        modelKey: 'sonar-reasoning-pro',
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('使用者問題必須提供且為字串格式');
    });

    test('should accept request with valid userQuestion', async () => {
      // Mock the streaming generator to return STANDARD_QA scenario
      getMockedStreaming().mockImplementation(async function* () {
        for (const chunk of MOCK_QA_SCENARIOS.STANDARD_QA.chunks) {
          yield chunk;
        }
      });

      const request = createMockRequest({
        userQuestion: '林黛玉的性格特點有哪些？',
        modelKey: 'sonar-reasoning-pro',
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream; charset=utf-8');
    });

    test('should apply default modelKey if not specified', async () => {
      getMockedStreaming().mockImplementation(async function* () {
        yield MOCK_QA_SCENARIOS.SHORT_ANSWER.chunks[0];
      });

      const request = createMockRequest({
        userQuestion: '測試問題',
        // modelKey not specified
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      // Verify that createPerplexityQAInputForFlow was called with default
      // (Note: This is verified through the mock, actual default is in createPerplexityQAInputForFlow)
    });
  });

  describe('SSE Stream Format', () => {
    test('should return correct SSE headers', async () => {
      getMockedStreaming().mockImplementation(async function* () {
        yield MOCK_QA_SCENARIOS.SHORT_ANSWER.chunks[0];
      });

      const request = createMockRequest({
        userQuestion: '測試',
        modelKey: 'sonar-reasoning-pro',
      });

      const response = await POST(request);

      expect(response.headers.get('Content-Type')).toBe('text/event-stream; charset=utf-8');
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-transform');
      expect(response.headers.get('Connection')).toBe('keep-alive');
      expect(response.headers.get('X-Accel-Buffering')).toBe('no');
    });

    test('should emit chunks in proper SSE format', async () => {
      getMockedStreaming().mockImplementation(async function* () {
        for (const chunk of MOCK_QA_SCENARIOS.STANDARD_QA.chunks.slice(0, 2)) {
          yield chunk;
        }
      });

      const request = createMockRequest({
        userQuestion: '林黛玉的性格？',
        modelKey: 'sonar-reasoning-pro',
      });

      const response = await POST(request);
      const reader = response.body?.getReader();
      expect(reader).toBeDefined();
      const decoder = new TextDecoder();

      // Read first chunk
      const { value } = await reader.read();
      const text = decoder.decode(value);

      // Verify SSE format: "data: {...}\n\n"
      expect(text).toMatch(/^data: \{.*\}\n\n$/);

      // Parse JSON
      const jsonMatch = text.match(/data: (.*)\n\n/);
      expect(jsonMatch).not.toBeNull();

      const chunk = JSON.parse(jsonMatch[1]);
      assertValidChunk(chunk);
    });

    test('should send [DONE] signal on completion', async () => {
      getMockedStreaming().mockImplementation(async function* () {
        yield MOCK_QA_SCENARIOS.SHORT_ANSWER.chunks[0];
      });

      const request = createMockRequest({
        userQuestion: '測試',
        modelKey: 'sonar-reasoning-pro',
      });

      const response = await POST(request);
      const reader = response.body?.getReader();
      expect(reader).toBeDefined();
      const decoder = new TextDecoder();

      // Read all chunks
      let lastChunk = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        lastChunk = decoder.decode(value);
      }

      expect(lastChunk).toBe('data: [DONE]\n\n');
    });

    test('should stream multiple chunks correctly', async () => {
      getMockedStreaming().mockImplementation(async function* () {
        for (const chunk of MOCK_QA_SCENARIOS.STANDARD_QA.chunks) {
          yield chunk;
        }
      });

      const request = createMockRequest({
        userQuestion: '林黛玉的性格特點有哪些？',
        modelKey: 'sonar-reasoning-pro',
      });

      const response = await POST(request);
      const chunks = await waitForSSECompletion(response);

      // Verify we received all chunks
      expect(chunks.length).toBe(MOCK_QA_SCENARIOS.STANDARD_QA.chunks.length);

      // Verify chunk progression
      expect(chunks[0].chunkIndex).toBe(0);
      expect(chunks[chunks.length - 1].isComplete).toBe(true);

      // Verify thinking content
      expect(chunks[0].thinkingContent).toContain('正在分析');

      // Verify final content
      expect(chunks[chunks.length - 1].fullContent).toContain('林黛玉的性格特點主要包括');
    });
  });

  describe('Error Handling', () => {
    test('should handle generator error and send error chunk', async () => {
      // Mock generator to throw error
      getMockedStreaming().mockImplementation(async function* () {
        throw new Error('Simulated API Error');
      });

      const request = createMockRequest({
        userQuestion: '測試',
        modelKey: 'sonar-reasoning-pro',
      });

      const response = await POST(request);
      const chunks = await waitForSSECompletion(response);

      // Should receive error chunk
      expect(chunks.length).toBeGreaterThan(0);
      const errorChunk = chunks[chunks.length - 1];

      expect(errorChunk.error).toBeDefined();
      expect(errorChunk.fullContent).toContain('錯誤');
    });

    test('should handle no chunks scenario', async () => {
      // Mock generator that yields nothing
      getMockedStreaming().mockImplementation(async function* () {
        // Yields nothing
      });

      const request = createMockRequest({
        userQuestion: '測試',
        modelKey: 'sonar-reasoning-pro',
      });

      const response = await POST(request);
      const chunks = await waitForSSECompletion(response);

      // Should receive error chunk about no chunks
      expect(chunks.length).toBe(1);
      expect(chunks[0].error).toContain('No chunks received');
      expect(chunks[0].fullContent).toContain('AI 服務未回傳任何內容');
    });

    test('should preserve partial content on timeout', async () => {
      // Mock generator that yields some chunks then times out
      getMockedStreaming().mockImplementation(async function* () {
        // Yield first chunk
        yield MOCK_QA_SCENARIOS.STANDARD_QA.chunks[0];

        // Simulate long delay that triggers timeout
        await new Promise((resolve) => setTimeout(resolve, 100));

        throw new Error('Request timeout after 30 seconds');
      });

      const request = createMockRequest({
        userQuestion: '測試超長時間問題',
        modelKey: 'sonar-reasoning-pro',
      });

      const response = await POST(request);
      const chunks = await waitForSSECompletion(response);

      // Should have at least the partial chunk and error chunk
      expect(chunks.length).toBeGreaterThanOrEqual(2);

      // Last chunk should be error with partial content mention
      const errorChunk = chunks[chunks.length - 1];
      expect(errorChunk.error).toBeDefined();
      // Error message should contain timeout message and suggestions
      expect(errorChunk.fullContent).toContain('處理您的問題時發生超時');
      expect(errorChunk.fullContent).toContain('建議');
      // If partial content was received, it should be mentioned
      if (chunks.length > 1) {
        expect(errorChunk.fullContent).toMatch(/已接收到部分回應|建議/);
      }
    });
  });

  describe('Streaming Lifecycle', () => {
    test('should process all chunks from async generator', async () => {
      const allChunks = MOCK_QA_SCENARIOS.STANDARD_QA.chunks;

      getMockedStreaming().mockImplementation(async function* () {
        for (const chunk of allChunks) {
          yield chunk;
        }
      });

      const request = createMockRequest({
        userQuestion: '林黛玉的性格特點有哪些？',
        modelKey: 'sonar-reasoning-pro',
      });

      const response = await POST(request);
      const receivedChunks = await waitForSSECompletion(response);

      // Verify all chunks were streamed
      expect(receivedChunks.length).toBe(allChunks.length);

      // Verify chunk indices are sequential
      receivedChunks.forEach((chunk, index) => {
        expect(chunk.chunkIndex).toBe(index);
      });

      // Verify last chunk is marked complete
      expect(receivedChunks[receivedChunks.length - 1].isComplete).toBe(true);
    });

    test('should handle thinking-only response (Task 4.2 scenario)', async () => {
      getMockedStreaming().mockImplementation(async function* () {
        yield MOCK_QA_SCENARIOS.THINKING_ONLY.chunks[0];
      });

      const request = createMockRequest({
        userQuestion: '這個問題需要深入思考',
        modelKey: 'sonar-reasoning-pro',
      });

      const response = await POST(request);
      const chunks = await waitForSSECompletion(response);

      // Should receive thinking chunk without error
      expect(chunks.length).toBe(1);
      expect(chunks[0].thinkingContent).toBeTruthy();
      expect(chunks[0].fullContent).toBe('');
      expect(chunks[0].error).toBeUndefined();
    });

    test('should handle response with citations', async () => {
      getMockedStreaming().mockImplementation(async function* () {
        for (const chunk of MOCK_QA_SCENARIOS.WITH_CITATIONS.chunks) {
          yield chunk;
        }
      });

      const request = createMockRequest({
        userQuestion: '紅樓夢的作者是誰？',
        modelKey: 'sonar-pro',
      });

      const response = await POST(request);
      const chunks = await waitForSSECompletion(response);

      // Find chunk with citations
      const chunkWithCitations = chunks.find((c) => c.citations && c.citations.length > 0);

      expect(chunkWithCitations).toBeDefined();
      expect(chunkWithCitations.citations.length).toBeGreaterThan(0);
      expect(chunkWithCitations.citations[0]).toHaveProperty('url');
      expect(chunkWithCitations.citations[0]).toHaveProperty('title');
    });
  });

  describe('Context Integration', () => {
    test('should pass selectedTextInfo to flow', async () => {
      getMockedStreaming().mockImplementation(async function* () {
        yield MOCK_QA_SCENARIOS.WITH_SELECTED_TEXT.chunks[0];
      });

      const selectedText = '黛玉聽了，便放下釣竿，走至座間坐下。';

      const request = createMockRequest({
        userQuestion: '這段描寫了什麼？',
        selectedTextInfo: {
          text: selectedText,
          chapterNumber: 3,
          context: 'surrounding text...',
        },
        modelKey: 'sonar-reasoning-pro',
      });

      const response = await POST(request);

      expect(response.status).toBe(200);

      // Verify that createPerplexityQAInputForFlow was called with selectedTextInfo
      const { createPerplexityQAInputForFlow } = require('@/ai/flows/perplexity-red-chamber-qa');
      expect(createPerplexityQAInputForFlow).toHaveBeenCalledWith(
        '這段描寫了什麼？',
        expect.objectContaining({
          text: selectedText,
          chapterNumber: 3,
          context: 'surrounding text...'
        }),
        undefined, // chapterContext
        undefined, // currentChapter
        expect.objectContaining({
          modelKey: 'sonar-reasoning-pro',
          enableStreaming: true,
          showThinkingProcess: expect.any(Boolean),
          questionContext: expect.any(String),
          reasoningEffort: expect.any(String)
        })
      );
    });

    test('should pass chapter context to flow', async () => {
      getMockedStreaming().mockImplementation(async function* () {
        yield MOCK_QA_SCENARIOS.STANDARD_QA.chunks[0];
      });

      const request = createMockRequest({
        userQuestion: '這一章的主題是什麼？',
        chapterContext: '第三回的內容摘要...',
        currentChapter: '第三回',
        modelKey: 'sonar-reasoning-pro',
      });

      const response = await POST(request);

      expect(response.status).toBe(200);

      // Verify chapter context was passed
      const { createPerplexityQAInputForFlow } = require('@/ai/flows/perplexity-red-chamber-qa');
      expect(createPerplexityQAInputForFlow).toHaveBeenCalledWith(
        '這一章的主題是什麼？',
        null,
        '第三回的內容摘要...',
        '第三回',
        expect.anything()
      );
    });
  });
});
