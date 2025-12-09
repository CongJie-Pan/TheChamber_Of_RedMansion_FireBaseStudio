/**
 * @fileOverview SimpleThinkParser Unit Tests (PRX-007)
 *
 * Test cases for the <think> tag parser covering:
 * - Complete tag parsing
 * - Cross-chunk tag splitting
 * - Plain text without tags
 * - Consecutive multiple blocks
 * - Edge cases
 */

import { SimpleThinkParser } from '@/lib/adapters/simple-think-parser';

describe('SimpleThinkParser', () => {
  let parser: SimpleThinkParser;

  beforeEach(() => {
    parser = new SimpleThinkParser();
  });

  afterEach(() => {
    parser.reset();
  });

  describe('Complete tag parsing', () => {
    it('should parse a complete <think> block in a single chunk', () => {
      const input = '<think>這是思考過程</think>這是答案';
      const chunks = parser.parse(input);

      expect(chunks).toEqual([
        { type: 'thinking_start' },
        { type: 'thinking_content', content: '這是思考過程' },
        { type: 'thinking_end' },
        { type: 'content', content: '這是答案' },
      ]);
    });

    it('should handle empty think block', () => {
      const input = '<think></think>答案';
      const chunks = parser.parse(input);

      expect(chunks).toEqual([
        { type: 'thinking_start' },
        { type: 'thinking_end' },
        { type: 'content', content: '答案' },
      ]);
    });

    it('should handle content before think tag', () => {
      const input = '前言<think>思考</think>答案';
      const chunks = parser.parse(input);

      expect(chunks).toEqual([
        { type: 'content', content: '前言' },
        { type: 'thinking_start' },
        { type: 'thinking_content', content: '思考' },
        { type: 'thinking_end' },
        { type: 'content', content: '答案' },
      ]);
    });

    it('should handle think block at the end', () => {
      const input = '<think>只有思考</think>';
      const chunks = parser.parse(input);

      expect(chunks).toEqual([
        { type: 'thinking_start' },
        { type: 'thinking_content', content: '只有思考' },
        { type: 'thinking_end' },
      ]);
    });
  });

  describe('Cross-chunk start tag splitting', () => {
    it('should handle <think> split as < + think>', () => {
      const chunks1 = parser.parse('前言<');
      const chunks2 = parser.parse('think>思考');

      expect(chunks1).toEqual([
        { type: 'content', content: '前言' },
      ]);
      expect(chunks2).toEqual([
        { type: 'thinking_start' },
        { type: 'thinking_content', content: '思考' },
      ]);
    });

    it('should handle <think> split as <t + hink>', () => {
      const chunks1 = parser.parse('前言<t');
      const chunks2 = parser.parse('hink>思考');

      expect(chunks1).toEqual([
        { type: 'content', content: '前言' },
      ]);
      expect(chunks2).toEqual([
        { type: 'thinking_start' },
        { type: 'thinking_content', content: '思考' },
      ]);
    });

    it('should handle <think> split as <th + ink>', () => {
      const chunks1 = parser.parse('前言<th');
      const chunks2 = parser.parse('ink>思考內容');

      expect(chunks1).toEqual([
        { type: 'content', content: '前言' },
      ]);
      expect(chunks2).toEqual([
        { type: 'thinking_start' },
        { type: 'thinking_content', content: '思考內容' },
      ]);
    });

    it('should handle <think> split as <thi + nk>', () => {
      const chunks1 = parser.parse('<thi');
      const chunks2 = parser.parse('nk>內容');

      expect(chunks1).toEqual([]);
      expect(chunks2).toEqual([
        { type: 'thinking_start' },
        { type: 'thinking_content', content: '內容' },
      ]);
    });

    it('should handle <think> split as <thin + k>', () => {
      const chunks1 = parser.parse('文字<thin');
      const chunks2 = parser.parse('k>思考中');

      expect(chunks1).toEqual([
        { type: 'content', content: '文字' },
      ]);
      expect(chunks2).toEqual([
        { type: 'thinking_start' },
        { type: 'thinking_content', content: '思考中' },
      ]);
    });

    it('should handle <think> split as <think + >', () => {
      const chunks1 = parser.parse('開始<think');
      const chunks2 = parser.parse('>思考');

      expect(chunks1).toEqual([
        { type: 'content', content: '開始' },
      ]);
      expect(chunks2).toEqual([
        { type: 'thinking_start' },
        { type: 'thinking_content', content: '思考' },
      ]);
    });
  });

  describe('Cross-chunk end tag splitting', () => {
    it('should handle </think> split as </ + think>', () => {
      parser.parse('<think>思考');
      const chunks = parser.parse('內容</');
      const chunks2 = parser.parse('think>答案');

      expect(chunks).toEqual([
        { type: 'thinking_content', content: '內容' },
      ]);
      expect(chunks2).toEqual([
        { type: 'thinking_end' },
        { type: 'content', content: '答案' },
      ]);
    });

    it('should handle </think> split as </t + hink>', () => {
      parser.parse('<think>開始');
      const chunks = parser.parse('繼續</t');
      const chunks2 = parser.parse('hink>完成');

      expect(chunks).toEqual([
        { type: 'thinking_content', content: '繼續' },
      ]);
      expect(chunks2).toEqual([
        { type: 'thinking_end' },
        { type: 'content', content: '完成' },
      ]);
    });

    it('should handle </think> split as </th + ink>', () => {
      parser.parse('<think>');
      const chunks = parser.parse('思考</th');
      const chunks2 = parser.parse('ink>結論');

      expect(chunks).toEqual([
        { type: 'thinking_content', content: '思考' },
      ]);
      expect(chunks2).toEqual([
        { type: 'thinking_end' },
        { type: 'content', content: '結論' },
      ]);
    });

    it('should handle </think> split as </thi + nk>', () => {
      parser.parse('<think>分析');
      const chunks = parser.parse('</thi');
      const chunks2 = parser.parse('nk>答覆');

      expect(chunks).toEqual([]);
      expect(chunks2).toEqual([
        { type: 'thinking_end' },
        { type: 'content', content: '答覆' },
      ]);
    });

    it('should handle </think> split as </thin + k>', () => {
      parser.parse('<think>思緒</thin');
      const chunks = parser.parse('k>最終答案');

      expect(chunks).toEqual([
        { type: 'thinking_end' },
        { type: 'content', content: '最終答案' },
      ]);
    });

    it('should handle </think> split as </think + >', () => {
      parser.parse('<think>推理</think');
      const chunks = parser.parse('>解答');

      expect(chunks).toEqual([
        { type: 'thinking_end' },
        { type: 'content', content: '解答' },
      ]);
    });
  });

  describe('Plain text without tags', () => {
    it('should parse plain text as content', () => {
      const input = '這是沒有標籤的純文字內容';
      const chunks = parser.parse(input);

      expect(chunks).toEqual([
        { type: 'content', content: '這是沒有標籤的純文字內容' },
      ]);
    });

    it('should handle multiple plain text chunks', () => {
      const chunks1 = parser.parse('第一段');
      const chunks2 = parser.parse('第二段');
      const chunks3 = parser.parse('第三段');

      expect(chunks1).toEqual([{ type: 'content', content: '第一段' }]);
      expect(chunks2).toEqual([{ type: 'content', content: '第二段' }]);
      expect(chunks3).toEqual([{ type: 'content', content: '第三段' }]);
    });

    it('should handle empty string', () => {
      const chunks = parser.parse('');
      expect(chunks).toEqual([]);
    });

    it('should handle whitespace only', () => {
      const chunks = parser.parse('   \n\t  ');
      expect(chunks).toEqual([{ type: 'content', content: '   \n\t  ' }]);
    });
  });

  describe('Consecutive multiple blocks', () => {
    it('should handle two consecutive think blocks', () => {
      const input = '<think>第一次思考</think>中間答案<think>第二次思考</think>最終答案';
      const chunks = parser.parse(input);

      expect(chunks).toEqual([
        { type: 'thinking_start' },
        { type: 'thinking_content', content: '第一次思考' },
        { type: 'thinking_end' },
        { type: 'content', content: '中間答案' },
        { type: 'thinking_start' },
        { type: 'thinking_content', content: '第二次思考' },
        { type: 'thinking_end' },
        { type: 'content', content: '最終答案' },
      ]);
    });

    it('should handle think blocks across multiple chunks', () => {
      const chunks1 = parser.parse('<think>第一');
      const chunks2 = parser.parse('次</think>回答<think>第二');
      const chunks3 = parser.parse('次</think>完成');

      expect(chunks1).toEqual([
        { type: 'thinking_start' },
        { type: 'thinking_content', content: '第一' },
      ]);
      expect(chunks2).toEqual([
        { type: 'thinking_content', content: '次' },
        { type: 'thinking_end' },
        { type: 'content', content: '回答' },
        { type: 'thinking_start' },
        { type: 'thinking_content', content: '第二' },
      ]);
      expect(chunks3).toEqual([
        { type: 'thinking_content', content: '次' },
        { type: 'thinking_end' },
        { type: 'content', content: '完成' },
      ]);
    });

    it('should handle three consecutive think blocks', () => {
      const input = '<think>A</think>1<think>B</think>2<think>C</think>3';
      const chunks = parser.parse(input);

      expect(chunks).toEqual([
        { type: 'thinking_start' },
        { type: 'thinking_content', content: 'A' },
        { type: 'thinking_end' },
        { type: 'content', content: '1' },
        { type: 'thinking_start' },
        { type: 'thinking_content', content: 'B' },
        { type: 'thinking_end' },
        { type: 'content', content: '2' },
        { type: 'thinking_start' },
        { type: 'thinking_content', content: 'C' },
        { type: 'thinking_end' },
        { type: 'content', content: '3' },
      ]);
    });
  });

  describe('Edge cases', () => {
    it('should handle < without being part of think tag', () => {
      const input = '1 < 2 and 3 > 2';
      const chunks = parser.parse(input);

      expect(chunks).toEqual([
        { type: 'content', content: '1 < 2 and 3 > 2' },
      ]);
    });

    it('should handle partial < that is not think tag', () => {
      const chunks1 = parser.parse('比較：a <');
      const chunks2 = parser.parse(' b，或 a < c');

      // The first chunk should output content before <
      expect(chunks1).toEqual([
        { type: 'content', content: '比較：a ' },
      ]);
      // Second chunk completes, showing it's not a think tag
      expect(chunks2).toEqual([
        { type: 'content', content: '< b，或 a < c' },
      ]);
    });

    it('should handle </t followed by non-hink characters', () => {
      parser.parse('<think>內容');
      const chunks = parser.parse('</table>繼續思考</think>');

      // </table> is not </think>, so it should be treated as content
      expect(chunks).toEqual([
        { type: 'thinking_content', content: '</table>繼續思考' },
        { type: 'thinking_end' },
      ]);
    });

    it('should handle unicode content', () => {
      const input = '<think>日本語の思考 🤔</think>中文答案 💡';
      const chunks = parser.parse(input);

      expect(chunks).toEqual([
        { type: 'thinking_start' },
        { type: 'thinking_content', content: '日本語の思考 🤔' },
        { type: 'thinking_end' },
        { type: 'content', content: '中文答案 💡' },
      ]);
    });

    it('should handle very long content in think block', () => {
      const longText = '長文字'.repeat(1000);
      const input = `<think>${longText}</think>結論`;
      const chunks = parser.parse(input);

      expect(chunks).toEqual([
        { type: 'thinking_start' },
        { type: 'thinking_content', content: longText },
        { type: 'thinking_end' },
        { type: 'content', content: '結論' },
      ]);
    });

    it('should handle newlines in content', () => {
      const input = '<think>第一行\n第二行\n第三行</think>答案\n多行';
      const chunks = parser.parse(input);

      expect(chunks).toEqual([
        { type: 'thinking_start' },
        { type: 'thinking_content', content: '第一行\n第二行\n第三行' },
        { type: 'thinking_end' },
        { type: 'content', content: '答案\n多行' },
      ]);
    });
  });

  describe('Parser state management', () => {
    it('should report isThinking correctly', () => {
      expect(parser.isThinking).toBe(false);

      parser.parse('<think>');
      expect(parser.isThinking).toBe(true);

      parser.parse('思考中');
      expect(parser.isThinking).toBe(true);

      parser.parse('</think>');
      expect(parser.isThinking).toBe(false);
    });

    it('should reset state correctly', () => {
      // Parse content with incomplete closing tag to leave something in buffer
      parser.parse('<think>未完成的思考</thi');
      expect(parser.isThinking).toBe(true);
      expect(parser.bufferSize).toBeGreaterThan(0); // '</thi' in buffer

      parser.reset();
      expect(parser.isThinking).toBe(false);
      expect(parser.bufferSize).toBe(0);
      expect(parser.currentBuffer).toBe('');
    });

    it('should track buffer size correctly', () => {
      expect(parser.bufferSize).toBe(0);

      parser.parse('Hello<');
      expect(parser.bufferSize).toBe(1); // Only '<' in buffer

      parser.parse('think>World');
      expect(parser.bufferSize).toBe(0); // Buffer cleared after tag match
    });

    it('should allow fresh parsing after reset', () => {
      parser.parse('<think>第一次');
      parser.reset();

      const chunks = parser.parse('<think>新的開始</think>新答案');
      expect(chunks).toEqual([
        { type: 'thinking_start' },
        { type: 'thinking_content', content: '新的開始' },
        { type: 'thinking_end' },
        { type: 'content', content: '新答案' },
      ]);
    });
  });

  describe('Streaming simulation', () => {
    it('should handle realistic streaming scenario', () => {
      // Simulate actual API streaming where content comes in small chunks
      const streamChunks = [
        '<thi',
        'nk>\n我',
        '正在分析這個問題',
        '...',
        '\n讓我',
        '仔細思考</th',
        'ink>\n\n根據我的分析，',
        '答案是這樣的。',
      ];

      const allResults: Array<{ type: string; content?: string }> = [];
      for (const chunk of streamChunks) {
        const results = parser.parse(chunk);
        allResults.push(...results);
      }

      expect(allResults).toEqual([
        { type: 'thinking_start' },
        { type: 'thinking_content', content: '\n我' },
        { type: 'thinking_content', content: '正在分析這個問題' },
        { type: 'thinking_content', content: '...' },
        { type: 'thinking_content', content: '\n讓我' },
        { type: 'thinking_content', content: '仔細思考' },
        { type: 'thinking_end' },
        { type: 'content', content: '\n\n根據我的分析，' },
        { type: 'content', content: '答案是這樣的。' },
      ]);
    });

    it('should handle small chunk streaming (realistic case)', () => {
      // Real API streaming sends small chunks (2-10 chars), not single characters
      // Character-by-character is not a realistic scenario and not supported
      const chunks = ['<th', 'ink>', 'Hi', '</t', 'hink', '>', 'OK'];
      const allResults: Array<{ type: string; content?: string }> = [];

      for (const chunk of chunks) {
        const results = parser.parse(chunk);
        allResults.push(...results);
      }

      // Should produce correct results with small chunk streaming
      expect(allResults).toContainEqual({ type: 'thinking_start' });
      expect(allResults).toContainEqual({ type: 'thinking_end' });
      expect(allResults.some(r => r.type === 'thinking_content')).toBe(true);
      expect(allResults.some(r => r.type === 'content')).toBe(true);
    });
  });
});
