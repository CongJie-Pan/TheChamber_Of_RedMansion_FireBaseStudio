# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
- Verify the file status before editing
- If encountering storage issues, please reload the file

## Development Commands

### Core Development
- `npm run dev` - Start Next.js development server
- `npm run build` - Build production application
- `npm start` - Start production server
- `npm run lint` - Run ESLint code linting
- `npm run typecheck` - Run TypeScript type checking

### AI Development
- `npm run genkit:dev` - Start GenKit AI development server for testing AI flows
- `npm run genkit:watch` - Start GenKit with file watching for AI development

### Testing
- `npm test` - Run Jest test suite (71 tests, 100% pass rate)
- `npm test -- --watch` - Run tests in watch mode
- `npm test -- --coverage` - Generate coverage report (current: 77.37% overall)
- `npm run test:community` - Run community service tests specifically

### Single Test Execution
To run individual test suites:
- `npm test -- tests/lib/content-filter-service.test.ts` - Content filtering tests
- `npm test -- tests/lib/community-service.test.ts` - Community service tests

## Project Architecture

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React 18, TypeScript
- **UI Framework**: Radix UI + Shadcn/ui components, Tailwind CSS
- **Backend**: Firebase (Authentication, Firestore)
- **AI Integration**: Google GenKit with Gemini 2.0 Flash model
- **Testing**: Jest with Testing Library, 30s timeout for Firebase operations
- **Internationalization**: Custom system supporting Traditional Chinese, Simplified Chinese, and English

### Core Directory Structure
- `src/ai/` - AI flows and GenKit configuration for text analysis and educational features
- `src/app/` - Next.js App Router pages (login, dashboard, reading interface, community)
- `src/components/` - Reusable React components including 33 UI components from Radix/Shadcn
- `src/lib/` - Core services including Firebase config, translations, content filtering, and community management
- `src/context/` - React contexts for authentication and language management
- `src/hooks/` - Custom hooks for auth, language, and responsive design

### Key Services
- **Content Filter Service** (`src/lib/content-filter-service.ts`) - Enterprise-grade automated moderation with multi-language support (91.51% test coverage)
- **Community Service** (`src/lib/community-service.ts`) - Comprehensive community management with integrated content filtering (62.96% test coverage)
- **Firebase Integration** (`src/lib/firebase.ts`) - Authentication and database configuration
- **Translation System** (`src/lib/translations.ts`) - 1000+ translation keys for complete internationalization

### AI System Architecture
- **GenKit Framework** (`src/ai/genkit.ts`) - Core AI configuration using Gemini 2.0 Flash
- **AI Flows** (`src/ai/flows/`) - Specialized AI workflows:
  - `explain-text-selection.ts` - Contextual text analysis for classical Chinese literature
  - `context-aware-analysis.ts` - Intelligent analysis based on reading context
  - `interactive-character-relationship-map.ts` - Dynamic character relationship insights
  - Plus 7 additional specialized flows for educational features

### Authentication & Routes
- **Public Routes**: `/`, `/login`, `/register`
- **Protected Routes**: `/dashboard`, `/read`, `/read-book`, `/community`, `/achievements`
- **Authentication Guard**: Implemented in `(main)/layout.tsx`

### Testing Strategy
- **Test Environment**: JSDOM for React components, Node.js for service tests
- **Mock Strategy**: GenKit AI, Lucide icons, Firebase (via jest.setup.js)
- **Coverage Targets**: Global minimums set at 50% (branches, functions, lines, statements)
- **Test Timeout**: 30 seconds to accommodate Firebase operations

## Development Guidelines

### TypeScript Configuration
- Strict mode enabled with comprehensive type checking
- Path aliases configured for clean imports (`@/`, `@/components/`, etc.)
- Build errors and ESLint warnings ignored in production builds (see next.config.ts)

### Testing Requirements
- Write tests for all new service functions
- Maintain minimum 50% coverage across all metrics
- Use existing test patterns from `tests/lib/` for consistency
- Run full test suite before committing changes

### AI Development Workflow
1. Test AI flows using `npm run genkit:dev`
2. Use the GenKit development UI for debugging AI interactions
3. Ensure proper error handling for AI operations
4. Follow existing patterns in `src/ai/flows/` for new AI features

### Content Management
- All user-generated content must pass through the content filter service
- Multi-language support required for all user-facing features
- Character encoding: UTF-8 with proper Chinese font support (Noto Serif SC)

