#!/usr/bin/env tsx
/**
 * Migrates Firestore daily task data into the local SQLite database.
 *
 * Usage:
 *   pnpm migrate:firestore
 */

import type Database from 'better-sqlite3'
import { getDatabase } from '@/lib/sqlite-db'
import { adminDb } from '@/lib/firebase-admin'

type FirestoreTimestamp =
  | { toMillis(): number }
  | { seconds: number; nanoseconds?: number }
  | { _seconds: number; _nanoseconds?: number }
  | number
  | undefined

interface FirestoreDoc<T = any> {
  id: string
  data(): T
}

interface MigrationContext {
  db: Database.Database
  now: number
}

const COLLECTIONS = [
  'users',
  'dailyTasks',
  'dailyTaskProgress',
  'taskSubmissions',
  'xpTransactions',
  'xpTransactionLocks',
  'levelUps',
] as const

type CollectionName = typeof COLLECTIONS[number]

function normalizeTimestamp(value: FirestoreTimestamp, fallback: number): number {
  if (value === undefined || value === null) {
    return fallback
  }
  if (typeof value === 'number') {
    return value
  }
  if (typeof (value as any).toMillis === 'function') {
    return (value as any).toMillis()
  }
  if (typeof (value as any).seconds === 'number') {
    return (value as any).seconds * 1000
  }
  if (typeof (value as any)._seconds === 'number') {
    return (value as any)._seconds * 1000
  }
  return fallback
}

function migrateUsers(ctx: MigrationContext, docs: FirestoreDoc[]) {
  const stmt = ctx.db.prepare(`
    INSERT INTO users (id, username, email, currentLevel, currentXP, totalXP, attributes, createdAt, updatedAt)
    VALUES (@id, @username, @email, @currentLevel, @currentXP, @totalXP, @attributes, @createdAt, @updatedAt)
    ON CONFLICT(id) DO UPDATE SET
      username = excluded.username,
      email = excluded.email,
      currentLevel = excluded.currentLevel,
      currentXP = excluded.currentXP,
      totalXP = excluded.totalXP,
      attributes = excluded.attributes,
      createdAt = excluded.createdAt,
      updatedAt = excluded.updatedAt
  `)

  const now = ctx.now
  for (const doc of docs) {
    const data = doc.data() || {}
    stmt.run({
      id: doc.id,
      username: data.displayName || data.username || doc.id,
      email: data.email || null,
      currentLevel: data.currentLevel ?? 0,
      currentXP: data.currentXP ?? 0,
      totalXP: data.totalXP ?? 0,
      attributes: JSON.stringify(data.attributes || {}),
      createdAt: normalizeTimestamp(data.createdAt as FirestoreTimestamp, now),
      updatedAt: normalizeTimestamp(data.updatedAt as FirestoreTimestamp, now),
    })
  }
}

function migrateDailyTasks(ctx: MigrationContext, docs: FirestoreDoc[]) {
  const stmt = ctx.db.prepare(`
    INSERT INTO daily_tasks (
      id, taskType, difficulty, title, description, baseXP, content,
      sourceChapter, sourceVerseStart, sourceVerseEnd, createdAt
    ) VALUES (
      @id, @taskType, @difficulty, @title, @description, @baseXP, @content,
      @sourceChapter, @sourceVerseStart, @sourceVerseEnd, @createdAt
    )
    ON CONFLICT(id) DO UPDATE SET
      taskType = excluded.taskType,
      difficulty = excluded.difficulty,
      title = excluded.title,
      description = excluded.description,
      baseXP = excluded.baseXP,
      content = excluded.content,
      sourceChapter = excluded.sourceChapter,
      sourceVerseStart = excluded.sourceVerseStart,
      sourceVerseEnd = excluded.sourceVerseEnd,
      createdAt = excluded.createdAt
  `)

  const now = ctx.now
  for (const doc of docs) {
    const data = doc.data() || {}
    stmt.run({
      id: doc.id,
      taskType: data.type || data.taskType || 'UNKNOWN',
      difficulty: data.difficulty || 'MEDIUM',
      title: data.title || 'Untitled Task',
      description: data.description || '',
      baseXP: data.baseXP ?? data.xpReward ?? 0,
      content: JSON.stringify(data.content || {}),
      sourceChapter: data.sourceChapter ?? null,
      sourceVerseStart: data.sourceVerseStart ?? null,
      sourceVerseEnd: data.sourceVerseEnd ?? null,
      createdAt: normalizeTimestamp(data.createdAt as FirestoreTimestamp, now),
    })
  }
}

