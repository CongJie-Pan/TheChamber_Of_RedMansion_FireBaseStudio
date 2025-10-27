/**
 * @fileOverview Level Configuration for Red Mansion Cultivation Path
 *
 * This file defines the complete 8-level progression system based on
 * classical Chinese literary culture and Red Mansion (Dream of the Red Chamber) themes.
 *
 * Each level represents a stage in the user's learning journey:
 * - Cultural authenticity: Level titles based on classical Chinese roles
 * - Progressive difficulty: XP requirements increase non-linearly
 * - Meaningful rewards: Each level unlocks substantial new features
 * - Clear progression: Users understand what they're working towards
 *
 * Design philosophy:
 * - Levels 0-1: New users, basic orientation
 * - Levels 2-3: Regular learners, building habits
 * - Levels 4-5: Dedicated students, active community members
 * - Levels 6-7: Expert scholars, mentors to others
 */

import { UserLevel, LevelPermission } from '../types/user-level';

/**
 * Complete level configuration array
 * 8 levels from visitor (0) to grand master (7)
 *
 * XP Progression Formula (90 per level):
 * - Level 0: 0 XP (starting point)
 * - Level 1: 90 XP
 * - Level 2: 180 XP
 * - Level 3: 270 XP
 * - Level 4: 360 XP
 * - Level 5: 450 XP
 * - Level 6: 540 XP
 * - Level 7: 630 XP
 *
 * Estimated XP earning rate: 20-30 XP per day with normal engagement
 */
