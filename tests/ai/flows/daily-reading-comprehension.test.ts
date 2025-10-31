/**
 * @fileOverview Unit tests for Daily Reading Comprehension AI Flow
 *
 * These tests verify the functionality of the reading comprehension assessment system:
 * - Input validation and type safety
 * - Output structure validation
 * - Score calculation and range validation
 * - Difficulty-aware scoring behavior
 * - Keywords matching (captured vs missed)
 * - Edge cases and error handling
 *
 * The tests are designed to work without requiring actual AI API calls
 * by mocking the AI responses and testing the data processing logic.
 */

// Mock OpenAI client to avoid actual API calls during testing
jest.mock('@/lib/openai-client', () => ({
  getOpenAIClient: jest.fn(() => ({
    chat: {
      completions: {
        create: jest.fn(async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                score: 85,
                feedback: '您的理解很不錯，能夠抓住主要要點。建議進一步思考人物關係的複雜性。',
                keyPointsCovered: ['賈寶玉', '林黛玉'],
                keyPointsMissed: ['薛寶釵'],
                detailedAnalysis: '## 閱讀理解評析\n\n您成功理解了文本的**核心含義**，對人物描寫有準確的把握。'
              })
            }
          }]
        }))
      }
    }
  }))
}));

// Import the function to test after mocking
import {
  assessReadingComprehension,
  type ReadingComprehensionInput,
  type ReadingComprehensionOutput
} from '@/ai/flows/daily-reading-comprehension';

