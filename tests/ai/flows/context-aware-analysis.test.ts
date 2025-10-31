/**
 * @fileOverview Unit Tests for Context-Aware Analysis AI Flow
 *
 * These tests verify the context analysis system using Perplexity AI:
 * - Input validation (text and chapter)
 * - Dual output structure (word sense + character relationships)
 * - Response parsing logic
 * - Markdown formatting
 * - Error handling and fallbacks
 *
 * Test Philosophy (Google's Best Practices):
 * - Test behaviors, not implementation
 * - Use public APIs only
 * - Self-contained, deterministic tests
 *
 * @phase Phase 2 - Missing AI Flow Tests
 * @date 2025-10-30
 */

// Mock Perplexity QA flow
jest.mock('@/ai/flows/perplexity-red-chamber-qa', () => ({
  createPerplexityQAInputForFlow: jest.fn(async () => ({})),
  perplexityRedChamberQA: jest.fn(async () => ({
    success: true,
    answer: `## 詞義分析

這段文字中包含多個值得注意的詞彙：

- **鬢髮如銀**：形容賈母的年齡與地位
- **攙著**：扶持之意，顯示對長者的尊重
- **迎上來**：主動前來迎接

### 文學技巧
使用細膩的動作描寫展現人物關係。

## 人物關係分析

此段落涉及的人物關係：

1. **林黛玉**：賈母的外孫女
2. **賈母**：林黛玉的外祖母，賈府的最高權威
3. **丫鬟**：服侍賈母的人

### 關係層級
賈母作為族長，享有最高地位。`,
    citations: [],
    thinkingProcess: null,
  })),
}));

// Import after mocks
import {
  analyzeContext,
  type ContextAnalysisInput,
  type ContextAnalysisOutput,
} from '@/ai/flows/context-aware-analysis';

