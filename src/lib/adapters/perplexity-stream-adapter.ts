/**
 * @fileOverview PerplexityStreamAdapter - Adapter Pattern 實作
 *
 * 將 Side Project A 的 callbacks 模式轉換為主專案的 AsyncGenerator 介面，
 * 提供無縫的 API 相容性，同時保留紅樓夢專用的 prompt 建構邏輯。
 *
 * 設計特點：
 * - Adapter Pattern：轉換 callbacks 為 AsyncGenerator
 * - 事件佇列：使用 Promise + 佇列實現 yield
 * - 類型完全相容：輸出符合 PerplexityStreamingChunk 類型
 * - 紅樓夢專用 Prompt：保留 buildRedChamberPrompt 邏輯
 *
 * @example
 * ```typescript
 * import { PerplexityStreamAdapter } from '@/lib/adapters';
 *
 * const adapter = new PerplexityStreamAdapter();
 * for await (const chunk of adapter.streamingQA(input)) {
 *   console.log(chunk.content);
 * }
 * ```
 */

import { createSimpleChatStream, SimpleChatStreamError } from './simple-chat-stream';
import type { ChatMessage, StreamCallbacks } from './types';
import type {
  PerplexityQAInput,
  PerplexityQAResponse,
  PerplexityStreamingChunk,
  PerplexityCitation,
  PerplexityGroundingMetadata,
} from '@/types/perplexity-qa';
import {
  PERPLEXITY_CONFIG,
  isPerplexityConfigured,
} from '@/ai/perplexity-config';
import { PERPLEXITY_FLAGS } from '@/lib/perplexity-feature-flags';

/**
 * 事件類型定義
 * Event types for the internal queue
 */
type AdapterEvent =
  | { type: 'thinking_start' }
  | { type: 'thinking_content'; content: string }
  | { type: 'thinking_end' }
  | { type: 'content'; content: string }
  | { type: 'citations'; citations: string[] }
  | { type: 'done' }
  | { type: 'error'; error: Error };

/**
 * PerplexityStreamAdapter
 *
 * Adapter 類別，將 SimpleChatStream 的 callbacks 模式
 * 轉換為主專案使用的 AsyncGenerator<PerplexityStreamingChunk> 介面。
 */
export class PerplexityStreamAdapter {
  private debug: boolean;

  constructor(options?: { debug?: boolean }) {
    this.debug = options?.debug ?? PERPLEXITY_FLAGS.debugAdapter;
  }

  /**
   * 檢查 API 是否已配置
   *
   * @returns API 金鑰是否已設定
   */
  isConfigured(): boolean {
    return isPerplexityConfigured();
  }

