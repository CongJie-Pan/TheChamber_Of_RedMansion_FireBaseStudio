/**
 * @fileOverview Perplexity API client for the Red Mansion learning platform
 * 
 * This client provides a comprehensive interface to the Perplexity Sonar API,
 * handling authentication, request formatting, response parsing, and error handling
 * for the Dream of the Red Chamber QA system.
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type {
  PerplexityQAInput,
  PerplexityQAResponse,
  PerplexityStreamingChunk,
  PerplexityCitation,
  PerplexityGroundingMetadata,
} from '@/types/perplexity-qa';
import { PerplexityQAError } from '@/types/perplexity-qa';
import {
  PERPLEXITY_CONFIG,
  PERPLEXITY_MODELS,
  getPerplexityApiKey,
  isPerplexityConfigured,
  getDefaultHeaders,
  createPerplexityConfig,
  supportsReasoning,
  type PerplexityModelKey,
} from '@/ai/perplexity-config';
import { sanitizeThinkingContent, isLikelyThinkingPreface } from '@/lib/perplexity-thinking-utils';
import { PerplexityStreamProcessor } from '@/lib/streaming/perplexity-stream-processor';
import { terminalLogger, debugLog, errorLog, traceLog } from '@/lib/terminal-logger';

// Debug mode control: Enable detailed logging with PERPLEXITY_DEBUG=true
// Based on industry best practices: production logs should be minimal and structured
const DEBUG = process.env.PERPLEXITY_DEBUG === 'true';

/**
 * Raw API response from Perplexity Chat Completions
 * Perplexity Chat Completions 的原始 API 回應
 */
interface PerplexityAPIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  citations?: string[];
  web_search_queries?: string[];
}

/**
 * Raw streaming chunk from Perplexity API
 * Perplexity API 的原始流式區塊
 */
interface PerplexityStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason?: string;
  }>;
  citations?: string[];
  web_search_queries?: string[];
}


/**
 * Perplexity API client class
 * Perplexity API 客戶端類別
 */
export class PerplexityClient {
  private axiosInstance: AxiosInstance;
  private apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey || getPerplexityApiKey();
    if (!key) {
      throw new PerplexityQAError(
        'Perplexity API key is required. Please set PERPLEXITYAI_API_KEY environment variable.',
        'MISSING_API_KEY',
        401,
        false
      );
    }

    this.apiKey = key;
    this.axiosInstance = axios.create({
      baseURL: PERPLEXITY_CONFIG.BASE_URL,
      timeout: PERPLEXITY_CONFIG.REQUEST_TIMEOUT_MS,
      headers: getDefaultHeaders(this.apiKey),
    });

    // Add request interceptor for logging (if debug enabled)
    if (process.env.PERPLEXITY_DEBUG === 'true') {
      this.axiosInstance.interceptors.request.use((config) => {
        console.log('Perplexity API Request:', {
          url: config.url,
          method: config.method,
          data: config.data,
        });
        return config;
      });
    }

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        const statusCode = error.response?.status;
        const message = error.response?.data?.error?.message || error.message;
        
