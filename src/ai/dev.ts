
/**
 * @fileOverview Development server entry point for AI flows and testing.
 * 
 * This file serves as the development configuration for GenKit's AI flows.
 * It loads environment variables and imports active AI flows for testing and development.
 * 
 * Usage: Run `npm run genkit:dev` to start the GenKit development server
 * which provides a web interface for testing AI flows interactively.
 */

// Load environment variables from .env files for development
import { config } from 'dotenv';
config(); // Initialize dotenv to access environment variables

// Import active AI flows for development and testing
// These imports register the flows with GenKit's development server

// import '@/ai/flows/generate-special-topic-framework.ts'; // Removed - not currently in use
import '@/ai/flows/context-aware-analysis.ts'; // AI flow for contextual text analysis
// import '@/ai/flows/learning-analysis.ts'; // Removed - not currently in use
import '@/ai/flows/explain-text-selection.ts'; // AI flow for explaining selected text passages
// import '@/ai/flows/grounded-red-chamber-qa.ts'; // Removed - migrated to Perplexity AI
// import '@/ai/flows/generate-goal-suggestions.ts'; // Removed - not currently in use
// import '@/ai/flows/ai-companion-guidance.ts'; // Removed - not currently in use
// import '@/ai/flows/connect-themes-to-modern-contexts.ts'; // Removed - not currently in use

/**
 * Note: Only import flows that are currently implemented and ready for testing.
 * Commented imports represent flows that are planned for future development
 * or are temporarily disabled for debugging purposes.
 */