function migrateDailyProgress(ctx: MigrationContext, docs: FirestoreDoc[]) {
  const stmt = ctx.db.prepare(`
    INSERT INTO daily_progress (
      id, userId, date, tasks, completedTaskIds, skippedTaskIds,
      totalXPEarned, totalAttributeGains, usedSourceIds, streak, createdAt, updatedAt
    ) VALUES (
      @id, @userId, @date, @tasks, @completedTaskIds, @skippedTaskIds,
      @totalXPEarned, @totalAttributeGains, @usedSourceIds, @streak, @createdAt, @updatedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      tasks = excluded.tasks,
      completedTaskIds = excluded.completedTaskIds,
      skippedTaskIds = excluded.skippedTaskIds,
      totalXPEarned = excluded.totalXPEarned,
      totalAttributeGains = excluded.totalAttributeGains,
      usedSourceIds = excluded.usedSourceIds,
      streak = excluded.streak,
      createdAt = excluded.createdAt,
      updatedAt = excluded.updatedAt
  `)

  const now = ctx.now
  for (const doc of docs) {
    const data = doc.data() || {}
    stmt.run({
      id: doc.id,
      userId: data.userId || '',
      date: data.date || '',
      tasks: JSON.stringify(data.tasks || []),
      completedTaskIds: JSON.stringify(data.completedTaskIds || []),
      skippedTaskIds: JSON.stringify(data.skippedTaskIds || []),
      totalXPEarned: data.totalXPEarned ?? 0,
      totalAttributeGains: JSON.stringify(data.totalAttributeGains || {}),
      usedSourceIds: JSON.stringify(data.usedSourceIds || []),
      streak: data.streak ?? 0,
      createdAt: normalizeTimestamp(data.createdAt as FirestoreTimestamp, now),
      updatedAt: normalizeTimestamp(data.updatedAt as FirestoreTimestamp, now),
    })
  }
}

function migrateTaskSubmissions(ctx: MigrationContext, docs: FirestoreDoc[]) {
  const stmt = ctx.db.prepare(`
    INSERT INTO task_submissions (
      id, userId, taskId, userAnswer, score, feedback, xpEarned, attributeGains, submittedAt
    ) VALUES (
      @id, @userId, @taskId, @userAnswer, @score, @feedback, @xpEarned, @attributeGains, @submittedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      userId = excluded.userId,
      taskId = excluded.taskId,
      userAnswer = excluded.userAnswer,
      score = excluded.score,
      feedback = excluded.feedback,
      xpEarned = excluded.xpEarned,
      attributeGains = excluded.attributeGains,
      submittedAt = excluded.submittedAt
  `)

  const now = ctx.now
  for (const doc of docs) {
    const data = doc.data() || {}
    stmt.run({
      id: doc.id,
      userId: data.userId || '',
      taskId: data.taskId || '',
      userAnswer: data.userAnswer || '',
      score: data.score ?? 0,
      feedback: data.feedback || '',
      xpEarned: data.xpAwarded ?? data.xpEarned ?? 0,
      attributeGains: JSON.stringify(data.attributeGains || {}),
      submittedAt: normalizeTimestamp(data.submittedAt as FirestoreTimestamp, now),
    })
  }
}

function migrateXpTransactions(ctx: MigrationContext, docs: FirestoreDoc[]) {
  const stmt = ctx.db.prepare(`
    INSERT INTO xp_transactions (
      transactionId, userId, amount, reason, source, sourceId, createdAt
    ) VALUES (
      @transactionId, @userId, @amount, @reason, @source, @sourceId, @createdAt
    )
    ON CONFLICT(transactionId) DO UPDATE SET
      userId = excluded.userId,
      amount = excluded.amount,
      reason = excluded.reason,
      source = excluded.source,
      sourceId = excluded.sourceId,
      createdAt = excluded.createdAt
  `)

  const now = ctx.now
  for (const doc of docs) {
    const data = doc.data() || {}
    stmt.run({
      transactionId: doc.id,
      userId: data.userId || '',
      amount: data.amount ?? data.xpDelta ?? 0,
      reason: data.reason || '',
      source: data.source || '',
      sourceId: data.sourceId || null,
      createdAt: normalizeTimestamp(data.timestamp as FirestoreTimestamp, now),
    })
  }
}

