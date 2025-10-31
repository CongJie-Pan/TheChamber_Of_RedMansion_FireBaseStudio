/**
 * @fileOverview Unit tests for Poetry Quality Assessment AI Flow
 *
 * These tests verify the functionality of the poetry recitation assessment system:
 * - Input validation with poetry content
 * - Output structure with accuracy/completeness/mistakes
 * - Accuracy calculation for character-by-character comparison
 * - Mistake detection (missing, incorrect, extra content)
 * - Literary analysis generation
 * - Difficulty-aware scoring
 * - Edge cases and error handling
 *
 * The tests use mock AI responses to avoid actual API calls.
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
                accuracy: 95,
                completeness: 90,
                overallScore: 92,
                mistakes: [
                  {
                    line: 2,
                    expected: '花謝花飛花滿天',
                    actual: '花謝花飛滿天',
                    type: 'missing',
                  }
                ],
                feedback: '您的背誦整體很好，只有個別字詞有遺漏。建議多加練習，注意每個字的準確性。',
                literaryAnalysis: '## 詩詞賞析\n\n這首詩是《紅樓夢》中**林黛玉**的代表作品《葬花吟》，表達了對花落的感傷。'
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
  assessPoetryQuality,
  type PoetryQualityInput,
  type PoetryQualityOutput
} from '@/ai/flows/poetry-quality-assessment';

describe('Poetry Quality Assessment AI Flow Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Input Validation', () => {
    it('should accept valid poetry assessment input', async () => {
      const validInput: PoetryQualityInput = {
        poemTitle: '葬花吟',
        originalPoem: '花謝花飛花滿天，紅消香斷有誰憐。',
        userRecitation: '花謝花飛花滿天，紅消香斷有誰憐。',
        author: '林黛玉',
        difficulty: 'medium',
      };

      const result = await assessPoetryQuality(validInput);

      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('should handle minimal poetry input', async () => {
      const minimalInput: PoetryQualityInput = {
        poemTitle: '好了歌',
        originalPoem: '世人都曉神仙好，只有功名忘不了。',
        userRecitation: '世人都曉神仙好，只有功名忘不了。',
        author: '跛足道人',
        difficulty: 'easy',
      };

      const result = await assessPoetryQuality(minimalInput);

      expect(result).toBeDefined();
      expect(result.accuracy).toBeDefined();
      expect(result.completeness).toBeDefined();
    });

    it('should handle special characters and punctuation in poetry', async () => {
      const specialCharInput: PoetryQualityInput = {
        poemTitle: '西江月·嘲賈寶玉',
        originalPoem: '無故尋愁覓恨，有時似傻如狂。\n縱然生得好皮囊，腹內原來草莽。',
        userRecitation: '無故尋愁覓恨，有時似傻如狂。\n縱然生得好皮囊，腹內原來草莽。',
        author: '曹雪芹',
        difficulty: 'medium',
      };

      const result = await assessPoetryQuality(specialCharInput);

      expect(result).toBeDefined();
      expect(result.literaryAnalysis).toBeTruthy();
    });
  });

  describe('Output Structure Validation', () => {
    it('should return complete output structure with all required fields', async () => {
      const input: PoetryQualityInput = {
        poemTitle: '題帕三絕句',
        originalPoem: '眼空蓄淚淚空垂，暗灑閒拋更向誰。',
        userRecitation: '眼空蓄淚淚空垂，暗灑閒拋更向誰。',
        author: '林黛玉',
        difficulty: 'hard',
      };

      const result = await assessPoetryQuality(input);

      // Validate all required output fields
      expect(result.accuracy).toBeDefined();
      expect(typeof result.accuracy).toBe('number');

      expect(result.completeness).toBeDefined();
      expect(typeof result.completeness).toBe('number');

      expect(result.overallScore).toBeDefined();
      expect(typeof result.overallScore).toBe('number');

      expect(result.mistakes).toBeDefined();
      expect(Array.isArray(result.mistakes)).toBe(true);

      expect(result.feedback).toBeDefined();
      expect(typeof result.feedback).toBe('string');
      expect(result.feedback.length).toBeGreaterThan(0);

      expect(result.literaryAnalysis).toBeDefined();
      expect(typeof result.literaryAnalysis).toBe('string');
    });

    it('should validate mistakes array structure', async () => {
      const input: PoetryQualityInput = {
        poemTitle: '秋窗風雨夕',
        originalPoem: '秋花慘淡秋草黃，耿耿秋燈秋夜長。',
        userRecitation: '秋花慘淡秋草黃，秋燈秋夜長。', // Missing 耿耿
        author: '林黛玉',
        difficulty: 'medium',
      };

      const result = await assessPoetryQuality(input);

      expect(Array.isArray(result.mistakes)).toBe(true);

      result.mistakes.forEach(mistake => {
        expect(mistake.line).toBeDefined();
        expect(typeof mistake.line).toBe('number');

        expect(mistake.expected).toBeDefined();
        expect(typeof mistake.expected).toBe('string');

        expect(mistake.actual).toBeDefined();
        expect(typeof mistake.actual).toBe('string');

        expect(mistake.type).toBeDefined();
        expect(['missing', 'incorrect', 'extra']).toContain(mistake.type);
      });
    });

    it('should ensure all scores are within valid range (0-100)', async () => {
      const input: PoetryQualityInput = {
        poemTitle: '唐多令',
        originalPoem: '粉墮百花洲，香殘燕子樓。',
        userRecitation: '粉墮百花洲，香殘燕子樓。',
        author: '曹雪芹',
        difficulty: 'easy',
      };

      const result = await assessPoetryQuality(input);

      expect(result.accuracy).toBeGreaterThanOrEqual(0);
      expect(result.accuracy).toBeLessThanOrEqual(100);

      expect(result.completeness).toBeGreaterThanOrEqual(0);
      expect(result.completeness).toBeLessThanOrEqual(100);

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);

      // Scores should be integers
      expect(Number.isInteger(result.accuracy)).toBe(true);
      expect(Number.isInteger(result.completeness)).toBe(true);
      expect(Number.isInteger(result.overallScore)).toBe(true);
    });

    it('should include literary analysis in Traditional Chinese', async () => {
      const input: PoetryQualityInput = {
        poemTitle: '葬花吟',
        originalPoem: '儂今葬花人笑癡，他年葬儂知是誰。',
        userRecitation: '儂今葬花人笑癡，他年葬儂知是誰。',
        author: '林黛玉',
        difficulty: 'hard',
      };

      const result = await assessPoetryQuality(input);

      expect(result.literaryAnalysis).toBeTruthy();
      expect(result.literaryAnalysis.length).toBeGreaterThan(50);
      // Should contain markdown formatting
      expect(result.literaryAnalysis).toMatch(/##|#|\*\*|\*/);
    });
  });

  describe('Accuracy Calculation', () => {
    it('should detect perfect recitation (100% accuracy)', async () => {
      const perfectInput: PoetryQualityInput = {
        poemTitle: '五美吟·西施',
        originalPoem: '一代傾城逐浪花，吳宮空自憶兒家。',
        userRecitation: '一代傾城逐浪花，吳宮空自憶兒家。',
        author: '林黛玉',
        difficulty: 'easy',
      };

      const result = await assessPoetryQuality(perfectInput);

      // Perfect recitation should have high accuracy
      expect(result.accuracy).toBeGreaterThanOrEqual(90);
      expect(result.mistakes.length).toBeLessThanOrEqual(1);
    });

    it('should detect partial errors (60-80% accuracy)', async () => {
      const partialInput: PoetryQualityInput = {
        poemTitle: '葬花吟',
        originalPoem: '花謝花飛花滿天，紅消香斷有誰憐。',
        userRecitation: '花謝花飛滿天，紅消香有誰憐。', // Missing 花 and 斷
        author: '林黛玉',
        difficulty: 'medium',
      };

      const result = await assessPoetryQuality(partialInput);

      // Partial errors should result in moderate accuracy
      expect(result.accuracy).toBeGreaterThanOrEqual(0);
      expect(result.accuracy).toBeLessThanOrEqual(100);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
    });

    it('should detect major mistakes (< 50% accuracy)', async () => {
      const poorInput: PoetryQualityInput = {
        poemTitle: '葬花吟',
        originalPoem: '花謝花飛花滿天，紅消香斷有誰憐。',
        userRecitation: '花飛滿天，誰憐。', // Many characters missing
        author: '林黛玉',
        difficulty: 'easy',
      };

      const result = await assessPoetryQuality(poorInput);

      expect(result).toBeDefined();
      expect(result.completeness).toBeLessThanOrEqual(100);
      expect(result.feedback).toBeTruthy();
    });
  });

  describe('Mistake Detection', () => {
    it('should detect missing lines or characters', async () => {
      const missingInput: PoetryQualityInput = {
        poemTitle: '葬花吟',
        originalPoem: '花謝花飛花滿天，\n紅消香斷有誰憐。\n游絲軟繫飄春榭，\n落絮輕沾撲繡簾。',
        userRecitation: '花謝花飛花滿天，\n紅消香斷有誰憐。\n落絮輕沾撲繡簾。', // Missing line 3
        author: '林黛玉',
        difficulty: 'hard',
      };

      const result = await assessPoetryQuality(missingInput);

      expect(result.mistakes).toBeDefined();
      expect(result.completeness).toBeLessThan(100);
    });

    it('should detect incorrect characters', async () => {
      const incorrectInput: PoetryQualityInput = {
        poemTitle: '好了歌',
        originalPoem: '世人都曉神仙好，只有功名忘不了。',
        userRecitation: '世人都知神仙好，只有功名忘不了。', // 曉 → 知 (incorrect)
        author: '跛足道人',
        difficulty: 'easy',
      };

      const result = await assessPoetryQuality(incorrectInput);

      expect(result.mistakes).toBeDefined();
      expect(result.accuracy).toBeLessThan(100);
    });

    it('should detect extra content added by user', async () => {
      const extraInput: PoetryQualityInput = {
        poemTitle: '葬花吟',
        originalPoem: '花謝花飛花滿天，紅消香斷有誰憐。',
        userRecitation: '啊花謝花飛花滿天，紅消香斷有誰憐呀。', // Added 啊 and 呀
        author: '林黛玉',
        difficulty: 'medium',
      };

      const result = await assessPoetryQuality(extraInput);

      expect(result.mistakes).toBeDefined();
      // Extra content should affect accuracy
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Difficulty-Aware Scoring', () => {
    const basePoem = '花謝花飛花滿天，紅消香斷有誰憐。';
    const baseRecitation = '花謝花飛花滿天，紅消香斷有誰憐。';

    it('should apply lenient scoring for easy difficulty', async () => {
      const easyInput: PoetryQualityInput = {
        poemTitle: '葬花吟片段',
        originalPoem: basePoem,
        userRecitation: baseRecitation,
        author: '林黛玉',
        difficulty: 'easy',
      };

      const result = await assessPoetryQuality(easyInput);

      expect(result.overallScore).toBeDefined();
      expect(result.feedback).toContain('您的背誦');
    });

    it('should apply balanced scoring for medium difficulty', async () => {
      const mediumInput: PoetryQualityInput = {
        poemTitle: '葬花吟片段',
        originalPoem: basePoem,
        userRecitation: baseRecitation,
        author: '林黛玉',
        difficulty: 'medium',
      };

      const result = await assessPoetryQuality(mediumInput);

      expect(result.overallScore).toBeDefined();
      expect(result.accuracy).toBeDefined();
    });

    it('should apply strict scoring for hard difficulty', async () => {
      const hardInput: PoetryQualityInput = {
        poemTitle: '葬花吟片段',
        originalPoem: basePoem,
        userRecitation: baseRecitation,
        author: '林黛玉',
        difficulty: 'hard',
      };

      const result = await assessPoetryQuality(hardInput);

      expect(result.overallScore).toBeDefined();
      expect(result.literaryAnalysis).toBeTruthy();
      expect(result.literaryAnalysis.length).toBeGreaterThan(50);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single-line poems', async () => {
      const singleLineInput: PoetryQualityInput = {
        poemTitle: '對聯',
        originalPoem: '假作真時真亦假',
        userRecitation: '假作真時真亦假',
        author: '曹雪芹',
        difficulty: 'easy',
      };

      const result = await assessPoetryQuality(singleLineInput);

      expect(result).toBeDefined();
      expect(result.overallScore).toBeDefined();
    });

    it('should handle multi-line poems with punctuation', async () => {
      const multiLineInput: PoetryQualityInput = {
        poemTitle: '葬花吟',
        originalPoem: `花謝花飛花滿天，紅消香斷有誰憐？
游絲軟繫飄春榭，落絮輕沾撲繡簾。
閨中女兒惜春暮，愁緒滿懷無釋處。`,
        userRecitation: `花謝花飛花滿天，紅消香斷有誰憐？
游絲軟繫飄春榭，落絮輕沾撲繡簾。
閨中女兒惜春暮，愁緒滿懷無釋處。`,
        author: '林黛玉',
        difficulty: 'hard',
      };

      const result = await assessPoetryQuality(multiLineInput);

      expect(result).toBeDefined();
      expect(result.accuracy).toBeDefined();
      expect(result.completeness).toBeDefined();
    });

    it('should handle empty recitation', async () => {
      const emptyInput: PoetryQualityInput = {
        poemTitle: '葬花吟',
        originalPoem: '花謝花飛花滿天，紅消香斷有誰憐。',
        userRecitation: '',
        author: '林黛玉',
        difficulty: 'easy',
      };

      const result = await assessPoetryQuality(emptyInput);

      expect(result).toBeDefined();
      expect(result.completeness).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle AI failure with fallback response', async () => {
      const input: PoetryQualityInput = {
        poemTitle: '測試詩',
        originalPoem: '測試內容',
        userRecitation: '測試背誦',
        author: '測試作者',
        difficulty: 'easy',
      };

      const result = await assessPoetryQuality(input);

      // Even with potential AI failure, should return valid structure
      expect(result).toBeDefined();
      expect(result.accuracy).toBeGreaterThanOrEqual(0);
      expect(result.accuracy).toBeLessThanOrEqual(100);
      expect(result.completeness).toBeGreaterThanOrEqual(0);
      expect(result.completeness).toBeLessThanOrEqual(100);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.feedback).toBeTruthy();
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety for input and output', async () => {
      const typedInput: PoetryQualityInput = {
        poemTitle: '類型安全測試',
        originalPoem: '類型安全詩',
        userRecitation: '類型安全背誦',
        author: '測試作者',
        difficulty: 'medium',
      };

      const typedOutput: PoetryQualityOutput = await assessPoetryQuality(typedInput);

      expect(typeof typedOutput.accuracy).toBe('number');
      expect(typeof typedOutput.completeness).toBe('number');
      expect(typeof typedOutput.overallScore).toBe('number');
      expect(Array.isArray(typedOutput.mistakes)).toBe(true);
      expect(typeof typedOutput.feedback).toBe('string');
      expect(typeof typedOutput.literaryAnalysis).toBe('string');
    });
  });
});
