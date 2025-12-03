/**
 * Chapter Loader Service
 *
 * Provides functions to load chapter content from JSON files.
 * Supports both server-side (file system) and client-side (API) loading.
 */

import fs from 'fs';
import path from 'path';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Annotation within paragraph text
 */
export interface ChapterAnnotation {
  text: string;      // The annotated text
  note: string;      // Explanation/annotation content
  id: string;        // Unique identifier
}

/**
 * A paragraph in a chapter
 */
export interface ChapterParagraph {
  content: Array<string | ChapterAnnotation>;  // Mixed content (plain text + annotations)
  vernacular?: string;  // Optional vernacular (white paper) translation
}

/**
 * Chapter data structure (from JSON file)
 */
export interface ChapterData {
  id: number;
  title: string;           // Full title including "第X回"
  titleText: string;       // Just the title text without chapter number
  paragraphs: ChapterParagraph[];
}

/**
 * Chapter metadata for listing
 */
export interface ChapterMeta {
  id: number;
  title: string;
  titleText: string;
  paragraphCount: number;
}

// =============================================================================
// Constants
// =============================================================================

const CHAPTERS_DIR = path.join(process.cwd(), 'src', 'data', 'chapters');
const TOTAL_CHAPTERS = 120; // Dream of the Red Chamber has 120 chapters

// =============================================================================
// Server-side Functions (for API routes)
// =============================================================================

/**
 * Load a single chapter by ID (server-side)
 *
 * @param chapterId - The chapter number (1-120)
 * @returns Chapter data or null if not found
 */
export function loadChapter(chapterId: number): ChapterData | null {
  const filename = `chapter-${String(chapterId).padStart(3, '0')}.json`;
  const filePath = path.join(CHAPTERS_DIR, filename);

  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as ChapterData;
  } catch (error) {
    console.error(`Failed to load chapter ${chapterId}:`, error);
    return null;
  }
}

/**
 * Get list of all available chapters (server-side)
 *
 * @returns Array of chapter metadata
 */
export function getAvailableChapters(): ChapterMeta[] {
  const chapters: ChapterMeta[] = [];

  try {
    if (!fs.existsSync(CHAPTERS_DIR)) {
      return chapters;
    }

    const files = fs.readdirSync(CHAPTERS_DIR)
      .filter(f => f.startsWith('chapter-') && f.endsWith('.json'))
      .sort();

    for (const file of files) {
      const filePath = path.join(CHAPTERS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content) as ChapterData;

      chapters.push({
        id: data.id,
        title: data.title,
        titleText: data.titleText,
        paragraphCount: data.paragraphs.length,
      });
    }

    return chapters.sort((a, b) => a.id - b.id);
  } catch (error) {
    console.error('Failed to get available chapters:', error);
    return chapters;
  }
}

/**
 * Check if a chapter exists
 *
 * @param chapterId - The chapter number
 * @returns True if chapter file exists
 */
export function chapterExists(chapterId: number): boolean {
  const filename = `chapter-${String(chapterId).padStart(3, '0')}.json`;
  const filePath = path.join(CHAPTERS_DIR, filename);
  return fs.existsSync(filePath);
}

/**
 * Get the next available chapter ID
 *
 * @param currentChapterId - Current chapter ID
 * @returns Next chapter ID or null if at end
 */
export function getNextChapterId(currentChapterId: number): number | null {
  for (let i = currentChapterId + 1; i <= TOTAL_CHAPTERS; i++) {
    if (chapterExists(i)) {
      return i;
    }
  }
  return null;
}

/**
 * Get the previous available chapter ID
 *
 * @param currentChapterId - Current chapter ID
 * @returns Previous chapter ID or null if at start
 */
export function getPreviousChapterId(currentChapterId: number): number | null {
  for (let i = currentChapterId - 1; i >= 1; i--) {
    if (chapterExists(i)) {
      return i;
    }
  }
  return null;
}

// =============================================================================
// Client-side Functions (using fetch API)
// =============================================================================

/**
 * Fetch chapter data from API (client-side)
 *
 * @param chapterId - The chapter number
 * @returns Chapter data or null if not found
 */
export async function fetchChapter(chapterId: number): Promise<ChapterData | null> {
  try {
    const response = await fetch(`/api/chapters/${chapterId}/content`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch chapter ${chapterId}:`, error);
    return null;
  }
}

/**
 * Fetch list of available chapters from API (client-side)
 *
 * @returns Array of chapter metadata
 */
export async function fetchAvailableChapters(): Promise<ChapterMeta[]> {
  try {
    const response = await fetch('/api/chapters');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch available chapters:', error);
    return [];
  }
}
