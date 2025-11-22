<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Please search the internet in English for information about Perplexity Sonar API integration testing and mocking strategies. I need comprehensive information to design

integration tests that will catch issues before production.

## Search Queries to Execute:

1. "Perplexity API integration testing best practices"
    - Look for: Official Perplexity documentation on testing
    - Look for: Community blog posts about testing Perplexity API
    - Focus on: Real-world examples, not just theory
2. "Perplexity API mock server setup local testing"
    - Look for: Tools to create mock Perplexity API servers
    - Look for: MSW (Mock Service Worker), WireMock, or similar tools
    - Focus on: How to simulate SSE streaming responses
3. "Perplexity API error handling rate limiting testing"
    - Look for: Common error scenarios (429 rate limit, 401 auth, 500 server error)
    - Look for: How to test retry logic
    - Focus on: Production-ready error handling patterns
4. "Perplexity Sonar reasoning model response format examples"
    - Look for: Real examples of <think> tag format
    - Look for: Typical response lengths (thinking vs answer)
    - Focus on: What is considered "reasonable" length for thinking/answers
5. "Integration testing streaming AI APIs Node.js TypeScript"
    - Look for: Best practices for testing SSE streams
    - Look for: How to verify chunk-by-chunk processing
    - Focus on: Testing tools and frameworks (Jest, Vitest, etc.)
6. "Perplexity API cost optimization testing strategies"
    - Look for: How to minimize API calls during testing
    - Look for: Caching strategies for integration tests
    - Focus on: Balance between thorough testing and cost
7. "GitHub Actions CI/CD Perplexity API integration tests"
    - Look for: How to run API tests in CI/CD
    - Look for: Secret management for API keys
    - Focus on: Best practices for scheduled vs PR-based testing

## Information to Extract:

For each search result, please provide:

1. **Source credibility** - Is it official docs, verified blog, or forum post?
2. **Key findings** - What are the main recommendations?
3. **Code examples** - Any practical code snippets
4. **Tools mentioned** - Specific libraries, frameworks, or services
5. **Gotchas/Warnings** - Common pitfalls to avoid
6. **Cost considerations** - Any mentions of API quota/pricing

## Output Format:

Please organize findings into:

### A. Mock/Stub Strategies

- Tools and libraries for mocking Perplexity API
- How to simulate SSE streaming locally
- Example mock server setups


### B. Real API Testing Strategies

- When to use real API vs mocks
- How to structure integration tests
- Rate limiting and retry patterns


### C. Response Validation

- What to verify in responses
- Typical response characteristics (length, format)
- Quality checks for thinking vs answer content


### D. Cost Management

- How to minimize API costs
- Test prioritization strategies
- CI/CD optimization


### E. Tools \& Libraries

- Recommended testing frameworks
- Mock server tools
- Assertion libraries


### F. Production Readiness Checklist

- Must-test scenarios
- Performance benchmarks
- Error handling verification

Please be thorough and provide URLs for all sources so I can verify and read more if needed.

Based on the search results and best practices for AI integration, here is a comprehensive guide to designing integration tests for the Perplexity Sonar API.

### A. Mock/Stub Strategies

For Node.js/TypeScript environments, **MSW (Mock Service Worker)** is the recommended tool because it intercepts requests at the network level, allowing you to test your actual API client code without spinning up a separate server process.

#### 1. Simulating SSE Streaming with MSW

Perplexity's API uses Server-Sent Events (SSE) for streaming responses. You must mock a `ReadableStream` to simulate the token-by-token delivery.

