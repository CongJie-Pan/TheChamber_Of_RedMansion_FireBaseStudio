# Project Structure & Architectural Overview

## 1. Project Overview

The Chamber of Red Mansion is an AI-powered educational web platform designed to help students and literature enthusiasts explore the Chinese classical novel "Dream of the Red Chamber" (紅樓夢). The platform combines modern AI technology with traditional literature to create an interactive, gamified learning experience that includes intelligent reading assistance, community discussions, daily learning tasks, and comprehensive progress tracking. The primary users are Chinese literature students and enthusiasts who seek a deeper understanding through AI-enhanced analysis, multi-language support, and social learning features.

## 2. Architectural Principles

This project follows a **Component-Driven Architecture with AI Enhancement** pattern, organized around the following core principles:

* **Layered Architecture with Clear Separation of Concerns:**
  * **AI Orchestration Layer** (`/src/ai/`): Isolated AI workflows using direct OpenAI GPT-5-mini and Perplexity Sonar API integration. This separation allows AI capabilities to evolve independently without affecting UI or business logic, with simplified architecture removing framework overhead.
  * **Presentation Layer** (`/src/app/`, `/src/components/`): Next.js 15 App Router with React Server Components for optimal performance and SEO. UI components are isolated in `/src/components/` following atomic design principles.
  * **Business Logic Layer** (`/src/lib/`): Core services handling authentication, content filtering, task management, and user progression. This layer acts as the bridge between UI and data/AI layers.
  * **Data Layer - SQLite Architecture** (`/src/lib/repositories/`): Local-first data persistence using SQLite as the primary and only database. The repository pattern provides a clean data access layer with prepared statements for SQL injection prevention, supporting all application features including user profiles, daily tasks, notes, highlights, and community posts.

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
│   ├── ai/                    # AI orchestration with direct API integration
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
│   │   ├── sqlite-db.ts       # SQLite database configuration and connection
│   │   ├── env.ts             # Environment variable validation
│   │   ├── translations.ts    # 1000+ translation keys (i18n system)
│   │   ├── utils.ts           # Common utility functions
│   │   ├── constants/         # Centralized constant values (Phase 4-T1)
│   │   │   └── guest-account.ts  # Guest account constants (IDs, XP, task IDs)
│   │   ├── middleware/        # Middleware functions (Phase 4-T1)
│   │   │   └── guest-account.ts  # Guest detection and configuration utilities
│   │   ├── content-filter-service.ts      # Automated content moderation (91.51% coverage)
│   │   ├── community-service.ts           # Community management (62.96% coverage)
│   │   ├── daily-task-service.ts          # Task lifecycle management
│   │   ├── ai-task-content-generator.ts   # AI-powered task creation
│   │   ├── ai-feedback-generator.ts       # AI-powered feedback generation
│   │   ├── task-evaluator.ts              # Task submission evaluation
│   │   ├── task-difficulty-adapter.ts     # Adaptive difficulty system
│   │   ├── user-level-service.ts          # XP and leveling system
│   │   ├── notes-service.ts               # Note-taking functionality (SQLite-based)
│   │   ├── highlight-service.ts           # Text highlighting (SQLite-based)
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
│   │   ├── AuthContext.tsx    # NextAuth.js authentication state
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
├── tests/                     # Test suite (164+ tests, 100% pass rate)
│   ├── lib/                   # Service layer tests (mirrors /src/lib/)
│   │   ├── content-filter-service.test.ts     # Content moderation tests
│   │   ├── community-service.test.ts          # Community feature tests
│   │   ├── openai-client.test.ts              # OpenAI integration tests
│   │   ├── ai-task-content-generator.test.ts  # Task generation tests
│   │   ├── ai-feedback-generator.test.ts      # Feedback generation tests
│   │   ├── middleware/        # Middleware tests (Phase 4-T1)
│   │   │   └── guest-account.test.ts          # Guest account middleware (13 tests, 100% pass)
│   │   └── repositories/      # Repository layer tests (75+ tests)
│   │       ├── highlight-repository.test.ts   # Highlight repo tests (25+ tests, 420 lines)
│   │       └── note-repository.test.ts        # Note repo tests (50+ tests, 700 lines)
│   ├── scripts/               # Script tests (Phase 4-T1)
│   │   └── seed-guest-account.test.ts         # Guest seeding tests (5 tests)
│   ├── performance/           # Performance tests (Phase 4-T3)
│   │   └── lazy-loading.test.tsx              # Lazy loading and build config tests (9 tests)
│   ├── integration/           # Integration tests (Phase 4-T1)
│   │   └── guest-account-api.test.ts          # Guest API integration (5 tests)
│   ├── components/            # Component tests (Phase 4-T1)
│   │   └── dashboard-guest-badge.test.tsx     # Guest badge UI tests (6 tests)
│   ├── instrumentation.test.ts # Instrumentation hook tests (Phase 4-T1, 6 tests)
│   └── setup/                 # Test configuration
│       └── jest.setup.js      # Jest configuration and mocks
├── coverage/                  # Test coverage reports (HTML & JSON)
│   ├── lcov-report/           # Human-readable coverage report
│   └── coverage-final.json    # Machine-readable coverage data
├── test-output/               # Automated test results and logs
├── instrumentation.ts         # Next.js instrumentation hook (Phase 4-T1: guest account auto-seed)
├── scripts/                   # Development and maintenance scripts
│   ├── test-ai-logging.ts     # AI logging validation script
│   ├── seed-guest-account.ts  # Phase 4-T1: Guest account seeding script (fixed 70 XP, 2 tasks)
│   └── migrations/            # Historical: Data migration scripts (Firebase → SQLite, completed)
│       ├── base-migrator.ts       # Reusable migration framework (abstract class)
│       ├── migrate-highlights.ts  # Highlight migration (200+ lines, batch processing)
│       ├── migrate-notes.ts       # Note migration (280+ lines, feature preservation)
│       └── fix-moderation-action-format.ts  # Community moderation data standardization
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