export const LEVELS_CONFIG: UserLevel[] = [
  // ==================== LEVEL 0: 賈府訪客 (Mansion Visitor) ====================
  {
    id: 0,
    title: '賈府訪客',
    titleEn: 'Mansion Visitor',
    description: '初來乍到,對紅樓夢充滿好奇。您剛踏入大觀園,還在熟悉這座文學殿堂的一磚一瓦。',
    requiredXP: 0,
    xpFromPrevious: 0,
    permissions: [
      LevelPermission.BASIC_READING,
      LevelPermission.SIMPLE_AI_QA,
    ],
    exclusiveContent: [
      '入門指南',              // Introduction guide
      '基礎人物介紹',          // Basic character introductions
    ],
    visualRewards: {
      avatarFrame: '訪客木框',                // Simple wooden frame
      titleColor: '#9CA3AF',                  // Gray-400
      exclusiveBadges: ['新來者徽章'],        // Newcomer badge
      profileEffects: [],
    },
    virtualResidence: '榮府外院',  // Outer courtyard of Rongguo Mansion
  },

  // ==================== LEVEL 1: 陪讀書僮 (Reading Companion) ====================
  {
    id: 1,
    title: '陪讀書僮',
    titleEn: 'Reading Companion',
    description: '熟悉了賈府的日常,開始跟隨主人公們的腳步。您已成為大觀園的一員,每日陪伴著寶玉等人學習成長。',
    // Adjusted per requirement: Level 1 threshold reduced to 90 XP
    requiredXP: 90,
    xpFromPrevious: 90,
    permissions: [
      LevelPermission.BASIC_READING,
      LevelPermission.SIMPLE_AI_QA,
      LevelPermission.DAILY_TASKS,
      LevelPermission.BASIC_ACHIEVEMENTS,
    ],
    exclusiveContent: [
      '每日任務系統',          // Daily task system
      '成就收集系統',          // Achievement collection
      '基礎人物檔案',          // Basic character profiles
    ],
    visualRewards: {
      avatarFrame: '書僮藍框',                // Blue wooden frame
      titleColor: '#3B82F6',                  // Blue-500
      exclusiveBadges: [
        '首週完成徽章',                       // First week completion
        '每日閱讀徽章',                       // Daily reading habit
      ],
      profileEffects: ['淡雅光芒'],          // Light sparkle effect
    },
    specialRequirements: [
      {
        type: 'chapters_read',
        description: '完成前5回閱讀',
        target: 5,
      },
      {
        type: 'quiz',
        description: '通過「賈府初印象」測驗',
        target: 'quiz-mansion-intro',
      },
    ],
    virtualResidence: '怡紅院',  // Yihong Courtyard (Baoyu's residence)
  },

  // ==================== LEVEL 2: 門第清客 (Guest Scholar) ====================
  {
    id: 2,
    title: '門第清客',
    titleEn: 'Guest Scholar',
    description: '受邀參與詩社雅集,開始品味紅樓詩詞之美。您不再是門外漢,已能與府中文人雅士共賞詩文。',
    requiredXP: 180,
    // With 90-per-level progression, each step is 90 XP
    xpFromPrevious: 90,
    permissions: [
      LevelPermission.BASIC_READING,
      LevelPermission.SIMPLE_AI_QA,
      LevelPermission.DAILY_TASKS,
      LevelPermission.BASIC_ACHIEVEMENTS,
      LevelPermission.POETRY_LISTENING,
      LevelPermission.EXPERT_READINGS_BASIC,
      LevelPermission.GARDEN_3D_VIEW,
    ],
    exclusiveContent: [
      '詩詞選集',              // Poetry anthology
      '專家導讀（基礎）',      // Basic expert readings
      '大觀園3D巡覽',         // 3D Grand View Garden
      '人物關係圖（基礎）',    // Basic relationship map
    ],
    visualRewards: {
      avatarFrame: '雅士玉框',                // Elegant jade frame
      titleColor: '#10B981',                  // Green-500
      exclusiveBadges: [
        '詩詞學徒徽章',                       // Poetry learner
        '大觀園探索者徽章',                   // Garden explorer
      ],
      profileEffects: ['中等光芒', '玉色光輝'],
    },
    specialRequirements: [
      {
        type: 'chapters_read',
        description: '完成前20回閱讀',
        target: 20,
      },
      {
        type: 'quiz',
        description: '通過「賈府人事關係」測驗',
        target: 'quiz-family-relationships',
      },
      {
        type: 'tasks_completed',
        description: '連續7天完成每日任務',
        target: 7,
      },
    ],
    virtualResidence: '瀟湘館',  // Xiaoxiang Lodge (Daiyu's residence)
  },

  // ==================== LEVEL 3: 庶務管事 (Estate Manager) ====================
  {
    id: 3,
    title: '庶務管事',
    titleEn: 'Estate Manager',
    description: '深入理解賈府興衰,開始參與社群管理。您已洞察紅樓世態,能夠幫助引導其他學習者。',
    requiredXP: 270,
    xpFromPrevious: 90,
    permissions: [
      LevelPermission.BASIC_READING,
      LevelPermission.SIMPLE_AI_QA,
      LevelPermission.DAILY_TASKS,
      LevelPermission.BASIC_ACHIEVEMENTS,
      LevelPermission.POETRY_LISTENING,
      LevelPermission.EXPERT_READINGS_BASIC,
      LevelPermission.GARDEN_3D_VIEW,
      LevelPermission.ADVANCED_AI_ANALYSIS,
      LevelPermission.CHARACTER_RELATIONSHIP_MAP,
    ],
    exclusiveContent: [
      '進階分析工具',          // Advanced AI analysis
      '人物心理分析',          // Character psychological analysis
      '歷史文化背景',          // Historical and cultural context
      '互動式人物關係圖',      // Interactive character map
    ],
    visualRewards: {
      avatarFrame: '管事金框',                // Gold-trimmed frame
      titleColor: '#F59E0B',                  // Amber-500
      exclusiveBadges: [
        '社群貢獻者徽章',                     // Community contributor
        '分析專家徽章',                       // Analysis specialist
      ],
      profileEffects: ['強烈光芒', '金色微光'],
    },
    specialRequirements: [
      {
        type: 'chapters_read',
        description: '完成前40回閱讀',
        target: 40,
      },
      {
        type: 'community_contribution',
        description: '在社群發表10篇有價值的討論',
        target: 10,
      },
    ],
    virtualResidence: '秋爽齋',  // Qiushuang Study (Xichun's art studio)
  },

  // ==================== LEVEL 4: 詩社雅士 (Poetry Society Scholar) ====================
  {
    id: 4,
    title: '詩社雅士',
    titleEn: 'Poetry Society Scholar',
    description: '詩詞造詣日深,常與眾人切磋文墨。您已是海棠詩社的重要成員,詩文為眾人所稱道。',
    requiredXP: 360,
    xpFromPrevious: 90,
    permissions: [
      LevelPermission.BASIC_READING,
      LevelPermission.SIMPLE_AI_QA,
      LevelPermission.DAILY_TASKS,
      LevelPermission.BASIC_ACHIEVEMENTS,
      LevelPermission.POETRY_LISTENING,
      LevelPermission.EXPERT_READINGS_BASIC,
      LevelPermission.GARDEN_3D_VIEW,
      LevelPermission.ADVANCED_AI_ANALYSIS,
      LevelPermission.CHARACTER_RELATIONSHIP_MAP,
      LevelPermission.POETRY_COMPETITION,
      LevelPermission.STUDY_GROUP_CREATE,
    ],
    exclusiveContent: [
      '詩詞競賽系統',          // Poetry competition system
      '學習小組',              // Create and join study groups
      '進階詩詞工具',          // Advanced poetry analysis
      '文化深度探索',          // Deep cultural exploration
    ],
    visualRewards: {
      avatarFrame: '詩社雅框',                // Artistic calligraphy frame
      titleColor: '#8B5CF6',                  // Violet-500
      exclusiveBadges: [
        '詩詞大師徽章',                       // Poetry mastery
        '學習小組組長徽章',                   // Study group creator
        '文化學者徽章',                       // Cultural expert
      ],
      profileEffects: ['璀璨光芒', '水墨特效', '飄落花瓣'],
    },
    specialRequirements: [
      {
        type: 'chapters_read',
        description: '完成前60回閱讀',
        target: 60,
      },
      {
        type: 'tasks_completed',
        description: '完成50個每日任務',
        target: 50,
      },
    ],
    virtualResidence: '櫳翠庵',  // Green Gauze Pavilion (Miaoyu's residence)
  },

  // ==================== LEVEL 5: 府中幕賓 (Mansion Counselor) ====================
  {
    id: 5,
    title: '府中幕賓',
    titleEn: 'Mansion Counselor',
    description: '學識淵博,為眾人所敬重。您已成為大觀園的文化導師,引領著眾多後來學習者。',
    requiredXP: 450,
    xpFromPrevious: 90,
    permissions: [
      LevelPermission.BASIC_READING,
      LevelPermission.SIMPLE_AI_QA,
      LevelPermission.DAILY_TASKS,
      LevelPermission.BASIC_ACHIEVEMENTS,
      LevelPermission.POETRY_LISTENING,
      LevelPermission.EXPERT_READINGS_BASIC,
      LevelPermission.EXPERT_READINGS_FULL,
      LevelPermission.GARDEN_3D_VIEW,
      LevelPermission.ADVANCED_AI_ANALYSIS,
      LevelPermission.CHARACTER_RELATIONSHIP_MAP,
      LevelPermission.POETRY_COMPETITION,
      LevelPermission.STUDY_GROUP_CREATE,
      LevelPermission.SPECIAL_TOPICS,
    ],
    exclusiveContent: [
      '專家導讀（完整版）',    // Full expert commentary
      '專題討論',              // Special topic discussions
      '導師系統',              // Mentor new users
      '專家講座',              // Expert webinar access
    ],
    visualRewards: {
      avatarFrame: '幕賓紫框',                // Imperial purple frame
      titleColor: '#EC4899',                  // Pink-500
      exclusiveBadges: [
        '導師徽章',                           // Mentor badge
        '專家學者徽章',                       // Expert scholar
        '特殊貢獻者徽章',                     // Special contributor
      ],
      profileEffects: ['耀眼光芒', '水墨特效', '流動綢緞', '燈籠輝光'],
    },
    specialRequirements: [
      {
        type: 'chapters_read',
        description: '完成前80回閱讀',
        target: 80,
      },
      {
        type: 'community_contribution',
        description: '幫助20位新用戶完成引導',
        target: 20,
      },
    ],
    virtualResidence: '稻香村',  // Daoxiang Village (Li Wan's residence)
  },

  // ==================== LEVEL 6: 紅學通儒 (Red Chamber Scholar) ====================
  {
    id: 6,
    title: '紅學通儒',
    titleEn: 'Red Chamber Scholar',
    description: '融會貫通紅樓精義,已成一家之言。您對紅樓夢的理解已臻化境,能夠發表獨到見解。',
    requiredXP: 540,
    xpFromPrevious: 90,
    permissions: [
      LevelPermission.BASIC_READING,
      LevelPermission.SIMPLE_AI_QA,
      LevelPermission.DAILY_TASKS,
      LevelPermission.BASIC_ACHIEVEMENTS,
      LevelPermission.POETRY_LISTENING,
      LevelPermission.EXPERT_READINGS_BASIC,
      LevelPermission.EXPERT_READINGS_FULL,
      LevelPermission.GARDEN_3D_VIEW,
      LevelPermission.ADVANCED_AI_ANALYSIS,
      LevelPermission.CHARACTER_RELATIONSHIP_MAP,
      LevelPermission.POETRY_COMPETITION,
      LevelPermission.STUDY_GROUP_CREATE,
      LevelPermission.SPECIAL_TOPICS,
      LevelPermission.MENTOR_ROLE,
      LevelPermission.RESEARCH_TOOLS,
      LevelPermission.ANNOTATION_PUBLISH,
    ],
    exclusiveContent: [
      '研究工具',              // Advanced research tools
      '註解發表系統',          // Publish scholarly annotations
      '專屬典藏',              // Historical archives
      '專家對話',              // Direct dialogue with experts
    ],
    visualRewards: {
      avatarFrame: '通儒玉印框',              // Scholarly jade seal frame
      titleColor: '#DC2626',                  // Red-600
      exclusiveBadges: [
        '紅學學者徽章',                       // Official scholar badge
        '研究大師徽章',                       // Research master
        '註解專家徽章',                       // Annotation expert
        '文化大使徽章',                       // Cultural ambassador
      ],
      profileEffects: ['壯麗光芒', '水墨特效', '流動綢緞', '玉色靈氣', '卷軸展開'],
    },
    specialRequirements: [
      {
        type: 'chapters_read',
        description: '完成全書120回閱讀',
        target: 120,
      },
      {
        type: 'tasks_completed',
        description: '發表至少5篇深度研究文章',
        target: 5,
      },
    ],
    virtualResidence: '櫳翠庵藏經閣',  // Scripture Pavilion at Longcui Nunnery
  },

  // ==================== LEVEL 7: 一代宗師 (Grand Master) ====================
  {
    id: 7,
    title: '一代宗師',
    titleEn: 'Grand Master',
    description: '紅學造詣登峰造極,為後學楷模。您已成為紅樓文化的傳承者,引領著整個學習社群的發展。',
    requiredXP: 630,
    xpFromPrevious: 90,
    permissions: [
      // Inherits all previous permissions
      ...Object.values(LevelPermission),
      LevelPermission.EXCLUSIVE_EVENTS,
    ],
    exclusiveContent: [
      '宗師典藏',              // Master-only archives
      '專屬活動',              // VIP cultural events
      '平台治理',              // Platform governance participation
      '傳世內容創作',          // Create legacy content
    ],
    visualRewards: {
      avatarFrame: '宗師金龍框',              // Imperial golden dragon frame
      titleColor: '#B45309',                  // Amber-700 (gold)
      exclusiveBadges: [
        '一代宗師徽章',                       // Grand Master badge
        '平台傳奇徽章',                       // Platform legend
        '文化守護者徽章',                     // Cultural guardian
        '終身成就徽章',                       // Lifetime achievement
      ],
      profileEffects: ['神聖光芒', '水墨特效', '流動綢緞', '玉色靈氣', '卷軸展開', '鳳凰羽翼', '金色聖光'],
    },
    specialRequirements: [
      {
        type: 'community_contribution',
        description: '對社群做出傑出貢獻',
        target: 100,
      },
      {
        type: 'tasks_completed',
        description: '持續活躍180天以上',
        target: 180,
      },
    ],
    virtualResidence: '大觀園總管',  // Grand View Garden Chief Administrator
  },
];

