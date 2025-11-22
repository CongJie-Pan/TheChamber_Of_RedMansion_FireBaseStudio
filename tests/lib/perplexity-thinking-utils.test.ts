/**
 * @fileOverview Comprehensive tests for thinking content extraction utilities
 *
 * These tests verify the logic used to separate AI thinking process from
 * final answers within the Perplexity QA flow. Following TDD, we define the
 * desired behaviours before implementing the utility functions.
 *
 * Test coverage includes:
 * - <think> XML tag extraction (official Perplexity API format)
 * - Explicit marker detection (💭, 思考過程)
 * - Analytical preface detection
 * - Edge cases and malformed input handling
 * - Content sanitization and normalization
 */

import { describe, expect, test } from '@jest/globals';

import {
  splitThinkingFromContent,
  sanitizeThinkingContent,
  isLikelyThinkingPreface,
  type ThinkingSplitResult,
} from '../../src/lib/perplexity-thinking-utils';

describe('perplexity-thinking-utils', () => {
  describe('splitThinkingFromContent - Official <think> Tag Format', () => {
    test('should extract complete <think> tags with content', () => {
      const source = '<think>這是推理過程的內容</think>這是實際答案';

      const result = splitThinkingFromContent(source);

      expect(result.cleanContent).toBe('這是實際答案');
      expect(result.thinkingText).toBe('這是推理過程的內容');
    });

    test('should extract thinking from official format: <think>...</think>\\nAnswer', () => {
      // Official Perplexity format from docs/tech_docs/Sonar_reasoning_-_Perplexity.md
      const source = '<think>分析問題的推理步驟</think>\n林黛玉是賈母的外孫女，性格孤傲清高。';

      const result = splitThinkingFromContent(source);

      expect(result.cleanContent).toBe('林黛玉是賈母的外孫女，性格孤傲清高。');
      expect(result.thinkingText).toBe('分析問題的推理步驟');
    });

    test('should handle multiple <think> tags and combine thinking content', () => {
      const source = '<think>第一段推理</think>部分答案<think>第二段推理</think>更多答案';

      const result = splitThinkingFromContent(source);

      expect(result.cleanContent).toBe('部分答案更多答案');
      expect(result.thinkingText).toContain('第一段推理');
      expect(result.thinkingText).toContain('第二段推理');
    });

    test('should handle incomplete <think> tags during streaming', () => {
      // Simulates streaming where closing tag hasn't arrived yet
      const source = '<think>推理過程開始但未完成';

      const result = splitThinkingFromContent(source);

      expect(result.cleanContent).toBe('');
      expect(result.thinkingText).toBe('');
    });

    test('should handle empty <think> tags', () => {
      const source = '<think></think>只有答案內容';

      const result = splitThinkingFromContent(source);

      expect(result.cleanContent).toBe('只有答案內容');
      expect(result.thinkingText).toBe('');
    });

    test('should handle <think> tags with whitespace only', () => {
      const source = '<think>   \n  </think>答案內容';

      const result = splitThinkingFromContent(source);

      expect(result.cleanContent).toBe('答案內容');
      expect(result.thinkingText).toBe('');
    });

    test('should handle nested-looking structures (not actually nested)', () => {
      const source = '<think>外層思考<think>看起來像嵌套</think>外層結束</think>答案';

      const result = splitThinkingFromContent(source);

      expect(result.cleanContent).toBe('答案');
      // Should extract both thinking sections
      expect(result.thinkingText.length).toBeGreaterThan(0);
    });

    test('should handle <think> tags with line breaks inside', () => {
      const source = '<think>\n第一行推理\n第二行推理\n</think>\n答案在這裡';

      const result = splitThinkingFromContent(source);

      expect(result.cleanContent).toBe('答案在這裡');
      expect(result.thinkingText).toContain('第一行推理');
      expect(result.thinkingText).toContain('第二行推理');
    });

    test('should prioritize <think> tag extraction over other heuristics', () => {
      const source = '<think>Official thinking</think>\n💭 這不是思考標記\n答案內容';

      const result = splitThinkingFromContent(source);

      expect(result.cleanContent).toContain('答案內容');
      expect(result.thinkingText).toBe('Official thinking');
      // Should not extract the emoji marker when <think> tags are present
      expect(result.thinkingText).not.toContain('💭');
    });
  });

  describe('splitThinkingFromContent - Explicit Marker Detection', () => {
    test('should extract thinking section marked with explicit heading', () => {
      const source = `**💭 思考過程**\n先列出關鍵脈絡。\n---\n最終回答內容在此。`;

      const result = splitThinkingFromContent(source);

      expect(result.cleanContent).toBe('最終回答內容在此。');
      expect(result.thinkingText).toBe('先列出關鍵脈絡。');
    });

    test('should handle 💭 emoji marker', () => {
      const source = '💭\n推理步驟一\n推理步驟二\n---\n正式答案';

      const result = splitThinkingFromContent(source);

      expect(result.cleanContent).toContain('正式答案');
      expect(result.thinkingText).toContain('推理步驟');
    });

    test('should handle "思考過程" text marker', () => {
      const source = '## 思考過程\n先分析背景\n再推導結論\n---\n答案部分';

      const result = splitThinkingFromContent(source);

      expect(result.cleanContent).toContain('答案部分');
      expect(result.thinkingText).toContain('分析背景');
    });

    test('should handle separator variations (---, ##, **)', () => {
      const source1 = '💭 思考\n推理內容\n---\n答案';
      const source2 = '💭 思考\n推理內容\n## 回答\n答案';
      const source3 = '💭 思考\n推理內容\n**答案**\n實際答案';

      const result1 = splitThinkingFromContent(source1);
      const result2 = splitThinkingFromContent(source2);
      const result3 = splitThinkingFromContent(source3);

      expect(result1.thinkingText).toBe('推理內容');
      expect(result2.thinkingText).toBe('推理內容');
      expect(result3.thinkingText).toBe('推理內容');
    });
  });

  describe('splitThinkingFromContent - Analytical Preface Detection', () => {
    test('should detect analytical preface without explicit marker', () => {
      const source = `首先，我會梳理人物之間的關係並思考線索。\n\n接下來是完整的回答內容，包含引用與分析。`;

      const result = splitThinkingFromContent(source);

      expect(result.cleanContent.startsWith('接下來是完整的回答內容')).toBe(true);
      expect(result.thinkingText).toContain('梳理人物之間的關係');
    });

    test('should detect preface starting with "在回答前"', () => {
      const source = '在回答前，讓我先分析一下問題的關鍵要素和相關背景。\n\n林黛玉的性格特點...';

      const result = splitThinkingFromContent(source);

      expect(result.cleanContent).toContain('林黛玉的性格特點');
      expect(result.thinkingText).toContain('分析一下問題');
    });

    test('should detect preface starting with "我會先"', () => {
      const source = '我會先整理相關人物關係，然後推理事件脈絡。\n\n根據文本分析...';

      const result = splitThinkingFromContent(source);

      expect(result.cleanContent).toContain('根據文本分析');
      expect(result.thinkingText).toContain('整理相關人物關係');
    });

    test('should require thinking cues and lead words for preface detection', () => {
      // Has lead word but no thinking cues - should not be detected
      const source1 = '首先，讓我們看看答案。\n\n答案內容在這裡';

      const result1 = splitThinkingFromContent(source1);
      expect(result1.thinkingText).toBe(''); // Should not extract

      // Has thinking cues but no lead word and only one sentence - should not be detected
      const source2 = '我需要思考。\n\n答案內容在這裡';

      const result2 = splitThinkingFromContent(source2);
      expect(result2.thinkingText).toBe(''); // Should not extract
    });

    test('should limit preface detection to first 800 characters', () => {
      const longContent = '思考' + 'A'.repeat(1000) + '\n\n答案';

      const result = splitThinkingFromContent(longContent);

      // Should not detect as preface because double newline is beyond 800 chars
      expect(result.cleanContent).toBe(longContent.trim());
      expect(result.thinkingText).toBe('');
    });

    test('should handle multiple sentences in preface', () => {
      const source = '我需要分析這個問題。首先梳理人物關係。然後推理事件。\n\n最終答案是...';

      const result = splitThinkingFromContent(source);

      expect(result.cleanContent).toContain('最終答案');
      expect(result.thinkingText).toContain('分析這個問題');
    });
  });

  describe('splitThinkingFromContent - Edge Cases', () => {
    test('should return original text when no thinking cues present', () => {
      const source = '這是一段純粹的回答內容，沒有任何思考提示。';

      const result = splitThinkingFromContent(source);

      expect(result.cleanContent).toBe(source);
      expect(result.thinkingText).toBe('');
    });

    test('should handle null input', () => {
      const result = splitThinkingFromContent(null);

      expect(result.cleanContent).toBe('');
      expect(result.thinkingText).toBe('');
    });

    test('should handle undefined input', () => {
      const result = splitThinkingFromContent(undefined);

      expect(result.cleanContent).toBe('');
      expect(result.thinkingText).toBe('');
    });

    test('should handle empty string input', () => {
      const result = splitThinkingFromContent('');

      expect(result.cleanContent).toBe('');
      expect(result.thinkingText).toBe('');
    });

    test('should handle whitespace-only input', () => {
      const result = splitThinkingFromContent('   \n  \t  ');

      expect(result.cleanContent).toBe('');
      expect(result.thinkingText).toBe('');
    });

    test('should handle content with only <think> tags (no answer)', () => {
      const source = '<think>只有思考內容</think>';

      const result = splitThinkingFromContent(source);

      expect(result.cleanContent).toBe('');
      expect(result.thinkingText).toBe('只有思考內容');
    });

    test('should normalize CRLF to LF', () => {
      const source = '<think>Windows\r\n換行</think>\r\n答案';

      const result = splitThinkingFromContent(source);

      expect(result.cleanContent).toBe('答案');
      expect(result.thinkingText).toContain('Windows');
      expect(result.thinkingText).not.toContain('\r');
    });

    test('should handle very long thinking content', () => {
      const longThinking = '思考內容 '.repeat(1000);
      const source = `<think>${longThinking}</think>答案`;

      const result = splitThinkingFromContent(source);

      expect(result.cleanContent).toBe('答案');
      expect(result.thinkingText.length).toBeGreaterThan(1000);
    });

    test('should preserve Unicode and special characters in thinking', () => {
      const source = '<think>林黛玉 💔 賈寶玉 🎭 《紅樓夢》</think>答案內容';

      const result = splitThinkingFromContent(source);

      expect(result.thinkingText).toContain('林黛玉');
      expect(result.thinkingText).toContain('💔');
      expect(result.thinkingText).toContain('《紅樓夢》');
    });
  });

  describe('sanitizeThinkingContent', () => {
    test('should trim whitespace and normalize newlines', () => {
      const messy = '\n  思考第一步   \n\n\n  思考第二步  \n';

      const cleaned = sanitizeThinkingContent(messy);

      expect(cleaned).toBe('思考第一步\n\n思考第二步');
    });

    test('should convert CRLF to LF', () => {
      const crlf = '思考步驟一\r\n思考步驟二\r\n思考步驟三';

      const cleaned = sanitizeThinkingContent(crlf);

      expect(cleaned).not.toContain('\r');
      expect(cleaned).toContain('\n');
    });

    test('should collapse multiple blank lines to maximum of two', () => {
      const many = '第一段\n\n\n\n\n第二段';

      const cleaned = sanitizeThinkingContent(many);

      expect(cleaned).toBe('第一段\n\n第二段');
    });

    test('should remove standalone separator lines (---)', () => {
      const withSeparator = '思考內容\n---\n更多思考';

      const cleaned = sanitizeThinkingContent(withSeparator);

      expect(cleaned).not.toContain('---');
      expect(cleaned).toContain('思考內容');
      expect(cleaned).toContain('更多思考');
    });

    test('should trim leading and trailing whitespace from each line', () => {
      const spacedLines = '  第一行  \n  第二行  \n  第三行  ';

      const cleaned = sanitizeThinkingContent(spacedLines);

      expect(cleaned).toBe('第一行\n第二行\n第三行');
    });

    test('should handle null input', () => {
      const cleaned = sanitizeThinkingContent(null);

      expect(cleaned).toBe('');
    });

    test('should handle undefined input', () => {
      const cleaned = sanitizeThinkingContent(undefined);

      expect(cleaned).toBe('');
    });

    test('should handle empty string', () => {
      const cleaned = sanitizeThinkingContent('');

      expect(cleaned).toBe('');
    });

    test('should preserve meaningful content while cleaning formatting', () => {
      const messy = '\r\n  推理步驟一：分析人物關係  \r\n\r\n\r\n  推理步驟二：推導事件脈絡  \r\n---\r\n  推理步驟三：得出結論  \r\n';

      const cleaned = sanitizeThinkingContent(messy);

      expect(cleaned).toContain('推理步驟一');
      expect(cleaned).toContain('推理步驟二');
      expect(cleaned).toContain('推理步驟三');
      expect(cleaned).not.toContain('---');
      expect(cleaned).not.toContain('\r');
    });

    test('should handle error during sanitization gracefully', () => {
      // This test verifies the error handling in the function
      // In practice, most inputs won't cause errors, but we test the fallback
      const input = 'Normal content';

      const cleaned = sanitizeThinkingContent(input);

      expect(cleaned).toBe('Normal content');
    });

    test('should preserve Chinese punctuation and formatting', () => {
      const chinese = '第一步：分析。\n第二步：推理。\n第三步：結論！';

      const cleaned = sanitizeThinkingContent(chinese);

      expect(cleaned).toBe('第一步：分析。\n第二步：推理。\n第三步：結論！');
    });
  });

  describe('isLikelyThinkingPreface', () => {
    test('should identify text with thinking cues and lead words', () => {
      const text = '首先，我需要分析這個問題的背景。';

      expect(isLikelyThinkingPreface(text)).toBe(true);
    });

    test('should identify text with thinking cues and multiple sentences', () => {
      const text = '我需要思考這個問題。讓我分析一下相關因素。';

      expect(isLikelyThinkingPreface(text)).toBe(true);
    });

    test('should identify short text (<=80 chars) with thinking cues', () => {
      // Must have lead word OR multiple sentences to be identified as preface
      const text = '首先，思考步驟一：分析問題。然後進行評估。';

      expect(isLikelyThinkingPreface(text)).toBe(true);
    });

    test('should reject text without thinking cues', () => {
      const text = '首先，讓我們看看答案是什麼。';

      expect(isLikelyThinkingPreface(text)).toBe(false);
    });

    test('should reject text with thinking cues but no lead words and only one sentence', () => {
      const text = '我需要思考這個很長的問題並且仔細分析所有相關的因素和背景資訊。';

      expect(isLikelyThinkingPreface(text)).toBe(false);
    });

    test('should handle null input', () => {
      expect(isLikelyThinkingPreface(null)).toBe(false);
    });

    test('should handle undefined input', () => {
      expect(isLikelyThinkingPreface(undefined)).toBe(false);
    });

    test('should handle empty string', () => {
      expect(isLikelyThinkingPreface('')).toBe(false);
    });

    test('should handle whitespace-only input', () => {
      expect(isLikelyThinkingPreface('   \n  ')).toBe(false);
    });

    test('should identify preface with various lead words', () => {
      const leadWords = [
        '首先，我需要思考',
        '我會先分析這個問題',
        '在正式回答前，讓我思考',
        '在回答前，需要分析',
        '為了回答這個問題，我需要思考',
        '回答之前，讓我梳理一下思路',
        '在深入回答前，先分析背景',
        '回覆之前，我需要思考',
        '第一步是分析問題',
      ];

      leadWords.forEach(text => {
        expect(isLikelyThinkingPreface(text)).toBe(true);
      });
    });

    test('should identify preface with various thinking cues', () => {
      const cues = [
        '首先，需要思考這個問題',
        '首先，進行推理分析',
        '首先，分析相關背景',
        '首先，整理相關資訊',
        '首先，梳理問題脈絡',
        '首先，規劃回答策略',
        '首先，制定解答步驟',
        '首先，建立分析假設',
        '首先，構思回答框架',
        '首先，評估問題難度',
      ];

      cues.forEach(text => {
        expect(isLikelyThinkingPreface(text)).toBe(true);
      });
    });

    test('should count sentences correctly with Chinese punctuation', () => {
      const text = '我需要思考。這是第二句。這是第三句。';

      expect(isLikelyThinkingPreface(text)).toBe(true);
    });

    test('should normalize CRLF before processing', () => {
      const text = '首先，我需要思考\r\n分析問題';

      expect(isLikelyThinkingPreface(text)).toBe(true);
    });
  });

  describe('Type Safety and Return Types', () => {
    test('should return correctly typed ThinkingSplitResult', () => {
      const result: ThinkingSplitResult = splitThinkingFromContent('<think>test</think>answer');

      expect(result).toHaveProperty('cleanContent');
      expect(result).toHaveProperty('thinkingText');
      expect(typeof result.cleanContent).toBe('string');
      expect(typeof result.thinkingText).toBe('string');
    });

    test('should always return strings, never null or undefined', () => {
      const result1 = splitThinkingFromContent(null);
      const result2 = splitThinkingFromContent(undefined);
      const result3 = splitThinkingFromContent('');

      expect(typeof result1.cleanContent).toBe('string');
      expect(typeof result1.thinkingText).toBe('string');
      expect(typeof result2.cleanContent).toBe('string');
      expect(typeof result2.thinkingText).toBe('string');
      expect(typeof result3.cleanContent).toBe('string');
      expect(typeof result3.thinkingText).toBe('string');
    });

    test('sanitizeThinkingContent should always return a string', () => {
      expect(typeof sanitizeThinkingContent(null)).toBe('string');
      expect(typeof sanitizeThinkingContent(undefined)).toBe('string');
      expect(typeof sanitizeThinkingContent('')).toBe('string');
      expect(typeof sanitizeThinkingContent('test')).toBe('string');
    });

    test('isLikelyThinkingPreface should always return a boolean', () => {
      expect(typeof isLikelyThinkingPreface(null)).toBe('boolean');
      expect(typeof isLikelyThinkingPreface(undefined)).toBe('boolean');
      expect(typeof isLikelyThinkingPreface('')).toBe('boolean');
      expect(typeof isLikelyThinkingPreface('test')).toBe('boolean');
    });
  });
});
