/**
 * @fileOverview Format Utilities
 *
 * Shared formatting functions used across multiple components.
 * Centralizes common formatting logic to avoid code duplication.
 *
 * @date 2025-12-03
 */

/**
 * Translation function type for internationalization
 */
export type TranslationFunction = (key: string) => string;

/**
 * Formats reading time in minutes to a localized string
 *
 * Converts raw minutes into human-readable format with proper
 * language-specific time units (hours/minutes).
 *
 * @param minutes - Total reading time in minutes
 * @param t - Translation function for localized time units
 * @returns Formatted time string (e.g., "2 小時 30 分鐘" or "2 Hours 30 Minutes")
 *
 * @example
 * // Returns "2 小時 30 分鐘" for zh-TW
 * formatReadingTime(150, t)
 *
 * // Returns "45 分鐘" for under an hour
 * formatReadingTime(45, t)
 */
export function formatReadingTime(minutes: number, t: TranslationFunction): string {
  if (minutes === 0) {
    return `0 ${t('time.minutes')}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} ${t('time.minutes')}`;
  }

  if (remainingMinutes === 0) {
    return `${hours} ${t('time.hours')}`;
  }

  return `${hours} ${t('time.hours')} ${remainingMinutes} ${t('time.minutes')}`;
}
