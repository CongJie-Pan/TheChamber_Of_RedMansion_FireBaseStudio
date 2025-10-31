/**
 * @fileOverview Daily Tasks Fetch API Route
 *
 * GET endpoint to fetch task details by task IDs
 * This endpoint is used to load existing tasks without regenerating them
 *
 * @phase Phase 2 - P2-T1: Task Generation Cache Control
 * @created 2025-10-31
 */

import { NextRequest, NextResponse } from 'next/server';
import { dailyTaskService } from '@/lib/daily-task-service';

/**
 * GET /api/daily-tasks/tasks
 *
 * Fetches task details for given task IDs
 *
 * Query Parameters:
 * - taskIds: string (required) - Comma-separated list of task IDs to fetch
 *
 * Returns:
 * - Array of DailyTask objects matching the provided IDs
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const taskIdsParam = searchParams.get('taskIds');

    if (!taskIdsParam) {
      return NextResponse.json(
        { error: 'taskIds parameter is required' },
        { status: 400 }
      );
    }

    // Parse comma-separated task IDs
    const taskIds = taskIdsParam.split(',').map(id => id.trim()).filter(id => id.length > 0);

    if (taskIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid task ID is required' },
        { status: 400 }
      );
    }

    console.log(`📋 [API] Fetching ${taskIds.length} tasks: ${taskIds.join(', ')}`);

    // Fetch task details using the service
    const tasks = await Promise.all(
      taskIds.map(taskId => dailyTaskService.getTaskById(taskId))
    );

    // Filter out any null results (tasks not found)
    const validTasks = tasks.filter(task => task !== null);

    if (validTasks.length === 0) {
      return NextResponse.json(
        { error: 'No tasks found with the provided IDs' },
        { status: 404 }
      );
    }

    console.log(`✅ [API] Successfully fetched ${validTasks.length}/${taskIds.length} tasks`);

    return NextResponse.json({
      success: true,
      tasks: validTasks,
      requestedCount: taskIds.length,
      returnedCount: validTasks.length,
    });
  } catch (error) {
    console.error('❌ [API] Error fetching tasks:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch tasks',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
