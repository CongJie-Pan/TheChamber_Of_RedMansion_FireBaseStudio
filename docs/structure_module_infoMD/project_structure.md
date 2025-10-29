# Project Structure & Architectural Overview

## 1. Project Overview

The Chamber of Red Mansion is an AI-powered educational web platform designed to help students and literature enthusiasts explore the Chinese classical novel "Dream of the Red Chamber" (紅樓夢). The platform combines modern AI technology with traditional literature to create an interactive, gamified learning experience that includes intelligent reading assistance, community discussions, daily learning tasks, and comprehensive progress tracking. The primary users are Chinese literature students and enthusiasts who seek a deeper understanding through AI-enhanced analysis, multi-language support, and social learning features.

## 2. Architectural Principles

This project follows a **Component-Driven Architecture with AI Enhancement** pattern, organized around the following core principles:

* **Layered Architecture with Clear Separation of Concerns:**
  * **AI Orchestration Layer** (`/src/ai/`): Isolated AI workflows using Google GenKit framework. This separation allows AI capabilities to evolve independently without affecting UI or business logic.
  * **Presentation Layer** (`/src/app/`, `/src/components/`): Next.js 15 App Router with React Server Components for optimal performance and SEO. UI components are isolated in `/src/components/` following atomic design principles.
  * **Business Logic Layer** (`/src/lib/`): Core services handling authentication, content filtering, task management, and user progression. This layer acts as the bridge between UI and data/AI layers.
  * **Data Layer - Dual-Mode Architecture** (`/src/lib/repositories/`, Firebase): Hybrid data persistence using SQLite for local-first operations with Firebase Firestore fallback for cloud synchronization. Services attempt SQLite operations first for optimal performance, automatically falling back to Firebase if SQLite is unavailable or fails, ensuring reliability while maintaining backward compatibility.

* **Service-Oriented Architecture for Business Logic:**
  * Each service in `/src/lib/` is a self-contained module with a single responsibility (e.g., `daily-task-service.ts`, `community-service.ts`, `content-filter-service.ts`).
  * Services communicate through well-defined interfaces and are independently testable.
  * This modularity enables parallel development and easier maintenance.

* **Repository Pattern for Data Access:**
  * Data access logic is isolated in repository modules (`/src/lib/repositories/`) separating database operations from business logic.
  * Repositories use prepared statements for SQL injection prevention and provide consistent CRUD interfaces across different data types.
  * This abstraction enables database migrations, simplifies testing with in-memory SQLite, and allows services to remain agnostic of underlying storage implementation.

* **AI-First Design Philosophy:**
  * AI capabilities are not bolted on but deeply integrated into the core user experience.
  * Each AI flow in `/src/ai/flows/` represents a specific educational use case (text explanation, character analysis, task generation, etc.).
  * AI is used for content generation, assessment, and personalization throughout the platform.

* **Test-Driven Quality Assurance:**
  * Comprehensive test coverage (77.37% overall services, 100% pass rate with 146+ tests including repository layer) ensures reliability.
  * Tests mirror the `/src` structure in `/tests`, making it easy to locate and maintain test files.
  * Critical services like content filtering, community management, and data repositories have extensive test suites with 75+ repository-specific tests.

* **Internationalization by Design:**
  * Multi-language support (Traditional Chinese, Simplified Chinese, English) is built into the architecture from the ground up.
  * Translation system (`/src/lib/translations.ts`) with 1000+ keys ensures complete coverage.
  * Language context is available globally through React Context API.

## 3. Top-Level Directory Breakdown

