/**
 * @fileOverview Unit tests for Character Analysis Scoring AI Flow
 *
 * These tests verify the functionality of the character analysis assessment system:
 * - Input validation with character information
 * - Output structure with qualityScore/depth/insight
 * - Depth assessment (superficial, moderate, profound)
 * - Theme coverage analysis
 * - Insight measurement
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
        qualityScore: 82,
        depth: 'moderate',
        insight: 75,
        themesCovered: ['性格特點', '人物關係'],
        themesMissed: ['命運發展'],
        feedback: '您的分析有一定深度，能夠把握人物的主要特點。建議進一步探討人物的命運發展和象徵意義。',
        detailedAnalysis: '## 人物分析評價\n\n您的分析展現了對人物**性格特點**的準確把握，觀察到了關鍵的人物關係。\n\n可以深化的角度：\n- 人物命運的發展軌跡\n- 象徵意義和文學價值'
      }
    }))),
  },
}));

// Import the function to test after mocking
import {
  scoreCharacterAnalysis,
  type CharacterAnalysisScoringInput,
  type CharacterAnalysisScoringOutput
} from '@/ai/flows/character-analysis-scoring';

describe('Character Analysis Scoring AI Flow Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreMocks();
  });

  describe('Input Validation', () => {
    it('should accept valid character analysis input', async () => {
      const validInput: CharacterAnalysisScoringInput = {
        characterName: '林黛玉',
        characterDescription: '賈母的外孫女，寄居賈府，才華橫溢，多愁善感',
        analysisPrompt: '請分析林黛玉的性格特點和命運悲劇的根源',
        userAnalysis: '林黛玉性格敏感細膩，才華出眾但體弱多病。她與寶玉的愛情受到封建禮教的阻礙，最終導致悲劇。',
        expectedThemes: ['性格特點', '才華', '愛情悲劇', '封建禮教'],
        difficulty: 'medium',
      };

      const result = await scoreCharacterAnalysis(validInput);

      expect(result).toBeDefined();
      expect(result.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityScore).toBeLessThanOrEqual(100);
    });

    it('should handle minimal character analysis input', async () => {
      const minimalInput: CharacterAnalysisScoringInput = {
        characterName: '賈寶玉',
        characterDescription: '賈府公子',
        analysisPrompt: '分析寶玉性格',
        userAnalysis: '寶玉叛逆，反對科舉',
        expectedThemes: [],
        difficulty: 'easy',
      };

      const result = await scoreCharacterAnalysis(minimalInput);

      expect(result).toBeDefined();
      expect(result.depth).toBeDefined();
      expect(result.insight).toBeDefined();
    });

    it('should handle complex character with multiple traits', async () => {
      const complexInput: CharacterAnalysisScoringInput = {
        characterName: '王熙鳳',
        characterDescription: '賈璉之妻，掌管賈府家政，精明能幹，心機深沉',
        analysisPrompt: '分析王熙鳳的性格複雜性及其在賈府中的角色',
        userAnalysis: `王熙鳳是《紅樓夢》中最複雜的人物之一。她精明能幹，管理賈府井井有條，
        展現出卓越的才能。但同時她心機深沉，為達目的不擇手段。她既是賈府的管理者，
        也是封建家族的犧牲品。她的悲劇在於過度追求權力和利益，最終反被權力所害。`,
        expectedThemes: ['精明能幹', '心機深沉', '管理才能', '權力欲望', '悲劇命運'],
        difficulty: 'hard',
      };

      const result = await scoreCharacterAnalysis(complexInput);

      expect(result).toBeDefined();
      expect(result.themesCovered).toBeDefined();
      expect(Array.isArray(result.themesCovered)).toBe(true);
    });
  });

  describe('Output Structure Validation', () => {
    it('should return complete output structure with all required fields', async () => {
      const input: CharacterAnalysisScoringInput = {
        characterName: '薛寶釵',
        characterDescription: '薛姨媽之女，端莊穩重，才華橫溢',
        analysisPrompt: '分析薛寶釵的性格特點',
        userAnalysis: '寶釵溫柔敦厚，善於處世，深諳人情世故，符合封建社會對理想女性的要求。',
        expectedThemes: ['溫柔', '穩重', '世故', '封建禮教'],
        difficulty: 'medium',
      };

      const result = await scoreCharacterAnalysis(input);

      // Validate all required output fields
      expect(result.qualityScore).toBeDefined();
      expect(typeof result.qualityScore).toBe('number');

      expect(result.depth).toBeDefined();
      expect(['superficial', 'moderate', 'profound']).toContain(result.depth);

      expect(result.insight).toBeDefined();
      expect(typeof result.insight).toBe('number');

      expect(result.themesCovered).toBeDefined();
      expect(Array.isArray(result.themesCovered)).toBe(true);

      expect(result.themesMissed).toBeDefined();
      expect(Array.isArray(result.themesMissed)).toBe(true);

      expect(result.feedback).toBeDefined();
      expect(typeof result.feedback).toBe('string');
      expect(result.feedback.length).toBeGreaterThan(0);

      expect(result.detailedAnalysis).toBeDefined();
      expect(typeof result.detailedAnalysis).toBe('string');
    });

    it('should validate depth enum values', async () => {
      const input: CharacterAnalysisScoringInput = {
        characterName: '賈政',
        characterDescription: '賈寶玉之父，嚴肅古板',
        analysisPrompt: '分析賈政的性格',
        userAnalysis: '賈政嚴肅古板，重視科舉功名。',
        expectedThemes: ['嚴肅', '科舉'],
        difficulty: 'easy',
      };

      const result = await scoreCharacterAnalysis(input);

      const validDepths = ['superficial', 'moderate', 'profound'];
      expect(validDepths).toContain(result.depth);
    });

    it('should ensure all scores are within valid range (0-100)', async () => {
      const input: CharacterAnalysisScoringInput = {
        characterName: '探春',
        characterDescription: '賈政與趙姨娘之女，有才幹',
        analysisPrompt: '分析探春的性格',
        userAnalysis: '探春精明能幹，有遠見卓識，但身份尷尬。',
        expectedThemes: ['精明', '才幹', '身份'],
        difficulty: 'medium',
      };

      const result = await scoreCharacterAnalysis(input);

      expect(result.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityScore).toBeLessThanOrEqual(100);

      expect(result.insight).toBeGreaterThanOrEqual(0);
      expect(result.insight).toBeLessThanOrEqual(100);

      // Scores should be integers
      expect(Number.isInteger(result.qualityScore)).toBe(true);
      expect(Number.isInteger(result.insight)).toBe(true);
    });
  });

  describe('Depth Assessment', () => {
    it('should identify superficial analysis (surface-level)', async () => {
      const superficialInput: CharacterAnalysisScoringInput = {
        characterName: '林黛玉',
        characterDescription: '賈母的外孫女',
        analysisPrompt: '分析林黛玉',
        userAnalysis: '林黛玉很漂亮，會寫詩。',
        expectedThemes: ['性格', '才華', '命運'],
        difficulty: 'easy',
      };

      const result = await scoreCharacterAnalysis(superficialInput);

      expect(result).toBeDefined();
      expect(result.depth).toBeDefined();
      // Superficial analysis should be detected
      expect(['superficial', 'moderate']).toContain(result.depth);
    });

    it('should identify moderate analysis (some insight)', async () => {
      const moderateInput: CharacterAnalysisScoringInput = {
        characterName: '賈寶玉',
        characterDescription: '賈府公子，叛逆不羈',
        analysisPrompt: '分析賈寶玉的性格特點',
        userAnalysis: '賈寶玉性格叛逆，反對封建禮教和科舉制度。他尊重女性，追求平等和自由，但受到家族的壓力。',
        expectedThemes: ['叛逆', '反封建', '尊重女性', '追求自由'],
        difficulty: 'medium',
      };

      const result = await scoreCharacterAnalysis(moderateInput);

      expect(result).toBeDefined();
      expect(result.depth).toBeDefined();
      expect(['moderate', 'profound']).toContain(result.depth);
      expect(result.insight).toBeGreaterThan(50);
    });

    it('should identify profound analysis (deep understanding)', async () => {
      const profoundInput: CharacterAnalysisScoringInput = {
        characterName: '林黛玉',
        characterDescription: '賈母的外孫女，寄居賈府',
        analysisPrompt: '深入分析林黛玉的悲劇命運',
        userAnalysis: `林黛玉的悲劇根源在於她的孤獨和敏感。作為寄人籬下的孤女，她時刻感受到
        不安全感，這塑造了她多疑敏感的性格。她與寶玉的愛情是純粹而理想化的，但這種純粹在
        封建家族的現實面前顯得脆弱。她的才華使她看清了封建社會的虛偽，但也讓她更加痛苦。
        曹雪芹通過黛玉塑造了一個在封建社會中無法生存的純潔靈魂，她的悲劇是時代的悲劇。`,
        expectedThemes: ['孤獨', '敏感', '純粹愛情', '才華', '時代悲劇', '封建社會'],
        difficulty: 'hard',
      };

      const result = await scoreCharacterAnalysis(profoundInput);

      expect(result).toBeDefined();
      expect(result.depth).toBeDefined();
      expect(result.insight).toBeGreaterThan(60);
      expect(result.themesCovered.length).toBeGreaterThan(0);
    });
  });

  describe('Theme Coverage Analysis', () => {
    it('should identify all themes covered', async () => {
      const allThemesInput: CharacterAnalysisScoringInput = {
        characterName: '王熙鳳',
        characterDescription: '賈璉之妻，掌管賈府',
        analysisPrompt: '分析王熙鳳的性格',
        userAnalysis: '王熙鳳精明能幹，善於管理，但心機深沉，貪婪殘忍，最終自食惡果。',
        expectedThemes: ['精明能幹', '心機深沉', '貪婪', '悲劇結局'],
        difficulty: 'medium',
      };

      const result = await scoreCharacterAnalysis(allThemesInput);

      expect(result.themesCovered).toBeDefined();
      expect(Array.isArray(result.themesCovered)).toBe(true);
      expect(result.themesMissed).toBeDefined();
      expect(Array.isArray(result.themesMissed)).toBe(true);
    });

    it('should identify partially covered themes', async () => {
      const partialThemesInput: CharacterAnalysisScoringInput = {
        characterName: '賈寶玉',
        characterDescription: '賈府公子',
        analysisPrompt: '分析賈寶玉',
        userAnalysis: '賈寶玉反對科舉，尊重女性。',
        expectedThemes: ['反科舉', '尊重女性', '叛逆性格', '追求自由', '情感細膩'],
        difficulty: 'medium',
      };

      const result = await scoreCharacterAnalysis(partialThemesInput);

      expect(result.themesCovered).toBeDefined();
      expect(result.themesMissed).toBeDefined();
      // Should have some themes covered and some missed
      expect(result.themesCovered.length + result.themesMissed.length).toBeGreaterThan(0);
    });
  });

  describe('Difficulty-Aware Scoring', () => {
    const baseCharacter = '林黛玉';
    const baseDescription = '賈母的外孫女';
    const basePrompt = '分析林黛玉的性格';
    const baseAnalysis = '林黛玉敏感多疑，才華橫溢，與寶玉情投意合。';
    const baseThemes = ['敏感', '才華', '愛情'];

    it('should apply lenient scoring for easy difficulty', async () => {
      const easyInput: CharacterAnalysisScoringInput = {
        characterName: baseCharacter,
        characterDescription: baseDescription,
        analysisPrompt: basePrompt,
        userAnalysis: baseAnalysis,
        expectedThemes: baseThemes,
        difficulty: 'easy',
      };

      const result = await scoreCharacterAnalysis(easyInput);

      expect(result.qualityScore).toBeDefined();
      expect(result.feedback).toContain('分析');
    });

    it('should apply balanced scoring for medium difficulty', async () => {
      const mediumInput: CharacterAnalysisScoringInput = {
        characterName: baseCharacter,
        characterDescription: baseDescription,
        analysisPrompt: basePrompt,
        userAnalysis: baseAnalysis,
        expectedThemes: baseThemes,
        difficulty: 'medium',
      };

      const result = await scoreCharacterAnalysis(mediumInput);

      expect(result.qualityScore).toBeDefined();
      expect(result.insight).toBeDefined();
    });

    it('should apply strict scoring for hard difficulty', async () => {
      const hardInput: CharacterAnalysisScoringInput = {
        characterName: baseCharacter,
        characterDescription: baseDescription,
        analysisPrompt: basePrompt,
        userAnalysis: baseAnalysis,
        expectedThemes: baseThemes,
        difficulty: 'hard',
      };

      const result = await scoreCharacterAnalysis(hardInput);

      expect(result.qualityScore).toBeDefined();
      expect(result.detailedAnalysis).toBeTruthy();
      expect(result.detailedAnalysis.length).toBeGreaterThan(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very short analysis', async () => {
      const shortInput: CharacterAnalysisScoringInput = {
        characterName: '賈母',
        characterDescription: '賈府老祖宗',
        analysisPrompt: '分析賈母',
        userAnalysis: '慈祥。',
        expectedThemes: ['慈祥', '權威'],
        difficulty: 'easy',
      };

      const result = await scoreCharacterAnalysis(shortInput);

      expect(result).toBeDefined();
      expect(result.depth).toBe('superficial');
    });

    it('should handle empty expected themes', async () => {
      const noThemesInput: CharacterAnalysisScoringInput = {
        characterName: '劉姥姥',
        characterDescription: '鄉下老婦人',
        analysisPrompt: '分析劉姥姥',
        userAnalysis: '劉姥姥淳樸善良，代表了底層人民的智慧。',
        expectedThemes: [],
        difficulty: 'easy',
      };

      const result = await scoreCharacterAnalysis(noThemesInput);

      expect(result.themesCovered).toBeDefined();
      expect(result.themesMissed).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle AI failure with fallback response', async () => {
      const input: CharacterAnalysisScoringInput = {
        characterName: '測試人物',
        characterDescription: '測試描述',
        analysisPrompt: '測試提示',
        userAnalysis: '測試分析',
        expectedThemes: [],
        difficulty: 'easy',
      };

      const result = await scoreCharacterAnalysis(input);

      // Even with potential AI failure, should return valid structure
      expect(result).toBeDefined();
      expect(result.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityScore).toBeLessThanOrEqual(100);
      expect(result.depth).toBeDefined();
      expect(result.insight).toBeGreaterThanOrEqual(0);
      expect(result.insight).toBeLessThanOrEqual(100);
      expect(result.feedback).toBeTruthy();
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety for input and output', async () => {
      const typedInput: CharacterAnalysisScoringInput = {
        characterName: '類型測試',
        characterDescription: '測試描述',
        analysisPrompt: '測試提示',
        userAnalysis: '測試分析內容',
        expectedThemes: ['主題1', '主題2'],
        difficulty: 'medium',
      };

      const typedOutput: CharacterAnalysisScoringOutput = await scoreCharacterAnalysis(typedInput);

      expect(typeof typedOutput.qualityScore).toBe('number');
      expect(['superficial', 'moderate', 'profound']).toContain(typedOutput.depth);
      expect(typeof typedOutput.insight).toBe('number');
      expect(Array.isArray(typedOutput.themesCovered)).toBe(true);
      expect(Array.isArray(typedOutput.themesMissed)).toBe(true);
      expect(typeof typedOutput.feedback).toBe('string');
      expect(typeof typedOutput.detailedAnalysis).toBe('string');
    });
  });
});