  /**
   * 測試 API 連線
   *
   * @returns 連線測試結果
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    latencyMs?: number;
  }> {
    const startTime = Date.now();

    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'Perplexity API key is not configured',
      };
    }

    // 用於追蹤回應和錯誤狀態
    let responseReceived = false;
    let connectionError: Error | null = null;
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 5000);

    try {
      // 使用簡單的測試訊息
      const testMessages: ChatMessage[] = [
        { role: 'user', content: 'Hi' },
      ];

      await createSimpleChatStream(
        testMessages,
        {
          onThinkingStart: () => {},
          onThinkingContent: () => {},
          onThinkingEnd: () => {},
          onContent: () => {
            responseReceived = true;
            // 收到回應後立即中止
            abortController.abort();
          },
          onCitations: () => {},
          onDone: () => {
            responseReceived = true;
          },
          onError: (error) => {
            // 記錄錯誤而非拋出（callback 內的 throw 不會正確傳播）
            connectionError = error;
            abortController.abort();
          },
        },
        {
          abortSignal: abortController.signal,
          model: 'sonar-pro', // 使用快速模型測試
          maxTokens: 10,
        }
      );

      // 檢查是否有錯誤
      if (connectionError) {
        throw connectionError;
      }

      const latencyMs = Date.now() - startTime;

      return {
        success: responseReceived,
        message: responseReceived
          ? `Connection successful (${latencyMs}ms)`
          : 'No response received',
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      // AbortError 表示我們主動中止（收到回應了）
      if (error instanceof Error && error.name === 'AbortError') {
        // 如果是因為收到回應而中止，且沒有錯誤，則成功
        if (responseReceived && !connectionError) {
          return {
            success: true,
            message: `Connection successful (${latencyMs}ms)`,
            latencyMs,
          };
        }
      }

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        latencyMs,
      };
    } finally {
      // 確保在所有情況下都清除超時
      clearTimeout(timeoutId);
    }
  }

  /**
   * 為紅樓夢問題構建專門化提示
   *
   * 保留主專案的 prompt 邏輯，確保回答品質一致
   *
   * @param input - QA 輸入
   * @returns 完整的 prompt 字串
   */
  private buildRedChamberPrompt(input: PerplexityQAInput): string {
    const basePrompt =
      '你是一位資深的紅樓夢文學專家，具有深厚的古典文學素養和豐富的研究經驗。';

    // 嚴格限制：只回答與紅樓夢相關的問題
    const topicRestriction = `
【重要限制】
你只能回答與《紅樓夢》（又名《石頭記》）直接相關的問題。這包括：
- 《紅樓夢》的人物分析（如賈寶玉、林黛玉、薛寶釵、王熙鳳等）
- 情節發展與故事結構
- 主題思想、象徵意義與文學價值
- 作者曹雪芹及其創作背景
- 《紅樓夢》中的詩詞、典故
- 紅學研究相關內容
- 清代社會文化背景（僅限與理解《紅樓夢》相關的部分）

如果使用者的問題與《紅樓夢》完全無關（例如：其他文學作品、科技、時事、其他領域的問題等），你必須禮貌地拒絕回答，並回覆：
「抱歉，此問題不在本系統的回答範圍內。本平台專注於《紅樓夢》的文學研究與學習，請提出與《紅樓夢》相關的問題，我將竭誠為您解答。」

請嚴格遵守此限制，不要回答任何與《紅樓夢》無關的問題。
`;

    const contextPrompts = {
      character: '請特別關注人物性格分析、人物關係和角色發展。',
      plot: '請重點分析情節發展、故事結構和敘事技巧。',
      theme: '請深入探討主題思想、象徵意義與文學價值。',
      general: '請提供全面而深入的文學分析。',
    };

    const contextInstruction =
      contextPrompts[input.questionContext || 'general'];

    let prompt = `${basePrompt}\n\n${topicRestriction}\n\n${contextInstruction}\n\n`;

    // 加入章節上下文
    if (input.chapterContext) {
      prompt += `當前章回上下文：\n${input.chapterContext}\n\n`;
    }

    // 加入選取的文字
    if (input.selectedText) {
      prompt += `使用者選取的文字：\n"${input.selectedText}"\n\n`;
    }

    // 加入當前章節資訊
    if (input.currentChapter) {
      prompt += `目前閱讀章回：${input.currentChapter}\n\n`;
    }

    prompt += `請針對以下關於《紅樓夢》的問題提供詳細、準確的分析：\n\n`;
    prompt += `問題：${input.userQuestion}\n\n`;

    prompt += `請在回答中包含：\n`;
    prompt += `1. 直接回答問題的核心內容\n`;
    prompt += `2. 相關的文本依據和具體例證\n`;
    prompt += `3. 深入的文學分析和解讀\n`;
    prompt += `4. 必要的歷史文化背景\n`;
    prompt += `5. 與其他角色或情節的關聯\n\n`;
    prompt += `請使用繁體中文回答，語言要學術性但易於理解。若輸出包含 <think> 或思考過程文字，亦請以繁體中文撰寫（不要使用英文）。`;

    return prompt;
  }

  /**
   * 將 URL 陣列轉換為 PerplexityCitation 格式
   *
   * @param urls - 引用 URL 陣列
   * @returns PerplexityCitation 陣列
   */
  private convertCitations(urls: string[]): PerplexityCitation[] {
    return urls.map((url, index) => ({
      number: String(index + 1),
      title: this.extractTitleFromUrl(url),
      url: url.trim(),
      type: 'web_citation' as const,
      domain: this.extractDomainFromUrl(url),
    }));
  }