**Key Setup:** Use `HttpResponse` with a `ReadableStream` to push data chunks.

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.post('https://api.perplexity.ai/chat/completions', () => {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        
        // 1. Simulate the reasoning (<think>) phase
        const thinkTokens = ['<think>', 'Analyzing', ' user', ' request', '...', '</think>']
        
        // 2. Simulate the answer phase
        const answerTokens = ['The', ' capital', ' of', ' France', ' is', ' Paris.']

        const allTokens = [...thinkTokens, ...answerTokens]

        // Push tokens with slight delay to mimic real network latency
        allTokens.forEach((token) => {
          const chunk = JSON.stringify({
            id: 'msg_123',
            choices: [{ delta: { content: token }, index: 0, finish_reason: null }]
          })
          // Format as SSE data event
          controller.enqueue(encoder.encode(`data: ${chunk}\n\n`))
        })

        // Send [DONE] signal
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      }
    })

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
      },
    })
  }),
]
```

**Tools mentioned:** [MSW](https://mswjs.io/docs/sse/) (Mock Service Worker), [Vitest](https://vitest.dev/guide/mocking/requests) (compatible test runner).

### B. Real API Testing Strategies

While mocks are fast, you must have a small suite of "Live" integration tests that hit the real API.

* **When to use Real API:**
    * **Contract Verification:** Run once daily (cron job) to ensure Perplexity hasn't changed their payload structure.
    * **New Model Verification:** When switching from `sonar-pro` to `sonar-reasoning`, run live tests to verify the output format changes.
* **Rate Limiting \& Retries:**
    * **Strategy:** Do *not* use your production API key for tests if possible; isolate a "testing" key with a hard quota.
    * **Testing 429s:** It is hard to force a real 429. Instead, **mock** the 429 response to ensure your retry logic works.
    * **Code Example (Retry Logic Test):**

```typescript
// Mock a 429 failure then a success
let callCount = 0
http.post('...', () => {
  callCount++
  if (callCount === 1) {
    return new HttpResponse(null, { status: 429, headers: { 'Retry-After': '1' }})
  }
  return HttpResponse.json({ ...successResponse... })
})
```


### C. Response Validation

The `sonar-reasoning` models introduce a unique challenge: raw `<think>` tags in the content stream.

* **Format Characteristics:**
    * **Thinking Tags:** The API response will often start immediately with `<think>`. The content inside can vary in length from 50 to 500+ tokens depending on query complexity.
    * **Cleaning:** Your tests **must** verify that your application correctly strips these tags before showing the answer to the user.
* **Quality Checks (Assertion Examples):**
    * **No Leakage:** `expect(finalUserOutput).not.toContain('<think>')`
    * **JSON Structure:** Ensure the `citations` field is an array of strings (URLs).
    * **Reasonable Length:** For reasoning models, expect a higher latency to first byte (TTFB).


### D. Cost Management

Running integration tests against paid LLM APIs is expensive.

1. **VCR / Record \& Replay:**
    * Use tools like **Polly.js** or **Nock Back** to record the *real* API response to a file (cassette) during the first test run.
    * Subsequent runs replay the file, costing \$0.
    * **Warning:** Streaming responses are notoriously difficult to record/replay perfectly with older VCR tools. MSW-based mocking (Strategy A) is often more stable than recording streams.
2. **Cost-Optimized CI Pipeline:**
    * **Pull Requests:** Run 100% Mocked tests + 1 "Smoke Test" (mocked connection, but exercises full app logic).
    * **Nightly/Scheduled:** Run the full "Live" suite against the real Perplexity API.
    * **Token Limits:** Set `max_tokens` to a low number (e.g., 100) in your test payload to minimize cost if a test loops accidentally.

### E. Tools \& Libraries

| Category | Recommended Tool | Why? |
| :-- | :-- | :-- |
| **Mocking** | **MSW (Mock Service Worker)** | Best-in-class support for Node.js stream interception. |
| **Runner** | **Vitest** | Faster than Jest; native support for ESM modules used by many AI SDKs. |
| **Validation** | **Zod** | Define the expected Perplexity schema and `parse()` the response. If the API changes, your tests fail instantly. |
| **Recording** | **Nock** | Good for recording HTTP traffic if you prefer "Record/Replay" over manual mocking. |

### F. Production Readiness Checklist

Before deploying your integration, verify these scenarios:

* [ ] **Auth Failures:** Mock a `401 Unauthorized` (invalid API key). Does your app crash or alert the admin?
* [ ] **The "Forever" Stream:** Mock a stream that sends data but never sends `[DONE]`. Does your client timeout after 30-60 seconds?
* [ ] **Malformed JSON:** Mock a stream chunk that sends broken JSON `data: {"id": ...`. Does your parser recover or throw?
* [ ] **Empty Citations:** Sonar models sometimes return empty citation arrays. Ensure your UI doesn't render an empty "Sources" block.
* [ ] **Reasoning Extraction:** Verify that `sonar-reasoning` output is parsed into two distinct buckets: "Internal Thought" (logged for debugging) and "Final Answer" (shown to user).


### References

* **Official:** [Perplexity SDK Best Practices](https://docs.perplexity.ai/guides/perplexity-sdk-best-practices)[^1]
* **Tools:** [MSW Streaming Docs](https://mswjs.io/docs/sse/), [Vitest Mocking](https://vitest.dev/guide/mocking/requests)[^2][^3]
* **Community:** [Testing AI Code in CI/CD](https://speedscale.com/blog/testing-ai-code-in-cicd-made-simple-for-developers/)[^4]
<span style="display:none">[^10][^11][^12][^13][^14][^15][^16][^17][^18][^19][^20][^21][^22][^23][^24][^25][^26][^27][^28][^29][^30][^31][^32][^33][^34][^35][^36][^37][^38][^39][^5][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://docs.perplexity.ai/guides/perplexity-sdk-best-practices

[^2]: https://vitest.dev/guide/mocking/requests

[^3]: https://mswjs.io/docs/sse/

[^4]: https://speedscale.com/blog/testing-ai-code-in-cicd-made-simple-for-developers/

[^5]: https://docs.perplexity.ai/guides/search-best-practices

[^6]: https://apidog.com/blog/perplexity-ai-api/

[^7]: https://skywork.ai/skypage/en/Perplexity-MCP-Server-Deep-Dive-A-Guide-for-AI-Engineers/1971040594050805760

[^8]: https://testcontainers.com/guides/testing-rest-api-integrations-using-mockserver/

[^9]: https://stevekinney.com/courses/testing/testing-with-mock-service-worker

[^10]: https://community.clay.com/x/support/rs5vevcvh174/troubleshooting-perplexity-ai-api-429-rate-limit-e

[^11]: https://www.bairesdev.com/blog/java-integration-testing/

[^12]: https://www.hostingseekers.com/blog/fix-perplexity-api-errors-tutorial/

[^13]: https://dev.to/andrewevans0102/mock-servers-with-integration-tests-52de

[^14]: https://apidog.com/blog/supertest-guide/

[^15]: https://docs.perplexity.ai/guides/perplexity-sdk-error-handling

[^16]: https://smartbear.com/learn/api-testing/what-is-api-mocking/

[^17]: https://stackoverflow.com/questions/59936895/how-to-test-a-server-sent-events-sse-route-in-nodejs

[^18]: https://scrapfly.io/blog/posts/what-is-http-error-429-too-many-requests

[^19]: https://zuplo.com/learning-center/perplexity-api

[^20]: https://github.com/binarymist/mocksse

[^21]: https://community.make.com/t/how-can-i-optimise-the-number-of-api-calls-and-cell-updates-in-this-scenario/49923

[^22]: https://mswjs.io/docs/integrations/node/

[^23]: https://alexocallaghan.com/mock-sse-with-msw

[^24]: https://mswjs.io/docs/http/mocking-responses/streaming/

[^25]: https://github.com/mswjs/msw/issues/2117

[^26]: https://mswjs.io/docs/sse/server-events/

[^27]: https://docs.perplexity.ai/getting-started/models/models/sonar-reasoning-pro

[^28]: https://mswjs.io/docs/http/mocking-responses/

[^29]: https://docs.perplexity.ai/guides/structured-outputs

[^30]: https://www.getambassador.io/blog/api-testing-guide

[^31]: https://stackoverflow.com/questions/49988915/how-to-mock-server-sent-events-sse-aka-eventsource

[^32]: https://docs.perplexity.ai/getting-started/models/models/sonar-reasoning

[^33]: https://github.com/anthropics/claude-code/issues/11770

[^34]: https://jvns.ca/blog/2021/01/12/day-36--server-sent-events-are-cool--and-a-fun-bug/

[^35]: https://treblle.com/blog/test-automation-vs-ai-api-testing-comparison

[^36]: https://dev.to/mehakb7/mock-service-worker-msw-in-nextjs-a-guide-for-api-mocking-and-testing-e9m

[^37]: https://docs.aimlapi.com/api-references/text-models-llm/perplexity/sonar-pro

[^38]: https://www.qamadness.com/small-change-big-impact-ai-api-testing/

[^39]: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events

