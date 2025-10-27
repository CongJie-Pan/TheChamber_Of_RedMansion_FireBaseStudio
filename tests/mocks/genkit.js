/**
 * Mock for genkit module to avoid ES module issues in Jest
 * This mock provides the necessary exports that our AI flows use
 */

// Mock for zod-like validation with chainable methods
const createChainableMock = () => {
  const mock = {
    describe: jest.fn(() => mock),
    optional: jest.fn(() => mock),
    default: jest.fn(() => mock),
    min: jest.fn(() => mock),
    max: jest.fn(() => mock),
    length: jest.fn(() => mock),
    email: jest.fn(() => mock),
    url: jest.fn(() => mock),
    regex: jest.fn(() => mock),
    nullable: jest.fn(() => mock),
  };
  return mock;
};

const z = {
  object: jest.fn(() => createChainableMock()),
  string: jest.fn(() => createChainableMock()),
  boolean: jest.fn(() => createChainableMock()),
  number: jest.fn(() => createChainableMock()),
  array: jest.fn(() => createChainableMock()),
  enum: jest.fn(() => createChainableMock()),
};

// Mock ai object that mimics the genkit ai instance
const mockAi = {
  defineFlow: jest.fn((config, handler) => handler),
  definePrompt: jest.fn(() => jest.fn(() => ({ 
    output: {
      answer: 'Mock AI response',
      answerWithCitations: 'Mock AI response with citations',
      citations: [],
      searchQueries: ['mock query'],
      responseTime: 1.5,
      groundingMetadata: {
        totalSearchResults: 0,
        citationCount: 0,
        groundingSuccess: false,
      }
    }
  }))),
  generate: jest.fn(),
  generateStream: jest.fn(),
};

// Mock genkit exports
module.exports = {
  z,
  genkit: jest.fn(() => mockAi),
  ai: mockAi,
  defineFlow: jest.fn(),
  definePrompt: jest.fn(),
  generate: jest.fn(),
  generateStream: jest.fn(),
  // Mock for @genkit-ai/googleai plugin
  googleAI: jest.fn(() => ({})),
};