**[DEPRECATED] genkit.ts** - ⚠️ Removed on 2025-10-30. Previously configured Google GenKit with Gemini 2.0 Flash. Replaced by direct OpenAI and Perplexity API integration.

**[DEPRECATED] dev.ts** - ⚠️ Removed on 2025-10-30. Previously served as GenKit development server entry point. AI flows are now tested through standard Jest unit tests.

**perplexity-config.ts** - Provides configuration and setup for integrating Perplexity Sonar API to access external knowledge sources beyond the classical text. This enables users to ask questions that require contemporary scholarly research and real-time information retrieval with web search capabilities.

### AI Flow Modules (`/src/ai/flows/`) - Updated 2025-10-30

**Migration Note:** All AI flows migrated from GenKit/Gemini to direct API integration on 2025-10-30. Scoring flows use OpenAI GPT-5-mini; analysis flows use Perplexity Sonar.

**explain-text-selection.ts** [Perplexity Sonar] - Provides contextual AI-powered explanations for user-selected text passages from the novel using traditional Chinese analysis with web search capabilities. This flow analyzes the literary context, historical background, and linguistic nuances to help readers understand complex classical Chinese prose.

**context-aware-analysis.ts** [Perplexity Sonar] - Delivers intelligent analysis that adapts based on the user's current reading position, progress level, and historical interaction patterns with web search integration. This module personalizes the learning experience by considering what the user has already learned and their comprehension level.

**interactive-character-relationship-map.ts** [Perplexity Sonar] - Generates dynamic AI insights about character relationships, motivations, and development arcs throughout the novel's 120 chapters with contemporary scholarly references. This flow helps readers navigate the complex web of over 400 characters by highlighting key relationships and their evolution.

**daily-reading-comprehension.ts** [OpenAI GPT-5-mini] - Evaluates and grades user responses to daily reading comprehension tasks using AI-powered assessment criteria with JSON-structured responses. This module analyzes answer quality, depth of understanding, and textual evidence to provide detailed feedback and scoring.

**poetry-quality-assessment.ts** [OpenAI GPT-5-mini] - Assesses user-created poetry or poetry analysis submissions using traditional Chinese literary criticism standards with structured JSON output. This flow evaluates metrics like structural adherence, tonal patterns, imagery usage, and thematic coherence based on classical poetry conventions.

**character-analysis-scoring.ts** [OpenAI GPT-5-mini] - Grades user-submitted character analyses by evaluating textual evidence, psychological insights, and literary interpretation depth with JSON-formatted results. This module uses AI to assess how well users understand character motivations, development, and symbolic significance within the narrative.

**cultural-quiz-grading.ts** [OpenAI GPT-5-mini] - Automatically evaluates multiple-choice and short-answer cultural knowledge quizzes about Qing Dynasty customs, social hierarchy, and historical context with structured JSON responses. This flow provides instant feedback and explanations to reinforce cultural literacy essential for understanding the novel.

**commentary-interpretation.ts** [OpenAI GPT-5-mini] - Grades user interpretations of scholarly commentaries and critical analyses from famous Red Chamber scholars with JSON-structured feedback. This module assesses comprehension of literary criticism and ability to synthesize multiple scholarly perspectives.

**perplexity-red-chamber-qa.ts** [Perplexity Sonar] - Streams AI-powered answers to user questions by leveraging Perplexity API's access to contemporary scholarly articles and research with web search capabilities. This flow bridges classical literature with modern academic discourse, providing citations and contemporary interpretations.

### Application Pages (`/src/app/`)

