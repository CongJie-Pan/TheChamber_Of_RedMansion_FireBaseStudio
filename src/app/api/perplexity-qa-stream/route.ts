/**
 * @fileOverview API Route for streaming Perplexity QA responses
 *
 * This route handles Server-Sent Events (SSE) streaming for Perplexity AI
 * responses, enabling real-time progressive display of thinking process
 * and final answers with citations.
 *
 * Implementation reason: Next.js 15 App Router has limitations with client-side
 * async generator functions. This API route bridges the gap by converting the
 * async generator to SSE stream that browsers can consume natively.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  perplexityRedChamberQAStreaming,
  createPerplexityQAInputForFlow,
} from '@/ai/flows/perplexity-red-chamber-qa';
import type { PerplexityQAInput, PerplexityStreamingChunk } from '@/types/perplexity-qa';
import { calculateAdaptiveTimeout, getTimeoutSummary } from '@/ai/perplexity-config';
import {
  classifyError,
  formatErrorForUser,
  logError,
  shouldAttemptRetry,
  calculateBackoffDelay,
} from '@/lib/perplexity-error-handler';

/**
 * POST handler for Perplexity QA streaming requests
 * Converts async generator to Server-Sent Events (SSE) stream
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.userQuestion || typeof body.userQuestion !== 'string') {
      return NextResponse.json(
        { error: '使用者問題必須提供且為字串格式' },
        { status: 400 }
      );
    }

    // Create Perplexity input using helper function
    const perplexityInput: PerplexityQAInput = await createPerplexityQAInputForFlow(
      body.userQuestion,
      body.selectedTextInfo || null,
      body.chapterContext || undefined,
      body.currentChapter || undefined,
      {
        modelKey: body.modelKey || 'sonar-reasoning-pro',
        reasoningEffort: body.reasoningEffort || 'medium',
        enableStreaming: true,
        showThinkingProcess: body.showThinkingProcess !== false,
        questionContext: body.questionContext || 'general',
        temperature: body.temperature,
        maxTokens: body.maxTokens,
      }
    );

    // Create ReadableStream for SSE
    const encoder = new TextEncoder();

    // Calculate adaptive timeout
    const adaptiveTimeout = calculateAdaptiveTimeout({
      modelKey: perplexityInput.modelKey || 'sonar-reasoning-pro',
      reasoningEffort: perplexityInput.reasoningEffort,
      questionLength: body.userQuestion.length,
      questionContext: perplexityInput.questionContext,
    });

    const timeoutSummary = getTimeoutSummary(adaptiveTimeout);

    const stream = new ReadableStream({
      async start(controller) {
        let partialContent = '';
        let hasReceivedAnyChunks = false;

        try {
          // Log streaming start with adaptive timeout
          console.log('[Perplexity Stream API] Starting stream:', {
            question: body.userQuestion.substring(0, 100),
            modelKey: perplexityInput.modelKey,
            timeout: timeoutSummary.formatted,
            timeoutMs: adaptiveTimeout,
          });

          // Set up timeout handler
          const timeoutId = setTimeout(() => {
            const timeoutError = new Error(`Request timeout after ${timeoutSummary.formatted}`);
            timeoutError.name = 'TimeoutError';
            throw timeoutError;
          }, adaptiveTimeout);

          try {
            // Iterate through async generator and send chunks
            let chunkCounter = 0;
            console.log('[Perplexity Stream API] Starting chunk iteration');

            for await (const chunk of perplexityRedChamberQAStreaming(perplexityInput)) {
              chunkCounter++;
              hasReceivedAnyChunks = true;

              console.log(`[Perplexity Stream API] Chunk ${chunkCounter}:`, {
                hasContent: !!chunk.content,
                contentLength: chunk.content?.length || 0,
                fullContentLength: chunk.fullContent?.length || 0,
                isComplete: chunk.isComplete,
                hasError: !!chunk.error,
                chunkIndex: chunk.chunkIndex
              });

              // Store partial content for error recovery
              if (chunk.content) {
                partialContent += chunk.content;
              }

              // Format chunk as SSE message
              const sseMessage = `data: ${JSON.stringify(chunk)}\n\n`;
              controller.enqueue(encoder.encode(sseMessage));

              // If complete, close the stream
              if (chunk.isComplete) {
                clearTimeout(timeoutId);
                console.log('[Perplexity Stream API] Stream completed successfully:', {
                  totalChunks: chunkCounter,
                  totalContentLength: partialContent.length
                });
                break;
              }
            }

            if (chunkCounter === 0) {
              console.error('[Perplexity Stream API] ⚠️ NO CHUNKS RECEIVED FROM GENERATOR');
              // Send error chunk to client when no chunks received
              const noChunksErrorChunk: PerplexityStreamingChunk = {
                content: '',
                fullContent: '錯誤：AI 服務未回傳任何內容。\n\n可能原因：\n• API 連線問題\n• 請求逾時\n• 服務暫時不可用\n\n建議：\n• 請稍後再試\n• 檢查網路連線\n• 若問題持續，請聯繫系統管理員',
                timestamp: new Date().toISOString(),
                citations: [],
                searchQueries: [],
                metadata: {
                  searchQueries: [],
                  webSources: [],
                  groundingSuccessful: false,
                  errorCategory: 'EMPTY_RESPONSE',
                },
                responseTime: 0,
                isComplete: true,
                chunkIndex: 1,
                error: 'No chunks received from Perplexity API generator',
              };
              const errorSseMessage = `data: ${JSON.stringify(noChunksErrorChunk)}\n\n`;
              controller.enqueue(encoder.encode(errorSseMessage));
            } else {
              console.log(`[Perplexity Stream API] Generator iteration complete: ${chunkCounter} chunks processed`);
            }
          } finally {
            clearTimeout(timeoutId);
          }

          // Send completion signal
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();

        } catch (error: any) {
          // Classify error and determine recovery strategy
          const classifiedError = classifyError(error, {
            modelKey: perplexityInput.modelKey,
            reasoningEffort: perplexityInput.reasoningEffort,
            questionLength: body.userQuestion.length,
          });

          // Log error with full context
          logError(classifiedError, {
            hasPartialContent: partialContent.length > 0,
            partialContentLength: partialContent.length,
            hasReceivedChunks: hasReceivedAnyChunks,
            adaptiveTimeout,
          });

          // Format user-friendly error message
          const formattedError = formatErrorForUser(classifiedError);

          // Construct error message with partial content if available
          let errorMessage = formattedError.message;
          if (partialContent && hasReceivedAnyChunks) {
            errorMessage = `${formattedError.message}\n\n已接收到部分回應：\n\n${partialContent}\n\n---\n\n建議：\n${formattedError.suggestions.join('\n')}`;
          } else {
            errorMessage = `${formattedError.message}\n\n建議：\n${formattedError.suggestions.join('\n')}`;
          }

          // Send enhanced error chunk to client
          const errorChunk: PerplexityStreamingChunk = {
            content: '',
            fullContent: errorMessage,
            timestamp: new Date().toISOString(),
            citations: [],
            searchQueries: [],
            metadata: {
              searchQueries: [],
              webSources: [],
              groundingSuccessful: false,
              errorCategory: classifiedError.category,
              shouldRetry: classifiedError.shouldRetry,
              retryDelay: classifiedError.retryDelay,
              fallbackModel: classifiedError.fallbackModel,
              recoveryActions: classifiedError.recoveryActions,
            },
            responseTime: 0,
            isComplete: true,
            chunkIndex: 1,
            error: classifiedError.technicalMessage,
          };

          const errorSseMessage = `data: ${JSON.stringify(errorChunk)}\n\n`;
          controller.enqueue(encoder.encode(errorSseMessage));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },

      cancel() {
        console.log('[Perplexity Stream API] Stream cancelled by client');
      },
    });

    // Return SSE response with proper headers
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });

  } catch (error: any) {
    console.error('[Perplexity Stream API] Request processing error:', error);

    return NextResponse.json(
      {
        error: '處理請求時發生錯誤',
        message: error?.message || '未知錯誤',
        details: error?.stack,
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler - returns API info
 * Useful for health checks and documentation
 */
export async function GET() {
  return NextResponse.json({
    name: 'Perplexity QA Streaming API',
    version: '1.0.0',
    description: 'Server-Sent Events endpoint for streaming Perplexity AI responses',
    usage: {
      method: 'POST',
      contentType: 'application/json',
      requiredFields: ['userQuestion'],
      optionalFields: [
        'selectedTextInfo',
        'chapterContext',
        'currentChapter',
        'modelKey',
        'reasoningEffort',
        'questionContext',
        'showThinkingProcess',
        'temperature',
        'maxTokens',
      ],
      responseType: 'text/event-stream',
    },
    models: ['sonar-reasoning-pro', 'sonar-reasoning', 'sonar-pro'],
    endpoint: '/api/perplexity-qa-stream',
  });
}