/**
 * Helper function to get level configuration by level ID
 * @param level - Level ID (0-7)
 * @returns UserLevel configuration or null if invalid
 */
export function getLevelConfig(level: number): UserLevel | null {
  if (level < 0 || level >= LEVELS_CONFIG.length) {
    return null;
  }
  return LEVELS_CONFIG[level];
}

/**
 * Helper function to get all permissions for a specific level (cumulative)
 * Includes all permissions from current and previous levels
 * @param level - Level ID (0-7)
 * @returns Array of all permissions available at this level
 */
export function getAllPermissionsForLevel(level: number): LevelPermission[] {
  const permissions = new Set<LevelPermission>();

  for (let i = 0; i <= level && i < LEVELS_CONFIG.length; i++) {
    LEVELS_CONFIG[i].permissions.forEach(p => permissions.add(p));
  }

  return Array.from(permissions);
}

/**
 * Helper function to calculate level from total XP
 * @param totalXP - Total XP amount
 * @returns Current level ID (0-7)
 */
export function calculateLevelFromXP(totalXP: number): number {
  for (let i = LEVELS_CONFIG.length - 1; i >= 0; i--) {
    if (totalXP >= LEVELS_CONFIG[i].requiredXP) {
      return i;
    }
  }
  return 0; // Default to level 0
}