**page.tsx (Homepage)** - Public landing page featuring a fully internationalized marketing interface with AI-enhanced classical literature learning. This module implements a comprehensive homepage with hero section (National Palace Museum imagery), 6 core feature cards (AI analysis, character maps, annotations, community, progress tracking, poetry), 3 content preview sections (character garden, chapter navigation, poetry appreciation), learning statistics display, and call-to-action sections. All text content uses the translation system (`t()` function) to support dynamic language switching between Traditional Chinese, Simplified Chinese, and English. Images are sourced from National Palace Museum (theme.npm.edu.tw) for cultural authenticity and reliability, replacing previous Unsplash dependencies that had loading issues. The page leverages `useLanguage` hook for real-time language switching without page reload, with all UI elements (buttons, headings, descriptions, stats) responding immediately to language changes. Implementation uses data-driven approach with `features`, `stats`, and `contentPreviews` arrays that pull translated content from `translations.ts` (60+ translation keys under `page.*` namespace). The component follows responsive design principles with mobile-first approach, featuring animated loading transitions, scroll indicators, and hover effects for enhanced user engagement.

**layout.tsx (Root)** - Root layout component wrapping the entire application with essential providers including AuthProvider for authentication state, LanguageProvider for multilingual support, and global styling configuration. This module sets up HTML document structure with language attributes that update dynamically based on user preference, includes Font Awesome CDN for icons, and configures metadata for SEO optimization.

**read-book/page.tsx** - Interactive reading interface providing immersive, AI-powered text exploration with advanced dual-column pagination system. This core feature module implements a comprehensive reading experience including: (1) **Dual-Column Pagination** (2025-11-24 enhancement) - Professional CSS multi-column layout with dynamic container expansion using Range API for precise content measurement, calculating page count as `Math.ceil(contentWidth / singlePageWidth)` and expanding container width to `pageCount * singlePageWidth` pixels. The pagination system applies critical layout styles with `!important` flag via `setImportantStyles()` utility to prevent content CSS conflicts, includes width validation warnings when expansion fails (>10px difference), and uses ResizeObserver to monitor both viewport and content elements for responsive recalculation. Debug logging controlled by `DEBUG_PAGINATION` constant (enabled in development via `process.env.NEXT_PUBLIC_DEBUG_PAGINATION`) provides detailed measurement values for troubleshooting. (2) **Navigation System** - Smooth scrolling navigation with `goToPage()` calculating scroll position as `(page - 1) * singlePageWidth`, boundary-checked `goNextPage()`/`goPrevPage()` functions using ref-based values to avoid stale closures, keyboard navigation (left/right arrows, up/down/PageUp/PageDown/Space keys), and mouse wheel horizontal scrolling. (3) **AI-Powered Q&A Module** - Perplexity Sonar integration for context-aware text analysis and explanations with streaming responses, thinking process visualization, structured answer formatting with inline citations, and conversation history management. (4) **Interactive Features** - Text selection for AI analysis, highlight and annotation system, vernacular/classical text toggle, knowledge graph visualization, note-taking capabilities, and customizable reading settings (themes, fonts, column layouts). (5) **Responsive Design** - Automatic pagination disable on mobile devices (`isMobile` detection), viewport-aware font sizing, theme switching (8 traditional Chinese aesthetics), and accessibility features including screen reader support. The module extensively uses React hooks (`useState`, `useEffect`, `useCallback`, `useRef`) for state management, implements double-requestAnimationFrame pattern for DOM layout stabilization, and coordinates with gamification system (XP rewards) and progress tracking. Testing coverage: 180+ test cases across 4 test suites (`bi-column-basic.test.tsx`, `bi-column-responsive.test.tsx`, `bi-column-navigation.test.tsx`, `bi-column-edge-cases.test.tsx`) providing >95% coverage of pagination functionality.

### Core Service Modules (`/src/lib/`)

**sqlite-db.ts** - Initializes and configures SQLite database with better-sqlite3, providing connection management, schema initialization, and transaction support. This module serves as the foundational data layer for all application features with automatic directory creation, foreign key enforcement, WAL journaling mode, and graceful shutdown handling. Includes health checks, database statistics, and comprehensive error handling for architecture mismatches.

**env.ts** - Validates and type-checks all environment variables required for the application using Zod schemas to ensure runtime safety. This module prevents deployment failures by catching configuration errors early and providing clear error messages for missing or invalid environment variables.

**translations.ts** - Implements the comprehensive internationalization (i18n) system with 1000+ translation keys supporting Traditional Chinese, Simplified Chinese, and English. This module provides the translation function used throughout the application to ensure complete multilingual support for all user-facing text.

**utils.ts** - Provides common utility functions including className merging (cn), date formatting, string manipulation, and other shared helper functions. This module promotes code reuse and consistency by centralizing frequently-used operations that span multiple features.

### Type Definition Modules (`/src/types/`)

**chinese-window.ts** - Defines TypeScript types and configurations for traditional Chinese window frame shapes used in navigation components (~120 lines). Provides WindowShape union type, WindowFrameConfig interface, and WINDOW_SHAPES constant mapping with cultural descriptions. Includes helper functions getWindowFrameConfig() and getWindowClipPath() for accessing shape configurations. Each shape includes Chinese name (月門, 六角窗, 八角窗, 四葉窗), cultural symbolism explanation, and CSS clip-path value for efficient rendering.

