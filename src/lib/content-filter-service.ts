/**
 * @fileOverview Automated Content Filtering System
 * 
 * This service provides automated content moderation capabilities for:
 * - Inappropriate language detection and filtering
 * - Spam content identification
 * - Hate speech and harassment detection
 * - Content safety scoring and automated actions
 * - Moderation logging and reporting
 * 
 * Features:
 * - Real-time content analysis before posting
 * - Multi-level filtering (warnings, hide, block)
 * - Customizable filter rules and sensitivity levels
 * - Integration with external moderation APIs
 * - Comprehensive logging for manual review
 * - Support for Traditional Chinese and English content
 */

/**
 * Note: Firebase removed in SQLITE-025
 * Moderation logging now uses structured console logging
 * TODO: Implement SQLite moderation_logs table for persistent logging
 */

// Content filtering result types
export interface ContentAnalysisResult {
  isAppropriate: boolean;
  confidence: number; // 0-1 scale
  violations: ViolationType[];
  suggestedAction: ModerationAction;
  filteredContent?: string; // Content with inappropriate parts masked
  warningMessage?: string;
}

export interface ViolationType {
  type: 'profanity' | 'hate-speech' | 'harassment' | 'spam' | 'off-topic' | 'self-promotion' | 'personal-info';
  severity: 'low' | 'medium' | 'high';
  details: string;
  matchedTerms?: string[];
}

export type ModerationAction = 'allow' | 'warn' | 'filter' | 'hide' | 'block' | 'flag-for-review';

export interface ModerationLog {
  id?: string;
  contentId: string;
  contentType: 'post' | 'comment';
  authorId: string;
  originalContent: string;
  filteredContent?: string;
  analysisResult: ContentAnalysisResult;
  action: ModerationAction;
  timestamp: Date | string; // Changed from Timestamp (SQLITE-025)
  reviewStatus: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewNotes?: string;
}

export interface FilterConfiguration {
  sensitivity: 'low' | 'medium' | 'high';
  enableProfanityFilter: boolean;
  enableSpamDetection: boolean;
  enableHateSpeechDetection: boolean;
  enablePersonalInfoDetection: boolean;
  autoHideThreshold: number; // Confidence threshold for auto-hiding content
  autoBlockThreshold: number; // Confidence threshold for auto-blocking content
}

export class ContentFilterService {
  // Moderation logging removed - using console.log for now (SQLITE-025)
  // TODO: Implement SQLite moderation_logs repository
  
  // Default filter configuration
  private defaultConfig: FilterConfiguration = {
    sensitivity: 'medium',
    enableProfanityFilter: true,
    enableSpamDetection: true,
    enableHateSpeechDetection: true,
    enablePersonalInfoDetection: true,
    autoHideThreshold: 0.7,
    autoBlockThreshold: 0.9
  };

  // Profanity and inappropriate content patterns for Traditional Chinese and English
  private profanityPatterns = {
    chinese: [
      // Severe profanity and inappropriate terms in Traditional Chinese
      '幹你娘', '塞你娘', '幹你娘磯拜', '幹你老祖磯拜', '他馬的', '去你的',
      
      // Common inappropriate terms in Chinese
      '白痴', '智障', '笨蛋', '神經病', '有病', '機車', '你嘎了',
      '去死', '死人', '滾蛋', '閉嘴', '該死', '混蛋', '王八蛋',
      '髒話', '粗話', '罵人', '蠢蛋', '腦殘',
      
      // Single character profanity that needs context checking
      '幹', // This needs careful handling as it can be legitimate in some contexts
      
      // Variations and common misspellings
      '幹你', '你娘', '磯拜', '機車髒話', '神經', '智障兒'
    ],
    english: [
      // Severe English profanity
      'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'motherfucker',
      'damn it', 'goddamn', 'piss off', 'go to hell',
      
      // Common profanity and inappropriate terms
      'stupid', 'idiot', 'moron', 'fool', 'shut up', 'damn', 'hell',
      'hate', 'suck', 'crap', 'jerk', 'loser', 'retard', 'freak',
      
      // Milder but still inappropriate
      'dumb', 'dumbass', 'jackass', 'screw you', 'piss', 'bloody'
    ]
  };

