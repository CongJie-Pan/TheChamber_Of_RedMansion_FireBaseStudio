/**
 * @fileOverview Note Filters Component - Multi-Dimensional Search and Filter
 *
 * This component provides comprehensive filtering capabilities for user notes,
 * supporting search, chapter filtering, date range filtering, tag filtering,
 * and sorting. It uses optimized React patterns for performance with large note sets.
 *
 * Key features:
 * - Real-time full-text search across content and tags
 * - Chapter-based filtering with dynamic chapter detection
 * - Date range filtering (7/30/90 days, all time)
 * - Multi-tag selection with AND logic
 * - Multiple sorting options (newest, oldest, chapter, word count)
 * - Automatic filter state management
 *
 * Performance optimizations:
 * - useMemo for expensive chapter/tag extraction (O(n) → O(1) on re-renders)
 * - useMemo for filter computation (only recomputes when dependencies change)
 * - Direct callback invocation in useMemo (prevents double filtering)
 *
 * Architecture decisions:
 * - Controlled component pattern (parent owns note list state)
 * - Callback-based filter communication (onFilterChange)
 * - Separation of filter state and filtered results
 *
 * Usage:
 * ```typescript
 * <NoteFilters
 *   notes={allNotes}
 *   onFilterChange={(filtered) => {
 *     setFilteredNotes(filtered);
 *     setCurrentPage(1); // Reset pagination
 *   }}
 * />
 * ```
 *
 * @see {@link ../app/(main)/notes/page.tsx} for usage example
 * @see {@link ./PublicNotesTab.tsx} for public notes usage
 */

"use client";

import { useState, useMemo } from 'react';
import { Note } from '@/lib/notes-service';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X, Filter } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface NoteFiltersProps {
  notes: Note[];
  onFilterChange: (filteredNotes: Note[]) => void;
}

export function NoteFilters({ notes, onFilterChange }: NoteFiltersProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChapter, setSelectedChapter] = useState<string>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('newest');

  /**
   * Extract unique chapters from notes
   *
   * Reason for using useMemo:
   * - Chapter extraction is O(n) operation on notes array
   * - Notes array doesn't change on every render (only on fetch/update)
   * - Prevents unnecessary recalculation during filter state changes
   * - Memoized result enables efficient Select dropdown rendering
   */
  const chapters = useMemo(() => {
    const chapterSet = new Set(notes.map(note => note.chapterId));
    return Array.from(chapterSet).sort((a, b) => a - b);
  }, [notes]);

  /**
   * Extract all unique tags from notes
   *
   * Reason for using useMemo:
   * - Tag extraction requires iterating all notes and their tags (O(n*m))
   * - Tags are frequently displayed but rarely change
   * - Prevents expensive re-computation during filter interactions
   * - Alphabetical sorting provides consistent UX
   */
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach(note => {
      note.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [notes]);

  /**
   * Perform filtering and sorting on notes
   *
   * Reason for calling onFilterChange inside useMemo:
   * - Ensures parent receives filtered results immediately when dependencies change
   * - Prevents double filtering (once in useMemo, once in useEffect)
   * - Dependency array ensures filter only runs when necessary
   * - More efficient than useEffect pattern for this use case
   *
   * Filter application order:
   * 1. Search query (narrows result set first)
   * 2. Chapter filter (fast integer comparison)
   * 3. Date range filter (Date object comparison)
   * 4. Tag filter (array intersection check)
   * 5. Sort (applied last to minimize sorting operations)
   */
  useMemo(() => {
    let filtered = [...notes];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(note =>
        note.note.toLowerCase().includes(query) ||
        note.selectedText.toLowerCase().includes(query) ||
        note.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Chapter filter
    if (selectedChapter !== 'all') {
      filtered = filtered.filter(note => note.chapterId === parseInt(selectedChapter));
    }

    // Date range filter
    if (selectedDateRange !== 'all') {
      const now = new Date();
      const dateLimit = new Date();

      switch (selectedDateRange) {
        case '7days':
          dateLimit.setDate(now.getDate() - 7);
          break;
        case '30days':
          dateLimit.setDate(now.getDate() - 30);
          break;
        case '90days':
          dateLimit.setDate(now.getDate() - 90);
          break;
      }

      if (selectedDateRange !== 'all') {
        filtered = filtered.filter(note => note.createdAt >= dateLimit);
      }
    }

    /**
     * Tags filter with AND logic
     *
     * Reason for using .every() instead of .some():
     * - AND logic: Note must have ALL selected tags
     * - More precise filtering for multi-tag scenarios
     * - Example: User selects ["important", "review"]
     *   → Only shows notes with both tags (not either tag)
     * - Matches user's mental model when refining search
     */
    if (selectedTags.length > 0) {
      filtered = filtered.filter(note =>
        selectedTags.every(tag => note.tags?.includes(tag))
      );
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
      case 'chapter':
        filtered.sort((a, b) => a.chapterId - b.chapterId);
        break;
      case 'wordCount':
        filtered.sort((a, b) => (b.wordCount || 0) - (a.wordCount || 0));
        break;
    }

    onFilterChange(filtered);
  }, [notes, searchQuery, selectedChapter, selectedDateRange, selectedTags, sortBy, onFilterChange]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedChapter('all');
    setSelectedDateRange('all');
    setSelectedTags([]);
    setSortBy('newest');
  };

  const hasActiveFilters = searchQuery || selectedChapter !== 'all' || selectedDateRange !== 'all' || selectedTags.length > 0;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t('notes.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap gap-3">
        {/* Chapter Filter */}
        <Select value={selectedChapter} onValueChange={setSelectedChapter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t('notes.allChapters')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('notes.allChapters')}</SelectItem>
            {chapters.map(chapter => (
              <SelectItem key={chapter} value={chapter.toString()}>
                {t('notes.chapter')} {chapter}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Range Filter */}
        <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t('notes.allTime')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('notes.allTime')}</SelectItem>
            <SelectItem value="7days">{t('notes.last7Days')}</SelectItem>
            <SelectItem value="30days">{t('notes.last30Days')}</SelectItem>
            <SelectItem value="90days">{t('notes.last90Days')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort By */}
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t('notes.sortBy')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t('notes.newest')}</SelectItem>
            <SelectItem value="oldest">{t('notes.oldest')}</SelectItem>
            <SelectItem value="chapter">{t('notes.byChapter')}</SelectItem>
            <SelectItem value="wordCount">{t('notes.byWordCount')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button onClick={handleClearFilters} variant="outline" size="sm">
            <X className="w-4 h-4 mr-1" />
            {t('notes.clearFilters')}
          </Button>
        )}
      </div>

      {/* Tag Filters */}
      {allTags.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span>{t('notes.filterByTags')}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => handleTagToggle(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Active Tag Filters */}
      {selectedTags.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('notes.activeTags')}:</span>
          {selectedTags.map(tag => (
            <Badge key={tag} variant="default" className="flex items-center gap-1">
              {tag}
              <button onClick={() => handleTagToggle(tag)} className="ml-1">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