```
/
├── .claude/
│   └── settings.local.json   # Claude Code configuration for AI-assisted development
├── .vscode/                   # Shared VSCode settings for team development consistency
├── docs/                      # All project documentation
│   ├── structure_module_infoMD/     # Architectural documentation (this file)
│   ├── Gaming Mechanism/            # Gamification design specifications
│   ├── improvement_report/          # Enhancement reports and analysis
│   ├── testing/                     # Test strategies and reports
│   ├── setup/                       # Setup and deployment guides
│   └── *.md                         # System overviews and planning documents
├── src/                       # Main application source code
│   ├── ai/                    # AI orchestration and GenKit flows
│   │   ├── genkit.ts          # Core AI configuration (Gemini 2.0 Flash setup)
│   │   ├── dev.ts             # AI development server entry point
│   │   ├── perplexity-config.ts    # Perplexity API integration config
│   │   └── flows/             # Isolated AI workflow implementations
│   │       ├── explain-text-selection.ts        # Contextual text analysis
│   │       ├── context-aware-analysis.ts        # Reading context intelligence
│   │       ├── interactive-character-relationship-map.ts  # Character insights
│   │       ├── daily-reading-comprehension.ts   # Daily task: comprehension
│   │       ├── poetry-quality-assessment.ts     # Daily task: poetry grading
│   │       ├── character-analysis-scoring.ts    # Daily task: character analysis
│   │       ├── cultural-quiz-grading.ts         # Daily task: quiz assessment
│   │       ├── commentary-interpretation.ts     # Daily task: commentary analysis
│   │       └── perplexity-red-chamber-qa.ts     # External knowledge Q&A
│   ├── app/                   # Next.js 15 App Router (file-based routing)
│   │   ├── layout.tsx         # Root layout with auth/language providers
│   │   ├── page.tsx           # Public landing page
│   │   ├── globals.css        # Global styles (dark theme, fonts)
│   │   ├── login/             # Authentication pages (public)
│   │   ├── register/          # User registration (public)
│   │   ├── (main)/            # Protected routes (authentication required)
│   │   │   ├── layout.tsx     # Protected area layout with AppShell
│   │   │   ├── dashboard/     # User progress overview
│   │   │   ├── read/          # Book selection library
│   │   │   ├── read-book/     # Interactive reading interface (core feature)
│   │   │   ├── community/     # Social learning and discussions
│   │   │   ├── achievements/  # Gamification and progress tracking
│   │   │   ├── daily-tasks/   # Daily learning challenges
│   │   │   ├── notes/         # User note-taking system
│   │   │   └── account-settings/  # User profile management
│   │   └── api/               # API routes for server-side logic
│   │       ├── chapters/      # Chapter data and knowledge graphs
│   │       ├── daily-tasks/   # Task generation and submission endpoints
│   │       ├── perplexity-qa-stream/  # Streaming Q&A responses
│   │       └── cron/          # Scheduled tasks (daily resets)
│   ├── components/            # Reusable React components
│   │   ├── ui/                # 33 Radix UI + Shadcn/ui primitives
│   │   │   ├── button.tsx, card.tsx, dialog.tsx, etc.  # Core UI elements
│   │   │   ├── AIMessageBubble.tsx          # AI response display
│   │   │   ├── ConversationFlow.tsx         # Chat interface
│   │   │   ├── StructuredQAResponse.tsx     # Formatted Q&A display
│   │   │   └── ThinkingProcessIndicator.tsx # AI processing feedback
│   │   ├── gamification/      # Gamification components
│   │   │   ├── LevelBadge.tsx           # User level display
│   │   │   ├── LevelProgressBar.tsx     # XP progress visualization
│   │   │   └── LevelUpModal.tsx         # Level-up celebrations
│   │   ├── daily-tasks/       # Daily task components
│   │   │   ├── TaskCard.tsx             # Individual task display
│   │   │   ├── StreakCounter.tsx        # Streak tracking
│   │   │   ├── TaskCalendar.tsx         # Task history calendar
│   │   │   └── DailyTasksSummary.tsx    # Overview dashboard
│   │   └── layout/            # Layout components
│   │       └── AppShell.tsx   # Main app navigation and structure
│   ├── lib/                   # Core business services and utilities
│   │   ├── firebase.ts        # Firebase client configuration
│   │   ├── firebase-admin.ts  # Firebase Admin SDK (server-side)
│   │   ├── env.ts             # Environment variable validation
│   │   ├── translations.ts    # 1000+ translation keys (i18n system)
│   │   ├── utils.ts           # Common utility functions
│   │   ├── content-filter-service.ts      # Automated content moderation (91.51% coverage)
│   │   ├── community-service.ts           # Community management (62.96% coverage)
│   │   ├── daily-task-service.ts          # Task lifecycle management
│   │   ├── ai-task-content-generator.ts   # AI-powered task creation
│   │   ├── ai-feedback-generator.ts       # AI-powered feedback generation
│   │   ├── task-evaluator.ts              # Task submission evaluation
│   │   ├── task-difficulty-adapter.ts     # Adaptive difficulty system
│   │   ├── user-level-service.ts          # XP and leveling system
│   │   ├── notes-service.ts               # Note-taking functionality (dual-mode: SQLite + Firebase)
│   │   ├── highlight-service.ts           # Text highlighting (dual-mode: SQLite + Firebase)
│   │   ├── openai-client.ts               # OpenAI API integration
│   │   ├── perplexity-client.ts           # Perplexity API integration
│   │   ├── perplexity-error-handler.ts    # Error handling for external APIs
│   │   ├── citation-processor.ts          # Citation parsing and formatting
│   │   ├── terminal-logger.ts             # Development logging utility
│   │   ├── repositories/      # Data access layer (SQLite operations)
│   │   │   ├── highlight-repository.ts    # Highlight CRUD operations (270 lines, 8 functions)
│   │   │   ├── note-repository.ts         # Note CRUD operations (470 lines, 14 functions)
│   │   │   └── [future repositories]      # Progress, task, user repositories (Phase 3+)
│   │   └── config/            # Configuration schemas
│   │       └── daily-task-schema.ts       # Task data validation
│   ├── context/               # React Context providers (global state)
│   │   ├── AuthContext.tsx    # Firebase authentication state
│   │   └── LanguageContext.tsx # i18n language state
│   ├── hooks/                 # Custom React hooks
│   │   ├── useAuth.ts         # Authentication hook
│   │   ├── useLanguage.ts     # Language switching hook
│   │   └── use-mobile.tsx     # Responsive design hook
│   ├── types/                 # TypeScript type definitions
│   │   └── perplexity-qa.ts   # Q&A system types
│   ├── styles/                # Additional stylesheets
│   │   └── qa-module.css      # Q&A module styles
│   └── data/                  # Static data and fixtures
│       └── chapterGraph/      # Knowledge graph data
├── tests/                     # Test suite (146+ tests, 100% pass rate)
│   ├── lib/                   # Service layer tests (mirrors /src/lib/)
│   │   ├── content-filter-service.test.ts     # Content moderation tests
│   │   ├── community-service.test.ts          # Community feature tests
│   │   ├── openai-client.test.ts              # OpenAI integration tests
│   │   ├── ai-task-content-generator.test.ts  # Task generation tests
│   │   ├── ai-feedback-generator.test.ts      # Feedback generation tests
│   │   └── repositories/      # Repository layer tests (75+ tests)
│   │       ├── highlight-repository.test.ts   # Highlight repo tests (25+ tests, 420 lines)
│   │       └── note-repository.test.ts        # Note repo tests (50+ tests, 700 lines)
│   └── setup/                 # Test configuration
│       └── jest.setup.js      # Jest configuration and mocks
├── coverage/                  # Test coverage reports (HTML & JSON)
│   ├── lcov-report/           # Human-readable coverage report
│   └── coverage-final.json    # Machine-readable coverage data
├── test-output/               # Automated test results and logs
├── scripts/                   # Development and maintenance scripts
│   ├── test-ai-logging.ts     # AI logging validation script
│   └── migrations/            # Data migration scripts (Firebase → SQLite)
│       ├── base-migrator.ts       # Reusable migration framework (abstract class)
│       ├── migrate-highlights.ts  # Highlight migration (200+ lines, batch processing)
│       └── migrate-notes.ts       # Note migration (280+ lines, feature preservation)
├── community-backend/         # Backend service for community features
├── sqlite/                    # SQLite database files (gitignored)
│   └── local.db               # Local SQLite database (highlights, notes, future: all user data)
├── logs/                      # Application logs (development)
├── temp/                      # Temporary files (gitignored)
├── types/                     # Global TypeScript declarations
├── public/                    # Static assets (images, fonts, etc.)
├── .next/                     # Next.js build output (gitignored)
├── node_modules/              # npm dependencies (gitignored)
├── package.json               # Project dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── next.config.ts             # Next.js configuration
├── tailwind.config.ts         # Tailwind CSS configuration
├── jest.config.js             # Jest testing configuration
├── .gitignore                 # Git ignore patterns
├── .env.local                 # Environment variables (gitignored, create from .env.example)
├── CLAUDE.md                  # Development guidelines for Claude Code
└── README.md                  # Quick-start guide and project overview
```

