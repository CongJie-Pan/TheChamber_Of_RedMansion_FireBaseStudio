/**
 * @fileOverview Perplexity Feature Flags
 *
 * 控制新舊 Adapter 切換的 Feature Flag 模組。
 * 支援環境變數配置和百分比流量控制，實現漸進式 rollout。
 *
 * @example
 * ```typescript
 * import { shouldUseNewAdapter, PERPLEXITY_FLAGS } from '@/lib/perplexity-feature-flags';
 *
 * if (shouldUseNewAdapter()) {
 *   // 使用新的 PerplexityStreamAdapter
 * } else {
 *   // 使用舊的 PerplexityClient
 * }
 * ```
 */

/**
 * Perplexity Feature Flags 配置
 *
 * 所有 flag 預設為 false/0，確保向後相容。
 */
export const PERPLEXITY_FLAGS = {
  /**
   * 啟用新的 Stream Adapter（Side Project A 邏輯）
   *
   * 設定環境變數 PERPLEXITY_USE_NEW_ADAPTER=true 啟用
   * 此 flag 優先於百分比控制
   *
   * @default false
   */
  useNewAdapter: process.env.PERPLEXITY_USE_NEW_ADAPTER === 'true',

  /**
   * 啟用 Adapter 除錯日誌
   *
   * 設定環境變數 PERPLEXITY_DEBUG_ADAPTER=true 啟用
   * 會在 console 輸出詳細的 Adapter 運作日誌
   *
   * @default false
   */
  debugAdapter: process.env.PERPLEXITY_DEBUG_ADAPTER === 'true',

  /**
   * 新 Adapter 的流量百分比（0-100）
   *
   * 用於漸進式 rollout，設定環境變數 PERPLEXITY_NEW_ADAPTER_PERCENTAGE
   * 例如設定為 10 表示 10% 的請求使用新 Adapter
   *
   * @default 0
   */
  newAdapterPercentage: parseInt(
    process.env.PERPLEXITY_NEW_ADAPTER_PERCENTAGE || '0',
    10
  ),
} as const;

/**
 * 判斷是否使用新 Adapter
 *
 * 決策邏輯：
 * 1. 如果 useNewAdapter 為 true，直接使用新 Adapter
 * 2. 否則，根據 newAdapterPercentage 進行百分比流量控制
 * 3. 如果都不符合，使用舊的 PerplexityClient
 *
 * @returns 是否應該使用新 Adapter
 *
 * @example
 * ```typescript
 * // 在 perplexity-red-chamber-qa.ts 中使用
 * export async function* perplexityRedChamberQAStreaming(input) {
 *   if (shouldUseNewAdapter()) {
 *     const adapter = new PerplexityStreamAdapter();
 *     yield* adapter.streamingQA(input);
 *   } else {
 *     const client = new PerplexityClient();
 *     yield* client.streamingCompletionRequest(input);
 *   }
 * }
 * ```
 */
export function shouldUseNewAdapter(): boolean {
  // 優先檢查明確的 flag
  if (PERPLEXITY_FLAGS.useNewAdapter) {
    if (PERPLEXITY_FLAGS.debugAdapter) {
      console.log('[PerplexityFeatureFlag] Using new adapter (flag enabled)');
    }
    return true;
  }

  // 百分比流量控制（確保百分比在有效範圍內）
  const clampedPercentage = Math.max(0, Math.min(100, PERPLEXITY_FLAGS.newAdapterPercentage));
  if (clampedPercentage > 0) {
    const random = Math.random() * 100;
    const useNew = random < clampedPercentage;

    if (PERPLEXITY_FLAGS.debugAdapter) {
      console.log('[PerplexityFeatureFlag] Percentage check:', {
        percentage: PERPLEXITY_FLAGS.newAdapterPercentage,
        clampedPercentage,
        random: random.toFixed(2),
        useNew,
      });
    }

    return useNew;
  }

  // 預設使用舊邏輯
  if (PERPLEXITY_FLAGS.debugAdapter) {
    console.log('[PerplexityFeatureFlag] Using legacy client (default)');
  }
  return false;
}

/**
 * 取得目前的 Feature Flag 狀態摘要
 *
 * 用於日誌記錄和除錯
 *
 * @returns Feature Flag 狀態物件
 */
export function getFeatureFlagSummary(): {
  useNewAdapter: boolean;
  debugAdapter: boolean;
  newAdapterPercentage: number;
  effectiveMode: 'new_adapter' | 'percentage_rollout' | 'legacy';
} {
  let effectiveMode: 'new_adapter' | 'percentage_rollout' | 'legacy';

  if (PERPLEXITY_FLAGS.useNewAdapter) {
    effectiveMode = 'new_adapter';
  } else if (PERPLEXITY_FLAGS.newAdapterPercentage > 0) {
    effectiveMode = 'percentage_rollout';
  } else {
    effectiveMode = 'legacy';
  }

  return {
    useNewAdapter: PERPLEXITY_FLAGS.useNewAdapter,
    debugAdapter: PERPLEXITY_FLAGS.debugAdapter,
    newAdapterPercentage: PERPLEXITY_FLAGS.newAdapterPercentage,
    effectiveMode,
  };
}

/**
 * 驗證 Feature Flag 配置是否有效
 *
 * 在應用程式啟動時呼叫，檢查配置是否合理
 *
 * @returns 驗證結果
 */
export function validateFeatureFlags(): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // 檢查百分比範圍
  if (PERPLEXITY_FLAGS.newAdapterPercentage < 0) {
    warnings.push(
      `newAdapterPercentage (${PERPLEXITY_FLAGS.newAdapterPercentage}) is negative, treating as 0`
    );
  }

  if (PERPLEXITY_FLAGS.newAdapterPercentage > 100) {
    warnings.push(
      `newAdapterPercentage (${PERPLEXITY_FLAGS.newAdapterPercentage}) exceeds 100, treating as 100`
    );
  }

  // 檢查衝突配置
  if (
    PERPLEXITY_FLAGS.useNewAdapter &&
    PERPLEXITY_FLAGS.newAdapterPercentage > 0 &&
    PERPLEXITY_FLAGS.newAdapterPercentage < 100
  ) {
    warnings.push(
      'Both useNewAdapter=true and partial percentage set. useNewAdapter takes precedence.'
    );
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}
