/** @jest-environment node */

/**
 * Single-run test: Verify if Perplexity API sends <think> and </think> tags correctly
 *
 * Purpose: Confirm whether sonar-reasoning model's raw response contains proper think tags
 *
 * Note: This test only needs to run once for bug diagnosis
 */

/*
import fs from 'fs';
import path from 'path';
import { PERPLEXITY_CONFIG } from '@/ai/perplexity-config';

jest.setTimeout(60_000);

const apiKey = process.env.PERPLEXITYAI_API_KEY;
const shouldRun = Boolean(apiKey && apiKey.trim().length > 0);
const maybe = shouldRun ? describe : describe.skip;

maybe('Perplexity Think Tag Check', () => {
  test('Comprehensive tag and content detection', async () => {
    const question = '你好';

    const requestData = {
      model: 'sonar-reasoning',
      messages: [{ role: 'user', content: question }],
      stream: true,
      temperature: 0.3,
    };

    console.log('\n=== Perplexity Think Tag Comprehensive Check ===');
    console.log(`Question: "${question}"`);
    console.log(`Model: sonar-reasoning`);

    const response = await fetch(
      `${PERPLEXITY_CONFIG.BASE_URL}${PERPLEXITY_CONFIG.CHAT_COMPLETIONS_ENDPOINT}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(requestData),
      }
    );

    expect(response.ok).toBe(true);
    const reader = response.body?.getReader();
    expect(reader).toBeDefined();

    const decoder = new TextDecoder();
    let fullRawContent = '';
    const individualChunks: string[] = []; // Store each chunk separately
    let chunkCount = 0;

    // Track which chunk contains which tag
    let chunkWithThinkOpen = -1;
    let chunkWithThinkClose = -1;

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') continue;

          try {
            const json = JSON.parse(payload);
            const deltaContent = json?.choices?.[0]?.delta?.content;
            if (typeof deltaContent === 'string') {
              individualChunks.push(deltaContent);
              fullRawContent += deltaContent;
              chunkCount++;

              // Check if this chunk contains tags
              if (deltaContent.includes('<think>') && chunkWithThinkOpen === -1) {
                chunkWithThinkOpen = chunkCount;
              }
              if (deltaContent.includes('</think>') && chunkWithThinkClose === -1) {
                chunkWithThinkClose = chunkCount;
              }
            }
          } catch {
            // ignore
          }
        }
      }
    }

    // === Case 1: Tag Detection ===
    console.log('\n' + '='.repeat(60));
    console.log('CASE 1: Tag Detection');
    console.log('='.repeat(60));

    const hasThinkOpen = fullRawContent.includes('<think>');
    const hasThinkClose = fullRawContent.includes('</think>');
    const thinkOpenIndex = fullRawContent.indexOf('<think>');
    const thinkCloseIndex = fullRawContent.indexOf('</think>');

    // Check for variations
    const hasThinkOpenNewline = fullRawContent.includes('<think>\n');
    const hasThinkOpenSpace = fullRawContent.includes('<think> ');
    const startsWithThink = fullRawContent.trimStart().startsWith('<think>');

    console.log(`\n<think> tag:`);
    console.log(`  - Exists in full content: ${hasThinkOpen ? 'YES' : 'NO'}`);
    console.log(`  - Position: ${thinkOpenIndex}`);
    console.log(`  - Found in chunk #: ${chunkWithThinkOpen === -1 ? 'NOT FOUND' : chunkWithThinkOpen}`);
    console.log(`  - With newline after: ${hasThinkOpenNewline ? 'YES' : 'NO'}`);
    console.log(`  - With space after: ${hasThinkOpenSpace ? 'YES' : 'NO'}`);
    console.log(`  - Content starts with <think>: ${startsWithThink ? 'YES' : 'NO'}`);

    console.log(`\n</think> tag:`);
    console.log(`  - Exists in full content: ${hasThinkClose ? 'YES' : 'NO'}`);
    console.log(`  - Position: ${thinkCloseIndex}`);
    console.log(`  - Found in chunk #: ${chunkWithThinkClose === -1 ? 'NOT FOUND' : chunkWithThinkClose}`);

    // Show first 3 chunks to see what API sends first
    console.log(`\n--- First 3 chunks (raw) ---`);
    for (let i = 0; i < Math.min(3, individualChunks.length); i++) {
      const escaped = individualChunks[i].replace(/\n/g, '\\n').replace(/\r/g, '\\r');
      console.log(`Chunk ${i + 1}: "${escaped}"`);
    }

    // Show content around <think> if found
    if (hasThinkOpen) {
      const contextStart = Math.max(0, thinkOpenIndex - 20);
      const contextEnd = Math.min(fullRawContent.length, thinkOpenIndex + 30);
      console.log(`\n--- Context around <think> ---`);
      console.log(`"${fullRawContent.substring(contextStart, contextEnd).replace(/\n/g, '\\n')}"`);
    }

    // Show content around </think> if found
    if (hasThinkClose) {
      const contextStart = Math.max(0, thinkCloseIndex - 20);
      const contextEnd = Math.min(fullRawContent.length, thinkCloseIndex + 30);
      console.log(`\n--- Context around </think> ---`);
      console.log(`"${fullRawContent.substring(contextStart, contextEnd).replace(/\n/g, '\\n')}"`);
    }

    // === Case 2: Content Analysis ===
    console.log('\n' + '='.repeat(60));
    console.log('CASE 2: Content Analysis');
    console.log('='.repeat(60));

    let thinkingContent = '';
    let answerContent = '';

    if (hasThinkOpen && hasThinkClose) {
      thinkingContent = fullRawContent.substring(thinkOpenIndex + 7, thinkCloseIndex);
      answerContent = fullRawContent.substring(thinkCloseIndex + 8).trim();
    } else if (!hasThinkOpen && hasThinkClose) {
      // No opening tag - everything before </think> is thinking
      thinkingContent = fullRawContent.substring(0, thinkCloseIndex);
      answerContent = fullRawContent.substring(thinkCloseIndex + 8).trim();
    } else if (hasThinkOpen && !hasThinkClose) {
      thinkingContent = fullRawContent.substring(thinkOpenIndex + 7);
      answerContent = '';
    } else {
      // No tags at all
      thinkingContent = '';
      answerContent = fullRawContent;
    }

    console.log(`\nTotal content length: ${fullRawContent.length} chars`);
    console.log(`Total chunks: ${chunkCount}`);
    console.log(`\nThinking content length: ${thinkingContent.length} chars`);
    console.log(`Answer content length: ${answerContent.length} chars`);
    console.log(`\nHas actual answer content: ${answerContent.length > 0 ? 'YES' : 'NO'}`);

    if (answerContent.length > 0) {
      console.log(`\n--- Answer preview (first 300 chars) ---`);
      console.log(answerContent.substring(0, 300).replace(/\n/g, '\\n'));
    }

    // === Summary ===
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));

    const diagnosis: string[] = [];

    if (hasThinkOpen && hasThinkClose) {
      diagnosis.push('✅ Both <think> and </think> tags present');
      diagnosis.push('   -> Tags are properly paired');
    } else if (!hasThinkOpen && hasThinkClose) {
      diagnosis.push('⚠️  Missing <think> but </think> exists');
      diagnosis.push('   -> API may be sending thinking content without opening tag');
    } else if (hasThinkOpen && !hasThinkClose) {
      diagnosis.push('❌ <think> exists but </think> missing');
      diagnosis.push('   -> Stream may have ended before closing tag');
    } else {
      diagnosis.push('❌ Neither <think> nor </think> found');
      diagnosis.push('   -> Model may not use think tags');
    }

    if (answerContent.length > 0) {
      diagnosis.push('✅ Answer content exists after </think>');
    } else {
      diagnosis.push('❌ No answer content found');
    }

    diagnosis.forEach(d => console.log(d));

    // Save results
    const logDir = path.join('docs', 'PerplexityQA_Bug', 'tag_check_result');
    fs.mkdirSync(logDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logPath = path.join(logDir, `think-tag-check-${timestamp}.txt`);

    const logContent = [
      `=== Perplexity Think Tag Comprehensive Check ===`,
      `Timestamp: ${new Date().toISOString()}`,
      `Question: ${question}`,
      `Model: sonar-reasoning`,
      ``,
      `=== CASE 1: Tag Detection ===`,
      `<think> exists: ${hasThinkOpen}`,
      `<think> position: ${thinkOpenIndex}`,
      `<think> in chunk #: ${chunkWithThinkOpen}`,
      `Content starts with <think>: ${startsWithThink}`,
      ``,
      `</think> exists: ${hasThinkClose}`,
      `</think> position: ${thinkCloseIndex}`,
      `</think> in chunk #: ${chunkWithThinkClose}`,
      ``,
      `=== First 10 chunks ===`,
      ...individualChunks.slice(0, 10).map((c, i) => `Chunk ${i + 1}: "${c.replace(/\n/g, '\\n')}"`),
      ``,
      `=== CASE 2: Content Analysis ===`,
      `Total content length: ${fullRawContent.length}`,
      `Total chunks: ${chunkCount}`,
      `Thinking content length: ${thinkingContent.length}`,
      `Answer content length: ${answerContent.length}`,
      ``,
      `=== Full Raw Content ===`,
      fullRawContent,
      ``,
      `=== Thinking Content ===`,
      thinkingContent || '(empty)',
      ``,
      `=== Answer Content ===`,
      answerContent || '(empty)',
      ``,
      `=== Diagnosis ===`,
      ...diagnosis,
    ].join('\n');

    fs.writeFileSync(logPath, logContent, 'utf8');
    console.log(`\nResults saved to: ${logPath}`);

    expect(chunkCount).toBeGreaterThan(0);
  });
});
*/
