'use server';

/**
 * @fileOverview Perplexity-powered QA flow for "Dream of the Red Chamber" analysis
 * 
 * This module implements the main AI flow for answering questions about the classic
 * Chinese novel using Perplexity's Sonar API with web search grounding capabilities.
 * It provides comprehensive literary analysis with real-time citations and references.
 */

import { z } from 'zod';
import type {
  PerplexityQAInput,
  PerplexityQAResponse,
  PerplexityStreamingChunk,
  PerplexityBatchQAInput,
  PerplexityBatchQAResponse,
} from '@/types/perplexity-qa';
import {
  createPerplexityQAInput,
  validatePerplexityQAInput,
  DEFAULT_PERPLEXITY_QA_CONFIG,
} from '@/types/perplexity-qa';
import {
  PerplexityClient,
  getDefaultPerplexityClient,
} from '@/lib/perplexity-client';
import {
  PERPLEXITY_CONFIG,
  supportsReasoning,
  type PerplexityModelKey,
  type ReasoningEffort,
  type QuestionContext,
} from '@/ai/perplexity-config';
import { terminalLogger, debugLog, errorLog, traceLog } from '@/lib/terminal-logger';

/**
 * Zod schema for validating Perplexity QA input
 * 用於驗證 Perplexity QA 輸入的 Zod 結構
 */
const PerplexityQAInputSchemaObject = z.object({
  userQuestion: z.string().min(1).max(1000).describe('使用者關於《紅樓夢》的問題'),
  selectedText: z.string().optional().describe('使用者選取的文字片段（可選）'),
  chapterContext: z.string().optional().describe('當前章回的上下文片段'),
  currentChapter: z.string().optional().describe('當前章回名稱/編號'),
  modelKey: z.enum(['sonar-pro', 'sonar-reasoning', 'sonar-reasoning-pro']).optional().describe('首選使用的模型'),
  reasoningEffort: z.enum(['low', 'medium', 'high']).optional().describe('推理強度等級（用於推理模型）'),
  questionContext: z.enum(['character', 'plot', 'theme', 'general']).optional().describe('問題情境類型'),
  enableStreaming: z.boolean().default(true).describe('啟用流式回應'),
  includeDetailedCitations: z.boolean().default(true).describe('包含詳細引用'),
  showThinkingProcess: z.boolean().default(true).describe('顯示 AI 思考過程'),
  temperature: z.number().min(0).max(1).optional().describe('生成溫度（0-1）'),
  maxTokens: z.number().min(1).max(8000).optional().describe('回應最大 token 數'),
});

/**
 * Export schema as async function for Server Actions compatibility
 * 為 Server Actions 兼容性將 schema 導出為 async 函數
 */
export async function getPerplexityQAInputSchema() {
  return PerplexityQAInputSchemaObject;
}

/**
 * Zod schema for Perplexity QA output
 * Perplexity QA 輸出的 Zod 結構
 */
const PerplexityQAOutputSchemaObject = z.object({
  question: z.string().describe('原始使用者問題'),
  answer: z.string().describe('AI 生成的回答（已清理和格式化）'),
  rawAnswer: z.string().optional().describe('原始 API 回應（清理前）'),
  citations: z.array(z.object({
    number: z.string(),
    title: z.string(),
    url: z.string(),
    type: z.enum(['web_citation', 'default', 'academic', 'news']),
    snippet: z.string().optional(),
    publishDate: z.string().optional(),
    domain: z.string().optional(),
  })).describe('引用資訊列表'),
  groundingMetadata: z.object({
    searchQueries: z.array(z.string()),
    webSources: z.array(z.any()),
    confidenceScore: z.number().optional(),
    groundingSuccessful: z.boolean(),
    rawMetadata: z.record(z.string(), z.any()).optional(),
  }).describe('接地元數據'),
  modelUsed: z.string().describe('使用的模型'),
  modelKey: z.string().describe('模型金鑰'),
  reasoningEffort: z.string().optional().describe('應用的推理強度'),
  questionContext: z.string().optional().describe('問題情境類型'),
  processingTime: z.number().describe('處理時間（秒）'),
  success: z.boolean().describe('請求是否成功'),
  streaming: z.boolean().describe('是否使用流式處理'),
  chunkCount: z.number().optional().describe('接收的流式區塊數量'),
  stoppedByUser: z.boolean().optional().describe('是否被使用者停止'),
  timestamp: z.string().describe('回應時間戳'),
  answerLength: z.number().describe('回答長度（字符數）'),
  questionLength: z.number().describe('問題長度（字符數）'),
  citationCount: z.number().describe('引用數量'),
  error: z.string().optional().describe('錯誤資訊（如果請求失敗）'),
  metadata: z.record(z.string(), z.any()).optional().describe('額外的回應元數據'),
});

