/** @jest-environment node */

/**
 * Live test for perplexity-client.ts streamingCompletionRequest()
 *
 * This test verifies the ENTIRE pipeline:
 * 1. API request to Perplexity
 * 2. SSE parsing in perplexity-client.ts
 * 3. StreamProcessor integration
 * 4. fullContent accumulation and yielding
 *
 * Purpose: Identify where answer content is lost in the client layer
 *
 * Safety:
 * - Skips automatically when PERPLEXITYAI_API_KEY is missing
 * - Uses a simple prompt to minimize API usage
 */

import fs from 'fs';
import path from 'path';
import { PerplexityClient, PerplexityCompletionInput } from '@/lib/perplexity-client';

// Increase timeout for live network call
jest.setTimeout(120_000);

const apiKey = process.env.PERPLEXITYAI_API_KEY;

const shouldRun = Boolean(apiKey && apiKey.trim().length > 0);
const maybe = shouldRun ? describe : describe.skip;

maybe('PerplexityClient Live Test', () => {
  let client: PerplexityClient;

  beforeAll(() => {
    client = new PerplexityClient(apiKey!);
  });

  test('streamingCompletionRequest yields correct fullContent with answer', async () => {
    const input: PerplexityCompletionInput = {
      userQuestion: '請回答：紅樓夢的作者是誰？請直接作答並補充一句說明。',
      contextInfo: '這是一個關於中國古典文學的問題。',
      modelKey: 'sonar-reasoning-pro',
      reasoningEffort: 'low',
      temperature: 0.3,
      enableStreaming: true,
    };

    // Collect all yielded chunks
    const chunks: any[] = [];
    const chunkDetails: string[] = [];

    console.log('\n=== PerplexityClient Live Test ===');
    console.log(`Question: ${input.userQuestion}`);
    console.log(`Model: ${input.modelKey}`);

    let chunkIndex = 0;
    let lastFullContent = '';
    let lastThinkingContent = '';
    let sawComplete = false;
    let sawDone = false;

    try {
      for await (const chunk of client.streamingCompletionRequest(input)) {
        chunkIndex++;
        chunks.push(chunk);

        // Track important state
        if (chunk.isComplete) sawComplete = true;
        if (chunk.fullContent) lastFullContent = chunk.fullContent;
        if (chunk.thinkingContent) lastThinkingContent = chunk.thinkingContent;

        // Log chunk details
        const detail = [
          `[Chunk ${chunkIndex}]`,
          `content: ${chunk.content?.length || 0} chars`,
          `fullContent: ${chunk.fullContent?.length || 0} chars`,
          `thinking: ${chunk.thinkingContent?.length || 0} chars`,
          `isComplete: ${chunk.isComplete}`,
          `hasThinkingProcess: ${chunk.hasThinkingProcess}`,
        ].join(' | ');
        chunkDetails.push(detail);

        // Log first few and last few chunks
        if (chunkIndex <= 3 || chunk.isComplete) {
          console.log(detail);
          if (chunk.fullContent && chunk.fullContent.length > 0) {
            console.log(`  fullContent preview: "${chunk.fullContent.substring(0, 100).replace(/\n/g, '\\n')}..."`);
          }
        }
      }

      console.log(`\n=== Stream Complete ===`);
      console.log(`Total chunks: ${chunkIndex}`);
      console.log(`Saw isComplete=true: ${sawComplete}`);

    } catch (error) {
      console.error('Stream error:', error);
      throw error;
    }

    // Create output directory
    const logDir = path.join(
      'docs',
      'testing',
      'perplexity_api_running_test_log',
      'perplexity-client'
    );
    fs.mkdirSync(logDir, { recursive: true });

    const timestamp = Date.now();

    // Save detailed log
    const logPath = path.join(logDir, `client-test-${timestamp}.txt`);
    const logContent = [
      `=== PerplexityClient Live Test ===`,
      `Timestamp: ${new Date().toISOString()}`,
      `Question: ${input.userQuestion}`,
      `Model: ${input.modelKey}`,
      ``,
      `=== CHUNK DETAILS ===`,
      ...chunkDetails,
      ``,
      `=== FINAL STATE ===`,
      `Total chunks: ${chunkIndex}`,
      `Saw isComplete: ${sawComplete}`,
      ``,
      `=== LAST FULLCONTENT ===`,
      lastFullContent || '(EMPTY - THIS IS THE BUG!)',
      ``,
      `=== LAST THINKINGCONTENT ===`,
      lastThinkingContent || '(none)',
      ``,
      `=== DIAGNOSIS ===`,
      lastFullContent.length > 0
        ? '✅ fullContent contains data'
        : '❌ BUG: fullContent is EMPTY!',
      lastFullContent.includes('曹雪芹')
        ? '✅ fullContent contains expected answer keyword "曹雪芹"'
        : '❌ fullContent missing expected answer keyword "曹雪芹"',
      !lastFullContent.includes('<think>')
        ? '✅ fullContent does NOT contain <think> tag (properly separated)'
        : '⚠️ fullContent still contains <think> tag',
    ].join('\n');
    fs.writeFileSync(logPath, logContent, 'utf8');

    // Save chunks as JSON for detailed analysis
    const jsonPath = path.join(logDir, `client-chunks-${timestamp}.json`);
    fs.writeFileSync(
      jsonPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          question: input.userQuestion,
          model: input.modelKey,
          totalChunks: chunkIndex,
          sawComplete,
          lastFullContentLength: lastFullContent.length,
          lastThinkingContentLength: lastThinkingContent.length,
          lastFullContent,
          lastThinkingContent,
          // Only save summary of chunks to avoid huge file
          chunkSummaries: chunks.map((c, i) => ({
            index: i + 1,
            contentLength: c.content?.length || 0,
            fullContentLength: c.fullContent?.length || 0,
            thinkingContentLength: c.thinkingContent?.length || 0,
            isComplete: c.isComplete,
            hasThinkingProcess: c.hasThinkingProcess,
          })),
        },
        null,
        2
      ),
      'utf8'
    );

    console.log(`\nOutput saved to: ${logDir}`);

    // Assertions
    expect(chunks.length).toBeGreaterThan(0);

    // CRITICAL: The last fullContent should contain the answer
    if (lastFullContent.length === 0) {
      console.error('\n❌ BUG CONFIRMED: lastFullContent is empty!');
      console.error('This confirms the bug is in perplexity-client.ts');
      console.error('The answer content is not being accumulated or yielded.');
    }

    // These assertions will identify the bug
    expect(lastFullContent.length).toBeGreaterThan(0);
    expect(lastFullContent).toContain('曹雪芹');
  });

  test('verifies stream finalization happens even without [DONE] signal', async () => {
    // This test specifically checks if the client handles streams
    // that end without explicit [DONE] marker

    const input: PerplexityCompletionInput = {
      userQuestion: '1+1等於多少？直接回答數字。',
      contextInfo: '',
      modelKey: 'sonar-reasoning-pro',
      reasoningEffort: 'low',
      temperature: 0.1,
      enableStreaming: true,
    };

    console.log('\n=== Short Answer Test (Finalization Check) ===');

    const chunks: any[] = [];
    let lastChunk: any = null;

    for await (const chunk of client.streamingCompletionRequest(input)) {
      chunks.push(chunk);
      lastChunk = chunk;

      if (chunks.length <= 3) {
        console.log(`[Chunk ${chunks.length}] fullContent: ${chunk.fullContent?.length || 0} chars, isComplete: ${chunk.isComplete}`);
      }
    }

    console.log(`Total chunks: ${chunks.length}`);
    console.log(`Last chunk isComplete: ${lastChunk?.isComplete}`);
    console.log(`Last chunk fullContent: "${lastChunk?.fullContent?.substring(0, 100) || '(empty)'}"`);

    // Even for short answers, the last chunk should have content
    expect(chunks.length).toBeGreaterThan(0);
    expect(lastChunk).toBeDefined();

    // The last chunk should be marked complete
    // If this fails, it confirms the [DONE] handler issue
    if (!lastChunk?.isComplete) {
      console.warn('⚠️ Last chunk is NOT marked isComplete - stream may have ended without [DONE]');
    }

    // Most importantly, fullContent should have data
    expect(lastChunk?.fullContent?.length || 0).toBeGreaterThan(0);
  });
});