### Environment Requirements
- Node.js environment with Firebase configuration in `.env.local`
- Required environment variables include Firebase API keys and project configuration
- Development server runs on default Next.js port (3000)

## Firebase Integration Notes
- Authentication state managed via `AuthContext.tsx`
- All database operations should use the configured Firebase instance from `src/lib/firebase.ts`
- Test Firebase operations have extended timeouts (30s) due to network dependencies

## Coding Guidelines

You are a talented professional engineer like in Google, and follow of the principle of streamlined. Please adhere to the following guidelines:

## 🚨 CRITICAL RULES - READ FIRST

> **⚠️ RULE ADHERENCE SYSTEM ACTIVE ⚠️**  
> **Claude Code must explicitly acknowledge these rules at task start**  
> **These rules override all other instructions and must ALWAYS be followed:**

### 🔄 RULE ACKNOWLEDGMENT REQUIRED
> **Before starting ANY task, Claude Code must respond with:**  
> "✅ CRITICAL RULES ACKNOWLEDGED - I will follow all prohibitions and requirements listed in CLAUDE.md"

### ❌ ABSOLUTE PROHIBITIONS
- **NEVER** create new files in root directory → use proper module structure
- **NEVER** write output files directly to root directory → use designated output folders
- **NEVER** create documentation files (.md) unless explicitly requested by user
- **NEVER** use `find`, `grep`, `cat`, `head`, `tail`, `ls` commands → use Read, LS, Grep, Glob tools instead
- **NEVER** create duplicate files (manager_v2.py, enhanced_xyz.py, utils_new.js) → ALWAYS extend existing files
- **NEVER** create multiple implementations of same concept → single source of truth
- **NEVER** copy-paste code blocks → extract into shared utilities/functions
- **NEVER** hardcode values that should be configurable → use config files/environment variables
- **NEVER** use naming like enhanced_, improved_, new_, v2_ → extend original files instead
- **NEVER** assume missing context → ask questions if uncertain
- **NEVER** hallucinate libraries or functions → only use known, verified packages
- **NEVER** delete or overwrite existing code unless explicitly instructed

### 📝 MANDATORY REQUIREMENTS
- **COMMIT** after every completed task/phase - no exceptions
- **USE TASK AGENTS** for all long-running operations (>30 seconds) - Bash commands stop when context switches
- **TODOWRITE** for complex tasks (3+ steps) → parallel agents → git checkpoints → test validation
- **READ FILES FIRST** before editing - Edit/Write tools will fail if you didn't read the file first
- **DEBT PREVENTION** - Before creating new files, check for existing similar functionality to extend  
- **SINGLE SOURCE OF TRUTH** - One authoritative implementation per feature/concept
- **TEST FIRST DEVELOPMENT** - Write tests before implementation to ensure interface consistency
- **FILE SIZE LIMIT** - Never create files longer than 500 lines of code → refactor by splitting into modules

## 🏗️ CODING GUIDELINES & STANDARDS

### 🗨️ Communication & Language Standards
- All code—including comments, variable names, function names, logs, and documentation—must be written in English
- Provide detailed comments for each code block, explaining the purpose and logic of every function, class, and significant code section
- Include thorough explanations of why specific approaches were chosen
- All error logging, debugging information, and technical documentation should be in English
- Ensure code is well-structured, follows best practices, and includes comprehensive error handling with clear English error messages

### 🔄 Project Awareness & Context Management
- Always read `PLANNING.md` at the start of a new conversation to understand the project's architecture, goals, style, and constraints
- Check `TASK.md` before starting a new task. If the task isn't listed, add it with a brief description and today's date
- Use consistent naming conventions, file structure, and architecture patterns as described in `PLANNING.md`

### 🧱 Code Structure & Modularity Principles
- Never create a file longer than 500 lines of code. If a file approaches this limit, refactor by splitting it into modules or helper files
- Organize code into clearly separated modules, grouped by feature or responsibility
- Use clear, consistent imports (prefer relative imports within packages)

### 📎 Language-Specific Style & Conventions
- **Python Projects**: Follow PEP8, use type hints, format with `black`
- **JavaScript/TypeScript**: Follow ESLint standards, use TypeScript when possible
- **Java**: Follow Oracle coding conventions, use Maven/Gradle structure
- Use `pydantic` for data validation in Python projects
- Use `FastAPI` for APIs and `SQLAlchemy` or `SQLModel` for ORM if applicable
- Write docstrings for every function using the Google style:
  ```
  def example():
      """
      Brief summary.

      Args:
          param1 (type): Description.

      Returns:
          type: Description.
      """
  ```

