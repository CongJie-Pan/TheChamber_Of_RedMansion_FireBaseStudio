/**
 * @fileOverview Integration tests for Perplexity QA system
 * 測試 Perplexity QA 系統的整合測試
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import {
  perplexityRedChamberQA,
  perplexityRedChamberQAStreaming,
  perplexityRedChamberQABatch,
  createPerplexityQAInputForFlow,
  getModelCapabilities,
  getSuggestedQuestions,
  formatPerplexityResponse,
} from '@/ai/flows/perplexity-red-chamber-qa';
import type { 
  PerplexityQAInput, 
  PerplexityQAResponse, 
  PerplexityBatchQAInput 
} from '@/types/perplexity-qa';
import { validatePerplexityQAInput } from '@/types/perplexity-qa';

// Mock the entire Perplexity client module
jest.mock('@/lib/perplexity-client', () => ({
  getDefaultPerplexityClient: jest.fn(),
  PerplexityClient: jest.fn(),
  resetDefaultClient: jest.fn(),
}));

// Mock axios for HTTP requests
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
  default: {
    create: jest.fn(() => ({
      post: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    })),
  },
}));

describe('Perplexity QA Integration Tests', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a mock client with all required methods
    mockClient = {
      completionRequest: jest.fn(),
      streamingCompletionRequest: jest.fn(),
      testConnection: jest.fn(),
    };

    // Mock the getDefaultPerplexityClient function
    const { getDefaultPerplexityClient } = require('@/lib/perplexity-client');
    (getDefaultPerplexityClient as jest.Mock).mockReturnValue(mockClient);
  });

  describe('End-to-End QA Flow', () => {
    test('should process a complete question about character analysis', async () => {
      const mockResponse: PerplexityQAResponse = {
        question: '林黛玉的性格特點是什麼？',
        answer: '林黛玉是《紅樓夢》中的重要女性角色，她具有以下性格特點：\n\n1. **敏感細膩**：對周圍環境和人際關係極為敏感\n2. **才華橫溢**：詩詞才華出眾，文學造詣深厚\n3. **清高孤傲**：不願與世俗同流合污',
        rawAnswer: '林黛玉是《紅樓夢》中的重要女性角色...',
        citations: [
          {
            number: '1',
            title: '紅樓夢人物分析 - 維基百科',
            url: 'https://zh.wikipedia.org/wiki/林黛玉',
            type: 'web_citation',
            domain: 'zh.wikipedia.org',
          },
          {
            number: '2',
            title: '古典文學研究 - 中國知網',
            url: 'https://cnki.net/article/12345',
            type: 'web_citation',
            domain: 'cnki.net',
          },
        ],
        groundingMetadata: {
          searchQueries: ['林黛玉 性格特點', '紅樓夢 人物分析', '林黛玉 文學形象'],
          webSources: [],
          groundingSuccessful: true,
          confidenceScore: 0.9,
        },
                 modelUsed: 'sonar-reasoning',
         modelKey: 'sonar-reasoning',
         reasoningEffort: 'high',
         questionContext: 'character',
         processingTime: 3.2,
         success: true,
         streaming: false,
         stoppedByUser: false,
         timestamp: new Date().toISOString(),
         answerLength: 250,
         questionLength: 12,
         citationCount: 2,
       };

       mockClient.completionRequest.mockResolvedValue(mockResponse);

       const input: PerplexityQAInput = {
         userQuestion: '林黛玉的性格特點是什麼？',
         selectedText: '黛玉聽了，便放下釣竿，走至亭中',
         chapterContext: '第三回 賈雨村夤緣復舊職 林黛玉拋父進京都',
         currentChapter: '第三回',
         modelKey: 'sonar-reasoning',
        reasoningEffort: 'high',
        questionContext: 'character',
        enableStreaming: false,
        includeDetailedCitations: true,
        showThinkingProcess: true,
      };

      const result = await perplexityRedChamberQA(input);

      expect(result.success).toBe(true);
      expect(result.question).toBe('林黛玉的性格特點是什麼？');
      expect(result.answer).toContain('林黛玉');
      expect(result.answer).toContain('敏感細膩');
      expect(result.citations).toHaveLength(2);
      expect(result.groundingMetadata.searchQueries).toContain('林黛玉 性格特點');
             expect(result.modelKey).toBe('sonar-reasoning');
      expect(result.reasoningEffort).toBe('high');
      expect(result.processingTime).toBeGreaterThan(0);

             // Verify that the client was called with the correct input
       expect(mockClient.completionRequest).toHaveBeenCalledWith(
         expect.objectContaining({
           userQuestion: '林黛玉的性格特點是什麼？',
           modelKey: 'sonar-reasoning',
           reasoningEffort: 'high',
           questionContext: 'character',
         })
       );
    });

    test('should handle plot analysis questions', async () => {
      const mockResponse: PerplexityQAResponse = {
        question: '劉姥姥進大觀園的情節意義是什麼？',
        answer: '劉姥姥進大觀園是《紅樓夢》中的經典情節，具有多重意義：\n\n1. **對比手法**：通過劉姥姥的樸實與大觀園的奢華形成鮮明對比\n2. **社會諷刺**：揭示了貧富差距和階級矛盾',
        citations: [
          {
            number: '1',
            title: '紅樓夢情節分析',
            url: 'https://literature.org.cn/hongloumeng/plot',
            type: 'web_citation',
            domain: 'literature.org.cn',
          },
        ],
        groundingMetadata: {
          searchQueries: ['劉姥姥進大觀園', '紅樓夢情節分析'],
          webSources: [],
          groundingSuccessful: true,
          confidenceScore: 0.85,
        },
                 modelUsed: 'sonar-reasoning',
         modelKey: 'sonar-reasoning',
         questionContext: 'plot',
         processingTime: 2.8,
         success: true,
         streaming: false,
         stoppedByUser: false,
         timestamp: new Date().toISOString(),
         answerLength: 180,
         questionLength: 15,
         citationCount: 1,
       };

       mockClient.completionRequest.mockResolvedValue(mockResponse);

       const input = await createPerplexityQAInputForFlow(
         '劉姥姥進大觀園的情節意義是什麼？',
         null,
         '第六回 賈寶玉初試雲雨情 劉姥姥一進榮國府',
         '第六回',
         {
           questionContext: 'plot',
           modelKey: 'sonar-reasoning',
         }
       );

      const result = await perplexityRedChamberQA(input);

      expect(result.success).toBe(true);
      expect(result.questionContext).toBe('plot');
      expect(result.answer).toContain('劉姥姥');
      expect(result.answer).toContain('大觀園');
      expect(result.citations).toHaveLength(1);
    });
  });

  describe('Data Flow Validation', () => {
    test('should preserve all input data through the processing pipeline', async () => {
      const originalInput: PerplexityQAInput = {
        userQuestion: '《紅樓夢》的主題思想是什麼？',
        selectedText: '滿紙荒唐言，一把辛酸淚',
        chapterContext: '第一回 甄士隱夢幻識通靈 賈雨村風塵懷閨秀',
        currentChapter: '第一回',
                 modelKey: 'sonar-reasoning',
         reasoningEffort: 'high',
         questionContext: 'theme',
         enableStreaming: false,
         includeDetailedCitations: true,
         showThinkingProcess: true,
         temperature: 0.3,
         maxTokens: 2500,
       };

       const mockResponse: PerplexityQAResponse = {
         question: originalInput.userQuestion,
         answer: '《紅樓夢》的主題思想深邃複雜...',
         citations: [],
         groundingMetadata: {
           searchQueries: ['紅樓夢主題思想'],
           webSources: [],
           groundingSuccessful: true,
         },
         modelUsed: 'sonar-reasoning',
         modelKey: 'sonar-reasoning',
        reasoningEffort: 'high',
        questionContext: 'theme',
        processingTime: 4.1,
        success: true,
        streaming: false,
        stoppedByUser: false,
        timestamp: new Date().toISOString(),
        answerLength: 100,
        questionLength: originalInput.userQuestion.length,
        citationCount: 0,
      };

      mockClient.completionRequest.mockResolvedValue(mockResponse);

      const result = await perplexityRedChamberQA(originalInput);

      // Verify that all original input data is preserved in the response
      expect(result.question).toBe(originalInput.userQuestion);
      expect(result.modelKey).toBe(originalInput.modelKey);
      expect(result.reasoningEffort).toBe(originalInput.reasoningEffort);
      expect(result.questionContext).toBe(originalInput.questionContext);

      // Verify that the client received the correct processed input
      const clientCall = mockClient.completionRequest.mock.calls[0][0];
      expect(clientCall.userQuestion).toBe(originalInput.userQuestion);
      expect(clientCall.selectedText).toBe(originalInput.selectedText);
      expect(clientCall.chapterContext).toBe(originalInput.chapterContext);
      expect(clientCall.currentChapter).toBe(originalInput.currentChapter);
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle network errors gracefully', async () => {
      mockClient.completionRequest.mockRejectedValue(new Error('Network timeout'));

      const input: PerplexityQAInput = {
        userQuestion: '測試網絡錯誤處理',
      };

      const result = await perplexityRedChamberQA(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network timeout');
      expect(result.answer).toContain('處理您的問題時發生錯誤');
      expect(result.question).toBe(input.userQuestion);
      expect(result.citations).toEqual([]);
      expect(result.groundingMetadata.groundingSuccessful).toBe(false);
    });

    test('should handle invalid API responses', async () => {
      mockClient.completionRequest.mockResolvedValue({
        question: '測試無效回應處理',
        answer: '抱歉，處理您的問題時發生錯誤：Invalid API response format',
        rawAnswer: '',
        citations: [],
        groundingMetadata: {
          searchQueries: [],
          webSources: [],
          groundingSuccessful: false,
        },
        modelUsed: 'sonar-reasoning-pro',
        modelKey: 'sonar-reasoning-pro',
        reasoningEffort: 'high',
        questionContext: 'general',
        processingTime: 0,
        success: false,
        streaming: false,
        stoppedByUser: false,
        timestamp: new Date().toISOString(),
        answerLength: 0,
        questionLength: 12,
        citationCount: 0,
        error: 'Invalid API response format',
      });

      const input: PerplexityQAInput = {
        userQuestion: '測試無效回應處理',
      };

      const result = await perplexityRedChamberQA(input);

      expect(result.success).toBe(false);
      expect(result.answer).toContain('處理您的問題時發生錯誤');
    });
  });

  describe('Batch Processing Integration', () => {
    test('should process multiple questions in batch', async () => {
      const mockResponses = [
        {
          question: '第一個問題',
          answer: '第一個回答',
          citations: [],
          groundingMetadata: { searchQueries: [], webSources: [], groundingSuccessful: true },
          modelUsed: 'sonar-pro',
          modelKey: 'sonar-pro',
          processingTime: 1.0,
          success: true,
          streaming: false,
          timestamp: new Date().toISOString(),
          answerLength: 10,
          questionLength: 5,
          citationCount: 0,
        },
        {
          question: '第二個問題',
          answer: '第二個回答',
          citations: [],
          groundingMetadata: { searchQueries: [], webSources: [], groundingSuccessful: true },
          modelUsed: 'sonar-pro',
          modelKey: 'sonar-pro',
          processingTime: 1.5,
          success: true,
          streaming: false,
          timestamp: new Date().toISOString(),
          answerLength: 10,
          questionLength: 5,
          citationCount: 0,
        },
      ];

      mockClient.completionRequest
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1]);

      const batchInput: PerplexityBatchQAInput = {
        questions: [
          { userQuestion: '第一個問題', modelKey: 'sonar-pro' },
          { userQuestion: '第二個問題', modelKey: 'sonar-pro' },
        ],
        sharedConfig: {
          questionContext: 'general',
          enableStreaming: false,
        },
        maxConcurrency: 2,
      };

      const result = await perplexityRedChamberQABatch(batchInput);

      expect(result.success).toBe(true);
      expect(result.responses).toHaveLength(2);
      expect(result.batchMetadata.totalQuestions).toBe(2);
      expect(result.batchMetadata.successfulQuestions).toBe(2);
      expect(result.batchMetadata.failedQuestions).toBe(0);
      expect(result.batchMetadata.totalProcessingTime).toBeGreaterThan(0);

      // Verify that both questions were processed
      expect(result.responses[0].question).toBe('第一個問題');
      expect(result.responses[1].question).toBe('第二個問題');
    });

    test('should handle partial failures in batch processing', async () => {
      mockClient.completionRequest
        .mockResolvedValueOnce({
          question: '成功的問題',
          answer: '成功的回答',
          citations: [],
          groundingMetadata: { searchQueries: [], webSources: [], groundingSuccessful: true },
          modelUsed: 'sonar-pro',
          modelKey: 'sonar-pro',
          processingTime: 1.0,
          success: true,
          streaming: false,
          timestamp: new Date().toISOString(),
          answerLength: 10,
          questionLength: 5,
          citationCount: 0,
        })
        .mockRejectedValueOnce(new Error('API Error'));

      const batchInput: PerplexityBatchQAInput = {
        questions: [
          { userQuestion: '成功的問題' },
          { userQuestion: '失敗的問題' },
        ],
        maxConcurrency: 1,
      };

      const result = await perplexityRedChamberQABatch(batchInput);

      expect(result.batchMetadata.totalQuestions).toBe(2);
      expect(result.batchMetadata.successfulQuestions).toBe(1);
      expect(result.batchMetadata.failedQuestions).toBe(1);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('Question 2: API Error');
    });
  });

  describe('Input Validation Integration', () => {
    test('should validate and reject invalid inputs', async () => {
      const invalidInput = {
        userQuestion: '', // Empty question
        temperature: 2.0, // Invalid temperature
        maxTokens: 10000, // Exceeds limit
      } as PerplexityQAInput;

      await expect(perplexityRedChamberQA(invalidInput)).rejects.toThrow('輸入驗證失敗');
    });

    test('should validate and accept valid inputs', () => {
             const validInput: PerplexityQAInput = {
         userQuestion: '這是一個有效的問題',
         temperature: 0.5,
         maxTokens: 1000,
         modelKey: 'sonar-reasoning',
       };

      const validation = validatePerplexityQAInput(validInput);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Async Generator Integration Tests', () => {
    test('should handle streaming integration errors gracefully', async () => {
      // Mock client to simulate async generator errors
      mockClient.streamingCompletionRequest.mockImplementation(async function* () {
        yield {
          content: 'partial content',
          fullContent: 'partial content',
          timestamp: new Date().toISOString(),
          citations: [],
          searchQueries: [],
          metadata: { searchQueries: [], webSources: [], groundingSuccessful: false },
          responseTime: 0.1,
          isComplete: false,
          chunkIndex: 1,
        };
        throw new Error('Integration streaming error');
      });

      const input: PerplexityQAInput = {
        userQuestion: '測試集成流式錯誤',
        enableStreaming: true,
      };

      const chunks: any[] = [];
      
      // The streaming function handles errors internally and yields error chunks
      // instead of throwing exceptions, so we should check for error chunks
      for await (const chunk of perplexityRedChamberQAStreaming(input)) {
        chunks.push(chunk);
        if (chunk.isComplete) break;
      }

      // Should have received at least one chunk with error information
      expect(chunks.length).toBeGreaterThan(0);
      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.isComplete).toBe(true);
      expect(lastChunk.error || lastChunk.fullContent).toContain('Integration streaming error');
    });

    test('should validate end-to-end async generator flow', async () => {
      // Setup normal streaming mock
      mockClient.streamingCompletionRequest.mockImplementation(async function* () {
        yield {
          content: '測試',
          fullContent: '測試內容',
          timestamp: new Date().toISOString(),
          citations: [],
          searchQueries: ['紅樓夢'],
          metadata: { searchQueries: ['紅樓夢'], webSources: [], groundingSuccessful: true },
          responseTime: 0.2,
          isComplete: false,
          chunkIndex: 1,
        };
        yield {
          content: '完成',
          fullContent: '測試內容完成',
          timestamp: new Date().toISOString(),
          citations: [],
          searchQueries: ['紅樓夢'],
          metadata: { searchQueries: ['紅樓夢'], webSources: [], groundingSuccessful: true },
          responseTime: 0.4,
          isComplete: true,
          chunkIndex: 2,
        };
      });

      const input: PerplexityQAInput = {
        userQuestion: '測試完整流程',
        enableStreaming: true,
      };

      const chunks: any[] = [];
      const generator = perplexityRedChamberQAStreaming(input);

      // Verify generator type
      expect(typeof generator).toBe('object');
      expect(typeof generator[Symbol.asyncIterator]).toBe('function');

      for await (const chunk of generator) {
        chunks.push(chunk);
        if (chunk.isComplete) break;
      }

      expect(chunks.length).toBe(2);
      expect(chunks[0].content).toBe('測試');
      expect(chunks[1].isComplete).toBe(true);
    });

    test('should handle async function validation in integration context', async () => {
      // Test that all async functions work correctly in integration
      const helperInput = await createPerplexityQAInputForFlow(
        '測試輔助函數',
        null,
        '章回上下文',
        '第一回'
      );

      expect(helperInput.userQuestion).toBe('測試輔助函數');
      expect(helperInput.chapterContext).toBe('章回上下文');

             const capabilities = await getModelCapabilities('sonar-reasoning');
      expect(capabilities.supportsReasoning).toBe(true);

      const questions = await getSuggestedQuestions();
      expect(questions.character).toHaveLength(4);

      const mockResponse: PerplexityQAResponse = {
        question: '測試',
        answer: '測試回答',
        rawAnswer: '原始回答',
        citations: [],
        groundingMetadata: { searchQueries: [], webSources: [], groundingSuccessful: false },
                 modelUsed: 'sonar-reasoning',
         modelKey: 'sonar-reasoning',
         reasoningEffort: 'high',
         questionContext: 'general',
         processingTime: 1.0,
         success: true,
         streaming: false,
         stoppedByUser: false,
         timestamp: new Date().toISOString(),
         answerLength: 4,
         questionLength: 2,
         citationCount: 0,
       };

      const formatted = await formatPerplexityResponse(mockResponse);
      expect(formatted.citationSummary).toBe('找到 0 個引用來源');
      expect(formatted.processingInfo).toContain('處理時間: 1.00秒');
    });

    test('should handle Server Actions compatibility in production build', async () => {
      // Simulate production environment constraints
      const originalNodeEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true,
      });

      try {
        // All functions should still work in production
        const input: PerplexityQAInput = {
          userQuestion: '生產環境測試',
          enableStreaming: false,
        };

        mockClient.completionRequest.mockResolvedValue({
          question: '生產環境測試',
          answer: '生產環境回答',
          rawAnswer: '',
          citations: [],
          groundingMetadata: { searchQueries: [], webSources: [], groundingSuccessful: false },
                   modelUsed: 'sonar-reasoning',
         modelKey: 'sonar-reasoning',
         reasoningEffort: 'high',
         questionContext: 'general',
         processingTime: 0.5,
         success: true,
         streaming: false,
         stoppedByUser: false,
         timestamp: new Date().toISOString(),
         answerLength: 6,
         questionLength: 6,
         citationCount: 0,
       });

        const result = await perplexityRedChamberQA(input);
        expect(result.success).toBe(true);
        expect(result.answer).toBe('生產環境回答');
      } finally {
        Object.defineProperty(process.env, 'NODE_ENV', {
          value: originalNodeEnv,
          writable: true,
          configurable: true,
        });
      }
    });
  });

  describe('Type Safety and Compatibility', () => {
    test('should maintain type safety across the integration pipeline', async () => {
      const input = await createPerplexityQAInputForFlow(
        '類型安全測試問題',
        { text: '選中的文字', position: null, range: null },
        '章節上下文',
        '測試章節'
      );

      // Type checks should pass at compile time
      expect(typeof input.userQuestion).toBe('string');
      expect(typeof input.selectedText).toBe('string');
      expect(typeof input.chapterContext).toBe('string');
      expect(typeof input.currentChapter).toBe('string');

      // Mock a valid response
      const mockResponse: PerplexityQAResponse = {
        question: input.userQuestion,
        answer: '類型安全的回答',
        citations: [],
        groundingMetadata: {
          searchQueries: [],
          webSources: [],
          groundingSuccessful: true,
        },
                 modelUsed: 'sonar-reasoning',
         modelKey: 'sonar-reasoning',
         processingTime: 1.0,
         success: true,
         streaming: false,
         stoppedByUser: false,
         timestamp: new Date().toISOString(),
         answerLength: 20,
         questionLength: input.userQuestion.length,
         citationCount: 0,
       };

      mockClient.completionRequest.mockResolvedValue(mockResponse);

      const result = await perplexityRedChamberQA(input);

      // Type safety verification
      expect(typeof result.question).toBe('string');
      expect(typeof result.answer).toBe('string');
      expect(Array.isArray(result.citations)).toBe(true);
      expect(typeof result.processingTime).toBe('number');
      expect(typeof result.success).toBe('boolean');
    });

    test('should handle explainTextSelection integration with Perplexity', async () => {
      // Test the updated explainTextSelection function that now uses Perplexity
      const { explainTextSelection } = await import('@/ai/flows/explain-text-selection');
      
      const mockResponse: PerplexityQAResponse = {
        question: '測試文本解釋問題',
        answer: '## 文本解釋\n\n這是對選取文本的詳細解釋，包含：\n\n- **重要概念**：關鍵詞彙的含義\n- **文學手法**：作者使用的寫作技巧\n- **文化背景**：相關的歷史文化背景',
        citations: [],
        groundingMetadata: {
          searchQueries: ['紅樓夢 文本分析'],
          webSources: [],
          groundingSuccessful: true,
        },
                 modelUsed: 'sonar-reasoning',
         modelKey: 'sonar-reasoning',
         reasoningEffort: 'medium',
         questionContext: 'general',
         processingTime: 2.5,
         success: true,
         streaming: false,
         stoppedByUser: false,
         timestamp: new Date().toISOString(),
         answerLength: 150,
         questionLength: 8,
         citationCount: 0,
       };

      mockClient.completionRequest.mockResolvedValue(mockResponse);

      const result = await explainTextSelection({
        selectedText: '黛玉聽了，便放下釣竿，走至亭中',
        chapterContext: '第三回 賈雨村夤緣復舊職 林黛玉拋父進京都',
        userQuestion: '這段文字有什麼文學意義？'
      });

      expect(result.explanation).toContain('## 文本解釋');
      expect(result.explanation).toContain('**重要概念**');
      expect(result.explanation).toContain('**文學手法**');
      expect(result.explanation).toContain('**文化背景**');

      // Verify that the Perplexity client was called with correct parameters
      expect(mockClient.completionRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          userQuestion: '這段文字有什麼文學意義？',
          selectedText: '黛玉聽了，便放下釣竿，走至亭中',
          chapterContext: '第三回 賈雨村夤緣復舊職 林黛玉拋父進京都',
                     modelKey: 'sonar-reasoning',
           reasoningEffort: 'medium',
           enableStreaming: false,
        })
      );
    });

    test('should handle explainTextSelection error fallback', async () => {
      // Test error handling in explainTextSelection
      const { explainTextSelection } = await import('@/ai/flows/explain-text-selection');

      mockClient.completionRequest.mockRejectedValue(new Error('API Error'));

      const result = await explainTextSelection({
        selectedText: '測試文本',
        chapterContext: '測試章節',
        userQuestion: '測試問題'
      });

      expect(result.explanation).toContain('## 解釋說明');
      expect(result.explanation).toContain('很抱歉，目前AI服務暫時無法提供詳細解釋');
      expect(result.explanation).toContain('錯誤詳情：API Error');
      expect(result.explanation).toContain('測試文本');
      expect(result.explanation).toContain('測試問題');
    });
  });

  /**
   * Integration tests for assumeThinkingFirst behavior (2025-12-03)
   *
   * These tests verify that the full integration flow correctly handles
   * Perplexity sonar-reasoning API responses without <think> opening tag.
   */
  describe('assumeThinkingFirst Integration (2025-12-03)', () => {
    test('should correctly process QA response without <think> opening tag', async () => {
      const { perplexityRedChamberQAStreaming } = await import('@/ai/flows/perplexity-red-chamber-qa');

      // Mock response simulating API without <think> opening tag
      // Content format: 思考內容</think>正式回答
      mockClient.streamingCompletionRequest.mockImplementation(async function* () {
        yield {
          type: 'thinking',
          content: '用户问的是紅樓夢的作者。',
          thinkingContent: '用户问的是紅樓夢的作者。',
          fullContent: '',
          timestamp: new Date().toISOString(),
          citations: [],
          searchQueries: [],
          metadata: { searchQueries: [], webSources: [], groundingSuccessful: false },
          responseTime: 0.5,
          isComplete: false,
          chunkIndex: 0,
          hasThinkingProcess: true,
        };
        yield {
          type: 'text',
          content: '《紅樓夢》的作者是曹雪芹。',
          thinkingContent: '用户问的是紅樓夢的作者。',
          fullContent: '《紅樓夢》的作者是曹雪芹。',
          timestamp: new Date().toISOString(),
          citations: [],
          searchQueries: [],
          metadata: { searchQueries: [], webSources: [], groundingSuccessful: false },
          responseTime: 1.0,
          isComplete: true,
          chunkIndex: 1,
          hasThinkingProcess: true,
        };
      });

      const input = {
        userQuestion: '紅樓夢的作者是誰？',
        modelKey: 'sonar-reasoning' as const,
        reasoningEffort: 'medium' as const,
        enableStreaming: true,
        showThinkingProcess: true,
      };

      const chunks = [];
      for await (const chunk of perplexityRedChamberQAStreaming(input)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThanOrEqual(1);

      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.thinkingContent).toContain('紅樓夢的作者');
      expect(lastChunk.fullContent).toContain('曹雪芹');
    });

    test('should handle non-streaming response without <think> opening tag', async () => {
      const { perplexityRedChamberQA } = await import('@/ai/flows/perplexity-red-chamber-qa');

      // Mock response simulating API without <think> opening tag
      mockClient.completionRequest.mockResolvedValue({
        answer: '《紅樓夢》是中國四大名著之一。',
        thinkingContent: '用户问的是关于紅樓夢的问题。',
        citations: [],
        processingTime: 1.5,
        contentDerivedFromThinking: false,
      });

      const result = await perplexityRedChamberQA({
        userQuestion: '紅樓夢是什麼？',
        modelKey: 'sonar-reasoning',
        reasoningEffort: 'medium',
        enableStreaming: false,
      });

      expect(result.answer).toContain('中國四大名著');
      expect(result.thinkingContent).toContain('紅樓夢');
    });
  });
});
