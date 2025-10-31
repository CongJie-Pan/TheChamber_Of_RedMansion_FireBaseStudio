
/**
 * @fileOverview Context-aware analysis AI flow for classical Chinese literature comprehension.
 *
 * This AI flow provides intelligent analysis of text passages from "Dream of the Red Chamber"
 * by combining word sense disambiguation with character relationship mapping. It helps students
 * understand difficult classical Chinese vocabulary and track complex character dynamics.
 *
 * Key features:
 * - Word sense analysis for archaic and classical Chinese terms
 * - Context-sensitive explanations based on current chapter and surrounding text
 * - Character relationship analysis relevant to the current reading passage
 * - Markdown-formatted output for rich text display in the UI
 * - Traditional Chinese output for native speaker accessibility
 *
 * Usage: Called when students need deeper understanding of complex passages
 *
 * Functions:
 * - analyzeContext: Main function that performs comprehensive context analysis
 * - ContextAnalysisInput: Input schema defining required text and chapter information
 * - ContextAnalysisOutput: Output schema for word analysis and character relationships
 *
 * @updated Migrated from GenKit/Gemini to Perplexity
 */

'use server'; // Required for server-side AI processing

// Import Zod for schema validation and type inference
import { z } from 'zod';
// Import Perplexity integration functions
import {
  createPerplexityQAInputForFlow,
  perplexityRedChamberQA,
} from '@/ai/flows/perplexity-red-chamber-qa';

/**
 * Input schema for context analysis
 * 
 * Defines the required information for the AI to perform comprehensive
 * text analysis including word sense disambiguation and character mapping.
 */
const ContextAnalysisInputSchema = z.object({
  text: z.string().describe('The current text passage being read by the student. Should be a meaningful segment from the novel that contains enough context for analysis.'),
  chapter: z.string().describe('The current chapter number or title being read. Used to provide broader narrative context for the analysis.'),
});

/**
 * TypeScript type inferred from the input schema
 * Used throughout the application for type safety when calling this AI flow
 */
export type ContextAnalysisInput = z.infer<typeof ContextAnalysisInputSchema>;

/**
 * Output schema for context analysis results
 * 
 * Defines the structure of AI-generated analysis including word explanations
 * and character relationship insights. All outputs are formatted in Markdown
 * for rich text display in the user interface.
 */
const ContextAnalysisOutputSchema = z.object({
  wordSenseAnalysis: z.string().describe('Detailed analysis of difficult words, phrases, or literary devices in the current context. Includes classical Chinese terminology explanations, historical context, and literary significance. Uses Markdown formatting with headers (## Title), lists (- Item), bold (**Important**), italic (*Emphasis*), etc.'),
  characterRelationships: z
    .string()
    .describe('Analysis of character relationships and interactions relevant to the current text passage. Describes family connections, romantic relationships, social hierarchies, and conflicts. Formatted as Markdown with clear structure using headers (## Title), lists (- Item), bold (**Important**), italic (*Emphasis*), etc.'),
});

/**
 * TypeScript type inferred from the output schema
 * Used for type safety when processing AI analysis results
 */
export type ContextAnalysisOutput = z.infer<typeof ContextAnalysisOutputSchema>;

/**
 * Main exported function for context-aware analysis
 * 文本脈絡分析的主要導出函數
 *
 * @param input - Context analysis input including text and chapter
 * @returns Analysis results with word sense and character relationships
 */
export async function analyzeContext(input: ContextAnalysisInput): Promise<ContextAnalysisOutput> {
  try {
    // Build comprehensive question for Perplexity
    const question = `請為以下《紅樓夢》段落提供全面的分析：

**章回：** ${input.chapter}

**文本段落：**
${input.text}

請提供兩部分分析：

1. **詞義分析 (Word Sense Analysis)**：解釋文中的難詞、古典用語、文學技巧。使用 Markdown 格式，包含標題（## 標題）、列表（- 項目）、粗體（**重點**）等。

2. **人物關係分析 (Character Relationships)**：描述此段落中涉及的人物關係、互動和社會層級。使用 Markdown 格式呈現。

請以繁體中文回應，格式清晰易讀。`;

    // Create Perplexity QA input using the flow helper
    const perplexityInput = await createPerplexityQAInputForFlow(
      question,
      { text: input.text, position: null, range: null }, // Convert to selection info format
      input.text, // Use the text itself as chapter context
      input.chapter,
      {
        modelKey: 'sonar-reasoning', // Use sonar-reasoning for analysis tasks
        reasoningEffort: 'medium', // Balanced reasoning for comprehensive analysis
        enableStreaming: false, // Non-streaming for this API
        showThinkingProcess: false, // Clean output for analysis
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
      throw new Error(perplexityResponse.error || 'AI模型未能生成有效的文本脈絡分析。');
    }

    // Parse the response to extract both sections
    // The response should contain both word sense analysis and character relationships
    const responseText = perplexityResponse.answer;

    // Try to split the response into two sections
    // Look for common section markers
    const wordSenseMatch = responseText.match(/(?:詞義分析|Word Sense Analysis|##\s*詞義|##\s*難詞)[^]*?(?=(?:人物關係|Character Relationships|##\s*人物)|$)/i);
    const characterMatch = responseText.match(/(?:人物關係|Character Relationships|##\s*人物)[^]*$/i);

    const wordSenseAnalysis = wordSenseMatch
      ? wordSenseMatch[0].trim()
      : responseText.split('\n\n')[0] || '## 詞義分析\n\n此段落的用詞值得深入理解。';

    const characterRelationships = characterMatch
      ? characterMatch[0].trim()
      : responseText.split('\n\n').slice(1).join('\n\n') || '## 人物關係\n\n此段落涉及複雜的人物互動。';

    return {
      wordSenseAnalysis,
      characterRelationships,
    };

  } catch (error) {
    // Only log errors in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error in analyzeContext:', error);
    }

    // Provide fallback analysis
    return {
      wordSenseAnalysis: `## 詞義分析

針對您閱讀的《紅樓夢》段落，很抱歉目前AI服務暫時無法提供詳細的詞義分析。

### 建議
- 確保網路連線正常
- 稍後重新嘗試分析
- 可參考相關的紅樓夢注釋版本

**章回背景：** ${input.chapter}`,
      characterRelationships: `## 人物關係分析

很抱歉，目前AI服務暫時無法提供人物關係分析。請稍後再試。

錯誤詳情：${error instanceof Error ? error.message : '未知錯誤'}`,
    };
  }
}
