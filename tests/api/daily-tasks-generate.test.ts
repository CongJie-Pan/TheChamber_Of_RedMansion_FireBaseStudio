/**
 * @fileoverview Tests for /api/daily-tasks/generate route with SQLite-first behavior.
 */

jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      async text() {
        return JSON.stringify(data)
      },
      async json() {
        return data
      },
    }),
  },
}))

const mockGenerateDailyTasks = jest.fn()
const mockGenerateTasksForUser = jest.fn()
const mockVerifyAuthHeader = jest.fn()
const mockIsLlmOnlyMode = jest.fn(() => false)

jest.mock('@/lib/daily-task-service', () => ({
  dailyTaskService: {
    generateDailyTasks: (...args: any[]) => mockGenerateDailyTasks(...args),
  },
}))

jest.mock('@/lib/task-generator', () => ({
  taskGenerator: {
    generateTasksForUser: (...args: any[]) => mockGenerateTasksForUser(...args),
  },
}))

jest.mock('@/lib/firebase-admin', () => ({
  verifyAuthHeader: (...args: any[]) => mockVerifyAuthHeader(...args),
}))

jest.mock('@/lib/env', () => ({
  isLlmOnlyMode: () => mockIsLlmOnlyMode(),
}))

function mockRequest(
  body: any,
  headers: Record<string, string> = { 'content-type': 'application/json' }
): any {
  return {
    headers: {
      get: (key: string) => headers[key.toLowerCase()] ?? null,
    },
    json: async () => body,
  } as any
}

async function readJson(res: any) {
  if (typeof res.json === 'function') {
    return res.json()
  }
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

let POST: any

describe('POST /api/daily-tasks/generate (SQLite)', () => {
  beforeAll(() => {
    POST = require('@/app/api/daily-tasks/generate/route').POST
  })

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    mockVerifyAuthHeader.mockResolvedValue('verified-user')
    mockGenerateDailyTasks.mockResolvedValue([{ id: 'task-1' }])
    mockGenerateTasksForUser.mockResolvedValue([{ id: 'fallback-task' }])
    mockIsLlmOnlyMode.mockReturnValue(false)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('rejects non-JSON content', async () => {
    const req = mockRequest('hello', { 'content-type': 'text/plain' })
    const res = await POST(req)

    expect(res.status).toBe(415)
    const body = await readJson(res)
    expect(body.error).toMatch(/Invalid content type/i)
  })

  it('requires userId when not using LLM-only mode', async () => {
    mockVerifyAuthHeader.mockResolvedValue(null)
    const req = mockRequest({})

    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await readJson(res)
    expect(body.error).toContain('userId')
  })

  it('delegates to dailyTaskService with verified uid', async () => {
    const req = mockRequest({ userId: 'client-user' }, { 'content-type': 'application/json', authorization: 'Bearer token' })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockVerifyAuthHeader).toHaveBeenCalled()
    expect(mockGenerateDailyTasks).toHaveBeenCalledWith('verified-user', undefined)

    const body = await readJson(res)
    expect(body.success).toBe(true)
    expect(body.ephemeral).toBe(false)
  })

  it('falls back to ephemeral tasks when service throws', async () => {
    const error = new Error('SQLite unavailable')
    mockGenerateDailyTasks.mockRejectedValue(error)

    const req = mockRequest({ userId: 'test-user' })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await readJson(res)
    expect(body.success).toBe(true)
    expect(body.ephemeral).toBe(true)
    expect(mockGenerateTasksForUser).toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('falling back to ephemeral'),
      error
    )
  })

  it('returns ephemeral tasks immediately in LLM-only mode', async () => {
    mockIsLlmOnlyMode.mockReturnValue(true)
    mockGenerateTasksForUser.mockResolvedValue([{ id: 'llm-task' }])

    const req = mockRequest({ userId: 'guest' })
    const res = await POST(req)

    const body = await readJson(res)
    expect(res.status).toBe(200)
    expect(body.ephemeral).toBe(true)
    expect(body.tasks[0].id).toBe('llm-task')
    expect(mockGenerateDailyTasks).not.toHaveBeenCalled()
  })
})
