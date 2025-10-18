export type Language = 'zh-TW' | 'zh-CN' | 'en-US';

export const LANGUAGES: { code: Language; name: string }[] = [
  { code: 'zh-TW', name: '繁體中文' },
  { code: 'zh-CN', name: '简体中文' },
  { code: 'en-US', name: 'English (US)' },
];

export const DEFAULT_LANGUAGE: Language = 'zh-TW';

interface Translations {
  [key: string]: any; // Allows for nested structure
}

// Placeholder transformation function
export function transformTextForLang(text: string | undefined, lang: Language, type: 'original' | 'vernacular' | 'annotation'): string {
  if (!text) return "";
  if (lang === 'zh-CN') {
    // Basic placeholder for TW -> SC conversion
    return text
      .replace(/臺/g, '台')
      .replace(/裡/g, '里')
      .replace(/蘋/g, '苹')
      .replace(/纔/g, '才')
      .replace(/眾/g, '众')
      .replace(/夢/g, '梦')
      .replace(/寧/g, '宁')
      .replace(/寶/g, '宝')
      .replace(/釵/g, '钗')
      .replace(/黛/g, '黛')
      .replace(/襲/g, '袭')
      .replace(/鳳/g, '凤')
      .replace(/風/g, '风')
      .replace(/塵/g, '尘')
      .replace(/懷/g, '怀')
      .replace(/閨/g, '闺')
      .replace(/識/g, '识')
      .replace(/靈/g, '灵')
      .replace(/頑/g, '顽')
      .replace(/無/g, '无')
      .replace(/選/g, '选')
      .replace(/塊/g, '块')
      .replace(/煉/g, '炼')
      .replace(/媧/g, '娲')
      .replace(/補/g, '补')
      .replace(/員/g, '员')
      .replace(/僅/g, '仅')
      .replace(/劉/g, '刘')
      .replace(/姥/g, '姥')
      .replace(/進/g, '进')
      .replace(/觀/g, '观')
      .replace(/園/g, '园')
      .replace(/圓/g, '圆')
      .replace(/鍾/g, '钟')
      .replace(/應/g, '应')
      .replace(/嘆/g, '叹')
      .replace(/見/g, '见')
      .replace(/說/g, '说')
      .replace(/聽/g, '听')
      .replace(/聯/g, '联')
      .replace(/聰/g, '聪')
      .replace(/遊/g, '游')
      .replace(/鬱/g, '郁')
      .replace(/點/g, '点')
      .replace(/癡/g, '痴')
      .replace(/隨/g, '随')
      .replace(/隱/g, '隐')
      .replace(/義/g, '义')
      .replace(/術/g, '术')
      .replace(/葉/g, '叶')
      .replace(/搗/g, '捣')
      .replace(/畫/g, '画')
      .replace(/詩/g, '诗')
      .replace(/詞/g, '词')
      .replace(/賞/g, '赏')
      .replace(/析/g, '析')
      .replace(/評/g, '评')
      .replace(/註/g, '注')
      .replace(/釋/g, '释')
      .replace(/論/g, '论')
      .replace(/講/g, '讲')
      .replace(/細/g, '细')
      .replace(/課/g, '课')
      .replace(/庫/g, '库')
      .replace(/歷/g, '历')
      .replace(/範/g, '范')
      .replace(/圍/g, '围')
      .replace(/歸/g, '归')
      .replace(/傑/g, '杰')
      .replace(/處/g, '处')
      .replace(/總/g, '总')
      .replace(/響/g, '响')
      .replace(/興/g, '兴')
      .replace(/趣/g, '趣')
      .replace(/賈/g, '贾')
      .replace(/雨/g, '雨')
      .replace(/村/g, '村')
      .replace(/甄/g, '甄')
      .replace(/士/g, '士')
      .replace(/隱/g, '隐')
      .replace(/畢/g, '毕')
      .replace(/畢竟/g, '毕竟')
      .replace(/叢/g, '丛')
      .replace(/書/g, '书')
      .replace(/孫/g, '孙')
      .replace(/兒/g, '儿')
      .replace(/號/g, '号')
      .replace(/畢/g, '毕')
      .replace(/叢/g, '丛')
      .replace(/書/g, '书')
      .replace(/孫/g, '孙')
      .replace(/兒/g, '儿')
      .replace(/號/g, '号')
      .replace(/卻/g, '却')
      .replace(/開卷/g, '开卷')
      .replace(/罷/g, '罢')
      .replace(/師/g, '师')
      .replace(/蹤/g, '踪')
      .replace(/跡/g, '迹')
      .replace(/階/g, '阶')
      .replace(/齣/g, '出')
      .replace(/壞/g, '坏')
      .replace(/災/g, '灾')
      .replace(/鄉/g, '乡')
      .replace(/遊/g, '游')
      .replace(/蹤/g, '踪')
      .replace(/跡/g, '迹')
      .replace(/階/g, '阶')
      .replace(/齣/g, '出')
      .replace(/壞/g, '坏')
      .replace(/災/g, '灾')
      .replace(/鄉/g, '乡')
      .replace(/遊/g, '游')
      .replace(/蹤/g, '踪')
      .replace(/跡/g, '迹')
      .replace(/階/g, '阶')
      .replace(/齣/g, '出')
      .replace(/壞/g, '坏')
      .replace(/災/g, '灾')
      .replace(/鄉/g, '乡')
      .replace(/遊/g, '游');
  } else if (lang === 'en-US') {
    // Placeholder: In a real app, use a proper translation service or library.
    // This is just to show structure and that transformation happens.
    const textStart = text.substring(0, 50);
    if (type === 'original') return `[EN] ${textStart}... (Full original text translation pending)`;
    if (type === 'vernacular') return `[EN Vernacular] ${textStart}... (Full vernacular translation pending)`;
    if (type === 'annotation') return `[EN Annotation] ${textStart}... (Full annotation translation pending)`;
  }
  return text; // Default to zh-TW or original text
}