/**
 * Helper function to calculate XP progress within current level
 * @param totalXP - Total XP amount
 * @returns Object with current level, current XP, and XP to next level
 */
export function calculateXPProgress(totalXP: number): {
  currentLevel: number;
  currentXP: number;
  nextLevelXP: number;
  xpToNextLevel: number;
  progressPercentage: number;
} {
  const currentLevel = calculateLevelFromXP(totalXP);
  const currentLevelConfig = LEVELS_CONFIG[currentLevel];
  const nextLevelConfig = LEVELS_CONFIG[currentLevel + 1];

  if (!nextLevelConfig) {
    // Max level reached
    return {
      currentLevel,
      currentXP: totalXP - currentLevelConfig.requiredXP,
      nextLevelXP: 0,
      xpToNextLevel: 0,
      progressPercentage: 100,
    };
  }

  const currentXP = totalXP - currentLevelConfig.requiredXP;
  const nextLevelXP = nextLevelConfig.requiredXP - currentLevelConfig.requiredXP;
  const xpToNextLevel = nextLevelConfig.requiredXP - totalXP;
  const progressPercentage = (currentXP / nextLevelXP) * 100;

  return {
    currentLevel,
    currentXP,
    nextLevelXP,
    xpToNextLevel,
    progressPercentage: Math.min(progressPercentage, 100),
  };
}

/**
 * Constant for maximum level
 */
export const MAX_LEVEL = LEVELS_CONFIG.length - 1;

/**
 * Constant for maximum XP (Level 7 requirement)
 */
export const MAX_XP = LEVELS_CONFIG[MAX_LEVEL].requiredXP;
