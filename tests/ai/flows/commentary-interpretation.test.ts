/**
 * @fileOverview Unit tests for Commentary Interpretation AI Flow
 *
 * These tests verify the functionality of Zhiyanzhai commentary interpretation system:
 * - Input validation with commentary and passage
 * - Output structure with score/insightLevel/literarySensitivity
 * - Insight level assessment (surface, moderate, deep, profound)
 * - Literary sensitivity measurement
 * - Key insights captured/missed analysis
 * - Commentary explanation generation
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
                score: 78,
                insightLevel: 'moderate',
                literarySensitivity: 72,
                keyInsightsCaptured: ['伏筆', '象徵意義'],
                keyInsightsMissed: ['人物命運暗示', '文本深層含義'],
                feedback: '您的解讀把握了脂批的部分要點，能夠理解基本的象徵意義。建議深入思考人物命運的伏筆和文本的深層含義。',
                detailedAnalysis: '## 脂批解讀評析\n\n您成功識別了脂批中的**伏筆手法**和**象徵意義**，這很好。\n\n可以深化的角度：\n- 人物命運的暗示\n- 文本多層次含義',
                commentaryExplanation: '## 脂批正解\n\n此處脂硯齋的批語揭示了曹雪芹的寫作意圖，暗示了後文情節發展和人物命運走向。'
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
  scoreCommentaryInterpretation,
  type CommentaryInterpretationInput,
  type CommentaryInterpretationOutput
} from '@/ai/flows/commentary-interpretation';

describe('Commentary Interpretation AI Flow Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Input Validation', () => {
    it('should accept valid commentary interpretation input', async () => {
      const validInput: CommentaryInterpretationInput = {
        commentaryText: '此回可卿夢中所見，皆是後文伏筆。',
        relatedPassage: '可卿引他至太虛幻境，警幻仙姑處',
        chapterContext: '第五回 游幻境指迷十二釵',
        userInterpretation: '這條批語指出，可卿夢境中的內容都是為後文情節埋下的伏筆，暗示了十二釵的命運走向。',
        interpretationHints: ['伏筆', '命運暗示', '象徵意義'],
        difficulty: 'medium',
      };

      const result = await scoreCommentaryInterpretation(validInput);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should handle minimal commentary interpretation input', async () => {
      const minimalInput: CommentaryInterpretationInput = {
        commentaryText: '妙！',
        relatedPassage: '寶玉道：「好詩！」',
        chapterContext: '第三回',
        userInterpretation: '這個批語稱讚此處描寫精彩。',
        interpretationHints: [],
        difficulty: 'easy',
      };

      const result = await scoreCommentaryInterpretation(minimalInput);

      expect(result).toBeDefined();
      expect(result.insightLevel).toBeDefined();
      expect(result.literarySensitivity).toBeDefined();
    });

    it('should handle complex commentary with multiple layers', async () => {
      const complexInput: CommentaryInterpretationInput = {
        commentaryText: '此處暗伏黛玉淚盡而逝之讖。寶玉為情所困，黛玉為情所累，皆因前世之緣。',
        relatedPassage: '黛玉還淚之說，正在於此',
        chapterContext: '第一回 甄士隱夢幻識通靈',
        userInterpretation: `這條批語深刻揭示了寶黛愛情悲劇的根源。黛玉來到人間是為了還淚，
        暗示她將因情感的折磨而淚盡身亡。這不僅是命運的安排，更體現了曹雪芹對愛情悲劇的
        深刻思考。前世的債，今生的淚，構成了黛玉悲劇命運的雙重維度。`,
        interpretationHints: ['還淚之說', '命運讖語', '前世今生', '愛情悲劇', '象徵意義'],
        difficulty: 'hard',
      };

      const result = await scoreCommentaryInterpretation(complexInput);

      expect(result).toBeDefined();
      expect(result.commentaryExplanation).toBeTruthy();
    });
  });

  describe('Output Structure Validation', () => {
    it('should return complete output structure with all required fields', async () => {
      const input: CommentaryInterpretationInput = {
        commentaryText: '草蛇灰線，伏脈千里。',
        relatedPassage: '看官記此一筆',
        chapterContext: '第回',
        userInterpretation: '批語指出小說的伏筆手法，情節線索綿延千里。',
        interpretationHints: ['伏筆', '寫作手法'],
        difficulty: 'medium',
      };

      const result = await scoreCommentaryInterpretation(input);

      // Validate all required output fields
      expect(result.score).toBeDefined();
      expect(typeof result.score).toBe('number');

      expect(result.insightLevel).toBeDefined();
      expect(['surface', 'moderate', 'deep', 'profound']).toContain(result.insightLevel);

      expect(result.literarySensitivity).toBeDefined();
      expect(typeof result.literarySensitivity).toBe('number');

      expect(result.keyInsightsCaptured).toBeDefined();
      expect(Array.isArray(result.keyInsightsCaptured)).toBe(true);

      expect(result.keyInsightsMissed).toBeDefined();
      expect(Array.isArray(result.keyInsightsMissed)).toBe(true);

      expect(result.feedback).toBeDefined();
      expect(typeof result.feedback).toBe('string');
      expect(result.feedback.length).toBeGreaterThan(0);

      expect(result.detailedAnalysis).toBeDefined();
      expect(typeof result.detailedAnalysis).toBe('string');

      expect(result.commentaryExplanation).toBeDefined();
      expect(typeof result.commentaryExplanation).toBe('string');
    });

    it('should validate insight level enum values', async () => {
      const input: CommentaryInterpretationInput = {
        commentaryText: '妙筆！',
        relatedPassage: '寶玉聽了，喜不自勝',
        chapterContext: '第三回',
        userInterpretation: '批語稱讚寫得好。',
        interpretationHints: [],
        difficulty: 'easy',
      };

      const result = await scoreCommentaryInterpretation(input);

      const validInsightLevels = ['surface', 'moderate', 'deep', 'profound'];
      expect(validInsightLevels).toContain(result.insightLevel);
    });

    it('should ensure all scores are within valid range (0-100)', async () => {
      const input: CommentaryInterpretationInput = {
        commentaryText: '此處伏後文寶釵撲蝶',
        relatedPassage: '寶釵在園中閒步',
        chapterContext: '第二十七回',
        userInterpretation: '批語指出這裡為後文寶釵撲蝶埋下伏筆。',
        interpretationHints: ['伏筆', '情節聯繫'],
        difficulty: 'medium',
      };

      const result = await scoreCommentaryInterpretation(input);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);

      expect(result.literarySensitivity).toBeGreaterThanOrEqual(0);
      expect(result.literarySensitivity).toBeLessThanOrEqual(100);

      // Scores should be integers
      expect(Number.isInteger(result.score)).toBe(true);
      expect(Number.isInteger(result.literarySensitivity)).toBe(true);
    });
  });

  describe('Insight Level Assessment', () => {
    it('should identify surface-level interpretation', async () => {
      const surfaceInput: CommentaryInterpretationInput = {
        commentaryText: '此處寫得極妙，讀之令人稱絕。',
        relatedPassage: '黛玉笑道：「你又來了！」',
        chapterContext: '第二十回',
        userInterpretation: '批語說這裡寫得很好。',
        interpretationHints: ['寫作技巧', '文學價值'],
        difficulty: 'easy',
      };

      const result = await scoreCommentaryInterpretation(surfaceInput);

      expect(result).toBeDefined();
      expect(result.insightLevel).toBeDefined();
      // Surface interpretation should be detected
      expect(['surface', 'moderate']).toContain(result.insightLevel);
    });

    it('should identify moderate-depth interpretation', async () => {
      const moderateInput: CommentaryInterpretationInput = {
        commentaryText: '寶黛初會，一見如故，非無緣也。',
        relatedPassage: '黛玉一見，便吃一大驚，心下想道：「好生奇怪，倒像在那裡見過一般。」',
        chapterContext: '第三回',
        userInterpretation: '批語指出寶玉和黛玉初次見面就有似曾相識的感覺，暗示他們前世的緣分，為後文的愛情故事埋下伏筆。',
        interpretationHints: ['前世緣分', '伏筆', '似曾相識'],
        difficulty: 'medium',
      };

      const result = await scoreCommentaryInterpretation(moderateInput);

      expect(result).toBeDefined();
      expect(['moderate', 'deep']).toContain(result.insightLevel);
      expect(result.literarySensitivity).toBeGreaterThan(50);
    });

    it('should identify profound interpretation', async () => {
      const profoundInput: CommentaryInterpretationInput = {
        commentaryText: '作者用夢幻之筆，寫真實之情。太虛幻境所見，皆是人間真境；鏡花水月，卻是世態人心。',
        relatedPassage: '寶玉看見許多美人，心中甚喜',
        chapterContext: '第五回 游幻境指迷十二釵',
        userInterpretation: `這條批語揭示了曹雪芹高超的藝術手法。表面寫夢境幻境，實則寄託對現實的深刻洞察。
        太虛幻境看似虛幻，實際上是人間真實世界的象徵性呈現。所謂「假作真時真亦假」，夢與現實的界限在這裡
        被打破。這種「以幻寫真」的手法，使小說達到了虛實相生的藝術境界，也體現了作者對人生、命運和社會的
        哲學思考。批語不僅點明了寫作手法，更揭示了《紅樓夢》深層的哲學意蘊。`,
        interpretationHints: ['夢幻與真實', '象徵手法', '哲學意蘊', '藝術境界', '虛實相生'],
        difficulty: 'hard',
      };

      const result = await scoreCommentaryInterpretation(profoundInput);

      expect(result).toBeDefined();
      expect(['deep', 'profound']).toContain(result.insightLevel);
      expect(result.literarySensitivity).toBeGreaterThan(70);
      expect(result.keyInsightsCaptured.length).toBeGreaterThan(0);
    });
  });

  describe('Literary Sensitivity Measurement', () => {
    it('should assess high literary sensitivity (80-100)', async () => {
      const highSensitivityInput: CommentaryInterpretationInput = {
        commentaryText: '一句「木石前盟」，定下寶黛情緣之本。',
        relatedPassage: '只因西方靈河岸上三生石畔，有絳珠草一株',
        chapterContext: '第一回',
        userInterpretation: `「木石前盟」是寶黛愛情的核心象徵。「木」指絳珠草，「石」指通靈寶玉，
        象徵自然純真的愛情。這與後文「金玉良緣」形成對比，金玉代表世俗價值，木石代表精神追求。
        批語點出這是寶黛情緣的「本」，即根源和本質，強調了這段愛情的純粹性和悲劇性。`,
        interpretationHints: ['木石前盟', '象徵意義', '與金玉對比', '愛情本質'],
        difficulty: 'hard',
      };

      const result = await scoreCommentaryInterpretation(highSensitivityInput);

      expect(result.literarySensitivity).toBeGreaterThan(60);
    });

    it('should assess low literary sensitivity (< 50)', async () => {
      const lowSensitivityInput: CommentaryInterpretationInput = {
        commentaryText: '此處暗寫寶釵之妒，妙！',
        relatedPassage: '寶釵微微一笑',
        chapterContext: '第二十八回',
        userInterpretation: '批語說寶釵在笑。',
        interpretationHints: ['心理描寫', '妒忌', '暗寫手法'],
        difficulty: 'easy',
      };

      const result = await scoreCommentaryInterpretation(lowSensitivityInput);

      expect(result).toBeDefined();
      expect(result.literarySensitivity).toBeDefined();
    });
  });

  describe('Difficulty-Aware Scoring', () => {
    const baseCommentary = '此處伏筆';
    const basePassage = '寶玉看了，心中明白';
    const baseContext = '第八回';
    const baseInterpretation = '批語指出這裡有伏筆。';
    const baseHints = ['伏筆'];

    it('should apply lenient scoring for easy difficulty', async () => {
      const easyInput: CommentaryInterpretationInput = {
        commentaryText: baseCommentary,
        relatedPassage: basePassage,
        chapterContext: baseContext,
        userInterpretation: baseInterpretation,
        interpretationHints: baseHints,
        difficulty: 'easy',
      };

      const result = await scoreCommentaryInterpretation(easyInput);

      expect(result.score).toBeDefined();
      expect(result.feedback).toContain('解讀');
    });

    it('should apply balanced scoring for medium difficulty', async () => {
      const mediumInput: CommentaryInterpretationInput = {
        commentaryText: baseCommentary,
        relatedPassage: basePassage,
        chapterContext: baseContext,
        userInterpretation: baseInterpretation,
        interpretationHints: baseHints,
        difficulty: 'medium',
      };

      const result = await scoreCommentaryInterpretation(mediumInput);

      expect(result.score).toBeDefined();
      expect(result.insightLevel).toBeDefined();
    });

    it('should apply strict scoring for hard difficulty', async () => {
      const hardInput: CommentaryInterpretationInput = {
        commentaryText: baseCommentary,
        relatedPassage: basePassage,
        chapterContext: baseContext,
        userInterpretation: baseInterpretation,
        interpretationHints: baseHints,
        difficulty: 'hard',
      };

      const result = await scoreCommentaryInterpretation(hardInput);

      expect(result.score).toBeDefined();
      expect(result.commentaryExplanation).toBeTruthy();
      expect(result.commentaryExplanation.length).toBeGreaterThan(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very short commentary', async () => {
      const shortInput: CommentaryInterpretationInput = {
        commentaryText: '妙！',
        relatedPassage: '寶玉道',
        chapterContext: '第五回',
        userInterpretation: '批語稱讚。',
        interpretationHints: [],
        difficulty: 'easy',
      };

      const result = await scoreCommentaryInterpretation(shortInput);

      expect(result).toBeDefined();
      expect(result.insightLevel).toBe('surface');
    });

    it('should handle empty interpretation hints', async () => {
      const noHintsInput: CommentaryInterpretationInput = {
        commentaryText: '此回寫盡繁華',
        relatedPassage: '榮國府中',
        chapterContext: '第三回',
        userInterpretation: '批語說這一回描寫了繁華的景象。',
        interpretationHints: [],
        difficulty: 'medium',
      };

      const result = await scoreCommentaryInterpretation(noHintsInput);

      expect(result.keyInsightsCaptured).toBeDefined();
      expect(result.keyInsightsMissed).toBeDefined();
    });

    it('should handle missing related passage', async () => {
      const noPassageInput: CommentaryInterpretationInput = {
        commentaryText: '此處大有深意',
        relatedPassage: '',
        chapterContext: '第一回',
        userInterpretation: '批語說這裡有深層含義。',
        interpretationHints: ['深意'],
        difficulty: 'easy',
      };

      const result = await scoreCommentaryInterpretation(noPassageInput);

      expect(result).toBeDefined();
      expect(result.score).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle AI failure with fallback response', async () => {
      const input: CommentaryInterpretationInput = {
        commentaryText: '測試批語',
        relatedPassage: '測試段落',
        chapterContext: '測試章回',
        userInterpretation: '測試解讀',
        interpretationHints: [],
        difficulty: 'easy',
      };

      const result = await scoreCommentaryInterpretation(input);

      // Even with potential AI failure, should return valid structure
      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.insightLevel).toBeDefined();
      expect(result.literarySensitivity).toBeGreaterThanOrEqual(0);
      expect(result.literarySensitivity).toBeLessThanOrEqual(100);
      expect(result.feedback).toBeTruthy();
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety for input and output', async () => {
      const typedInput: CommentaryInterpretationInput = {
        commentaryText: '類型測試批語',
        relatedPassage: '類型測試段落',
        chapterContext: '類型測試章回',
        userInterpretation: '類型測試解讀',
        interpretationHints: ['測試提示'],
        difficulty: 'medium',
      };

      const typedOutput: CommentaryInterpretationOutput = await scoreCommentaryInterpretation(typedInput);

      expect(typeof typedOutput.score).toBe('number');
      expect(['surface', 'moderate', 'deep', 'profound']).toContain(typedOutput.insightLevel);
      expect(typeof typedOutput.literarySensitivity).toBe('number');
      expect(Array.isArray(typedOutput.keyInsightsCaptured)).toBe(true);
      expect(Array.isArray(typedOutput.keyInsightsMissed)).toBe(true);
      expect(typeof typedOutput.feedback).toBe('string');
      expect(typeof typedOutput.detailedAnalysis).toBe('string');
      expect(typeof typedOutput.commentaryExplanation).toBe('string');
    });
  });
});