## 4. Modules

This section provides a complete listing of all modules in the codebase with two-sentence summaries explaining their purpose and implementation.

### AI Orchestration Modules (`/src/ai/`)

**genkit.ts** - Configures the core AI framework using Google GenKit with Gemini 2.0 Flash model for all AI operations in the platform. This module serves as the central AI initialization point that all other AI flows depend on for model access and configuration.

**perplexity-config.ts** - Provides configuration and setup for integrating Perplexity API to access external knowledge sources beyond the classical text. This enables users to ask questions that require contemporary scholarly research and real-time information retrieval.

### AI Flow Modules (`/src/ai/flows/`)

**explain-text-selection.ts** - Provides contextual AI-powered explanations for user-selected text passages from the novel using traditional Chinese analysis. This flow analyzes the literary context, historical background, and linguistic nuances to help readers understand complex classical Chinese prose.

**context-aware-analysis.ts** - Delivers intelligent analysis that adapts based on the user's current reading position, progress level, and historical interaction patterns. This module personalizes the learning experience by considering what the user has already learned and their comprehension level.

**interactive-character-relationship-map.ts** - Generates dynamic AI insights about character relationships, motivations, and development arcs throughout the novel's 120 chapters. This flow helps readers navigate the complex web of over 400 characters by highlighting key relationships and their evolution.

**daily-reading-comprehension.ts** - Evaluates and grades user responses to daily reading comprehension tasks using AI-powered assessment criteria. This module analyzes answer quality, depth of understanding, and textual evidence to provide detailed feedback and scoring.

**poetry-quality-assessment.ts** - Assesses user-created poetry or poetry analysis submissions using traditional Chinese literary criticism standards. This flow evaluates metrics like structural adherence, tonal patterns, imagery usage, and thematic coherence based on classical poetry conventions.

**character-analysis-scoring.ts** - Grades user-submitted character analyses by evaluating textual evidence, psychological insights, and literary interpretation depth. This module uses AI to assess how well users understand character motivations, development, and symbolic significance within the narrative.

**cultural-quiz-grading.ts** - Automatically evaluates multiple-choice and short-answer cultural knowledge quizzes about Qing Dynasty customs, social hierarchy, and historical context. This flow provides instant feedback and explanations to reinforce cultural literacy essential for understanding the novel.

**commentary-interpretation.ts** - Grades user interpretations of scholarly commentaries and critical analyses from famous Red Chamber scholars. This module assesses comprehension of literary criticism and ability to synthesize multiple scholarly perspectives.

**perplexity-red-chamber-qa.ts** - Streams AI-powered answers to user questions by leveraging Perplexity API's access to contemporary scholarly articles and research. This flow bridges classical literature with modern academic discourse, providing citations and contemporary interpretations.

### Application Pages (`/src/app/`)

**page.tsx (Homepage)** - Public landing page featuring a fully internationalized marketing interface with AI-enhanced classical literature learning. This module implements a comprehensive homepage with hero section (National Palace Museum imagery), 6 core feature cards (AI analysis, character maps, annotations, community, progress tracking, poetry), 3 content preview sections (character garden, chapter navigation, poetry appreciation), learning statistics display, and call-to-action sections. All text content uses the translation system (`t()` function) to support dynamic language switching between Traditional Chinese, Simplified Chinese, and English. Images are sourced from National Palace Museum (theme.npm.edu.tw) for cultural authenticity and reliability, replacing previous Unsplash dependencies that had loading issues. The page leverages `useLanguage` hook for real-time language switching without page reload, with all UI elements (buttons, headings, descriptions, stats) responding immediately to language changes. Implementation uses data-driven approach with `features`, `stats`, and `contentPreviews` arrays that pull translated content from `translations.ts` (60+ translation keys under `page.*` namespace). The component follows responsive design principles with mobile-first approach, featuring animated loading transitions, scroll indicators, and hover effects for enhanced user engagement.