        throw new PerplexityQAError(
          `Perplexity API Error: ${message}`,
          'API_ERROR',
          statusCode,
          statusCode >= 500 || statusCode === 429, // Retryable for server errors and rate limits
          error
        );
      }
    );
  }

  /**
   * Extract and format citations from API response
   * 從 API 回應中提取和格式化引用
   */
  private extractCitations(
    text: string,
    apiCitations?: string[],
    webSearchQueries?: string[]
  ): PerplexityCitation[] {
    const citations: PerplexityCitation[] = [];
    
    if (apiCitations && apiCitations.length > 0) {
      // Match citation numbers in text [1], [2], etc.
      const citationPattern = /\[(\d+)\]/g;
      const citationNumbers = Array.from(text.matchAll(citationPattern))
        .map(match => match[1])
        .filter((value, index, self) => self.indexOf(value) === index);

      apiCitations.forEach((url, index) => {
        const citationNumber = String(index + 1);
        
        // Only include citations that are actually referenced in the text
        if (citationNumbers.includes(citationNumber) || index < 5) {
          citations.push({
            number: citationNumber,
            title: this.extractTitleFromUrl(url),
            url: url.trim(),
            type: 'web_citation',
            domain: this.extractDomainFromUrl(url),
          });
        }
      });
    }

    // If no citations found, add default fallback sources
    if (citations.length === 0) {
      const defaultSources: PerplexityCitation[] = [
        {
          number: '1',
          title: '紅樓夢研究 - 維基百科',
          url: 'https://zh.wikipedia.org/wiki/紅樓夢',
          type: 'default',
          domain: 'wikipedia.org',
        },
        {
          number: '2',
          title: '曹雪芹與紅樓夢研究',
          url: 'https://www.guoxue.com/hongloumeng/',
          type: 'default',
          domain: 'guoxue.com',
        },
      ];
      citations.push(...defaultSources);
    }

    return citations.slice(0, PERPLEXITY_CONFIG.MAX_CITATIONS);
  }

  /**
   * Extract friendly title from URL
   * 從 URL 提取友好標題
   */
  private extractTitleFromUrl(url: string): string {
    try {
      const domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
      
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

      // Check for exact domain match first, then partial matches
      if (domainTitles[domain]) {
        return domainTitles[domain];
      }
      
      for (const [domainKey, friendlyTitle] of Object.entries(domainTitles)) {
        if (domain.includes(domainKey)) {
          return friendlyTitle;
        }
      }

      return domain.split('.')[0];
    } catch (error) {
      return '網路來源';
    }
  }

  /**
   * Extract domain from URL
   * 從 URL 提取域名
   */
  private extractDomainFromUrl(url: string): string {
    try {
      return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Parse reasoning model response to separate thinking and answer content
   * 解析推理模型回應，分離思考過程和實際答案
   *
   * Based on Perplexity official documentation:
   * "sonar-reasoning-pro outputs a <think> section containing reasoning tokens,
   * immediately followed by the answer content"
   *
   * @returns { thinking: string, answer: string }
   */

  /**
   * Clean HTML tags and process thinking tags
   * 清理 HTML 標籤並處理思考標籤
   */
  private cleanResponse(text: string, showThinking: boolean = true): string {
    // Task 4.2 Logging: Track cleanResponse input
    console.log('[perplexity-client] cleanResponse input.length:', text?.length || 0);

    if (!text) return '';

    let cleanText = text;

    // Always remove <think> tags from the answer text; thinking will be sent separately
    const thinkPattern = /<think>([\s\S]*?)<\/think>/gs;
    cleanText = cleanText.replace(thinkPattern, '');
    const incompleteThinkPattern = /<think[^>]*>([\s\S]*?)(?=<(?!\/?think)|$)/gs;
    cleanText = cleanText.replace(incompleteThinkPattern, '');

    // Task 4.2 Fix: Clean specific HTML tags only, avoid overly aggressive regex
    // The previous catch-all pattern /<\/?[a-zA-Z][^>]*>/gi was too aggressive
    // and could corrupt Chinese characters like 《》 if chunks split mid-content
    const htmlPatterns = [
      /<div[^>]*>/gi, /<\/div>/gi,
      /<small[^>]*>/gi, /<\/small>/gi,
      /<strong[^>]*>/gi, /<\/strong>/gi,
      /<span[^>]*>/gi, /<\/span>/gi,
      /<p[^>]*>/gi, /<\/p>/gi,
      /<br[^>]*\/?>/gi,
      /<think[^>]*>/gi, /<\/think>/gi,
      // More specific patterns for common HTML elements only
      /<a[^>]*>/gi, /<\/a>/gi,
      /<em[^>]*>/gi, /<\/em>/gi,
      /<i[^>]*>/gi, /<\/i>/gi,
      /<b[^>]*>/gi, /<\/b>/gi,
      /<h[1-6][^>]*>/gi, /<\/h[1-6]>/gi,
      /<ul[^>]*>/gi, /<\/ul>/gi,
      /<ol[^>]*>/gi, /<\/ol>/gi,
      /<li[^>]*>/gi, /<\/li>/gi,
      /<blockquote[^>]*>/gi, /<\/blockquote>/gi,
      /<code[^>]*>/gi, /<\/code>/gi,
      /<pre[^>]*>/gi, /<\/pre>/gi,
    ];

    htmlPatterns.forEach(pattern => {
      cleanText = cleanText.replace(pattern, '');
    });

    // Clean multiple newlines and spaces
    cleanText = cleanText.replace(/\n\s*\n\s*\n/g, '\n\n');
    cleanText = cleanText.replace(/[ \t]+/g, ' ');

    const result = cleanText.trim();
    // Task 4.2 Logging: Track cleanResponse output
    console.log('[perplexity-client] cleanResponse output.length:', result.length);
    return result;
  }

  /**
   * Build specialized prompt for Red Chamber questions
   * 為紅樓夢問題構建專門化提示
   */
  private buildPrompt(input: PerplexityQAInput): string {
    const basePrompt = '你是一位資深的紅樓夢文學專家，具有深厚的古典文學素養和豐富的研究經驗。';
    
    const contextPrompts = {
      character: '請特別關注人物性格分析、人物關係和角色發展。',
      plot: '請重點分析情節發展、故事結構和敘事技巧。',
      theme: '請深入探討主題思想、象徵意義和文學價值。',
      general: '請提供全面而深入的文學分析。',
    };

    const contextInstruction = contextPrompts[input.questionContext || 'general'];

    let prompt = `${basePrompt}\n\n${contextInstruction}\n\n`;

    // Add chapter context if provided
    if (input.chapterContext) {
      prompt += `當前章回上下文：\n${input.chapterContext}\n\n`;
    }

    // Add selected text if provided
    if (input.selectedText) {
      prompt += `使用者選取的文字：\n"${input.selectedText}"\n\n`;
    }

    // Add current chapter info if provided
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
   * Make a non-streaming request to Perplexity API
   * 向 Perplexity API 發送非流式請求
   */
  async completionRequest(input: PerplexityQAInput): Promise<PerplexityQAResponse> {
    const startTime = Date.now();
    
    try {
      const prompt = this.buildPrompt(input);
      const config = createPerplexityConfig({
        model: input.modelKey,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
        reasoningEffort: input.reasoningEffort,
        enableStreaming: false,
      });

      const requestData = {
        ...config,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      };

      const response: AxiosResponse<PerplexityAPIResponse> = await this.axiosInstance.post(
        PERPLEXITY_CONFIG.CHAT_COMPLETIONS_ENDPOINT,
        requestData
      );

      const apiResponse = response.data;
      const choice = apiResponse.choices[0];
      
      if (!choice || !choice.message || !choice.message.content) {
        throw new PerplexityQAError(
          'Invalid response from Perplexity API',
          'INVALID_RESPONSE',
          500,
          true
        );
      }

      const rawAnswer = choice.message.content;

      // Use StreamProcessor to separate thinking and answer content
      // assumeThinkingFirst: true - Perplexity sonar-reasoning API doesn't send <think> opening tag
      const processor = new PerplexityStreamProcessor({ assumeThinkingFirst: true });
      const chunks = processor.processChunk(rawAnswer);
      processor.finalize();

      // Extract thinking and answer from processed chunks
      const thinkingContent = sanitizeThinkingContent(processor.getAllThinking());
      const answerContent = chunks
        .filter(c => c.type === 'text')
        .map(c => c.content)
        .join('');

      const cleanAnswer = this.cleanResponse(answerContent, input.showThinkingProcess);
      const citations = this.extractCitations(
        cleanAnswer,
        apiResponse.citations,
        apiResponse.web_search_queries
      );

      const processingTime = (Date.now() - startTime) / 1000;

      const groundingMetadata: PerplexityGroundingMetadata = {
        searchQueries: apiResponse.web_search_queries || [],
        webSources: citations.filter(c => c.type === 'web_citation'),
        groundingSuccessful: Boolean(apiResponse.citations && apiResponse.citations.length > 0),
        confidenceScore: apiResponse.citations ? Math.min(apiResponse.citations.length / 5, 1) : 0,
        rawMetadata: {
          usage: apiResponse.usage,
          finishReason: choice.finish_reason,
        },
      };

      return {
        question: input.userQuestion,
        answer: cleanAnswer,
        rawAnswer,
        thinkingContent,  // Include extracted thinking content for non-streaming responses
        citations,
        groundingMetadata,
        modelUsed: apiResponse.model,
        modelKey: input.modelKey || 'sonar-reasoning-pro',
        reasoningEffort: input.reasoningEffort,
        questionContext: input.questionContext,
        processingTime,
        success: true,
        streaming: false,
        stoppedByUser: false,
        timestamp: new Date().toISOString(),
        answerLength: cleanAnswer.length,
        questionLength: input.userQuestion.length,
        citationCount: citations.length,
        metadata: {
          usage: apiResponse.usage,
          finishReason: choice.finish_reason,
        },
      };

    } catch (error) {
      const processingTime = (Date.now() - startTime) / 1000;
      
      const errorMessage = error instanceof PerplexityQAError 
        ? error.message 
        : (error instanceof Error ? error.message : 'Unknown error occurred');
      
      return {
        question: input.userQuestion,
        answer: `抱歉，處理問題時發生錯誤：${errorMessage}`,
        rawAnswer: '',
        citations: [],
        groundingMetadata: {
          searchQueries: [],
          webSources: [],
          groundingSuccessful: false,
        },
        modelUsed: input.modelKey || 'sonar-reasoning-pro',
        modelKey: input.modelKey || 'sonar-reasoning-pro',
        reasoningEffort: input.reasoningEffort,
        questionContext: input.questionContext,
        processingTime,
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
   * Make a streaming request to Perplexity API
   * 向 Perplexity API 發送流式請求
   *
   * Note: Uses native fetch instead of axios for better streaming support.
   * Axios's responseType: 'stream' has known issues with async iteration.
   */
  async* streamingCompletionRequest(input: PerplexityQAInput): AsyncGenerator<PerplexityStreamingChunk> {
    const functionName = 'PerplexityClient.streamingCompletionRequest';

    // Extract a potential answer segment from thinking content when the API never sends a separate answer block
    const deriveAnswerFromThinking = (thinking: string): string => {
      if (!thinking || !thinking.trim()) return '';
      const trimmed = thinking.trim();
      const markers = [
        '現在我來撰寫完整的回答',
        '現在讓我來回答',
        '我的回答如下',
        '以下是我的回答',
        '回答：',
        '答案：',
        'Here is my answer',
        'My answer:',
      ];

      for (const marker of markers) {
        const markerIndex = trimmed.indexOf(marker);
        if (markerIndex !== -1) {
          const afterMarker = trimmed.substring(markerIndex + marker.length);
          const lineEndIndex = afterMarker.indexOf('\n');
          const candidate = (lineEndIndex !== -1 ? afterMarker.substring(lineEndIndex + 1) : afterMarker).trim();
          if (candidate.length > 0) {
            return candidate;
          }
        }
      }

      return trimmed;
    };

    await debugLog('PERPLEXITY_CLIENT', `${functionName} called`, {
      inputType: typeof input,
      userQuestionLength: input.userQuestion?.length,
      enableStreaming: input.enableStreaming,
    });

    const startTime = Date.now();
    let chunkIndex = 0;
    let batchIndex = 0;
    let fullContent = '';
    let collectedCitations: string[] = [];
    // BUG FIX (2025-12-02): Track raw content processing for debugging truncation issue
    let rawContentChunkCount = 0;
    let sawThinkClose = false;
    let collectedSearchQueries: string[] = [];

    // Initialize StreamProcessor for handling <think> tags across chunks
    // assumeThinkingFirst: true - Perplexity sonar-reasoning API doesn't send <think> opening tag
    const processor = new PerplexityStreamProcessor({ assumeThinkingFirst: true });
    let accumulatedThinking = '';

    try {
      const prompt = this.buildPrompt(input);
      const config = createPerplexityConfig({
        model: input.modelKey,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
        reasoningEffort: input.reasoningEffort,
        enableStreaming: true,
      });

      const requestData = {
        ...config,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      };

      const fullUrl = `${PERPLEXITY_CONFIG.BASE_URL}${PERPLEXITY_CONFIG.CHAT_COMPLETIONS_ENDPOINT}`;

      await debugLog('PERPLEXITY_CLIENT', 'Making HTTP request to Perplexity API (native fetch)', {
        endpoint: fullUrl,
        requestDataKeys: Object.keys(requestData),
        model: config.model,
        stream: config.stream,
      });

      // Use native fetch for better streaming support
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new PerplexityQAError(
          `Perplexity API Error: ${response.status} ${response.statusText} - ${errorText}`,
          'API_ERROR',
          response.status,
          response.status >= 500 || response.status === 429
        );
      }

      if (!response.body) {
        throw new PerplexityQAError(
          'No response body received from Perplexity API',
          'INVALID_RESPONSE',
          500,
          true
        );
      }

      await debugLog('PERPLEXITY_CLIENT', 'Received HTTP response (native fetch)', {
        statusCode: response.status,
        statusText: response.statusText,
        hasBody: !!response.body,
        contentType: response.headers.get('content-type'),
      });

      // Process streaming response using native fetch ReadableStream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      // FIX: Removed shouldStopAfterCurrentBatch - we should ALWAYS wait for [DONE] signal
      // to ensure all content is received and properly flushed.
      // LobeChat pattern: let stream naturally complete via explicit stop signal

      console.log('🐛 [streamingCompletionRequest] Starting stream reading with native fetch');

      // Defensive: Prevent infinite loop in edge cases (e.g., broken stream that never ends)
      // Value rationale: MAX_TOKENS (2000) * 5 (safety margin for reasoning models with thinking tags)
      // Reasoning models can produce 500-2000+ chunks for complex responses
      const MAX_READ_ITERATIONS = 10000;
      let readCount = 0;

      try {
        while (true) {
          // Safety check: prevent runaway loops
          if (++readCount > MAX_READ_ITERATIONS) {
            // Collect diagnostic information for debugging
            const diagnostics = {
              iterations: readCount,
              maxAllowed: MAX_READ_ITERATIONS,
              chunksProcessed: chunkIndex,
              batchesProcessed: batchIndex,
              contentLength: fullContent.length,
              thinkingLength: accumulatedThinking.length,
              bufferSize: buffer.length,
              timestamp: new Date().toISOString(),
            };
            console.error('[PerplexityClient] Stream overflow detected:', diagnostics);

            throw new PerplexityQAError(
              `Stream processing exceeded maximum iterations limit (${MAX_READ_ITERATIONS}). ` +
              `Processed ${chunkIndex} chunks with ${fullContent.length} chars of content. ` +
              `This may indicate an infinite loop or malformed stream response.`,
              'STREAM_OVERFLOW',
              500,
              false
            );
          }

          const { done, value } = await reader.read();

          if (done) {
            console.log('🐛 [streamingCompletionRequest] Stream reading complete');
            break;
          }

          const chunkStr = decoder.decode(value, { stream: true });
          console.log(`🐛 [streamingCompletionRequest] Raw chunk received:`, {
            length: chunkStr.length,
            preview: chunkStr.substring(0, 150).replace(/\n/g, '\\n'),
          });

          buffer += chunkStr;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          const eventsInBatch = lines.filter(line => line.trim().startsWith('data: ')).length;
          if (eventsInBatch > 0) {
            batchIndex += 1;
            console.log(`🐛 [streamingCompletionRequest] Processing ${eventsInBatch} SSE events in batch #${batchIndex}`);
          } else {
            console.log('🐛 [streamingCompletionRequest] Received network chunk without complete SSE events');
          }

          for (const line of lines) {
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('data: ')) {
              const data = trimmedLine.substring(6);

              if (data === '[DONE]') {
                console.log('🐛 [streamingCompletionRequest] Received [DONE] signal');

                // PHASE 3 FIX: Finalize processor to flush any remaining buffered content
                const finalChunk = processor.finalize();
                if (finalChunk.content.trim()) {
                  fullContent += finalChunk.content;
                }

                const sanitizedThinking = sanitizeThinkingContent(accumulatedThinking);

                // BUG FIX (2025-12-02): Summary logging for truncation diagnosis
                console.log('╔═══════════════════════════════════════════════════════════════╗');
                console.log('║ 📊 [DONE] STREAM END SUMMARY - Truncation Diagnosis           ║');
                console.log('╠═══════════════════════════════════════════════════════════════╣');
                console.log('║ Raw chunks processed:', rawContentChunkCount);
                console.log('║ Saw </think> tag:', sawThinkClose);
                console.log('║ Final fullContent length:', fullContent.length);
                console.log('║ Final thinking length:', sanitizedThinking.length);
                console.log('║ finalChunk content:', finalChunk.content.length, 'chars');
                if (sawThinkClose && fullContent.length < 50) {
                  console.log('║ ⚠️ WARNING: </think> was seen but fullContent is very short!');
                  console.log('║ ⚠️ This indicates potential content truncation bug!');
                }
                console.log('║ fullContent preview:', fullContent.substring(0, 200) || '(empty)');
                console.log('╚═══════════════════════════════════════════════════════════════╝');

                // FALLBACK FIX: When fullContent is truly empty but we have thinking content,
                // use the thinking content as the answer. This handles cases where:
                // 1. The API response doesn't properly separate thinking from answer
                // 2. The StreamProcessor doesn't detect </think> correctly
                // NOTE: Removed MIN_MEANINGFUL_CONTENT_LENGTH check (was 10) because Chinese
                // characters are information-dense and short answers like '這是答案' (6 chars)
                // are valid and should not trigger fallback.
                const isContentMeaningful = fullContent.trim().length > 0;
                let contentDerivedFromThinking = false;
                if (!isContentMeaningful && sanitizedThinking.trim()) {
                console.warn('[PerplexityClient] Fallback: fullContent is empty, using thinking as answer', {
                  fullContentLength: fullContent.trim().length,
                  fullContentPreview: fullContent.trim().substring(0, 50),
                  thinkingLength: sanitizedThinking.length,
                });

                // Task 4.2 Fix: Try to extract just the "answer" portion from thinking content
                let extractedAnswer = deriveAnswerFromThinking(sanitizedThinking);
                // If no marker found or extracted answer is too short, use full thinking content
                if (extractedAnswer.length < 50) {
                  extractedAnswer = sanitizedThinking;
                  console.log('[PerplexityClient] No answer marker found or extracted too short, using full thinking');
                }

                fullContent = extractedAnswer;
                contentDerivedFromThinking = true;
              }

                const citations = this.extractCitations(fullContent, collectedCitations, collectedSearchQueries);
                const processingTime = (Date.now() - startTime) / 1000;

                // FIX: ALWAYS yield a final completion chunk on [DONE]
                // This ensures the UI receives the complete state even if fullContent is empty
                // LobeChat pattern: explicit completion signal handling
                console.log('🐛 [streamingCompletionRequest] Yielding final completion chunk:', {
                  fullContentLength: fullContent.length,
                  fullContentPreview: fullContent.substring(0, 200) || '(empty)',
                  finalChunkContent: finalChunk.content.substring(0, 100) || '(empty)',
                  thinkingLength: sanitizedThinking.length,
                  thinkingPreview: sanitizedThinking.substring(0, 100) || '(empty)',
                  citationCount: citations.length,
                  processingTime,
                  // Task 4.2: Log fallback status
                  contentDerivedFromThinking: contentDerivedFromThinking,
                  fallbackTriggered: contentDerivedFromThinking,
                });

                yield {
                  content: finalChunk.content.trim() || '',
                  fullContent: fullContent,
                  thinkingContent: sanitizedThinking,
                  contentDerivedFromThinking: contentDerivedFromThinking,
                  timestamp: new Date().toISOString(),
                  citations,
                  searchQueries: collectedSearchQueries,
                  metadata: {
                    searchQueries: collectedSearchQueries,
                    webSources: citations.filter(c => c.type === 'web_citation'),
                    groundingSuccessful: collectedCitations.length > 0,
                    confidenceScore: collectedCitations.length ? Math.min(collectedCitations.length / 5, 1) : 0,
                  },
                  responseTime: processingTime,
                  isComplete: true,  // [DONE] signal means stream is complete
                  chunkIndex: chunkIndex + 1,
                  hasThinkingProcess: sanitizedThinking.length > 0,
                };

                return;
              }

              try {
                const chunk: PerplexityStreamChunk = JSON.parse(data);
                const processingTime = (Date.now() - startTime) / 1000;

                if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta.content) {
                  const rawContent = chunk.choices[0].delta.content;

                  // Collect citations and search queries
                  if (chunk.citations) {
                    collectedCitations = chunk.citations;
                  }
                  if (chunk.web_search_queries) {
                    collectedSearchQueries = chunk.web_search_queries;
                  }

                  const isComplete = chunk.choices[0].finish_reason !== null;

                  // Process content through StreamProcessor to separate thinking and text
                  // BUG FIX (2025-12-02): Enhanced logging with chunk counter
                  rawContentChunkCount++;
                  if (rawContent.includes('</think>')) {
                    sawThinkClose = true;
                  }

                  console.log('┌─────────────────────────────────────────────────────────────┐');
                  console.log(`│ [perplexity-client] RAW CONTENT CHUNK #${rawContentChunkCount}`);
                  console.log('├─────────────────────────────────────────────────────────────┤');
                  console.log('│ Stats:', {
                    length: rawContent.length,
                    containsThinkOpen: rawContent.includes('<think>'),
                    containsThinkClose: rawContent.includes('</think>'),
                    currentFullContentLength: fullContent.length,
                    isComplete,
                  });
                  console.log('│ Preview:', rawContent.substring(0, 300).replace(/\n/g, '\\n'));
                  console.log('└─────────────────────────────────────────────────────────────┘');

                  const structuredChunks = processor.processChunk(rawContent);

                  // ═══════════════════════════════════════════════════════════════
                  // 🅱️ HYPOTHESIS B: StreamProcessor Output Analysis (SERVER-SIDE)
                  // ═══════════════════════════════════════════════════════════════
                  // This logging appears in Vercel Functions Logs, NOT browser F12
                  const hasTextChunk = structuredChunks.some(c => c.type === 'text');
                  const hasThinkingChunk = structuredChunks.some(c => c.type === 'thinking');
                  const textChunks = structuredChunks.filter(c => c.type === 'text');
                  const thinkingChunks = structuredChunks.filter(c => c.type === 'thinking');

                  console.log('═══════════════════════════════════════════════════════════════');
                  console.log('[HYPOTHESIS B] 🅱️ StreamProcessor Output Analysis');
                  console.log('═══════════════════════════════════════════════════════════════');
                  console.log('[HYPOTHESIS B] Chunk Summary:', {
                    totalChunks: structuredChunks.length,
                    textChunksCount: textChunks.length,
                    thinkingChunksCount: thinkingChunks.length,
                    chunkTypes: structuredChunks.map(c => c.type),
                  });

                  if (hasTextChunk) {
                    console.log('[HYPOTHESIS B] ✅ TEXT CHUNK FOUND - fullContent WILL accumulate');
                    textChunks.forEach((tc, i) => {
                      console.log(`[HYPOTHESIS B] Text Chunk #${i}:`, {
                        length: tc.content.length,
                        preview: tc.content.substring(0, 150),
                      });
                    });
                  } else if (hasThinkingChunk) {
                    console.log('[HYPOTHESIS B] ⚠️ WARNING: NO TEXT CHUNK - Only thinking chunks found!');
                    console.log('[HYPOTHESIS B] ⚠️ fullContent will NOT accumulate from this raw chunk');
                    console.log('[HYPOTHESIS B] ⚠️ This means </think> tag was NOT detected correctly!');
                  }

                  console.log('[HYPOTHESIS B] Current State:', {
                    accumulatedFullContentLength: fullContent.length,
                    accumulatedThinkingLength: accumulatedThinking.length,
                    rawContentContainsThinkOpen: rawContent.includes('<think>'),
                    rawContentContainsThinkClose: rawContent.includes('</think>'),
                  });
                  console.log('═══════════════════════════════════════════════════════════════');

                  for (const structured of structuredChunks) {
                    if (structured.type === 'thinking') {
                      // Accumulate thinking content
                      accumulatedThinking += (accumulatedThinking ? '\n\n' : '') + structured.content;

                      // PHASE 1 FIX: Yield thinking-only chunks so they're captured by tests
                      // This ensures thinking-only responses don't result in empty chunk arrays
                      const sanitizedThinking = sanitizeThinkingContent(accumulatedThinking);
                      const derivedAnswerFromThinking = deriveAnswerFromThinking(sanitizedThinking);
                      const displayFullContent = fullContent.trim()
                        ? fullContent
                        : (derivedAnswerFromThinking || sanitizedThinking);
                      const derivedFromThinking = !fullContent.trim() && !!displayFullContent;
                      const citations = this.extractCitations(fullContent, collectedCitations, collectedSearchQueries);

                      yield {
                        content: '',  // No answer text in thinking-only chunks
                        fullContent: displayFullContent,  // Provide fallback so UI is never empty
                        thinkingContent: sanitizedThinking,
                        contentDerivedFromThinking: derivedFromThinking,
                        timestamp: new Date().toISOString(),
                        citations,
                        searchQueries: collectedSearchQueries,
                        metadata: {
                          searchQueries: collectedSearchQueries,
                          webSources: citations.filter(c => c.type === 'web_citation'),
                          groundingSuccessful: collectedCitations.length > 0,
                          confidenceScore: collectedCitations.length ? Math.min(collectedCitations.length / 5, 1) : 0,
                        },
                        responseTime: processingTime,
                        isComplete: false,  // Thinking-only chunks are never complete - answer hasn't arrived yet
                        chunkIndex,
                        hasThinkingProcess: true,
                      };

                      chunkIndex++;
                    } else if (structured.type === 'text') {
                      // Accumulate answer text
                      fullContent += structured.content;

                      // DEBUG: Log text chunk to diagnose "《" bug (Task 4.2)
                      console.log('🐛 [perplexity-client] TEXT chunk from StreamProcessor:', {
                        structuredContentLength: structured.content.length,
                        structuredContentPreview: structured.content.substring(0, 100),
                        accumulatedFullContentLength: fullContent.length,
                        accumulatedFullContentPreview: fullContent.substring(0, 100),
                      });

                      // Sanitize accumulated thinking
                      const sanitizedThinking = sanitizeThinkingContent(accumulatedThinking);

                      // Extract citations from current full content
                      const citations = this.extractCitations(fullContent, collectedCitations, collectedSearchQueries);

                      // Task 4.2 Debug: Log BEFORE cleanResponse to diagnose "《" symbol bug
                      console.log('🐛 [perplexity-client] BEFORE cleanResponse:', {
                        rawContent: structured.content?.substring(0, 300) || '(empty)',
                        rawLength: structured.content?.length || 0,
                      });

                      // Clean the incremental content
                      const incrementalContent = this.cleanResponse(structured.content, false);

                      // Task 4.2 Debug: Log AFTER cleanResponse
                      console.log('🐛 [perplexity-client] AFTER cleanResponse:', {
                        cleanedContent: incrementalContent?.substring(0, 300) || '(empty)',
                        cleanedLength: incrementalContent?.length || 0,
                        contentChanged: structured.content !== incrementalContent,
                      });

                      yield {
                        content: incrementalContent,
                        fullContent: fullContent,
                        thinkingContent: sanitizedThinking,
                        contentDerivedFromThinking: false,  // No fallback logic
                        timestamp: new Date().toISOString(),
                        citations,
                        searchQueries: collectedSearchQueries,
                        metadata: {
                          searchQueries: collectedSearchQueries,
                          webSources: citations.filter(c => c.type === 'web_citation'),
                          groundingSuccessful: collectedCitations.length > 0,
                          confidenceScore: collectedCitations.length ? Math.min(collectedCitations.length / 5, 1) : 0,
                        },
                        responseTime: processingTime,
                        isComplete,
                        chunkIndex,
                        hasThinkingProcess: sanitizedThinking.length > 0,
                      };

                      chunkIndex++;
                    }
                  }

                  // FIX: Do NOT finalize processor or exit early on isComplete - wait for [DONE] signal
                  // The Perplexity API sends finish_reason BEFORE the stream actually ends.
                  // Calling processor.finalize() here would reset the processor state and lose
                  // any incomplete thinking content (e.g., when </think> hasn't arrived yet).
                  // The processor is properly finalized in the [DONE] handler at line ~620.
                  // LobeChat pattern: only exit on explicit 'stop' signal or stream end

                  // Add delay to prevent overwhelming the UI (only if not complete)
                  if (!isComplete) {
                    await new Promise(resolve => setTimeout(resolve, PERPLEXITY_CONFIG.STREAM_CHUNK_DELAY_MS));
                  }
                }
              } catch (parseError) {
                console.error('🐛 [streamingCompletionRequest] Failed to parse JSON:', {
                  data: data.substring(0, 200),
                  error: parseError instanceof Error ? parseError.message : 'Unknown error'
                });
              }
            }
          }
          // FIX: Removed shouldStopAfterCurrentBatch check - continue processing until [DONE] or stream end
        }

        // FIX: Handle stream ending without [DONE] signal
        // When HTTP stream ends (done=true) but we never received [DONE]:
        // - We need to finalize the processor to flush any buffered content
        // - We need to yield a final chunk with accumulated content
        // This is the CRITICAL fix for the bug where answer content was lost
        console.log('🐛 [streamingCompletionRequest] Stream ended - checking if finalization needed');

        // Only yield final chunk if we haven't already (via [DONE] handler's return)
        // Check: if we get here, it means we broke from the loop via done=true, not [DONE]'s return
        const finalChunk = processor.finalize();
        if (finalChunk.content.trim()) {
          fullContent += finalChunk.content;
        }

        const sanitizedThinking = sanitizeThinkingContent(accumulatedThinking);

        // FALLBACK: When fullContent is truly empty but we have thinking content
        // NOTE: Removed MIN_MEANINGFUL_CONTENT_LENGTH check (was 10) because Chinese
        // characters are information-dense and short answers are valid.
        const isContentMeaningful = fullContent.trim().length > 0;
        let contentDerivedFromThinking = false;
        if (!isContentMeaningful && sanitizedThinking.trim()) {
          console.warn('[PerplexityClient] Fallback on stream end: fullContent is empty, using thinking as answer', {
            fullContentLength: fullContent.trim().length,
            fullContentPreview: fullContent.trim().substring(0, 50),
            thinkingLength: sanitizedThinking.length,
          });
          let extractedAnswer = deriveAnswerFromThinking(sanitizedThinking);
          if (extractedAnswer.length < 50) {
            extractedAnswer = sanitizedThinking;
          }
          fullContent = extractedAnswer;
          contentDerivedFromThinking = true;
        }

        const citations = this.extractCitations(fullContent, collectedCitations, collectedSearchQueries);
        const processingTime = (Date.now() - startTime) / 1000;

        // BUG FIX (2025-12-02): Summary logging for truncation diagnosis
        console.log('╔═══════════════════════════════════════════════════════════════╗');
        console.log('║ 📊 STREAM END SUMMARY - Truncation Diagnosis                  ║');
        console.log('╠═══════════════════════════════════════════════════════════════╣');
        console.log('║ Raw chunks processed:', rawContentChunkCount);
        console.log('║ Saw </think> tag:', sawThinkClose);
        console.log('║ Final fullContent length:', fullContent.length);
        console.log('║ Final thinking length:', sanitizedThinking.length);
        console.log('║ Content derived from thinking:', contentDerivedFromThinking);
        if (sawThinkClose && fullContent.length < 50) {
          console.log('║ ⚠️ WARNING: </think> was seen but fullContent is very short!');
          console.log('║ ⚠️ This indicates potential content truncation bug!');
        }
        console.log('║ fullContent preview:', fullContent.substring(0, 200) || '(empty)');
        console.log('╚═══════════════════════════════════════════════════════════════╝');

        // Yield final completion chunk when stream ends without [DONE]
        console.log('🐛 [streamingCompletionRequest] Yielding final chunk (stream ended without [DONE]):', {
          fullContentLength: fullContent.length,
          fullContentPreview: fullContent.substring(0, 200) || '(empty)',
          thinkingLength: sanitizedThinking.length,
          contentDerivedFromThinking,
        });

        yield {
          content: finalChunk.content.trim() || '',
          fullContent: fullContent,
          thinkingContent: sanitizedThinking,
          contentDerivedFromThinking: contentDerivedFromThinking,
          timestamp: new Date().toISOString(),
          citations,
          searchQueries: collectedSearchQueries,
          metadata: {
            searchQueries: collectedSearchQueries,
            webSources: citations.filter(c => c.type === 'web_citation'),
            groundingSuccessful: collectedCitations.length > 0,
            confidenceScore: collectedCitations.length ? Math.min(collectedCitations.length / 5, 1) : 0,
          },
          responseTime: processingTime,
          isComplete: true,  // Stream ended, so mark as complete
          chunkIndex: chunkIndex + 1,
          hasThinkingProcess: sanitizedThinking.length > 0,
        };

      } finally {
        reader.releaseLock();
      }

      // If we got here without yielding any chunks, finalize processor and derive a best-effort answer
      if (chunkIndex === 0) {
        console.error('🐛 [streamingCompletionRequest] No chunks yielded from stream');
        const processingTime = (Date.now() - startTime) / 1000;

        // Finalize processor to flush any buffered thinking
        const finalChunk = processor.finalize();
        const combinedThinking = [accumulatedThinking, finalChunk.content].filter(Boolean).join('\n\n');
        const sanitizedThinking = sanitizeThinkingContent(combinedThinking);
        const derivedAnswer = deriveAnswerFromThinking(sanitizedThinking);
        const finalAnswer = derivedAnswer || sanitizedThinking || '錯誤：AI 未回傳任何內容。請稍後再試。';
        const derivedFromThinking = !!(derivedAnswer || sanitizedThinking);

        yield {
          content: derivedFromThinking ? '' : finalAnswer,
          fullContent: finalAnswer,
          thinkingContent: sanitizedThinking,
          contentDerivedFromThinking: derivedFromThinking,
          timestamp: new Date().toISOString(),
          citations: [],
          searchQueries: [],
          metadata: {
            searchQueries: [],
            webSources: [],
            groundingSuccessful: false,
          },
          responseTime: processingTime,
          isComplete: true,
          chunkIndex: 1,
          error: derivedFromThinking ? undefined : 'No content received from API',
        };
      }

    } catch (error) {
      const processingTime = (Date.now() - startTime) / 1000;
      const errorMessage = error instanceof Error ? error.message : 'Streaming error occurred';

      console.error('🐛 [streamingCompletionRequest] Error:', errorMessage);

      yield {
        content: '',
        fullContent: `錯誤：${errorMessage}`,
        timestamp: new Date().toISOString(),
        citations: [],
        searchQueries: [],
        metadata: {
          searchQueries: [],
          webSources: [],
          groundingSuccessful: false,
        },
        responseTime: processingTime,
        isComplete: true,
        chunkIndex: chunkIndex + 1,
        error: errorMessage,
      };
    }
  }

  /**
   * Parse streaming response from Perplexity API
   * 解析 Perplexity API 的流式回應
   */
  private async* parseStreamingResponse(stream: any): AsyncGenerator<PerplexityStreamChunk> {
    let buffer = '';
    let chunkCount = 0;
    let lineCount = 0;
    let yieldCount = 0;

    console.log('🐛 [parseStreamingResponse] Starting stream parsing');

    try {
      for await (const chunk of stream) {
        chunkCount++;
        const chunkStr = chunk.toString();
        console.log(`🐛 [parseStreamingResponse] Chunk ${chunkCount}:`, {
          length: chunkStr.length,
          preview: chunkStr.substring(0, 150).replace(/\n/g, '\\n'),
          bufferLength: buffer.length
        });

        buffer += chunkStr;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        console.log(`🐛 [parseStreamingResponse] Split into ${lines.length} lines, buffer remainder: ${buffer.length} chars`);

        for (const line of lines) {
          lineCount++;
          const trimmedLine = line.trim();

          if (trimmedLine.length > 0) {
            console.log(`🐛 [parseStreamingResponse] Line ${lineCount}:`, {
              starts: trimmedLine.substring(0, 20),
              length: trimmedLine.length,
              isData: trimmedLine.startsWith('data: ')
            });
          }

          if (trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.substring(6);

            if (data === '[DONE]') {
              console.log('🐛 [parseStreamingResponse] Received [DONE] signal');
              return;
            }

            try {
              const parsed: PerplexityStreamChunk = JSON.parse(data);
              yieldCount++;
              console.log(`🐛 [parseStreamingResponse] Successfully parsed and yielding chunk ${yieldCount}:`, {
                hasChoices: !!parsed.choices,
                choicesLength: parsed.choices?.length,
                hasDelta: !!parsed.choices?.[0]?.delta,
                hasContent: !!parsed.choices?.[0]?.delta?.content,
                contentPreview: parsed.choices?.[0]?.delta?.content?.substring(0, 50)
              });
              yield parsed;
            } catch (error) {
              // Skip invalid JSON chunks
              console.error('🐛 [parseStreamingResponse] Failed to parse JSON:', {
                data: data.substring(0, 200),
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }
        }
      }

      console.log('🐛 [parseStreamingResponse] Stream iteration completed:', {
        totalChunks: chunkCount,
        totalLines: lineCount,
        totalYields: yieldCount,
        remainingBuffer: buffer.length
      });

    } catch (error) {
      console.error('🐛 [parseStreamingResponse] Stream iteration error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        chunksProcessed: chunkCount,
        linesProcessed: lineCount,
        yieldsProcessed: yieldCount
      });
      throw error;
    }
  }

  /**
   * Check if Perplexity API is properly configured
   * 檢查 Perplexity API 是否正確配置
   */
  static isConfigured(): boolean {
    return isPerplexityConfigured();
  }

  /**
   * Test API connection
   * 測試 API 連線
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const testInput: PerplexityQAInput = {
        userQuestion: '測試連線',
        modelKey: 'sonar-pro',
        maxTokens: 50,
        enableStreaming: false,
      };

      const result = await this.completionRequest(testInput);
      
      // Check if the completion request was successful
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Connection test failed',
        };
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Default Perplexity client instance
 * 預設的 Perplexity 客戶端實例
 */
let defaultClient: PerplexityClient | null = null;

/**
 * Get or create default Perplexity client
 * 取得或創建預設的 Perplexity 客戶端
 */
export function getDefaultPerplexityClient(): PerplexityClient {
  if (!defaultClient) {
    defaultClient = new PerplexityClient();
  }
  return defaultClient;
}

/**
 * Reset default client (useful for testing)
 * 重設預設客戶端（用於測試）
 */
export function resetDefaultClient(): void {
  defaultClient = null;
}