  // Spam detection patterns
  private spamPatterns = [
    // Repeated characters or symbols
    /(.)\1{4,}/g, // Same character repeated 5+ times
    /[!@#$%^&*()]{3,}/g, // Multiple special characters
    
    // Common spam phrases
    /買.*送.*免費/i, // Buy X get Y free
    /限時.*優惠/i, // Limited time offer
    /加.*LINE.*[0-9]/i, // Add LINE with numbers
    /賺錢.*機會/i, // Money making opportunity
    /click.*here/i,
    /visit.*website/i,
    /free.*money/i,
    /urgent.*reply/i
  ];

  // Hate speech and harassment patterns
  private hateSpeechPatterns = [
    // Traditional Chinese hate speech patterns
    /你.*廢物/i,
    /滾.*出去/i,
    /不配.*活/i,
    /去.*死/i,
    /你.*智障/i,
    /你.*白痴/i,
    /你.*有病/i,
    /你.*神經病/i,
    /你.*機車/i,
    /幹.*你/i,
    /他.*馬.*的/i,
    /你.*娘/i,
    
    // English hate speech patterns
    /you.*are.*trash/i,
    /get.*out/i,
    /don.*deserve/i,
    /you.*suck/i,
    /hate.*you/i,
    /you.*stupid/i,
    /you.*idiot/i,
    /go.*die/i,
    /kill.*yourself/i,
    /you.*loser/i
  ];

  // Personal information patterns (phone, email, address)
  private personalInfoPatterns = [
    /09[0-9]{8}/g, // Taiwan mobile phone numbers
    /\d{4}-\d{3}-\d{3}/g, // Phone number formats
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // Email addresses
    /[0-9]{3,5}.*[路街巷號]/g, // Taiwan addresses
    /line.*id.*[a-zA-Z0-9]/i, // LINE ID sharing
    /wechat.*[a-zA-Z0-9]/i // WeChat ID sharing
  ];

  /**
   * Analyze content for inappropriate material and determine moderation action
   * @param content - Text content to analyze
   * @param contentType - Type of content (post or comment)
   * @param config - Optional filter configuration
   * @returns Promise with content analysis result
   */
  async analyzeContent(
    content: string, 
    contentType: 'post' | 'comment',
    config: Partial<FilterConfiguration> = {}
  ): Promise<ContentAnalysisResult> {
    try {
      const filterConfig = { ...this.defaultConfig, ...config };
      const violations: ViolationType[] = [];
      let confidence = 0;
      let filteredContent = content;

      // Check for profanity
      if (filterConfig.enableProfanityFilter) {
        const profanityViolation = this.detectProfanity(content);
        if (profanityViolation) {
          violations.push(profanityViolation);
          filteredContent = this.maskProfanity(filteredContent);
          confidence = Math.max(confidence, 0.6);
        }
      }

      // Check for spam
      if (filterConfig.enableSpamDetection) {
        const spamViolation = this.detectSpam(content);
        if (spamViolation) {
          violations.push(spamViolation);
          confidence = Math.max(confidence, 0.7);
        }
      }

      // Check for hate speech
      if (filterConfig.enableHateSpeechDetection) {
        const hateSpeechViolation = this.detectHateSpeech(content);
        if (hateSpeechViolation) {
          violations.push(hateSpeechViolation);
          confidence = Math.max(confidence, 0.8);
        }
      }

      // Check for personal information
      if (filterConfig.enablePersonalInfoDetection) {
        const personalInfoViolation = this.detectPersonalInfo(content);
        if (personalInfoViolation) {
          violations.push(personalInfoViolation);
          filteredContent = this.maskPersonalInfo(filteredContent);
          confidence = Math.max(confidence, 0.5);
        }
      }

      // Determine suggested action based on violations and confidence
      const suggestedAction = this.determineModerationAction(confidence, violations, filterConfig);
      
      // Generate warning message if needed
      const warningMessage = violations.length > 0 ? this.generateWarningMessage(violations) : '';

      const result: ContentAnalysisResult = {
        isAppropriate: violations.length === 0,
        confidence,
        violations,
        suggestedAction,
        // Always provide filteredContent, even if it's the same as original
        filteredContent: filteredContent,
        warningMessage
      };

      console.log(`Content analysis completed: ${violations.length} violations found, confidence: ${confidence}`);
      return result;

    } catch (error) {
      console.error('Error analyzing content:', error);
      // Return safe default in case of error
      return {
        isAppropriate: true,
        confidence: 0,
        violations: [],
        suggestedAction: 'flag-for-review',
        filteredContent: content,
        warningMessage: ''
      };
    }
  }

  /**
   * Process content through the filter and apply moderation actions
   * @param content - Content to filter
   * @param contentId - ID of the content being filtered
   * @param contentType - Type of content
   * @param authorId - ID of the content author
   * @returns Promise with processing result and any applied actions
   */
  async processContent(
    content: string,
    contentId: string,
    contentType: 'post' | 'comment',
    authorId: string
  ): Promise<{ 
    processedContent: string; 
    action: ModerationAction; 
    shouldBlock: boolean;
    warningMessage?: string;
  }> {
    try {
      const analysisResult = await this.analyzeContent(content, contentType);
      
      // Log the moderation decision
      await this.logModerationDecision(
        contentId,
        contentType,
        authorId,
        content,
        analysisResult
      );

      // Determine final content and action
      let processedContent = content;
      let shouldBlock = false;

      switch (analysisResult.suggestedAction) {
        case 'block':
          shouldBlock = true;
          break;
        case 'hide':
          shouldBlock = true;
          break;
        case 'filter':
          processedContent = analysisResult.filteredContent || content;
          break;
        case 'warn':
          // Content passes but with warning
          break;
        case 'flag-for-review':
          // Allow content but flag for manual review
          break;
        default:
          // Allow content as is
          break;
      }

      console.log(`Content processed: action=${analysisResult.suggestedAction}, blocked=${shouldBlock}`);
      
      return {
        processedContent,
        action: analysisResult.suggestedAction,
        shouldBlock,
        warningMessage: analysisResult.warningMessage
      };

    } catch (error) {
      console.error('Error processing content:', error);
      // Return safe default - allow content but flag for review
      return {
        processedContent: content,
        action: 'flag-for-review',
        shouldBlock: false,
        warningMessage: ''
      };
    }
  }

  /**
   * Log moderation decision to the database for audit and review
   */
  private async logModerationDecision(
    contentId: string,
    contentType: 'post' | 'comment',
    authorId: string,
    originalContent: string,
    analysisResult: ContentAnalysisResult
  ): Promise<void> {
    // Structured console logging (Firebase removed - SQLITE-025)
    // TODO: Implement SQLite moderation_logs repository for persistent logging
    const logEntry = {
      contentId,
      contentType,
      authorId,
      originalContent: originalContent.substring(0, 100) + (originalContent.length > 100 ? '...' : ''),
      filteredContent: analysisResult.filteredContent?.substring(0, 100) + (analysisResult.filteredContent && analysisResult.filteredContent.length > 100 ? '...' : ''),
      violations: analysisResult.violations.map(v => `${v.type}(${v.severity})`).join(', '),
      action: analysisResult.suggestedAction,
      confidence: analysisResult.confidence,
      timestamp: new Date().toISOString(),
      reviewStatus: analysisResult.suggestedAction === 'flag-for-review' ? 'pending' : 'approved'
    };

    console.log(`📋 [ContentFilter] Moderation decision:`, JSON.stringify(logEntry, null, 2));
  }

  /**
   * Detect profanity in content
   */
  private detectProfanity(content: string): ViolationType | null {
    const lowerContent = content.toLowerCase();
    const matchedTerms: string[] = [];

    // Check Chinese profanity
    for (const term of this.profanityPatterns.chinese) {
      if (lowerContent.includes(term.toLowerCase())) {
        matchedTerms.push(term);
      }
    }

    // Check English profanity
    for (const term of this.profanityPatterns.english) {
      if (lowerContent.includes(term.toLowerCase())) {
        matchedTerms.push(term);
      }
    }

    if (matchedTerms.length > 0) {
      return {
        type: 'profanity',
        severity: matchedTerms.length > 2 ? 'high' : 'medium',
        details: `Inappropriate language detected: ${matchedTerms.length} violations`,
        matchedTerms
      };
    }

    return null;
  }

  /**
   * Detect spam patterns in content
   */
  private detectSpam(content: string): ViolationType | null {
    const matchedPatterns: string[] = [];

    for (const pattern of this.spamPatterns) {
      if (pattern.test(content)) {
        matchedPatterns.push(pattern.source);
      }
    }

    // Check for excessive repetition
    const words = content.split(/\s+/);
    const wordCount = new Map<string, number>();
    for (const word of words) {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    }

    // If any word appears more than 30% of the time, it's likely spam
    const totalWords = words.length;
    for (const [word, count] of wordCount) {
      if (count / totalWords > 0.3 && totalWords > 10) {
        matchedPatterns.push(`Excessive repetition: "${word}"`);
      }
    }

    if (matchedPatterns.length > 0) {
      return {
        type: 'spam',
        severity: matchedPatterns.length > 2 ? 'high' : 'medium',
        details: `Spam patterns detected: ${matchedPatterns.length} violations`,
        matchedTerms: matchedPatterns
      };
    }

    return null;
  }

  /**
   * Detect hate speech and harassment
   */
  private detectHateSpeech(content: string): ViolationType | null {
    const matchedPatterns: string[] = [];

    for (const pattern of this.hateSpeechPatterns) {
      if (pattern.test(content)) {
        matchedPatterns.push(pattern.source);
      }
    }

    if (matchedPatterns.length > 0) {
      return {
        type: 'hate-speech',
        severity: 'high',
        details: `Hate speech or harassment detected: ${matchedPatterns.length} violations`,
        matchedTerms: matchedPatterns
      };
    }

    return null;
  }

  /**
   * Detect personal information sharing
   */
  private detectPersonalInfo(content: string): ViolationType | null {
    const matchedInfo: string[] = [];

    for (const pattern of this.personalInfoPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        matchedInfo.push(...matches);
      }
    }

    if (matchedInfo.length > 0) {
      return {
        type: 'personal-info',
        severity: 'medium',
        details: `Personal information detected: ${matchedInfo.length} instances`,
        matchedTerms: matchedInfo
      };
    }

    return null;
  }