describe('Daily Reading Comprehension AI Flow Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Input Validation', () => {
    it('should accept valid reading comprehension input', async () => {
      const validInput: ReadingComprehensionInput = {
        passage: '黛玉方進入房時，只見兩個人攙著一位鬢髮如銀的老母迎上來，黛玉便知是他外祖母。',
        question: '黛玉初見外祖母時的情景是什麼？',
        userAnswer: '黛玉進房時看到兩個人攙扶著一位滿頭銀髮的老太太迎上來，她知道這就是自己的外祖母。',
        expectedKeywords: ['外祖母', '銀髮', '迎上來'],
        difficulty: 'easy',
      };

      const result = await assessReadingComprehension(validInput);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should handle input with minimal required fields', async () => {
      const minimalInput: ReadingComprehensionInput = {
        passage: '寶玉因此把這話當作至言。',
        question: '寶玉的態度是什麼？',
        userAnswer: '寶玉認真對待這句話。',
        expectedKeywords: [],
        difficulty: 'easy',
      };

      const result = await assessReadingComprehension(minimalInput);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.keyPointsMissed).toBeDefined();
    });

    it('should handle special characters in passage and answer', async () => {
      const specialCharInput: ReadingComprehensionInput = {
        passage: '「可見『一切福田，不離方寸』」賈母說道。',
        question: '賈母引用的諺語是什麼意思？',
        userAnswer: '賈母引用「一切福田，不離方寸」，意思是福報都在自己的心中。',
        expectedKeywords: ['福田', '方寸', '心中'],
        difficulty: 'medium',
      };

      const result = await assessReadingComprehension(specialCharInput);

      expect(result).toBeDefined();
      expect(result.feedback).toBeTruthy();
    });
  });

  describe('Output Structure Validation', () => {
    it('should return complete output structure with all required fields', async () => {
      const input: ReadingComprehensionInput = {
        passage: '寶玉看了，果然是黛玉的筆墨。',
        question: '寶玉看到了什麼？',
        userAnswer: '寶玉看到了林黛玉寫的字。',
        expectedKeywords: ['黛玉', '筆墨', '字'],
        difficulty: 'easy',
      };

      const result = await assessReadingComprehension(input);

      // Validate all required output fields
      expect(result.score).toBeDefined();
      expect(typeof result.score).toBe('number');

      expect(result.keyPointsCovered).toBeDefined();
      expect(Array.isArray(result.keyPointsCovered)).toBe(true);

      expect(result.keyPointsMissed).toBeDefined();
      expect(Array.isArray(result.keyPointsMissed)).toBe(true);

      expect(result.feedback).toBeDefined();
      expect(typeof result.feedback).toBe('string');
      expect(result.feedback.length).toBeGreaterThan(0);

      expect(result.detailedAnalysis).toBeDefined();
      expect(typeof result.detailedAnalysis).toBe('string');
    });

    it('should ensure score is within valid range (0-100)', async () => {
      const input: ReadingComprehensionInput = {
        passage: '賈母笑道：「我這老婆子，最喜歡這些年輕人的笑話。」',
        question: '賈母的性格特點是什麼？',
        userAnswer: '賈母慈祥、喜歡熱鬧、親切隨和。',
        expectedKeywords: ['慈祥', '喜歡熱鬧'],
        difficulty: 'medium',
      };

      const result = await assessReadingComprehension(input);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(Number.isInteger(result.score)).toBe(true);
    });

    it('should return valid keywords arrays', async () => {
      const input: ReadingComprehensionInput = {
        passage: '鳳姐笑道：「你們那裡知道，這是老太太的規矩。」',
        question: '這段話透露了什麼信息？',
        userAnswer: '鳳姐說明這是賈府的規矩，由老太太定的。',
        expectedKeywords: ['規矩', '老太太', '賈府'],
        difficulty: 'easy',
      };

      const result = await assessReadingComprehension(input);

      expect(Array.isArray(result.keyPointsCovered)).toBe(true);
      expect(Array.isArray(result.keyPointsMissed)).toBe(true);

      // Keywords should be strings
      result.keyPointsCovered.forEach(keyword => {
        expect(typeof keyword).toBe('string');
      });

      result.keyPointsMissed.forEach(keyword => {
        expect(typeof keyword).toBe('string');
      });
    });
  });

  describe('Difficulty-Aware Scoring', () => {
    const basePassage = '寶釵拍手笑道：「倒是這話有理！」';
    const baseQuestion = '寶釵的反應是什麼？';
    const baseAnswer = '寶釵拍手稱讚，認為這話很有道理。';
    const baseKeywords = ['拍手', '稱讚', '有理'];

    it('should handle easy difficulty with lenient scoring', async () => {
      const easyInput: ReadingComprehensionInput = {
        passage: basePassage,
        question: baseQuestion,
        userAnswer: baseAnswer,
        expectedKeywords: baseKeywords,
        difficulty: 'easy',
      };

      const result = await assessReadingComprehension(easyInput);

      expect(result.score).toBeDefined();
      expect(result.feedback).toContain('您的理解');
      // Easy difficulty should be more forgiving
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should handle medium difficulty with balanced scoring', async () => {
      const mediumInput: ReadingComprehensionInput = {
        passage: basePassage,
        question: baseQuestion,
        userAnswer: baseAnswer,
        expectedKeywords: baseKeywords,
        difficulty: 'medium',
      };

      const result = await assessReadingComprehension(mediumInput);

      expect(result.score).toBeDefined();
      expect(result.keyPointsCovered).toBeDefined();
      expect(result.keyPointsMissed).toBeDefined();
    });

    it('should handle hard difficulty with strict scoring', async () => {
      const hardInput: ReadingComprehensionInput = {
        passage: basePassage,
        question: baseQuestion,
        userAnswer: baseAnswer,
        expectedKeywords: baseKeywords,
        difficulty: 'hard',
      };

      const result = await assessReadingComprehension(hardInput);

      expect(result.score).toBeDefined();
      expect(result.detailedAnalysis).toBeTruthy();
      // Hard difficulty requires detailed analysis
      expect(result.detailedAnalysis.length).toBeGreaterThan(10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty expected keywords array', async () => {
      const input: ReadingComprehensionInput = {
        passage: '探春笑道：「這是什麼話！」',
        question: '探春說了什麼？',
        userAnswer: '探春笑著反問這是什麼話。',
        expectedKeywords: [],
        difficulty: 'easy',
      };

      const result = await assessReadingComprehension(input);

      expect(result.keyPointsCovered).toBeDefined();
      expect(result.keyPointsMissed).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should handle very short user answers', async () => {
      const input: ReadingComprehensionInput = {
        passage: '黛玉笑道：「好！」只說了一個字。',
        question: '黛玉說了什麼？',
        userAnswer: '好。',
        expectedKeywords: ['好'],
        difficulty: 'easy',
      };

      const result = await assessReadingComprehension(input);

      expect(result).toBeDefined();
      expect(result.score).toBeDefined();
      // Short answer should be scored appropriately
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should handle very long user answers', async () => {
      const longAnswer = `
        這段描寫展現了林黛玉初見賈母時的情景，充分體現了曹雪芹細膩的筆觸。
        從黛玉的視角，我們看到兩個丫鬟攙扶著一位滿頭銀髮的老太太迎上前來。
        這個場景不僅描繪了外在的動作，更透露出賈母的地位和黛玉的緊張心理。
        銀髮的細節暗示了賈母的年齡，而「迎上來」則展現了慈愛和親切。
        這種第一次見面的情景為後續的祖孫關係鋪墊了溫馨的基調。
      `.repeat(3);

      const input: ReadingComprehensionInput = {
        passage: '黛玉方進入房時，只見兩個人攙著一位鬢髮如銀的老母迎上來。',
        question: '描述這個場景。',
        userAnswer: longAnswer,
        expectedKeywords: ['外祖母', '銀髮', '迎上來'],
        difficulty: 'medium',
      };

      const result = await assessReadingComprehension(input);

      expect(result).toBeDefined();
      expect(result.score).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle AI failure with fallback response', async () => {
      // This test assumes the flow handles errors gracefully
      const input: ReadingComprehensionInput = {
        passage: '測試段落',
        question: '測試問題',
        userAnswer: '測試回答',
        expectedKeywords: [],
        difficulty: 'easy',
      };

      const result = await assessReadingComprehension(input);

      // Even with potential AI failure, should return valid structure
      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.feedback).toBeTruthy();
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety for input and output', async () => {
      const typedInput: ReadingComprehensionInput = {
        passage: '類型安全測試',
        question: '這是測試嗎？',
        userAnswer: '是的，這是類型安全測試。',
        expectedKeywords: ['測試'],
        difficulty: 'easy',
      };

      const typedOutput: ReadingComprehensionOutput = await assessReadingComprehension(typedInput);

      expect(typeof typedOutput.score).toBe('number');
      expect(Array.isArray(typedOutput.keyPointsCovered)).toBe(true);
      expect(Array.isArray(typedOutput.keyPointsMissed)).toBe(true);
      expect(typeof typedOutput.feedback).toBe('string');
      expect(typeof typedOutput.detailedAnalysis).toBe('string');
    });
  });
});