/**
 * Export output schema as async function for Server Actions compatibility
 * 為 Server Actions 兼容性將輸出 schema 導出為 async 函數
 */
export async function getPerplexityQAOutputSchema() {
  return PerplexityQAOutputSchemaObject;
}

/**
 * Main Perplexity QA function for Dream of the Red Chamber analysis
 * 紅樓夢分析的主要 Perplexity QA 函數
 */
export async function perplexityRedChamberQA(input: PerplexityQAInput): Promise<PerplexityQAResponse> {
  console.log('Starting Perplexity QA request:', {
    question: input.userQuestion.substring(0, 100),
    modelKey: input.modelKey,
    enableStreaming: input.enableStreaming,
  });

  // Validate input
  const validation = validatePerplexityQAInput(input);
  if (!validation.valid) {
    throw new Error(`輸入驗證失敗: ${validation.errors.join(', ')}`);
  }

  // Ensure defaults are applied
  const processedInput = createPerplexityQAInput(input.userQuestion, input);

  try {
    // Get Perplexity client
    const client = getDefaultPerplexityClient();

    // Make API request
    const response = await client.completionRequest(processedInput);

    console.log('Perplexity QA completed:', {
      success: response.success,
      answerLength: response.answerLength,
      citationCount: response.citationCount,
      processingTime: response.processingTime,
    });

    return response;

  } catch (error) {
    // Only log errors in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      console.error('Perplexity QA error:', error);
    }
    
    // Return error response in expected format
    const errorMessage = error instanceof Error ? error.message : '未知錯誤';
    
    return {
      question: input.userQuestion,
      answer: `抱歉，處理您的問題時發生錯誤：${errorMessage}`,
      citations: [],
      groundingMetadata: {
        searchQueries: [],
        webSources: [],
        groundingSuccessful: false,
      },
      modelUsed: input.modelKey || DEFAULT_PERPLEXITY_QA_CONFIG.defaultModel,
      modelKey: input.modelKey || DEFAULT_PERPLEXITY_QA_CONFIG.defaultModel,
      reasoningEffort: input.reasoningEffort,
      questionContext: input.questionContext,
      processingTime: 0,
      success: false,
      streaming: false,
      stoppedByUser: false,
      timestamp: new Date().toISOString(),
      answerLength: 0,
      questionLength: input.userQuestion.length,
      citationCount: 0,
      error: errorMessage,
    };
  }
}

/**
 * Streaming version of Perplexity QA for real-time responses
 * 即時回應的 Perplexity QA 流式版本
 */