**community.ts** - Provides shared type definitions for community features that are safe for both client-side and server-side code (61 lines, added 2025-10-30). Defines CreatePostData interface for post creation, CreateCommentData for commenting, PostFilters for query parameters, and CreatePostResponse for API responses. This separation enables client components to import types without triggering server-only dependencies (like better-sqlite3), solving webpack bundling issues and maintaining clean architecture between client and server layers.

**content-filter-service.ts** - Implements enterprise-grade automated content moderation with real-time profanity detection, hate speech identification, spam filtering, and personal information masking. This module ensures community safety by automatically screening all user-generated content across posts, comments, and notes using multi-language pattern matching (Traditional Chinese and English) with 91.51% test coverage.

**community-service.ts** - Manages all social learning features including post creation, commenting, reactions, bookmarking, and user interactions with integrated content filtering. This module uses **community-repository** and **comment-repository** for SQLite operations with sub-5ms performance for local queries. All 12 core methods (6 posts + 3 comments + 3 bookmarks) provide comprehensive CRUD operations with automatic content moderation integration to maintain a safe and scholarly discussion environment. The service achieves 62.96% test coverage and exports shared types from `/src/types/community.ts` for client-side safe imports, enabling proper client-server separation in Next.js 15 App Router architecture.

**daily-task-service.ts** - Orchestrates the complete lifecycle of daily learning tasks including generation, distribution, submission, evaluation, and streak tracking. This module coordinates between AI task generation, user progress tracking, and the gamification system to provide personalized daily challenges that adapt to user skill levels.

**ai-task-content-generator.ts** - Generates diverse daily task content using AI including comprehension questions, poetry challenges, character analyses, cultural quizzes, and commentary interpretations. This module ensures fresh, varied, and contextually appropriate learning challenges by leveraging AI to create unique tasks tailored to user progress and preferences.

**ai-feedback-generator.ts** - Creates detailed, constructive AI-powered feedback for user task submissions including praise for strengths, guidance for improvement, and learning recommendations. This module personalizes the feedback experience by considering user level, task difficulty, and performance history to motivate continued learning.

**task-evaluator.ts** - Routes task submissions to appropriate AI evaluation flows and coordinates the grading process across different task types. This module serves as the central dispatcher that determines which AI flow to use based on task type and manages the evaluation workflow from submission to final scoring.

**task-difficulty-adapter.ts** - Implements adaptive difficulty algorithms that adjust task complexity based on user performance history, streak data, and skill progression. This module ensures optimal challenge levels by making tasks harder as users improve and providing easier tasks when users struggle, maintaining engagement through appropriate difficulty.

**user-level-service.ts** - Manages the gamification system including XP calculation, level progression, achievement unlocking, and reward distribution. This module tracks all user accomplishments and translates them into tangible progression metrics that motivate continued platform engagement through visible achievement milestones.

**notes-service.ts** - Provides note-taking functionality including creation, editing, tagging, searching, highlighting association, and public/private visibility controls. This module integrates with note-repository for SQLite operations, enabling users to build their personal scholarly knowledge base with optimal performance. Features include automatic word count calculation, tag-based filtering, chapter association, and public note sharing for collaborative learning.

**highlight-service.ts** - Manages text highlighting features allowing users to mark important passages, add color-coded categories, and link highlights to notes. This module integrates with highlight-repository for SQLite operations with batch processing support, supporting active reading through visual annotation and organization of key textual moments across chapters.

**openai-client.ts** - Provides the primary configured client for OpenAI GPT-5-mini API integration, powering all scoring and grading tasks in the platform (updated 2025-10-30). This module handles API key management, request formatting, error handling, response parsing, and JSON-structured output for daily task evaluations including reading comprehension, poetry quality assessment, character analysis scoring, cultural quiz grading, and commentary interpretation.

**perplexity-client.ts** - Implements the Perplexity API client for accessing external knowledge sources and contemporary scholarly research with streaming support. This module enables real-time question answering that goes beyond the novel's text by leveraging current academic discourse and research databases.

**perplexity-error-handler.ts** - Provides specialized error handling and retry logic for Perplexity API calls including rate limiting, network failures, and malformed responses. This module ensures robust external API integration by gracefully handling failures and providing fallback behaviors to maintain user experience.

**citation-processor.ts** - Parses, formats, and validates citations returned from Perplexity API responses to ensure proper academic attribution. This module transforms raw citation data into user-friendly formatted references that support scholarly rigor and enable users to verify AI-generated information.

**terminal-logger.ts** - Implements development logging utilities that output detailed debugging information to the terminal during development and testing. This module aids debugging by providing structured, color-coded logs for AI operations, API calls, and service interactions visible in the development environment.

**task-generator.ts** - Coordinates the task generation pipeline by selecting appropriate task types, determining difficulty levels, and triggering AI content generation. This module implements the business logic for when and what types of tasks to generate based on user schedules, preferences, and learning objectives.

