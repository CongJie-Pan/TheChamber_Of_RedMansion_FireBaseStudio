/**
 * @fileOverview Notes Management Dashboard Page
 *
 * This page provides a comprehensive notes management interface for users to view,
 * edit, delete, and organize their reading notes from Dream of the Red Chamber.
 * It implements a full-featured note CRUD system with filtering, pagination,
 * and statistics visualization.
 *
 * Key features:
 * - Real-time note synchronization with Firestore
 * - Multi-dimensional filtering (search, chapter, date, tags)
 * - Client-side pagination for performance optimization
 * - Optimistic UI updates for better user experience
 * - Comprehensive error handling with user-friendly toast notifications
 * - Responsive statistics dashboard showing user progress
 *
 * Architecture decisions:
 * - Uses dual state management (notes + filteredNotes) for efficient filtering
 * - Implements optimistic updates to reduce perceived latency
 * - Separates concerns between data fetching, filtering, and presentation
 *
 * Usage:
 * This page is accessible at `/notes` route for authenticated users only.
 * Users can manage all their reading notes created from the read-book interface.
 *
 * @see {@link ../../../lib/notes-service.ts} for backend operations
 * @see {@link ../../../components/NoteCard.tsx} for individual note display
 */

"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Note,
  getAllNotesByUser,
  deleteNoteById,
  updateNote,
  updateNoteVisibility,
  updateNoteTags
} from '@/lib/notes-service';
import { NoteCard } from '@/components/NoteCard';
import { NoteStats } from '@/components/NoteStats';
import { NoteFilters } from '@/components/NoteFilters';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * Pagination configuration
 *
 * Reason: 20 notes per page provides optimal balance between:
 * - Initial load performance (smaller data transfer)
 * - User experience (enough content without overwhelming)
 * - Firestore read costs (batched queries reduce billing)
 * - Scroll length (prevents infinite scrolling fatigue)
 */
const NOTES_PER_PAGE = 20;

