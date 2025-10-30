
'use server';
/**
 * @fileOverview Generates an interactive character relationship map based on the current text.
 *
 * - generateCharacterRelationshipMap - A function that generates the character relationship map.
 * - CharacterRelationshipMapInput - The input type for the generateCharacterRelationshipMap function.
 * - CharacterRelationshipMapOutput - The return type for the generateCharacterRelationshipMap function.
 *
 * @updated Migrated from GenKit/Gemini to Perplexity
 */

import { z } from 'zod';
import {
  createPerplexityQAInputForFlow,
  perplexityRedChamberQA,
} from '@/ai/flows/perplexity-red-chamber-qa';

const CharacterRelationshipMapInputSchema = z.object({
  text: z
    .string()
    .describe('The current text from which to extract character relationships.'),
});
export type CharacterRelationshipMapInput = z.infer<
  typeof CharacterRelationshipMapInputSchema
>;

const CharacterRelationshipMapOutputSchema = z.object({
  description: z
    .string()
    .describe(
      'A description of the character relationships in the text, suitable for rendering as an interactive graph.'
    ),
});
export type CharacterRelationshipMapOutput = z.infer<
  typeof CharacterRelationshipMapOutputSchema
>;

/**
 * Main exported function to generate character relationship map
 * 生成人物關係圖的主要導出函數
 *
 * @param input - Text to analyze for character relationships
 * @returns Description of character relationships suitable for graph rendering
 */
export async function generateCharacterRelationshipMap(
  input: CharacterRelationshipMapInput
): Promise<CharacterRelationshipMapOutput> {
  try {
    // Build comprehensive question for Perplexity
    const question = `請根據以下《紅樓夢》文本，提取並詳細描述文中提到的人物之間的關係。

**文本：**
${input.text}

**要求：**
請提供全面且詳細的人物關係描述，包括：
1. 每個人物的身份和地位
2. 人物之間的關係類型（如：家族關係、愛情關係、主僕關係、對立關係等）
3. 關係的性質和特點
4. 重要的互動和情節

描述應該結構清晰，便於解析和呈現為互動式關係圖。請盡可能詳盡和具體。請以繁體中文描述。`;

    // Create Perplexity QA input using the flow helper
    const perplexityInput = await createPerplexityQAInputForFlow(
      question,
      { text: input.text, position: null, range: null }, // Convert to selection info format
      input.text, // Use the text itself as chapter context
      'current-chapter', // Generic chapter identifier
      {
        modelKey: 'sonar-reasoning', // Use sonar-reasoning for analysis tasks
        reasoningEffort: 'medium', // Balanced reasoning for relationship analysis
        enableStreaming: false, // Non-streaming for this API
        showThinkingProcess: false, // Clean output for relationship mapping
        questionContext: 'general',
      }
    );

    // Get response from Perplexity
    const perplexityResponse = await perplexityRedChamberQA(perplexityInput);

    if (!perplexityResponse.success || !perplexityResponse.answer) {
      // Only log errors in non-test environments
      if (process.env.NODE_ENV !== 'test') {
        console.error('Perplexity QA failed:', perplexityResponse.error);
      }
      throw new Error(perplexityResponse.error || 'AI模型未能生成有效的人物關係描述。');
    }

    return {
      description: perplexityResponse.answer,
    };

  } catch (error) {
    // Only log errors in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error in generateCharacterRelationshipMap:', error);
    }

    // Provide fallback description
    return {
      description: `## 人物關係圖

很抱歉，目前AI服務暫時無法生成人物關係描述。

### 文本摘要
${input.text.substring(0, 200)}${input.text.length > 200 ? '...' : ''}

### 建議
- 確保網路連線正常
- 稍後重新嘗試生成
- 可參考相關的紅樓夢人物關係圖資料

錯誤詳情：${error instanceof Error ? error.message : '未知錯誤'}`,
    };
  }
}