**knowledgeGraphUtils.ts** - Provides utility functions for processing, transforming, and querying the chapter-level knowledge graph data that maps character appearances and relationships. This module enables the knowledge graph visualization features by preparing data structures that represent narrative connections across chapters.

### Guest Account System Modules (`/src/lib/constants/`, `/src/lib/middleware/` - Phase 4-T1)

**constants/guest-account.ts** - Centralizes all guest account configuration constants including fixed user ID (`guest-test-user-00000000`), email (`guest@redmansion.test`), username (訪客測試帳號), fixed XP (70), level (1), and task IDs for the two predefined tasks (reading comprehension and character analysis). This module ensures production-safe imports by keeping constants in the src/ directory rather than scripts/, preventing runtime errors when the application bundle is built. Constants are used across middleware, seed scripts, API routes, and UI components to maintain consistency.

**middleware/guest-account.ts** - Provides utility functions for detecting and handling guest account behavior including `isGuestAccount()` to check if a user ID matches the guest account, `getGuestTaskIds()` to retrieve the fixed task IDs, `isGuestModeEnabled()` to verify environment-based enabling (development or explicit flag), `getGuestConfig()` to return complete guest configuration, and `logGuestAction()` for debugging guest account operations. This middleware enables special rules for guest users: fixed tasks instead of dynamic generation, XP reset to 70 on server restart, and AI grading enabled for all tasks. Fully tested with 13/13 unit tests passing (100% coverage).

### Repository Modules (`/src/lib/repositories/`)

**highlight-repository.ts** - Implements SQLite data access layer for highlights with comprehensive CRUD operations (create, get, delete, batch) using prepared statements for SQL injection prevention. This module provides 8 functions (270 lines) including batch operations for efficient bulk inserts, count queries for statistics, and proper error handling. All operations use parameterized queries and are fully tested with 25+ unit tests covering normal operations, edge cases, and error scenarios.

**note-repository.ts** - Implements SQLite data access layer for notes with full CRUD operations and advanced querying capabilities including tags (JSON arrays), public/private visibility, and user-specific filtering. This module provides 14 functions (470 lines) with automatic word count calculation, comprehensive tag support, batch operations for migration efficiency, and conditional queries (by user, by chapter, by tags, public visibility). All operations use prepared statements and are validated through 50+ comprehensive unit tests.

### Migration Script Modules (`/scripts/migrations/`) - Historical

**Note:** These migration scripts are historical artifacts from the Firebase-to-SQLite migration completed in Phase 2. They are preserved for reference and potential future data migrations between systems.

**base-migrator.ts** - Provides an abstract migration framework implementing reusable patterns for data migrations including batch processing, validation, dry-run mode, integrity checks, and progress logging. This base class enables consistent migration implementations by providing configurable batch sizes (default: 500 records), validation callbacks, error handling with statistics tracking, and migration summary reporting.

**migrate-highlights.ts** - Historical: Implemented Firebase-to-SQLite migration for highlight records using the BaseMigrator framework with batch processing, validation, and integrity verification. This script (200+ lines) validated required fields, transformed timestamps to Unix format, performed batch inserts using highlight-repository, and verified data integrity with count checks.

**migrate-notes.ts** - Historical: Implemented Firebase-to-SQLite migration for note records with feature preservation including tags (JSON arrays), visibility settings, word counts, and note types. This script (280+ lines) extended BaseMigrator to handle complex note features and performed comprehensive verification of feature preservation after migration.

### Guest Account Script Modules (`/scripts/` - Phase 4-T1)

**seed-guest-account.ts** - Implements guest test account seeding functionality that creates a consistent baseline account for development and testing with fixed state (user ID: `guest-test-user-00000000`, XP: 70, level: 1, 2 predefined daily tasks). This script provides the `seedGuestAccount()` function with reset flag support, creates database records using SQLite transactions for atomicity, deletes existing guest data when reset=true, inserts guest user with fixed attributes, creates two fixed daily tasks (reading comprehension 50 XP medium, character analysis 30 XP easy), and initializes daily progress with 0 completed tasks. Includes comprehensive error handling with transaction rollback on failures. Script is executed automatically on server startup via instrumentation hook in development environment to ensure guest account is always available with predictable state.

### Server Instrumentation Module (`/instrumentation.ts` - Phase 4-T1)

**instrumentation.ts** - Implements Next.js 15 instrumentation hook that runs on server startup to perform initialization tasks before the application accepts requests. This module provides the `register()` function that executes in development environment only (checking `process.env.NODE_ENV === 'development'`), automatically seeds the guest test account by calling `seedGuestAccount(true)` with reset flag to ensure fresh state on every server restart, includes comprehensive error handling to prevent server startup failures if seeding fails, and logs all operations with `[Instrumentation]` prefix for debugging. This hook enables the guest account system requirement that XP and tasks reset to fixed baseline (70 XP, 2 tasks) whenever the development server restarts, providing developers with a consistent testing environment without manual intervention. Configured in `next.config.ts` with `experimental.instrumentationHook: true`.

### Configuration Modules (`/src/lib/config/`)