describe('Context-Aware Analysis AI Flow Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Input Validation', () => {
    it('should accept valid text and chapter input', async () => {
      const validInput: ContextAnalysisInput = {
        text: '黛玉方進入房時，只見兩個人攙著一位鬢髮如銀的老母迎上來。',
        chapter: '第三回',
      };

      const result = await analyzeContext(validInput);

      expect(result).toBeDefined();
      expect(result.wordSenseAnalysis).toBeTruthy();
      expect(result.characterRelationships).toBeTruthy();
    });

    it('should handle long text passages', async () => {
      const longText = '黛玉方進入房時，只見兩個人攙著一位鬢髮如銀的老母迎上來，黛玉便知是他外祖母。'.repeat(5);

      const input: ContextAnalysisInput = {
        text: longText,
        chapter: '第三回',
      };

      const result = await analyzeContext(input);

      expect(result).toBeDefined();
      expect(typeof result.wordSenseAnalysis).toBe('string');
      expect(typeof result.characterRelationships).toBe('string');
    });

    it('should handle chapter titles in different formats', async () => {
      const inputs = [
        { text: '測試文本', chapter: '第一回' },
        { text: '測試文本', chapter: 'Chapter 1' },
        { text: '測試文本', chapter: '第一回：甄士隱夢幻識通靈' },
      ];

      for (const input of inputs) {
        const result = await analyzeContext(input);
        expect(result).toBeDefined();
        expect(result.wordSenseAnalysis).toBeTruthy();
      }
    });
  });

  describe('Output Structure Validation', () => {
    it('should return both word sense analysis and character relationships', async () => {
      const input: ContextAnalysisInput = {
        text: '賈母笑道：「我這老婆子，最喜歡這些年輕人的笑話。」',
        chapter: '第三回',
      };

      const result: ContextAnalysisOutput = await analyzeContext(input);

      expect('wordSenseAnalysis' in result).toBe(true);
      expect('characterRelationships' in result).toBe(true);
      expect(typeof result.wordSenseAnalysis).toBe('string');
      expect(typeof result.characterRelationships).toBe('string');
    });

    it('should return Markdown formatted analysis', async () => {
      const input: ContextAnalysisInput = {
        text: '寶玉看了，果然是黛玉的筆墨。',
        chapter: '第八回',
      };

      const result = await analyzeContext(input);

      // Should contain Markdown elements
      const wordSenseHasMarkdown = result.wordSenseAnalysis.includes('##') || result.wordSenseAnalysis.includes('**');
      const characterHasMarkdown = result.characterRelationships.includes('##') || result.characterRelationships.includes('**');

      expect(wordSenseHasMarkdown || characterHasMarkdown).toBe(true);
    });

    it('should have non-empty analysis content', async () => {
      const input: ContextAnalysisInput = {
        text: '鳳姐笑道：「你們那裡知道，這是老太太的規矩。」',
        chapter: '第三回',
      };

      const result = await analyzeContext(input);

      expect(result.wordSenseAnalysis.trim().length).toBeGreaterThan(10);
      expect(result.characterRelationships.trim().length).toBeGreaterThan(10);
    });
  });

  describe('Response Parsing Logic', () => {
    it('should correctly parse response with both sections', async () => {
      const input: ContextAnalysisInput = {
        text: '測試文本',
        chapter: '第一回',
      };

      const result = await analyzeContext(input);

      // Word sense analysis should come before character relationships
      expect(result.wordSenseAnalysis).toBeTruthy();
      expect(result.characterRelationships).toBeTruthy();
    });

    it('should handle response with section headers', async () => {
      const { perplexityRedChamberQA } = require('@/ai/flows/perplexity-red-chamber-qa');

      (perplexityRedChamberQA as jest.Mock).mockResolvedValueOnce({
        success: true,
        answer: `## 詞義分析
這裡是詞義分析內容。

## 人物關係分析
這裡是人物關係內容。`,
      });

      const input: ContextAnalysisInput = {
        text: '測試',
        chapter: '測試',
      };

      const result = await analyzeContext(input);

      expect(result.wordSenseAnalysis).toContain('詞義');
      expect(result.characterRelationships).toContain('人物');
    });
  });

  describe('Perplexity API Integration', () => {
    it('should call Perplexity with sonar-reasoning model', async () => {
      const { createPerplexityQAInputForFlow } = require('@/ai/flows/perplexity-red-chamber-qa');

      const input: ContextAnalysisInput = {
        text: '測試文本',
        chapter: '第一回',
      };

      await analyzeContext(input);

      expect(createPerplexityQAInputForFlow).toHaveBeenCalled();
      const callArgs = createPerplexityQAInputForFlow.mock.calls[0];
      const options = callArgs[4];

      expect(options.modelKey).toBe('sonar-reasoning');
    });

    it('should use medium reasoning effort', async () => {
      const { createPerplexityQAInputForFlow } = require('@/ai/flows/perplexity-red-chamber-qa');

      const input: ContextAnalysisInput = {
        text: '測試',
        chapter: '測試',
      };

      await analyzeContext(input);

      const options = createPerplexityQAInputForFlow.mock.calls[0][4];
      expect(options.reasoningEffort).toBe('medium');
    });

    it('should request both word sense and character analysis', async () => {
      const { createPerplexityQAInputForFlow } = require('@/ai/flows/perplexity-red-chamber-qa');

      const input: ContextAnalysisInput = {
        text: '測試文本',
        chapter: '第三回',
      };

      await analyzeContext(input);

      const question = createPerplexityQAInputForFlow.mock.calls[0][0];

      expect(question).toContain('詞義分析');
      expect(question).toContain('人物關係');
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should provide fallback when Perplexity API fails', async () => {
      const { perplexityRedChamberQA } = require('@/ai/flows/perplexity-red-chamber-qa');

      (perplexityRedChamberQA as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'API error',
      });

      const input: ContextAnalysisInput = {
        text: '測試文本',
        chapter: '第一回',
      };

      const result = await analyzeContext(input);

      expect(result).toBeDefined();
      expect(result.wordSenseAnalysis).toContain('很抱歉');
      expect(result.characterRelationships).toContain('很抱歉');
    });

    it('should handle network errors gracefully', async () => {
      const { perplexityRedChamberQA } = require('@/ai/flows/perplexity-red-chamber-qa');

      (perplexityRedChamberQA as jest.Mock).mockRejectedValueOnce(
        new Error('Network timeout')
      );

      const input: ContextAnalysisInput = {
        text: '測試',
        chapter: '測試',
      };

      const result = await analyzeContext(input);

      expect(result).toBeDefined();
      expect(result.wordSenseAnalysis).toBeTruthy();
      expect(result.characterRelationships).toBeTruthy();
    });

    it('should include chapter context in fallback', async () => {
      const { perplexityRedChamberQA } = require('@/ai/flows/perplexity-red-chamber-qa');

      (perplexityRedChamberQA as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

      const input: ContextAnalysisInput = {
        text: '測試',
        chapter: '第五回',
      };

      const result = await analyzeContext(input);

      expect(result.wordSenseAnalysis).toContain('第五回');
    });
  });

  describe('Content Quality', () => {
    it('should provide contextually relevant word analysis', async () => {
      const input: ContextAnalysisInput = {
        text: '黛玉方進入房時，只見兩個人攙著一位鬢髮如銀的老母迎上來。',
        chapter: '第三回',
      };

      const result = await analyzeContext(input);

      const hasRelevantContent =
        result.wordSenseAnalysis.includes('鬢髮') ||
        result.wordSenseAnalysis.includes('詞') ||
        result.wordSenseAnalysis.includes('銀');

      expect(hasRelevantContent).toBe(true);
    });

    it('should analyze character relationships from the text', async () => {
      const input: ContextAnalysisInput = {
        text: '黛玉方進入房時，只見兩個人攙著一位鬢髮如銀的老母迎上來，黛玉便知是他外祖母。',
        chapter: '第三回',
      };

      const result = await analyzeContext(input);

      const hasCharacterContent =
        result.characterRelationships.includes('黛玉') ||
        result.characterRelationships.includes('賈母') ||
        result.characterRelationships.includes('人物') ||
        result.characterRelationships.includes('關係');

      expect(hasCharacterContent).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle text with mixed punctuation', async () => {
      const input: ContextAnalysisInput = {
        text: '「這是什麼話！」探春笑道，"真是奇怪。"',
        chapter: '第十回',
      };

      const result = await analyzeContext(input);

      expect(result).toBeDefined();
      expect(result.wordSenseAnalysis).toBeTruthy();
      expect(result.characterRelationships).toBeTruthy();
    });

    it('should handle very short text snippets', async () => {
      const input: ContextAnalysisInput = {
        text: '黛玉笑道。',
        chapter: '第一回',
      };

      const result = await analyzeContext(input);

      expect(result).toBeDefined();
      expect(result.wordSenseAnalysis.length).toBeGreaterThan(0);
    });
  });
});
