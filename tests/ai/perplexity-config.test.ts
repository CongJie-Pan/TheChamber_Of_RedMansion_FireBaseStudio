/**
 * @fileOverview Unit tests for Perplexity Configuration
 * 測試 Perplexity 配置模組
 *
 * Key fixes tested (2025-11-27):
 * - Temperature constraint: Perplexity API requires temperature < 2
 * - LobeChat alignment pattern for temperature handling
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import {
  PERPLEXITY_MODELS,
  PERPLEXITY_CONFIG,
  REASONING_EFFORTS,
  QUESTION_CONTEXTS,
  getPerplexityApiKey,
  isPerplexityConfigured,
  getModelConfig,
  supportsReasoning,
  getDefaultHeaders,
  createPerplexityConfig,
  calculateAdaptiveTimeout,
  getTimeoutSummary,
} from '@/ai/perplexity-config';

// Store original env
const originalEnv = process.env;

describe('Perplexity Configuration', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('PERPLEXITY_MODELS', () => {
    test('should have exactly 3 models (sonar-pro, sonar-reasoning, sonar-reasoning-pro)', () => {
      const modelKeys = Object.keys(PERPLEXITY_MODELS);
      expect(modelKeys).toHaveLength(3);
      expect(modelKeys).toContain('sonar-pro');
      expect(modelKeys).toContain('sonar-reasoning');
      expect(modelKeys).toContain('sonar-reasoning-pro');
    });

    test('sonar-pro should NOT support reasoning', () => {
      expect(PERPLEXITY_MODELS['sonar-pro'].supportsReasoning).toBe(false);
    });

    test('sonar-reasoning should support reasoning', () => {
      expect(PERPLEXITY_MODELS['sonar-reasoning'].supportsReasoning).toBe(true);
    });

    test('sonar-reasoning-pro should support reasoning', () => {
      expect(PERPLEXITY_MODELS['sonar-reasoning-pro'].supportsReasoning).toBe(true);
    });

    test('all models should have required properties', () => {
      Object.values(PERPLEXITY_MODELS).forEach((model) => {
        expect(model.name).toBeDefined();
        expect(model.displayName).toBeDefined();
        expect(model.description).toBeDefined();
        expect(model.features).toBeInstanceOf(Array);
        expect(model.maxTokens).toBeGreaterThan(0);
        expect(typeof model.supportsReasoning).toBe('boolean');
      });
    });
  });

  describe('REASONING_EFFORTS', () => {
    test('should have low, medium, and high levels', () => {
      expect(REASONING_EFFORTS.low).toBeDefined();
      expect(REASONING_EFFORTS.medium).toBeDefined();
      expect(REASONING_EFFORTS.high).toBeDefined();
    });

    test('each level should have required properties', () => {
      Object.values(REASONING_EFFORTS).forEach((effort) => {
        expect(effort.value).toBeDefined();
        expect(effort.displayName).toBeDefined();
        expect(effort.description).toBeDefined();
        expect(effort.emoji).toBeDefined();
      });
    });
  });

  describe('QUESTION_CONTEXTS', () => {
    test('should have character, plot, theme, and general contexts', () => {
      expect(QUESTION_CONTEXTS.character).toBeDefined();
      expect(QUESTION_CONTEXTS.plot).toBeDefined();
      expect(QUESTION_CONTEXTS.theme).toBeDefined();
      expect(QUESTION_CONTEXTS.general).toBeDefined();
    });
  });

  describe('getPerplexityApiKey', () => {
    test('should return API key from environment', () => {
      process.env.PERPLEXITYAI_API_KEY = 'test-api-key';
      expect(getPerplexityApiKey()).toBe('test-api-key');
    });

    test('should return undefined when API key is not set', () => {
      delete process.env.PERPLEXITYAI_API_KEY;
      expect(getPerplexityApiKey()).toBeUndefined();
    });
  });

  describe('isPerplexityConfigured', () => {
    test('should return true when API key is configured', () => {
      process.env.PERPLEXITYAI_API_KEY = 'valid-api-key';
      expect(isPerplexityConfigured()).toBe(true);
    });

    test('should return false when API key is not set', () => {
      delete process.env.PERPLEXITYAI_API_KEY;
      expect(isPerplexityConfigured()).toBe(false);
    });

    test('should return false when API key is empty string', () => {
      process.env.PERPLEXITYAI_API_KEY = '';
      expect(isPerplexityConfigured()).toBe(false);
    });

    test('should return false when API key is only whitespace', () => {
      process.env.PERPLEXITYAI_API_KEY = '   ';
      expect(isPerplexityConfigured()).toBe(false);
    });
  });

  describe('getModelConfig', () => {
    test('should return correct config for sonar-pro', () => {
      const config = getModelConfig('sonar-pro');
      expect(config.name).toBe('sonar-pro');
      expect(config.supportsReasoning).toBe(false);
    });

    test('should return correct config for sonar-reasoning-pro', () => {
      const config = getModelConfig('sonar-reasoning-pro');
      expect(config.name).toBe('sonar-reasoning-pro');
      expect(config.supportsReasoning).toBe(true);
    });
  });

  describe('supportsReasoning', () => {
    test('sonar-pro should not support reasoning', () => {
      expect(supportsReasoning('sonar-pro')).toBe(false);
    });

    test('sonar-reasoning should support reasoning', () => {
      expect(supportsReasoning('sonar-reasoning')).toBe(true);
    });

    test('sonar-reasoning-pro should support reasoning', () => {
      expect(supportsReasoning('sonar-reasoning-pro')).toBe(true);
    });
  });

  describe('getDefaultHeaders', () => {
    test('should include required headers', () => {
      process.env.PERPLEXITYAI_API_KEY = 'env-api-key';
      const headers = getDefaultHeaders();
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Authorization']).toBe('Bearer env-api-key');
      expect(headers['User-Agent']).toBe('RedMansion-Learning-Platform/1.0');
    });

    test('should use provided API key over environment', () => {
      process.env.PERPLEXITYAI_API_KEY = 'env-api-key';
      const headers = getDefaultHeaders('custom-api-key');
      expect(headers['Authorization']).toBe('Bearer custom-api-key');
    });
  });

  /**
   * Test suite for Temperature Constraint Fix (2025-11-27)
   *
   * Key fix: Perplexity API requires temperature < 2
   * LobeChat pattern: finalTemperature = temperature >= 2 ? undefined : temperature
   */
  describe('createPerplexityConfig - Temperature Constraint (2025-11-27)', () => {
    test('should include temperature when less than 2', () => {
      const config = createPerplexityConfig({ temperature: 0.5 });
      expect(config.temperature).toBe(0.5);
    });

    test('should include temperature when exactly 0', () => {
      const config = createPerplexityConfig({ temperature: 0 });
      expect(config.temperature).toBe(0);
    });

    test('should include temperature when close to but less than 2', () => {
      const config = createPerplexityConfig({ temperature: 1.99 });
      expect(config.temperature).toBe(1.99);
    });

    test('should exclude temperature when exactly 2 (API constraint)', () => {
      // This is the core fix: temperature >= 2 should be undefined
      const config = createPerplexityConfig({ temperature: 2 });
      expect(config.temperature).toBeUndefined();
    });

    test('should exclude temperature when greater than 2 (API constraint)', () => {
      const config = createPerplexityConfig({ temperature: 2.5 });
      expect(config.temperature).toBeUndefined();
    });

    test('should exclude temperature when significantly greater than 2', () => {
      const config = createPerplexityConfig({ temperature: 10 });
      expect(config.temperature).toBeUndefined();
    });

    test('should use default temperature when not specified', () => {
      const config = createPerplexityConfig({});
      expect(config.temperature).toBe(PERPLEXITY_CONFIG.DEFAULT_TEMPERATURE);
    });

    test('default temperature should be valid (less than 2)', () => {
      expect(PERPLEXITY_CONFIG.DEFAULT_TEMPERATURE).toBeLessThan(2);
    });
  });

  describe('createPerplexityConfig - General', () => {
    test('should use default model when not specified', () => {
      const config = createPerplexityConfig();
      expect(config.model).toBe('sonar-reasoning-pro');
    });

    test('should use specified model', () => {
      const config = createPerplexityConfig({ model: 'sonar-pro' });
      expect(config.model).toBe('sonar-pro');
    });

    test('should cap max_tokens at model limit', () => {
      const config = createPerplexityConfig({
        model: 'sonar-pro',
        maxTokens: 100000, // Way over limit
      });
      expect(config.max_tokens).toBe(PERPLEXITY_MODELS['sonar-pro'].maxTokens);
    });

    test('should not stream by default', () => {
      const config = createPerplexityConfig();
      expect(config.stream).toBe(false);
    });

    test('should enable streaming when specified', () => {
      const config = createPerplexityConfig({ enableStreaming: true });
      expect(config.stream).toBe(true);
    });

    test('should include reasoning_effort for reasoning models', () => {
      const config = createPerplexityConfig({
        model: 'sonar-reasoning-pro',
        reasoningEffort: 'high',
      });
      expect(config.reasoning_effort).toBe('high');
    });

    test('should NOT include reasoning_effort for non-reasoning models', () => {
      const config = createPerplexityConfig({
        model: 'sonar-pro',
        reasoningEffort: 'high', // Should be ignored
      });
      expect(config.reasoning_effort).toBeUndefined();
    });
  });

  describe('calculateAdaptiveTimeout', () => {
    test('should return base timeout for non-reasoning model', () => {
      const timeout = calculateAdaptiveTimeout({ modelKey: 'sonar-pro' });
      expect(timeout).toBe(PERPLEXITY_CONFIG.ADAPTIVE_TIMEOUT.BASE_TIMEOUT);
    });

    test('should apply reasoning multiplier for reasoning models', () => {
      const timeout = calculateAdaptiveTimeout({ modelKey: 'sonar-reasoning' });
      const expected = PERPLEXITY_CONFIG.ADAPTIVE_TIMEOUT.BASE_TIMEOUT *
        PERPLEXITY_CONFIG.ADAPTIVE_TIMEOUT.REASONING_MULTIPLIER;
      expect(timeout).toBeGreaterThanOrEqual(expected);
    });

    test('should add bonus for high reasoning effort', () => {
      const baseTimeout = calculateAdaptiveTimeout({
        modelKey: 'sonar-reasoning-pro',
        reasoningEffort: 'low',
      });
      const highTimeout = calculateAdaptiveTimeout({
        modelKey: 'sonar-reasoning-pro',
        reasoningEffort: 'high',
      });
      expect(highTimeout).toBeGreaterThan(baseTimeout);
    });

    test('should add bonus for long questions', () => {
      const shortTimeout = calculateAdaptiveTimeout({
        modelKey: 'sonar-pro',
        questionLength: 50,
      });
      const longTimeout = calculateAdaptiveTimeout({
        modelKey: 'sonar-pro',
        questionLength: 250,
      });
      expect(longTimeout).toBeGreaterThan(shortTimeout);
    });

    test('should add bonus for theme and character contexts', () => {
      const generalTimeout = calculateAdaptiveTimeout({
        modelKey: 'sonar-pro',
        questionContext: 'general',
      });
      const themeTimeout = calculateAdaptiveTimeout({
        modelKey: 'sonar-pro',
        questionContext: 'theme',
      });
      expect(themeTimeout).toBeGreaterThan(generalTimeout);
    });

    test('should not exceed maximum timeout', () => {
      const timeout = calculateAdaptiveTimeout({
        modelKey: 'sonar-reasoning-pro',
        reasoningEffort: 'high',
        questionLength: 500,
        questionContext: 'theme',
      });
      expect(timeout).toBeLessThanOrEqual(PERPLEXITY_CONFIG.ADAPTIVE_TIMEOUT.MAX_TIMEOUT);
    });

    test('should not go below minimum timeout', () => {
      const timeout = calculateAdaptiveTimeout({ modelKey: 'sonar-pro' });
      expect(timeout).toBeGreaterThanOrEqual(PERPLEXITY_CONFIG.ADAPTIVE_TIMEOUT.MIN_TIMEOUT);
    });
  });

  describe('getTimeoutSummary', () => {
    test('should format timeout in seconds for short durations', () => {
      const summary = getTimeoutSummary(45000);
      expect(summary.seconds).toBe(45);
      expect(summary.formatted).toBe('45 秒');
    });

    test('should format timeout in minutes for longer durations', () => {
      const summary = getTimeoutSummary(120000);
      expect(summary.minutes).toBe(2);
      expect(summary.formatted).toBe('2 分鐘');
    });

    test('should handle exactly 1 minute', () => {
      const summary = getTimeoutSummary(60000);
      expect(summary.minutes).toBe(1);
      expect(summary.formatted).toBe('1 分鐘');
    });
  });

  describe('PERPLEXITY_CONFIG Constants', () => {
    test('should have valid BASE_URL', () => {
      expect(PERPLEXITY_CONFIG.BASE_URL).toBe('https://api.perplexity.ai');
    });

    test('should have valid timeout configurations', () => {
      expect(PERPLEXITY_CONFIG.REQUEST_TIMEOUT_MS).toBeGreaterThan(0);
      expect(PERPLEXITY_CONFIG.REASONING_MODEL_TIMEOUT_MS).toBeGreaterThan(
        PERPLEXITY_CONFIG.REQUEST_TIMEOUT_MS
      );
    });

    test('should have valid default model', () => {
      expect(PERPLEXITY_CONFIG.DEFAULT_MODEL).toBe('sonar-reasoning-pro');
      expect(PERPLEXITY_MODELS[PERPLEXITY_CONFIG.DEFAULT_MODEL]).toBeDefined();
    });

    test('should have valid default temperature (less than 2)', () => {
      expect(PERPLEXITY_CONFIG.DEFAULT_TEMPERATURE).toBeGreaterThanOrEqual(0);
      expect(PERPLEXITY_CONFIG.DEFAULT_TEMPERATURE).toBeLessThan(2);
    });
  });
});
