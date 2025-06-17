# The Chamber of Red Mansion (紅樓慧讀) - AI-Powered Learning Platform

A modern Next.js web application that provides an intelligent reading companion for exploring the Chinese classical novel "Dream of the Red Chamber" (紅樓夢). This platform combines AI technology with traditional literature to create an interactive learning experience for students and literature enthusiasts.

## 🏗️ Project Structure

```
test+++
TheChamber_Of_RedMansion_FireBaseStudio/
├── src/
│   ├── ai/                    # AI integration and flows
│   ├── app/                   # Next.js App Router pages
│   ├── components/            # Reusable React components
│   ├── context/              # React Context providers
│   ├── hooks/                # Custom React hooks
│   └── lib/                  # Utility functions and configurations
├── docs/                     # Project documentation
├── public/                   # Static assets
└── Configuration files       # Package.json, Tailwind, TypeScript configs
```

## 📁 Detailed File Structure & Purpose

### 🤖 AI Integration (`/src/ai/`)
- **`genkit.ts`** - Core AI configuration using Google's GenKit framework for integrating Gemini 2.0 Flash model. This file sets up the AI plugin and model configuration for all AI-powered features.
- **`dev.ts`** - Development server configuration for AI features. Used for testing and developing AI flows in isolation.
- **`flows/`** - Contains specific AI workflow implementations:
  - **`explain-text-selection.ts`** - AI flow that provides contextual explanations for selected text passages from the novel using traditional Chinese. Analyzes user questions about specific text snippets within chapter context.
  - **`context-aware-analysis.ts`** - Provides intelligent analysis based on reading context and user progress.
  - **`interactive-character-relationship-map.ts`** - Generates dynamic character relationship insights using AI.
  - **`ai-writing-coach.ts`** - AI-powered writing assistance for literary analysis.
  - **`connect-themes-to-modern-contexts.ts`** - Links classical themes to contemporary relevance.
  - **`generate-goal-suggestions.ts`** - Creates personalized learning objectives.
  - **`learning-analysis.ts`** - Analyzes user learning patterns and progress.
  - **`personalized-goal-generation.ts`** - Generates customized learning goals based on user preferences and progress.
  - **`generate-special-topic-framework.ts`** - Creates structured frameworks for special topic discussions and analysis.
  - **`ai-companion-guidance.ts`** - Provides AI-powered guidance and suggestions for learning path optimization.

### 🎯 Application Pages (`/src/app/`)
- **`layout.tsx`** - Root layout component that wraps the entire application with authentication, language providers, and global styling. Defines metadata and includes necessary fonts.
- **`page.tsx`** - Homepage component featuring hero section, challenges identification, solutions presentation, and call-to-action areas with multilingual support.
- **`globals.css`** - Global CSS styles including dark theme variables, font imports (Noto Serif SC for Chinese text), and base styling for the application.
- **`login/page.tsx`** - Secure login page with Firebase Authentication, form validation, error handling, and multilingual support for user signin.
- **`register/page.tsx`** - Multi-step registration wizard with user profile setup, learning preferences, and personalized onboarding experience.
- **`(main)/layout.tsx`** - Protected area layout with authentication guards, adaptive layout rendering, and conditional display for different page contexts.
- **`(main)/`** - Main application routes including:
  - **`dashboard/page.tsx`** - User dashboard with animated progress tracking, learning statistics, recent activity carousel, and goal management. Features comprehensive overview of user engagement with visual indicators and quick navigation.
  - **`read/page.tsx`** - Digital library interface for book selection with categorized collections, responsive grid layout, and multi-edition access. Provides gateway to different versions and scholarly interpretations.
  - **`read-book/page.tsx`** - Immersive interactive reading interface with AI-powered text analysis, customizable themes, search functionality, knowledge graph integration, and note-taking capabilities. Core reading experience component.
  - **`community/page.tsx`** - Social learning platform with user-generated content posting, interactive commenting system, like/reaction features, and scholarly discussion forums for collaborative learning.
  - **`achievements/page.tsx`** - Comprehensive gamification system with achievement badges, learning statistics, goal setting, challenge systems, and progress visualization to motivate continued learning.
  - **`characters/page.tsx`** - [REMOVED] Character analysis and relationship mapping features (originally designed for interactive character profiles and relationship visualizations).
  - **`research/page.tsx`** - [REMOVED] Advanced literary research tools (originally intended for scholarly analysis, citation management, and academic research features).
  - **`write/page.tsx`** - [REMOVED] AI-powered writing assistance (originally designed for literary analysis writing support and creative writing features).
  - **`goals/page.tsx`** - [REMOVED] Learning goal setting and tracking (originally intended for personalized learning objectives and progress management).
  - **`modern-relevance/page.tsx`** - [REMOVED] Contemporary context connections (originally designed to link classical themes with modern applications).

