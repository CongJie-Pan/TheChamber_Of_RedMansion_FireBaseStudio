1. [versel 部屬環境] 當用戶送出ai問答query之後，回覆出現。但是我記得當初創建versel server時我有加入變數：
流式處理時發生錯誤：Perplexity API key is required. Please set PERPLEXITYAI_API_KEY environment variable.

2025-11-27 03:02:54.950 [error] Perplexity streaming QA error: Error [PerplexityQAError]: Perplexity API key is required. Please set PERPLEXITYAI_API_KEY environment variable.
    at new b3 (.next/server/app/api/perplexity-qa-stream/route.js:24:2085)
    at b5 (.next/server/app/api/perplexity-qa-stream/route.js:47:8024)
    at cc (.next/server/app/api/perplexity-qa-stream/route.js:47:11683)
    at async Object.start (.next/server/app/api/perplexity-qa-stream/route.js:1:6726) {
  code: 'MISSING_API_KEY',
  statusCode: 401,
  retryable: false,
  originalError: undefined
}
2025-11-27 03:02:54.950 [error] ❌ [PERPLEXITY_STREAMING] Async generator error in perplexityRedChamberQAStreaming {
  functionName: 'perplexityRedChamberQAStreaming',
  errorType: 'i',
  errorMessage: 'Perplexity API key is required. Please set PERPLEXITYAI_API_KEY environment variable.',
  isTypeError: false,
  stack: 'PerplexityQAError: Perplexity API key is required. Please set PERPLEXITYAI_API_KEY environment variable.\n' +
    '    at new b3 (/var/task/.next/server/app/api/perplexity-qa-stream/route.js:24:2085)\n' +
    '    at b5 (/var/task/.next/server/app/api/perplexity-qa-stream/route.js:47:8024)\n' +
    '    at cc (/var/task/.next/server/app/api/perplexity-qa-stream/route.js:47:11683)\n' +
    '    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)\n' +
    '    at async Object.start (/var/task/.next/server/app/api/perplexity-qa-stream/route.js:1:6726)'
}
2025-11-27 03:02:54.950 [error] ❌ [PERPLEXITY_STREAMING] Caught error in streaming function {
  errorType: 'i',
  errorMessage: 'Perplexity API key is required. Please set PERPLEXITYAI_API_KEY environment variable.',
  isTypeError: false,
  isReferenceError: false,
  stack: 'PerplexityQAError: Perplexity API key is required. Please set PERPLEXITYAI_API_KEY environment variable.\n' +
    '    at new b3 (/var/task/.next/server/app/api/perplexity-qa-stream/route.js:24:2085)\n' +
    '    at b5 (/var/task/.next/server/app/api/perplexity-qa-stream/route.js:47:8024)\n' +
    '    at cc (/var/task/.next/server/app/api/perplexity-qa-stream/route.js:47:11683)\n' +
    '    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)\n' +
    '    at async Object.start (/var/task/.next/server/app/api/perplexity-qa-stream/route.js:1:6726)'
}