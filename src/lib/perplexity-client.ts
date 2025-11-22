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
 * 系統提示文字：當 API 僅回傳思考內容時，提供友善回饋
 */
const THINKING_ONLY_FALLBACK_PREFIX =
  '⚠️ 系統僅收到 AI 的思考內容，以下為原始推理紀錄：';

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
   * Parse reasoning response according to official Perplexity documentation
   * Official format: <think>reasoning process...</think>\nActual answer here
   *
   * Reference: docs/tech_docs/Sonar_reasoning_-_Perplexity.md (Line 117)
   * @param text - Raw response text from Perplexity API
   * @returns Separated thinking and answer content
   */
  private parseReasoningResponse(text: string): { thinking: string; answer: string } {
    if (!text) return { thinking: '', answer: '' };

    // Step 1: Extract all complete <think>...</think> tags as thinking content
    const completeThinkMatches = Array.from(text.matchAll(/<think>([\s\S]*?)<\/think>/g));
    let thinking = completeThinkMatches
      .map(m => (m[1] || '').trim())
      .join('\n\n')
      .trim();

    // Step 1.5: Handle incomplete <think> tags during streaming
    // When streaming, we may receive "<think>\n我" before the closing tag
    if (!thinking) {
      const incompleteThinkMatch = text.match(/<think[^>]*>([\s\S]*?)$/);
      if (incompleteThinkMatch && incompleteThinkMatch[1]) {
        thinking = incompleteThinkMatch[1].trim();
      }
    }

    // Step 2: Remove all <think> tags - remaining content is the answer
    // This follows official format: answer is ALWAYS after </think> tag
    let answer = text
      .replace(/<think>[\s\S]*?<\/think>/g, '')  // Remove complete tags
      .replace(/<think[^>]*>[\s\S]*?$/g, '')     // Remove incomplete tags (during streaming)
      .trim();

    // Step 3: Sanitize thinking content (remove HTML, markdown, etc.)
    const sanitizedThinking = sanitizeThinkingContent(thinking);

    return {
      thinking: sanitizedThinking || thinking,
      answer
    };
  }

  /**
   * Clean HTML tags and process thinking tags
   * 清理 HTML 標籤並處理思考標籤
   */
  private cleanResponse(text: string, showThinking: boolean = true): string {
    if (!text) return '';

    let cleanText = text;

    // Always remove <think> tags from the answer text; thinking will be sent separately
    const thinkPattern = /<think>([\s\S]*?)<\/think>/gs;
    cleanText = cleanText.replace(thinkPattern, '');
    const incompleteThinkPattern = /<think[^>]*>([\s\S]*?)(?=<(?!\/?think)|$)/gs;
    cleanText = cleanText.replace(incompleteThinkPattern, '');

    // Clean other HTML tags
    const htmlPatterns = [
      /<div[^>]*>/gi, /<\/div>/gi,
      /<small[^>]*>/gi, /<\/small>/gi,
      /<strong[^>]*>/gi, /<\/strong>/gi,
      /<span[^>]*>/gi, /<\/span>/gi,
      /<p[^>]*>/gi, /<\/p>/gi,
      /<br[^>]*\/?>/gi,
      /<think[^>]*>/gi, /<\/think>/gi,
      /<\/?[a-zA-Z][^>]*>/gi, // Clean any remaining HTML tags
    ];

    htmlPatterns.forEach(pattern => {
      cleanText = cleanText.replace(pattern, '');
    });

    // Clean multiple newlines and spaces
    cleanText = cleanText.replace(/\n\s*\n\s*\n/g, '\n\n');
    cleanText = cleanText.replace(/[ \t]+/g, ' ');

    return cleanText.trim();
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
      const cleanAnswer = this.cleanResponse(rawAnswer, input.showThinkingProcess);
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
    let collectedSearchQueries: string[] = [];

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
        model: requestData.model,
        stream: requestData.stream,
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
      let shouldStopAfterCurrentBatch = false;

      console.log('🐛 [streamingCompletionRequest] Starting stream reading with native fetch');

      try {
        while (true) {
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
                return;
              }

              try {
                const chunk: PerplexityStreamChunk = JSON.parse(data);
                const processingTime = (Date.now() - startTime) / 1000;
                chunkIndex++;

                if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta.content) {
                  const content = chunk.choices[0].delta.content;
                  fullContent += content;

                  // Enhanced diagnostic logging - log raw content for debugging
                  if (chunkIndex % 5 === 1 || fullContent.includes('</think>')) {
                    console.log(`🔍 [RAW CONTENT] Chunk ${chunkIndex}:`, {
                      totalLength: fullContent.length,
                      preview: fullContent.substring(0, 200).replace(/\n/g, '\\n'),
                      hasOpenTag: fullContent.includes('<think>'),
                      hasCloseTag: fullContent.includes('</think>'),
                      openTagCount: (fullContent.match(/<think>/g) || []).length,
                      closeTagCount: (fullContent.match(/<\/think>/g) || []).length,
                    });
                  }

                  // Collect citations and search queries
                  if (chunk.citations) {
                    collectedCitations = chunk.citations;
                  }
                  if (chunk.web_search_queries) {
                    collectedSearchQueries = chunk.web_search_queries;
                  }

                  const citations = this.extractCitations(fullContent, collectedCitations, collectedSearchQueries);
                  const isComplete = chunk.choices[0].finish_reason !== null;

                  // Parse reasoning response to separate thinking and answer (following official format)
                  const { thinking, answer } = this.parseReasoningResponse(fullContent);
                  const sanitizedThinking = sanitizeThinkingContent(thinking);

                  // Log 1: Parsing results for debugging (only in DEBUG mode)
                  if (DEBUG) {
                    console.log('🧠 [PARSE REASONING] Extraction results:', {
                      chunkIndex,
                      fullContentLength: fullContent.length,
                      hasThinkTags: fullContent.includes('<think>'),
                      completeThinkTags: (fullContent.match(/<think>[\s\S]*?<\/think>/g) || []).length,
                      extractedThinkingLength: thinking.length,
                      extractedAnswerLength: answer.length,
                      sanitizedThinkingLength: sanitizedThinking.length,
                      thinkingPreview: thinking.substring(0, 100).replace(/\n/g, '\\n') || '(empty)',
                      answerPreview: answer.substring(0, 100).replace(/\n/g, '\\n') || '(empty)',
                      fullContentPreview: fullContent.substring(0, 150).replace(/\n/g, '\\n'),
                    });
                  }

                  // Simplified logic based on official format: answer is always outside <think> tags
                  let incrementalContent = this.cleanResponse(content, false);
                  let aggregatedContent = answer || '';  // Answer from official format

                  const fallbackPayload = sanitizedThinking
                    ? `${THINKING_ONLY_FALLBACK_PREFIX}\n\n${sanitizedThinking}`
                    : '';

                  let contentDerivedFromThinking = false;

                  // Enhanced fallback logic based on official Perplexity API best practices
                  // Reference: docs.perplexity.ai error handling guidelines
                  // Based on web research: Chinese complete sentences need 6-8 chars (subject+verb+object)
                  const MIN_VALID_ANSWER_LENGTH = 6;  // Minimum for complete Chinese sentence (e.g., "她很聰明" = 6 chars)
                  const MIN_REASONABLE_THINKING_LENGTH = 6;  // Minimum for meaningful reasoning (e.g., "只有推理內容" = 6 chars)
                  const MAX_REASONABLE_THINKING_LENGTH = 5000;  // Maximum to avoid anomalies

                  const hasValidAnswer = aggregatedContent && aggregatedContent.trim().length >= MIN_VALID_ANSWER_LENGTH;
                  const hasReasonableThinking =
                    sanitizedThinking &&
                    sanitizedThinking.length >= MIN_REASONABLE_THINKING_LENGTH &&
                    sanitizedThinking.length <= MAX_REASONABLE_THINKING_LENGTH;

                  // Log 2: Validation checks for debugging (only in DEBUG mode)
                  if (DEBUG) {
                    console.log('🔍 [VALIDATION] Answer & Thinking Check:', {
                      chunkIndex,
                      isComplete,
                      // Answer validation
                      rawAnswerLength: answer.length,
                      aggregatedContentLength: aggregatedContent.trim().length,
                      MIN_VALID_ANSWER_LENGTH,
                      hasValidAnswer,
                      answerPreview: aggregatedContent.substring(0, 50).replace(/\n/g, '\\n'),
                      // Thinking validation
                      thinkingLength: sanitizedThinking?.length || 0,
                      MIN_REASONABLE_THINKING_LENGTH,
                      MAX_REASONABLE_THINKING_LENGTH,
                      hasReasonableThinking,
                      thinkingPreview: sanitizedThinking?.substring(0, 50).replace(/\n/g, '\\n') || '(none)',
                      // Decision path prediction
                      willUseFallback: isComplete && !hasValidAnswer && hasReasonableThinking,
                      willShowError: isComplete && !hasValidAnswer && !hasReasonableThinking,
                      willShowNormalAnswer: hasValidAnswer,
                    });
                  }

                  // Only apply fallback when stream is complete AND we have no valid answer
                  if (isComplete && !hasValidAnswer) {
                    // Log 3: Fallback decision path (only in DEBUG mode)
                    if (DEBUG) {
                      console.warn('⚠️ [FALLBACK LOGIC] No valid answer detected at completion:', {
                        answerLength: aggregatedContent.trim().length,
                        requiredMinLength: MIN_VALID_ANSWER_LENGTH,
                        deficit: MIN_VALID_ANSWER_LENGTH - aggregatedContent.trim().length,
                        hasThinking: !!sanitizedThinking,
                        thinkingLength: sanitizedThinking?.length || 0,
                      });
                    }

                    if (hasReasonableThinking) {
                      // Case 1: Has reasonable thinking but no answer → API anomaly, show fallback
                      if (DEBUG) {
                        console.log('✅ [FALLBACK] Using thinking content as fallback:', {
                          thinkingLength: sanitizedThinking.length,
                          thinkingIsInBounds: `${MIN_REASONABLE_THINKING_LENGTH} <= ${sanitizedThinking.length} <= ${MAX_REASONABLE_THINKING_LENGTH}`,
                          fallbackPayloadLength: fallbackPayload.length,
                        });
                      }

                      aggregatedContent = fallbackPayload;
                      incrementalContent = fallbackPayload;
                      contentDerivedFromThinking = true;

                      console.warn('[Perplexity API] Reasoning-only response detected', {
                        thinkingLength: sanitizedThinking.length,
                        answerLength: answer.length,
                        modelKey: input.modelKey,
                        fullContentPreview: fullContent.substring(0, 100).replace(/\n/g, '\\n'),
                        apiEndpoint: 'https://api.perplexity.ai/chat/completions'
                      });
                    } else {
                      // Case 2: Thinking is unreasonable or does not exist → show clear error message
                      if (DEBUG) {
                        console.error('❌ [ERROR PATH] Thinking content unreasonable, showing error:', {
                          thinkingLength: sanitizedThinking?.length || 0,
                          isTooShort: !sanitizedThinking || sanitizedThinking.length < MIN_REASONABLE_THINKING_LENGTH,
                          isTooLong: sanitizedThinking && sanitizedThinking.length > MAX_REASONABLE_THINKING_LENGTH,
                          missingThinking: !sanitizedThinking,
                          thresholds: {
                            min: MIN_REASONABLE_THINKING_LENGTH,
                            max: MAX_REASONABLE_THINKING_LENGTH,
                          },
                        });
                      }

                      const errorMessage = '⚠️ AI 回應內容異常。建議：\n• 重新提問\n• 嘗試簡化問題\n• 若問題持續，請稍後再試';
                      aggregatedContent = errorMessage;
                      incrementalContent = errorMessage;

                      console.error('[Perplexity API] Invalid response content', {
                        thinkingLength: sanitizedThinking?.length || 0,
                        answerLength: answer.length,
                        fullContentLength: fullContent.length,
                        modelKey: input.modelKey,
                        hasThinkTags: fullContent.includes('<think>')
                      });
                    }
                  }

                  // Log 4: Final chunk output for debugging (only in DEBUG mode, with data redaction)
                  if (DEBUG) {
                    console.log('📤 [YIELD CHUNK] Preparing to yield chunk:', {
                      chunkIndex,
                      contentLength: incrementalContent.length,
                      fullContentLength: aggregatedContent.length,
                      thinkingLength: sanitizedThinking.length,
                      isComplete,
                      derivedFromThinking: contentDerivedFromThinking,
                      citationsCount: citations.length,
                      // Content classification
                      isError: aggregatedContent.includes('⚠️ AI 回應內容異常'),
                      isFallback: aggregatedContent.includes('⚠️ 系統僅收到 AI 的思考內容'),
                      isNormalAnswer: !aggregatedContent.includes('⚠️'),
                      // Previews (redacted in production for security)
                      contentPreview: incrementalContent.substring(0, 100).replace(/\n/g, '\\n'),
                      fullContentPreview: aggregatedContent.substring(0, 100).replace(/\n/g, '\\n'),
                    });
                  }

                  yield {
                    content: incrementalContent,
                    fullContent: aggregatedContent,
                    thinkingContent: sanitizedThinking,
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
                    hasThinkingProcess: sanitizedThinking.length > 0 || fullContent.includes('<think>'),
                    contentDerivedFromThinking,
                  };

                  // Mark that we should stop after processing all events in current batch
                  if (isComplete) {
                    console.log(`🐛 [streamingCompletionRequest] isComplete detected at chunk ${chunkIndex}, will stop after processing current batch`);
                    shouldStopAfterCurrentBatch = true;
                  }

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

          // After processing all events in this network chunk, check if we should stop
          if (shouldStopAfterCurrentBatch) {
            console.log(`🐛 [streamingCompletionRequest] Stopping after processing batch #${batchIndex || 0}`);
            return;
          }
        }
      } finally {
        reader.releaseLock();
      }

      // If we got here without yielding any chunks, yield an error
      if (chunkIndex === 0) {
        console.error('🐛 [streamingCompletionRequest] No chunks yielded from stream');
        const processingTime = (Date.now() - startTime) / 1000;
        yield {
          content: '',
          fullContent: '錯誤：AI 未回傳任何內容。請稍後再試。',
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
          error: 'No content received from API',
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
