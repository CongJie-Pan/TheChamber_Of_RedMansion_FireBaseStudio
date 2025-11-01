/**
 * @fileOverview Tests for thinking content extraction utilities
 *
 * These tests verify the logic used to separate AI thinking process from
 * final answers within the Perplexity QA flow. Following TDD, we define the
 * desired behaviours before implementing the utility functions.
 */

import { describe, expect, test } from '@jest/globals';

import {
  splitThinkingFromContent,
  sanitizeThinkingContent,
} from '../../src/lib/perplexity-thinking-utils';

describe('perplexity-thinking-utils', () => {
  test('extracts thinking section marked with explicit heading', () => {
    const source = `**💭 思考過程**\n先列出關鍵脈絡。\n---\n最終回答內容在此。`;

    const result = splitThinkingFromContent(source);

    expect(result.cleanContent).toBe('最終回答內容在此。');
    expect(result.thinkingText).toBe('先列出關鍵脈絡。');
  });

  test('detects analytical preface without explicit marker', () => {
    const source = `首先，我會梳理人物之間的關係並思考線索。\n\n接下來是完整的回答內容，包含引用與分析。`;

    const result = splitThinkingFromContent(source);

    expect(result.cleanContent.startsWith('接下來是完整的回答內容')).toBe(true);
    expect(result.thinkingText).toContain('梳理人物之間的關係');
  });

  test('returns original text when no thinking cues present', () => {
    const source = '這是一段純粹的回答內容，沒有任何思考提示。';

    const result = splitThinkingFromContent(source);

    expect(result.cleanContent).toBe(source);
    expect(result.thinkingText).toBe('');
  });

  test('sanitizeThinkingContent trims whitespace and normalises newlines', () => {
    const messy = '\n  思考第一步   \n\n\n  思考第二步  \n';

    const cleaned = sanitizeThinkingContent(messy);

    expect(cleaned).toBe('思考第一步\n\n思考第二步');
  });
});
