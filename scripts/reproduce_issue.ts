
import { PerplexityClient } from '@/lib/perplexity-client';
import { PerplexityQAInput } from '@/types/perplexity-qa';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function reproduceIssue() {
  console.log('Starting reproduction script...');

  const apiKey = process.env.PERPLEXITYAI_API_KEY;
  if (!apiKey) {
    console.error('Error: PERPLEXITYAI_API_KEY not found in environment variables.');
    process.exit(1);
  }

  const client = new PerplexityClient(apiKey);

  const input: PerplexityQAInput = {
    userQuestion: '賈寶玉的性格特徵是什麼？',
    modelKey: 'sonar-reasoning', // Using the model from the logs
    reasoningEffort: 'medium',
    questionContext: 'character',
    enableStreaming: true,
    showThinkingProcess: true,
    temperature: 0.6,
    maxTokens: 4096,
  };

  console.log('Calling streamingCompletionRequest with input:', JSON.stringify(input, null, 2));

  try {
    const generator = client.streamingCompletionRequest(input);
    let chunkCount = 0;

    for await (const chunk of generator) {
      chunkCount++;
      console.log(`\n--- Chunk ${chunkCount} ---`);
      console.log('Content:', chunk.content);
      console.log('Thinking:', chunk.thinkingContent);
      console.log('Full Content:', chunk.fullContent);
      console.log('Is Complete:', chunk.isComplete);
      console.log('Has Thinking:', chunk.hasThinkingProcess);
      console.log('Derived From Thinking:', chunk.contentDerivedFromThinking);
    }

    console.log('\nStreaming completed successfully.');
  } catch (error) {
    console.error('Error during streaming:', error);
  }
}

reproduceIssue();