export async function* perplexityRedChamberQAStreaming(
  input: PerplexityQAInput
): AsyncGenerator<PerplexityStreamingChunk> {
  const functionName = 'perplexityRedChamberQAStreaming';
  
  await terminalLogger.logAsyncGeneratorStart('PERPLEXITY_STREAMING', functionName, input);
  
  console.log('Starting Perplexity streaming QA:', {
    question: input.userQuestion.substring(0, 100),
    modelKey: input.modelKey,
  });
  
  await debugLog('PERPLEXITY_STREAMING', 'Function entry point reached', {
    inputType: typeof input,
    inputKeys: Object.keys(input),
    userQuestionLength: input.userQuestion?.length,
    enableStreaming: input.enableStreaming,
  });

  // Validate input
  const validation = validatePerplexityQAInput(input);
  if (!validation.valid) {
    yield {
      content: '',
      fullContent: `輸入驗證失敗: ${validation.errors.join(', ')}`,
      timestamp: new Date().toISOString(),
      citations: [],
      searchQueries: [],
      metadata: {
        searchQueries: [],
        webSources: [],
        groundingSuccessful: false,
      },
      responseTime: 0,
      isComplete: true,
      chunkIndex: 1,
      error: `輸入驗證失敗: ${validation.errors.join(', ')}`,
    };
    return;
  }

  // Ensure defaults are applied
  const processedInput = createPerplexityQAInput(input.userQuestion, {
    ...input,
    enableStreaming: true,
  });

  try {
    // Get Perplexity client
    await debugLog('PERPLEXITY_STREAMING', 'Getting Perplexity client');
    const client = getDefaultPerplexityClient();
    
    await debugLog('PERPLEXITY_STREAMING', 'Client obtained', {
      clientType: typeof client,
      clientConstructor: client?.constructor?.name,
      hasStreamingMethod: typeof client?.streamingCompletionRequest === 'function',
    });

    // Stream API response
    console.log('Client type:', typeof client);
    console.log('Client streamingCompletionRequest type:', typeof client.streamingCompletionRequest);
    
    await debugLog('PERPLEXITY_STREAMING', 'Calling client.streamingCompletionRequest', {
      processedInputType: typeof processedInput,
      processedInputKeys: Object.keys(processedInput),
    });
    
    const streamGenerator = client.streamingCompletionRequest(processedInput);
    
    await debugLog('PERPLEXITY_STREAMING', 'Stream generator created', {
      generatorType: typeof streamGenerator,
      generatorConstructor: streamGenerator?.constructor?.name,
      hasAsyncIterator: typeof streamGenerator?.[Symbol.asyncIterator] === 'function',
    });
    
    console.log('Stream generator type:', typeof streamGenerator);
    console.log('Stream generator Symbol.asyncIterator:', typeof streamGenerator?.[Symbol.asyncIterator]);
    
    // Validate that the returned value is async iterable
    if (!streamGenerator || typeof (streamGenerator as any)[Symbol.asyncIterator] !== 'function') {
      await errorLog('PERPLEXITY_STREAMING', 'Client returned non-async-iterable value', {
        returnedType: typeof streamGenerator,
        hasAsyncIterator: streamGenerator && typeof (streamGenerator as any)[Symbol.asyncIterator] === 'function',
        hasIterator: streamGenerator && typeof (streamGenerator as any)[Symbol.iterator] === 'function',
        constructorName: streamGenerator?.constructor?.name,
      });
      
      throw new TypeError(`client.streamingCompletionRequest(...) is not a function or its return value is not async iterable. Expected AsyncGenerator, got ${typeof streamGenerator} (${streamGenerator?.constructor?.name || 'unknown'})`);
    }
    
    await terminalLogger.logForAwaitStart('PERPLEXITY_STREAMING', 'client.streamingCompletionRequest', streamGenerator);
    
    for await (const chunk of streamGenerator) {
      // Task 4.2 Debug: Log chunk being yielded from flow
      console.log('[perplexity-red-chamber-qa] Yielding chunk:', {
        chunkIndex: chunk.chunkIndex,
        contentLength: chunk.content?.length || 0,
        fullContentLength: chunk.fullContent?.length || 0,
        thinkingContentLength: chunk.thinkingContent?.length || 0,
        isComplete: chunk.isComplete,
        hasError: !!chunk.error,
      });

      yield chunk;

      if (chunk.isComplete) {
        console.log('Perplexity streaming QA completed:', {
          chunkIndex: chunk.chunkIndex,
          finalLength: chunk.fullContent.length,
          citationCount: chunk.citations.length,
          responseTime: chunk.responseTime,
        });
        break;
      }
    }

  } catch (error: any) {
    console.error('Perplexity streaming QA error:', error);
    
    await terminalLogger.logAsyncGeneratorError('PERPLEXITY_STREAMING', functionName, error);
    
    await errorLog('PERPLEXITY_STREAMING', 'Caught error in streaming function', {
      errorType: error?.constructor?.name,
      errorMessage: error?.message,
      isTypeError: error instanceof TypeError,
      isReferenceError: error instanceof ReferenceError,
      stack: error?.stack,
    });
    
    const errorMessage = error instanceof Error ? error.message : '流式處理錯誤';
    
    yield {
      content: '',
      fullContent: `流式處理時發生錯誤：${errorMessage}`,
      timestamp: new Date().toISOString(),
      citations: [],
      searchQueries: [],
      metadata: {
        searchQueries: [],
        webSources: [],
        groundingSuccessful: false,
      },
      responseTime: 0,
      isComplete: true,
      chunkIndex: 1,
      error: errorMessage,
    };
  }
}

/**
 * Batch processing for multiple Perplexity QA requests
 * 多個 Perplexity QA 請求的批量處理
 */