  /**
   * Mask profanity in content with asterisks
   */
  private maskProfanity(content: string): string {
    let maskedContent = content;

    // Mask Chinese profanity (sorted by length, longest first to avoid partial replacements)
    const sortedChineseProfanity = [...this.profanityPatterns.chinese].sort((a, b) => b.length - a.length);
    for (const term of sortedChineseProfanity) {
      const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      maskedContent = maskedContent.replace(regex, (match) => {
        // For very short terms, leave some characters visible
        if (match.length <= 2) {
          return match.charAt(0) + '*'.repeat(match.length - 1);
        }
        // For longer terms, mask most characters but leave first character
        return match.charAt(0) + '*'.repeat(Math.max(1, match.length - 1));
      });
    }

    // Mask English profanity (sorted by length, longest first to avoid partial replacements)
    const sortedEnglishProfanity = [...this.profanityPatterns.english].sort((a, b) => b.length - a.length);
    for (const term of sortedEnglishProfanity) {
      const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      maskedContent = maskedContent.replace(regex, (match) => {
        // For very short terms, leave some characters visible
        if (match.length <= 3) {
          return match.charAt(0) + '*'.repeat(match.length - 1);
        }
        // For longer terms, mask most characters but leave first character
        return match.charAt(0) + '*'.repeat(Math.max(2, match.length - 1));
      });
    }

    return maskedContent;
  }

