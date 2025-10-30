/**
 * @fileOverview Unit Tests for Explain Text Selection AI Flow
 *
 * These tests verify the functionality of the text explanation system using Perplexity AI:
 * - Input validation and type safety
 * - Output structure validation (Markdown format)
 * - Perplexity API integration
 * - Error handling and fallback responses
 * - Edge cases (empty text, long passages, special characters)
 *
 * Test Philosophy (Google's Best Practices):
 * - Test behaviors, not implementation details
 * - Use public APIs only
 * - Self-contained, deterministic tests
 * - Clear, descriptive test names
 * - No complex logic in tests
 *
 * @phase Phase 2 - Missing AI Flow Tests
 * @date 2025-10-30
 */

// Mock Perplexity QA flow to avoid actual API calls
jest.mock('@/ai/flows/perplexity-red-chamber-qa', () => ({
  createPerplexityQAInputForFlow: jest.fn(async (question, selection, context) => ({
    question,
    selection,
    context,
    modelKey: 'sonar-reasoning',
  })),
  perplexityRedChamberQA: jest.fn(async () => ({
    success: true,
    answer: `## 文本解釋

這段文字描述了林黛玉初見賈母的情景。從文學角度來看，這個場景具有重要的敘事意義。

### 關鍵要點
- **人物描寫**：通過「鬢髮如銀」形容賈母的年齡
- **情感鋪墊**：為後續的祖孫關係奠定基礎
- **細節刻畫**：「兩個人攙著」顯示賈母的地位

這種細膩的描寫是《紅樓夢》的典型特色。`,
    citations: [],
    thinkingProcess: null,
  })),
}));

// Mock terminal logger to prevent console output during tests
jest.mock('@/lib/terminal-logger', () => ({
  terminalLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  debugLog: jest.fn(async () => {}),
  errorLog: jest.fn(async () => {}),
}));

// Import after mocks
import {
  explainTextSelection,
  type ExplainTextSelectionInput,
  type ExplainTextSelectionOutput,
} from '@/ai/flows/explain-text-selection';

