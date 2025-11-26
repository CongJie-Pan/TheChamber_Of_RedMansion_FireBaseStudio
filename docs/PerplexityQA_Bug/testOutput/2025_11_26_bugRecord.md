 FAIL  tests/integration/client-processor-integration.test.ts (12.527 s)
  Integration: PerplexityClient + StreamProcessor
    Basic Chunk Flow                                                                                                                                                     
      √ should process standard QA response with thinking and answer (198 ms)                                                                                            
      √ should handle thinking-only response without error (14 ms)                                                                                                       
      √ should handle answer-only response (no thinking tags) (14 ms)                                                                                                    
    Critical Bug Fix: Incomplete <think> Tags Across Chunks                                                                                                              
      √ should buffer incomplete opening <think> tag (139 ms)                                                                                                            
      × should buffer incomplete closing </think> tag (79 ms)                                                                                                            
      × should handle multiple thinking blocks split across chunks (127 ms)                                                                                              
      × should handle extreme edge case: single character chunks (716 ms)                                                                                                
    Error Propagation                                                                                                                                                    
      × should propagate network error from fetch to generator (6 ms)                                                                                                    
      × should handle malformed JSON in SSE stream (19 ms)                                                                                                               
      √ should handle timeout during streaming (132 ms)                                                                                                                  
    Citation and Metadata Integration                                                                                                                                    
      × should preserve citations through processor (21 ms)                                                                                                              
      √ should preserve search queries through processor (22 ms)                                                                                                         
                                                                                                                                                                         
  ● Integration: PerplexityClient + StreamProcessor › Critical Bug Fix: Incomplete <think> Tags Across Chunks › should buffer incomplete closing </think> tag            
                                                                                                                                                                         
    expect(received).toBeDefined()

    Received: undefined

      244 |       // Answer should start cleanly
      245 |       const answerChunk = chunks.find(c => c.fullContent.includes('答案開始'));
    > 246 |       expect(answerChunk).toBeDefined();
          |                           ^
      247 |       expect(answerChunk!.fullContent).toBe('答案開始');
      248 |       expect(answerChunk!.fullContent).not.toContain('nk>');
      249 |     });

      at Object.<anonymous> (tests/integration/client-processor-integration.test.ts:246:27)

  ● Integration: PerplexityClient + StreamProcessor › Critical Bug Fix: Incomplete <think> Tags Across Chunks › should handle multiple thinking blocks split across chunks

    expect(received).toContain(expected) // indexOf

    Expected substring: "第一段思考"
    Received string:    "第一第一第一"

      280 |         .join('');
      281 |
    > 282 |       expect(allThinking).toContain('第一段思考');
          |                           ^
      283 |       expect(allThinking).toContain('第二段思考');
      284 |
      285 |       // Verify answer content does NOT contain thinking tags

      at Object.<anonymous> (tests/integration/client-processor-integration.test.ts:282:27)

  ● Integration: PerplexityClient + StreamProcessor › Critical Bug Fix: Incomplete <think> Tags Across Chunks › should handle extreme edge case: single character chunks 

    expect(received).toBeDefined()

    Received: undefined

      327 |       // Should correctly identify and extract thinking
      328 |       const thinkingChunk = chunks.find(c => c.thinkingContent === 'test');
    > 329 |       expect(thinkingChunk).toBeDefined();
          |                             ^
      330 |
      331 |       // Should NOT emit partial tags as answer
      332 |       const allAnswerContent = chunks

      at Object.<anonymous> (tests/integration/client-processor-integration.test.ts:329:29)

  ● Integration: PerplexityClient + StreamProcessor › Error Propagation › should propagate network error from fetch to generator

    expect(received).rejects.toThrow()

    Received promise resolved instead of rejected
    Resolved to value: undefined

      357 |       };
      358 |
    > 359 |       await expect(async () => {
          |             ^
      360 |         for await (const chunk of client.streamingCompletionRequest(input)) {
      361 |           // Should throw before yielding any chunks
      362 |         }

      at expect (node_modules/expect/build/index.js:113:15)
      at Object.<anonymous> (tests/integration/client-processor-integration.test.ts:359:13)

  ● Integration: PerplexityClient + StreamProcessor › Error Propagation › should handle malformed JSON in SSE stream

    expect(received).rejects.toThrow()

    Received promise resolved instead of rejected
    Resolved to value: undefined

      382 |       };
      383 |
    > 384 |       await expect(async () => {
          |             ^
      385 |         const chunks: PerplexityStreamingChunk[] = [];
      386 |         for await (const chunk of client.streamingCompletionRequest(input)) {
      387 |           chunks.push(chunk);

      at expect (node_modules/expect/build/index.js:113:15)
      at Object.<anonymous> (tests/integration/client-processor-integration.test.ts:384:13)

  ● Integration: PerplexityClient + StreamProcessor › Citation and Metadata Integration › should preserve citations through processor

    expect(received).toMatch(expected)

    Expected pattern: /來源 \d+/
    Received string:  "example"

      455 |       expect(chunkWithCitations!.citations![0].url).toBe('https://example.com');
      456 |       // Title is auto-generated by extractCitations() from URL index
    > 457 |       expect(chunkWithCitations!.citations![0].title).toMatch(/來源 \d+/);
          |                                                       ^
      458 |     });
      459 |
      460 |     test('should preserve search queries through processor', async () => {

      at Object.<anonymous> (tests/integration/client-processor-integration.test.ts:457:55)

                                                                                                                                                                         
📊 Test results saved to: D:\AboutUniversity\114 NSTC_and_SeniorProject\2025-IM-senior-project\TheChamber_Of_RedMansion_FireBaseStudio\test-output\test-run-2025-11-26_06-48-11-043Z\test-results.json
📋 Test summary saved to: D:\AboutUniversity\114 NSTC_and_SeniorProject\2025-IM-senior-project\TheChamber_Of_RedMansion_FireBaseStudio\test-output\test-run-2025-11-26_06-48-11-043Z\test-execution-summary.json
Test Suites: 1 failed, 1 total
Tests:       6 failed, 6 passed, 12 total
Snapshots:   0 total
Time:        12.846 s, estimated 19 s
Ran all test suites matching /tests\\integration\\client-processor-integration.test.ts/i.
🧹 Running global test teardown...
📊 Test run completed in 13s
📁 Results saved to: D:\AboutUniversity\114 NSTC_and_SeniorProject\2025-IM-senior-project\TheChamber_Of_RedMansion_FireBaseStudio\test-output\test-run-2025-11-26_06-48-11-043Z
📄 Consolidated report: D:\AboutUniversity\114 NSTC_and_SeniorProject\2025-IM-senior-project\TheChamber_Of_RedMansion_FireBaseStudio\test-output\test-run-2025-11-26_06-48-11-043Z\consolidated-report.json
📋 Generated files:
   - auth-tests/ (directory)
   - community-page/ (directory)
   - community-service/ (directory)
   - consolidated-report.json
   - coverage-reports/ (directory)
   - error-logs/ (directory)
   - test-execution-summary.json
   - test-metadata.json
   - test-results.json
   - test-summary.json
✅ Global test teardown complete