/**
 * Live smoke test for Perplexity streaming (requires PERPLEXITYAI_API_KEY).
 * Purpose: verify we receive answer content (not only thinking) from the real API once.
 *
 * Safety:
 * - Skips automatically when PERPLEXITYAI_API_KEY is missing.
 * - Uses a tiny prompt and low maxTokens to minimize usage.
 */

import { PerplexityClient } from '@/lib/perplexity-client';
import type { PerplexityQAInput, PerplexityStreamingChunk } from '@/types/perplexity-qa';

// Increase timeout for live network call
jest.setTimeout(60_000);

const apiKey = process.env.PERPLEXITYAI_API_KEY;

const shouldRun = Boolean(apiKey && apiKey.trim().length > 0);
const maybe = shouldRun ? describe : describe.skip;

maybe('Perplexity live streaming smoke test', () => {
  test('returns non-empty answer content (not only thinking)', async () => {
    const client = new PerplexityClient(apiKey);
    const input: PerplexityQAInput = {
      userQuestion: '請用極短的中文回答：紅樓夢的作者是誰？（限制30字內）',
      modelKey: 'sonar-reasoning-pro',
      reasoningEffort: 'low',
      enableStreaming: true,
      showThinkingProcess: true,
      maxTokens: 120,
      temperature: 0.2,
    };

    let finalChunk: PerplexityStreamingChunk | null = null;

    for await (const chunk of client.streamingCompletionRequest(input)) {
      finalChunk = chunk;
    }

    expect(finalChunk).not.toBeNull();
    expect(finalChunk?.isComplete).toBe(true);
    // Ensure we received some answer text (fallback or real answer)
    expect((finalChunk?.fullContent || '').trim().length).toBeGreaterThan(0);
  });
});
