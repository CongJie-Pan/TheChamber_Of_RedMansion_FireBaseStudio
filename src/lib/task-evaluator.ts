/**
 * @fileOverview Simple three-tier scoring for LLM-only mode.
 *
 * Returns 20/80/100 according to input quality and length.
 */

/**
 * Compute a simple score for a free-text answer.
 * - 20: empty, meaningless (repeated chars, numbers-only, punctuation-only) or below minLength
 * - 100: length >= 200 characters
 * - 80: otherwise
 */
export function simpleTierScore(answer: string, minLength?: number): number {
  const trimmed = String(answer || '').trim();
  if (!trimmed) return 20;

  // Meaningless patterns
  if (/(.)\1{10,}/.test(trimmed)) return 20; // repeated same char
  if (/^[0-9]+$/.test(trimmed)) return 20; // numbers only
  if (/^[\p{P}\p{S}\s]+$/u.test(trimmed)) return 20; // punctuation/symbols only

  const min = typeof minLength === 'number' ? Math.max(0, minLength) : 30;
  if (trimmed.length < min) return 20;
  if (trimmed.length >= 200) return 100;
  return 80;
}

