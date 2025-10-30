
'use server';
/**
 * @fileOverview Explains a selected text snippet from "Dream of the Red Chamber" by answering a user's question using Perplexity AI.
 *
 * - explainTextSelection - A function that provides an explanation for a selected text snippet based on a user's question.
 * - ExplainTextSelectionInput - The input type for the explainTextSelection function.
 * - ExplainTextSelectionOutput - The return type for the explainTextSelection function.
 * 
 * Updated to use Perplexity API instead of Gemini for consistent AI provider experience.
 */

import { z } from 'zod';
import {
  createPerplexityQAInputForFlow,
  perplexityRedChamberQA,
} from '@/ai/flows/perplexity-red-chamber-qa';
import { terminalLogger, debugLog, errorLog } from '@/lib/terminal-logger';

/**
 * Input schema for text explanation requests
 * 文本解釋請求的輸入結構
 */
const ExplainTextSelectionInputSchema = z.object({
  selectedText: z.string().describe('The text snippet selected by the user.'),
  chapterContext: z.string().describe('A snippet of the current chapter content to provide context to the selected text.'),
  userQuestion: z.string().describe('The user\'s specific question about the selected text. 請以繁體中文提出問題。'),
});
export type ExplainTextSelectionInput = z.infer<typeof ExplainTextSelectionInputSchema>;

/**
 * Output schema for text explanation responses
 * 文本解釋回應的輸出結構
 */
const ExplainTextSelectionOutputSchema = z.object({
  explanation: z.string().describe('The AI-generated answer to the user\'s question about the selected text snippet. 請以 Markdown 格式提供解釋，確保使用如標題（例如：## 我的標題）、列表（例如：- 項目一）、粗體（例如：**重要文字**）和斜體（例如：*強調*）等元素來組織內容。'),
});
export type ExplainTextSelectionOutput = z.infer<typeof ExplainTextSelectionOutputSchema>;

/**
 * Main function to explain selected text using Perplexity AI
 * 使用 Perplexity AI 解釋選取文本的主要函數
 */
export async function explainTextSelection(
  input: ExplainTextSelectionInput
): Promise<ExplainTextSelectionOutput> {
  try {
    await debugLog('EXPLAIN_TEXT', 'explainTextSelection called', {
      questionLength: input.userQuestion.length,
      selectedTextLength: input.selectedText.length,
      chapterContextLength: input.chapterContext.length,
    });

    // Create Perplexity QA input using the flow helper
    const perplexityInput = await createPerplexityQAInputForFlow(
      input.userQuestion,
      {
        text: input.selectedText,
        position: null,
        range: null,
      }, // Convert to selection info format with required fields
      input.chapterContext,
      'current-chapter', // Generic chapter title key
      {
        modelKey: 'sonar-reasoning', // Use sonar-reasoning model for explanations
        reasoningEffort: 'medium', // Balanced reasoning for text explanations
        enableStreaming: false, // Non-streaming for this API
        showThinkingProcess: false, // Clean output for explanations
        questionContext: 'general',
      }
    );

    // Get response from Perplexity
    const perplexityResponse = await perplexityRedChamberQA(perplexityInput);

    if (!perplexityResponse.success || !perplexityResponse.answer) {
      // Only log errors in non-test environments
      if (process.env.NODE_ENV !== 'test') {
        await errorLog('EXPLAIN_TEXT', 'Perplexity QA failed', {
          error: perplexityResponse.error,
          success: perplexityResponse.success,
        });
      }
      throw new Error(perplexityResponse.error || 'AI模型未能生成有效的文本解釋。');
    }

    await debugLog('EXPLAIN_TEXT', 'explainTextSelection completed successfully', {
      answerLength: perplexityResponse.answer?.length || 0,
    });
    
    return {
      explanation: perplexityResponse.answer
    };

  } catch (error) {
    // Only log errors in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      await errorLog('EXPLAIN_TEXT', 'Error in explainTextSelection', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    
    // Provide a fallback explanation
    const fallbackExplanation = `## 解釋說明

針對您選取的文字：「${input.selectedText}」

以及您的問題：「${input.userQuestion}」

很抱歉，目前AI服務暫時無法提供詳細解釋。請稍後再試，或嘗試重新提問。

### 建議
- 確保網路連線正常
- 嘗試簡化問題內容
- 稍後重新提問

錯誤詳情：${error instanceof Error ? error.message : '未知錯誤'}`;

    return {
      explanation: fallbackExplanation
    };
  }
}
