/**
 * API Route: GET /api/chapters
 *
 * Returns a list of all available chapters with metadata.
 */

import { NextResponse } from 'next/server';
import { getAvailableChapters } from '@/lib/chapter-loader';

export async function GET() {
  try {
    const chapters = getAvailableChapters();

    return NextResponse.json(chapters);
  } catch (error) {
    console.error('Error fetching chapters list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chapters list' },
      { status: 500 }
    );
  }
}