export const translations: Record<Language, Translations> = {
  'zh-TW': {
    // Global
    appName: '紅樓慧讀',
    // Toast notification titles
    筆記儲存: '筆記儲存',
    筆記更新: '筆記更新',
    筆記刪除: '筆記刪除',

    buttons: {
      startLearning: '開始學習',
      learnMore: '了解更多',
      registerFree: '免費註冊',
      next: '下一步',
      previous: '上一步',
      submit: '送出',
      save: '保存',
      cancel: '取消',
      close: '關閉',
      login: '登入',
      logout: '登出',
      share: '分享',
      viewDetails: '查看詳情',
      continueEffort: '繼續努力',
      startGoal: '開始目標',
      edit: '編輯',
      post: '發佈',
      posting: '發文中...',
      submitComment: '送出評論',
      add: '新增',
      retry: '重試',
      delete: '刪除',
      deleteNote: '刪除筆記',
      submittingComment: '提交中...',
      read: '閱讀',
      return: '返回',
      settings: '設定',
      singleColumn: '單欄',
      doubleColumn: '雙欄',
      tripleColumn: '三欄',
      hideVernacular: '隱藏白話',
      showVernacular: '顯示白話',
      knowledgeGraph: '圖譜',
      toc: '目錄',
      search: '搜尋',
      fullscreen: '全螢幕',
      exitFullscreen: '退出',
      writeNote: '寫筆記',
      highlight: '劃線',
      listenCurrent: '聽當前',
      copy: '複製',
      askAI: '問 AI',
      ai: 'AI',
      copiedToClipboard: '選取內容已複製到剪貼簿。',
      copyFailed: '無法複製內容到剪貼簿。',
      featureComingSoon: '功能尚未實現。',
      aiThinking: 'AI 思考中...',
      aiReply: 'AI 回答：',
      askAnotherQuestion: '再問一題',
      saveNote: '保存筆記',
      noteSaved: '您的筆記已成功保存',
      noteUpdated: '您的筆記已更新',
      noteDeleted: '筆記已刪除',
      clearSearch: '清除搜尋',
      readAloud: '朗讀',
    },
    placeholders: {
      searchPosts: '搜索發文內容、作者或標籤...',
      yourQuestion: '請輸入您想問的問題...',
      yourNote: '在此輸入您的筆記...',
      emailExample: 'm@example.com',
      selectAnOption: '請選擇一個選項',
      searchInBook: '輸入搜尋詞...',
      writeYourComment: '寫下您的評論...',
      postContent: '發文內容...',
    },
    labels: {
      theme: '主題',
      text: '文字',
      currentFontSize: '當前字號',
      fontHint: '支援快速鍵 Ctrl + Alt + "+" 放大字號, Ctrl + Alt + "+" 縮小字號',
      selectedContent: '選取內容:',
      yourNote: '您的筆記:',
      yourQuestion: '您的問題：',
      themes: {
        white: '白色',
        yellow: '黃色',
        green: '護眼',
        night: '夜間',
      },
      fonts: {
        notoSerifSC: '思源宋體',
        system: '系統字體',
        kai: '楷體',
        hei: '粗黑體',
      },
    },
    page: {
      navHome: '主頁',
      navFeatures: '特色',
      navSolutions: '主要功能',
      heroTitlePart1: '智能引航，重煥',
      heroTitleHighlight: '紅樓',
      heroTitlePart2: '之夢',
      heroSubtitle: '深入探索《紅樓夢》的宏大世界。借助 AI 賦能的文本分析、學習狀況洞察與深度研究工具，開啟您的智慧閱讀之旅。',
      challengesTitle: '經典閱讀的挑戰',
      challengesSubtitle: '《紅樓夢》雖為不朽巨著，然其深奧的文化內涵與複雜的人物脈絡，常使現代讀者望而卻步。',
      painPoint1Title: '學習動力難持續',
      painPoint1Desc: '超過七成讀者曾在閱讀古典文學時中途放棄，因缺乏持續動力與成就感。面對傳統線性閱讀，易感孤獨無助。',
      painPoint2Title: '理解門檻高遠',
      painPoint2Desc: '近半數讀者反映《紅樓夢》人物關係複雜、文化背景艱澀難懂。理解劉姥姥進大觀園、寶黛釵情感糾葛等，如同攀登文化高峰。',
      painPoint3Title: '專業資源難整合',
      painPoint3Desc: '權威解讀與學術資源雖多，但分布零散，無法在閱讀當下即時輔助，也缺乏系統化學習指導，難建清晰理解框架。',
      solutionsTitle: '紅樓慧讀：智能方案',
      solutionsSubtitle: '我們運用 AI 技術，打造互動化、個性化的學習體驗，助您輕鬆跨越閱讀障碍，領略經典魅力。',
      solution1Title: '點燃持續動力',
      solution1Desc: '採用遊戲化學習設計，將閱讀化為任務。透過成就徽章、進度追蹤、個性化目標与即時回饋，打造闖關般的愉悅體驗。',
      solution2Title: 'AI 降低理解門檻',
      solution2Desc: '整合先進語言模型與紅學知識庫。提供上下文詞義解析、文化背景補充、互動人物圖譜、選字即問及AI音韻朗讀，全面提升理解。',
      solution3Title: 'AI 整合專業內容',
      solution3Desc: '彙整名家學者解讀（如白先勇、蔣勳）為訓練資料，建立「章節對應專家觀點」機制，讓您即時參照權威見解，深化理解。',
      ctaTitle: '準備好開啟您的紅樓之旅了嗎？',
      ctaSubtitle: '立即註冊，體驗 AI 時代的古典文學學習新範式。',
      footerSlogan: 'AI 賦能，重探紅樓之夢。您的智能《紅樓夢》學習夥伴。',
      footerRights: '© 2024 紅樓慧讀團隊. All Rights Reserved.',
    },
    appShell: {
      userAccount: '我的帳戶',
      settings: '設置 (待開發)',
    },
    sidebar: {
      home: '首頁',
      read: '閱讀',
      dailyTasks: '每日修身',
      achievements: '成就與目標',
      community: '紅學社',
    },
    login: {
      welcomeBack: '歡迎回來',
      pageDescription: '登入以繼續您的紅樓慧讀之旅',
      emailLabel: '電子郵件',
      passwordLabel: '密碼',
      errorTitle: '登入錯誤',
      errorInvalidCredential: '電子郵件或密碼不正確。',
      errorDefault: '登入失敗，請稍後再試。',
      noAccount: '還沒有帳戶?',
      registerNow: '立即註冊',
      loggingIn: '登入中...',
      orContinueWith: '或使用以下方式登入',
      errorGoogleSignIn: 'Google 登入失敗，請稍後再試',
      errorPopupClosed: '登入視窗已關閉',
      errorPopupBlocked: '登入視窗被阻擋，請允許彈窗',
      errorCancelled: '登入已取消',
      errorNetwork: '網絡連接錯誤，請檢查網絡',
      errorTooManyRequests: '登入嘗試次數過多，請稍後再試',
      guestLogin: '訪客登入',
    },
    register: {
      joinApp: '加入紅樓慧讀',
      step1Description: '創建您的帳戶，開啟智能閱讀新體驗',
      step2Description: '告訴我們更多關於您的學習背景',
      step3Description: '分享您對《紅樓夢》的閱讀興趣',
      step4Description: '設定您的學習目標',
      firstNameLabel: '請輸入姓氏',
      firstNamePlaceholder: '姓氏',
      lastNameLabel: '請輸入名字',
      lastNamePlaceholder: '名字',
      emailLabel: '電子郵件',
      passwordLabel: '密碼 (至少6位)',
      learningBackgroundLabel: '您的古典文學基礎？ (選填)',
      learningBackgroundPlaceholder: '請選擇您的古典文學背景',
      bgOptionBeginner: '初次接觸',
      bgOptionIntermediate: '略有涉獵',
      bgOptionAdvanced: '曾修讀相關課程',
      bgOptionExpert: '深入研究',
      readingInterestsLabel: '您對《紅樓夢》的哪些方面最感興趣？ (選填)',
      readingInterestsPlaceholder: '例如：人物關係、詩詞賞析、歷史文化背景...',
      learningGoalsLabel: '您希望透過本平台達成什麼學習目標？ (選填)',
      learningGoalsPlaceholder: '例如：完整閱讀一遍、理解主要人物、完成所有判詞筆記...',
      errorTitle: '註冊錯誤',
      checkingEmail: '檢查電子郵件...',
      errorEmailInUse: '此電子郵件地址已被註冊。',
      errorEmailExistsMultipleProviders: '此電子郵件已註冊並連結了多個登入方式。請前往登入頁面使用現有帳戶登入。',
      errorEmailExistsGoogleOnly: '此電子郵件已透過 Google 帳戶註冊。請使用 Google 登入，或前往登入頁面。',
      errorEmailExistsEmailOnly: '此電子郵件已註冊。請前往登入頁面使用現有帳戶登入。',
      errorEmailExistsOtherProvider: '此電子郵件已透過其他方式註冊。請前往登入頁面使用現有帳戶登入。',
      errorEmailCheckFailed: '檢查電子郵件時發生錯誤，請稍後再試。',
      errorWeakPassword: '密碼太弱，請使用更強的密碼。',
      errorConfigNotFound: 'Firebase 驗證設定未找到。請確認您的 .env 文件中的 Firebase 專案ID是否正確，並在 Firebase 控制台中啟用了 Email/Password 登入方式。',
      errorInvalidApiKey: 'Firebase API 金鑰無效。請檢查您的 .env 文件中的 Firebase 配置是否正確。',
      errorDefault: '註冊失敗，請稍後再試。錯誤碼：',
      alreadyHaveAccount: '已經有帳戶了?',
      creatingAccount: '創建中...',
      createAndStart: '創建帳戶並開始學習',
      errors: {
        firstNameRequired: '姓氏不能為空',
        lastNameRequired: '名字不能為空',
        emailInvalid: '請輸入有效的電子郵件地址',
        passwordMinLength: '密碼長度至少為6位',
        generic: '發生錯誤，請稍後再試。',
      }
    },
    dashboard: {
      learningOverview: '學習總覽',
      chaptersCompleted: '章',
      avgUnderstanding: '平均理解度',
      totalLearningTime: '總學習時長',
      notesCount: '筆記數量',
      goalsAchieved: '已達目標',
      recentReading: '最近閱讀活動',
      recentReadingDesc: '快速返回您上次閱讀的書籍，或回顧最近的學習內容。',
      myLearningGoals: '我的學習目標 (示例)',
      myLearningGoalsDesc: '追蹤您的個人學習目標，保持學習動力。',
      manageAllGoals: '管理所有目標',
      continueReading: '繼續閱讀',
    },
    read: {
      myShelf: '我的書架',
      tabRecent: '最近學習',
      tabOriginals: '紅樓夢原文',
      tabInterpretations: '專家解讀',
      btnAll: '全部',
      btnProgress: '進度',
      btnCategory: '分類',
      recentLearningPlaceholder: '最近學習記錄將顯示於此。',
      badgeEbook: '電子書',
      badgeExpert: '專家解讀',
    },
    achievements: {
      title: '我的成就與目標',
      description: '追蹤您的學習成果，設定新目標，迎接挑戰，不斷進步。',
      myAchievements: '我獲得的成就',
      myAchievementsDesc: '記錄您在紅樓慧讀旅程中達成的每一個里程碑。',
      noAchievements: '您目前尚未獲得任何成就，繼續努力吧！',
      learningStats: '學習進度總覽',
      learningStatsDesc: '全面了解您的學習投入與成果。',
      totalReadingTime: '總閱讀時長',
      chaptersCompletedFull: '已完成章回',
      notesTaken: '筆記數量',
      currentStreak: '連續學習',
      overallProgress: '整體閱讀進度',
      chaptersUnit: '章回',
      viewDetailedAnalysis: '查看詳細學習分析',
      nextGoals: '下一步目標',
      nextGoalsDesc: '系統為您推薦或您正在進行的目標。',
      setNewGoals: '設定新的學習目標',
      setNewGoalsDesc: '根據您的偏好，設定個人化的學習計畫。',
      goalDailyReadingTime: '每日閱讀時間',
      goalDailyReadingTimeDesc: '設定每天的閱讀時長',
      goalChapterCompletion: '章回完成目標',
      goalChapterCompletionDesc: '設定要完成的章回數量',
      goalStreak: '連續學習天數',
      goalStreakDesc: '挑戰連續學習的紀錄',
      goalAccuracy: '閱讀正確率',
      goalAccuracyDesc: '提升對內容的理解準確度',
      challenges: '學習挑戰賽',
      challengesDesc: '參與社群挑戰，與其他讀者一同進步，贏取獎勵。',
      tabDaily: '每日挑戰',
      tabWeekly: '週間挑戰',
      tabSpecial: '特別活動',
      noDailyChallenges: '今日暫無挑戰。',
      noWeeklyChallenges: '本週暫無挑戰。',
      noSpecialChallenges: '目前尚無特別活動。',
      challengeInProgress: '進行中',
      joinChallenge: '參與挑戰',
      viewActivity: '查看活動',
      rewardPrefix: '獎勵：',

      // Achievement unlocked notifications
      achievementUnlocked: '成就達成',
      firstAIQuestion: {
        name: '心有疑，隨札記',
        description: '首次使用 AI 問答功能',
      },
    },
    // User profile and authentication translations
    user: {
      notLoggedIn: '尚未登入',
      userId: '用戶ID',
      guest: '訪客',
      anonymous: '匿名用戶',
      redMansionGuest: '紅樓訪客',
      profile: '個人資料',
      settings: '設定',
    },
    auth: {
      providerGoogle: '谷歌登入',
      providerEmail: '電子郵件',
    },
    // Level system translations
    level: {
      current: '當前等級',
      nextLevel: '下一級',
      progress: '等級進度',
      xpRequired: '所需經驗值',
      currentXP: '當前經驗值',
      xpToNextLevel: '升級還需',
      permissions: '權限',
      unlockedContent: '已解鎖內容',
      exclusiveRewards: '專屬獎勵',
      virtualResidence: '虛擬居所',
      levelUp: '升級！',
      xpToGo: '經驗值',
      congratulations: '恭喜',
      reachedLevel: '您已達到',
      newPermissionsUnlocked: '新權限已解鎖',
      newContentUnlocked: '新內容已解鎖',
      keepLearning: '繼續學習',
      // Level titles (matching levels-config.ts)
      level_0: '賈府訪客',
      level_1: '陪讀書僮',
      level_2: '門第清客',
      level_3: '庶務管事',
      level_4: '詩社雅士',
      level_5: '府中幕賓',
      level_6: '紅學通儒',
      level_7: '一代宗師',
      // English level titles for badges
      level_0_en: 'Mansion Visitor',
      level_1_en: 'Companion Scholar',
      level_2_en: 'Distinguished Guest',
      level_3_en: 'Estate Manager',
      level_4_en: 'Poetry Society Member',
      level_5_en: 'Manor Advisor',
      level_6_en: 'Redology Scholar',
      level_7_en: 'Grand Master',
      // Permission names
      permissionNames: {
        basic_reading: '基本閱讀',
        simple_ai_qa: '簡單 AI 問答',
        daily_tasks: '每日任務',
        basic_achievements: '基礎成就',
        poetry_listening: '詩詞鑑賞',
        expert_readings_basic: '專家解讀（基礎）',
        expert_readings_full: '專家解讀（完整）',
        garden_3d_view: '大觀園 3D 瀏覽',
        advanced_ai_analysis: '進階 AI 分析',
        character_relationship_map: '人物關係圖譜',
        poetry_competition: '詩詞比賽',
        study_group_create: '創建讀書會',
        special_topics: '專題討論',
        mentor_role: '導師角色',
        research_tools: '研究工具',
        annotation_publish: '註解發布',
        exclusive_events: '專屬活動',
      },
      // Exclusive content names
      exclusiveContentNames: {
        intro_guide: '新手指南',
        character_intro_basic: '基礎人物介紹',
        daily_tasks_unlock: '每日任務系統',
        achievement_system: '成就收集系統',
        character_profiles_basic: '基礎人物檔案',
        poetry_collection: '詩詞集錦',
        expert_commentary_basic: '基礎專家評論',
        garden_3d_tour: '大觀園 3D 導覽',
        character_relationships_basic: '基礎人物關係圖',
        advanced_analysis_tools: '進階分析工具',
        character_psychology: '人物心理分析',
        historical_context: '歷史文化脈絡',
        interactive_relationship_map: '互動式人物關係圖',
        poetry_competitions: '詩詞競賽系統',
        study_groups: '讀書會功能',
        advanced_poetry_tools: '進階詩詞分析',
        cultural_deep_dive: '文化深度探索',
        expert_commentary_full: '完整專家評論',
        special_topics: '專題討論區',
        mentor_system: '新手導師系統',
        exclusive_webinars: '專家線上講座',
        research_tools: '進階研究工具',
        annotation_system: '學術註解發布',
        exclusive_archives: '專屬歷史檔案',
        expert_dialogue: '專家直接對話',
        master_archives: '宗師專屬檔案',
        exclusive_events: 'VIP 文化活動',
        platform_governance: '平台治理參與',
        legacy_content: '傳承內容創作',
      },
    },
    community: {
      title: '紅學社',
      description: '用戶交流、分享心得的園地。暢所欲言，共同探討《紅樓夢》的無窮魅力。',
      writeNewPost: '撰寫新帖',
      characterCount: '字',
      noMatchingPosts: '暫無匹配發文',
      noPostsYet: '這裡還沒有發文，快來發表第一篇吧！',
      errorSearchNoResults: '未找到與您的搜索詞相關的發文。',
      newPostPlaceholder: '撰寫新帖 功能示意',
      commentLabel: '發表評論',
      anonymousUser: '匿名用戶',
      placeholderInitialCommentAuthor1: "林黛玉",
      placeholderInitialCommentText1: "寶玉哥哥此番見解深刻，晴雯判詞確令人心傷。一句「霽月難逢，彩雲易散」，道盡了她的不幸與淒涼。",
      placeholderInitialCommentAuthor2: "薛寶釵",
      placeholderInitialCommentText2: "襲人判詞中「枉自溫柔和順，空雲似桂如蘭」，也頗耐人尋味。書中人物命運多舛，實是紅樓一夢，令人不勝唏噓。",
      placeholderInitialCommentAuthor3: "王熙鳳",
      placeholderInitialCommentText3: "雨村先生所言甚是。若論及排場與吃穿用度，我們賈府的確是冠絕一時。便是尋常一道茶點，也有無數講究呢。",
      postTagNew: '新帖',
      showMore: '更多',
      showLess: '收起',
      discussions: '討論',
    },
    readBook: {
      knowledgeGraphSheetTitle: '章回知識圖譜',
      knowledgeGraphSheetDesc: '呈現本章回主要概念之間的關聯。(此為模擬圖，實際圖譜會基於文本動態生成)',
      tocSheetTitle: '目錄',
      tocSheetDesc: '選擇章回以快速跳轉。',
      noteSheetTitle: '撰寫筆記',
      noteSheetDesc: '針對您選取的內容記錄您的想法。',
      aiSheetTitle: '問 AI',
      aiSheetDesc: '針對選取的文本提出您的疑問。',
      annotationAbbr: '註',
      vernacularPrefix: '（白話文）',
      noContentSelected: '尚未選取文字',
      errorAIExplain: '向 AI 提問時發生錯誤。',
      errorAIMissingOutput: 'AI模型未能生成有效的文本解釋。',
      errorAIContextAnalysis: 'AI模型未能生成有效的文本脈絡分析。',
    },
    notes: {
      dashboard: '筆記儀表板',
      dashboardDesc: '管理並檢視您的所有閱讀筆記',
      totalNotes: '總筆記數',
      chaptersCovered: '涵蓋章回',
      totalWords: '總字數',
      publicNotes: '公開筆記',
      shareToPublic: '分享至公開',
      yourNote: '您的筆記',
      enterNote: '在此輸入您的筆記...',
      tags: '標籤',
      addTag: '新增標籤',
      chapter: '章回',
      public: '公開',
      words: '字',
      searchPlaceholder: '搜尋筆記...',
      allChapters: '所有章回',
      allTime: '全部時間',
      last7Days: '最近 7 天',
      last30Days: '最近 30 天',
      last90Days: '最近 90 天',
      sortBy: '排序方式',
      newest: '最新',
      oldest: '最舊',
      byChapter: '依章回',
      byWordCount: '依字數',
      clearFilters: '清除篩選',
      filterByTags: '依標籤篩選',
      activeTags: '已選標籤',
      showing: '顯示',
      of: '共',
      notes: '筆記',
      noNotes: '尚無筆記',
      noNotesDesc: '您還沒有撰寫任何筆記。開始閱讀並記錄您的想法吧！',
      startReading: '開始閱讀',
      noMatchingNotes: '無符合的筆記',
      noMatchingNotesDesc: '未找到符合您篩選條件的筆記。請嘗試調整篩選條件。',
      deleteSuccess: '筆記已刪除',
      deleteSuccessDesc: '您的筆記已成功刪除。',
      deleteError: '刪除失敗',
      updateSuccess: '筆記已更新',
      updateSuccessDesc: '您的筆記已成功更新。',
      updateError: '更新失敗',
      madePublic: '已設為公開',
      madePublicDesc: '您的筆記現在對所有使用者可見。',
      madePrivate: '已設為私人',
      madePrivateDesc: '您的筆記現在僅您可見。',
      visibilityError: '變更可見性失敗',
      tagsUpdated: '標籤已更新',
      tagsUpdatedDesc: '您的筆記標籤已成功更新。',
      tagsError: '更新標籤失敗',
      fetchError: '載入筆記失敗',
      fetchPublicError: '載入公開筆記失敗',
      loginRequired: '需要登入',
      loginRequiredDesc: '請登入以檢視和管理您的筆記。',
      publicNotesDesc: '探索其他讀者分享的公開筆記',
      noPublicNotes: '尚無公開筆記',
      noPublicNotesDesc: '目前沒有公開的筆記。成為第一個分享您見解的人！',
      searchPublicNotes: '搜尋公開筆記...',
      allTags: '所有標籤',
      confirmDelete: '確認刪除',
    },
    pagination: {
      previous: '上一頁',
      next: '下一頁',
      page: '第',
      of: '頁，共',
    },
    // Book shelf translations
    bookShelf: {
      hlmtimesedition: {
        title: '紅樓夢上中下三冊',
        author: '時報出版',
        description: '時報出版發行的《紅樓夢》全集，分為上、中、下三冊。',
      },
      hlmv3: {
        title: '紅樓夢 (第三版)',
        author: '[清] 曹雪芹',
        description: '以寶黛愛情悲劇為主線，展現清代貴族生活畫卷。',
      },
      hlmchengjia: {
        title: '紅樓夢 (程甲本影印)',
        author: '[清] 曹雪芹 高鶚',
        description: '清代程偉元、高鶚整理的《紅樓夢》早期印本之一。',
      },
      hlmgengchen: {
        title: '紅樓夢 (庚辰本校注)',
        author: '[清] 曹雪芹 著；俞平伯 校注',
        description: '以庚辰本為底本，參校各脂本，進行詳細校勘與註釋。',
      },
      hlmzhiyan: {
        title: '脂硯齋重評石頭記 (校訂本)',
        author: '[清] 曹雪芹；脂硯齋 評',
        description: '彙集了帶有脂硯齋等人大量批語的早期抄本。',
      },
      hlmmenggao: {
        title: '紅樓夢 (夢稿本整理版)',
        author: '[清] 曹雪芹',
        description: '根據「夢稿本」整理排印，保留早期稿本特色。',
      },
      hlmanniversary: {
        title: '紅樓夢 (百年紀念版)',
        author: '[清] 曹雪芹',
        description: '紀念《紅樓夢》研究百年，匯集名家點評的珍藏版本。',
      },
      jiangxunyouth: {
        title: '蔣勳說紅樓夢青春版',
        author: '蔣勳',
        description: '除了文字之外，附加了很多的圖，閱讀的易讀性增加了許多。詳細講解每一回，並且排版很舒服。文筆柔和，內容也沒有多大門檻、生活化，適合青少年讀。',
      },
      jiangxundream: {
        title: '蔣勳 夢紅樓',
        author: '蔣勳',
        description: '為入門的紅樓夢書籍 可以作為讀紅樓夢之前的概觀 不用太多的專業知識也能讀懂 和生活連結性強。',
      },
      jiangxunmicrodust: {
        title: '蔣勳 微塵眾',
        author: '蔣勳',
        description: '也是入門的紅樓夢書籍 一一介紹了紅樓夢的各個人物',
      },
      baixianyongdetailed: {
        title: '白先勇細說紅樓夢',
        author: '白先勇',
        description: '也詳細講了每一回，和蔣勳老師不同之處在於生活的部分少了很多。詳細講的全面、深入，較為深思型的，有另一个不一样的视角。需要一点中国文学的背景知识。书中有文字也有图。',
      },
      oulijuansixviews: {
        title: '歐麗娟 六觀紅樓(綜論卷)、紅樓夢公開課',
        author: '歐麗娟',
        description: '歐麗娟老師的適合讀完紅樓夢整本，以及對紅樓夢有較整體認識來讀的，並且學術性較多，多為專題式的研究。',
      },
      dongmeithorough: {
        title: '董梅講透紅樓夢',
        author: '董梅',
        description: '介於生活和學術之間，需要的閱讀能力有點在白先勇的前面一些，門檻沒有很高。但是為主題式的說明，從各個角度，例如生活美學、文學傑作、生活符號綜合來了解紅樓夢。',
      },
    },
    // Chapter content translations (titles and summaries)
    chapterContent: {
      ch1: {
        title: '第一回 甄士隱夢幻識通靈 賈雨村風塵懷閨秀',
        subtitle: '紅樓夢:第三版(中國古典文學讀本叢書)',
        summary: '本回主要講述了甄士隱夢遇一僧一道談論石頭下凡歷劫，以及賈雨村的落魄與發跡。甄士隱因女兒英蓮被拐、家遭火災而看破紅塵，隨跛足道人出家，點出了小說「真事隱去，假語存焉」的創作主旨和「夢幻」的基調。',
      },
      // Add other chapters as needed...
      // Example for a generic chapter
      ch_generic: {
        title: '第 {chapterNum} 回 示例標題 {chapterNum}',
        subtitle: '紅樓夢示例副標題 {chapterNum}',
        summary: '這是第 {chapterNum} 回的摘要。此回主要講述了 [簡短描述] 等情節，展現了 [主要人物] 的 [性格特點或遭遇]。',
      }
    }
  },
  'zh-CN': {
    appName: '红楼慧读',
    // Toast notification titles
    筆記儲存: '笔记保存',
    筆記更新: '笔记更新',
    筆記刪除: '笔记删除',

    buttons: {
      startLearning: '开始学习',
      learnMore: '了解更多',
      registerFree: '免费注册',
      next: '下一步',
      previous: '上一步',
      submit: '提交',
      save: '保存',
      cancel: '取消',
      close: '关闭',
      login: '登录',
      logout: '登出',
      share: '分享',
      viewDetails: '查看详情',
      continueEffort: '继续努力',
      startGoal: '开始目标',
      edit: '编辑',
      post: '发布',
      posting: '发文中...',
      submitComment: '提交评论',
      submittingComment: '提交中...',
      read: '阅读',
      return: '返回',
      settings: '设定',
      singleColumn: '单栏',
      doubleColumn: '双栏',
      tripleColumn: '三栏',
      hideVernacular: '隐藏白话',
      showVernacular: '显示白话',
      knowledgeGraph: '知识图谱',
      toc: '目录',
      search: '搜索',
      fullscreen: '全屏',
      exitFullscreen: '退出全屏',
      writeNote: '写笔记',
      highlight: '划线',
      listenCurrent: '听当前',
      copy: '复制',
      askAI: '问 AI',
      ai: 'AI',
      copiedToClipboard: '选取内容已复制到剪贴板。',
      copyFailed: '无法复制内容到剪贴板。',
      featureComingSoon: '功能尚未实现。',
      aiThinking: 'AI 思考中...',
      aiReply: 'AI 回答：',
      askAnotherQuestion: '再问一题',
      saveNote: '保存笔记',
      noteSaved: '您的笔记已成功保存',
      noteUpdated: '您的笔记已更新',
      noteDeleted: '笔记已删除',
      clearSearch: '清除搜索',
      readAloud: '朗读',
    },
    placeholders: {
      searchPosts: '搜索博文内容、作者或标签...',
      yourQuestion: '请输入您想问的问题...',
      yourNote: '在此输入您的笔记...',
      emailExample: 'm@example.com',
      selectAnOption: '请选择一个选项',
      searchInBook: '输入搜索词...',
      writeYourComment: '写下您的评论...',
      postContent: '博文内容...',
    },
    labels: {
      theme: '主题',
      text: '文字',
      currentFontSize: '当前字号',
      fontHint: '支援快捷键 Ctrl + Alt + "+" 放大字号, Ctrl + Alt + "-" 缩小字号',
      selectedContent: '选取内容:',
      yourNote: '您的笔记:',
      yourQuestion: '您的问题：',
      themes: {
        white: '白色',
        yellow: '黄色',
        green: '护眼',
        night: '夜间',
      },
      fonts: {
        notoSerifSC: '思源宋体',
        system: '系统字体',
        kai: '楷体',
        hei: '粗黑体',
      },
    },
    page: {
      navHome: '主页',
      navFeatures: '特色',
      navSolutions: '主要功能',
      heroTitlePart1: '智能引航，重焕',
      heroTitleHighlight: '红楼',
      heroTitlePart2: '之梦',
      heroSubtitle: '深入探索《红楼梦》的宏大世界。借助 AI 赋能的文本分析、学习状况洞察与深度研究工具，开启您的智慧阅读之旅。',
      challengesTitle: '经典阅读的挑战',
      challengesSubtitle: '《红楼梦》虽为不朽巨著，然其深奥的文化内涵与复杂的人物脉络，常使现代读者望而却步。',
      painPoint1Title: '学习动力难持续',
      painPoint1Desc: '超过七成读者曾在阅读古典文学时中途放弃，因缺乏持续动力与成就感。面对传统线性阅读，易感孤独无助。',
      painPoint2Title: '理解门槛高远',
      painPoint2Desc: '近半数读者反映《红楼梦》人物关系复杂、文化背景艰涩难懂。理解刘姥姥进大观园、宝黛钗情感纠葛等，如同攀登文化高峰。',
      painPoint3Title: '专业资源难整合',
      painPoint3Desc: '权威解读与学术资源虽多，但分布零散，无法在阅读当下即时辅助，也缺乏系统化学习指导，难建清晰理解框架。',
      solutionsTitle: '红楼慧读：智能方案',
      solutionsSubtitle: '我们运用 AI 技术，打造互动化、个性化的学习体验，助您轻松跨越阅读障碍，领略经典魅力。',
      solution1Title: '点燃持续动力',
      solution1Desc: '采用游戏化学习设计，将阅读化为任务。通过成就徽章、进度追踪、个性化目标与即时回馈，打造闯关般的愉悦体验。',
      solution2Title: 'AI 降低理解门槛',
      solution2Desc: '整合先进语言模型与红学知识库。提供上下文词义解析、文化背景补充、互动人物图谱、选字即问及AI音韵朗读，全面提升理解。',
      solution3Title: 'AI 整合专业内容',
      solution3Desc: '汇整名家学者解读（如白先勇、蒋勋）为训练资料，建立「章节对应专家观点」机制，让您即时参照权威见解，深化理解。',
      ctaTitle: '准备好开启您的红楼之旅了吗？',
      ctaSubtitle: '立即注册，体验 AI 时代的古典文学学习新范式。',
      footerSlogan: 'AI 赋能，重探红楼之梦。您的智能《红楼梦》学习伙伴。',
      footerRights: '© 2024 红楼慧读团队. All Rights Reserved.',
    },
    appShell: {
      userAccount: '我的账户',
      settings: '设置 (待开发)',
    },
    sidebar: {
      home: '首页',
      read: '阅读',
      dailyTasks: '每日修身',
      achievements: '成就与目标',
      community: '红学社',
    },
    login: {
      welcomeBack: '欢迎回来',
      pageDescription: '登录以继续您的红楼慧读之旅',
      emailLabel: '电子邮件',
      passwordLabel: '密码',
      errorTitle: '登录错误',
      errorInvalidCredential: '电子邮件或密码不正确。',
      errorDefault: '登录失败，请稍后再试。',
      noAccount: '还没有账户?',
      registerNow: '立即注册',
      loggingIn: '登录中...',
      orContinueWith: '或使用以下方式登录',
      guestLogin: '访客登录',
    },
    register: {
      joinApp: '加入红楼慧读',
      step1Description: '创建您的账户，开启智能阅读新体验',
      step2Description: '告诉我们更多关于您的学习背景',
      step3Description: '分享您对《红楼梦》的阅读兴趣',
      step4Description: '设定您的学习目标',
      firstNameLabel: '请输入姓氏',
      firstNamePlaceholder: '姓氏',
      lastNameLabel: '请输入名字',
      lastNamePlaceholder: '名字',
      emailLabel: '电子邮件',
      passwordLabel: '密码 (至少6位)',
      learningBackgroundLabel: '您的古典文学基础？ (选填)',
      learningBackgroundPlaceholder: '请选择您的古典文学背景',
      bgOptionBeginner: '初次接触',
      bgOptionIntermediate: '略有涉猎',
      bgOptionAdvanced: '曾修读相关课程',
      bgOptionExpert: '深入研究',
      readingInterestsLabel: '您对《红楼梦》的哪些方面最感兴趣？ (选填)',
      readingInterestsPlaceholder: '例如：人物关系、诗词赏析、历史文化背景...',
      learningGoalsLabel: '您希望透过本平台达成什么学习目标？ (选填)',
      learningGoalsPlaceholder: '例如：完整阅读一遍、理解主要人物、完成所有判词笔记...',
      errorTitle: '注册错误',
      checkingEmail: '检查电子邮件...',
      errorEmailInUse: '此电子邮件地址已被注册。',
      errorEmailExistsMultipleProviders: '此电子邮件已注册并连结了多个登录方式。请前往登录页面使用现有账户登录。',
      errorEmailExistsGoogleOnly: '此电子邮件已透过 Google 账户注册。请使用 Google 登录，或前往登录页面。',
      errorEmailExistsEmailOnly: '此电子邮件已注册。请前往登录页面使用现有账户登录。',
      errorEmailExistsOtherProvider: '此电子邮件已透过其他方式注册。请前往登录页面使用现有账户登录。',
      errorEmailCheckFailed: '检查电子邮件时发生错误，请稍后再试。',
      errorWeakPassword: '密码太弱，请使用更强的密码。',
      errorConfigNotFound: 'Firebase 验证设定未找到。请确认您的 .env 文件中的 Firebase 项目ID是否正确，并在 Firebase 控制台中启用了 Email/Password 登录方式。',
      errorInvalidApiKey: 'Firebase API 密钥无效。请检查您的 .env 文件中的 Firebase 配置是否正确。',
      errorDefault: '注册失败，请稍后再试。错误码：',
      alreadyHaveAccount: '已经有账户了?',
      creatingAccount: '创建中...',
      createAndStart: '创建账户并开始学习',
      errors: {
        firstNameRequired: '姓氏不能为空',
        lastNameRequired: '名字不能为空',
        emailInvalid: '请输入有效的电子邮件地址',
        passwordMinLength: '密码长度至少为6位',
      }
    },
    dashboard: {
      learningOverview: '学习总览',
      chaptersCompleted: '章',
      avgUnderstanding: '平均理解度',
      totalLearningTime: '总学习时长',
      notesCount: '笔记数量',
      goalsAchieved: '已达目标',
      recentReading: '最近阅读活动',
      recentReadingDesc: '快速返回您上次阅读的书籍，或回顾最近的学习内容。',
      myLearningGoals: '我的学习目标 (示例)',
      myLearningGoalsDesc: '追踪您的个人学习目标，保持学习动力。',
      manageAllGoals: '管理所有目标',
      continueReading: '继续阅读',
    },
    read: {
      myShelf: '我的书架',
      tabRecent: '最近学习',
      tabOriginals: '红楼梦原文',
      tabInterpretations: '专家解读',
      btnAll: '全部',
      btnProgress: '进度',
      btnCategory: '分类',
      recentLearningPlaceholder: '最近学习记录将显示于此。',
      badgeEbook: '电子书',
      badgeExpert: '专家解读',
    },
    achievements: {
      title: '我的成就与目标',
      description: '追踪您的学习成果，设定新目标，迎接挑战，不断进步。',
      myAchievements: '我获得的成就',
      myAchievementsDesc: '记录您在红楼慧读旅程中达成的每一个里程碑。',
      noAchievements: '您目前尚未获得任何成就，继续努力吧！',
      learningStats: '学习进度总览',
      learningStatsDesc: '全面了解您的学习投入与成果。',
      totalReadingTime: '总阅读时长',
      chaptersCompletedFull: '已完成章回',
      notesTaken: '笔记数量',
      currentStreak: '连续学习',
      overallProgress: '整体阅读进度',
      chaptersUnit: '章回',
      viewDetailedAnalysis: '查看详细学习分析',
      nextGoals: '下一步目标',
      nextGoalsDesc: '系统为您推荐或您正在进行的目标。',
      setNewGoals: '设定新的学习目标',
      setNewGoalsDesc: '根据您的偏好，设定个性化的学习计划。',
      goalDailyReadingTime: '每日阅读时间',
      goalDailyReadingTimeDesc: '设定每天的阅读时长',
      goalChapterCompletion: '章回完成目标',
      goalChapterCompletionDesc: '设定要完成的章回数量',
      goalStreak: '连续学习天数',
      goalStreakDesc: '挑战连续学习的纪录',
      goalAccuracy: '阅读正确率',
      goalAccuracyDesc: '提升对内容的理解准确度',
      challenges: '学习挑战赛',
      challengesDesc: '参与社群挑战，与其他读者一同进步，赢取奖励。',
      tabDaily: '每日挑战',
      tabWeekly: '每周挑战',
      tabSpecial: '特别活动',
      noDailyChallenges: '今日暂无挑战。',
      noWeeklyChallenges: '本周暂无挑战。',
      noSpecialChallenges: '目前尚无特别活动。',
      challengeInProgress: '进行中',
      joinChallenge: '参与挑战',
      viewActivity: '查看活动',
      rewardPrefix: '奖励：',

      // Achievement unlocked notifications
      achievementUnlocked: '成就达成',
      firstAIQuestion: {
        name: '心有疑，随札记',
        description: '首次使用 AI 问答功能',
      },
    },
    // User profile and authentication translations
    user: {
      notLoggedIn: '尚未登录',
      userId: '用户ID',
      guest: '访客',
      anonymous: '匿名用户',
      redMansionGuest: '红楼访客',
      profile: '个人资料',
      settings: '设置',
    },
    auth: {
      providerGoogle: '谷歌登录',
      providerEmail: '电子邮件',
    },
    // Level system translations
    level: {
      current: '当前等级',
      nextLevel: '下一级',
      progress: '等级进度',
      xpRequired: '所需经验值',
      currentXP: '当前经验值',
      xpToNextLevel: '升级还需',
      permissions: '权限',
      unlockedContent: '已解锁内容',
      exclusiveRewards: '专属奖励',
      virtualResidence: '虚拟居所',
      levelUp: '升级！',
      xpToGo: '经验值',
      congratulations: '恭喜',
      reachedLevel: '您已达到',
      newPermissionsUnlocked: '新权限已解锁',
      newContentUnlocked: '新内容已解锁',
      keepLearning: '继续学习',
      // Level titles (matching levels-config.ts)
      level_0: '贾府访客',
      level_1: '陪读书童',
      level_2: '门第清客',
      level_3: '庶务管事',
      level_4: '诗社雅士',
      level_5: '府中幕宾',
      level_6: '红学通儒',
      level_7: '一代宗师',
      // English level titles for badges
      level_0_en: 'Mansion Visitor',
      level_1_en: 'Companion Scholar',
      level_2_en: 'Distinguished Guest',
      level_3_en: 'Estate Manager',
      level_4_en: 'Poetry Society Member',
      level_5_en: 'Manor Advisor',
      level_6_en: 'Redology Scholar',
      level_7_en: 'Grand Master',
      // Permission names
      permissionNames: {
        basic_reading: '基本阅读',
        simple_ai_qa: '简单 AI 问答',
        daily_tasks: '每日任务',
        basic_achievements: '基础成就',
        poetry_listening: '诗词鉴赏',
        expert_readings_basic: '专家解读（基础）',
        expert_readings_full: '专家解读（完整）',
        garden_3d_view: '大观园 3D 浏览',
        advanced_ai_analysis: '进阶 AI 分析',
        character_relationship_map: '人物关系图谱',
        poetry_competition: '诗词比赛',
        study_group_create: '创建读书会',
        special_topics: '专题讨论',
        mentor_role: '导师角色',
        research_tools: '研究工具',
        annotation_publish: '注解发布',
        exclusive_events: '专属活动',
      },
      // Exclusive content names
      exclusiveContentNames: {
        intro_guide: '新手指南',
        character_intro_basic: '基础人物介绍',
        daily_tasks_unlock: '每日任务系统',
        achievement_system: '成就收集系统',
        character_profiles_basic: '基础人物档案',
        poetry_collection: '诗词集锦',
        expert_commentary_basic: '基础专家评论',
        garden_3d_tour: '大观园 3D 导览',
        character_relationships_basic: '基础人物关系图',
        advanced_analysis_tools: '进阶分析工具',
        character_psychology: '人物心理分析',
        historical_context: '历史文化脉络',
        interactive_relationship_map: '互动式人物关系图',
        poetry_competitions: '诗词竞赛系统',
        study_groups: '读书会功能',
        advanced_poetry_tools: '进阶诗词分析',
        cultural_deep_dive: '文化深度探索',
        expert_commentary_full: '完整专家评论',
        special_topics: '专题讨论区',
        mentor_system: '新手导师系统',
        exclusive_webinars: '专家线上讲座',
        research_tools: '进阶研究工具',
        annotation_system: '学术注解发布',
        exclusive_archives: '专属历史档案',
        expert_dialogue: '专家直接对话',
        master_archives: '宗师专属档案',
        exclusive_events: 'VIP 文化活动',
        platform_governance: '平台治理参与',
        legacy_content: '传承内容创作',
      },
    },
    community: {
      title: '红学社',
      description: '用户交流、分享心得的园地。畅所欲言，共同探讨《红楼梦》的无穷魅力。',
      writeNewPost: '撰写新帖',
      characterCount: '字',
      noMatchingPosts: '暂无匹配博文',
      noPostsYet: '这里还没有博文，快来发表第一篇吧！',
      errorSearchNoResults: '未找到与您的搜索词相关的博文。',
      newPostPlaceholder: '撰写新帖 功能示意',
      commentLabel: '发表评论',
      anonymousUser: '匿名用户',
      placeholderInitialCommentAuthor1: "林黛玉",
      placeholderInitialCommentText1: "宝玉哥哥此番见解深刻，晴雯判词确令人心伤。一句\"霁月难逢，彩云易散\"，道尽了她的不幸与凄凉。",
      placeholderInitialCommentAuthor2: "薛宝钗",
      placeholderInitialCommentText2: "袭人判词中\"枉自温柔和顺，空云似桂如兰\"，也颇耐人寻味。书中人物命运多舛，实是红楼一梦，令人不胜唏嘘。",
      placeholderInitialCommentAuthor3: "王熙凤",
      placeholderInitialCommentText3: "雨村先生所言甚是。若论及排场与吃穿用度，我们贾府的确是冠绝一时。便是寻常一道茶点，也有无数讲究呢。",
      postTagNew: '新帖',
      showMore: '更多',
      showLess: '收起',
    },
    readBook: {
      knowledgeGraphSheetTitle: '章回知识图谱',
      knowledgeGraphSheetDesc: '呈现本章回主要概念之间的关联。(此为模拟图，实际图谱会基于文本动态生成)',
      tocSheetTitle: '目录',
      tocSheetDesc: '选择章回以快速跳转。',
      noteSheetTitle: '撰写笔记',
      noteSheetDesc: '针对您选取的内容记录您的想法。',
      aiSheetTitle: '问 AI',
      aiSheetDesc: '针对选取的文本提出您的疑问。',
      annotationAbbr: '注',
      vernacularPrefix: '（白话文）',
      noContentSelected: '尚未选取文字',
      errorAIExplain: '向 AI 提问时发生错误。',
      errorAIMissingOutput: 'AI模型未能生成有效的文本解释。',
      errorAIContextAnalysis: 'AI模型未能生成有效的文本脉络分析。',
    },
    notes: {
      dashboard: '笔记仪表板',
      dashboardDesc: '管理并查看您的所有阅读笔记',
      totalNotes: '总笔记数',
      chaptersCovered: '涵盖章回',
      totalWords: '总字数',
      publicNotes: '公开笔记',
      shareToPublic: '分享至公开',
      yourNote: '您的笔记',
      enterNote: '在此输入您的笔记...',
      tags: '标签',
      addTag: '添加标签',
      chapter: '章回',
      public: '公开',
      words: '字',
      searchPlaceholder: '搜索笔记...',
      allChapters: '所有章回',
      allTime: '全部时间',
      last7Days: '最近 7 天',
      last30Days: '最近 30 天',
      last90Days: '最近 90 天',
      sortBy: '排序方式',
      newest: '最新',
      oldest: '最旧',
      byChapter: '依章回',
      byWordCount: '依字数',
      clearFilters: '清除筛选',
      filterByTags: '依标签筛选',
      activeTags: '已选标签',
      showing: '显示',
      of: '共',
      notes: '笔记',
      noNotes: '尚无笔记',
      noNotesDesc: '您还没有撰写任何笔记。开始阅读并记录您的想法吧！',
      startReading: '开始阅读',
      noMatchingNotes: '无符合的笔记',
      noMatchingNotesDesc: '未找到符合您筛选条件的笔记。请尝试调整筛选条件。',
      deleteSuccess: '笔记已删除',
      deleteSuccessDesc: '您的笔记已成功删除。',
      deleteError: '删除失败',
      updateSuccess: '笔记已更新',
      updateSuccessDesc: '您的笔记已成功更新。',
      updateError: '更新失败',
      madePublic: '已设为公开',
      madePublicDesc: '您的笔记现在对所有用户可见。',
      madePrivate: '已设为私人',
      madePrivateDesc: '您的笔记现在仅您可见。',
      visibilityError: '变更可见性失败',
      tagsUpdated: '标签已更新',
      tagsUpdatedDesc: '您的笔记标签已成功更新。',
      tagsError: '更新标签失败',
      fetchError: '加载笔记失败',
      fetchPublicError: '加载公开笔记失败',
      loginRequired: '需要登录',
      loginRequiredDesc: '请登录以查看和管理您的笔记。',
      publicNotesDesc: '探索其他读者分享的公开笔记',
      noPublicNotes: '尚无公开笔记',
      noPublicNotesDesc: '目前没有公开的笔记。成为第一个分享您见解的人！',
      searchPublicNotes: '搜索公开笔记...',
      allTags: '所有标签',
      confirmDelete: '确认删除',
    },
    pagination: {
      previous: '上一页',
      next: '下一页',
      page: '第',
      of: '页，共',
    },
    bookShelf: {
      hlmtimesedition: {
        title: '红楼梦上中下三册',
        author: '时报出版',
        description: '时报出版发行的《红楼梦》全集，分为上、中、下三册。',
      },
      hlmv3: {
        title: '红楼梦 (第三版)',
        author: '[清] 曹雪芹',
        description: '以宝黛爱情悲剧为主线，展现清代贵族生活画卷。',
      },
      hlmchengjia: {
        title: '红楼梦 (程甲本影印)',
        author: '[清] 曹雪芹 高鹗',
        description: '清代程伟元、高鹗整理的《红楼梦》早期印本之一。',
      },
      hlmgengchen: {
        title: '红楼梦 (庚辰本校注)',
        author: '[清] 曹雪芹 著；俞平伯 校注',
        description: '以庚辰本为底本，参校各脂本，进行详细校勘与注释。',
      },
      hlmzhiyan: {
        title: '脂砚斋重评石头记 (校订本)',
        author: '[清] 曹雪芹；脂砚斋 评',
        description: '汇集了带有脂砚斋等人大量批语的早期抄本。',
      },
      hlmmenggao: {
        title: '红楼梦 (梦稿本整理版)',
        author: '[清] 曹雪芹',
        description: '根据"梦稿本"整理排印，保留早期稿本特色。',
      },
      hlmanniversary: {
        title: '红楼梦 (百年纪念版)',
        author: '[清] 曹雪芹',
        description: '纪念《红楼梦》研究百年，汇集名家点评的珍藏版本。',
      },
      jiangxunyouth: {
        title: '蒋勋说红楼梦青春版',
        author: '蒋勋',
        description: '除了文字之外，附加了很多的图，阅读的易读性增加了许多。详细讲解每一回，并且排版很舒服。文笔柔和，内容也没有多大门槛、生活化，适合青少年读。',
      },
      jiangxundream: {
        title: '蒋勋 梦红楼',
        author: '蒋勋',
        description: '为入门的红楼梦书籍 可以作为读红楼梦之前的概观 不用太多的专业知识也能读懂 和生活连结性强。',
      },
      jiangxunmicrodust: {
        title: '蒋勋 微尘众',
        author: '蒋勋',
        description: '也是入门的红楼梦书籍 一一介绍了红楼梦的各个人物',
      },
      baixianyongdetailed: {
        title: '白先勇细说红楼梦',
        author: '白先勇',
        description: '也详细讲了每一回，和蒋勋老师不同之处在于生活的部分少了很多。详细讲的全面、深入，较为深思型的，有另一个不一样的视角。需要一点中国文学的背景知识。书中有文字也有图。',
      },
      oulijuansixviews: {
        title: '欧丽娟 六观红楼(综论卷)、红楼梦公开课',
        author: '欧丽娟',
        description: '欧丽娟老师的适合读完红楼梦整本，以及对红楼梦有较整体认识来读的，并且学术性较多，多为专题式的研究。',
      },
      dongmeithorough: {
        title: '董梅讲透红楼梦',
        author: '董梅',
        description: '介于生活和学术之间，需要的阅读能力有点在白先勇的前面一些，门槛没有很高。但是为主题式的说明，从各个角度，例如生活美学、文学杰作、生活符号综合来了解红楼梦。',
      },
    },
    chapterContent: {
      ch1: {
        title: '第一回 甄士隐梦幻识通灵 贾雨村风尘怀闺秀',
        subtitle: '红楼梦:第三版(中国古典文学读本丛书)',
        summary: '本回主要讲述了甄士隐梦遇一僧一道谈论石头下凡历劫，以及贾雨村的落魄与发迹。甄士隐因女儿英莲被拐、家遭火灾而看破红尘，随跛足道人出家，点出了小说"真事隐去，假语存焉"的创作主旨和"梦幻"的基调。',
      },
      ch_generic: {
        title: '第 {chapterNum} 回 示例标题 {chapterNum}',
        subtitle: '红楼梦示例副标题 {chapterNum}',
        summary: '这是第 {chapterNum} 回的摘要。此回主要讲述了 [简短描述] 等情节，展现了 [主要人物] 的 [性格特点或遭遇]。',
      }
    }
  },
  'en-US': {
    appName: 'IntelliRedChamber',
    // Toast notification titles
    筆記儲存: 'Note Saved',
    筆記更新: 'Note Updated',
    筆記刪除: 'Note Deleted',

    buttons: {
      startLearning: 'Start Learning',
      learnMore: 'Learn More',
      registerFree: 'Register for Free',
      next: 'Next',
      previous: 'Previous',
      submit: 'Submit',
      save: 'Save',
      cancel: 'Cancel',
      close: 'Close',
      login: 'Login',
      logout: 'Logout',
      share: 'Share',
      viewDetails: 'View Details',
      continueEffort: 'Continue',
      startGoal: 'Start Goal',
      edit: 'Edit',
      post: 'Post',
      posting: 'Posting...',
      submitComment: 'Submit Comment',
      submittingComment: 'Submitting...',
      read: 'Read',
      return: 'Return',
      settings: 'Settings',
      singleColumn: 'Single',
      doubleColumn: 'Double',
      tripleColumn: 'Triple',
      hideVernacular: 'Hide Vern.',
      showVernacular: 'Show Vern.',
      knowledgeGraph: 'Graph',
      toc: 'ToC',
      search: 'Search',
      fullscreen: 'Fullscreen',
      exitFullscreen: 'Exit',
      writeNote: 'Note',
      highlight: 'Highlight',
      listenCurrent: 'Listen',
      copy: 'Copy',
      askAI: 'Ask AI',
      ai: 'AI',
      copiedToClipboard: 'Selected content copied to clipboard.',
      copyFailed: 'Failed to copy content to clipboard.',
      featureComingSoon: 'Feature not yet implemented.',
      aiThinking: 'AI is thinking...',
      aiReply: 'AI Reply:',
      askAnotherQuestion: 'Ask Another',
      saveNote: 'Save Note',
      noteSaved: 'Your note has been saved successfully',
      noteUpdated: 'Your note has been updated',
      noteDeleted: 'Note has been deleted',
      clearSearch: 'Clear Search',
      readAloud: 'Read Aloud',
    },
    placeholders: {
      searchPosts: 'Search posts, authors, or tags...',
      yourQuestion: 'Enter your question here...',
      yourNote: 'Enter your notes here...',
      emailExample: 'm@example.com',
      selectAnOption: 'Please select an option',
      searchInBook: 'Enter search term...',
      writeYourComment: 'Write your comment...',
      postContent: 'Post content...',
    },
    labels: {
      theme: 'Theme',
      text: 'Text',
      currentFontSize: 'Current Size',
      fontHint: 'Use Ctrl+Alt+"+" to zoom in, Ctrl+Alt+"-" to zoom out.',
      selectedContent: 'Selected Content:',
      yourNote: 'Your Note:',
      yourQuestion: 'Your Question:',
      themes: {
        white: 'White',
        yellow: 'Yellow',
        green: 'Green',
        night: 'Night',
      },
      fonts: {
        notoSerifSC: 'Noto Serif SC',
        system: 'System Font',
        kai: 'Kaiti',
        hei: 'Heiti',
      },
    },
    page: {
      navHome: 'Home',
      navFeatures: 'Features',
      navSolutions: 'Solutions',
      heroTitlePart1: 'Intelligent Guidance, Reviving the ',
      heroTitleHighlight: 'Red Chamber',
      heroTitlePart2: ' Dream',
      heroSubtitle: 'Deeply explore the grand world of "Dream of the Red Chamber". Leverage AI-powered text analysis, learning insights, and in-depth research tools to embark on your intelligent reading journey.',
      challengesTitle: 'Challenges of Reading Classics',
      challengesSubtitle: '"Dream of the Red Chamber", though an immortal masterpiece, often daunts modern readers with its profound cultural connotations and complex character relationships.',
      painPoint1Title: 'Difficulty Sustaining Motivation',
      painPoint1Desc: 'Over 70% of readers abandon classical literature midway due to a lack of sustained motivation and a sense of accomplishment, often feeling isolated in traditional linear reading.',
      painPoint2Title: 'High Comprehension Barriers',
      painPoint2Desc: 'Nearly half of readers find the intricate character relationships and obscure cultural background of "Dream of the Red Chamber" difficult to understand, like scaling a cultural peak.',
      painPoint3Title: 'Fragmented Expert Resources',
      painPoint3Desc: 'Authoritative interpretations and academic resources are abundant but scattered, failing to provide real-time assistance during reading and lacking systematic guidance for a clear understanding.',
      solutionsTitle: 'IntelliRedChamber: Smart Solutions',
      solutionsSubtitle: 'We use AI technology to create interactive and personalized learning experiences, helping you overcome reading barriers and appreciate the charm of classics.',
      solution1Title: 'Ignite Sustained Motivation',
      solution1Desc: 'Employ gamified learning design, turning reading into missions. Achievement badges, progress tracking, personalized goals, and instant feedback create an enjoyable quest-like experience.',
      solution2Title: 'AI Lowers Comprehension Barriers',
      solution2Desc: 'Integrate advanced language models with a Redology knowledge base. Provides contextual word sense disambiguation, cultural background supplements, interactive character maps, and AI-powered phonetic reading.',
      solution3Title: 'AI Consolidates Expert Content',
      solution3Desc: 'Compile interpretations from renowned scholars (e.g., Bai Xianyong, Jiang Xun) as training data, establishing a "chapter-to-expert-viewpoint" mechanism for instant reference to authoritative insights.',
      ctaTitle: 'Ready to Begin Your Red Chamber Journey?',
      ctaSubtitle: 'Register now and experience a new paradigm for learning classical literature in the AI era.',
      footerSlogan: 'AI-powered, re-exploring the Dream of the Red Chamber. Your intelligent "Dream of the Red Chamber" learning companion.',
      footerRights: '© 2024 IntelliRedChamber Team. All Rights Reserved.',
    },
    appShell: {
      userAccount: 'My Account',
      settings: 'Settings (Coming Soon)',
    },
    sidebar: {
      home: 'Home',
      read: 'Read',
      dailyTasks: 'Daily Tasks',
      achievements: 'Achievements',
      community: 'Community',
    },
    login: {
      welcomeBack: 'Welcome Back',
      pageDescription: 'Log in to continue your IntelliRedChamber journey',
      emailLabel: 'Email',
      passwordLabel: 'Password',
      errorTitle: 'Login Error',
      errorInvalidCredential: 'Incorrect email or password.',
      errorDefault: 'Login failed. Please try again later.',
      noAccount: "Don't have an account?",
      registerNow: 'Register Now',
      loggingIn: 'Logging in...',
      orContinueWith: 'Or continue with',
      guestLogin: 'Guest Login',
    },
    register: {
      joinApp: 'Join IntelliRedChamber',
      step1Description: 'Create your account and start a new intelligent reading experience',
      step2Description: 'Tell us more about your learning background',
      step3Description: 'Share your reading interests in "Dream of the Red Chamber"',
      step4Description: 'Set your learning goals',
      firstNameLabel: 'First Name',
      firstNamePlaceholder: 'First Name',
      lastNameLabel: 'Last Name',
      lastNamePlaceholder: 'Last Name',
      emailLabel: 'Email',
      passwordLabel: 'Password (min. 6 characters)',
      learningBackgroundLabel: 'Your classical literature background? (Optional)',
      learningBackgroundPlaceholder: 'Select your classical literature background',
      bgOptionBeginner: 'Beginner',
      bgOptionIntermediate: 'Some Exposure',
      bgOptionAdvanced: 'Took Related Courses',
      bgOptionExpert: 'In-depth Study',
      readingInterestsLabel: 'What aspects of "Dream of the Red Chamber" interest you most? (Optional)',
      readingInterestsPlaceholder: 'e.g., character relationships, poetry analysis, historical context...',
      learningGoalsLabel: 'What learning goals do you hope to achieve with this platform? (Optional)',
      learningGoalsPlaceholder: 'e.g., read the entire novel, understand main characters, complete notes on all verses...',
      errorTitle: 'Registration Error',
      checkingEmail: 'Checking email...',
      errorEmailInUse: 'This email address is already registered.',
      errorEmailExistsMultipleProviders: 'This email is already registered with multiple sign-in methods. Please go to the login page to sign in with your existing account.',
      errorEmailExistsGoogleOnly: 'This email is already registered via Google account. Please use Google sign-in or go to the login page.',
      errorEmailExistsEmailOnly: 'This email is already registered. Please go to the login page to sign in with your existing account.',
      errorEmailExistsOtherProvider: 'This email is already registered via another method. Please go to the login page to sign in with your existing account.',
      errorEmailCheckFailed: 'An error occurred while checking the email. Please try again later.',
      errorWeakPassword: 'Password is too weak. Please use a stronger password.',
      errorConfigNotFound: 'Firebase authentication configuration not found. Please ensure your Firebase Project ID in .env is correct and Email/Password sign-in is enabled in the Firebase console.',
      errorInvalidApiKey: 'Invalid Firebase API Key. Please check your Firebase configuration in .env.',
      errorDefault: 'Registration failed. Please try again later. Error code: ',
      alreadyHaveAccount: 'Already have an account?',
      creatingAccount: 'Creating account...',
      createAndStart: 'Create Account & Start Learning',
      errors: {
        firstNameRequired: 'First name cannot be empty',
        lastNameRequired: 'Last name cannot be empty',
        emailInvalid: 'Please enter a valid email address',
        passwordMinLength: 'Password must be at least 6 characters long',
      }
    },
    dashboard: {
      learningOverview: 'Learning Overview',
      chaptersCompleted: 'Ch.',
      avgUnderstanding: 'Avg. Comprehension',
      totalLearningTime: 'Total Study Time',
      notesCount: 'Notes Taken',
      goalsAchieved: 'Goals Achieved',
      recentReading: 'Recent Reading Activity',
      recentReadingDesc: 'Quickly return to your last read books or review recent study content.',
      myLearningGoals: 'My Learning Goals (Sample)',
      myLearningGoalsDesc: 'Track your personal learning goals and stay motivated.',
      manageAllGoals: 'Manage All Goals',
      continueReading: 'Continue Reading',
    },
    read: {
      myShelf: 'My Shelf',
      tabRecent: 'Recent',
      tabOriginals: 'Original Text',
      tabInterpretations: 'Expert Analysis',
      btnAll: 'All',
      btnProgress: 'Progress',
      btnCategory: 'Category',
      recentLearningPlaceholder: 'Recent learning records will be displayed here.',
      badgeEbook: 'E-book',
      badgeExpert: 'Expert Analysis',
    },
    achievements: {
      title: 'My Achievements & Goals',
      description: 'Track your learning outcomes, set new goals, take on challenges, and keep progressing.',
      myAchievements: 'My Achievements',
      myAchievementsDesc: 'Record every milestone achieved on your IntelliRedChamber journey.',
      noAchievements: 'You haven\'t earned any achievements yet. Keep up the good work!',
      learningStats: 'Learning Progress Overview',
      learningStatsDesc: 'Get a comprehensive understanding of your learning efforts and results.',
      totalReadingTime: 'Total Reading Time',
      chaptersCompletedFull: 'Chapters Completed',
      notesTaken: 'Notes Taken',
      currentStreak: 'Current Streak',
      overallProgress: 'Overall Reading Progress',
      chaptersUnit: 'Chapters',
      viewDetailedAnalysis: 'View Detailed Learning Analysis',
      nextGoals: 'Next Goals',
      nextGoalsDesc: 'Goals recommended by the system or currently in progress.',
      setNewGoals: 'Set New Learning Goals',
      setNewGoalsDesc: 'Set personalized learning plans based on your preferences.',
      goalDailyReadingTime: 'Daily Reading Time',
      goalDailyReadingTimeDesc: 'Set your daily reading duration',
      goalChapterCompletion: 'Chapter Completion Goal',
      goalChapterCompletionDesc: 'Set the number of chapters to complete',
      goalStreak: 'Learning Streak',
      goalStreakDesc: 'Challenge your continuous learning record',
      goalAccuracy: 'Reading Accuracy',
      goalAccuracyDesc: 'Improve comprehension accuracy',
      challenges: 'Learning Challenges',
      challengesDesc: 'Participate in community challenges, progress with other readers, and win rewards.',
      tabDaily: 'Daily',
      tabWeekly: 'Weekly',
      tabSpecial: 'Special',
      noDailyChallenges: 'No daily challenges today.',
      noWeeklyChallenges: 'No weekly challenges this week.',
      noSpecialChallenges: 'No special events currently.',
      challengeInProgress: 'In Progress',
      joinChallenge: 'Join Challenge',
      viewActivity: 'View Activity',
      rewardPrefix: 'Reward: ',

      // Achievement unlocked notifications
      achievementUnlocked: 'Achievement Unlocked',
      firstAIQuestion: {
        name: 'Curiosity Begins with Questions',
        description: 'Used AI Q&A for the first time',
      },
    },
    // User profile and authentication translations
    user: {
      notLoggedIn: 'Not logged in',
      userId: 'User ID',
      guest: 'Guest',
      anonymous: 'Anonymous User',
      redMansionGuest: 'Red Mansion Guest',
      profile: 'Profile',
      settings: 'Settings',
    },
    auth: {
      providerGoogle: 'Google Login',
      providerEmail: 'Email',
    },
    // Level system translations
    level: {
      current: 'Current Level',
      nextLevel: 'Next Level',
      progress: 'Level Progress',
      xpRequired: 'XP Required',
      currentXP: 'Current XP',
      xpToNextLevel: 'XP to Next Level',
      permissions: 'Permissions',
      unlockedContent: 'Unlocked Content',
      exclusiveRewards: 'Exclusive Rewards',
      virtualResidence: 'Virtual Residence',
      levelUp: 'Level Up!',
      xpToGo: 'XP to go',
      congratulations: 'Congratulations',
      reachedLevel: 'You have reached',
      newPermissionsUnlocked: 'New permissions unlocked',
      newContentUnlocked: 'New content unlocked',
      keepLearning: 'Keep Learning',
      // Level titles (matching levels-config.ts)
      level_0: 'Mansion Visitor',
      level_1: 'Companion Scholar',
      level_2: 'Distinguished Guest',
      level_3: 'Estate Manager',
      level_4: 'Poetry Society Member',
      level_5: 'Manor Advisor',
      level_6: 'Redology Scholar',
      level_7: 'Grand Master',
      // English level titles for badges
      level_0_en: 'Mansion Visitor',
      level_1_en: 'Companion Scholar',
      level_2_en: 'Distinguished Guest',
      level_3_en: 'Estate Manager',
      level_4_en: 'Poetry Society Member',
      level_5_en: 'Manor Advisor',
      level_6_en: 'Redology Scholar',
      level_7_en: 'Grand Master',
      // Permission names
      permissionNames: {
        basic_reading: 'Basic Reading',
        simple_ai_qa: 'Simple AI Q&A',
        daily_tasks: 'Daily Tasks',
        basic_achievements: 'Basic Achievements',
        poetry_listening: 'Poetry Appreciation',
        expert_readings_basic: 'Expert Readings (Basic)',
        expert_readings_full: 'Expert Readings (Full)',
        garden_3d_view: '3D Garden Tour',
        advanced_ai_analysis: 'Advanced AI Analysis',
        character_relationship_map: 'Character Relationship Map',
        poetry_competition: 'Poetry Competition',
        study_group_create: 'Create Study Group',
        special_topics: 'Special Topics',
        mentor_role: 'Mentor Role',
        research_tools: 'Research Tools',
        annotation_publish: 'Publish Annotations',
        exclusive_events: 'Exclusive Events',
      },
      // Exclusive content names
      exclusiveContentNames: {
        intro_guide: 'Introduction Guide',
        character_intro_basic: 'Basic Character Introduction',
        daily_tasks_unlock: 'Daily Task System',
        achievement_system: 'Achievement System',
        character_profiles_basic: 'Basic Character Profiles',
        poetry_collection: 'Poetry Collection',
        expert_commentary_basic: 'Basic Expert Commentary',
        garden_3d_tour: '3D Grand View Garden Tour',
        character_relationships_basic: 'Basic Relationship Map',
        advanced_analysis_tools: 'Advanced Analysis Tools',
        character_psychology: 'Character Psychology Analysis',
        historical_context: 'Historical & Cultural Context',
        interactive_relationship_map: 'Interactive Relationship Map',
        poetry_competitions: 'Poetry Competition System',
        study_groups: 'Study Group Feature',
        advanced_poetry_tools: 'Advanced Poetry Analysis',
        cultural_deep_dive: 'Cultural Deep Dive',
        expert_commentary_full: 'Full Expert Commentary',
        special_topics: 'Special Topics Forum',
        mentor_system: 'Mentor System',
        exclusive_webinars: 'Expert Webinars',
        research_tools: 'Advanced Research Tools',
        annotation_system: 'Annotation Publishing',
        exclusive_archives: 'Exclusive Archives',
        expert_dialogue: 'Expert Dialogue',
        master_archives: 'Master Archives',
        exclusive_events: 'VIP Cultural Events',
        platform_governance: 'Platform Governance',
        legacy_content: 'Legacy Content Creation',
      },
    },
    community: {
      title: 'Redology Society',
      description: 'A place for users to communicate and share insights. Speak freely and explore the endless charm of "Dream of the Red Chamber" together.',
      writeNewPost: 'Write New Post',
      characterCount: 'Chars',
      noMatchingPosts: 'No matching posts found.',
      noPostsYet: 'No posts here yet. Be the first to post!',
      errorSearchNoResults: 'No posts found related to your search term.',
      newPostPlaceholder: 'Write New Post (Feature Demo)',
      commentLabel: 'Post a comment',
      anonymousUser: 'Anonymous User',
      placeholderInitialCommentAuthor1: "Lin Daiyu",
      placeholderInitialCommentText1: "Brother Bao Yu, your insights are profound. Qingwen's verse is indeed heartbreaking. 'A clear moon seldom met, colorful clouds easily scattered,' speaks volumes of her misfortune and sorrow.",
      placeholderInitialCommentAuthor2: "Xue Baochai",
      placeholderInitialCommentText2: "Xiren's verse, 'In vain gentle and compliant, empty as cassia and orchid,' is also quite thought-provoking. The characters' fates are so tragic, truly a dream of the red chamber, leaving one to sigh.",
      placeholderInitialCommentAuthor3: "Wang Xifeng",
      placeholderInitialCommentText3: "Mr. Yucun speaks wisely. When it comes to grandeur and expenses, our Jia family is indeed unparalleled. Even a simple tea snack has countless particularities.",
      postTagNew: 'New Post',
      showMore: 'More',
      showLess: 'Less',
    },
    readBook: {
      knowledgeGraphSheetTitle: 'Chapter Knowledge Graph',
      knowledgeGraphSheetDesc: 'Displays relationships between main concepts in this chapter. (Simulated graph, actual graph generated dynamically).',
      tocSheetTitle: 'Table of Contents',
      tocSheetDesc: 'Select a chapter to navigate quickly.',
      noteSheetTitle: 'Write Note',
      noteSheetDesc: 'Record your thoughts on the selected content.',
      aiSheetTitle: 'Ask AI',
      aiSheetDesc: 'Ask your questions about the selected text.',
      annotationAbbr: 'Note',
      vernacularPrefix: '(Vernacular) ',
      noContentSelected: 'No text selected',
      errorAIExplain: 'An error occurred while asking the AI.',
      errorAIMissingOutput: 'The AI model failed to generate a valid text explanation.',
      errorAIContextAnalysis: 'The AI model failed to generate a valid context analysis.',
    },
    notes: {
      dashboard: 'Notes Dashboard',
      dashboardDesc: 'Manage and view all your reading notes',
      totalNotes: 'Total Notes',
      chaptersCovered: 'Chapters Covered',
      totalWords: 'Total Words',
      publicNotes: 'Public Notes',
      shareToPublic: 'Share Publicly',
      yourNote: 'Your Note',
      enterNote: 'Enter your note here...',
      tags: 'Tags',
      addTag: 'Add Tag',
      chapter: 'Chapter',
      public: 'Public',
      words: 'words',
      searchPlaceholder: 'Search notes...',
      allChapters: 'All Chapters',
      allTime: 'All Time',
      last7Days: 'Last 7 Days',
      last30Days: 'Last 30 Days',
      last90Days: 'Last 90 Days',
      sortBy: 'Sort By',
      newest: 'Newest First',
      oldest: 'Oldest First',
      byChapter: 'By Chapter',
      byWordCount: 'By Word Count',
      clearFilters: 'Clear Filters',
      filterByTags: 'Filter by Tags',
      activeTags: 'Active Tags',
      showing: 'Showing',
      of: 'of',
      notes: 'notes',
      noNotes: 'No Notes Yet',
      noNotesDesc: 'You haven\'t written any notes yet. Start reading and record your thoughts!',
      startReading: 'Start Reading',
      noMatchingNotes: 'No Matching Notes',
      noMatchingNotesDesc: 'No notes found matching your filters. Try adjusting your filter criteria.',
      deleteSuccess: 'Note Deleted',
      deleteSuccessDesc: 'Your note has been successfully deleted.',
      deleteError: 'Delete Failed',
      updateSuccess: 'Note Updated',
      updateSuccessDesc: 'Your note has been successfully updated.',
      updateError: 'Update Failed',
      madePublic: 'Made Public',
      madePublicDesc: 'Your note is now visible to all users.',
      madePrivate: 'Made Private',
      madePrivateDesc: 'Your note is now only visible to you.',
      visibilityError: 'Visibility Change Failed',
      tagsUpdated: 'Tags Updated',
      tagsUpdatedDesc: 'Your note tags have been successfully updated.',
      tagsError: 'Tag Update Failed',
      fetchError: 'Failed to Load Notes',
      fetchPublicError: 'Failed to Load Public Notes',
      loginRequired: 'Login Required',
      loginRequiredDesc: 'Please log in to view and manage your notes.',
      publicNotesDesc: 'Explore public notes shared by other readers',
      noPublicNotes: 'No Public Notes Yet',
      noPublicNotesDesc: 'There are currently no public notes. Be the first to share your insights!',
      searchPublicNotes: 'Search public notes...',
      allTags: 'All Tags',
      confirmDelete: 'Confirm Delete',
    },
    pagination: {
      previous: 'Previous',
      next: 'Next',
      page: 'Page',
      of: 'of',
    },
    bookShelf: {
        hlmtimesedition: {
            title: 'Dream of the Red Chamber (3 Vol. Set)',
            author: 'China Times Publishing',
            description: 'The complete "Dream of the Red Chamber" published by China Times, in three volumes.',
        },
        hlmv3: {
            title: 'Dream of the Red Chamber (3rd Edition)',
            author: '[Qing] Cao Xueqin',
            description: 'Focuses on the tragic love story of Baoyu and Daiyu, depicting the life of aristocratic families in the Qing Dynasty.',
        },
        hlmchengjia: {
            title: 'Dream of the Red Chamber (Chengjia Edition Reprint)',
            author: '[Qing] Cao Xueqin, Gao E',
            description: 'One of the early printed editions of "Dream of the Red Chamber" compiled by Cheng Weiyuan and Gao E in the Qing Dynasty.',
        },
        hlmgengchen: {
            title: 'Dream of the Red Chamber (Gengchen Edition, Annotated)',
            author: '[Qing] Cao Xueqin; Annotated by Yu Pingbo',
            description: 'Based on the Gengchen manuscript, collated with various Zhipingben (manuscripts with commentary by Zhiyanzhai), with detailed annotations.',
        },
        hlmzhiyan: {
            title: 'Zhiyanzhai\'s Re-commentary on the Story of the Stone (Revised Edition)',
            author: '[Qing] Cao Xueqin; Commentary by Zhiyanzhai',
            description: 'A collection of early manuscripts with extensive commentary by Zhiyanzhai and others.',
        },
        hlmmenggao: {
            title: 'Dream of the Red Chamber (Menggao Manuscript, Edited Edition)',
            author: '[Qing] Cao Xueqin',
            description: 'Typeset and arranged based on the "Menggao manuscript," preserving the characteristics of early manuscripts.',
        },
        hlmanniversary: {
            title: 'Dream of the Red Chamber (Centennial Memorial Edition)',
            author: '[Qing] Cao Xueqin',
            description: 'A collector\'s edition commemorating a century of "Dream of the Red Chamber" research, featuring commentary from renowned scholars.',
        },
        jiangxunyouth: {
            title: 'Jiang Xun on Dream of the Red Chamber (Youth Edition)',
            author: 'Jiang Xun',
            description: 'Includes many illustrations alongside the text, significantly enhancing readability. Detailed explanations for each chapter with comfortable typesetting. Gentle writing style, accessible content, relatable to daily life, suitable for young readers.',
        },
        jiangxundream: {
            title: 'Jiang Xun\'s Dream of the Red Chamber',
            author: 'Jiang Xun',
            description: 'An introductory book to "Dream of the Red Chamber," serving as an overview before reading the novel. Understandable without extensive professional knowledge and strongly connected to life.',
        },
        jiangxunmicrodust: {
            title: 'Jiang Xun\'s Myriad Dust Motes (Characters of Red Chamber)',
            author: 'Jiang Xun',
            description: 'Also an introductory book, introducing various characters from "Dream of the Red Chamber" one by one.',
        },
        baixianyongdetailed: {
            title: 'Pai Hsien-yung\'s Detailed Talk on Dream of the Red Chamber',
            author: 'Pai Hsien-yung (Bai Xianyong)',
            description: 'Also provides detailed explanations for each chapter, differing from Jiang Xun by focusing less on daily life aspects. Offers comprehensive, in-depth, and thought-provoking analysis from a different perspective. Requires some background in Chinese literature. Contains both text and illustrations.',
        },
        oulijuansixviews: {
            title: 'Ou Lijuan\'s Six Perspectives on Red Chamber (Comprehensive Volume) & Public Lectures',
            author: 'Ou Lijuan',
            description: 'Suitable for those who have read the entire novel and have a relatively holistic understanding. More academic, focusing on thematic research.',
        },
        dongmeithorough: {
            title: 'Dong Mei\'s Thorough Explanation of Dream of the Red Chamber',
            author: 'Dong Mei',
            description: 'Strikes a balance between daily life and academic analysis. Slightly more accessible than Pai Hsien-yung\'s work. Thematic explanations covering various angles like life aesthetics, literary masterpiece, and life symbols to understand the novel.',
        },
    },
    chapterContent: {
      ch1: {
        title: 'Chapter 1: Zhen Shiyin in a Dream Sees the Jade of Spiritual Understanding; Jia Yucun in Dusty Travels Yearns for Beauties',
        subtitle: 'Dream of the Red Chamber: 3rd Edition (Chinese Classical Literature Reader Series)',
        summary: 'This chapter primarily recounts Zhen Shiyin\'s dream encounter with a monk and a Daoist discussing the Stone\'s descent to the mortal realm for tribulation, and Jia Yucun\'s destitution and rise. Zhen Shiyin, after his daughter Yinglian is abducted and his house burns down, sees through the vanity of the world and follows a lame Daoist to become a monk, highlighting the novel\'s creative principle of "true events are hidden, false words remain" and its "dream-like" tone.',
      },
      ch_generic: {
        title: 'Chapter {chapterNum}: Sample Title {chapterNum}',
        subtitle: 'Dream of the Red Chamber Sample Subtitle {chapterNum}',
        summary: 'This is the summary for Chapter {chapterNum}. This chapter mainly tells about events like [brief description], showcasing [main character]\'s [traits or experiences].',
      }
    }
  },
};

