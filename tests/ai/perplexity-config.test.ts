/**
 * @fileOverview Unit tests for Perplexity configuration module
 * Tests configuration constants, helper functions, and adaptive timeout algorithm
 */

import { describe, test, expect, beforeEach, afterAll } from '@jest/globals';
import {
  PERPLEXITY_MODELS,
  PERPLEXITY_CONFIG,
  REASONING_EFFORTS,
  QUESTION_CONTEXTS,
  ENV_VARS,
  getPerplexityApiKey,
  isPerplexityConfigured,
  getModelConfig,
  supportsReasoning,
  getDefaultHeaders,
  createPerplexityConfig,
  calculateAdaptiveTimeout,
  getTimeoutSummary,
  type PerplexityModelKey,
  type ReasoningEffort,
  type QuestionContext,
} from '@/ai/perplexity-config';

// Store original environment
const originalEnv = process.env;

describe('Perplexity Configuration Module', () => {
  beforeEach(() => {
    // Reset environment to original state
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Model Configurations', () => {
    test('should define all three model types with correct properties', () => {
      expect(PERPLEXITY_MODELS).toHaveProperty('sonar-pro');
      expect(PERPLEXITY_MODELS).toHaveProperty('sonar-reasoning');
      expect(PERPLEXITY_MODELS).toHaveProperty('sonar-reasoning-pro');

      // Verify sonar-pro configuration
      const sonarPro = PERPLEXITY_MODELS['sonar-pro'];
      expect(sonarPro.name).toBe('sonar-pro');
      expect(sonarPro.maxTokens).toBe(4000);
      expect(sonarPro.supportsReasoning).toBe(false);
      expect(sonarPro.features).toContain('web_search');
      expect(sonarPro.features).toContain('citations');
      expect(sonarPro.features).not.toContain('reasoning');

      // Verify sonar-reasoning configuration
      const sonarReasoning = PERPLEXITY_MODELS['sonar-reasoning'];
      expect(sonarReasoning.name).toBe('sonar-reasoning');
      expect(sonarReasoning.maxTokens).toBe(8000);
      expect(sonarReasoning.supportsReasoning).toBe(true);
      expect(sonarReasoning.features).toContain('reasoning');
      expect(sonarReasoning.features).toContain('thinking_process');

      // Verify sonar-reasoning-pro configuration
      const sonarReasoningPro = PERPLEXITY_MODELS['sonar-reasoning-pro'];
      expect(sonarReasoningPro.name).toBe('sonar-reasoning-pro');
      expect(sonarReasoningPro.maxTokens).toBe(8000);
      expect(sonarReasoningPro.supportsReasoning).toBe(true);
      expect(sonarReasoningPro.features).toContain('advanced_reasoning');
    });

    test('should have Chinese display names and descriptions', () => {
      Object.values(PERPLEXITY_MODELS).forEach(model => {
        expect(model.displayName).toBeTruthy();
        expect(model.description).toBeTruthy();
        // Verify Chinese characters (basic check)
        expect(/[\u4e00-\u9fa5]/.test(model.displayName)).toBe(true);
        expect(/[\u4e00-\u9fa5]/.test(model.description)).toBe(true);
      });
    });

    test('should define reasoning effort levels correctly', () => {
      expect(REASONING_EFFORTS).toHaveProperty('low');
      expect(REASONING_EFFORTS).toHaveProperty('medium');
      expect(REASONING_EFFORTS).toHaveProperty('high');

      expect(REASONING_EFFORTS.low.value).toBe('low');
      expect(REASONING_EFFORTS.medium.value).toBe('medium');
      expect(REASONING_EFFORTS.high.value).toBe('high');

      // Verify emojis
      expect(REASONING_EFFORTS.low.emoji).toBe('🟢');
      expect(REASONING_EFFORTS.medium.emoji).toBe('🟡');
      expect(REASONING_EFFORTS.high.emoji).toBe('🔴');
    });

    test('should define question contexts correctly', () => {
      const contexts: QuestionContext[] = ['character', 'plot', 'theme', 'general'];

      contexts.forEach(context => {
        expect(QUESTION_CONTEXTS).toHaveProperty(context);
        expect(QUESTION_CONTEXTS[context].key).toBe(context);
        expect(QUESTION_CONTEXTS[context].displayName).toBeTruthy();
        expect(QUESTION_CONTEXTS[context].emoji).toBeTruthy();
        expect(QUESTION_CONTEXTS[context].description).toBeTruthy();
      });
    });
  });

  describe('Configuration Constants', () => {
    test('should define correct API endpoints', () => {
      expect(PERPLEXITY_CONFIG.BASE_URL).toBe('https://api.perplexity.ai');
      expect(PERPLEXITY_CONFIG.CHAT_COMPLETIONS_ENDPOINT).toBe('/chat/completions');
    });

    test('should define reasonable timeout values', () => {
      expect(PERPLEXITY_CONFIG.REQUEST_TIMEOUT_MS).toBe(60000); // 60 seconds
      expect(PERPLEXITY_CONFIG.REASONING_MODEL_TIMEOUT_MS).toBe(180000); // 180 seconds
      expect(PERPLEXITY_CONFIG.MAX_RETRIES).toBe(3);
      expect(PERPLEXITY_CONFIG.RETRY_DELAY_MS).toBe(2000);
    });

    test('should define adaptive timeout configuration', () => {
      const { ADAPTIVE_TIMEOUT } = PERPLEXITY_CONFIG;

      expect(ADAPTIVE_TIMEOUT.BASE_TIMEOUT).toBe(45000); // 45 seconds
      expect(ADAPTIVE_TIMEOUT.REASONING_MULTIPLIER).toBe(1.5);
      expect(ADAPTIVE_TIMEOUT.COMPLEX_QUESTION_BONUS).toBe(30000); // 30 seconds
      expect(ADAPTIVE_TIMEOUT.MAX_TIMEOUT).toBe(120000); // 2 minutes
      expect(ADAPTIVE_TIMEOUT.MIN_TIMEOUT).toBe(30000); // 30 seconds
    });

    test('should define default model settings', () => {
      expect(PERPLEXITY_CONFIG.DEFAULT_MODEL).toBe('sonar-reasoning-pro');
      expect(PERPLEXITY_CONFIG.DEFAULT_REASONING_EFFORT).toBe('high');
      expect(PERPLEXITY_CONFIG.DEFAULT_TEMPERATURE).toBe(0.2);
      expect(PERPLEXITY_CONFIG.DEFAULT_MAX_TOKENS).toBe(2000);
    });

    test('should define streaming and citation settings', () => {
      expect(PERPLEXITY_CONFIG.STREAM_CHUNK_DELAY_MS).toBe(50);
      expect(PERPLEXITY_CONFIG.STREAM_UPDATE_FREQUENCY).toBe(15);
      expect(PERPLEXITY_CONFIG.MAX_CITATIONS).toBe(10);
      expect(PERPLEXITY_CONFIG.CITATION_TIMEOUT_MS).toBe(5000);
      expect(PERPLEXITY_CONFIG.ENABLE_CITATION_PARSING).toBe(true);
    });

    test('should define response processing settings', () => {
      expect(PERPLEXITY_CONFIG.ENABLE_THINKING_PROCESS).toBe(true);
      expect(PERPLEXITY_CONFIG.CLEAN_HTML_TAGS).toBe(true);
      expect(PERPLEXITY_CONFIG.MAX_RESPONSE_LENGTH).toBe(10000);
    });

    test('should define error handling settings', () => {
      expect(PERPLEXITY_CONFIG.ENABLE_FALLBACK).toBe(true);
      expect(PERPLEXITY_CONFIG.FALLBACK_MODEL).toBe('sonar-pro');
    });
  });

  describe('Environment Variable Helpers', () => {
    test('should define correct environment variable names', () => {
      expect(ENV_VARS.PERPLEXITY_API_KEY).toBe('PERPLEXITYAI_API_KEY');
      expect(ENV_VARS.PERPLEXITY_BASE_URL).toBe('PERPLEXITY_BASE_URL');
      expect(ENV_VARS.ENABLE_DEBUG_LOGGING).toBe('PERPLEXITY_DEBUG');
    });

    test('should retrieve API key from environment', () => {
      process.env.PERPLEXITYAI_API_KEY = 'test-api-key-12345';
      expect(getPerplexityApiKey()).toBe('test-api-key-12345');
    });

    test('should return undefined when API key not set', () => {
      delete process.env.PERPLEXITYAI_API_KEY;
      expect(getPerplexityApiKey()).toBeUndefined();
    });

    test('should validate API key configuration', () => {
      process.env.PERPLEXITYAI_API_KEY = 'valid-key';
      expect(isPerplexityConfigured()).toBe(true);

      delete process.env.PERPLEXITYAI_API_KEY;
      expect(isPerplexityConfigured()).toBe(false);

      process.env.PERPLEXITYAI_API_KEY = '   '; // Whitespace only
      expect(isPerplexityConfigured()).toBe(false);

      process.env.PERPLEXITYAI_API_KEY = ''; // Empty string
      expect(isPerplexityConfigured()).toBe(false);
    });
  });

  describe('Model Configuration Helpers', () => {
    test('should retrieve correct model configuration', () => {
      const proConfig = getModelConfig('sonar-pro');
      expect(proConfig.name).toBe('sonar-pro');
      expect(proConfig.maxTokens).toBe(4000);

      const reasoningConfig = getModelConfig('sonar-reasoning-pro');
      expect(reasoningConfig.name).toBe('sonar-reasoning-pro');
      expect(reasoningConfig.maxTokens).toBe(8000);
    });

    test('should correctly identify reasoning support', () => {
      expect(supportsReasoning('sonar-pro')).toBe(false);
      expect(supportsReasoning('sonar-reasoning')).toBe(true);
      expect(supportsReasoning('sonar-reasoning-pro')).toBe(true);
    });
  });

  describe('HTTP Headers Generation', () => {
    test('should generate default headers with provided API key', () => {
      const headers = getDefaultHeaders('custom-api-key');

      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Authorization']).toBe('Bearer custom-api-key');
      expect(headers['User-Agent']).toBe('RedMansion-Learning-Platform/1.0');
    });

    test('should generate headers with environment API key if not provided', () => {
      process.env.PERPLEXITYAI_API_KEY = 'env-api-key';
      const headers = getDefaultHeaders();

      expect(headers['Authorization']).toBe('Bearer env-api-key');
    });

    test('should generate headers with undefined if no API key available', () => {
      delete process.env.PERPLEXITYAI_API_KEY;
      const headers = getDefaultHeaders();

      expect(headers['Authorization']).toBe('Bearer undefined');
    });
  });

  describe('Perplexity Config Factory', () => {
    test('should create config with default values', () => {
      const config = createPerplexityConfig();

      expect(config.model).toBe('sonar-reasoning-pro');
      expect(config.temperature).toBe(0.2);
      expect(config.max_tokens).toBe(2000);
      expect(config.stream).toBe(false);
    });

    test('should create config with custom values', () => {
      const config = createPerplexityConfig({
        model: 'sonar-pro',
        temperature: 0.5,
        maxTokens: 1000,
        enableStreaming: true,
      });

      expect(config.model).toBe('sonar-pro');
      expect(config.temperature).toBe(0.5);
      expect(config.max_tokens).toBe(1000);
      expect(config.stream).toBe(true);
    });

    test('should enforce model maxTokens ceiling', () => {
      // sonar-pro has 4000 max tokens
      const config1 = createPerplexityConfig({
        model: 'sonar-pro',
        maxTokens: 5000, // Exceeds limit
      });
      expect(config1.max_tokens).toBe(4000); // Should be clamped

      // sonar-reasoning has 8000 max tokens
      const config2 = createPerplexityConfig({
        model: 'sonar-reasoning',
        maxTokens: 10000, // Exceeds limit
      });
      expect(config2.max_tokens).toBe(8000); // Should be clamped
    });

    test('should include reasoning_effort for reasoning models', () => {
      const config = createPerplexityConfig({
        model: 'sonar-reasoning-pro',
        reasoningEffort: 'high',
      });

      expect(config).toHaveProperty('reasoning_effort');
      expect((config as any).reasoning_effort).toBe('high');
    });

    test('should not include reasoning_effort for non-reasoning models', () => {
      const config = createPerplexityConfig({
        model: 'sonar-pro',
        reasoningEffort: 'high', // Should be ignored
      });

      expect(config).not.toHaveProperty('reasoning_effort');
    });

    test('should handle all reasoning effort levels', () => {
      const efforts: ReasoningEffort[] = ['low', 'medium', 'high'];

      efforts.forEach(effort => {
        const config = createPerplexityConfig({
          model: 'sonar-reasoning',
          reasoningEffort: effort,
        });
        expect((config as any).reasoning_effort).toBe(effort);
      });
    });
  });

  describe('Adaptive Timeout Calculation', () => {
    test('should calculate base timeout for non-reasoning model', () => {
      const timeout = calculateAdaptiveTimeout({
        modelKey: 'sonar-pro',
        questionLength: 50,
      });

      // Base timeout is 45 seconds
      expect(timeout).toBe(45000);
    });

    test('should apply reasoning multiplier for reasoning models', () => {
      const timeout = calculateAdaptiveTimeout({
        modelKey: 'sonar-reasoning',
        questionLength: 50,
      });

      // Base timeout (45s) * 1.5 = 67.5 seconds
      expect(timeout).toBe(67500);
    });

    test('should add bonus for high reasoning effort', () => {
      const timeout = calculateAdaptiveTimeout({
        modelKey: 'sonar-reasoning-pro',
        reasoningEffort: 'high',
        questionLength: 50,
      });

      // Base (45s) * 1.5 + 15s = 82.5 seconds
      expect(timeout).toBe(82500);
    });

    test('should add bonus for medium reasoning effort', () => {
      const timeout = calculateAdaptiveTimeout({
        modelKey: 'sonar-reasoning',
        reasoningEffort: 'medium',
        questionLength: 50,
      });

      // Base (45s) * 1.5 + 7.5s = 75 seconds
      expect(timeout).toBe(75000);
    });

    test('should not add bonus for low reasoning effort', () => {
      const timeout = calculateAdaptiveTimeout({
        modelKey: 'sonar-reasoning',
        reasoningEffort: 'low',
        questionLength: 50,
      });

      // Base (45s) * 1.5 = 67.5 seconds (no effort bonus)
      expect(timeout).toBe(67500);
    });

    test('should add bonus for long questions (>200 chars)', () => {
      const timeout = calculateAdaptiveTimeout({
        modelKey: 'sonar-pro',
        questionLength: 250,
      });

      // Base (45s) + 30s complex bonus = 75 seconds
      expect(timeout).toBe(75000);
    });

    test('should add half bonus for medium questions (>100 chars)', () => {
      const timeout = calculateAdaptiveTimeout({
        modelKey: 'sonar-pro',
        questionLength: 150,
      });

      // Base (45s) + 15s medium bonus = 60 seconds
      expect(timeout).toBe(60000);
    });

    test('should add context-specific adjustments', () => {
      const themeTimeout = calculateAdaptiveTimeout({
        modelKey: 'sonar-pro',
        questionLength: 50,
        questionContext: 'theme',
      });

      // Base (45s) + 10s context bonus = 55 seconds
      expect(themeTimeout).toBe(55000);

      const characterTimeout = calculateAdaptiveTimeout({
        modelKey: 'sonar-pro',
        questionLength: 50,
        questionContext: 'character',
      });

      // Base (45s) + 10s context bonus = 55 seconds
      expect(characterTimeout).toBe(55000);

      const plotTimeout = calculateAdaptiveTimeout({
        modelKey: 'sonar-pro',
        questionLength: 50,
        questionContext: 'plot',
      });

      // Base (45s), no context bonus = 45 seconds
      expect(plotTimeout).toBe(45000);
    });

    test('should enforce minimum timeout of 30 seconds', () => {
      // This shouldn't happen in practice, but test the boundary
      const timeout = calculateAdaptiveTimeout({
        modelKey: 'sonar-pro',
        questionLength: 10,
      });

      expect(timeout).toBeGreaterThanOrEqual(30000);
    });

    test('should enforce maximum timeout of 120 seconds', () => {
      const timeout = calculateAdaptiveTimeout({
        modelKey: 'sonar-reasoning-pro',
        reasoningEffort: 'high',
        questionLength: 300,
        questionContext: 'theme',
      });

      // Base (45s) * 1.5 + 15s (high effort) + 30s (long question) + 10s (context)
      // = 67.5s + 15s + 30s + 10s = 122.5s
      // Should be clamped to 120s
      expect(timeout).toBeLessThanOrEqual(120000);
      expect(timeout).toBe(120000);
    });

    test('should handle combined bonuses correctly', () => {
      const timeout = calculateAdaptiveTimeout({
        modelKey: 'sonar-reasoning-pro',
        reasoningEffort: 'medium',
        questionLength: 150,
        questionContext: 'character',
      });

      // Base (45s) * 1.5 = 67.5s
      // + 7.5s (medium effort)
      // + 15s (medium question length)
      // + 10s (character context)
      // = 100 seconds
      expect(timeout).toBe(100000);
    });
  });

  describe('Timeout Summary Formatter', () => {
    test('should format timeout in seconds for values < 60 seconds', () => {
      const summary = getTimeoutSummary(45000); // 45 seconds

      expect(summary.seconds).toBe(45);
      expect(summary.minutes).toBe(0.8);
      expect(summary.formatted).toBe('45 秒');
    });

    test('should format timeout in minutes for values >= 60 seconds', () => {
      const summary = getTimeoutSummary(90000); // 90 seconds = 1.5 minutes

      expect(summary.seconds).toBe(90);
      expect(summary.minutes).toBe(1.5);
      expect(summary.formatted).toBe('1.5 分鐘');
    });

    test('should format exactly 60 seconds as 1 minute', () => {
      const summary = getTimeoutSummary(60000);

      expect(summary.seconds).toBe(60);
      expect(summary.minutes).toBe(1);
      expect(summary.formatted).toBe('1 分鐘');
    });

    test('should round seconds correctly', () => {
      const summary = getTimeoutSummary(45678); // 45.678 seconds

      expect(summary.seconds).toBe(46); // Rounded
      expect(summary.minutes).toBe(0.8); // Rounded to 1 decimal
    });

    test('should format maximum timeout (120 seconds)', () => {
      const summary = getTimeoutSummary(120000);

      expect(summary.seconds).toBe(120);
      expect(summary.minutes).toBe(2);
      expect(summary.formatted).toBe('2 分鐘');
    });

    test('should format minimum timeout (30 seconds)', () => {
      const summary = getTimeoutSummary(30000);

      expect(summary.seconds).toBe(30);
      expect(summary.minutes).toBe(0.5);
      expect(summary.formatted).toBe('30 秒');
    });
  });

  describe('Type Safety and Exports', () => {
    test('should export all model keys as type union', () => {
      // Type test - this should compile without errors
      const validKeys: PerplexityModelKey[] = [
        'sonar-pro',
        'sonar-reasoning',
        'sonar-reasoning-pro',
      ];

      validKeys.forEach(key => {
        expect(PERPLEXITY_MODELS).toHaveProperty(key);
      });
    });

    test('should export all reasoning efforts as type union', () => {
      // Type test - this should compile without errors
      const validEfforts: ReasoningEffort[] = ['low', 'medium', 'high'];

      validEfforts.forEach(effort => {
        expect(REASONING_EFFORTS).toHaveProperty(effort);
      });
    });

    test('should export all question contexts as type union', () => {
      // Type test - this should compile without errors
      const validContexts: QuestionContext[] = ['character', 'plot', 'theme', 'general'];

      validContexts.forEach(context => {
        expect(QUESTION_CONTEXTS).toHaveProperty(context);
      });
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    test('should handle undefined questionLength gracefully', () => {
      const timeout = calculateAdaptiveTimeout({
        modelKey: 'sonar-pro',
        // questionLength is undefined
      });

      expect(timeout).toBe(45000); // Should use base timeout
    });

    test('should handle undefined reasoningEffort gracefully', () => {
      const timeout = calculateAdaptiveTimeout({
        modelKey: 'sonar-reasoning',
        // reasoningEffort is undefined
      });

      expect(timeout).toBe(67500); // Base * 1.5, no effort bonus
    });

    test('should handle undefined questionContext gracefully', () => {
      const timeout = calculateAdaptiveTimeout({
        modelKey: 'sonar-pro',
        questionLength: 50,
        // questionContext is undefined
      });

      expect(timeout).toBe(45000); // No context bonus
    });

    test('should handle zero questionLength', () => {
      const timeout = calculateAdaptiveTimeout({
        modelKey: 'sonar-pro',
        questionLength: 0,
      });

      expect(timeout).toBe(45000); // No length bonus
    });

    test('should handle extremely long questions', () => {
      const timeout = calculateAdaptiveTimeout({
        modelKey: 'sonar-pro',
        questionLength: 10000,
      });

      // Should still get the complex question bonus
      expect(timeout).toBe(75000); // Base + 30s bonus
    });

    test('should create config with all parameters set to edge values', () => {
      const config = createPerplexityConfig({
        model: 'sonar-reasoning-pro',
        temperature: 0, // Minimum
        maxTokens: 1, // Minimum
        reasoningEffort: 'high',
        enableStreaming: true,
      });

      expect(config.temperature).toBe(0);
      expect(config.max_tokens).toBe(1);
      expect(config.stream).toBe(true);
      expect((config as any).reasoning_effort).toBe('high');
    });

    test('should create config with maximum temperature', () => {
      const config = createPerplexityConfig({
        model: 'sonar-pro',
        temperature: 1, // Maximum
      });

      expect(config.temperature).toBe(1);
    });
  });
});
