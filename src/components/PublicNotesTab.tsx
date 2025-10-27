/**
 * @fileOverview Public Notes Tab Component - Community Notes Browser
 *
 * This component provides a browsing interface for public reading notes shared
 * by the community. It implements read-only note display with filtering and
 * pagination optimized for discovery and learning from other readers.
 *
 * Key features:
 * - Fetches public notes with configurable limit (cost optimization)
 * - Search and filtering (chapter, tags) without server roundtrips
 * - Grid layout optimized for 3-column desktop display
 * - Read-only note cards (no edit/delete capabilities)
 * - Responsive pagination for large result sets
 *
 * Architecture decisions:
 * - Similar to notes/page.tsx but simplified for public viewing
 * - No dual state (notes/filteredNotes) needed - simpler data flow
 * - 12 notes per page (divisible by 3 for grid layout)
 * - Fetch limit of 100 (balances discovery vs Firestore costs)
 *
 * Performance considerations:
 * - Uses useMemo for filtering (same as NoteFilters pattern)
 * - Client-side pagination (public notes unlikely to exceed 100)
 * - Auto-reset to page 1 on filter change (prevents empty pages)
 *
 * Usage:
 * ```typescript
 * // In a tabbed interface or community page
 * <PublicNotesTab />
 * ```
 *
 * @see {@link ../lib/notes-service.ts} for getPublicNotes implementation
 * @see {@link ./NoteCard.tsx} for read-only mode (showUserInfo=true)
 */

"use client";

import { useEffect, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Note, getPublicNotes } from '@/lib/notes-service';
import { NoteCard } from '@/components/NoteCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BookOpen, AlertCircle, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMemo } from 'react';

/**
 * Pagination configuration for public notes
 *
 * Reason for 12 notes per page (vs 20 for personal notes):
 * - Divisible by 3 for perfect grid layout (4 rows × 3 columns)
 * - Prevents orphan cards in grid (better visual balance)
 * - Smaller page size encourages exploration (psychological UX)
 * - Reduces scroll length on mobile devices
 */
const NOTES_PER_PAGE = 12;

export function PublicNotesTab() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChapter, setSelectedChapter] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  /**
   * Fetch public notes on component mount
   *
   * Reason for limiting to 100 notes:
   * - Balances content discovery vs Firestore read costs
   * - 100 notes = ~8 pages at 12 notes/page (sufficient for browsing)
   * - Firestore pricing: Each read costs money, so we limit initial fetch
   * - Client-side filtering makes this limit less restrictive
   * - If needed, can implement "Load More" pattern later
   *
   * Reason for NOT including notes in dependency array:
   * - Would cause infinite loop (setNotes triggers re-fetch)
   * - Only need to fetch once on mount
   * - Updates to public notes handled via real-time listeners (future enhancement)
   */
  useEffect(() => {
    const fetchPublicNotes = async () => {
      try {
        setLoading(true);
        setError(null);
        const publicNotes = await getPublicNotes(100); // Fetch up to 100 notes
        setNotes(publicNotes);
      } catch (err) {
        console.error('Error fetching public notes:', err);
        setError(t('notes.fetchPublicError'));
        toast({
          title: t('errors.generic'),
          description: t('notes.fetchPublicError'),
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPublicNotes();
  }, [t, toast]);

  // Get unique chapters
  const chapters = useMemo(() => {
    const chapterSet = new Set(notes.map(note => note.chapterId));
    return Array.from(chapterSet).sort((a, b) => a - b);
  }, [notes]);

  // Get all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach(note => {
      note.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [notes]);

  // Filter notes
  const filteredNotes = useMemo(() => {
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

    // Tag filter
    if (selectedTag !== 'all') {
      filtered = filtered.filter(note => note.tags?.includes(selectedTag));
    }

    return filtered;
  }, [notes, searchQuery, selectedChapter, selectedTag]);

  // Pagination
  const totalPages = Math.ceil(filteredNotes.length / NOTES_PER_PAGE);
  const paginatedNotes = filteredNotes.slice(
    (currentPage - 1) * NOTES_PER_PAGE,
    currentPage * NOTES_PER_PAGE
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedChapter, selectedTag]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedChapter('all');
    setSelectedTag('all');
  };

  const hasActiveFilters = searchQuery || selectedChapter !== 'all' || selectedTag !== 'all';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-primary mb-2">{t('notes.publicNotes')}</h2>
        <p className="text-muted-foreground">{t('notes.publicNotesDesc')}</p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <AlertCircle className="w-16 h-16 text-destructive mb-4" />
          <h3 className="text-xl font-bold mb-2">{t('errors.generic')}</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            {t('buttons.retry')}
          </Button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Empty State */}
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
              <BookOpen className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-bold mb-2">{t('notes.noPublicNotes')}</h3>
              <p className="text-muted-foreground">{t('notes.noPublicNotesDesc')}</p>
            </div>
          ) : (
            <>
              {/* Filters */}
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={t('notes.searchPublicNotes')}
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
                  {chapters.length > 0 && (
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
                  )}

                  {/* Tag Filter */}
                  {allTags.length > 0 && (
                    <Select value={selectedTag} onValueChange={setSelectedTag}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder={t('notes.allTags')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('notes.allTags')}</SelectItem>
                        {allTags.map(tag => (
                          <SelectItem key={tag} value={tag}>
                            {tag}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Clear Filters */}
                  {hasActiveFilters && (
                    <Button onClick={handleClearFilters} variant="outline" size="sm">
                      <X className="w-4 h-4 mr-1" />
                      {t('notes.clearFilters')}
                    </Button>
                  )}
                </div>
              </div>

              {/* Notes Count */}
              <div className="text-sm text-muted-foreground">
                {t('notes.showing')} {filteredNotes.length} {t('notes.publicNotes').toLowerCase()}
              </div>

              {/* Notes Grid */}
              {filteredNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{t('notes.noMatchingNotes')}</h3>
                  <p className="text-muted-foreground">{t('notes.noMatchingNotesDesc')}</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedNotes.map(note => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        showUserInfo={true}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-6">
                      <Button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        variant="outline"
                        size="sm"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        {t('pagination.previous')}
                      </Button>

                      <span className="text-sm text-muted-foreground">
                        {t('pagination.page')} {currentPage} {t('pagination.of')} {totalPages}
                      </span>

                      <Button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        variant="outline"
                        size="sm"
                      >
                        {t('pagination.next')}
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