export async function perplexityRedChamberQABatch(
  input: PerplexityBatchQAInput
): Promise<PerplexityBatchQAResponse> {
  const startTime = Date.now();
  console.log('Starting Perplexity batch QA:', {
    questionCount: input.questions.length,
    maxConcurrency: input.maxConcurrency || 3,
  });

  const responses: PerplexityQAResponse[] = [];
  const errors: string[] = [];
  let successfulQuestions = 0;

  // Process questions with controlled concurrency
  const maxConcurrency = input.maxConcurrency || 3;
  const semaphore = new Array(maxConcurrency).fill(null);
  
  const processingPromises = input.questions.map(async (questionInput, index) => {
    // Wait for available slot
    await new Promise(resolve => {
      const checkSlot = () => {
        const availableIndex = semaphore.findIndex(slot => slot === null);
        if (availableIndex !== -1) {
          semaphore[availableIndex] = index;
          resolve(undefined);
        } else {
          setTimeout(checkSlot, 100);
        }
      };
      checkSlot();
    });

    try {
      // Apply shared configuration
      const mergedInput = {
        ...input.sharedConfig,
        ...questionInput,
      };

      const response = await perplexityRedChamberQA(mergedInput);
      responses[index] = response;
      
      if (response.success) {
        successfulQuestions++;
      } else {
        errors.push(`Question ${index + 1}: ${response.error || 'Unknown error'}`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Question ${index + 1}: ${errorMessage}`);
      
      // Create error response
      responses[index] = {
        question: questionInput.userQuestion,
        answer: `批量處理錯誤：${errorMessage}`,
        citations: [],
        groundingMetadata: {
          searchQueries: [],
          webSources: [],
          groundingSuccessful: false,
        },
        modelUsed: questionInput.modelKey || DEFAULT_PERPLEXITY_QA_CONFIG.defaultModel,
        modelKey: questionInput.modelKey || DEFAULT_PERPLEXITY_QA_CONFIG.defaultModel,
        reasoningEffort: questionInput.reasoningEffort,
        questionContext: questionInput.questionContext,
        processingTime: 0,
        success: false,
        streaming: false,
        stoppedByUser: false,
        timestamp: new Date().toISOString(),
        answerLength: 0,
        questionLength: questionInput.userQuestion.length,
        citationCount: 0,
        error: errorMessage,
      };
    } finally {
      // Release slot
      const slotIndex = semaphore.findIndex(slot => slot === index);
      if (slotIndex !== -1) {
        semaphore[slotIndex] = null;
      }
    }
  });

  // Wait for all processing to complete
  await Promise.all(processingPromises);

  const totalProcessingTime = (Date.now() - startTime) / 1000;
  const averageProcessingTime = totalProcessingTime / input.questions.length;

  console.log('Perplexity batch QA completed:', {
    totalQuestions: input.questions.length,
    successfulQuestions,
    failedQuestions: input.questions.length - successfulQuestions,
    totalProcessingTime,
    averageProcessingTime,
  });

  return {
    responses,
    batchMetadata: {
      totalQuestions: input.questions.length,
      successfulQuestions,
      failedQuestions: input.questions.length - successfulQuestions,
      totalProcessingTime,
      averageProcessingTime,
      timestamp: new Date().toISOString(),
    },
    success: successfulQuestions > 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Helper function to create Perplexity QA input with proper validation
 * 創建具有適當驗證的 Perplexity QA 輸入的輔助函數
 */
export async function createPerplexityQAInputForFlow(
  userQuestion: string,
  selectedTextInfo?: { text: string; position: any; range: any } | null,
  chapterContextSnippet?: string,
  currentChapter?: string,
  options?: Partial<PerplexityQAInput>
): Promise<PerplexityQAInput> {
  return createPerplexityQAInput(userQuestion, {
    selectedText: selectedTextInfo?.text,
    chapterContext: chapterContextSnippet,
    currentChapter,
    ...options,
  });
}

/**
 * Helper function to check if a model supports specific features
 * 檢查模型是否支援特定功能的輔助函數
 */
export async function getModelCapabilities(modelKey: PerplexityModelKey) {
  return {
    supportsReasoning: supportsReasoning(modelKey),
    supportsStreaming: true,
    supportsCitations: true,
    supportsWebSearch: true,
  };
}

/**
 * Helper function to get suggested questions for different contexts
 * 為不同情境取得建議問題的輔助函數
 */
export async function getSuggestedQuestions(): Promise<Record<QuestionContext, string[]>> {
  return {
    character: [
      '林黛玉的性格特點和悲劇命運如何體現？',
      '賈寶玉的叛逆精神在哪些情節中表現出來？',
      '王熙鳳的管理才能和性格缺陷有哪些？',
      '薛寶釵的待人處世之道體現了什麼價值觀？',
    ],
    plot: [
      '第一回中真假虛實的設定有何深層意義？',
      '劉姥姥進大觀園的情節在小說中起什麼作用？',
      '黛玉葬花的象徵意義是什麼？',
      '寶黛初會的情節安排有什麼特殊之處？',
    ],
    theme: [
      '《紅樓夢》中體現了怎樣的愛情觀念？',
      '小說如何表現封建社會的興衰主題？',
      '真假虛實的哲學思辨在作品中如何體現？',
      '《紅樓夢》中的女性意識覺醒有哪些表現？',
    ],
    general: [
      '《紅樓夢》的主要藝術成就有哪些？',
      '曹雪芹的寫作技巧有什麼特點？',
      '《紅樓夢》在中國文學史上的地位如何？',
      '《紅樓夢》的現實主義特色體現在哪裡？',
    ],
  };
}

/**
 * Helper function to format response for display
 * 格式化回應以供顯示的輔助函數
 */
export async function formatPerplexityResponse(response: PerplexityQAResponse) {
  return {
    ...response,
    formattedAnswer: response.answer,
    citationSummary: `找到 ${response.citationCount} 個引用來源`,
    processingInfo: `處理時間: ${response.processingTime.toFixed(2)}秒`,
    modelInfo: `模型: ${response.modelKey}${
      response.reasoningEffort ? ` (推理強度: ${response.reasoningEffort})` : ''
    }`,
  };
}