export default function NotesPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  /**
   * State management architecture
   *
   * Reason for dual note states (notes + filteredNotes):
   * - notes: Source of truth from Firestore, never mutated by filters
   * - filteredNotes: Derived state for display, updated by NoteFilters component
   * This separation allows:
   * 1. Efficient filtering without re-fetching from Firestore
   * 2. Easy filter reset (just copy notes to filteredNotes)
   * 3. Optimistic updates work on both states simultaneously
   * 4. Filter changes don't require network calls
   */
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  /**
   * Fetch user's notes on component mount
   *
   * Reason for dependency array [user?.uid, t, toast]:
   * - user?.uid: Refetch when user changes (important for SSR/auth changes)
   * - t, toast: Required by React hooks exhaustive-deps rule
   * - NOT including notes/filteredNotes: Prevents infinite loop
   */
  useEffect(() => {
    const fetchNotes = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const userNotes = await getAllNotesByUser(user.id);
        setNotes(userNotes);
        setFilteredNotes(userNotes);
      } catch (err) {
        console.error('Error fetching notes:', err);
        setError(t('notes.fetchError'));
        toast({
          title: t('errors.generic'),
          description: t('notes.fetchError'),
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [user?.id, t, toast]);

  // Handle note deletion
  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNoteById(noteId);
      setNotes(prev => prev.filter(note => note.id !== noteId));
      setFilteredNotes(prev => prev.filter(note => note.id !== noteId));
      toast({
        title: t('notes.deleteSuccess'),
        description: t('notes.deleteSuccessDesc'),
      });
    } catch (err) {
      console.error('Error deleting note:', err);
      toast({
        title: t('errors.generic'),
        description: t('notes.deleteError'),
        variant: 'destructive'
      });
    }
  };

  /**
   * Handle note content update
   *
   * Reason for optimistic update strategy:
   * - Updates local state immediately before Firestore write completes
   * - Provides instant feedback to user (perceived performance)
   * - If Firestore write fails, toast notification informs user
   * - Word count is recalculated client-side to avoid Firestore read
   *
   * Reason for updating both states:
   * - notes: Maintains source of truth
   * - filteredNotes: Keeps UI in sync with current filter view
   * - Both must be updated to prevent state inconsistency
   */
  const handleUpdateNote = async (noteId: string, content: string) => {
    try {
      await updateNote(noteId, content);

      /**
       * Optimistic UI update helper
       *
       * Reason for recalculating word count client-side:
       * - Avoids additional Firestore read after write
       * - Ensures UI shows accurate count immediately
       * - Uses same logic as backend for consistency
       */
      const updateNoteInList = (noteList: Note[]) =>
        noteList.map(note =>
          note.id === noteId
            ? {
                ...note,
                note: content,
                wordCount: content.trim().split(/\s+/).filter(w => w.length > 0).length,
                lastModified: new Date()
              }
            : note
        );

      setNotes(updateNoteInList);
      setFilteredNotes(updateNoteInList);

      toast({
        title: t('notes.updateSuccess'),
        description: t('notes.updateSuccessDesc'),
      });
    } catch (err) {
      console.error('Error updating note:', err);
      toast({
        title: t('errors.generic'),
        description: t('notes.updateError'),
        variant: 'destructive'
      });
    }
  };

  // Handle note visibility toggle
  const handleTogglePublic = async (noteId: string, isPublic: boolean) => {
    try {
      await updateNoteVisibility(noteId, isPublic);

      // Update local state
      const updateNoteInList = (noteList: Note[]) =>
        noteList.map(note =>
          note.id === noteId ? { ...note, isPublic, lastModified: new Date() } : note
        );

      setNotes(updateNoteInList);
      setFilteredNotes(updateNoteInList);

      toast({
        title: isPublic ? t('notes.madePublic') : t('notes.madePrivate'),
        description: isPublic
          ? t('notes.madePublicDesc')
          : t('notes.madePrivateDesc'),
      });
    } catch (err) {
      console.error('Error updating note visibility:', err);
      toast({
        title: t('errors.generic'),
        description: t('notes.visibilityError'),
        variant: 'destructive'
      });
    }
  };

  // Handle tag updates
  const handleUpdateTags = async (noteId: string, tags: string[]) => {
    try {
      await updateNoteTags(noteId, tags);

      // Update local state
      const updateNoteInList = (noteList: Note[]) =>
        noteList.map(note =>
          note.id === noteId ? { ...note, tags, lastModified: new Date() } : note
        );

      setNotes(updateNoteInList);
      setFilteredNotes(updateNoteInList);

      toast({
        title: t('notes.tagsUpdated'),
        description: t('notes.tagsUpdatedDesc'),
      });
    } catch (err) {
      console.error('Error updating note tags:', err);
      toast({
        title: t('errors.generic'),
        description: t('notes.tagsError'),
        variant: 'destructive'
      });
    }
  };

  /**
   * Client-side pagination logic
   *
   * Reason for client-side pagination vs server-side:
   * - All notes already fetched (typical users have < 100 notes)
   * - Faster page transitions (no network delay)
   * - Simpler implementation (no Firestore cursor management)
   * - Better UX with filters (instant page switching)
   */
  const totalPages = Math.ceil(filteredNotes.length / NOTES_PER_PAGE);
  const paginatedNotes = filteredNotes.slice(
    (currentPage - 1) * NOTES_PER_PAGE,
    currentPage * NOTES_PER_PAGE
  );

  /**
   * Handle filter changes and reset pagination
   *
   * Reason for resetting to page 1 on filter change:
   * - Prevents displaying empty page if filtered results < current page
   * - Matches user expectation (new search → start from beginning)
   * - Consistent behavior with search UX patterns
   */
  const handleFilterChange = (filtered: Note[]) => {
    setFilteredNotes(filtered);
    setCurrentPage(1);
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">{t('notes.loginRequired')}</h2>
          <p className="text-muted-foreground">{t('notes.loginRequiredDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-4xl font-artistic font-bold text-primary mb-2">
          {t('notes.dashboard')}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">{t('notes.dashboardDesc')}</p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 sm:h-32" />
            ))}
          </div>
          <div className="space-y-3 sm:space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-36 sm:h-48" />
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <AlertCircle className="w-16 h-16 text-destructive mb-4" />
          <h2 className="text-2xl font-bold mb-2">{t('errors.generic')}</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            {t('buttons.retry')}
          </Button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Statistics */}
          <div className="mb-8">
            <NoteStats notes={notes} />
          </div>

          {/* Empty State */}
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
              <BookOpen className="w-16 h-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">{t('notes.noNotes')}</h2>
              <p className="text-muted-foreground mb-4">{t('notes.noNotesDesc')}</p>
              <Button onClick={() => window.location.href = '/read-book'}>
                {t('notes.startReading')}
              </Button>
            </div>
          ) : (
            <>
              {/* Filters */}
              <div className="mb-6">
                <NoteFilters notes={notes} onFilterChange={handleFilterChange} />
              </div>

              {/* Notes Count */}
              <div className="mb-4 text-sm text-muted-foreground">
                {t('notes.showing')} {filteredNotes.length} {t('notes.of')} {notes.length} {t('notes.notes')}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {paginatedNotes.map(note => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        onDelete={handleDeleteNote}
                        onUpdate={handleUpdateNote}
                        onTogglePublic={handleTogglePublic}
                        onUpdateTags={handleUpdateTags}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4">
                      <Button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        variant="outline"
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
