/**
 * @fileoverview Tests for Firestore → SQLite migration script.
 */

jest.mock('@/lib/sqlite-db', () => ({
  getDatabase: jest.fn(),
}))

jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: jest.fn(),
  },
}))

import { getDatabase } from '@/lib/sqlite-db'
import { adminDb } from '@/lib/firebase-admin'
import { run, migrateUsers } from '../../scripts/migrate-firestore-to-sqlite'

describe('migrate-firestore-to-sqlite', () => {
  const prepareRunMock = jest.fn()
  const prepareMock = jest.fn(() => ({ run: prepareRunMock }))
  const transactionMock = jest.fn((fn: () => void) => () => fn())
  const dbMock = {
    prepare: prepareMock,
    transaction: transactionMock,
  } as any

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getDatabase as jest.Mock).mockReturnValue(dbMock)
  })

  test('migrateUsers maps Firestore docs into SQLite rows', () => {
    const ctx = { db: dbMock, now: 1700000000000 }
    const doc = {
      id: 'user-1',
      data: () => ({
        displayName: 'Lin Daiyu',
        email: 'daiyu@example.com',
        currentLevel: 3,
        attributes: { poetrySkill: 5 },
        createdAt: { toMillis: () => 1700000000000 },
      }),
    }

    migrateUsers(ctx as any, [doc as any])

    expect(prepareMock).toHaveBeenCalled()
    expect(prepareRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        username: 'Lin Daiyu',
        email: 'daiyu@example.com',
        currentLevel: 3,
        attributes: JSON.stringify({ poetrySkill: 5 }),
      })
    )
  })

  test('run exits early when Firebase Admin is unavailable', async () => {
    ;(adminDb as any).collection = undefined
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const success = await run()
    expect(success).toBe(false)

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Firebase Admin is not available. Configure service account credentials before running migration.')
    )
  })

  test('run migrates supported collections', async () => {
    const usersDoc = {
      id: 'user-1',
      data: () => ({ displayName: 'Test User' }),
    }
    ;(adminDb as any).collection = jest.fn(() => ({
      get: jest.fn().mockResolvedValue({ docs: [usersDoc] }),
    }))

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

    const success = await run()

    expect(getDatabase).toHaveBeenCalled()
    expect((adminDb as any).collection).toHaveBeenCalledWith('users')
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Migrating collection'))
    expect(success).toBe(true)
  })
})