**layout.tsx (Root)** - Root layout component wrapping the entire application with essential providers including AuthProvider for authentication state, LanguageProvider for multilingual support, and global styling configuration. This module sets up HTML document structure with language attributes that update dynamically based on user preference, includes Font Awesome CDN for icons, and configures metadata for SEO optimization.

### Core Service Modules (`/src/lib/`)

**firebase.ts** - Initializes and configures Firebase client SDK for authentication, Firestore database access, and real-time data synchronization. This module provides the foundational connection to all backend services used throughout the application.

**firebase-admin.ts** - Configures Firebase Admin SDK for privileged server-side operations including user management, database writes, and security rule enforcement. This module enables secure backend operations that require elevated permissions beyond client-side capabilities.

**env.ts** - Validates and type-checks all environment variables required for the application using Zod schemas to ensure runtime safety. This module prevents deployment failures by catching configuration errors early and providing clear error messages for missing or invalid environment variables.

**translations.ts** - Implements the comprehensive internationalization (i18n) system with 1000+ translation keys supporting Traditional Chinese, Simplified Chinese, and English. This module provides the translation function used throughout the application to ensure complete multilingual support for all user-facing text.

**utils.ts** - Provides common utility functions including className merging (cn), date formatting, string manipulation, and other shared helper functions. This module promotes code reuse and consistency by centralizing frequently-used operations that span multiple features.

### Type Definition Modules (`/src/types/`)

**chinese-window.ts** - Defines TypeScript types and configurations for traditional Chinese window frame shapes used in navigation components (~120 lines). Provides WindowShape union type, WindowFrameConfig interface, and WINDOW_SHAPES constant mapping with cultural descriptions. Includes helper functions getWindowFrameConfig() and getWindowClipPath() for accessing shape configurations. Each shape includes Chinese name (月門, 六角窗, 八角窗, 四葉窗), cultural symbolism explanation, and CSS clip-path value for efficient rendering.

**content-filter-service.ts** - Implements enterprise-grade automated content moderation with real-time profanity detection, hate speech identification, spam filtering, and personal information masking. This module ensures community safety by automatically screening all user-generated content across posts, comments, and notes using multi-language pattern matching (Traditional Chinese and English) with 91.51% test coverage.

**community-service.ts** - Manages all social learning features including post creation, commenting, reactions, bookmarking, and user interactions with integrated content filtering. This module serves as the central orchestrator for community features, automatically applying content moderation to maintain a safe and scholarly discussion environment with 62.96% test coverage.

**daily-task-service.ts** - Orchestrates the complete lifecycle of daily learning tasks including generation, distribution, submission, evaluation, and streak tracking. This module coordinates between AI task generation, user progress tracking, and the gamification system to provide personalized daily challenges that adapt to user skill levels.

**ai-task-content-generator.ts** - Generates diverse daily task content using AI including comprehension questions, poetry challenges, character analyses, cultural quizzes, and commentary interpretations. This module ensures fresh, varied, and contextually appropriate learning challenges by leveraging AI to create unique tasks tailored to user progress and preferences.

**ai-feedback-generator.ts** - Creates detailed, constructive AI-powered feedback for user task submissions including praise for strengths, guidance for improvement, and learning recommendations. This module personalizes the feedback experience by considering user level, task difficulty, and performance history to motivate continued learning.

**task-evaluator.ts** - Routes task submissions to appropriate AI evaluation flows and coordinates the grading process across different task types. This module serves as the central dispatcher that determines which AI flow to use based on task type and manages the evaluation workflow from submission to final scoring.

**task-difficulty-adapter.ts** - Implements adaptive difficulty algorithms that adjust task complexity based on user performance history, streak data, and skill progression. This module ensures optimal challenge levels by making tasks harder as users improve and providing easier tasks when users struggle, maintaining engagement through appropriate difficulty.

**user-level-service.ts** - Manages the gamification system including XP calculation, level progression, achievement unlocking, and reward distribution. This module tracks all user accomplishments and translates them into tangible progression metrics that motivate continued platform engagement through visible achievement milestones.

**notes-service.ts** - Provides note-taking functionality with dual-mode architecture (SQLite-first with Firebase fallback) including creation, editing, tagging, searching, highlighting association, and public/private visibility controls. This module integrates with note-repository for local SQLite operations, automatically falling back to Firebase when SQLite is unavailable, enabling users to build their personal scholarly knowledge base with optimal performance and reliability.

**highlight-service.ts** - Manages text highlighting features with dual-mode architecture (SQLite-first with Firebase fallback) allowing users to mark important passages, add color-coded categories, and link highlights to notes. This module integrates with highlight-repository for local SQLite operations while maintaining backward compatibility with Firebase, supporting active reading through visual annotation and organization of key textual moments.

**openai-client.ts** - Provides a configured client for OpenAI API integration used for supplementary AI features beyond GenKit's capabilities. This module handles API key management, request formatting, error handling, and response parsing for OpenAI-powered features.

**perplexity-client.ts** - Implements the Perplexity API client for accessing external knowledge sources and contemporary scholarly research with streaming support. This module enables real-time question answering that goes beyond the novel's text by leveraging current academic discourse and research databases.

**perplexity-error-handler.ts** - Provides specialized error handling and retry logic for Perplexity API calls including rate limiting, network failures, and malformed responses. This module ensures robust external API integration by gracefully handling failures and providing fallback behaviors to maintain user experience.

**citation-processor.ts** - Parses, formats, and validates citations returned from Perplexity API responses to ensure proper academic attribution. This module transforms raw citation data into user-friendly formatted references that support scholarly rigor and enable users to verify AI-generated information.