  /**
   * Mask personal information in content
   */
  private maskPersonalInfo(content: string): string {
    let maskedContent = content;

    for (const pattern of this.personalInfoPatterns) {
      maskedContent = maskedContent.replace(pattern, '[個人資訊已隱藏]');
    }

    return maskedContent;
  }

  /**
   * Determine appropriate moderation action based on analysis results
   */
  private determineModerationAction(
    confidence: number, 
    violations: ViolationType[], 
    config: FilterConfiguration
  ): ModerationAction {
    // Block high-confidence violations
    if (confidence >= config.autoBlockThreshold) {
      return 'block';
    }

    // Hide medium-confidence violations
    if (confidence >= config.autoHideThreshold) {
      return 'hide';
    }

    // Check for specific violation types
    const hasHighSeverity = violations.some(v => v.severity === 'high');
    if (hasHighSeverity) {
      return 'hide';
    }

    const hasHateSpeech = violations.some(v => v.type === 'hate-speech');
    if (hasHateSpeech) {
      return 'block';
    }

    const hasSpam = violations.some(v => v.type === 'spam');
    if (hasSpam) {
      return confidence > 0.5 ? 'hide' : 'flag-for-review';
    }

    const hasProfanity = violations.some(v => v.type === 'profanity');
    if (hasProfanity) {
      return 'filter';
    }

    const hasPersonalInfo = violations.some(v => v.type === 'personal-info');
    if (hasPersonalInfo) {
      return 'filter';
    }

    // Flag for manual review if there are violations but not severe enough for automatic action
    if (violations.length > 0) {
      return 'flag-for-review';
    }

    return 'allow';
  }

