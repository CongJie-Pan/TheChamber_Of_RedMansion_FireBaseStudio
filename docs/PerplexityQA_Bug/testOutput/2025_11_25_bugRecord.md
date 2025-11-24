 FAIL  tests/integration/client-processor-integration.test.ts (7.734 s)
  Integration: PerplexityClient + StreamProcessor
    Basic Chunk Flow                                                                                                                                                     
      × should process standard QA response with thinking and answer (5 ms)                                                                                              
      × should handle thinking-only response without error (1 ms)                                                                                                        
      × should handle answer-only response (no thinking tags) (1 ms)                                                                                                     
    Critical Bug Fix: Incomplete <think> Tags Across Chunks                                                                                                              
      × should buffer incomplete opening <think> tag                                                                                                                     
      × should buffer incomplete closing </think> tag (1 ms)                                                                                                             
      × should handle multiple thinking blocks split across chunks                                                                                                       
      × should handle extreme edge case: single character chunks                                                                                                         
    Error Propagation                                                                                                                                                    
      × should propagate network error from fetch to generator (28 ms)                                                                                                   
      × should handle malformed JSON in SSE stream (1 ms)                                                                                                                
      × should handle timeout during streaming (1 ms)                                                                                                                    
    Citation and Metadata Integration                                                                                                                                    
      × should preserve citations through processor (1 ms)                                                                                                               
      × should preserve search queries through processor                                                                                                                 
                                                                                                                                                                         
  ● Integration: PerplexityClient + StreamProcessor › Basic Chunk Flow › should process standard QA response with thinking and answer                                    
                                                                                                                                                                         
    TypeError: global.Response is not a constructor

      498 |   // Use global.Response (polyfilled in jest.setup.js) instead of bare Response
      499 |   // This ensures consistency with the test environment setup
    > 500 |   return new global.Response(stream, {
          |          ^
      501 |     headers: new Headers({
      502 |       'Content-Type': 'text/event-stream; charset=utf-8'
      503 |     })

      at createMockSSEResponse (tests/integration/client-processor-integration.test.ts:500:10)
      at Object.<anonymous> (tests/integration/client-processor-integration.test.ts:51:28)

  ● Integration: PerplexityClient + StreamProcessor › Basic Chunk Flow › should handle thinking-only response without error

    TypeError: global.Response is not a constructor

      498 |   // Use global.Response (polyfilled in jest.setup.js) instead of bare Response
      499 |   // This ensures consistency with the test environment setup
    > 500 |   return new global.Response(stream, {
          |          ^
      501 |     headers: new Headers({
      502 |       'Content-Type': 'text/event-stream; charset=utf-8'
      503 |     })

      at createMockSSEResponse (tests/integration/client-processor-integration.test.ts:500:10)
      at Object.<anonymous> (tests/integration/client-processor-integration.test.ts:89:28)

  ● Integration: PerplexityClient + StreamProcessor › Basic Chunk Flow › should handle answer-only response (no thinking tags)

    TypeError: global.Response is not a constructor

      498 |   // Use global.Response (polyfilled in jest.setup.js) instead of bare Response
      499 |   // This ensures consistency with the test environment setup
    > 500 |   return new global.Response(stream, {
          |          ^
      501 |     headers: new Headers({
      502 |       'Content-Type': 'text/event-stream; charset=utf-8'
      503 |     })

      at createMockSSEResponse (tests/integration/client-processor-integration.test.ts:500:10)
      at Object.<anonymous> (tests/integration/client-processor-integration.test.ts:125:28)

  ● Integration: PerplexityClient + StreamProcessor › Critical Bug Fix: Incomplete <think> Tags Across Chunks › should buffer incomplete opening <think> tag

    TypeError: global.Response is not a constructor

      498 |   // Use global.Response (polyfilled in jest.setup.js) instead of bare Response
      499 |   // This ensures consistency with the test environment setup
    > 500 |   return new global.Response(stream, {
          |          ^
      501 |     headers: new Headers({
      502 |       'Content-Type': 'text/event-stream; charset=utf-8'
      503 |     })

      at createMockSSEResponse (tests/integration/client-processor-integration.test.ts:500:10)
      at Object.<anonymous> (tests/integration/client-processor-integration.test.ts:161:28)

  ● Integration: PerplexityClient + StreamProcessor › Critical Bug Fix: Incomplete <think> Tags Across Chunks › should buffer incomplete closing </think> tag

    TypeError: global.Response is not a constructor

      498 |   // Use global.Response (polyfilled in jest.setup.js) instead of bare Response
      499 |   // This ensures consistency with the test environment setup
    > 500 |   return new global.Response(stream, {
          |          ^
      501 |     headers: new Headers({
      502 |       'Content-Type': 'text/event-stream; charset=utf-8'
      503 |     })

      at createMockSSEResponse (tests/integration/client-processor-integration.test.ts:500:10)
      at Object.<anonymous> (tests/integration/client-processor-integration.test.ts:204:28)

  ● Integration: PerplexityClient + StreamProcessor › Critical Bug Fix: Incomplete <think> Tags Across Chunks › should handle multiple thinking blocks split across chunks

    TypeError: global.Response is not a constructor

      498 |   // Use global.Response (polyfilled in jest.setup.js) instead of bare Response
      499 |   // This ensures consistency with the test environment setup
    > 500 |   return new global.Response(stream, {
          |          ^
      501 |     headers: new Headers({
      502 |       'Content-Type': 'text/event-stream; charset=utf-8'
      503 |     })

      at createMockSSEResponse (tests/integration/client-processor-integration.test.ts:500:10)
      at Object.<anonymous> (tests/integration/client-processor-integration.test.ts:243:28)

  ● Integration: PerplexityClient + StreamProcessor › Critical Bug Fix: Incomplete <think> Tags Across Chunks › should handle extreme edge case: single character chunks 

    TypeError: global.Response is not a constructor

      498 |   // Use global.Response (polyfilled in jest.setup.js) instead of bare Response
      499 |   // This ensures consistency with the test environment setup
    > 500 |   return new global.Response(stream, {
          |          ^
      501 |     headers: new Headers({
      502 |       'Content-Type': 'text/event-stream; charset=utf-8'
      503 |     })

      at createMockSSEResponse (tests/integration/client-processor-integration.test.ts:500:10)
      at Object.<anonymous> (tests/integration/client-processor-integration.test.ts:285:28)

  ● Integration: PerplexityClient + StreamProcessor › Error Propagation › should propagate network error from fetch to generator

    expect(received).rejects.toThrow(expected)

    Expected substring: "Network connection failed"
    Received message:   "client.streamingQA(...) is not a function or its return value is not async iterable"

          349 |
          350 |       await expect(async () => {
        > 351 |         for await (const chunk of client.streamingQA(input)) {
              |                                          ^
          352 |           // Should throw before yielding any chunks
          353 |         }
          354 |       }).rejects.toThrow('Network connection failed');

          at tests/integration/client-processor-integration.test.ts:351:42
          at Object.toThrow (node_modules/expect/build/index.js:202:58)
          at Object.<anonymous> (tests/integration/client-processor-integration.test.ts:354:18)

      352 |           // Should throw before yielding any chunks
      353 |         }
    > 354 |       }).rejects.toThrow('Network connection failed');
          |                  ^
      355 |     });
      356 |
      357 |     test('should handle malformed JSON in SSE stream', async () => {

      at Object.toThrow (node_modules/expect/build/index.js:218:22)
      at Object.<anonymous> (tests/integration/client-processor-integration.test.ts:354:18)

  ● Integration: PerplexityClient + StreamProcessor › Error Propagation › should handle malformed JSON in SSE stream

    TypeError: global.Response is not a constructor

      498 |   // Use global.Response (polyfilled in jest.setup.js) instead of bare Response
      499 |   // This ensures consistency with the test environment setup
    > 500 |   return new global.Response(stream, {
          |          ^
      501 |     headers: new Headers({
      502 |       'Content-Type': 'text/event-stream; charset=utf-8'
      503 |     })

      at createMockSSEResponse (tests/integration/client-processor-integration.test.ts:500:10)
      at Object.<anonymous> (tests/integration/client-processor-integration.test.ts:358:28)

  ● Integration: PerplexityClient + StreamProcessor › Error Propagation › should handle timeout during streaming

    TypeError: global.Response is not a constructor

      498 |   // Use global.Response (polyfilled in jest.setup.js) instead of bare Response
      499 |   // This ensures consistency with the test environment setup
    > 500 |   return new global.Response(stream, {
          |          ^
      501 |     headers: new Headers({
      502 |       'Content-Type': 'text/event-stream; charset=utf-8'
      503 |     })

      at createMockSSEResponse (tests/integration/client-processor-integration.test.ts:500:10)
      at Object.<anonymous> (tests/integration/client-processor-integration.test.ts:384:28)

  ● Integration: PerplexityClient + StreamProcessor › Citation and Metadata Integration › should preserve citations through processor

    TypeError: global.Response is not a constructor

      498 |   // Use global.Response (polyfilled in jest.setup.js) instead of bare Response
      499 |   // This ensures consistency with the test environment setup
    > 500 |   return new global.Response(stream, {
          |          ^
      501 |     headers: new Headers({
      502 |       'Content-Type': 'text/event-stream; charset=utf-8'
      503 |     })

      at createMockSSEResponse (tests/integration/client-processor-integration.test.ts:500:10)
      at Object.<anonymous> (tests/integration/client-processor-integration.test.ts:420:28)

  ● Integration: PerplexityClient + StreamProcessor › Citation and Metadata Integration › should preserve search queries through processor

    TypeError: global.Response is not a constructor

      498 |   // Use global.Response (polyfilled in jest.setup.js) instead of bare Response
      499 |   // This ensures consistency with the test environment setup
    > 500 |   return new global.Response(stream, {
          |          ^
      501 |     headers: new Headers({
      502 |       'Content-Type': 'text/event-stream; charset=utf-8'
      503 |     })

      at createMockSSEResponse (tests/integration/client-processor-integration.test.ts:500:10)
      at Object.<anonymous> (tests/integration/client-processor-integration.test.ts:451:28)


📊 Test results saved to: D:\AboutUniversity\114 NSTC_and_SeniorProject\2025-IM-senior-project\TheChamber_Of_RedMansion_FireBaseStudio\test-output\test-run-2025-11-24_23-33-40-217Z\test-results.json
📋 Test summary saved to: D:\AboutUniversity\114 NSTC_and_SeniorProject\2025-IM-senior-project\TheChamber_Of_RedMansion_FireBaseStudio\test-output\test-run-2025-11-24_23-33-40-217Z\test-execution-summary.json
Test Suites: 1 failed, 1 total
Tests:       12 failed, 12 total
Snapshots:   0 total
Time:        9.088 s
Ran all test suites matching /tests\\integration\\client-processor-integration.test.ts/i.
🧹 Running global test teardown...
📊 Test run completed in 9s
📁 Results saved to: D:\AboutUniversity\114 NSTC_and_SeniorProject\2025-IM-senior-project\TheChamber_Of_RedMansion_FireBaseStudio\test-output\test-run-2025-11-24_23-33-40-217Z
📄 Consolidated report: D:\AboutUniversity\114 NSTC_and_SeniorProject\2025-IM-senior-project\TheChamber_Of_RedMansion_FireBaseStudio\test-output\test-run-2025-11-24_23-33-40-217Z\consolidated-report.json
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

 FAIL  tests/integration/sse-pipeline.test.ts
  ● Test suite failed to run
                                                                                                                                                                         
    TypeError: Class extends value undefined is not a constructor or null

      11 |  */
      12 |
    > 13 | import { NextRequest, NextResponse } from 'next/server';
         | ^
      14 | import {
      15 |   perplexityRedChamberQAStreaming,
      16 |   createPerplexityQAInputForFlow,

      at Object.<anonymous> (node_modules/next/src/server/web/spec-extension/request.ts:54:14)
      at Object.<anonymous> (node_modules/next/server.js:2:16)
      at Object.<anonymous> (src/app/api/perplexity-qa-stream/route.ts:13:1)
      at Object.<anonymous> (tests/integration/sse-pipeline.test.ts:12:1)

                                                                                                                                                                         
📊 Test results saved to: D:\AboutUniversity\114 NSTC_and_SeniorProject\2025-IM-senior-project\TheChamber_Of_RedMansion_FireBaseStudio\test-output\test-run-2025-11-24_23-35-25-831Z\test-results.json
📋 Test summary saved to: D:\AboutUniversity\114 NSTC_and_SeniorProject\2025-IM-senior-project\TheChamber_Of_RedMansion_FireBaseStudio\test-output\test-run-2025-11-24_23-35-25-831Z\test-execution-summary.json
Test Suites: 1 failed, 1 total
Tests:       0 total
Snapshots:   0 total
Time:        7.952 s
Ran all test suites matching /tests\\integration\\sse-pipeline.test.ts/i.
🧹 Running global test teardown...
📊 Test run completed in 8s
📁 Results saved to: D:\AboutUniversity\114 NSTC_and_SeniorProject\2025-IM-senior-project\TheChamber_Of_RedMansion_FireBaseStudio\test-output\test-run-2025-11-24_23-35-25-831Z
📄 Consolidated report: D:\AboutUniversity\114 NSTC_and_SeniorProject\2025-IM-senior-project\TheChamber_Of_RedMansion_FireBaseStudio\test-output\test-run-2025-11-24_23-35-25-831Z\consolidated-report.json
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
(node:6760) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)