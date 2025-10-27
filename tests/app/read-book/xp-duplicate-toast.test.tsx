/**
 * @fileOverview Tests for XP duplicate toast behaviors in Read Book page
 *
 * Verifies that when chapter XP is a duplicate (already claimed),
 * the page shows a user-facing toast rather than failing silently.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
// Mock ESM-only dependencies before importing the page
jest.mock('react-markdown', () => ({ __esModule: true, default: () => <div data-testid="markdown" /> }));
jest.mock('../../../src/components/KnowledgeGraphViewer', () => ({ __esModule: true, default: () => <div data-testid="kg" /> }));

import ReadBookPage from '../../../src/app/(main)/read-book/page';
import { LanguageProvider } from '../../../src/context/LanguageContext';
import { Toaster } from '../../../src/components/ui/toaster';

// Mock useAuth to provide a user and minimal profile
jest.mock('../../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'test-user-1', displayName: 'Tester' },
    userProfile: { currentLevel: 0, currentXP: 0, nextLevelXP: 100, completedChapters: [] },
    isLoading: false,
    refreshUserProfile: jest.fn(),
  })
}));

// Mock userLevelService to return duplicate result for chapter XP award
jest.mock('../../../src/lib/user-level-service', () => ({
  userLevelService: {
    awardXP: jest.fn(async () => ({
      success: true,
      newTotalXP: 0,
      newLevel: 0,
      leveledUp: false,
      isDuplicate: true,
    })),
  },
  XP_REWARDS: { CHAPTER_COMPLETED: 10, FIRST_CHAPTER_COMPLETED: 20 }
}));

// Silence console noise from the page during test
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('ReadBookPage XP duplicate toast', () => {
  test('shows toast when chapter XP already claimed (duplicate)', async () => {
    jest.useFakeTimers();

    render(
      <LanguageProvider>
        <ReadBookPage />
        <Toaster />
      </LanguageProvider>
    );

    // Chapter XP is awarded after 5 seconds on the chapter
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    // The duplicate branch should show an informational toast
    const toastTitle = await screen.findByText(/已領取過/i);
    const toastDesc = await screen.findByText(/先前已領取，不重複加分/i);
    expect(toastTitle).toBeInTheDocument();
    expect(toastDesc).toBeInTheDocument();
  });
});
