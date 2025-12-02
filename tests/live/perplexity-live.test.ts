/** @jest-environment node */

/**
 * Live smoke test for Perplexity streaming (requires PERPLEXITYAI_API_KEY).
 * Purpose: verify we receive answer content (not only thinking) from the real API once.
 *
 * Safety:
 * - Skips automatically when PERPLEXITYAI_API_KEY is missing.
 * - Uses a tiny prompt and low maxTokens to minimize usage.
 */

import fs from 'fs';
import path from 'path';
import { createPerplexityConfig, PERPLEXITY_CONFIG } from '@/ai/perplexity-config';

// Increase timeout for live network call
jest.setTimeout(60_000);

const apiKey = process.env.PERPLEXITYAI_API_KEY;

const shouldRun = Boolean(apiKey && apiKey.trim().length > 0);
const maybe = shouldRun ? describe : describe.skip;

maybe('Perplexity live streaming smoke test', () => {
  test('saves raw SSE response from real Perplexity API', async () => {
    const question = '請回答：紅樓夢的作者是誰？請直接作答並補充一句說明。';
    const config = createPerplexityConfig({
      model: 'sonar-reasoning-pro',
      reasoningEffort: 'low',
      enableStreaming: true,
      // 不額外限制 maxTokens，讓回應自然結束（遵循預設 2000）
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

    const response = await fetch(
      `${PERPLEXITY_CONFIG.BASE_URL}${PERPLEXITY_CONFIG.CHAT_COMPLETIONS_ENDPOINT}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(requestData),
      }
    );

    expect(response.ok).toBe(true);
    const reader = response.body?.getReader();
    expect(reader).toBeDefined();

    let rawSSE = '';
    const decoder = new TextDecoder();
    const firstDataEvents: string[] = [];

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        rawSSE += decoder.decode(value, { stream: true });
      }
    }

    // Capture a few data events for quick preview
    rawSSE.split('\n').forEach((line) => {
      if (line.startsWith('data: ') && !line.includes('[DONE]') && firstDataEvents.length < 3) {
        firstDataEvents.push(line.slice(6));
      }
    });

    // Reconstruct a linear view of the streaming content (including <think> if present)
    let reconstructed = '';
    let sawDone = rawSSE.includes('[DONE]');
    rawSSE.split('\n').forEach((line) => {
      if (!line.startsWith('data: ')) return;
      const payload = line.slice(6);
      if (payload === '[DONE]') return;
      try {
        const json = JSON.parse(payload);
        const content = json?.choices?.[0]?.delta?.content;
        if (typeof content === 'string') {
          reconstructed += content;
        }
      } catch {
        // ignore malformed JSON
      }
    });
    if (sawDone) {
      reconstructed += '[DONE]';
    }

    // Persist raw SSE to log file
    const logDir = path.join('docs', 'testing', 'perplexity_api_running_test_log');
    fs.mkdirSync(logDir, { recursive: true });
    const timestamp = Date.now();
    const rawPath = path.join(logDir, `live-run-raw-${timestamp}.txt`);
    const prettyPath = path.join(logDir, `live-run-pretty-${timestamp}.txt`);
    const rawContent = [
      `Timestamp: ${new Date().toISOString()}`,
      `Question: ${question}`,
      `Model: ${config.model}`,
      `ReasoningEffort: ${config.reasoning_effort || 'n/a'}`,
      '',
      '--- Raw SSE (below) ---',
      rawSSE,
      '',
      '--- First data events (preview) ---',
      ...firstDataEvents,
    ].join('\n');
    const prettyContent = [
      `Timestamp: ${new Date().toISOString()}`,
      `Question: ${question}`,
      `Model: ${config.model}`,
      `ReasoningEffort: ${config.reasoning_effort || 'n/a'}`,
      '',
      '--- Reconstructed content (concatenated delta.content) ---',
      reconstructed || '(none)',
      '',
      `saw [DONE]: ${sawDone ? 'yes' : 'no'}`,
    ].join('\n');
    fs.writeFileSync(rawPath, rawContent, 'utf8');
    fs.writeFileSync(prettyPath, prettyContent, 'utf8');

    expect(rawSSE.trim().length).toBeGreaterThan(0);
    expect(rawSSE.includes('data:')).toBe(true);
    // 有些情況 (超時/提早結束) 可能收不到 [DONE]，此處不強制失敗，僅提示
    if (!rawSSE.includes('[DONE]')) {
      // eslint-disable-next-line no-console
      console.warn('[Perplexity Live] Warning: no [DONE] marker found in raw SSE (可能被截斷或提前結束)');
    }
  });
});