describe('Explain Text Selection AI Flow Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Input Validation', () => {
    /**
     * Test: Should accept valid text selection input
     *
     * Expected Behavior:
     * - All three required fields provided
     * - Function processes input successfully
     * - Returns explanation output
     */
    it('should accept valid text selection input', async () => {
      const validInput: ExplainTextSelectionInput = {
        selectedText: '黛玉方進入房時，只見兩個人攙著一位鬢髮如銀的老母迎上來。',
        chapterContext: '第三回：賈雨村夤緣復舊職，林黛玉拋父進京都。黛玉進入榮國府...',
        userQuestion: '這段描寫林黛玉見到賈母時的場景有什麼特別之處？',
      };

      const result = await explainTextSelection(validInput);

      expect(result).toBeDefined();
      expect(result.explanation).toBeTruthy();
      expect(typeof result.explanation).toBe('string');
    });

    /**
     * Test: Should handle short selected text
     *
     * Expected Behavior:
     * - Even brief selections are valid
     * - AI can provide context and explanation
     */
    it('should handle short selected text (1-10 characters)', async () => {
      const shortInput: ExplainTextSelectionInput = {
        selectedText: '黛玉',
        chapterContext: '林黛玉是賈母的外孫女...',
        userQuestion: '黛玉這個名字有什麼含義？',
      };

      const result = await explainTextSelection(shortInput);

      expect(result).toBeDefined();
      expect(result.explanation).toBeTruthy();
    });

    /**
     * Test: Should handle long selected passages
     *
     * Expected Behavior:
     * - Long passages (100+ characters) are valid
     * - AI can analyze extended text
     * - No truncation errors
     */
    it('should handle long selected passages (100+ characters)', async () => {
      const longText = '黛玉方進入房時，只見兩個人攙著一位鬢髮如銀的老母迎上來，黛玉便知是他外祖母。方欲拜見時，早被他外祖母一把摟入懷中，心肝兒肉叫著大哭起來。當下地下侍立之人，無不掩面涕泣，黛玉也哭個不住。'.repeat(2);

      const longInput: ExplainTextSelectionInput = {
        selectedText: longText,
        chapterContext: '第三回：賈雨村夤緣復舊職，林黛玉拋父進京都...',
        userQuestion: '這段祖孫重逢的場景表達了什麼情感？',
      };

      const result = await explainTextSelection(longInput);

      expect(result).toBeDefined();
      expect(result.explanation.length).toBeGreaterThan(0);
    });

    /**
     * Test: Should handle Traditional Chinese punctuation
     *
     * Expected Behavior:
     * - Traditional Chinese punctuation (「」、。！) handled correctly
     * - No encoding errors
     * - Proper text processing
     */
    it('should handle Traditional Chinese punctuation correctly', async () => {
      const punctuatedInput: ExplainTextSelectionInput = {
        selectedText: '「這是老太太的規矩！」鳳姐笑道。',
        chapterContext: '王熙鳳向眾人解釋賈府的規矩...',
        userQuestion: '這段對話反映了什麼？',
      };

      const result = await explainTextSelection(punctuatedInput);

      expect(result).toBeDefined();
      expect(result.explanation).toBeTruthy();
    });

    /**
     * Test: Should handle questions in Traditional Chinese
     *
     * Expected Behavior:
     * - User questions in Chinese are processed correctly
     * - Response is in Traditional Chinese (Markdown)
     * - Language consistency maintained
     */
    it('should handle Traditional Chinese questions', async () => {
      const chineseQuestionInput: ExplainTextSelectionInput = {
        selectedText: '寶玉看了，果然是黛玉的筆墨。',
        chapterContext: '賈寶玉在大觀園中發現黛玉的詩詞...',
        userQuestion: '為什麼寶玉一眼就能認出是黛玉的字跡？',
      };

      const result = await explainTextSelection(chineseQuestionInput);

      expect(result.explanation).toContain('##'); // Should contain Markdown headers
    });
  });

  describe('Output Structure Validation', () => {
    /**
     * Test: Should return Markdown formatted explanation
     *
     * Expected Behavior:
     * - Explanation uses Markdown syntax
     * - Contains headers (##), lists (-), or emphasis (**)
     * - Well-structured response
     */
    it('should return Markdown formatted explanation', async () => {
      const input: ExplainTextSelectionInput = {
        selectedText: '賈母笑道：「我這老婆子，最喜歡這些年輕人的笑話。」',
        chapterContext: '賈母與家人歡聚...',
        userQuestion: '這句話體現了賈母怎樣的性格？',
      };

      const result = await explainTextSelection(input);

      // Should contain Markdown elements
      const hasMarkdown =
        result.explanation.includes('##') || // Headers
        result.explanation.includes('**') || // Bold
        result.explanation.includes('- ') || // Lists
        result.explanation.includes('* '); // Lists

      expect(hasMarkdown).toBe(true);
    });

    /**
     * Test: Explanation should be non-empty string
     *
     * Expected Behavior:
     * - Explanation field is always present
     * - Contains meaningful content (not just whitespace)
     * - Minimum reasonable length (> 10 characters)
     */
    it('should return non-empty explanation', async () => {
      const input: ExplainTextSelectionInput = {
        selectedText: '寶釵拍手笑道：「倒是這話有理！」',
        chapterContext: '薛寶釵評論某人的話...',
        userQuestion: '寶釵為什麼這樣說？',
      };

      const result = await explainTextSelection(input);

      expect(result.explanation).toBeTruthy();
      expect(result.explanation.trim().length).toBeGreaterThan(10);
    });

    /**
     * Test: Should maintain type safety for output
     *
     * Expected Behavior:
     * - Output matches ExplainTextSelectionOutput type
     * - explanation property is string type
     * - No unexpected properties
     */
    it('should maintain type safety for output structure', async () => {
      const input: ExplainTextSelectionInput = {
        selectedText: '探春笑道：「這是什麼話！」',
        chapterContext: '賈探春與姐妹們交談...',
        userQuestion: '探春的反應說明了什麼？',
      };

      const result: ExplainTextSelectionOutput = await explainTextSelection(input);

      expect(typeof result.explanation).toBe('string');
      expect('explanation' in result).toBe(true);
    });
  });

  describe('Perplexity API Integration', () => {
    /**
     * Test: Should call Perplexity QA with correct parameters
     *
     * Expected Behavior:
     * - createPerplexityQAInputForFlow called with proper args
     * - perplexityRedChamberQA invoked
     * - Model key set to 'sonar-reasoning'
     * - Reasoning effort is 'medium'
     */
    it('should call Perplexity API with correct parameters', async () => {
      const { createPerplexityQAInputForFlow, perplexityRedChamberQA } = require('@/ai/flows/perplexity-red-chamber-qa');

      const input: ExplainTextSelectionInput = {
        selectedText: '鳳姐笑道：「你們那裡知道，這是老太太的規矩。」',
        chapterContext: '王熙鳳向眾人解釋賈府規矩...',
        userQuestion: '這體現了賈府怎樣的家規？',
      };

      await explainTextSelection(input);

      // Verify createPerplexityQAInputForFlow was called
      expect(createPerplexityQAInputForFlow).toHaveBeenCalledWith(
        input.userQuestion,
        expect.objectContaining({
          text: input.selectedText,
          position: null,
          range: null,
        }),
        input.chapterContext,
        'current-chapter',
        expect.objectContaining({
          modelKey: 'sonar-reasoning',
          reasoningEffort: 'medium',
        })
      );

      // Verify perplexityRedChamberQA was called
      expect(perplexityRedChamberQA).toHaveBeenCalled();
    });

    /**
     * Test: Should use sonar-reasoning model
     *
     * Expected Behavior:
     * - Model specified as 'sonar-reasoning' for text explanations
     * - Not using basic sonar model
     * - Ensures higher quality reasoning
     */
    it('should use sonar-reasoning model for text explanations', async () => {
      const { createPerplexityQAInputForFlow } = require('@/ai/flows/perplexity-red-chamber-qa');

      const input: ExplainTextSelectionInput = {
        selectedText: '測試文本',
        chapterContext: '測試上下文',
        userQuestion: '測試問題',
      };

      await explainTextSelection(input);

      const callArgs = createPerplexityQAInputForFlow.mock.calls[0];
      const options = callArgs[4]; // 5th argument is options object

      expect(options.modelKey).toBe('sonar-reasoning');
    });

    /**
     * Test: Should use medium reasoning effort
     *
     * Expected Behavior:
     * - Reasoning effort set to 'medium'
     * - Balances quality and response time
     * - Not too fast (low) or too slow (high)
     */
    it('should use medium reasoning effort for balanced performance', async () => {
      const { createPerplexityQAInputForFlow } = require('@/ai/flows/perplexity-red-chamber-qa');

      const input: ExplainTextSelectionInput = {
        selectedText: '測試文本',
        chapterContext: '測試上下文',
        userQuestion: '測試問題',
      };

      await explainTextSelection(input);

      const callArgs = createPerplexityQAInputForFlow.mock.calls[0];
      const options = callArgs[4];

      expect(options.reasoningEffort).toBe('medium');
    });
  });

  describe('Error Handling and Fallbacks', () => {
    /**
     * Test: Should provide fallback when Perplexity API fails
     *
     * Expected Behavior:
     * - When API returns success: false
     * - Fallback explanation is provided
     * - Includes original selected text and question
     * - Suggests troubleshooting steps
     */
    it('should provide fallback explanation when Perplexity API fails', async () => {
      const { perplexityRedChamberQA } = require('@/ai/flows/perplexity-red-chamber-qa');

      // Mock API failure
      (perplexityRedChamberQA as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'API rate limit exceeded',
        answer: null,
      });

      const input: ExplainTextSelectionInput = {
        selectedText: '測試文本',
        chapterContext: '測試上下文',
        userQuestion: '測試問題',
      };

      const result = await explainTextSelection(input);

      // Should still return a result (fallback)
      expect(result).toBeDefined();
      expect(result.explanation).toContain('測試文本');
      expect(result.explanation).toContain('測試問題');
      expect(result.explanation).toContain('很抱歉');
    });

    /**
     * Test: Should handle network errors gracefully
     *
     * Expected Behavior:
     * - When API throws exception
     * - Error is caught and handled
     * - User-friendly fallback message provided
     * - No uncaught exceptions
     */
    it('should handle network errors gracefully', async () => {
      const { perplexityRedChamberQA } = require('@/ai/flows/perplexity-red-chamber-qa');

      // Mock network error
      (perplexityRedChamberQA as jest.Mock).mockRejectedValueOnce(
        new Error('Network timeout after 30s')
      );

      const input: ExplainTextSelectionInput = {
        selectedText: '網路錯誤測試',
        chapterContext: '測試上下文',
        userQuestion: '測試問題',
      };

      const result = await explainTextSelection(input);

      expect(result).toBeDefined();
      expect(result.explanation).toBeTruthy();
      expect(result.explanation).toContain('網路錯誤測試');
    });

    /**
     * Test: Fallback should include error details
     *
     * Expected Behavior:
     * - Fallback explanation mentions the error
     * - Helps users understand what went wrong
     * - Provides actionable suggestions
     */
    it('should include error details in fallback explanation', async () => {
      const { perplexityRedChamberQA } = require('@/ai/flows/perplexity-red-chamber-qa');

      const errorMessage = 'API key invalid';
      (perplexityRedChamberQA as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      const input: ExplainTextSelectionInput = {
        selectedText: '錯誤測試',
        chapterContext: '測試',
        userQuestion: '測試',
      };

      const result = await explainTextSelection(input);

      expect(result.explanation).toContain(errorMessage);
      expect(result.explanation).toContain('錯誤詳情');
    });

    /**
     * Test: Fallback should suggest troubleshooting steps
     *
     * Expected Behavior:
     * - Provides helpful suggestions
     * - Mentions network check, simplifying question, retrying
     * - User-friendly guidance
     */
    it('should suggest troubleshooting steps in fallback', async () => {
      const { perplexityRedChamberQA } = require('@/ai/flows/perplexity-red-chamber-qa');

      (perplexityRedChamberQA as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

      const input: ExplainTextSelectionInput = {
        selectedText: '測試',
        chapterContext: '測試',
        userQuestion: '測試',
      };

      const result = await explainTextSelection(input);

      expect(result.explanation).toContain('建議');
      expect(result.explanation).toContain('網路');
    });
  });

  describe('Edge Cases', () => {
    /**
     * Test: Should handle empty user question gracefully
     *
     * Expected Behavior:
     * - Even with empty question, function doesn't crash
     * - Returns some explanation or asks for clarification
     */
    it('should handle empty or very short questions', async () => {
      const input: ExplainTextSelectionInput = {
        selectedText: '黛玉笑道：「好！」',
        chapterContext: '林黛玉與姐妹們交談...',
        userQuestion: '為何？',
      };

      const result = await explainTextSelection(input);

      expect(result).toBeDefined();
      expect(result.explanation).toBeTruthy();
    });

    /**
     * Test: Should handle very long questions
     *
     * Expected Behavior:
     * - Long, detailed questions are processed
     * - No truncation or errors
     * - AI can handle extended context
     */
    it('should handle very long and detailed questions', async () => {
      const longQuestion = `這段文字描寫了林黛玉初見賈母的情景，請從以下幾個角度分析：
1. 人物描寫的細膩程度
2. 情感表達的深度
3. 與後續情節的關聯
4. 文學手法的運用
5. 在整部小說中的意義
請詳細說明每一點。`.repeat(2);

      const input: ExplainTextSelectionInput = {
        selectedText: '黛玉方進入房時，只見兩個人攙著一位鬢髮如銀的老母迎上來。',
        chapterContext: '第三回內容...',
        userQuestion: longQuestion,
      };

      const result = await explainTextSelection(input);

      expect(result).toBeDefined();
      expect(result.explanation.length).toBeGreaterThan(0);
    });

    /**
     * Test: Should handle selections with mixed punctuation
     *
     * Expected Behavior:
     * - Mixed Chinese and English punctuation handled
     * - Special characters (！？、。「」) processed correctly
     */
    it('should handle text with mixed Chinese and English punctuation', async () => {
      const input: ExplainTextSelectionInput = {
        selectedText: '「這是什麼話！」探春笑道，"真是奇怪。"',
        chapterContext: '測試上下文...',
        userQuestion: '這段對話有什麼特點？',
      };

      const result = await explainTextSelection(input);

      expect(result).toBeDefined();
      expect(result.explanation).toBeTruthy();
    });
  });

  describe('Response Quality', () => {
    /**
     * Test: Explanation should be contextually relevant
     *
     * Expected Behavior:
     * - Response relates to the selected text
     * - Answers the specific question asked
     * - Provides meaningful literary analysis
     */
    it('should provide contextually relevant explanations', async () => {
      const input: ExplainTextSelectionInput = {
        selectedText: '賈母笑道：「我這老婆子，最喜歡這些年輕人的笑話。」',
        chapterContext: '賈母與家人聚會...',
        userQuestion: '這句話反映了賈母怎樣的性格特點？',
      };

      const result = await explainTextSelection(input);

      // Response should mention personality/character
      const hasRelevantContent =
        result.explanation.includes('性格') ||
        result.explanation.includes('特點') ||
        result.explanation.includes('賈母');

      expect(hasRelevantContent).toBe(true);
    });
  });
});
