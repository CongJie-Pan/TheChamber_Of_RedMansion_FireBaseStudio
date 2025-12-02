/** @jest-environment node */

/**
 * Live test for PerplexityStreamProcessor with real API data.
 * Purpose: Verify the StreamProcessor correctly separates thinking from answer content.
 *
 * This test:
 * 1. Connects to the real Perplexity API
 * 2. Passes raw SSE chunks through PerplexityStreamProcessor
 * 3. Logs all emitted chunks for analysis
 * 4. Saves detailed output to docs/testing/perplexity_api_running_test_log/perplexity-stream-processor/
 *
 * Safety:
 * - Skips automatically when PERPLEXITYAI_API_KEY is missing.
 * - Uses a tiny prompt and low maxTokens to minimize usage.
 */

import fs from 'fs';
import path from 'path';
import { createPerplexityConfig, PERPLEXITY_CONFIG } from '@/ai/perplexity-config';
import {
  PerplexityStreamProcessor,
  StructuredChunk,
} from '@/lib/streaming/perplexity-stream-processor';

// Increase timeout for live network call
jest.setTimeout(90_000);

const apiKey = process.env.PERPLEXITYAI_API_KEY;

const shouldRun = Boolean(apiKey && apiKey.trim().length > 0);
const maybe = shouldRun ? describe : describe.skip;