  /**
   * Generate user-friendly warning message based on violations
   */
  private generateWarningMessage(violations: ViolationType[]): string {
    const messages: string[] = [];

    for (const violation of violations) {
      switch (violation.type) {
        case 'profanity':
          messages.push('您的內容包含不當用語，已自動過濾部分內容。');
          break;
        case 'hate-speech':
          messages.push('檢測到仇恨言論或騷擾內容，請保持友善的討論環境。');
          break;
        case 'spam':
          messages.push('您的內容可能包含垃圾信息或過度重複的內容。');
          break;
        case 'personal-info':
          messages.push('為保護隱私，已隱藏個人資訊內容。');
          break;
        case 'off-topic':
          messages.push('您的內容可能偏離主題討論。');
          break;
        case 'self-promotion':
          messages.push('請避免過度的自我宣傳內容。');
          break;
      }
    }

    return messages.join(' ');
  }

  /**
   * Get moderation statistics for admin dashboard
   */
  async getModerationStats(days: number = 7): Promise<{
    totalAnalyzed: number;
    violationsDetected: number;
    actionsTaken: { [key in ModerationAction]: number };
    violationTypes: { [key: string]: number };
  }> {
    // This would typically query the moderation logs collection
    // For now, returning a placeholder structure
    return {
      totalAnalyzed: 0,
      violationsDetected: 0,
      actionsTaken: {
        allow: 0,
        warn: 0,
        filter: 0,
        hide: 0,
        block: 0,
        'flag-for-review': 0
      },
      violationTypes: {}
    };
  }
}

// Export singleton instance
export const contentFilterService = new ContentFilterService();