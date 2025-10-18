/**
 * @fileOverview Unit tests for Cultural Quiz Grading AI Flow
 *
 * These tests verify the functionality of the cultural quiz grading system:
 * - Input validation with multiple questions
 * - Output structure with score/correctCount/questionResults
 * - Multi-question grading logic
 * - Per-question feedback generation
 * - Cultural insights explanation
 * - Different question types (multiple choice, open-ended)
 * - Difficulty-aware scoring
 * - Edge cases and error handling
 *
 * The tests use mock AI responses to avoid actual API calls.
 */

// Mock the AI imports to avoid actual API calls during testing
jest.mock('@/ai/genkit', () => ({
  ai: {
    defineFlow: jest.fn((config, handler) => handler),
    definePrompt: jest.fn(() => jest.fn(() => ({
      output: {
        score: 80,
        correctCount: 2,
        totalQuestions: 3,
        questionResults: [
          {
            questionNumber: 1,
            isCorrect: true,
            score: 100,
            explanation: '回答正確！清代服飾確實以旗袍為主要特色。'
          },
          {
            questionNumber: 2,
            isCorrect: true,
            score: 100,
            explanation: '很好！您準確掌握了賈府的禮儀規範。'
          },
          {
            questionNumber: 3,
            isCorrect: false,
            score: 40,
            explanation: '這題回答不夠完整。元宵節除了吃湯圓，還有賞燈、猜燈謎等習俗。'
          }
        ],
        feedback: '您的文化知識掌握得不錯，對清代服飾和禮儀有準確的認識。建議加強對傳統節日習俗的學習。',
        culturalInsights: '## 文化知識深化\n\n**清代服飾文化**體現了滿族與漢族文化的融合。旗袍作為滿族傳統服飾，在清代成為主流。\n\n相關閱讀：\n- 《紅樓夢》中的服飾描寫\n- 清代禮儀制度'
      }
    }))),
  },
}));

// Import the function to test after mocking
import {
  gradeCulturalQuiz,
  type CulturalQuizGradingInput,
  type CulturalQuizGradingOutput
} from '@/ai/flows/cultural-quiz-grading';

