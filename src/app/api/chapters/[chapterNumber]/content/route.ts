/**
 * API Route: GET /api/chapters/[chapterNumber]/content
 *
 * Returns the full content of a specific chapter.
 */

import { NextRequest, NextResponse } from 'next/server';
import { loadChapter, getNextChapterId, getPreviousChapterId } from '@/lib/chapter-loader';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chapterNumber: string }> }
) {
  try {
    const { chapterNumber } = await params;

    // Validate chapter number
    const chapterNum = parseInt(chapterNumber);
    if (isNaN(chapterNum) || chapterNum < 1 || chapterNum > 120) {
      return NextResponse.json(
        { error: 'Invalid chapter number. Must be between 1 and 120.' },
        { status: 400 }
      );
    }

    // Load chapter data
    const chapter = loadChapter(chapterNum);

    if (!chapter) {
      return NextResponse.json(
        { error: `Chapter ${chapterNum} not found or not yet available.` },
        { status: 404 }
      );
    }

    // Add navigation info
    const nextChapterId = getNextChapterId(chapterNum);
    const prevChapterId = getPreviousChapterId(chapterNum);

    return NextResponse.json({
      ...chapter,
      navigation: {
        next: nextChapterId,
        previous: prevChapterId,
      },
    });
  } catch (error) {
    console.error('Error loading chapter content:', error);
    return NextResponse.json(
      { error: 'Failed to load chapter content' },
      { status: 500 }
    );
  }
}