**terminal-logger.ts** - Implements development logging utilities that output detailed debugging information to the terminal during development and testing. This module aids debugging by providing structured, color-coded logs for AI operations, API calls, and service interactions visible in the development environment.

**task-generator.ts** - Coordinates the task generation pipeline by selecting appropriate task types, determining difficulty levels, and triggering AI content generation. This module implements the business logic for when and what types of tasks to generate based on user schedules, preferences, and learning objectives.

**knowledgeGraphUtils.ts** - Provides utility functions for processing, transforming, and querying the chapter-level knowledge graph data that maps character appearances and relationships. This module enables the knowledge graph visualization features by preparing data structures that represent narrative connections across chapters.

### Repository Modules (`/src/lib/repositories/`)

**highlight-repository.ts** - Implements SQLite data access layer for highlights with comprehensive CRUD operations (create, get, delete, batch) using prepared statements for SQL injection prevention. This module provides 8 functions (270 lines) including batch operations for efficient bulk inserts, count queries for statistics, and proper error handling. All operations use parameterized queries and are fully tested with 25+ unit tests covering normal operations, edge cases, and error scenarios.

**note-repository.ts** - Implements SQLite data access layer for notes with full CRUD operations and advanced querying capabilities including tags (JSON arrays), public/private visibility, and user-specific filtering. This module provides 14 functions (470 lines) with automatic word count calculation, comprehensive tag support, batch operations for migration efficiency, and conditional queries (by user, by chapter, by tags, public visibility). All operations use prepared statements and are validated through 50+ comprehensive unit tests.

### Migration Script Modules (`/scripts/migrations/`)

**base-migrator.ts** - Provides an abstract migration framework implementing reusable patterns for Firebase-to-SQLite data migrations including batch processing, validation, dry-run mode, integrity checks, and progress logging. This base class enables consistent migration implementations by providing configurable batch sizes (default: 500 records), validation callbacks, error handling with statistics tracking, and migration summary reporting.

**migrate-highlights.ts** - Implements Firebase-to-SQLite migration for highlight records using the BaseMigrator framework with batch processing, validation, and integrity verification. This script (200+ lines) fetches all highlights from Firestore, validates required fields (userId, chapterId, text, color), transforms timestamps to Unix format, performs batch inserts using highlight-repository, and verifies data integrity with count checks. Supports --dry-run, --verbose, and --no-validate flags for flexible migration execution.

**migrate-notes.ts** - Implements Firebase-to-SQLite migration for note records with feature preservation including tags (JSON arrays), visibility settings, word counts, and note types. This script (280+ lines) extends BaseMigrator to handle complex note features, provides detailed feature statistics (tags usage, public notes percentage, average word count), validates all note fields including optional features, and performs comprehensive verification of feature preservation after migration (tags, visibility, types).

### Configuration Modules (`/src/lib/config/`)

**daily-task-schema.ts** - Defines Zod validation schemas for all daily task data structures ensuring type safety and runtime validation across task creation, submission, and evaluation. This module serves as the single source of truth for task data contracts, preventing data inconsistencies and enabling confident refactoring.

### React Context Modules (`/src/context/`)

**AuthContext.tsx** - Manages global authentication state using Firebase Authentication with React Context, providing user session data throughout the component tree. This module eliminates prop drilling by making authentication status, user profile, and auth methods accessible to any component that needs them.

**LanguageContext.tsx** - Manages global language preference state with localStorage persistence, enabling dynamic language switching across the entire application. This module coordinates with the translation system to re-render all UI text when users change their preferred language between Traditional Chinese, Simplified Chinese, or English.

### Custom Hook Modules (`/src/hooks/`)

**useAuth.ts** - Provides a convenient React hook for accessing authentication state and methods from AuthContext with TypeScript type safety. This hook simplifies authentication-related logic in components by providing a clean API for checking login status, getting user data, and performing auth operations.

**useLanguage.ts** - Provides a React hook for accessing the current language, translation function, and language switching capability. This hook enables components to display translated text and respond to language changes without directly interacting with the LanguageContext.

**use-mobile.tsx** - Implements a responsive design hook that detects mobile devices and screen size changes using media queries. This hook enables components to adapt their rendering and behavior based on viewport size, ensuring optimal user experience across desktop and mobile devices.

### UI Component Modules (`/src/components/ui/`)

**Core UI Components** - Provides 33+ reusable interface components built on Radix UI primitives including buttons, cards, dialogs, inputs, selects, and form controls. These components ensure consistent styling, accessibility, and behavior across the entire application through a centralized component library based on the Shadcn/ui design system.

**chinese-window-nav-button.tsx** - Specialized navigation button component featuring traditional Chinese window frame effects on hover. Implements geometric frames (月門 moon gate, 六角窗 hexagonal, 八角窗 octagonal, 四葉窗 quatrefoil) using CSS clip-path with smooth animations (~200 lines). Designed for AppShell sidebar navigation, provides cultural authenticity through "borrowed scenery" (借景) aesthetic principles while maintaining modern UX standards with full keyboard navigation and accessibility support.

**AI Interaction Components** - Includes specialized components like AIMessageBubble, ConversationFlow, StructuredQAResponse, and ThinkingProcessIndicator for displaying AI responses and managing chat interfaces. These components handle the unique requirements of AI-powered features including streaming responses, structured data display, and loading states.

### Gamification Component Modules (`/src/components/gamification/`)