### 🧩 Components (`/src/components/`)
- **`SimulatedKnowledgeGraph.tsx`** - Interactive visualization component for displaying character relationships and thematic connections within the novel.
- **`layout/`** - Layout components for application structure:
  - **`AppShell.tsx`** - Main application shell with navigation, sidebar, and content area management. Provides consistent layout structure across all protected pages.
- **`ui/`** - Comprehensive UI component library built on Radix UI primitives (33 components total):
  - **Core Interface Components:**
    - **`button.tsx`**, **`card.tsx`**, **`dialog.tsx`**, **`alert.tsx`** - Basic interface components with consistent styling
    - **`badge.tsx`**, **`avatar.tsx`**, **`skeleton.tsx`** - Visual indicator and placeholder components
  - **Form Components:**
    - **`form.tsx`**, **`input.tsx`**, **`textarea.tsx`**, **`label.tsx`** - Form-related components for user interactions
    - **`checkbox.tsx`**, **`radio-group.tsx`**, **`select.tsx`**, **`switch.tsx`**, **`slider.tsx`** - Input control components
  - **Navigation & Layout:**
    - **`tabs.tsx`**, **`accordion.tsx`**, **`menubar.tsx`**, **`dropdown-menu.tsx`** - Navigation and organization components
    - **`sidebar.tsx`**, **`sheet.tsx`**, **`separator.tsx`** - Layout and sectioning components
  - **Data Display:**
    - **`table.tsx`**, **`chart.tsx`**, **`calendar.tsx`**, **`progress.tsx`** - Data visualization and presentation components
  - **Feedback & Interaction:**
    - **`toast.tsx`**, **`toaster.tsx`**, **`tooltip.tsx`**, **`alert-dialog.tsx`** - User feedback and notification systems
    - **`popover.tsx`**, **`scroll-area.tsx`** - Interactive overlay and scrolling components

### 🔄 Context Providers (`/src/context/`)
- **`AuthContext.tsx`** - Firebase authentication state management with loading states and user session handling. Provides authentication status across the entire application.
- **`LanguageContext.tsx`** - Internationalization context supporting Traditional Chinese, Simplified Chinese, and English with localStorage persistence and dynamic language switching.

### 🪝 Custom Hooks (`/src/hooks/`)
- **`useAuth.ts`** - Authentication hook that provides easy access to user authentication state and methods.
- **`useLanguage.ts`** - Language switching hook with translation function access for multilingual support.
- **`use-toast.ts`** - Toast notification management hook for user feedback and alerts.
- **`use-mobile.tsx`** - Responsive design hook for detecting mobile devices and adjusting UI accordingly.

### 📚 Library & Utilities (`/src/lib/`)
- **`firebase.ts`** - Firebase configuration and initialization including authentication setup with debugging logs for development.
- **`translations.ts`** - Comprehensive translation system supporting multiple languages with 1000+ translation keys for complete internationalization.
- **`utils.ts`** - Common utility functions including class name merging and helper functions used throughout the application.