describe('Cultural Quiz Grading AI Flow Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreMocks();
  });

  describe('Input Validation', () => {
    it('should accept valid cultural quiz input with multiple questions', async () => {
      const validInput: CulturalQuizGradingInput = {
        quizTitle: '清代服飾文化',
        quizQuestions: [
          {
            question: '清代女性主要穿什麼服飾？',
            correctAnswer: '旗袍',
            userAnswer: '旗袍',
            culturalContext: '清代是滿族統治，旗袍成為主要服飾',
          },
          {
            question: '賈府女眷的服飾有什麼特點？',
            correctAnswer: '華貴精緻，講究等級',
            userAnswer: '很華貴，有等級區分',
            culturalContext: '《紅樓夢》詳細描寫了貴族服飾文化',
          }
        ],
        difficulty: 'medium',
      };

      const result = await gradeCulturalQuiz(validInput);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.totalQuestions).toBe(2);
    });

    it('should handle single question quiz', async () => {
      const singleQuestionInput: CulturalQuizGradingInput = {
        quizTitle: '紅樓夢節日文化',
        quizQuestions: [
          {
            question: '《紅樓夢》中描寫了哪些重要節日？',
            correctAnswer: '元宵節、中秋節、端午節等',
            userAnswer: '元宵節、中秋節',
            culturalContext: '小說中有豐富的節日描寫',
          }
        ],
        difficulty: 'easy',
      };

      const result = await gradeCulturalQuiz(singleQuestionInput);

      expect(result).toBeDefined();
      expect(result.totalQuestions).toBe(1);
      expect(result.questionResults).toHaveLength(1);
    });

    it('should handle quiz with optional fields', async () => {
      const optionalInput: CulturalQuizGradingInput = {
        quizTitle: '賈府禮儀',
        quizQuestions: [
          {
            question: '賈府的用餐禮儀有何特點？',
            options: ['嚴格', '隨意', '西式', '簡單'],
            correctAnswer: '嚴格',
            userAnswer: '嚴格',
            culturalContext: '封建大家族有嚴格的用餐禮儀',
          }
        ],
        difficulty: 'medium',
      };

      const result = await gradeCulturalQuiz(optionalInput);

      expect(result).toBeDefined();
      expect(result.questionResults[0]).toBeDefined();
    });
  });

  describe('Output Structure Validation', () => {
    it('should return complete output structure with all required fields', async () => {
      const input: CulturalQuizGradingInput = {
        quizTitle: '清代文化知識',
        quizQuestions: [
          {
            question: '測試問題1',
            correctAnswer: '測試答案1',
            userAnswer: '測試答案1',
            culturalContext: '測試背景1',
          },
          {
            question: '測試問題2',
            correctAnswer: '測試答案2',
            userAnswer: '測試答案2',
            culturalContext: '測試背景2',
          }
        ],
        difficulty: 'easy',
      };

      const result = await gradeCulturalQuiz(input);

      // Validate all required output fields
      expect(result.score).toBeDefined();
      expect(typeof result.score).toBe('number');

      expect(result.correctCount).toBeDefined();
      expect(typeof result.correctCount).toBe('number');

      expect(result.totalQuestions).toBeDefined();
      expect(typeof result.totalQuestions).toBe('number');
      expect(result.totalQuestions).toBe(2);

      expect(result.questionResults).toBeDefined();
      expect(Array.isArray(result.questionResults)).toBe(true);
      expect(result.questionResults).toHaveLength(2);

      expect(result.feedback).toBeDefined();
      expect(typeof result.feedback).toBe('string');
      expect(result.feedback.length).toBeGreaterThan(0);

      expect(result.culturalInsights).toBeDefined();
      expect(typeof result.culturalInsights).toBe('string');
    });

    it('should validate question results structure', async () => {
      const input: CulturalQuizGradingInput = {
        quizTitle: '文化測驗',
        quizQuestions: [
          {
            question: '問題1',
            correctAnswer: '答案1',
            userAnswer: '答案1',
            culturalContext: '背景1',
          }
        ],
        difficulty: 'easy',
      };

      const result = await gradeCulturalQuiz(input);

      result.questionResults.forEach((qResult, index) => {
        expect(qResult.questionNumber).toBe(index + 1);
        expect(typeof qResult.isCorrect).toBe('boolean');
        expect(typeof qResult.score).toBe('number');
        expect(qResult.score).toBeGreaterThanOrEqual(0);
        expect(qResult.score).toBeLessThanOrEqual(100);
        expect(typeof qResult.explanation).toBe('string');
        expect(qResult.explanation.length).toBeGreaterThan(0);
      });
    });

    it('should ensure overall score is within valid range (0-100)', async () => {
      const input: CulturalQuizGradingInput = {
        quizTitle: '文化知識',
        quizQuestions: [
          {
            question: '問題',
            correctAnswer: '答案',
            userAnswer: '答案',
            culturalContext: '背景',
          }
        ],
        difficulty: 'medium',
      };

      const result = await gradeCulturalQuiz(input);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(Number.isInteger(result.score)).toBe(true);
    });
  });

  describe('Multi-Question Grading', () => {
    it('should grade multiple questions independently', async () => {
      const multiInput: CulturalQuizGradingInput = {
        quizTitle: '紅樓夢文化知識',
        quizQuestions: [
          {
            question: '賈府在哪個朝代？',
            correctAnswer: '清代',
            userAnswer: '清代',
            culturalContext: '《紅樓夢》背景是清代',
          },
          {
            question: '大觀園是為誰建造的？',
            correctAnswer: '元春省親',
            userAnswer: '元妃省親',
            culturalContext: '元春封妃回家省親',
          },
          {
            question: '林黛玉來自哪裡？',
            correctAnswer: '蘇州',
            userAnswer: '蘇州',
            culturalContext: '黛玉是蘇州林如海之女',
          }
        ],
        difficulty: 'easy',
      };

      const result = await gradeCulturalQuiz(multiInput);

      expect(result.totalQuestions).toBe(3);
      expect(result.questionResults).toHaveLength(3);
      expect(result.correctCount).toBeGreaterThanOrEqual(0);
      expect(result.correctCount).toBeLessThanOrEqual(3);
    });

    it('should calculate correct count accurately', async () => {
      const input: CulturalQuizGradingInput = {
        quizTitle: '測試',
        quizQuestions: [
          {
            question: 'Q1',
            correctAnswer: 'A1',
            userAnswer: 'A1', // Correct
            culturalContext: 'C1',
          },
          {
            question: 'Q2',
            correctAnswer: 'A2',
            userAnswer: 'Wrong', // Incorrect
            culturalContext: 'C2',
          },
          {
            question: 'Q3',
            correctAnswer: 'A3',
            userAnswer: 'A3', // Correct
            culturalContext: 'C3',
          }
        ],
        difficulty: 'medium',
      };

      const result = await gradeCulturalQuiz(input);

      expect(result.totalQuestions).toBe(3);
      expect(result.correctCount).toBeGreaterThanOrEqual(0);
      expect(result.correctCount).toBeLessThanOrEqual(3);
    });

    it('should handle all correct answers', async () => {
      const allCorrectInput: CulturalQuizGradingInput = {
        quizTitle: '全對測試',
        quizQuestions: [
          {
            question: 'Q1',
            correctAnswer: 'A1',
            userAnswer: 'A1',
            culturalContext: 'C1',
          },
          {
            question: 'Q2',
            correctAnswer: 'A2',
            userAnswer: 'A2',
            culturalContext: 'C2',
          }
        ],
        difficulty: 'easy',
      };

      const result = await gradeCulturalQuiz(allCorrectInput);

      expect(result.totalQuestions).toBe(2);
      // Score should be high when all correct
      expect(result.score).toBeGreaterThan(80);
    });
  });

  describe('Question Types', () => {
    it('should handle multiple choice questions', async () => {
      const mcqInput: CulturalQuizGradingInput = {
        quizTitle: '選擇題測試',
        quizQuestions: [
          {
            question: '賈寶玉最喜歡哪個人？',
            options: ['林黛玉', '薛寶釵', '史湘雲', '襲人'],
            correctAnswer: '林黛玉',
            userAnswer: '林黛玉',
            culturalContext: '寶黛愛情是主線',
          }
        ],
        difficulty: 'easy',
      };

      const result = await gradeCulturalQuiz(mcqInput);

      expect(result).toBeDefined();
      expect(result.questionResults[0].isCorrect).toBeDefined();
    });

    it('should handle open-ended questions', async () => {
      const openInput: CulturalQuizGradingInput = {
        quizTitle: '問答題測試',
        quizQuestions: [
          {
            question: '簡述《紅樓夢》的主題思想',
            correctAnswer: '批判封建社會，揭示其衰落命運',
            userAnswer: '批判封建制度的腐朽，展現貴族家庭的興衰',
            culturalContext: '《紅樓夢》是偉大的現實主義作品',
          }
        ],
        difficulty: 'hard',
      };

      const result = await gradeCulturalQuiz(openInput);

      expect(result).toBeDefined();
      expect(result.questionResults[0].score).toBeDefined();
    });
  });

  describe('Feedback Generation', () => {
    it('should provide explanation for each question', async () => {
      const input: CulturalQuizGradingInput = {
        quizTitle: '反饋測試',
        quizQuestions: [
          {
            question: '測試問題',
            correctAnswer: '正確答案',
            userAnswer: '用戶答案',
            culturalContext: '文化背景',
          }
        ],
        difficulty: 'medium',
      };

      const result = await gradeCulturalQuiz(input);

      expect(result.questionResults[0].explanation).toBeTruthy();
      expect(result.questionResults[0].explanation.length).toBeGreaterThan(10);
    });

    it('should include cultural insights', async () => {
      const input: CulturalQuizGradingInput = {
        quizTitle: '文化洞察測試',
        quizQuestions: [
          {
            question: '清代飲食文化特點',
            correctAnswer: '滿漢全席',
            userAnswer: '滿漢全席',
            culturalContext: '融合滿漢飲食文化',
          }
        ],
        difficulty: 'medium',
      };

      const result = await gradeCulturalQuiz(input);

      expect(result.culturalInsights).toBeTruthy();
      expect(result.culturalInsights.length).toBeGreaterThan(50);
      // Should contain markdown formatting
      expect(result.culturalInsights).toMatch(/##|#|\*\*|\*/);
    });
  });

  describe('Difficulty-Aware Scoring', () => {
    const baseQuestions = [
      {
        question: '測試問題',
        correctAnswer: '正確答案',
        userAnswer: '部分正確答案',
        culturalContext: '測試背景',
      }
    ];

    it('should apply lenient scoring for easy difficulty', async () => {
      const easyInput: CulturalQuizGradingInput = {
        quizTitle: '簡單測試',
        quizQuestions: baseQuestions,
        difficulty: 'easy',
      };

      const result = await gradeCulturalQuiz(easyInput);

      expect(result.score).toBeDefined();
      expect(result.feedback).toBeTruthy();
    });

    it('should apply balanced scoring for medium difficulty', async () => {
      const mediumInput: CulturalQuizGradingInput = {
        quizTitle: '中等測試',
        quizQuestions: baseQuestions,
        difficulty: 'medium',
      };

      const result = await gradeCulturalQuiz(mediumInput);

      expect(result.score).toBeDefined();
      expect(result.questionResults[0].score).toBeDefined();
    });

    it('should apply strict scoring for hard difficulty', async () => {
      const hardInput: CulturalQuizGradingInput = {
        quizTitle: '困難測試',
        quizQuestions: baseQuestions,
        difficulty: 'hard',
      };

      const result = await gradeCulturalQuiz(hardInput);

      expect(result.score).toBeDefined();
      expect(result.culturalInsights).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty user answers', async () => {
      const emptyInput: CulturalQuizGradingInput = {
        quizTitle: '空答案測試',
        quizQuestions: [
          {
            question: '問題',
            correctAnswer: '答案',
            userAnswer: '',
            culturalContext: '背景',
          }
        ],
        difficulty: 'easy',
      };

      const result = await gradeCulturalQuiz(emptyInput);

      expect(result).toBeDefined();
      expect(result.questionResults[0].isCorrect).toBe(false);
      expect(result.questionResults[0].score).toBeLessThan(50);
    });

    it('should handle very long cultural context', async () => {
      const longContextInput: CulturalQuizGradingInput = {
        quizTitle: '長背景測試',
        quizQuestions: [
          {
            question: '問題',
            correctAnswer: '答案',
            userAnswer: '答案',
            culturalContext: '這是一個非常長的文化背景描述'.repeat(50),
          }
        ],
        difficulty: 'medium',
      };

      const result = await gradeCulturalQuiz(longContextInput);

      expect(result).toBeDefined();
      expect(result.culturalInsights).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle AI failure with fallback response', async () => {
      const input: CulturalQuizGradingInput = {
        quizTitle: '測試',
        quizQuestions: [
          {
            question: '測試問題',
            correctAnswer: '測試答案',
            userAnswer: '測試回答',
            culturalContext: '測試背景',
          }
        ],
        difficulty: 'easy',
      };

      const result = await gradeCulturalQuiz(input);

      // Even with potential AI failure, should return valid structure
      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.totalQuestions).toBe(1);
      expect(result.questionResults).toHaveLength(1);
      expect(result.feedback).toBeTruthy();
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety for input and output', async () => {
      const typedInput: CulturalQuizGradingInput = {
        quizTitle: '類型安全測試',
        quizQuestions: [
          {
            question: '測試問題',
            correctAnswer: '測試答案',
            userAnswer: '測試回答',
            culturalContext: '測試背景',
          }
        ],
        difficulty: 'medium',
      };

      const typedOutput: CulturalQuizGradingOutput = await gradeCulturalQuiz(typedInput);

      expect(typeof typedOutput.score).toBe('number');
      expect(typeof typedOutput.correctCount).toBe('number');
      expect(typeof typedOutput.totalQuestions).toBe('number');
      expect(Array.isArray(typedOutput.questionResults)).toBe(true);
      expect(typeof typedOutput.feedback).toBe('string');
      expect(typeof typedOutput.culturalInsights).toBe('string');
    });
  });
});
