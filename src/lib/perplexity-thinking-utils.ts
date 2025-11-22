/**
 * @fileOverview Utilities for separating AI thinking content from final answers.
 *
 * Provides shared helpers used by the Perplexity QA front-end pipeline to
 * normalise thinking text and strip it away from user-facing answers. Keeping
 * this logic in a dedicated module prevents subtle divergences between
 * different components that need consistent behaviour.
 */

export interface ThinkingSplitResult {
  /** Answer content with any thinking preface removed */
  cleanContent: string;
  /** Extracted thinking text; empty string when nothing detected */
  thinkingText: string;
}

/** Keywords that strongly suggest a paragraph is part of the thinking stage */
const THINKING_CUES = [
  '思考',
  '推理',
  '分析',
  '整理',
  '梳理',
  '策略',
  '步驟',
  '假設',
  '規劃',
  '構思',
  '評估',
];

/** Phrases that commonly introduce analytical prefaces */
const PREFACE_LEADS = [
  '首先',
  '我會先',
  '在正式回答前',
  '在回答前',
  '為了回答',
  '起手先',
  '回答之前',
  '在深入回答前',
  '回覆之前',
  '第一步',
];

/**
 * Checks whether a short paragraph looks like deliberate thinking instructions.
 * 用於判斷段落是否屬於思考前言，讓伺服端與前端保持一致的判斷邏輯。
 */
export function isLikelyThinkingPreface(text: string | null | undefined): boolean {
  if (!text) {
    return false;
  }

  const trimmed = text.replace(/\r\n/g, '\n').trim();
  if (!trimmed) {
    return false;
  }

  const hasCue = THINKING_CUES.some((cue) => trimmed.includes(cue));
  const hasLead = PREFACE_LEADS.some((lead) => trimmed.startsWith(lead));
  const sentenceCount = trimmed
    .split(/[\。\.?!！？]/)
    .filter((sentence) => sentence.trim().length > 0).length;

  // Require either lead words or multiple sentences to avoid false positives
  // Removed length check (trimmed.length <= 80) as it was too lenient for Chinese text
  return hasCue && (hasLead || sentenceCount >= 2);
}

/**
 * Normalises thinking content for consistent presentation.
 *
 * - Converts CRLF to LF
 * - Trims trailing whitespace per line
 * - Collapses runs of blank lines to a maximum of two
 */
export function sanitizeThinkingContent(raw: string | null | undefined): string {
  if (!raw) return '';

  try {
    let text = raw.replace(/\r\n/g, '\n');
    text = text
      .split('\n')
      .map((line) => line.replace(/\s+$/g, '').replace(/^\s+/g, ''))
      .join('\n')
      .trim();

    // Collapse three or more blank lines to two for readability
    text = text.replace(/\n{3,}/g, '\n\n');
    // Remove standalone separator rows such as '---'
    text = text
      .split('\n')
      .filter((line) => !/^-{3,}\s*$/.test(line))
      .join('\n')
      .trim();

    return text;
  } catch (error) {
    console.error('[ThinkingUtils] Failed to sanitise thinking content:', error);
    return raw || '';
  }
}

/**
 * Attempts to split thinking content from answer text using a hierarchy of heuristics.
 *
 * Priority order:
 * 1. <think> XML tags (Perplexity API format)
 * 2. Explicit markers (💭, 思考過程)
 * 3. Analytical preface detection
 */
