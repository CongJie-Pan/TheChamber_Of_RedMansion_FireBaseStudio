/**
 * @fileOverview Tests for Daily Tasks API Routes
 *
 * Verifies server-side endpoints:
 * - POST /api/daily-tasks/generate
 * - POST /api/daily-tasks/submit
 *
 * Ensures correct validation, delegation to service layer,
 * and response shape.
 */

// Mock next/server to avoid DOM Request dependency in test env
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      async text() { return JSON.stringify(data) },
      async json() { return data },
    }),
  },
}))

const mockGetServerSession = jest.fn(async () => ({ user: { id: 'test-user' } }));

jest.mock('next-auth/next', () => ({
  getServerSession: (...args: any[]) => mockGetServerSession(...args),
}));

jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}));

import { dailyTaskService } from '@/lib/daily-task-service'

let GeneratePOST: any
let SubmitPOST: any

// Utility to read JSON from NextResponse
async function readJson(res: Response) {
  const text = await res.text()
  try { return JSON.parse(text) } catch { return text }
}

function mockReq(body: any, headers: Record<string, string> = { 'content-type': 'application/json' }): any {
  return {
    headers: new Headers(headers),
    json: async () => body,
  } as any
}

describe('Daily Tasks API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  beforeAll(() => {
    // Import route handlers after mocking next/server
     
    GeneratePOST = require('@/app/api/daily-tasks/generate/route').POST
     
    SubmitPOST = require('@/app/api/daily-tasks/submit/route').POST
  })

  describe('POST /api/daily-tasks/generate', () => {
    it('should reject non-JSON content-type', async () => {
      const req = mockReq('hello', { 'content-type': 'text/plain' })

      const res = await GeneratePOST(req)
      expect(res.status).toBe(415)
      const body = await readJson(res)
      expect(body.error).toMatch(/Invalid content type/i)
    })

    it('should return 400 when userId missing', async () => {
      const req = mockReq({})

      const res = await GeneratePOST(req)
      expect(res.status).toBe(400)
      const body = await readJson(res)
      expect(body.error).toMatch(/userId/i)
    })

    it('should delegate to service and return tasks', async () => {
      const tasks = [{ id: 't1' }, { id: 't2' }]
      const spy = jest.spyOn(dailyTaskService, 'generateDailyTasks').mockResolvedValue(tasks as any)

      const req = mockReq({ userId: 'u1' })

      const res = await GeneratePOST(req)
      expect(res.status).toBe(200)
      const body = await readJson(res)
      expect(body.success).toBe(true)
      expect(body.tasks).toHaveLength(2)
      expect(spy).toHaveBeenCalledWith('u1', undefined)
    })
  })

  describe('POST /api/daily-tasks/submit', () => {
    it('should validate required fields', async () => {
      // Missing userId
      let req = mockReq({ taskId: 't1', userResponse: 'ans' })
      let res = await SubmitPOST(req)
      expect(res.status).toBe(400)

      // Missing taskId
      req = mockReq({ userId: 'u1', userResponse: 'ans' })
      res = await SubmitPOST(req)
      expect(res.status).toBe(400)

      // Missing userResponse
      req = mockReq({ userId: 'u1', taskId: 't1' })
      res = await SubmitPOST(req)
      expect(res.status).toBe(400)
    })

    it('should delegate to service and return result', async () => {
      const mockResult = { success: true, score: 90, feedback: 'Great!' }
      const spy = jest.spyOn(dailyTaskService, 'submitTaskCompletion').mockResolvedValue(mockResult as any)

      const req = mockReq({ userId: 'u1', taskId: 't1', userResponse: 'ans' })

      const res = await SubmitPOST(req)
      expect(res.status).toBe(200)
      const body = await readJson(res)
      expect(body.success).toBe(true)
      expect(body.result).toEqual(mockResult)
      expect(spy).toHaveBeenCalledWith('u1', 't1', 'ans')
    })

    it('should fallback to practice-mode when service fails', async () => {
      jest.spyOn(dailyTaskService, 'submitTaskCompletion').mockRejectedValue(new Error('permission-denied'))

      const req = mockReq({ userId: 'u1', taskId: 't1', userResponse: '這是一段超過六十個字的回答，用來測試 fallback 評分與 AI 評語生成。雖然不會寫入資料庫，但應該回傳成功結果與評語。', task: { type: 'MORNING_READING', difficulty: 'MEDIUM', title: '測試任務', content: { textPassage: { text: '段落', question: '問題？' } } } })

      const res = await SubmitPOST(req)
      expect(res.status).toBe(200)
      const body = await readJson(res)
      expect(body.success).toBe(true)
      expect(body.result).toBeDefined()
      expect(typeof body.result.score).toBe('number')
      expect(typeof body.result.feedback).toBe('string')
      expect(body.ephemeral).toBe(true)
    })
  })
})