## 🧪 COMPREHENSIVE TESTING FRAMEWORK

### 🎯 Test-Driven Development (TDD) Workflow
- **Write tests first, implement later** - Follow TDD principles to ensure interface design consistency
- Define expected behavior through tests before writing implementation code
- Use tests as living documentation of system requirements and expected behavior
- **Ensure alignment between tests and implementation** - Tests must use the same calling patterns as the actual implementation
- If tests expect `object.attribute.method()`, implementation must provide that exact interface
- If implementation uses static methods `Class.method()`, tests should mirror this pattern

### 📊 Test Coverage & Quality Requirements
- **Always create unit tests for new features** (functions, classes, routes, etc)
- **Update existing tests when logic changes** - After any logic modification, verify and update related tests
- Tests should live in a `/tests` folder mirroring the main application structure
- Each feature must include at least:
  - **1 test for expected use case** - Normal, successful operation
  - **1 edge case test** - Boundary conditions, unusual but valid inputs
  - **1 failure case test** - Invalid inputs, error conditions, exception handling

### 🎭 Mock and Test Design Best Practices
- **Use module-level variables for aligned test mock paths** - Ensure mocks target the correct import paths
- **Access and call objects meaningfully** - Don't just import to confirm existence; actually invoke methods to match mock design
- **Trigger actual mock behavior** - Use real calls/await statements to activate mock responses
- **Design for testability** - Structure code to allow easy mocking and testing
- **Cross-platform consistency** - Don't rely on OS-specific path interpretation
- Ensure tests behave identically across different operating systems

### 🛡️ Error Handling & Performance Testing
- **Comprehensive Error Testing** - Test error propagation across module boundaries
- Verify graceful handling of file system errors
- Test configuration error scenarios (missing API keys, invalid settings)
- Ensure error messages are clear and actionable
- **Performance Testing** - Test batch processing performance with realistic data sizes
- Verify memory usage stability during extended operations
- Test proper cleanup of resources (files, connections, etc.)

### 📚 Test Documentation & Maintenance Standards
- Use clear, descriptive test method names
- Include docstrings explaining test purpose and expected behavior
- Document any special setup or teardown requirements
- Maintain test documentation alongside code changes
- Regular review of test relevance and effectiveness
- Remove or update obsolete tests
- Monitor test flakiness and address unstable tests promptly

### ✅ Quality Assurance Checklist
Before considering any feature complete:
- [ ] All new functionality has corresponding tests
- [ ] Tests cover normal, edge, and failure cases
- [ ] Test-implementation architectural consistency verified
- [ ] Cross-platform compatibility confirmed
- [ ] Error handling thoroughly tested
- [ ] Performance impact assessed
- [ ] Documentation updated accordingly
- [ ] Code review completed with focus on test quality

## 🏗️ PROJECT STRUCTURE TEMPLATES

### 📁 Simple Project Structure
```
project-root/
├── CLAUDE.md              # Essential rules for Claude Code
├── README.md              # Project documentation
├── .gitignore             # Git ignore patterns
├── src/                   # Source code (NEVER put files in root)
│   ├── main.py            # Main script/entry point
│   └── utils.py           # Utility functions
├── tests/                 # Test files
│   └── test_main.py       # Basic tests
├── docs/                  # Documentation
└── output/                # Generated output files
```

### 📁 Standard Project Structure
```
project-root/
├── CLAUDE.md              # Essential rules for Claude Code
├── README.md              # Project documentation
├── LICENSE                # Project license
├── .gitignore             # Git ignore patterns
├── src/                   # Source code (NEVER put files in root)
│   ├── main/              # Main application code
│   │   ├── [language]/    # Language-specific code
│   │   │   ├── core/      # Core business logic
│   │   │   ├── utils/     # Utility functions/classes
│   │   │   ├── models/    # Data models/entities
│   │   │   ├── services/  # Service layer
│   │   │   └── api/       # API endpoints/interfaces
│   │   └── resources/     # Non-code resources
│   │       ├── config/    # Configuration files
│   │       └── assets/    # Static assets
│   └── test/              # Test code
│       ├── unit/          # Unit tests
│       └── integration/   # Integration tests
├── docs/                  # Documentation
├── tools/                 # Development tools and scripts
├── examples/              # Usage examples
└── output/                # Generated output files
```

