/**
 * Unit test for PerplexityStreamProcessor with PROPER <think>...</think> tags
 *
 * This test uses simulated data that matches the format from:
 * docs/testing/perplexity_api_running_test_log/live-run-pretty-1764657549102.txt
 *
 * Purpose: Verify StreamProcessor correctly handles content WITH proper <think> tags
 */

import {
  PerplexityStreamProcessor,
  StructuredChunk,
} from '@/lib/streaming/perplexity-stream-processor';

describe('PerplexityStreamProcessor with proper <think> tags', () => {
  let processor: PerplexityStreamProcessor;

  beforeEach(() => {
    processor = new PerplexityStreamProcessor();
  });

  test('correctly separates thinking from answer when <think> tag is present', () => {
    // Simulate streaming chunks that match the format from live-run-pretty-1764657549102.txt
    // The API sends content in small chunks via SSE
    const simulatedChunks = [
      '<think>',
      '\n用户问的是：紅樓夢的作者是誰？',
      '\n\n这是关于中国古典文学作品《红楼梦》的作者的问题。',
      '\n\n我应该直接回答。',
      '\n</think>',
      '\n\n《紅樓夢》的作者是**曹雪芹**（1715年左右 - 1763年初）[1][2]。',
      '曹雪芹出身南京名家，後因家族沒落而困窮於北京。',
    ];

    const allChunks: StructuredChunk[] = [];

    // Process each chunk
    for (const chunk of simulatedChunks) {
      const emitted = processor.processChunk(chunk);
      allChunks.push(...emitted);
      console.log(`[TEST] Input: "${chunk.substring(0, 30).replace(/\n/g, '\\n')}..." → Emitted ${emitted.length} chunk(s)`);
      for (const c of emitted) {
        console.log(`  [${c.type}] ${c.content.substring(0, 50).replace(/\n/g, '\\n')}...`);
      }
    }

    // Finalize
    const finalChunk = processor.finalize();
    console.log(`[TEST] Finalize → type=${finalChunk.type}, content=${finalChunk.content.length} chars`);

    // Analyze results
    const thinkingChunks = allChunks.filter(c => c.type === 'thinking');
    const textChunks = allChunks.filter(c => c.type === 'text');

    const totalThinking = thinkingChunks.map(c => c.content).join('');
    const totalText = textChunks.map(c => c.content).join('');

    console.log('\n=== RESULTS ===');
    console.log(`Thinking chunks: ${thinkingChunks.length}`);
    console.log(`Text chunks: ${textChunks.length}`);
    console.log(`Total thinking content (${totalThinking.length} chars):`);
    console.log(totalThinking);
    console.log(`\nTotal text content (${totalText.length} chars):`);
    console.log(totalText);

    // Assertions
    expect(thinkingChunks.length).toBeGreaterThan(0);
    expect(textChunks.length).toBeGreaterThan(0);
    expect(totalThinking).toContain('紅樓夢的作者是誰');
    expect(totalText).toContain('曹雪芹');
  });

  test('handles <think> and </think> split across chunks', () => {
    // Simulate worst case: tags are split across chunk boundaries
    const simulatedChunks = [
      '<thi',        // Partial opening tag
      'nk>',         // Complete opening tag
      '思考中...',
      '</thi',       // Partial closing tag
      'nk>',         // Complete closing tag
      '\n\n這是答案',
    ];

    const allChunks: StructuredChunk[] = [];

    for (const chunk of simulatedChunks) {
      const emitted = processor.processChunk(chunk);
      allChunks.push(...emitted);
      console.log(`[TEST] Input: "${chunk}" → Emitted ${emitted.length} chunk(s)`);
    }

    const finalChunk = processor.finalize();

    const thinkingChunks = allChunks.filter(c => c.type === 'thinking');
    const textChunks = allChunks.filter(c => c.type === 'text');

    console.log('\n=== SPLIT TAG RESULTS ===');
    console.log(`Thinking chunks: ${thinkingChunks.length}`);
    console.log(`Text chunks: ${textChunks.length}`);

    // Even with split tags, should correctly identify thinking vs text
    expect(thinkingChunks.length).toBeGreaterThan(0);
    // Text might be in finalChunk if not emitted during streaming
    const totalText = textChunks.map(c => c.content).join('') +
                      (finalChunk.type === 'complete' ? finalChunk.content : '');
    expect(totalText).toContain('答案');
  });

  test('handles </think> immediately followed by answer in same chunk', () => {
    // This is the critical case - </think> and answer content in same chunk
    const simulatedChunks = [
      '<think>思考內容',
      '</think>\n\n這是答案：曹雪芹',  // Closing tag + answer in SAME chunk
    ];

    const allChunks: StructuredChunk[] = [];

    for (const chunk of simulatedChunks) {
      const emitted = processor.processChunk(chunk);
      allChunks.push(...emitted);
      console.log(`[TEST] Input: "${chunk.substring(0, 40).replace(/\n/g, '\\n')}..." → Emitted ${emitted.length} chunk(s)`);
      for (const c of emitted) {
        console.log(`  [${c.type}] "${c.content.replace(/\n/g, '\\n')}"`);
      }
    }

    const finalChunk = processor.finalize();

    const thinkingChunks = allChunks.filter(c => c.type === 'thinking');
    const textChunks = allChunks.filter(c => c.type === 'text');

    console.log('\n=== SAME CHUNK RESULTS ===');
    console.log(`Thinking chunks: ${thinkingChunks.length}, content: ${thinkingChunks.map(c => c.content).join('')}`);
    console.log(`Text chunks: ${textChunks.length}, content: ${textChunks.map(c => c.content).join('')}`);
    console.log(`Final chunk: type=${finalChunk.type}, content="${finalChunk.content}"`);

    // Critical assertions
    expect(thinkingChunks.length).toBeGreaterThan(0);

    // THIS IS THE KEY TEST: Text chunks should contain the answer
    const allTextContent = textChunks.map(c => c.content).join('') +
                           (finalChunk.content || '');
    console.log(`All text content: "${allTextContent}"`);

    expect(allTextContent).toContain('曹雪芹');
  });

  test('handles answer content arriving in chunks after </think>', () => {
    // More realistic: </think> in one chunk, answer spread across following chunks
    const simulatedChunks = [
      '<think>',
      '用户问的是紅樓夢的作者',
      '</think>',
      '\n\n',
      '《紅樓夢》',
      '的作者是',
      '**曹雪芹**',
      '（1715年左右）',
    ];

    const allChunks: StructuredChunk[] = [];

    for (const chunk of simulatedChunks) {
      const emitted = processor.processChunk(chunk);
      allChunks.push(...emitted);
    }

    processor.finalize();

    const thinkingChunks = allChunks.filter(c => c.type === 'thinking');
    const textChunks = allChunks.filter(c => c.type === 'text');

    const totalThinking = thinkingChunks.map(c => c.content).join('');
    const totalText = textChunks.map(c => c.content).join('');

    console.log('\n=== CHUNKED ANSWER RESULTS ===');
    console.log(`Thinking (${totalThinking.length} chars): "${totalThinking}"`);
    console.log(`Text (${totalText.length} chars): "${totalText}"`);

    expect(thinkingChunks.length).toBeGreaterThan(0);
    expect(totalThinking).toContain('紅樓夢的作者');

    // Critical: answer content should be emitted as text
    expect(textChunks.length).toBeGreaterThan(0);
    expect(totalText).toContain('曹雪芹');
  });

  test('CRITICAL: handles whitespace-only chunk between </think> and answer', () => {
    // This tests the EXACT scenario that likely causes the bug:
    // Real SSE might send "\n\n" as a separate chunk
    const simulatedChunks = [
      '<think>思考內容',
      '</think>',   // Closing tag as separate chunk
      '\n\n',       // Whitespace-only chunk - THIS IS THE BUG!
      '《紅樓夢》的作者是曹雪芹',
    ];

    const allChunks: StructuredChunk[] = [];

    console.log('\n=== WHITESPACE CHUNK TEST ===');
    for (let i = 0; i < simulatedChunks.length; i++) {
      const chunk = simulatedChunks[i];
      console.log(`[Step ${i + 1}] Processing chunk: "${chunk.replace(/\n/g, '\\n')}"`);
      const emitted = processor.processChunk(chunk);
      console.log(`  -> Emitted ${emitted.length} chunk(s): ${emitted.map(c => `[${c.type}]`).join(', ') || '(none)'}`);
      allChunks.push(...emitted);
    }

    const finalChunk = processor.finalize();
    console.log(`[Finalize] type=${finalChunk.type}, content="${finalChunk.content}"`);

    const thinkingChunks = allChunks.filter(c => c.type === 'thinking');
    const textChunks = allChunks.filter(c => c.type === 'text');

    const totalThinking = thinkingChunks.map(c => c.content).join('');
    const totalText = textChunks.map(c => c.content).join('');

    console.log('\n=== RESULTS ===');
    console.log(`Thinking chunks: ${thinkingChunks.length}, total: "${totalThinking}"`);
    console.log(`Text chunks: ${textChunks.length}, total: "${totalText}"`);

    // Assertions
    expect(thinkingChunks.length).toBeGreaterThan(0);
    expect(totalThinking).toContain('思考內容');

    // THIS IS THE CRITICAL TEST - text chunks should contain the answer
    expect(textChunks.length).toBeGreaterThan(0);
    expect(totalText).toContain('曹雪芹');
  });

  test('CRITICAL: handles </think> with only newlines before answer in SAME chunk', () => {
    // Another variation: </think>\n\n in same chunk, answer in next
    const simulatedChunks = [
      '<think>思考',
      '</think>\n\n',  // Closing tag + newlines together
      '答案內容',       // Answer in separate chunk
    ];

    const allChunks: StructuredChunk[] = [];

    console.log('\n=== NEWLINES IN CLOSING TAG CHUNK TEST ===');
    for (const chunk of simulatedChunks) {
      console.log(`Processing: "${chunk.replace(/\n/g, '\\n')}"`);
      const emitted = processor.processChunk(chunk);
      console.log(`  -> Emitted: ${emitted.map(c => `[${c.type}] "${c.content.replace(/\n/g, '\\n')}"`).join(', ') || '(none)'}`);
      allChunks.push(...emitted);
    }

    processor.finalize();

    const textChunks = allChunks.filter(c => c.type === 'text');
    const totalText = textChunks.map(c => c.content).join('');

    console.log(`Text result: "${totalText}"`);

    // Answer should be captured
    expect(totalText).toContain('答案內容');
  });

  test('REPLAY: uses exact content from live-run-pretty-1764657549102.txt', () => {
    // This test uses the EXACT content from the successful API test
    // to verify StreamProcessor handles real-world data correctly
    // Source: docs/testing/perplexity_api_running_test_log/live-run-pretty-1764657549102.txt

    const fullContent = `<think>
用户问的是：紅樓夢的作者是誰？請直接作答並補充一句說明。

这是关于中国古典文学作品《红楼梦》的作者的问题。

从搜索结果中，我可以找到：

1. 《红楼梦》的作者是曹雪芹（1715年左右 - 1763年初）[1][2][4]
2. 现在流通的120回本中，前80回是曹雪芹的原作，后40回是由高鹗（或高愕）补笔的 [2][3][5]
3. 《红楼梦》是在18世纪中期，清朝中期乾隆帝的时代写成的 [1][2]

用户要求直接作答并补充一句说明。

我应该：
1. 直接回答：作者是曹雪芹
2. 补充一句说明：可以说明他的生平或作品的特点

根据限制条款，我不应该使用"根据搜索结果"这类短语。我应该直接整合信息。

另外，这不是"比较查询"、"最近新闻"、"时间敏感查询"等特殊类型，所以我应该按照普通规则回答。

让我看一下这是否是"人物"类型的查询。是的，这涉及到人物信息，但这不是传记查询，只是简单的作者身份确认和补充说明。

我应该直接回答，不需要太长，但要补充一句说明。
</think>

《紅樓夢》的作者是**曹雪芹**（1715年左右 - 1763年初）[1][2][4]。曹雪芹出身南京名家，後因家族沒落而困窮於北京，在艱苦的生活中花費約二十年的時間完成這部作品，至今流通的一百二十回版本中，前八十回為曹雪芹的原作，後四十回則由高鶚補筆[2][5]。`;

    // Simulate REALISTIC SSE chunk boundaries
    // Real SSE often splits at arbitrary points, not at semantic boundaries
    const simulatedChunks: string[] = [];
    const chunkSize = 50; // Simulate ~50 char chunks like real SSE
    for (let i = 0; i < fullContent.length; i += chunkSize) {
      simulatedChunks.push(fullContent.slice(i, i + chunkSize));
    }

    console.log(`\n=== REPLAY TEST with ${simulatedChunks.length} chunks ===`);
    console.log(`Total content length: ${fullContent.length} chars`);

    const allChunks: StructuredChunk[] = [];

    for (let i = 0; i < simulatedChunks.length; i++) {
      const chunk = simulatedChunks[i];
      const emitted = processor.processChunk(chunk);
      allChunks.push(...emitted);

      // Log interesting chunks (first 3, any with emitted chunks, last 3)
      if (i < 3 || emitted.length > 0 || i >= simulatedChunks.length - 3) {
        console.log(`[Chunk ${i + 1}/${simulatedChunks.length}] "${chunk.substring(0, 30).replace(/\n/g, '\\n')}..." → ${emitted.length} chunk(s)`);
        for (const e of emitted) {
          console.log(`  -> [${e.type}] (${e.content.length} chars)`);
        }
      }
    }

    const finalChunk = processor.finalize();
    console.log(`[Finalize] type=${finalChunk.type}, content length=${finalChunk.content.length}`);

    const thinkingChunks = allChunks.filter(c => c.type === 'thinking');
    const textChunks = allChunks.filter(c => c.type === 'text');

    const totalThinking = thinkingChunks.map(c => c.content).join('');
    const totalText = textChunks.map(c => c.content).join('');

    console.log('\n=== REPLAY RESULTS ===');
    console.log(`Thinking chunks: ${thinkingChunks.length}, total length: ${totalThinking.length}`);
    console.log(`Text chunks: ${textChunks.length}, total length: ${totalText.length}`);
    console.log(`\nThinking preview: "${totalThinking.substring(0, 100).replace(/\n/g, '\\n')}..."`);
    console.log(`Text preview: "${totalText.substring(0, 100).replace(/\n/g, '\\n')}..."`);

    // CRITICAL ASSERTIONS
    expect(thinkingChunks.length).toBeGreaterThan(0);
    expect(totalThinking).toContain('紅樓夢的作者是誰');
    expect(totalThinking).toContain('曹雪芹');

    // THE KEY TEST: Answer must be captured as TEXT, not lost
    expect(textChunks.length).toBeGreaterThan(0);
    expect(totalText).toContain('《紅樓夢》的作者是**曹雪芹**');
    expect(totalText).toContain('高鶚補筆');
  });

  test('REPLAY: simulates very small chunks (byte-level splitting)', () => {
    // Simulate worst-case: API sends 1-10 chars per chunk
    const fullContent = '<think>思考中</think>\n\n答案：曹雪芹是作者';

    // Split into tiny chunks (1-5 chars each)
    const simulatedChunks: string[] = [];
    let i = 0;
    while (i < fullContent.length) {
      const chunkSize = Math.floor(Math.random() * 5) + 1; // 1-5 chars
      simulatedChunks.push(fullContent.slice(i, i + chunkSize));
      i += chunkSize;
    }

    console.log(`\n=== TINY CHUNKS TEST with ${simulatedChunks.length} chunks ===`);
    console.log(`Chunks: ${simulatedChunks.map(c => `"${c.replace(/\n/g, '\\n')}"`).join(', ')}`);

    const allChunks: StructuredChunk[] = [];

    for (const chunk of simulatedChunks) {
      const emitted = processor.processChunk(chunk);
      allChunks.push(...emitted);
    }

    const finalChunk = processor.finalize();

    const thinkingChunks = allChunks.filter(c => c.type === 'thinking');
    const textChunks = allChunks.filter(c => c.type === 'text');

    const totalThinking = thinkingChunks.map(c => c.content).join('');
    const totalText = textChunks.map(c => c.content).join('') + (finalChunk.content || '');

    console.log(`Thinking: "${totalThinking}"`);
    console.log(`Text: "${totalText}"`);

    // Even with tiny chunks, should work
    expect(totalThinking).toContain('思考中');
    expect(totalText).toContain('曹雪芹');
  });
});