export function splitThinkingFromContent(text: string | null | undefined): ThinkingSplitResult {
  if (!text) {
    return { cleanContent: text || '', thinkingText: '' };
  }

  const normalised = text.replace(/\r\n/g, '\n');

  // 0) PRIORITY: Extract and remove <think> tags (Perplexity API format)
  // This should be handled by the server, but we double-check here as a safety measure
  // Using counting method to correctly handle nested/consecutive tags

  const thinkingParts: string[] = [];
  let cleanResult = '';
  let depth = 0;
  let currentThinking = '';
  let i = 0;

  while (i < normalised.length) {
    // Check for opening tag <think>
    if (normalised.slice(i, i + 7) === '<think>') {
      depth++;
      if (depth === 1) {
        // Start of a new top-level thinking block
        currentThinking = '';
      } else {
        // Nested tag - preserve in thinking content
        currentThinking += '<think>';
      }
      i += 7;
      continue;
    }

    // Check for closing tag </think>
    if (normalised.slice(i, i + 8) === '</think>') {
      depth--;
      if (depth === 0) {
        // Complete thinking block - save it
        if (currentThinking.trim()) {
          thinkingParts.push(currentThinking.trim());
        }
        currentThinking = '';
      } else if (depth > 0) {
        // Nested closing tag - preserve in thinking content
        currentThinking += '</think>';
      } else {
        // depth < 0: unmatched closing tag - treat as regular text
        cleanResult += '</think>';
      }
      i += 8;
      continue;
    }

    // Regular character
    if (depth > 0) {
      // Inside thinking block
      currentThinking += normalised[i];
    } else {
      // Outside thinking block
      cleanResult += normalised[i];
    }
    i++;
  }

  // If there's incomplete thinking (depth > 0), don't extract it
  // Just return empty thinkingText (streaming not complete)

  const allThinkingText = thinkingParts.join('\n\n');
  const hasCompleteTags = thinkingParts.length > 0;

  // Clean up the result
  const cleanContent = cleanResult.replace(/\n{3,}/g, '\n\n').trim();

  // Return result based on what we found
  if (hasCompleteTags) {
    return {
      cleanContent: cleanContent,
      thinkingText: sanitizeThinkingContent(allThinkingText),
    };
  }

  // If we encountered tags but none were complete, return empty thinking
  if (depth > 0 || normalised.includes('<think')) {
    return {
      cleanContent: cleanContent,
      thinkingText: '',
    };
  }

  // 1) Explicit markers such as headings or decorative separators
  const lines = normalised.split('\n');
  const markerIndex = lines.findIndex((line) =>
    /💭/.test(line) || /思考過程/.test(line)
  );
  if (markerIndex !== -1) {
    let cursor = markerIndex + 1;
    const thinkingLines: string[] = [];

    while (cursor < lines.length) {
      const current = lines[cursor];
      if (/^-{3,}\s*$/.test(current) || /^##\s+/i.test(current) || /^\*\*/.test(current)) {
        cursor += 1; // Skip separator line
        break;
      }
      thinkingLines.push(current);
      cursor += 1;
    }

    const thinkingText = sanitizeThinkingContent(thinkingLines.join('\n'));
    const answerLines = [...lines.slice(0, markerIndex), ...lines.slice(cursor)];
    const answerText = answerLines
      .join('\n')
      .replace(/^-{3,}\s*(\n|$)/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (thinkingText.length > 0 || markerIndex === 0) {
      return { cleanContent: answerText, thinkingText };
    }
  }

  // 2) Analytical preface detection: a short paragraph before a blank line
  const doubleNewlineIndex = normalised.indexOf('\n\n');
  if (doubleNewlineIndex > -1 && doubleNewlineIndex <= 800) {
    const preface = normalised.slice(0, doubleNewlineIndex).trim();
    const remainder = normalised.slice(doubleNewlineIndex + 2).trim();

    if (preface.length > 0 && remainder.length > 0) {
      const hasCue = THINKING_CUES.some((cue) => preface.includes(cue));
      const hasLead = PREFACE_LEADS.some((lead) => preface.startsWith(lead));

      // Require at least one cue and either a lead word or multiple sentences to avoid false positives
      const sentenceCount = preface.split(/[\。\.?!！？]/).filter((s) => s.trim().length > 0).length;
      if (hasCue && (hasLead || sentenceCount >= 2)) {
        return {
          cleanContent: remainder.trim(),
          thinkingText: sanitizeThinkingContent(preface),
        };
      }
    }
  }

  // 3) No thinking content detected
  return { cleanContent: normalised.trim(), thinkingText: '' };
}