  /**
   * 從 URL 提取友好標題
   */
  private extractTitleFromUrl(url: string): string {
    try {
      const domain = url
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0];

      const domainTitles: Record<string, string> = {
        'zh.wikipedia.org': '維基百科 (中文)',
        'wikipedia.org': '維基百科',
        'baidu.com': '百度百科',
        'zhihu.com': '知乎',
        'guoxue.com': '國學網',
        'literature.org.cn': '中國文學網',
        'cnki.net': '中國知網',
        'douban.com': '豆瓣',
        'academia.edu': '學術網',
        'jstor.org': 'JSTOR',
      };

      if (domainTitles[domain]) {
        return domainTitles[domain];
      }

      for (const [domainKey, friendlyTitle] of Object.entries(domainTitles)) {
        if (domain.includes(domainKey)) {
          return friendlyTitle;
        }
      }

      return domain.split('.')[0];
    } catch {
      return '網路來源';
    }
  }

  /**
   * 從 URL 提取域名
   */
  private extractDomainFromUrl(url: string): string {
    try {
      return url
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0];
    } catch {
      return 'unknown';
    }
  }

  /**
   * 建立 PerplexityStreamingChunk
   *
   * @param params - chunk 參數
   * @returns PerplexityStreamingChunk
   */
  private createChunk(params: {
    content: string;
    fullContent: string;
    thinkingContent?: string;
    citations: PerplexityCitation[];
    chunkIndex: number;
    startTime: number;
    isComplete: boolean;
    hasThinkingProcess?: boolean;
    contentDerivedFromThinking?: boolean;
  }): PerplexityStreamingChunk {
    return {
      content: params.content,
      fullContent: params.fullContent,
      thinkingContent: params.thinkingContent,
      contentDerivedFromThinking: params.contentDerivedFromThinking,
      timestamp: new Date().toISOString(),
      citations: params.citations,
      searchQueries: [],
      metadata: {
        groundingSuccessful: params.citations.length > 0,
      },
      responseTime: (Date.now() - params.startTime) / 1000,
      isComplete: params.isComplete,
      chunkIndex: params.chunkIndex,
      hasThinkingProcess: params.hasThinkingProcess,
    };
  }

  /**
   * 串流 QA 請求（AsyncGenerator 介面）
   *
   * 將 SimpleChatStream 的 callbacks 模式轉換為 AsyncGenerator，
   * 提供與主專案 PerplexityClient.streamingCompletionRequest 相同的介面。
   *
   * @param input - QA 輸入
   * @param abortSignal - 取消信號
   * @yields PerplexityStreamingChunk
   */
  async *streamingQA(
    input: PerplexityQAInput,
    abortSignal?: AbortSignal
  ): AsyncGenerator<PerplexityStreamingChunk> {
    const startTime = Date.now();
    let chunkIndex = 0;
    let fullContent = '';
    let thinkingContent = '';
    let isInThinking = false;
    let hasThinkingProcess = false;
    let citations: PerplexityCitation[] = [];

    // 建立事件佇列和同步機制
    const eventQueue: AdapterEvent[] = [];
    let resolveNext: (() => void) | null = null;
    let isDone = false;
    let streamError: Error | null = null;
    let isAborted = false;

    // 清除 resolveNext 的輔助函數（防止記憶體洩漏）
    const clearResolveNext = (): void => {
      if (resolveNext) {
        resolveNext();
        resolveNext = null;
      }
    };

    // 將事件推入佇列並喚醒等待者
    const pushEvent = (event: AdapterEvent): void => {
      if (isAborted) return; // 忽略中止後的事件
      eventQueue.push(event);
      clearResolveNext();
    };

    // 等待下一個事件
    const waitForEvent = (): Promise<void> => {
      return new Promise((resolve) => {
        if (eventQueue.length > 0 || isDone || streamError || isAborted) {
          resolve();
        } else {
          resolveNext = resolve;
        }
      });
    };

    // AbortSignal 處理器
    const handleAbort = (): void => {
      isAborted = true;
      streamError = new Error('Request aborted');
      streamError.name = 'AbortError';
      clearResolveNext();
    };

    // 監聽外部中止信號
    if (abortSignal) {
      if (abortSignal.aborted) {
        // 已經中止，直接設定狀態
        handleAbort();
      } else {
        abortSignal.addEventListener('abort', handleAbort, { once: true });
      }
    }

    // 建立 callbacks
    const callbacks: StreamCallbacks = {
      onThinkingStart: () => {
        pushEvent({ type: 'thinking_start' });
      },
      onThinkingContent: (content: string) => {
        pushEvent({ type: 'thinking_content', content });
      },
      onThinkingEnd: () => {
        pushEvent({ type: 'thinking_end' });
      },
      onContent: (content: string) => {
        pushEvent({ type: 'content', content });
      },
      onCitations: (citationUrls: string[]) => {
        pushEvent({ type: 'citations', citations: citationUrls });
      },
      onDone: () => {
        pushEvent({ type: 'done' });
      },
      onError: (error: Error) => {
        pushEvent({ type: 'error', error });
      },
    };

    // 建構訊息
    const prompt = this.buildRedChamberPrompt(input);
    const messages: ChatMessage[] = [{ role: 'user', content: prompt }];

    if (this.debug) {
      console.log('[PerplexityStreamAdapter] Starting streamingQA', {
        questionLength: input.userQuestion.length,
        model: input.modelKey,
      });
    }

    // 啟動串流（非同步，不等待完成）
    createSimpleChatStream(messages, callbacks, {
      abortSignal,
      model: input.modelKey || PERPLEXITY_CONFIG.DEFAULT_MODEL,
      maxTokens: input.maxTokens || PERPLEXITY_CONFIG.DEFAULT_MAX_TOKENS,
      temperature: input.temperature ?? PERPLEXITY_CONFIG.DEFAULT_TEMPERATURE,
    }).catch((error) => {
      // 捕捉任何未預期的錯誤
      if (!isAborted) {
        streamError = error instanceof Error ? error : new Error(String(error));
      }
      clearResolveNext();
    });

    // 處理事件佇列（使用 try-finally 確保清理）
    try {
      while (!isDone && !streamError && !isAborted) {
        // 等待事件
        await waitForEvent();

        // 處理所有佇列中的事件
        while (eventQueue.length > 0) {
          const event = eventQueue.shift()!;

          switch (event.type) {
            case 'thinking_start':
              isInThinking = true;
              hasThinkingProcess = true;
              // 發送一個標記 chunk 表示思考開始
              yield this.createChunk({
                content: '',
                fullContent,
                thinkingContent,
                citations,
                chunkIndex: chunkIndex++,
                startTime,
                isComplete: false,
                hasThinkingProcess: true,
              });
              break;

            case 'thinking_content':
              thinkingContent += event.content;
              // 發送思考內容 chunk
              yield this.createChunk({
                content: '',
                fullContent,
                thinkingContent,
                citations,
                chunkIndex: chunkIndex++,
                startTime,
                isComplete: false,
                hasThinkingProcess: true,
              });
              break;

            case 'thinking_end':
              isInThinking = false;
              // 發送思考結束標記
              yield this.createChunk({
                content: '',
                fullContent,
                thinkingContent,
                citations,
                chunkIndex: chunkIndex++,
                startTime,
                isComplete: false,
                hasThinkingProcess: true,
              });
              break;

            case 'content':
              fullContent += event.content;
              // 發送內容 chunk
              yield this.createChunk({
                content: event.content,
                fullContent,
                thinkingContent: hasThinkingProcess ? thinkingContent : undefined,
                citations,
                chunkIndex: chunkIndex++,
                startTime,
                isComplete: false,
                hasThinkingProcess,
              });
              break;

            case 'citations':
              citations = this.convertCitations(event.citations);
              break;

            case 'done':
              isDone = true;
              // 發送最終 chunk
              yield this.createChunk({
                content: '',
                fullContent,
                thinkingContent: hasThinkingProcess ? thinkingContent : undefined,
                citations,
                chunkIndex: chunkIndex++,
                startTime,
                isComplete: true,
                hasThinkingProcess,
              });
              break;

            case 'error':
              streamError = event.error;
              break;
          }
        }
      }

      // 如果有錯誤（非中止），發送錯誤 chunk
      if (streamError && streamError.name !== 'AbortError') {
        yield this.createChunk({
          content: '',
          fullContent,
          thinkingContent: hasThinkingProcess ? thinkingContent : undefined,
          citations,
          chunkIndex: chunkIndex++,
          startTime,
          isComplete: true,
          hasThinkingProcess,
        });

        if (this.debug) {
          console.error('[PerplexityStreamAdapter] Stream error:', streamError);
        }
      }

      // 如果是用戶取消，發送帶有 stoppedByUser 標記的 chunk
      if (isAborted) {
        yield this.createChunk({
          content: '',
          fullContent,
          thinkingContent: hasThinkingProcess ? thinkingContent : undefined,
          citations,
          chunkIndex: chunkIndex++,
          startTime,
          isComplete: true,
          hasThinkingProcess,
        });

        if (this.debug) {
          console.log('[PerplexityStreamAdapter] Stream aborted by user');
        }
      }

      if (this.debug) {
        console.log('[PerplexityStreamAdapter] Stream completed', {
          totalChunks: chunkIndex,
          fullContentLength: fullContent.length,
          thinkingContentLength: thinkingContent.length,
          citationCount: citations.length,
          responseTime: (Date.now() - startTime) / 1000,
          aborted: isAborted,
        });
      }
    } finally {
      // 確保清理 AbortSignal 監聽器（防止記憶體洩漏）
      if (abortSignal && !abortSignal.aborted) {
        abortSignal.removeEventListener('abort', handleAbort);
      }
      // 確保清理 resolveNext（防止記憶體洩漏）
      clearResolveNext();
    }
  }

  /**
   * 非串流 QA 請求
   *
   * 收集所有串流 chunks 後回傳完整回應。
   *
   * @param input - QA 輸入
   * @returns 完整的 PerplexityQAResponse
   */
  async completionQA(input: PerplexityQAInput): Promise<PerplexityQAResponse> {
    const startTime = Date.now();
    let fullContent = '';
    let thinkingContent = '';
    let citations: PerplexityCitation[] = [];
    let chunkCount = 0;
    let hasError = false;
    let errorMessage = '';

    try {
      for await (const chunk of this.streamingQA(input)) {
        chunkCount++;
        fullContent = chunk.fullContent;
        if (chunk.thinkingContent) {
          thinkingContent = chunk.thinkingContent;
        }
        if (chunk.citations.length > 0) {
          citations = chunk.citations;
        }
      }
    } catch (error) {
      hasError = true;
      errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
    }

    const processingTime = (Date.now() - startTime) / 1000;

    const groundingMetadata: PerplexityGroundingMetadata = {
      searchQueries: [],
      webSources: citations.filter((c) => c.type === 'web_citation'),
      groundingSuccessful: citations.length > 0,
      confidenceScore: citations.length > 0 ? Math.min(citations.length / 5, 1) : 0,
    };

    return {
      question: input.userQuestion,
      answer: fullContent,
      rawAnswer: fullContent,
      thinkingContent: thinkingContent || undefined,
      citations,
      groundingMetadata,
      modelUsed: input.modelKey || PERPLEXITY_CONFIG.DEFAULT_MODEL,
      modelKey: input.modelKey || 'sonar-reasoning-pro',
      reasoningEffort: input.reasoningEffort,
      questionContext: input.questionContext,
      processingTime,
      success: !hasError && fullContent.length > 0,
      streaming: true,
      chunkCount,
      stoppedByUser: false,
      timestamp: new Date().toISOString(),
      answerLength: fullContent.length,
      questionLength: input.userQuestion.length,
      citationCount: citations.length,
      error: hasError ? errorMessage : undefined,
    };
  }
}

// 匯出類型
export type { PerplexityQAInput, PerplexityStreamingChunk, PerplexityQAResponse };