/**
 * Tests for assumeThinkingFirst option (2025-12-03)
 *
 * These tests verify the fix for Perplexity sonar-reasoning API's actual behavior:
 * - API does NOT send <think> opening tag
 * - API DOES send </think> closing tag
 * - Answer content exists after </think>
 *
 * Format comparison:
 * - Expected: <think>思考內容</think>正式回答
 * - Actual:   思考內容</think>正式回答
 */
describe('PerplexityStreamProcessor with assumeThinkingFirst option (no opening tag)', () => {
  let processor: PerplexityStreamProcessor;

  beforeEach(() => {
    processor = new PerplexityStreamProcessor({ assumeThinkingFirst: true });
  });

  test('handles actual API format: content starts without <think> tag', () => {
    // Simulate actual Perplexity sonar-reasoning API response
    // API does NOT send <think>, content starts immediately
    const simulatedChunks = [
      '用户问的是：紅樓夢的作者是誰？',
      '\n\n这是关于中国古典文学作品的问题。',
      '\n\n我应该直接回答。',
      '</think>',  // Only closing tag is sent
      '\n\n《紅樓夢》的作者是**曹雪芹**。',
    ];

    const allChunks: StructuredChunk[] = [];

    console.log('\n=== ASSUME THINKING FIRST TEST ===');
    for (const chunk of simulatedChunks) {
      const emitted = processor.processChunk(chunk);
      allChunks.push(...emitted);
      console.log(`[TEST] Input: "${chunk.substring(0, 30).replace(/\n/g, '\\n')}..." → Emitted ${emitted.length} chunk(s)`);
      for (const c of emitted) {
        console.log(`  [${c.type}] ${c.content.substring(0, 50).replace(/\n/g, '\\n')}...`);
      }
    }

    processor.finalize();

    const thinkingChunks = allChunks.filter(c => c.type === 'thinking');
    const textChunks = allChunks.filter(c => c.type === 'text');

    const totalThinking = thinkingChunks.map(c => c.content).join('');
    const totalText = textChunks.map(c => c.content).join('');

    console.log('\n=== RESULTS ===');
    console.log(`Thinking chunks: ${thinkingChunks.length}, total: ${totalThinking.length} chars`);
    console.log(`Text chunks: ${textChunks.length}, total: ${totalText.length} chars`);

    // Assertions
    expect(thinkingChunks.length).toBeGreaterThan(0);
    expect(totalThinking).toContain('紅樓夢的作者是誰');

    expect(textChunks.length).toBeGreaterThan(0);
    expect(totalText).toContain('曹雪芹');
  });

  test('REPLAY: simulates exact Perplexity sonar-reasoning API pattern', () => {
    // This test uses content format matching actual API logs
    // Key difference: NO <think> opening tag
    const fullContent = `用户问的是：紅樓夢的作者是誰？請直接作答並補充一句說明。

这是关于中国古典文学作品《红楼梦》的作者的问题。

从搜索结果中，我可以找到：

1. 《红楼梦》的作者是曹雪芹（1715年左右 - 1763年初）
2. 现在流通的120回本中，前80回是曹雪芹的原作

让我看一下这是否是"人物"类型的查询。是的，这涉及到人物信息。

我应该直接回答，不需要太长，但要补充一句说明。
</think>

《紅樓夢》的作者是**曹雪芹**（1715年左右 - 1763年初）。曹雪芹出身南京名家，後因家族沒落而困窮於北京，在艱苦的生活中花費約二十年的時間完成這部作品。`;

    // Simulate realistic SSE chunk boundaries
    const simulatedChunks: string[] = [];
    const chunkSize = 50;
    for (let i = 0; i < fullContent.length; i += chunkSize) {
      simulatedChunks.push(fullContent.slice(i, i + chunkSize));
    }

    console.log(`\n=== SONAR-REASONING REPLAY TEST with ${simulatedChunks.length} chunks ===`);

    const allChunks: StructuredChunk[] = [];

    for (const chunk of simulatedChunks) {
      const emitted = processor.processChunk(chunk);
      allChunks.push(...emitted);
    }

    processor.finalize();

    const thinkingChunks = allChunks.filter(c => c.type === 'thinking');
    const textChunks = allChunks.filter(c => c.type === 'text');

    const totalThinking = thinkingChunks.map(c => c.content).join('');
    const totalText = textChunks.map(c => c.content).join('');

    console.log('\n=== RESULTS ===');
    console.log(`Thinking chunks: ${thinkingChunks.length}, total length: ${totalThinking.length}`);
    console.log(`Text chunks: ${textChunks.length}, total length: ${totalText.length}`);
    console.log(`\nThinking preview: "${totalThinking.substring(0, 80).replace(/\n/g, '\\n')}..."`);
    console.log(`Text preview: "${totalText.substring(0, 80).replace(/\n/g, '\\n')}..."`);

    // CRITICAL ASSERTIONS
    expect(thinkingChunks.length).toBeGreaterThan(0);
    expect(totalThinking).toContain('紅樓夢的作者是誰');
    expect(totalThinking).toContain('曹雪芹');

    // THE KEY TEST: Answer must be captured as TEXT
    expect(textChunks.length).toBeGreaterThan(0);
    expect(totalText).toContain('《紅樓夢》的作者是**曹雪芹**');
  });

  test('handles </think> split across chunks without opening tag', () => {
    // Simulate </think> split across chunk boundaries
    const simulatedChunks = [
      '思考過程中',
      '繼續分析',
      '</thi',  // Partial closing tag
      'nk>',    // Complete closing tag
      '\n\n這是答案',
    ];

    const allChunks: StructuredChunk[] = [];

    for (const chunk of simulatedChunks) {
      const emitted = processor.processChunk(chunk);
      allChunks.push(...emitted);
    }

    const finalChunk = processor.finalize();

    const thinkingChunks = allChunks.filter(c => c.type === 'thinking');
    const textChunks = allChunks.filter(c => c.type === 'text');

    const totalText = textChunks.map(c => c.content).join('') +
                      (finalChunk.content || '');

    console.log('\n=== SPLIT TAG WITHOUT OPENING TEST ===');
    console.log(`Thinking chunks: ${thinkingChunks.length}`);
    console.log(`Text: "${totalText}"`);

    // Even with split tags and no opening tag, should correctly identify thinking vs text
    expect(thinkingChunks.length).toBeGreaterThan(0);
    expect(totalText).toContain('答案');
  });

  test('CRITICAL: handles empty thinking before </think>', () => {
    // Edge case: </think> arrives immediately
    const simulatedChunks = [
      '</think>',  // Immediate closing tag
      '\n\n這是答案內容',
    ];

    const allChunks: StructuredChunk[] = [];

    for (const chunk of simulatedChunks) {
      const emitted = processor.processChunk(chunk);
      allChunks.push(...emitted);
    }

    processor.finalize();

    const textChunks = allChunks.filter(c => c.type === 'text');
    const totalText = textChunks.map(c => c.content).join('');

    console.log('\n=== EMPTY THINKING TEST ===');
    console.log(`Text: "${totalText}"`);

    // Answer should still be captured
    expect(totalText).toContain('答案內容');
  });

  test('correctly accumulates getAllThinking() without opening tag', () => {
    // Process multiple thinking chunks
    processor.processChunk('第一段思考內容。');
    processor.processChunk('第二段思考內容。');
    processor.processChunk('第三段思考內容。');
    processor.processChunk('</think>答案內容');

    const allThinking = processor.getAllThinking();

    expect(allThinking).toContain('第一段思考內容');
    expect(allThinking).toContain('第二段思考內容');
    expect(allThinking).toContain('第三段思考內容');
    expect(allThinking).not.toContain('答案內容');
  });
});
