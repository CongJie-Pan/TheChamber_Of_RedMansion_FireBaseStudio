/**
 * @fileOverview Unit Tests for Interactive Character Relationship Map AI Flow
 *
 * These tests verify the character relationship mapping system using Perplexity AI:
 * - Input validation (text extraction)
 * - Output structure (description for graph rendering)
 * - Comprehensive relationship analysis
 * - Error handling and fallbacks
 *
 * Test Philosophy (Google's Best Practices):
 * - Test behaviors, not implementation
 * - Use public APIs only
 * - Self-contained tests with clear assertions
 *
 * @phase Phase 2 - Missing AI Flow Tests
 * @date 2025-10-30
 */

// Mock Perplexity QA flow
jest.mock('@/ai/flows/perplexity-red-chamber-qa', () => ({
  createPerplexityQAInputForFlow: jest.fn(async () => ({})),
  perplexityRedChamberQA: jest.fn(async () => ({
    success: true,
    answer: `## 人物關係分析

### 主要人物

1. **林黛玉**
   - 身份：賈母的外孫女，林如海之女
   - 地位：貴族小姐，寄居賈府

2. **賈母**
   - 身份：賈府老祖宗，林黛玉的外祖母
   - 地位：賈府最高權威

3. **王熙鳳**
   - 身份：賈璉之妻，協理榮國府事務
   - 地位：實權管家，深得賈母信任

### 關係類型

**家族關係**
- 賈母與林黛玉：外祖母-外孫女關係，充滿慈愛
- 賈母與王熙鳳：祖孫媳關係，信任重用

**情感關係**
- 深厚的親情紐帶
- 複雜的權力平衡

這些關係構成了《紅樓夢》複雜的人物網絡。`,
    citations: [],
    thinkingProcess: null,
  })),
}));

// Import after mocks
import {
  generateCharacterRelationshipMap,
  type CharacterRelationshipMapInput,
  type CharacterRelationshipMapOutput,
} from '@/ai/flows/interactive-character-relationship-map';