maybe('PerplexityStreamProcessor live test', () => {
  test('processes real API stream and emits thinking + text chunks correctly', async () => {
    const question = '請回答：紅樓夢的作者是誰？請直接作答並補充一句說明。';
    const config = createPerplexityConfig({
      model: 'sonar-reasoning-pro',
      reasoningEffort: 'low',
      enableStreaming: true,
      temperature: 0.3,
    });

    const requestData = {
      ...config,
      messages: [
        {
          role: 'user',
          content: question,
        },
      ],
    };

    // Make API request
    const response = await fetch(
      `${PERPLEXITY_CONFIG.BASE_URL}${PERPLEXITY_CONFIG.CHAT_COMPLETIONS_ENDPOINT}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(requestData),
      }
    );

    expect(response.ok).toBe(true);
    const reader = response.body?.getReader();
    expect(reader).toBeDefined();

    // Initialize StreamProcessor
    const processor = new PerplexityStreamProcessor();

    // Collect all data
    const decoder = new TextDecoder();
    const rawChunks: string[] = []; // Raw SSE data events
    const deltaContents: string[] = []; // Extracted delta.content values
    const emittedChunks: StructuredChunk[] = []; // Chunks emitted by processor
    const processingLog: string[] = []; // Detailed processing log

    let rawSSE = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        rawSSE += chunk;

        // Process each line in the SSE chunk
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') {
            processingLog.push(`[SSE] Received [DONE] marker`);
            continue;
          }

          try {
            const json = JSON.parse(payload);
            const deltaContent = json?.choices?.[0]?.delta?.content;

            if (typeof deltaContent === 'string' && deltaContent.length > 0) {
              rawChunks.push(payload);
              deltaContents.push(deltaContent);

              // Process through StreamProcessor
              processingLog.push(
                `\n[INPUT] delta.content (${deltaContent.length} chars): "${deltaContent.substring(0, 80).replace(/\n/g, '\\n')}${deltaContent.length > 80 ? '...' : ''}"`
              );

              const chunks = processor.processChunk(deltaContent);

              processingLog.push(`[OUTPUT] StreamProcessor returned ${chunks.length} chunk(s)`);

              for (const structuredChunk of chunks) {
                emittedChunks.push(structuredChunk);
                processingLog.push(
                  `  -> [${structuredChunk.type.toUpperCase()}] (${structuredChunk.content.length} chars): "${structuredChunk.content.substring(0, 100).replace(/\n/g, '\\n')}${structuredChunk.content.length > 100 ? '...' : ''}"`
                );
              }
            }
          } catch {
            // Ignore malformed JSON
          }
        }
      }
    }

    // Finalize the processor
    processingLog.push(`\n[FINALIZE] Calling processor.finalize()`);
    const finalChunk = processor.finalize();
    processingLog.push(
      `[FINALIZE RESULT] type=${finalChunk.type}, content length=${finalChunk.content.length}`
    );
    if (finalChunk.content) {
      processingLog.push(
        `  -> Content: "${finalChunk.content.substring(0, 200).replace(/\n/g, '\\n')}${finalChunk.content.length > 200 ? '...' : ''}"`
      );
    }

    // Analyze results
    const thinkingChunks = emittedChunks.filter((c) => c.type === 'thinking');
    const textChunks = emittedChunks.filter((c) => c.type === 'text');

    const totalThinkingContent = thinkingChunks.map((c) => c.content).join('');
    const totalTextContent = textChunks.map((c) => c.content).join('');

    // Reconstruct original content for comparison
    const reconstructedFromDelta = deltaContents.join('');

    // Create output directory
    const logDir = path.join(
      'docs',
      'testing',
      'perplexity_api_running_test_log',
      'perplexity-stream-processor'
    );
    fs.mkdirSync(logDir, { recursive: true });

    const timestamp = Date.now();

    // Save detailed processing log
    const processingLogPath = path.join(logDir, `processing-log-${timestamp}.txt`);
    const processingLogContent = [
      `=== PerplexityStreamProcessor Live Test ===`,
      `Timestamp: ${new Date().toISOString()}`,
      `Question: ${question}`,
      `Model: ${config.model}`,
      `ReasoningEffort: ${config.reasoning_effort || 'n/a'}`,
      ``,
      `=== PROCESSING LOG ===`,
      ...processingLog,
    ].join('\n');
    fs.writeFileSync(processingLogPath, processingLogContent, 'utf8');

    // Save summary report
    const summaryPath = path.join(logDir, `summary-${timestamp}.txt`);
    const summaryContent = [
      `=== PerplexityStreamProcessor Test Summary ===`,
      `Timestamp: ${new Date().toISOString()}`,
      `Question: ${question}`,
      `Model: ${config.model}`,
      ``,
      `=== STATISTICS ===`,
      `Total delta.content chunks from API: ${deltaContents.length}`,
      `Total StructuredChunks emitted: ${emittedChunks.length}`,
      `  - Thinking chunks: ${thinkingChunks.length}`,
      `  - Text chunks: ${textChunks.length}`,
      ``,
      `=== CONTENT LENGTHS ===`,
      `Total thinking content: ${totalThinkingContent.length} chars`,
      `Total text content: ${totalTextContent.length} chars`,
      `Reconstructed from delta: ${reconstructedFromDelta.length} chars`,
      ``,
      `=== THINKING CONTENT ===`,
      totalThinkingContent || '(none)',
      ``,
      `=== TEXT CONTENT (ANSWER) ===`,
      totalTextContent || '(none - THIS IS THE BUG!)',
      ``,
      `=== FINAL CHUNK ===`,
      `Type: ${finalChunk.type}`,
      `Content: ${finalChunk.content || '(empty)'}`,
      ``,
      `=== RECONSTRUCTED FROM DELTA (EXPECTED) ===`,
      reconstructedFromDelta,
      ``,
      `=== DIAGNOSIS ===`,
      textChunks.length > 0
        ? '✅ StreamProcessor correctly emitted text chunks'
        : '❌ BUG: StreamProcessor did NOT emit any text chunks! Answer content is lost.',
      ``,
      totalTextContent.includes('曹雪芹')
        ? '✅ Answer content contains expected keyword "曹雪芹"'
        : '❌ Answer content missing expected keyword "曹雪芹"',
    ].join('\n');
    fs.writeFileSync(summaryPath, summaryContent, 'utf8');

    // Save all emitted chunks as JSON for detailed analysis
    const chunksJsonPath = path.join(logDir, `emitted-chunks-${timestamp}.json`);
    fs.writeFileSync(
      chunksJsonPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          question,
          model: config.model,
          statistics: {
            totalDeltaChunks: deltaContents.length,
            totalEmittedChunks: emittedChunks.length,
            thinkingChunks: thinkingChunks.length,
            textChunks: textChunks.length,
          },
          emittedChunks: emittedChunks.map((c) => ({
            type: c.type,
            contentLength: c.content.length,
            contentPreview: c.content.substring(0, 200),
          })),
          finalChunk: {
            type: finalChunk.type,
            contentLength: finalChunk.content.length,
            contentPreview: finalChunk.content.substring(0, 200),
          },
          totalThinkingContent,
          totalTextContent,
          reconstructedFromDelta,
        },
        null,
        2
      ),
      'utf8'
    );

    // Console output for test runner
    console.log('\n=== StreamProcessor Live Test Results ===');
    console.log(`Thinking chunks emitted: ${thinkingChunks.length}`);
    console.log(`Text chunks emitted: ${textChunks.length}`);
    console.log(`Total thinking content: ${totalThinkingContent.length} chars`);
    console.log(`Total text content: ${totalTextContent.length} chars`);
    console.log(`\nOutput saved to: ${logDir}`);

    // Assertions
    expect(emittedChunks.length).toBeGreaterThan(0);

    // The key assertion: we should have text chunks with the answer
    if (textChunks.length === 0) {
      console.error('\n❌ BUG CONFIRMED: No text chunks emitted!');
      console.error('The answer content after </think> is being lost.');
      console.error(`\nExpected answer (from reconstructed): ${reconstructedFromDelta.substring(reconstructedFromDelta.indexOf('</think>') + 8, reconstructedFromDelta.indexOf('</think>') + 200)}`);
    }

    // This assertion will fail if there's a bug - that's intentional for diagnosis
    expect(textChunks.length).toBeGreaterThan(0);
    expect(totalTextContent.length).toBeGreaterThan(0);
  });
});