// Helper function to get deeply nested translations
export function getTranslation(lang: Language, key: string, translationsObj: Record<Language, Translations>): string {
  const langTranslations = translationsObj[lang] || translationsObj[DEFAULT_LANGUAGE];
  const keys = key.split('.');
  let result: any = langTranslations;

  for (const k of keys) {
    result = result?.[k];
    if (result === undefined) {
      // Fallback to default language if key not found in current language
      let fallbackResult: any = translationsObj[DEFAULT_LANGUAGE];
      for (const fk of keys) {
        fallbackResult = fallbackResult?.[fk];
        if (fallbackResult === undefined) {
          // console.warn(`Translation key "${key}" not found in language "${lang}" or default language.`);
          // Replace {chapterNum} if present in the key for generic fallbacks
          if (key.includes("{chapterNum}")) {
             const chapterNumMatch = key.match(/ch(\d+)\./) || key.match(/ch_generic\.title\.replace\('\{chapterNum\}', '(\d+)'\)/);

             let numStr = "N";
             if(chapterNumMatch && chapterNumMatch[1]) {
                numStr = chapterNumMatch[1];
             } else {
                 const parts = key.split('.');
                 const lastPart = parts[parts.length-1];
                 if(lastPart.startsWith("ch") && !lastPart.includes("_")){
                     numStr = lastPart.substring(2);
                 }
             }
             return key.replace(/{chapterNum}/g, numStr);
          }
          return key; // Return the key itself if not found anywhere
        }
      }
       // Replace {chapterNum} if present in the fallback for generic fallbacks
      if (typeof fallbackResult === 'string' && fallbackResult.includes("{chapterNum}")) {
          const chapterNumMatch = key.match(/ch(\d+)\./) || key.match(/ch_generic\.title\.replace\('\{chapterNum\}', '(\d+)'\)/);
          let numStr = "N";
          if(chapterNumMatch && chapterNumMatch[1]) {
             numStr = chapterNumMatch[1];
          } else {
              const parts = key.split('.');
              const lastPart = parts[parts.length-1];
              if(lastPart.startsWith("ch") && !lastPart.includes("_")){
                  numStr = lastPart.substring(2);
              }
          }
          return fallbackResult.replace(/{chapterNum}/g, numStr);
      }
      return fallbackResult as string;
    }
  }

  // Replace {chapterNum} if present in the result for generic fallbacks
  if (typeof result === 'string' && result.includes("{chapterNum}")) {
      const chapterNumMatch = key.match(/ch(\d+)\./) || key.match(/ch_generic\.title\.replace\('\{chapterNum\}', '(\d+)'\)/);
      let numStr = "N";
      if(chapterNumMatch && chapterNumMatch[1]) {
         numStr = chapterNumMatch[1];
      } else {
          const parts = key.split('.');
          const lastPart = parts[parts.length-1];
          if(lastPart.startsWith("ch") && !lastPart.includes("_")){
              numStr = lastPart.substring(2);
          }
      }
      return result.replace(/{chapterNum}/g, numStr);
  }
  return result as string;
}