describe('Interactive Character Relationship Map AI Flow Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Input Validation', () => {
    it('should accept valid text input', async () => {
      const validInput: CharacterRelationshipMapInput = {
        text: '黛玉方進入房時，只見兩個人攙著一位鬢髮如銀的老母迎上來，黛玉便知是他外祖母。',
      };

      const result = await generateCharacterRelationshipMap(validInput);

      expect(result).toBeDefined();
      expect(result.description).toBeTruthy();
      expect(typeof result.description).toBe('string');
    });

    it('should handle long passages with multiple characters', async () => {
      const longText = `賈母正和眾人說笑，忽見鳳姐走來。寶玉在旁，黛玉坐在賈母身邊。
探春、惜春也在座。寶釵微笑著聽賈母講話。`.repeat(3);

      const input: CharacterRelationshipMapInput = {
        text: longText,
      };

      const result = await generateCharacterRelationshipMap(input);

      expect(result).toBeDefined();
      expect(result.description.length).toBeGreaterThan(0);
    });

    it('should handle text with few characters mentioned', async () => {
      const input: CharacterRelationshipMapInput = {
        text: '寶玉看了，果然是黛玉的筆墨。',
      };

      const result = await generateCharacterRelationshipMap(input);

      expect(result).toBeDefined();
      expect(result.description).toBeTruthy();
    });
  });

  describe('Output Structure Validation', () => {
    it('should return description suitable for graph rendering', async () => {
      const input: CharacterRelationshipMapInput = {
        text: '賈母笑道：「我這老婆子，最喜歡這些年輕人的笑話。」鳳姐在旁陪笑。',
      };

      const result: CharacterRelationshipMapOutput = await generateCharacterRelationshipMap(input);

      expect('description' in result).toBe(true);
      expect(typeof result.description).toBe('string');
      expect(result.description.length).toBeGreaterThan(10);
    });

    it('should provide structured relationship information', async () => {
      const input: CharacterRelationshipMapInput = {
        text: '林黛玉是賈母的外孫女，與賈寶玉是表兄妹關係。薛寶釵也住在賈府。',
      };

      const result = await generateCharacterRelationshipMap(input);

      // Should mention characters or relationships
      const hasRelevantInfo =
        result.description.includes('人物') ||
        result.description.includes('關係') ||
        result.description.includes('黛玉') ||
        result.description.includes('寶玉');

      expect(hasRelevantInfo).toBe(true);
    });

    it('should maintain type safety', async () => {
      const input: CharacterRelationshipMapInput = {
        text: '測試文本',
      };

      const result: CharacterRelationshipMapOutput = await generateCharacterRelationshipMap(input);

      expect(typeof result.description).toBe('string');
    });
  });

  describe('Perplexity API Integration', () => {
    it('should call Perplexity with correct parameters', async () => {
      const { createPerplexityQAInputForFlow, perplexityRedChamberQA } = require('@/ai/flows/perplexity-red-chamber-qa');

      const input: CharacterRelationshipMapInput = {
        text: '賈母、鳳姐、寶玉三人在一起。',
      };

      await generateCharacterRelationshipMap(input);

      expect(createPerplexityQAInputForFlow).toHaveBeenCalled();
      expect(perplexityRedChamberQA).toHaveBeenCalled();
    });

    it('should use sonar-reasoning model', async () => {
      const { createPerplexityQAInputForFlow } = require('@/ai/flows/perplexity-red-chamber-qa');

      const input: CharacterRelationshipMapInput = {
        text: '測試',
      };

      await generateCharacterRelationshipMap(input);

      const options = createPerplexityQAInputForFlow.mock.calls[0][4];
      expect(options.modelKey).toBe('sonar-reasoning');
    });

    it('should request comprehensive relationship analysis', async () => {
      const { createPerplexityQAInputForFlow } = require('@/ai/flows/perplexity-red-chamber-qa');

      const input: CharacterRelationshipMapInput = {
        text: '賈母與林黛玉相見。',
      };

      await generateCharacterRelationshipMap(input);

      const question = createPerplexityQAInputForFlow.mock.calls[0][0];

      expect(question).toContain('人物');
      expect(question).toContain('關係');
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should provide fallback when Perplexity API fails', async () => {
      const { perplexityRedChamberQA } = require('@/ai/flows/perplexity-red-chamber-qa');

      (perplexityRedChamberQA as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'API error',
      });

      const input: CharacterRelationshipMapInput = {
        text: '測試文本',
      };

      const result = await generateCharacterRelationshipMap(input);

      expect(result).toBeDefined();
      expect(result.description).toContain('很抱歉');
      expect(result.description).toContain('測試文本');
    });

    it('should handle network errors gracefully', async () => {
      const { perplexityRedChamberQA } = require('@/ai/flows/perplexity-red-chamber-qa');

      (perplexityRedChamberQA as jest.Mock).mockRejectedValueOnce(
        new Error('Network timeout')
      );

      const input: CharacterRelationshipMapInput = {
        text: '網路錯誤測試',
      };

      const result = await generateCharacterRelationshipMap(input);

      expect(result).toBeDefined();
      expect(result.description).toBeTruthy();
    });

    it('should include error details in fallback', async () => {
      const { perplexityRedChamberQA } = require('@/ai/flows/perplexity-red-chamber-qa');

      const errorMessage = 'API rate limit exceeded';
      (perplexityRedChamberQA as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      const input: CharacterRelationshipMapInput = {
        text: '測試',
      };

      const result = await generateCharacterRelationshipMap(input);

      expect(result.description).toContain(errorMessage);
      expect(result.description).toContain('錯誤詳情');
    });

    it('should truncate long text in fallback preview', async () => {
      const { perplexityRedChamberQA } = require('@/ai/flows/perplexity-red-chamber-qa');

      (perplexityRedChamberQA as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

      const longText = '這是一段很長的文本內容。'.repeat(50);
      const input: CharacterRelationshipMapInput = {
        text: longText,
      };

      const result = await generateCharacterRelationshipMap(input);

      expect(result.description).toContain('...');
    });
  });

  describe('Relationship Analysis Quality', () => {
    it('should identify character names from text', async () => {
      const input: CharacterRelationshipMapInput = {
        text: '林黛玉見到賈寶玉，兩人相視而笑。',
      };

      const result = await generateCharacterRelationshipMap(input);

      const mentionsCharacters =
        result.description.includes('黛玉') ||
        result.description.includes('寶玉') ||
        result.description.includes('人物');

      expect(mentionsCharacters).toBe(true);
    });

    it('should describe relationship types', async () => {
      const input: CharacterRelationshipMapInput = {
        text: '賈母是林黛玉的外祖母，對她疼愛有加。',
      };

      const result = await generateCharacterRelationshipMap(input);

      const hasRelationshipInfo =
        result.description.includes('關係') ||
        result.description.includes('外祖母') ||
        result.description.includes('疼愛');

      expect(hasRelationshipInfo).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle text with no explicit character names', async () => {
      const input: CharacterRelationshipMapInput = {
        text: '他看了看她，笑了。',
      };

      const result = await generateCharacterRelationshipMap(input);

      expect(result).toBeDefined();
      expect(result.description).toBeTruthy();
    });

    it('should handle text with mixed punctuation', async () => {
      const input: CharacterRelationshipMapInput = {
        text: '「這是什麼話！」探春笑道，"真是奇怪。"',
      };

      const result = await generateCharacterRelationshipMap(input);

      expect(result).toBeDefined();
      expect(result.description.length).toBeGreaterThan(0);
    });

    it('should handle very short text', async () => {
      const input: CharacterRelationshipMapInput = {
        text: '黛玉笑。',
      };

      const result = await generateCharacterRelationshipMap(input);

      expect(result).toBeDefined();
      expect(typeof result.description).toBe('string');
    });
  });
});
