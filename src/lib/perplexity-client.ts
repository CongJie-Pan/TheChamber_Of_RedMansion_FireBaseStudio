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
   * Clean HTML tags and process thinking tags
   * 清理 HTML 標籤並處理思考標籤
   */
  private cleanResponse(text: string, showThinking: boolean = true): string {
    if (!text) return '';

    let cleanText = text;

    // Handle <think> tags based on showThinking preference
    const thinkPattern = /<think>(.*?)<\/think>/gs;
    
    if (showThinking) {
      // Convert thinking process to readable format
      cleanText = cleanText.replace(thinkPattern, (match, thinkContent) => {
        const content = thinkContent.trim();
        if (content) {
          return `\n\n**💭 思考過程：**\n\n${content}\n\n---\n\n`;
        }
        return '';
      });

      // Handle incomplete think tags
      const incompleteThinkPattern = /<think[^>]*>([^<]*?)(?=<(?!\/?think)|$)/gs;
      cleanText = cleanText.replace(incompleteThinkPattern, (match, content) => {
        const thinkContent = content.trim();
        if (thinkContent) {
          return `\n\n**💭 思考過程（不完整）：**\n\n${thinkContent}\n\n---\n\n`;
        }
        return '';
      });
    } else {
      // Remove all thinking content
      cleanText = cleanText.replace(thinkPattern, '');
      const incompleteThinkPattern = /<think[^>]*>.*?(?=<(?!\/?think)|$)/gs;
      cleanText = cleanText.replace(incompleteThinkPattern, '');
    }

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
    prompt += `請使用繁體中文回答，語言要學術性但易於理解。`;

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
   */
  async* streamingCompletionRequest(input: PerplexityQAInput): AsyncGenerator<PerplexityStreamingChunk> {
    const startTime = Date.now();
    let chunkIndex = 0;
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

      const response = await this.axiosInstance.post(
        PERPLEXITY_CONFIG.CHAT_COMPLETIONS_ENDPOINT,
        requestData,
        {
          responseType: 'stream',
        }
      );

      // Process streaming response
      const stream = response.data;
      
      for await (const chunk of this.parseStreamingResponse(stream)) {
        const processingTime = (Date.now() - startTime) / 1000;
        chunkIndex++;

        if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta.content) {
          const content = chunk.choices[0].delta.content;
          fullContent += content;

          // Collect citations and search queries
          if (chunk.citations) {
            collectedCitations = chunk.citations;
          }
          if (chunk.web_search_queries) {
            collectedSearchQueries = chunk.web_search_queries;
          }

          const citations = this.extractCitations(fullContent, collectedCitations, collectedSearchQueries);
          const isComplete = chunk.choices[0].finish_reason !== null;

          yield {
            content,
            fullContent: this.cleanResponse(fullContent, input.showThinkingProcess),
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
            hasThinkingProcess: fullContent.includes('<think>'),
          };

          if (isComplete) {
            break;
          }

          // Add delay to prevent overwhelming the UI
          await new Promise(resolve => setTimeout(resolve, PERPLEXITY_CONFIG.STREAM_CHUNK_DELAY_MS));
        }
      }

    } catch (error) {
      const processingTime = (Date.now() - startTime) / 1000;
      const errorMessage = error instanceof Error ? error.message : 'Streaming error occurred';
      
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

    for await (const chunk of stream) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim().startsWith('data: ')) {
          const data = line.trim().substring(6);
          
          if (data === '[DONE]') {
            return;
          }

          try {
            const parsed: PerplexityStreamChunk = JSON.parse(data);
            yield parsed;
          } catch (error) {
            // Skip invalid JSON chunks
            console.warn('Failed to parse streaming chunk:', data);
          }
        }
      }
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
