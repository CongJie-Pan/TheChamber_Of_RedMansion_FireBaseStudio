/**
 * @fileOverview Test Suite for Translations Module (Task D.1.1)
 * 
 * This test suite validates the internationalization functionality
 * supporting the Firebase-Based Minimal Authentication Setup.
 * Tests cover:
 * - Language type definitions and constants
 * - Text transformation for different languages
 * - Translation key retrieval
 * - Traditional/Simplified Chinese conversion
 * - English localization support
 */

// Import the module being tested
import {
  Language,
  LANGUAGES,
  DEFAULT_LANGUAGE,
  transformTextForLang,
  getTranslation,
  translations
} from '@/lib/translations';

describe('Translations Module - Task D.1.1 Internationalization Support', () => {
  
  /**
   * Test Category 1: Type and Constant Tests
   * 
   * Validates the basic configuration and constants used for internationalization
   */
  describe('Language Types and Constants', () => {
    test('should define correct language types', () => {
      // Verify language type values
      const validLanguages: Language[] = ['zh-TW', 'zh-CN', 'en-US'];
      
      validLanguages.forEach(lang => {
        // Each language should be a valid Language type
        expect(typeof lang).toBe('string');
      });
    });

    test('should provide correct language options', () => {
      // Verify LANGUAGES array structure
      expect(LANGUAGES).toHaveLength(3);
      
      const expectedLanguages = [
        { code: 'zh-TW', name: '繁體中文' },
        { code: 'zh-CN', name: '简体中文' },
        { code: 'en-US', name: 'English (US)' }
      ];

      expectedLanguages.forEach((expected, index) => {
        expect(LANGUAGES[index]).toEqual(expected);
      });
    });

    test('should set correct default language', () => {
      expect(DEFAULT_LANGUAGE).toBe('zh-TW');
    });
  });

  /**
   * Test Category 2: Text Transformation Tests
   * 
   * Tests the transformTextForLang function for different language conversions
   */
  describe('Text Transformation', () => {
    const sampleText = '紅樓夢是中國古典文學的傑作，講述了賈寶玉、林黛玉等人的愛情故事。';

    test('should return original text for Traditional Chinese (zh-TW)', () => {
      const result = transformTextForLang(sampleText, 'zh-TW', 'original');
      expect(result).toBe(sampleText);
    });

    test('should convert Traditional to Simplified Chinese (zh-CN)', () => {
      const result = transformTextForLang(sampleText, 'zh-CN', 'original');
      
      // Verify key character conversions
      expect(result).toContain('红楼梦'); // 紅樓夢 -> 红楼梦
      expect(result).toContain('杰作'); // 傑作 -> 杰作
      expect(result).toContain('讲述'); // 講述 -> 讲述
      expect(result).toContain('贾宝玉'); // 賈寶玉 -> 贾宝玉
      expect(result).toContain('黛玉'); // 黛玉 remains same
    });

    test('should handle specific character conversions correctly', () => {
      const testCases = [
        { traditional: '臺灣', simplified: '台湾' },
        { traditional: '裡面', simplified: '里面' },
        { traditional: '蘋果', simplified: '苹果' },
        { traditional: '夢想', simplified: '梦想' },
        { traditional: '寶貝', simplified: '宝贝' }
      ];

      testCases.forEach(({ traditional, simplified }) => {
        const result = transformTextForLang(traditional, 'zh-CN', 'original');
        expect(result).toBe(simplified);
      });
    });

    test('should provide English translation placeholder', () => {
      const result = transformTextForLang(sampleText, 'en-US', 'original');
      
      // Should contain English translation indicator
      expect(result).toContain('[EN]');
      expect(result).toContain('Full original text translation pending');
    });

    test('should handle different text types for English', () => {
      const textTypes = ['original', 'vernacular', 'annotation'] as const;
      
      textTypes.forEach(type => {
        const result = transformTextForLang(sampleText, 'en-US', type);
        expect(result).toContain(`[EN${type === 'original' ? '' : ` ${type.charAt(0).toUpperCase() + type.slice(1)}`}]`);
      });
    });

    test('should handle empty or undefined text', () => {
      expect(transformTextForLang('', 'zh-TW', 'original')).toBe('');
      expect(transformTextForLang(undefined, 'zh-TW', 'original')).toBe('');
    });

    test('should handle all text type variations', () => {
      const textTypes = ['original', 'vernacular', 'annotation'] as const;
      
      textTypes.forEach(type => {
        const result = transformTextForLang(sampleText, 'zh-TW', type);
        expect(result).toBe(sampleText); // Should return original for zh-TW
      });
    });
  });

  /**
   * Test Category 3: Translation Structure Tests
   * 
   * Tests the translation object structure and key accessibility
   */
  describe('Translation Object Structure', () => {
    test('should contain translations for all supported languages', () => {
      const supportedLanguages: Language[] = ['zh-TW', 'zh-CN', 'en-US'];
      
      supportedLanguages.forEach(lang => {
        expect(translations[lang]).toBeDefined();
        expect(typeof translations[lang]).toBe('object');
      });
    });

    test('should contain authentication-related translations', () => {
      const authKeys = [
        'buttons.login',
        'buttons.logout',
        'login.welcomeBack',
        'register.errorEmailInvalid',
        'user.notLoggedIn'
      ];

      authKeys.forEach(key => {
        const value = getTranslation('zh-TW', key, translations);
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });

    test('should contain app name and basic UI elements', () => {
      const basicKeys = [
        'appName',
        'buttons.startLearning',
        'buttons.next',
        'buttons.cancel'
      ];

      basicKeys.forEach(key => {
        const value = getTranslation('zh-TW', key, translations);
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });

    test('should have consistent structure across languages', () => {
      // Test that key translation keys exist in all languages
      const criticalKeys = [
        'appName',
        'buttons.login',
        'buttons.logout'
      ];

      const languages: Language[] = ['zh-TW', 'zh-CN', 'en-US'];
      
      languages.forEach(lang => {
        criticalKeys.forEach(key => {
          const value = getTranslation(lang, key, translations);
          expect(typeof value).toBe('string');
          expect(value.length).toBeGreaterThan(0);
        });
      });
    });
  });

  /**
   * Test Category 4: Translation Retrieval Tests
   * 
   * Tests the getTranslation function for proper key retrieval
   */
  describe('Translation Retrieval', () => {
    test('should retrieve nested translation keys', () => {
      const result = getTranslation('zh-TW', 'buttons.login', translations);
      expect(result).toBe('登入');
    });

    test('should handle missing keys gracefully', () => {
      const result = getTranslation('zh-TW', 'nonexistent.key', translations);
      // Should return the key itself if translation not found
      expect(result).toBe('nonexistent.key');
    });

    test('should work with all supported languages', () => {
      const languages: Language[] = ['zh-TW', 'zh-CN', 'en-US'];
      
      languages.forEach(lang => {
        const result = getTranslation(lang, 'buttons.login', translations);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    });

    test('should handle deep nesting correctly', () => {
      // Test deeply nested keys if they exist
      const deepKey = 'auth.errors.invalidCredential';
      const result = getTranslation('zh-TW', deepKey, translations);
      expect(typeof result).toBe('string');
    });
  });

  /**
   * Test Category 5: Demo-specific Translation Tests
   * 
   * Tests translations specifically needed for Task D.1.1 demo functionality
   */
  describe('Demo Authentication Translations', () => {
    test('should contain demo user related translations', () => {
      const demoKeys = [
        'user.demoUser',
        'user.demoAccount',
        'demo.errorCreateUser'
      ];

      demoKeys.forEach(key => {
        const value = getTranslation('zh-TW', key, translations);
        expect(typeof value).toBe('string');
      });
    });

    test('should contain authentication provider translations', () => {
      const providerKeys = [
        'auth.providerGoogle',
        'auth.providerEmail'
      ];

      providerKeys.forEach(key => {
        const value = getTranslation('zh-TW', key, translations);
        expect(typeof value).toBe('string');
      });
    });

    test('should contain error message translations', () => {
      const errorKeys = [
        'login.errorDefault',
        'login.errorInvalidCredential',
        'login.errorPopupClosed',
        'register.errorEmailInUse'
      ];

      errorKeys.forEach(key => {
        const value = getTranslation('zh-TW', key, translations);
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });
  });

  /**
   * Test Category 6: Task 4.8 & 4.9 New Translation Keys
   *
   * Tests for new translation keys added for registration preferredName
   * and community post sync features
   */
  describe('Task 4.8 & 4.9: New Translation Keys', () => {
    describe('preferredName translations (Task 4.8)', () => {
      test('should have preferredNameLabel in zh-TW', () => {
        const value = getTranslation('zh-TW', 'register.preferredNameLabel', translations);
        expect(value).toBe('顯示名稱 *');
      });

      test('should have preferredNameLabel in en-US', () => {
        const value = getTranslation('en-US', 'register.preferredNameLabel', translations);
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
        expect(value.toLowerCase()).toContain('name');
      });

      test('should have preferredNamePlaceholder in all languages', () => {
        const languages: Language[] = ['zh-TW', 'zh-CN', 'en-US'];

        languages.forEach(lang => {
          const value = getTranslation(lang, 'register.preferredNamePlaceholder', translations);
          expect(typeof value).toBe('string');
          expect(value.length).toBeGreaterThan(0);
        });
      });

      test('should have preferredNameHint in all languages', () => {
        const languages: Language[] = ['zh-TW', 'zh-CN', 'en-US'];

        languages.forEach(lang => {
          const value = getTranslation(lang, 'register.preferredNameHint', translations);
          expect(typeof value).toBe('string');
          expect(value.length).toBeGreaterThan(0);
        });
      });

      test('should have all preferredName error messages in zh-TW', () => {
        const errorKeys = [
          'register.errors.preferredNameRequired',
          'register.errors.preferredNameTooShort',
          'register.errors.preferredNameTooLong',
          'register.errors.preferredNameInvalid',
        ];

        errorKeys.forEach(key => {
          const value = getTranslation('zh-TW', key, translations);
          expect(typeof value).toBe('string');
          expect(value.length).toBeGreaterThan(0);
        });
      });

      test('should have all preferredName error messages in en-US', () => {
        const errorKeys = [
          'register.errors.preferredNameRequired',
          'register.errors.preferredNameTooShort',
          'register.errors.preferredNameTooLong',
          'register.errors.preferredNameInvalid',
        ];

        errorKeys.forEach(key => {
          const value = getTranslation('en-US', key, translations);
          expect(typeof value).toBe('string');
          expect(value.length).toBeGreaterThan(0);
        });
      });
    });

    describe('communityPost translations (Task 4.9)', () => {
      test('should have communityPost.edited in zh-TW', () => {
        const value = getTranslation('zh-TW', 'communityPost.edited', translations);
        expect(value).toBe('已編輯');
      });

      test('should have communityPost.edited in en-US', () => {
        const value = getTranslation('en-US', 'communityPost.edited', translations);
        expect(value).toBe('Edited');
      });

      test('should have communityPost.syncedFromNote in zh-TW', () => {
        const value = getTranslation('zh-TW', 'communityPost.syncedFromNote', translations);
        expect(value).toBe('來自閱讀筆記');
      });

      test('should have communityPost.syncedFromNote in en-US', () => {
        const value = getTranslation('en-US', 'communityPost.syncedFromNote', translations);
        expect(value).toBe('From reading note');
      });

      test('should have communityPost translations in all languages', () => {
        const languages: Language[] = ['zh-TW', 'zh-CN', 'en-US'];
        const keys = ['communityPost.edited', 'communityPost.syncedFromNote'];

        languages.forEach(lang => {
          keys.forEach(key => {
            const value = getTranslation(lang, key, translations);
            expect(typeof value).toBe('string');
            expect(value.length).toBeGreaterThan(0);
          });
        });
      });
    });
  });

  /**
   * Test Category 7: Performance and Edge Cases
   *
   * Tests edge cases and performance considerations
   */
  describe('Edge Cases and Performance', () => {
    test('should handle invalid language codes gracefully', () => {
      // @ts-ignore - Testing invalid input
      const result = transformTextForLang('test', 'invalid-lang', 'original');
      expect(result).toBe('test'); // Should return original text
    });

    test('should handle large text transformations efficiently', () => {
      const largeText = '紅樓夢'.repeat(1000);
      const startTime = Date.now();
      
      const result = transformTextForLang(largeText, 'zh-CN', 'original');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Transformation should complete within reasonable time (< 100ms)
      expect(duration).toBeLessThan(100);
      expect(result).toContain('红楼梦');
    });

    test('should maintain consistency in repeated transformations', () => {
      const text = '繁體中文轉換測試';
      
      const result1 = transformTextForLang(text, 'zh-CN', 'original');
      const result2 = transformTextForLang(text, 'zh-CN', 'original');
      
      expect(result1).toBe(result2);
    });

    test('should handle special characters and punctuation', () => {
      const textWithPunctuation = '「紅樓夢」—— 中國古典文學！';
      const result = transformTextForLang(textWithPunctuation, 'zh-CN', 'original');
      
      // Punctuation should be preserved
      expect(result).toContain('「');
      expect(result).toContain('」');
      expect(result).toContain('——');
      expect(result).toContain('！');
      
      // Characters should still be converted
      expect(result).toContain('红楼梦');
    });
  });
}); 