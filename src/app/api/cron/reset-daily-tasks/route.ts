/**
 * @fileOverview Cron Job API for Daily Task Reset
 *
 * This API endpoint is triggered by Vercel Cron to automatically generate
 * daily tasks for all active users at midnight (UTC+8 00:00).
 *
 * **SQLITE-025**: Migrated to SQLite-only (Firebase removed)
 * - Uses user-repository for querying active users
 * - No Firebase/Firestore dependencies
 *
 * Security:
 * - Protected by CRON_SECRET environment variable
 * - Only accessible via Vercel Cron scheduler
 * - Requires x-vercel-cron-secret header match
 *
 * Execution Flow:
 * 1. Verify cron secret from request headers
 * 2. Query all active users from SQLite database
 * 3. Batch generate tasks using dailyTaskService
 * 4. Track success/failure counts
 * 5. Return execution summary
 *
 * Error Handling:
 * - Individual user failures don't stop batch processing
 * - Comprehensive logging for debugging
 * - Return detailed execution report
 *
 * @phase Phase 4.2 - Cron Job API Implementation
 * @updated SQLITE-025 - Firebase removal
 */

import { NextRequest, NextResponse } from 'next/server';
import { dailyTaskService } from '@/lib/daily-task-service';

/**
 * Maximum number of users to process in a single cron execution
 * Prevents timeout issues with large user bases
 */
const MAX_USERS_PER_EXECUTION = 1000;

/**
 * Batch size for parallel task generation
 * Balances between performance and database rate limits
 */
const BATCH_SIZE = 10;

/**
 * Interface for cron execution result
 */
interface CronExecutionResult {
  success: boolean;
  timestamp: string;
  executionTime: number; // in milliseconds
  stats: {
    totalUsers: number;
    successCount: number;
    failureCount: number;
    skippedCount: number; // Users who already have tasks for today
  };
  errors: Array<{
    userId: string;
    error: string;
  }>;
}

/**
 * Helper function to get today's date string in YYYY-MM-DD format (UTC+8)
 */
function getTodayDateString(): string {
  const now = new Date();
  const utc8Offset = 8 * 60 * 60 * 1000;
  const localDate = new Date(now.getTime() + utc8Offset);
  return localDate.toISOString().split('T')[0];
}

// SQLite User Repository - loaded dynamically to avoid client-side issues
let userRepository: any;

const SQLITE_SERVER_ENABLED = typeof window === 'undefined';

if (SQLITE_SERVER_ENABLED) {
  try {
    userRepository = require('@/lib/repositories/user-repository');
    console.log('✅ [CronResetDailyTasks] SQLite user repository loaded');
  } catch (error: any) {
    console.error('❌ [CronResetDailyTasks] Failed to load user repository');
    throw new Error('Failed to load SQLite user repository');
  }
}

/**
 * GET handler - returns API info and status
 * Useful for health checks and documentation
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    name: 'Daily Task Reset Cron Job',
    version: '2.0.0',
    description: 'Automatically generates daily tasks for all users at midnight UTC+8',
    schedule: '0 16 * * * (UTC 16:00 = UTC+8 00:00)',
    endpoint: '/api/cron/reset-daily-tasks',
    security: 'Protected by CRON_SECRET environment variable',
    database: 'SQLite-only (Firebase removed - SQLITE-025)',
    usage: {
      method: 'POST',
      headers: {
        'x-vercel-cron-secret': 'Required - must match CRON_SECRET env variable',
      },
    },
    configuration: {
      maxUsersPerExecution: MAX_USERS_PER_EXECUTION,
      batchSize: BATCH_SIZE,
    },
  });
}

/**
 * POST handler - executes daily task generation for all users
 * Protected by cron secret verification
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const executionDate = getTodayDateString();

  console.log(`[Cron] Starting daily task reset for ${executionDate}`);

  try {
    // 1. Verify cron secret
    const cronSecret = request.headers.get('x-vercel-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
      console.error('[Cron] CRON_SECRET environment variable not configured');
      return NextResponse.json(
        {
          success: false,
          error: 'Server configuration error: CRON_SECRET not set',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    if (cronSecret !== expectedSecret) {
      console.warn('[Cron] Unauthorized cron request attempt');
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Invalid cron secret',
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    console.log('[Cron] ✅ Cron secret verified');

    // 2. Query all active users from SQLite database
    // Active users = users who logged in within the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoUnix = Math.floor(thirtyDaysAgo.getTime() / 1000);

    const allUsers = userRepository.getAllUsers();

    // Filter active users (logged in within last 30 days)
    const activeUsers = allUsers.filter((user: any) => {
      return user.lastLoginAt && user.lastLoginAt >= thirtyDaysAgoUnix;
    }).slice(0, MAX_USERS_PER_EXECUTION); // Limit to max users per execution

    const totalUsers = activeUsers.length;

    console.log(`[Cron] Found ${totalUsers} active users to process`);

    if (totalUsers === 0) {
      const executionTime = Date.now() - startTime;
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        executionTime,
        stats: {
          totalUsers: 0,
          successCount: 0,
          failureCount: 0,
          skippedCount: 0,
        },
        errors: [],
        message: 'No active users found',
      });
    }

    // 3. Process users in batches
    const userIds: string[] = activeUsers.map((user: any) => user.userId);

    const result: CronExecutionResult = {
      success: true,
      timestamp: new Date().toISOString(),
      executionTime: 0,
      stats: {
        totalUsers,
        successCount: 0,
        failureCount: 0,
        skippedCount: 0,
      },
      errors: [],
    };

    // Process users in parallel batches
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(userIds.length / BATCH_SIZE);

      console.log(`[Cron] Processing batch ${batchNumber}/${totalBatches} (${batch.length} users)`);

      // Process batch in parallel
      const batchPromises = batch.map(async (userId) => {
        try {
          // Check if user already has tasks for today
          const existingProgress = await dailyTaskService.getUserDailyProgress(
            userId,
            executionDate
          );

          if (existingProgress && existingProgress.tasks.length > 0) {
            console.log(`[Cron] ⏭️  User ${userId} already has tasks for ${executionDate}`);
            result.stats.skippedCount++;
            return { success: true, skipped: true };
          }

          // Generate daily tasks for this user
          const tasks = await dailyTaskService.generateDailyTasks(userId, executionDate);

          console.log(`[Cron] ✅ Generated ${tasks.length} tasks for user ${userId}`);
          result.stats.successCount++;
          return { success: true, skipped: false };

        } catch (error: any) {
          console.error(`[Cron] ❌ Failed to generate tasks for user ${userId}:`, error);

          result.stats.failureCount++;
          result.errors.push({
            userId,
            error: error?.message || 'Unknown error',
          });

          return { success: false, skipped: false };
        }
      });

      // Wait for batch to complete
      await Promise.allSettled(batchPromises);

      // Add delay between batches to avoid database contention (100ms)
      if (i + BATCH_SIZE < userIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // 4. Calculate execution time and return result
    result.executionTime = Date.now() - startTime;

    console.log(`[Cron] ✅ Daily task reset completed in ${result.executionTime}ms`);
    console.log(`[Cron] Stats:`, result.stats);

    // Return success even if some individual tasks failed
    // This allows monitoring of partial failures
    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    const executionTime = Date.now() - startTime;

    console.error('[Cron] ❌ Fatal error during cron execution:', error);

    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        executionTime,
        error: 'Fatal error during execution',
        message: error?.message || 'Unknown error',
        details: error?.stack,
      },
      { status: 500 }
    );
  }
}