**LevelBadge.tsx** - Displays user level badges with rank-appropriate styling, icons, and animations that reflect achievement status. This component provides visual recognition of user progression and creates a sense of accomplishment through attractive, game-like level indicators.

**LevelProgressBar.tsx** - Renders animated XP progress bars showing current experience points and progress toward the next level with percentage indicators. This component provides constant feedback on advancement, motivating users by making progression visible and tangible.

**LevelUpModal.tsx** - Creates celebratory modal dialogs that appear when users level up, featuring animations, achievement summaries, and reward notifications. This component enhances the gamification experience by providing memorable moments of recognition that reinforce positive learning behaviors.

**LevelDisplay.tsx** - Combines level badge, progress bar, and XP statistics into a unified display component for user profiles and dashboards. This component serves as the primary interface for users to monitor their overall progression and achievement status at a glance.

### Daily Task Component Modules (`/src/components/daily-tasks/`)

**TaskCard.tsx** - Displays individual daily task cards with task type icons, difficulty indicators, XP rewards, and action buttons for starting tasks. This component serves as the primary interface for users to discover and engage with daily learning challenges through an attractive, informative card design.

**TaskModal.tsx** - Implements the full-screen task interaction interface where users read task prompts, submit answers, and receive feedback. This component manages the entire task completion workflow including input validation, submission handling, and integration with the evaluation system.

**TaskResultModal.tsx** - Displays task evaluation results including scores, detailed AI feedback, XP earned, and learning recommendations after task completion. This component transforms raw evaluation data into an encouraging, informative presentation that celebrates success and provides guidance for improvement.

**StreakCounter.tsx** - Visualizes user learning streaks with day counters, flame icons, and motivational messages to encourage daily engagement. This component leverages behavioral psychology by making consecutive daily participation visible and rewarding, increasing user retention.

**TaskCalendar.tsx** - Renders a calendar view showing task completion history with color-coded indicators for completed, missed, and perfect score days. This component provides long-term progress visibility and helps users identify patterns in their learning consistency.

**DailyTasksSummary.tsx** - Aggregates and displays comprehensive daily task statistics including completion rates, average scores, XP earned, and streak milestones. This component serves as the analytics dashboard for the daily task system, helping users understand their overall performance trends.

### Layout Component Modules (`/src/components/layout/`)

**AppShell.tsx** - Implements the main application shell with navigation sidebar featuring traditional Chinese window frame effects, header, responsive menu, and content area layout for all protected pages. This component provides consistent navigation structure with cultural aesthetics through ChineseWindowNavButton components, ensuring authenticated users have access to all platform features through a unified, visually enhanced interface. Each navigation item is configured with symbolic window shapes (circular for completeness, hexagonal for exploration, octagonal for challenge, quatrefoil for cycles) that activate on hover with elegant CSS animations.

### Specialized Feature Components (`/src/components/`)

**KnowledgeGraphViewer.tsx** - Renders interactive D3.js-based network visualizations of character relationships and narrative connections across chapters. This component transforms complex relational data into explorable visual networks that help users understand the novel's intricate character web.

**SimulatedKnowledgeGraph.tsx** - Provides a simplified version of the knowledge graph for demonstration and fallback purposes when full graph data is unavailable. This component ensures users can still access visual relationship information even with limited data or during development.

**CharacterGarden.tsx** - Displays an artistic garden-themed visualization where characters are represented as interactive elements with relationship connections. This component gamifies character exploration by presenting the novel's cast in an engaging, metaphorical visual environment.

**NoteCard.tsx** - Renders individual note cards with content preview, tags, timestamps, edit/delete actions, and highlight associations. This component serves as the primary interface for managing personal scholarly notes within the note-taking system.

**NoteFilters.tsx** - Provides filtering and sorting controls for the note collection including tag filters, date ranges, and search functionality. This component enables users to efficiently navigate large note collections and find specific insights quickly.

**NoteStats.tsx** - Displays analytics about note-taking activity including total notes, most-used tags, and note creation patterns. This component helps users understand their scholarly annotation habits and identify areas of interest.

**PublicNotesTab.tsx** - Implements the interface for browsing and interacting with notes that other users have chosen to make public. This component facilitates collaborative learning by enabling knowledge sharing and community-driven scholarly discourse.

**HorizontalScrollContainer.tsx** - Provides a customized horizontal scrolling component with smooth animations and touch gesture support for card-based layouts. This component enhances mobile and desktop user experience for browsing collections of items like books, achievements, or task cards.

**ChunkErrorBoundary.tsx** - Implements React error boundaries with retry logic specifically designed to handle Next.js chunk loading failures and client-side hydration errors. This component improves reliability by gracefully recovering from common Next.js deployment and network issues without crashing the entire application.

**HydrationDebugger.tsx** - Provides development tools for debugging React hydration mismatches between server-rendered and client-rendered content. This component assists developers in identifying and resolving SSR/CSR inconsistencies during development.

**UserProfile.tsx** - Displays comprehensive user profile information including avatar, username, level, statistics, and achievement badges. This component serves as the user identity card visible in community features and profile pages.

**WindowFrameNavigation.tsx** - Implements a decorative window-frame styled navigation component that matches the platform's classical Chinese aesthetic theme. This component enhances visual cohesion by applying traditional design motifs to modern interface elements.

**ParallaxSection.tsx** - Creates parallax scrolling effects for the landing page with layered image animations that respond to scroll position. This component enhances the marketing pages by providing engaging visual depth and modern web design aesthetics.

**MuseumContentCard.tsx** - Renders styled content cards designed to resemble museum exhibition plaques for displaying literary analysis and cultural information. This component supports the educational mission by presenting scholarly content in an elegant, museum-quality format.