function migrateXpTransactionLocks(ctx: MigrationContext, docs: FirestoreDoc[]) {
  const stmt = ctx.db.prepare(`
    INSERT INTO xp_transaction_locks (lockId, userId, sourceId, createdAt)
    VALUES (@lockId, @userId, @sourceId, @createdAt)
    ON CONFLICT(lockId) DO UPDATE SET
      userId = excluded.userId,
      sourceId = excluded.sourceId,
      createdAt = excluded.createdAt
  `)

  const now = ctx.now
  for (const doc of docs) {
    const data = doc.data() || {}
    stmt.run({
      lockId: doc.id,
      userId: data.userId || '',
      sourceId: data.sourceId || '',
      createdAt: normalizeTimestamp(data.createdAt as FirestoreTimestamp, now),
    })
  }
}

function migrateLevelUps(ctx: MigrationContext, docs: FirestoreDoc[]) {
  const stmt = ctx.db.prepare(`
    INSERT INTO level_ups (
      levelUpId, userId, fromLevel, toLevel, unlockedContent, unlockedPermissions, createdAt
    ) VALUES (
      @levelUpId, @userId, @fromLevel, @toLevel, @unlockedContent, @unlockedPermissions, @createdAt
    )
    ON CONFLICT(levelUpId) DO UPDATE SET
      userId = excluded.userId,
      fromLevel = excluded.fromLevel,
      toLevel = excluded.toLevel,
      unlockedContent = excluded.unlockedContent,
      unlockedPermissions = excluded.unlockedPermissions,
      createdAt = excluded.createdAt
  `)

  const now = ctx.now
  for (const doc of docs) {
    const data = doc.data() || {}
    stmt.run({
      levelUpId: doc.id,
      userId: data.userId || '',
      fromLevel: data.fromLevel ?? 0,
      toLevel: data.toLevel ?? 0,
      unlockedContent: JSON.stringify(data.unlockedContent || []),
      unlockedPermissions: JSON.stringify(data.unlockedPermissions || []),
      createdAt: normalizeTimestamp(data.timestamp as FirestoreTimestamp, now),
    })
  }
}

const MIGRATORS: Record<CollectionName, (ctx: MigrationContext, docs: FirestoreDoc[]) => void> = {
  users: migrateUsers,
  dailyTasks: migrateDailyTasks,
  dailyTaskProgress: migrateDailyProgress,
  taskSubmissions: migrateTaskSubmissions,
  xpTransactions: migrateXpTransactions,
  xpTransactionLocks: migrateXpTransactionLocks,
  levelUps: migrateLevelUps,
}

async function loadCollection(name: CollectionName): Promise<FirestoreDoc[]> {
  const snapshot = await (adminDb as any).collection(name).get()
  if (!snapshot || !Array.isArray(snapshot.docs)) {
    return []
  }
  return snapshot.docs as FirestoreDoc[]
}

async function run(): Promise<boolean> {
  if (!adminDb || typeof (adminDb as any).collection !== 'function') {
    console.error('❌ Firebase Admin is not available. Configure service account credentials before running migration.')
    return false
  }

  const ctx: MigrationContext = {
    db: getDatabase(),
    now: Date.now(),
  }

  const selected = process.argv.find((arg) => arg.startsWith('--collections='))?.split('=')[1]
  const collections: CollectionName[] = selected
    ? (selected.split(',').map((name) => name.trim()) as CollectionName[])
    : [...COLLECTIONS]

  for (const collection of collections) {
    const migrator = MIGRATORS[collection]
    if (!migrator) {
      console.warn(`⚠️  Skipping unsupported collection: ${collection}`)
      continue
    }
    console.log(`📥 Migrating collection: ${collection}`)
    const docs = await loadCollection(collection)
    console.log(`   Found ${docs.length} documents`)
    ctx.db.transaction(() => migrator(ctx, docs))()
    console.log(`✅ Migration complete for ${collection}`)
  }

  console.log('🎉 Firestore → SQLite migration finished successfully.')
  return true
}

if (require.main === module) {
  run()
    .then((success) => {
      if (!success) {
        process.exitCode = 1
      }
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error)
      process.exitCode = 1
    })
}

export { run, migrateUsers, migrateDailyTasks, migrateDailyProgress, migrateTaskSubmissions }