**daily-task-schema.ts** - Defines Zod validation schemas for all daily task data structures ensuring type safety and runtime validation across task creation, submission, and evaluation. This module serves as the single source of truth for task data contracts, preventing data inconsistencies and enabling confident refactoring.

### React Context Modules (`/src/context/`)

**AuthContext.tsx** - Manages global authentication state using NextAuth.js with React Context, providing user session data throughout the component tree. This module eliminates prop drilling by making authentication status, user profile from SQLite, and session refresh methods accessible to any component that needs them. Includes AuthLoadingScreen component for consistent authentication loading UI across the application.

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

**community/posts/** [Added 2025-10-30] - Implements server-side API endpoint for community post operations with NextAuth session authentication and Zod validation (172 lines). POST endpoint handles post creation with author ID verification, content moderation integration via community-service, and comprehensive error handling for database, validation, and moderation failures. This route solves the client-server architecture issue where client components cannot directly import SQLite-dependent services, providing a proper REST API layer that maintains security and modularity.

**daily-tasks/** - Implements API endpoints for daily task generation, submission, evaluation, and history retrieval with AI integration. These routes orchestrate the complete task workflow by coordinating between the task service, AI evaluation flows, and user progress tracking.

**perplexity-qa-stream/** - Exposes server-sent events (SSE) streaming endpoint for real-time AI question answering using Perplexity API. This route enables responsive chat-like interactions where answers stream token-by-token to the client, providing immediate feedback and maintaining user engagement.

**cron/** - Provides scheduled task endpoints triggered by external services (like Vercel Cron) for daily task resets, streak calculations, and maintenance operations. These routes handle time-based automation that keeps the gamification system and daily challenges running without manual intervention.

### Test Suite Modules (`/tests/lib/`)

**content-filter-service.test.ts** - Contains 42 comprehensive unit tests validating multi-language profanity detection, hate speech identification, spam filtering, and PII masking with 91.51% code coverage. This test suite ensures the content moderation system maintains high accuracy across Traditional Chinese and English violations.

**community-service.test.ts** - Implements 29 integration tests validating post creation, commenting, reactions, content filtering integration, and SQLite repository operations with 62.96% coverage. This test suite ensures community features work correctly end-to-end and properly integrate with the moderation system using in-memory SQLite for test isolation.

**openai-client.test.ts** - Tests OpenAI API integration including request formatting, response parsing, error handling, and retry logic for supplementary AI features. This test suite validates the OpenAI client's reliability and ensures graceful handling of API failures.

**ai-task-content-generator.test.ts** - Validates AI-powered task generation across all task types ensuring appropriate difficulty, variety, and contextual relevance. This test suite ensures the task generator produces high-quality, pedagogically sound learning challenges.

**ai-feedback-generator.test.ts** - Tests AI feedback generation for accuracy, constructiveness, tone appropriateness, and personalization based on user context. This test suite ensures feedback enhances learning by being encouraging, specific, and actionable.

### Repository Test Modules (`/tests/lib/repositories/`)

**highlight-repository.test.ts** - Contains 25+ comprehensive unit tests (420 lines) validating all highlight repository operations including CRUD operations, batch processing, error handling, and edge cases. This test suite uses in-memory SQLite databases for isolation and speed, testing create operations (single and batch), retrieval by user and chapter, deletion with verification, count queries for statistics, error handling for missing fields and invalid data, Chinese character support, and transaction rollback scenarios ensuring data integrity.

**note-repository.test.ts** - Implements 50+ comprehensive unit tests (700 lines) validating all note repository operations including full CRUD, tag management, visibility controls, and advanced queries. This test suite covers create operations with automatic word count calculation, tag storage as JSON arrays, batch operations for migration efficiency, retrieval by user/chapter/tags/visibility, update operations preserving data integrity, deletion with cascade handling, public note queries, tag-based filtering, error handling for constraint violations, and feature preservation (tags, isPublic, noteType) across all operations.

### UI Feature Test Modules (`/tests/read-book/`) - Added 2025-11-24

**bi-column-basic.test.tsx** - Contains 30+ unit tests (385 lines, 9 test suites) validating fundamental dual-column reading functionality including pagination mode activation/deactivation based on `columnLayout` and `isMobile` state, CSS class application (`columns-1` vs `columns-2`), initial state verification (currentPage=1), container width expansion calculations, critical layout styles application (columnCount, columnGap, columnFill, height), column styling verification, layout switching between single/double modes, viewport container styling, and pagination button state rendering. This test suite ensures the core dual-column layout behaves correctly across different configurations.

**bi-column-responsive.test.tsx** - Implements 40+ unit tests (510 lines, 11 test suites) validating responsive behavior including mobile device detection and protection from dual-column activation, viewport resize handling triggering pagination recalculation, content width measurement accuracy, Range API integration for precise content boundary detection, dynamic container expansion based on content width, font size changes affecting page count calculations (12px, 16px, 18px, 20px, 24px tested), theme changes affecting layout, chapter switching triggering pagination reset, CSS column count verification, cross-platform consistency checks, and viewport focus management for keyboard navigation. This test suite ensures the pagination system adapts correctly to various screen sizes and configurations.

**bi-column-navigation.test.tsx** - Contains 50+ unit tests (562 lines, 8 test suites) validating all navigation mechanisms including mouse wheel navigation (scroll up/down mapped to prev/next page), keyboard arrow key navigation (left/right for horizontal, up/down/PageUp/PageDown/Space for vertical-to-horizontal mapping), pagination button navigation (prev/next buttons), page boundary enforcement (cannot go before page 1 or after last page), navigation event prevention and propagation, editable element protection (keyboard navigation disabled in input fields/textareas), horizontal scroll position management (`scrollTo()` with smooth behavior), navigation state consistency between state and refs, and complete navigation flow integration. This test suite ensures users can navigate through paginated content using multiple input methods reliably.

**bi-column-edge-cases.test.tsx** - Implements 60+ unit tests (631 lines, 11 test suites) validating boundary conditions and error scenarios including missing DOM elements (viewport, content container) graceful handling, invalid pagination state handling (negative pages, NaN, Infinity), CSS column rendering failure recovery (`columnCount === 'auto'` or `'1'` fallback), content width measurement error handling, Range API compatibility and fallback scenarios, dynamic width expansion validation with mismatch warnings (>10px difference), concurrent state update handling, memory leak detection (ResizeObserver cleanup, event listener removal), performance metrics validation (pagination calculation <100ms, 60fps scrolling), browser compatibility edge cases, debug logging conditional execution (`DEBUG_PAGINATION` flag), and state recovery from invalid conditions. This test suite ensures the pagination system remains stable and performant under extreme conditions.

**Test Execution Commands**:
```bash
# Run all bi-column tests
npm test -- tests/read-book/bi-column

# Run individual test suites
npm test -- tests/read-book/bi-column-basic.test.tsx
npm test -- tests/read-book/bi-column-responsive.test.tsx
npm test -- tests/read-book/bi-column-navigation.test.tsx
npm test -- tests/read-book/bi-column-edge-cases.test.tsx

# Run with coverage report
npm test -- --coverage tests/read-book/bi-column
```

**Coverage Statistics**: 4 test files, 39 test suites, ~180 individual test cases, ~2,088 lines of test code, >95% estimated coverage of dual-column pagination functionality.

## 5. Common Developer Workflows

### To add a new AI feature (Updated 2025-10-30):
1. **Define the AI flow** in `/src/ai/flows/new-feature.ts` using direct OpenAI or Perplexity API calls:
   - Use `getOpenAIClient()` from `/src/lib/openai-client.ts` for scoring/grading tasks
   - Use `perplexityRedChamberQA()` from `/src/ai/flows/perplexity-red-chamber-qa.ts` for analysis/Q&A tasks
2. **Write unit tests first** in `/tests/ai/flows/new-feature.test.ts` with mocked API responses to define expected interface and behavior.
3. **Implement the flow logic** with proper Zod schema validation for inputs/outputs and error handling.
4. **Create the API route** in `/src/app/api/new-feature/route.ts` to expose the flow via HTTP.
5. **Build the UI component** in `/src/components/` that calls the API endpoint.
6. **Run tests** using `npm test -- tests/ai/flows/new-feature.test.ts` to verify functionality.

### To add a new page/route:
1. **Create the page file** in `/src/app/(main)/new-page/page.tsx` for protected routes or `/src/app/new-page/page.tsx` for public routes.
2. **Add translations** in `/src/lib/translations.ts` for all text content (support 3 languages).
3. **Update navigation** in `/src/components/layout/AppShell.tsx` if needed.
4. **Test authentication** by verifying the `(main)` layout protects your route.

### To implement a new gamification feature:
1. **Update the user level system** in `/src/lib/user-level-service.ts` to add new XP calculations.
2. **Create gamification components** in `/src/components/gamification/` for UI elements.
3. **Update repository** in `/src/lib/repositories/user-repository.ts` to persist user progress in SQLite.
4. **Add visual feedback** using the existing `LevelUpModal.tsx` or create new celebration components.
5. **Write tests** to ensure XP calculations and level progression work correctly with in-memory SQLite.

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

### To add SQLite persistence to a new feature:
1. **Create repository** following the workflow above for SQLite data access layer.
2. **Update service file** to import and use the repository for data operations.
3. **Implement service methods** using the repository pattern:
   ```typescript
   export async function serviceFunction(params) {
     const db = getDatabase();
     const result = repository.function(db, params);
     console.log('✅ SQLite operation successful');
     return result;
   }
   ```
4. **Add database schema** in `/src/lib/sqlite-db.ts` initializeSchema() function if new tables are needed.
5. **Run TypeScript check** (`npm run typecheck`) to verify type safety - zero errors expected.
6. **Write comprehensive tests** using in-memory SQLite for isolation and speed.
7. **Verify data integrity** by testing CRUD operations and edge cases thoroughly.

### To run data migrations (Historical - Firebase migration completed):
**Note:** These commands are preserved for reference. The Firebase-to-SQLite migration was completed in Phase 2.
* **Dry run (test):** `npm run migrate:highlights -- --dry-run` or `npm run migrate:notes -- --dry-run`
* **Verbose output:** `npm run migrate:highlights -- --verbose`
* **Actual migration:** `npm run migrate:highlights` (after dry run verification)
* **Migrate all Phase 2:** `npm run migrate:all-phase2` (highlights + notes)
* **Skip validation:** `npm run migrate:notes -- --no-validate` (not recommended)

### To use guest account for testing (Phase 4-T1):
1. **Automatic seeding** on development server start (via instrumentation hook in `instrumentation.ts`)
2. **Manual seeding** with reset: `tsx scripts/seed-guest-account.ts --reset`
3. **Login** with User ID: `guest-test-user-00000000` (or email: `guest@redmansion.test`)
4. **Verify** dashboard shows 🧪 測試帳號 badge with "固定 70 XP • 2 個每日任務"
5. **Check fixed tasks**: Navigate to daily tasks page - should show 2 predefined tasks
6. **Test AI grading**: Complete tasks to verify AI evaluation works correctly
7. **Reset testing**: Restart development server - guest account resets to 70 XP and 0 completed tasks
* **Guest account features**:
  - Fixed user ID, email, username (never changes)
  - Always 70 XP and level 1 on server restart
  - 2 fixed daily tasks (reading comprehension 50 XP, character analysis 30 XP)
  - No dynamic task generation (returns fixed tasks from database)
  - AI grading enabled for comprehensive testing
  - Disabled in production environment (development only)

### To run tests:
* **All tests:** `npm test`
* **Watch mode:** `npm test -- --watch`
* **Coverage report:** `npm test -- --coverage`
* **Specific service:** `npm test -- tests/lib/service-name.test.ts`
* **Community tests:** `npm run test:community`

### To develop and debug:
* **Development server:** `npm run dev` (runs on port 3001)
* **AI testing:** `npm test -- tests/ai/flows/` (run all AI flow tests with mocked API responses)
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
* **API Routes** - All endpoints are defined in `/src/app/api/` with Next.js route handlers
* **AI Flow Testing** - Test AI flows through Jest unit tests in `/tests/ai/flows/` with mocked API responses
* **Database Management** - SQLite database managed through better-sqlite3 with schema defined in `/src/lib/sqlite-db.ts`
* **OpenAI API** - Direct integration with GPT-5-mini for scoring tasks
* **Perplexity API** - Direct integration with Sonar for analysis and Q&A tasks

### Development Resources
* **Next.js 15 Documentation** - https://nextjs.org/docs
* **NextAuth.js Documentation** - https://next-auth.js.org/getting-started/introduction
* **better-sqlite3 Documentation** - https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md
* **OpenAI API Documentation** - https://platform.openai.com/docs/api-reference
* **Perplexity API Documentation** - https://docs.perplexity.ai/
* **Radix UI Components** - https://www.radix-ui.com/primitives/docs/overview/introduction
* **Tailwind CSS** - https://tailwindcss.com/docs

---

**Document Version:** 1.5
**Last Updated:** 2025-11-14
**Maintained By:** Development Team
**Change Log:**
* **v1.5 (2025-11-14):** Architecture Documentation Update - Removed all Firebase/Firestore references, confirmed SQLite as the sole database solution. Updated authentication references from Firebase Auth to NextAuth.js. Removed "dual-mode" and "fallback" architecture descriptions. Updated all module descriptions, workflows, and development resources to reflect current SQLite-only architecture. Marked Firebase-to-SQLite migration scripts as historical artifacts.
* **v1.4 (2025-10-31):** Phase 4 Completion - Guest Account System (fixed test environment with 70 XP baseline, server auto-reset, 13/13 tests passing), Login Logo Update (replaced ScrollText with official logo_circle.png), Performance Optimization (build time 126s → 59s, 53% improvement via SWC minification, lazy loading, CSS optimization). Fixed 2 critical bugs: import path issue (scripts → src/lib/constants) and repository import pattern (object → direct function).
* **v1.3 (2025-10-30):** AI Migration - Removed GenKit/Gemini, migrated to OpenAI GPT-5-mini (scoring tasks) + Perplexity Sonar (analysis tasks) with direct API integration. Updated all AI flow descriptions, development workflows, and documentation references.
* **v1.2 (2025-10-29):** Added traditional Chinese window frame navigation system - ChineseWindowNavButton component, window shape type definitions, enhanced AppShell with cultural aesthetics
* **v1.1 (2025-10-29):** Added Phase 2 completion - SQLite dual-mode architecture, repository pattern, migration scripts, 75+ repository tests
* **v1.0 (2025-10-27):** Initial comprehensive project structure documentation

This document serves as the architectural map for onboarding new engineers and understanding the project's structure and design philosophy.