### ⚙️ Configuration Files
- **`package.json`** - Project dependencies including Next.js 15, React 18, Firebase 11, GenKit AI, Radix UI components, and development tools.
- **`package-lock.json`** - Locked dependency versions ensuring consistent installations across different environments.
- **`next.config.ts`** - Next.js configuration with TypeScript support, image optimization for multiple domains, and webpack customization for Node.js modules.
- **`tailwind.config.ts`** - Tailwind CSS configuration with custom color schemes, Chinese font integration, animations, and design system tokens.
- **`tsconfig.json`** - TypeScript configuration with strict type checking and path aliases for clean imports.
- **`components.json`** - Shadcn/ui component library configuration for consistent UI component generation.
- **`postcss.config.mjs`** - PostCSS configuration for processing Tailwind CSS and other style transformations.
- **`.gitignore`** - Git ignore rules for excluding build artifacts, dependencies, and environment files from version control.

## 🛠️ Technologies Used & Rationale

### Frontend Framework
- **Next.js 15 with App Router** - Chosen for its excellent TypeScript support, server-side rendering capabilities, and built-in optimization features. The App Router provides a modern file-based routing system ideal for complex educational platforms.
- **React 18** - Latest React version with concurrent features for better user experience and performance in interactive learning environments.

### UI/UX Libraries
- **Radix UI + Shadcn/ui** - Provides accessible, customizable, and well-tested UI components. Essential for creating an inclusive educational platform that works for all users.
- **Tailwind CSS** - Utility-first CSS framework enabling rapid UI development with consistent design systems. Perfect for maintaining visual consistency across complex educational interfaces.
- **Lucide React** - Comprehensive icon library providing consistent iconography throughout the application.

### Authentication & Backend
- **Firebase Authentication** - Reliable, scalable authentication service with social login support. Chosen for its ease of integration and robust security features needed for user accounts in educational platforms.
- **Firebase SDK 11** - Latest version providing improved performance and TypeScript support for better developer experience.

### AI Integration
- **Google GenKit with Gemini 2.0 Flash** - Advanced AI framework specifically designed for building AI-powered applications. Gemini 2.0 Flash provides excellent Chinese language understanding crucial for analyzing classical Chinese literature.
- **Zod Schema Validation** - Ensures type-safe AI inputs and outputs, critical for reliable AI interactions in educational contexts.

### Internationalization
- **Custom Translation System** - Built-in support for Traditional Chinese, Simplified Chinese, and English. Essential for serving diverse Chinese-speaking communities and international learners.
- **Browser Language Detection** - Automatic language selection based on user preferences with manual override capability.

### State Management
- **React Context API** - Lightweight state management solution for authentication and language preferences. Chosen over more complex solutions for maintainability and simplicity.
- **TanStack Query** - Powerful data fetching and caching library for managing server state and API interactions.

### Development Tools
- **TypeScript** - Provides type safety and better developer experience, crucial for maintaining code quality in a complex educational platform.
- **ESLint & Prettier** - Code quality and formatting tools ensuring consistent code style across team members.

## 🚀 Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   Create a `.env.local` file with Firebase configuration:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

3. **Development Server**
   ```bash
   npm run dev
   ```

4. **AI Development Server** (for testing AI flows)
   ```bash
   npm run genkit:dev
   ```

## 🎯 Key Features

- **AI-Powered Text Analysis** - Contextual explanations of classical Chinese literature
- **Interactive Character Maps** - Visual relationship networks with AI insights
- **Multilingual Support** - Traditional Chinese, Simplified Chinese, and English
- **Progress Tracking** - Gamified learning with achievements and goals
- **Social Learning** - Community features for collaborative exploration
- **Modern Relevance Connections** - Linking classical themes to contemporary contexts
- **Writing Coach** - AI-assisted literary analysis and writing improvement

## 🤝 Contributing

This project is part of a senior capstone project for Information Management. Team members should follow the established coding conventions and component patterns when adding new features.

## 📖 Educational Purpose

This platform is designed to make classical Chinese literature more accessible to modern learners by combining traditional scholarship with cutting-edge AI technology. The goal is to preserve cultural heritage while making it engaging for contemporary students.
123564