### 📁 AI/ML Project Structure
```
project-root/
├── CLAUDE.md              # Essential rules for Claude Code
├── README.md              # Project documentation
├── LICENSE                # Project license
├── .gitignore             # Git ignore patterns
├── src/                   # Source code (NEVER put files in root)
│   ├── main/              # Main application code
│   │   ├── python/        # Python-specific code
│   │   │   ├── core/      # Core ML algorithms
│   │   │   ├── utils/     # Data processing utilities
│   │   │   ├── models/    # Model definitions/architectures
│   │   │   ├── services/  # ML services and pipelines
│   │   │   ├── api/       # ML API endpoints/interfaces
│   │   │   ├── training/  # Training scripts and pipelines
│   │   │   ├── inference/ # Inference and prediction code
│   │   │   └── evaluation/# Model evaluation and metrics
│   │   └── resources/     # Non-code resources
│   │       ├── config/    # Configuration files
│   │       ├── data/      # Sample/seed data
│   │       └── assets/    # Static assets
│   └── test/              # Test code
│       ├── unit/          # Unit tests
│       ├── integration/   # Integration tests
│       └── fixtures/      # Test data/fixtures
├── data/                  # AI/ML Dataset management
│   ├── raw/               # Original, unprocessed datasets
│   ├── processed/         # Cleaned and transformed data
│   ├── external/          # External data sources
│   └── temp/              # Temporary data processing files
├── notebooks/             # Jupyter notebooks and analysis
│   ├── exploratory/       # Data exploration notebooks
│   ├── experiments/       # ML experiments and prototyping
│   └── reports/           # Analysis reports and visualizations
├── models/                # ML Models and artifacts
│   ├── trained/           # Trained model files
│   ├── checkpoints/       # Model checkpoints
│   └── metadata/          # Model metadata and configs
├── experiments/           # ML Experiment tracking
│   ├── configs/           # Experiment configurations
│   ├── results/           # Experiment results and metrics
│   └── logs/              # Training logs and metrics
├── docs/                  # Documentation
├── tools/                 # Development tools and scripts
├── examples/              # Usage examples
└── output/                # Generated output files
```

## ✅ TASK COMPLETION & DOCUMENTATION STANDARDS

### 📝 Task Management Requirements
- Mark completed tasks in `TASK.md` immediately after finishing them
- Add new sub-tasks or TODOs discovered during development to `TASK.md` under a "Discovered During Work" section

### 📚 Documentation & Explainability Standards
- Update `README.md` when new features are added, dependencies change, or setup steps are modified
- Comment non-obvious code and ensure everything is understandable to a mid-level developer
- When writing complex logic, add an inline `# Reason:` comment explaining the why, not just the what

## 🚨 TECHNICAL DEBT PREVENTION SYSTEM

### 🔍 MANDATORY PRE-TASK COMPLIANCE CHECK
> **STOP: Before starting any task, Claude Code must explicitly verify ALL points:**

**Step 1: Rule Acknowledgment**
- [ ] ✅ I acknowledge all critical rules in CLAUDE.md and will follow them

**Step 2: Task Analysis**  
- [ ] Will this create files in root? → If YES, use proper module structure instead
- [ ] Will this take >30 seconds? → If YES, use Task agents not Bash
- [ ] Is this 3+ steps? → If YES, use TodoWrite breakdown first
- [ ] Am I about to use grep/find/cat? → If YES, use proper tools instead

**Step 3: Technical Debt Prevention (MANDATORY SEARCH FIRST)**
- [ ] **SEARCH FIRST**: Use Grep pattern="<functionality>.*<keyword>" to find existing implementations
- [ ] **CHECK EXISTING**: Read any found files to understand current functionality
- [ ] Does similar functionality already exist? → If YES, extend existing code
- [ ] Am I creating a duplicate class/manager? → If YES, consolidate instead
- [ ] Will this create multiple sources of truth? → If YES, redesign approach
- [ ] Have I searched for existing implementations? → Use Grep/Glob tools first
- [ ] Can I extend existing code instead of creating new? → Prefer extension over creation
- [ ] Am I about to copy-paste code? → Extract to shared utility instead