**ClientOnly.tsx** - Wraps components that should only render on the client-side to avoid hydration errors with server-side rendering. This utility component solves common SSR compatibility issues for components that depend on browser-only APIs or dynamic client state.

### API Route Modules (`/src/app/api/`)

**chapters/** - Provides REST endpoints for retrieving chapter text, metadata, and associated knowledge graph data for the reading interface. These routes serve the core reading content and enable chapter navigation, search, and contextual information retrieval.

**daily-tasks/** - Implements API endpoints for daily task generation, submission, evaluation, and history retrieval with AI integration. These routes orchestrate the complete task workflow by coordinating between the task service, AI evaluation flows, and user progress tracking.

**perplexity-qa-stream/** - Exposes server-sent events (SSE) streaming endpoint for real-time AI question answering using Perplexity API. This route enables responsive chat-like interactions where answers stream token-by-token to the client, providing immediate feedback and maintaining user engagement.

**cron/** - Provides scheduled task endpoints triggered by external services (like Vercel Cron) for daily task resets, streak calculations, and maintenance operations. These routes handle time-based automation that keeps the gamification system and daily challenges running without manual intervention.

### Test Suite Modules (`/tests/lib/`)

**content-filter-service.test.ts** - Contains 42 comprehensive unit tests validating multi-language profanity detection, hate speech identification, spam filtering, and PII masking with 91.51% code coverage. This test suite ensures the content moderation system maintains high accuracy across Traditional Chinese and English violations.

**community-service.test.ts** - Implements 29 integration tests validating post creation, commenting, reactions, content filtering integration, and Firebase operations with 62.96% coverage. This test suite ensures community features work correctly end-to-end and properly integrate with the moderation system.

**openai-client.test.ts** - Tests OpenAI API integration including request formatting, response parsing, error handling, and retry logic for supplementary AI features. This test suite validates the OpenAI client's reliability and ensures graceful handling of API failures.

**ai-task-content-generator.test.ts** - Validates AI-powered task generation across all task types ensuring appropriate difficulty, variety, and contextual relevance. This test suite ensures the task generator produces high-quality, pedagogically sound learning challenges.

**ai-feedback-generator.test.ts** - Tests AI feedback generation for accuracy, constructiveness, tone appropriateness, and personalization based on user context. This test suite ensures feedback enhances learning by being encouraging, specific, and actionable.

### Repository Test Modules (`/tests/lib/repositories/`)

**highlight-repository.test.ts** - Contains 25+ comprehensive unit tests (420 lines) validating all highlight repository operations including CRUD operations, batch processing, error handling, and edge cases. This test suite uses in-memory SQLite databases for isolation and speed, testing create operations (single and batch), retrieval by user and chapter, deletion with verification, count queries for statistics, error handling for missing fields and invalid data, Chinese character support, and transaction rollback scenarios ensuring data integrity.

**note-repository.test.ts** - Implements 50+ comprehensive unit tests (700 lines) validating all note repository operations including full CRUD, tag management, visibility controls, and advanced queries. This test suite covers create operations with automatic word count calculation, tag storage as JSON arrays, batch operations for migration efficiency, retrieval by user/chapter/tags/visibility, update operations preserving data integrity, deletion with cascade handling, public note queries, tag-based filtering, error handling for constraint violations, and feature preservation (tags, isPublic, noteType) across all operations.

## 5. Common Developer Workflows

### To add a new AI feature:
1. **Define the AI flow** in `/src/ai/flows/new-feature.ts` using GenKit's `defineFlow` API.
2. **Test the flow** using `npm run genkit:dev` to access the GenKit development UI.
3. **Create the API route** in `/src/app/api/new-feature/route.ts` to expose the flow via HTTP.
4. **Build the UI component** in `/src/components/` that calls the API endpoint.
5. **Write tests** in `/tests/lib/` for any new service logic.

### To add a new page/route:
1. **Create the page file** in `/src/app/(main)/new-page/page.tsx` for protected routes or `/src/app/new-page/page.tsx` for public routes.
2. **Add translations** in `/src/lib/translations.ts` for all text content (support 3 languages).
3. **Update navigation** in `/src/components/layout/AppShell.tsx` if needed.
4. **Test authentication** by verifying the `(main)` layout protects your route.

### To implement a new gamification feature:
1. **Update the user level system** in `/src/lib/user-level-service.ts` to add new XP calculations.
2. **Create gamification components** in `/src/components/gamification/` for UI elements.
3. **Integrate with Firebase** to persist user progress in Firestore.
4. **Add visual feedback** using the existing `LevelUpModal.tsx` or create new celebration components.
5. **Write tests** to ensure XP calculations and level progression work correctly.

### To add a new daily task type:
1. **Create an AI evaluation flow** in `/src/ai/flows/` for grading the task (e.g., `new-task-grading.ts`).
2. **Update task generator** in `/src/lib/ai-task-content-generator.ts` to include the new task type.
3. **Add evaluation logic** in `/src/lib/task-evaluator.ts` to route to your new AI flow.
4. **Create task schema** in `/src/lib/config/daily-task-schema.ts` for data validation.
5. **Build UI component** in `/src/components/daily-tasks/` for task display and submission.
6. **Test end-to-end** by generating, displaying, submitting, and grading the new task type.

### To create a new repository for SQLite data access:
1. **Create repository file** in `/src/lib/repositories/new-entity-repository.ts` with CRUD operations.
2. **Use prepared statements** for all SQL queries to prevent SQL injection (e.g., `db.prepare('SELECT * FROM table WHERE id = ?')`).
3. **Implement core functions**: create (single), batchCreate, getById, getByUserId, update, delete, count.
4. **Add error handling** with try-catch blocks and meaningful error messages for debugging.
5. **Write comprehensive tests** in `/tests/lib/repositories/` with 25+ test cases covering CRUD, batch operations, error cases, and edge conditions.
6. **Use in-memory SQLite** (`:memory:`) in tests for isolation and speed.
7. **Verify with TypeScript** by running `npm run typecheck` to ensure type safety.

### To migrate a service to dual-mode (SQLite + Firebase):
1. **Create repository** following the workflow above for SQLite data access layer.
2. **Update service file** to import and use the repository for SQLite operations.
3. **Implement dual-mode pattern** with SQLite-first, Firebase-fallback using this template:
   ```typescript
   export async function serviceFunction(params) {
     // Try SQLite first
     if (checkSQLiteAvailability()) {
       try {
         const result = repository.function(params);
         console.log('✅ SQLite operation successful');
         return result;
       } catch (error) {
         console.error('❌ SQLite failed, falling back to Firebase:', error.message);
       }
     }
     // Fallback to Firebase
     const result = await firebaseOperation(params);
     console.log('✅ Firebase operation successful');
     return result;
   }
   ```
4. **Create migration script** in `/scripts/migrations/` extending BaseMigrator for data transfer.
5. **Add npm script** in `package.json` for migration execution (e.g., `"migrate:entity": "tsx scripts/migrations/migrate-entity.ts"`).
6. **Run TypeScript check** (`npm run typecheck`) to verify UI compatibility - zero errors expected.
7. **Test migration** with `--dry-run` flag first, then execute actual migration.
8. **Verify data integrity** by comparing counts and sampling data between Firebase and SQLite.

### To run data migrations:
* **Dry run (test):** `npm run migrate:highlights -- --dry-run` or `npm run migrate:notes -- --dry-run`
* **Verbose output:** `npm run migrate:highlights -- --verbose`
* **Actual migration:** `npm run migrate:highlights` (after dry run verification)
* **Migrate all Phase 2:** `npm run migrate:all-phase2` (highlights + notes)
* **Skip validation:** `npm run migrate:notes -- --no-validate` (not recommended)

### To run tests:
* **All tests:** `npm test`
* **Watch mode:** `npm test -- --watch`
* **Coverage report:** `npm test -- --coverage`
* **Specific service:** `npm test -- tests/lib/service-name.test.ts`
* **Community tests:** `npm run test:community`

### To develop and debug:
* **Development server:** `npm run dev` (runs on port 3001)
* **AI development:** `npm run genkit:dev` (opens GenKit UI for testing AI flows)
* **Type checking:** `npm run typecheck`
* **Linting:** `npm run lint`
* **Production build:** `npm run build`

### To find detailed module logic:
* **AI flows:** Each file in `/src/ai/flows/` has JSDoc comments explaining purpose, inputs, outputs, and reasoning.
* **Service layer:** Files in `/src/lib/` contain comprehensive JSDoc with "why" explanations for design decisions.
* **Test files:** Located in `/tests/lib/` and mirror the structure of `/src/lib/` for easy location.
* **Documentation:** See `/docs/` for architectural guides, gaming mechanism specs, and improvement reports.

## 6. Further Documentation

### Core Documentation Files
* **CLAUDE.md** - Comprehensive coding guidelines, technical debt prevention, and development standards
* **README.md** - Quick-start guide with setup instructions, feature overview, and basic usage
* **docs/SystemOverview.md** - High-level system architecture and design philosophy

### Specialized Documentation
* **docs/Gaming Mechanism/** - Gamification system design, XP formulas, and task specifications
* **docs/testing/** - Test strategies, coverage analysis, and quality assurance reports
* **docs/improvement_report/** - Enhancement proposals and implementation reports
* **docs/setup/** - Deployment guides and environment configuration
* **docs/firebaseToSQLlite/** - Firebase→SQLite migration project documentation
  * **PHASE2-COMPLETION-REPORT.md** - Comprehensive Phase 2 completion report (highlights & notes migration)
  * **TASK.md** - Detailed migration task tracking with 25 tasks across 5 phases
  * **planningSpec.md** - Migration strategy and architectural planning

### API Documentation
* **GenKit Development UI** - Access at `http://localhost:3100` after running `npm run genkit:dev`
* **API Routes** - All endpoints are defined in `/src/app/api/` with Next.js route handlers
* **Firebase Console** - Authentication and Firestore database management

### Development Resources
* **Next.js 15 Documentation** - https://nextjs.org/docs
* **GenKit Framework** - https://firebase.google.com/docs/genkit
* **Radix UI Components** - https://www.radix-ui.com/primitives/docs/overview/introduction
* **Tailwind CSS** - https://tailwindcss.com/docs
* **Firebase** - https://firebase.google.com/docs

---

**Document Version:** 1.2
**Last Updated:** 2025-10-29
**Maintained By:** Development Team
**Change Log:**
* **v1.2 (2025-10-29):** Added traditional Chinese window frame navigation system - ChineseWindowNavButton component, window shape type definitions, enhanced AppShell with cultural aesthetics
* **v1.1 (2025-10-29):** Added Phase 2 completion - SQLite dual-mode architecture, repository pattern, migration scripts, 75+ repository tests
* **v1.0 (2025-10-27):** Initial comprehensive project structure documentation

This document serves as the architectural map for onboarding new engineers and understanding the project's structure and design philosophy.
