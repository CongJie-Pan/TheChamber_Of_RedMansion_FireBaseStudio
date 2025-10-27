/**
 * @fileOverview Environment helpers.
 */

export function isLlmOnlyMode(): boolean {
  return process.env.LLM_ONLY_MODE === 'true' || process.env.NEXT_PUBLIC_LLM_ONLY_MODE === 'true';
}