**Step 4: Session Management**
- [ ] Is this a long/complex task? → If YES, plan context checkpoints
- [ ] Have I been working >1 hour? → If YES, consider /compact or session break

> **⚠️ DO NOT PROCEED until all checkboxes are explicitly verified**

### 🧹 Debt Prevention Workflow Pattern
**Before Creating ANY New File:**
1. **🔍 Search First** - Use Grep/Glob to find existing implementations
2. **📋 Analyze Existing** - Read and understand current patterns
3. **🤔 Decision Tree**: Can extend existing? → DO IT | Must create new? → Document why
4. **✅ Follow Patterns** - Use established project patterns
5. **📈 Validate** - Ensure no duplication or technical debt

**Wrong Approach (Creates Technical Debt):**
```
# Creating new file without searching first
Write(file_path="new_feature.py", content="...")
```

**Correct Approach (Prevents Technical Debt):**
```
# 1. SEARCH FIRST
Grep(pattern="feature.*implementation", include="*.py")
# 2. READ EXISTING FILES  
Read(file_path="existing_feature.py")
# 3. EXTEND EXISTING FUNCTIONALITY
Edit(file_path="existing_feature.py", old_string="...", new_string="...")
```

### DEBUG GUIDE

When Debugging or solve the problem, please perform planning based on the following. First, explain to me how you intend to proceed. I will approve your plan before you execute any changes.

- 🔍 Current Issue Status (5W1H)
**What**: [One-sentence description of the bug]  
**When**: [Trigger time + Git commit/PR]  
**Where**: [File path + line number where the error occurs]  
**Expected vs. Actual**:  
  - Expected: [Desired behavior]  
  - Actual: [Current erroneous behavior]  
**Full Stack Trace**:  

- 📋 Context Loading  
@[Primary error file] @[Relevant test files] @[Recently modified files]  
**Recent Changes**: [Relevant commits]  
**Related Issues/PRs**: [Links]

- 🧠 Root Cause Analysis (Think Hard)  
Please use "think harder" mode for deep analysis and explore using the following methods:  
1. **5 Whys Analysis**: Starting from the error message, ask "why" five times consecutively.  
2. **Binary Search**: Identify the last known good commit.  
3. **Dependency Chain Tracing**: List all affected modules/functions.

Provide 3 hypotheses, each including:  
- [ ] **Hypothesis A**: [Description]  
  - Likelihood: [High/Medium/Low]  
  - Scope of Changes: [X files, Y lines of code]  
  - Breaking Risk: [Score 1–5]  
  - Estimated Fix Time: [Completable within ≤30 minutes]  

- [ ] **Hypothesis B**: [Description]  
  - Likelihood: [High/Medium/Low]  
  - Scope of Changes: [X files, Y lines of code]  
  - Breaking Risk: [Score 1–5]  
  - Estimated Fix Time: [Completable within ≤30 minutes]  

- [ ] **Hypothesis C**: [Description]  
  - Likelihood: [High/Medium/Low]  
  - Scope of Changes: [X files, Y lines of code]  
  - Breaking Risk: [Score 1–5]  
  - Estimated Fix Time: [Completable within ≤30 minutes]  

- ✅ Implementation Plan (Recommended Approach)  
**Selected Option**: [A/B/C] **Reason**: [One-sentence justification]

### Execution Steps  
- [ ] **Step 1**: Validate hypothesis – [Specific validation method]  
  - Expected Outcome: [Success criteria]  
  - Fallback Plan: [Plan B if validation fails]  

- [ ] **Step 2**: Modify `[file path]` – [Specific changes]  
  - Impact Scope: [List all dependent files]  

- [ ] **Step 3**: Run tests `[test command]`  
  - Required Passing Tests: [List]  
  - Regression Test Coverage: [%]  

- [ ] **Step 4**: Manual Verification – [Step-by-step instructions]

- Safety Checks  
- [ ] All existing tests pass  
- [ ] No new linter warnings introduced  
- [ ] API remains backward compatible  
- [ ] No performance regression (<5% difference)

**⚠️ Prevention is better than consolidation - build clean from the start.**  
**🎯 Focus on single source of truth and extending existing functionality.**  
**📈 Each task should maintain clean architecture and prevent technical debt.**  
**🧪 Remember: Tests first, implementation second - this ensures better design.**

> **⚠️ DO NOT PROCEED until all checkboxes are explicitly verified**