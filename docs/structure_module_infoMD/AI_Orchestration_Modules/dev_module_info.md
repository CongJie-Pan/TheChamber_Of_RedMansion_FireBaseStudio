# ⚠️ DEPRECATED - Module Removed

**Status:** This module has been removed from the codebase
**Removal Date:** 2025-10-30
**Reason:** Migrated from GenKit/Gemini to OpenAI GPT-4-mini + Perplexity Sonar direct API integration

## Migration Impact

The `dev.ts` GenKit development server has been completely removed as part of the transition to direct API integration. This file was exclusively used for testing AI flows in the GenKit development UI.

### What Replaced This Module

- **Testing Approach:** AI flows are now tested through standard Jest unit tests with mocked API responses
- **Development Tools:** Direct API testing using tools like Postman or curl for manual testing
- **No Framework Overhead:** Simplified architecture without GenKit orchestration layer

### Affected Flows (Now Using Direct APIs)

**Migrated to OpenAI GPT-4-mini:**
- Daily reading comprehension scoring
- Poetry quality assessment
- Character analysis scoring
- Cultural quiz grading
- Commentary interpretation

**Migrated to Perplexity Sonar:**
- Context-aware analysis (was referenced in this module)
- Explain text selection (was referenced in this module)
- Interactive character relationship mapping

### How to Test AI Flows Now

```bash
# Run all AI flow tests
npm test

# Run specific AI flow test
npm test -- tests/ai/flows/daily-reading-comprehension.test.ts

# Run tests in watch mode during development
npm test -- --watch
```

### Related Documentation

- See `genkit_module_info.md` (also deprecated) for GenKit framework details
- See `README.md` for updated AI Integration architecture
- See individual AI flow module documentation for current implementation details

---

## Original Module Documentation (Historical Reference)

### Module Summary

The `dev` module served as the development server entry point for GenKit AI flows, initializing the local testing environment and registering active AI flows for interactive development and debugging. This module loaded environment variables from `.env` files, imported currently implemented AI flows to make them available in the GenKit development UI, and provided commented references to deprecated or planned flows for development tracking. The module was exclusively used during development via the `npm run genkit:dev` command and was not included in production builds.

### Key Components (Historical)

- **dotenv configuration:** Loaded environment variables for GenKit development
- **Flow registration:** Imported AI flows to make them available in GenKit UI
- **Development server:** Provided interactive testing interface at `http://localhost:3100`

### Migration Notes

If you need to reference the original implementation, check git history before commit `6645e86` (2025-10-30).
