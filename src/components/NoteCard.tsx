/**
 * @fileOverview Note Card Component - Interactive Reading Note Display
 *
 * This component provides a rich, interactive card interface for displaying and
 * managing individual reading notes from Dream of the Red Chamber. It supports
 * inline editing, tagging, visibility control, and deletion with optimistic UI updates.
 *
 * Key features:
 * - Inline editing with edit/save/cancel controls
 * - Tag management with add/remove capabilities
 * - Public/private visibility toggle
 * - Contextual display mode (owner vs public view)
 * - Optimistic UI updates with callback pattern
 * - Responsive design with mobile-first approach
 *
 * Architecture decisions:
 * - Local state + callback pattern for optimistic updates
 * - Separate edit states for content and tags (independent editing)
 * - Conditional rendering based on showUserInfo prop (reusable for different contexts)
 *
 * Usage:
 * ```typescript
 * // Owner's notes dashboard
 * <NoteCard
 *   note={note}
 *   onDelete={handleDelete}
 *   onUpdate={handleUpdate}
 *   onTogglePublic={handleTogglePublic}
 *   onUpdateTags={handleUpdateTags}
 * />
 *
 * // Public notes browsing (read-only)
 * <NoteCard
 *   note={note}
 *   showUserInfo={true}
 * />
 * ```
 *
 * @see {@link ../lib/notes-service.ts} for backend operations
 * @see {@link ../app/(main)/notes/page.tsx} for owner's usage
 * @see {@link ./PublicNotesTab.tsx} for public browsing usage
 */

"use client";

import { useState } from 'react';
import { Note } from '@/lib/notes-service';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Trash2, Edit2, Save, X, Share2, Tag } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface NoteCardProps {
  note: Note;
  onDelete?: (noteId: string) => void;
  onUpdate?: (noteId: string, content: string) => void;
  onTogglePublic?: (noteId: string, isPublic: boolean) => void;
  onUpdateTags?: (noteId: string, tags: string[]) => void;
  showUserInfo?: boolean; // For public notes display - disables edit/delete controls
}

export function NoteCard({
  note,
  onDelete,
  onUpdate,
  onTogglePublic,
  onUpdateTags,
  showUserInfo = false
}: NoteCardProps) {
  const { t } = useLanguage();

  /**
   * Local state management for optimistic updates
   *
   * Reason for local state + callback pattern:
   * - Provides instant UI feedback before Firestore write completes
   * - Parent component maintains source of truth via callbacks
   * - Allows independent editing of content and tags (better UX)
   * - Rollback is handled by parent if Firestore write fails
   *
   * State variables:
   * - isEditing: Content editing mode toggle
   * - editedContent: Temporary buffer for content changes
   * - isEditingTags: Tag editing mode toggle (independent from content)
   * - tagInput: Input buffer for new tag entry
   * - localTags: Optimistic tag state (synced with parent via callback)
   */
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(note.note);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [localTags, setLocalTags] = useState<string[]>(note.tags || []);

  const handleSave = () => {
    if (onUpdate && note.id) {
      onUpdate(note.id, editedContent);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedContent(note.note);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (onDelete && note.id && confirm(t('notes.confirmDelete'))) {
      onDelete(note.id);
    }
  };

  const handleTogglePublic = (checked: boolean) => {
    if (onTogglePublic && note.id) {
      onTogglePublic(note.id, checked);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !localTags.includes(tagInput.trim())) {
      const newTags = [...localTags, tagInput.trim()];
      setLocalTags(newTags);
      if (onUpdateTags && note.id) {
        onUpdateTags(note.id, newTags);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = localTags.filter(tag => tag !== tagToRemove);
    setLocalTags(newTags);
    if (onUpdateTags && note.id) {
      onUpdateTags(note.id, newTags);
    }
  };

  /**
   * Format date for display using native Intl API
   *
   * Reason for using Intl.DateTimeFormat instead of date library:
   * - No external dependencies (smaller bundle size)
   * - Native browser API with excellent i18n support
   * - Automatically handles user's locale preferences
   * - Follows locale-specific date formatting rules
   * - t('lang') provides zh-TW, zh-CN, or en-US locale code
   */
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(t('lang'), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {t('notes.chapter')} {note.chapterId}
              </Badge>
              {note.isPublic && (
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  <Share2 className="w-3 h-3" />
                  {t('notes.public')}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDate(note.createdAt)}
            </p>
            {note.wordCount !== undefined && (
              <p className="text-xs text-muted-foreground">
                {note.wordCount} {t('notes.words')}
              </p>
            )}
          </div>

          {!showUserInfo && onTogglePublic && (
            <div className="flex items-center gap-2">
              <Switch
                id={`public-${note.id}`}
                checked={note.isPublic || false}
                onCheckedChange={handleTogglePublic}
              />
              <Label htmlFor={`public-${note.id}`} className="text-xs cursor-pointer">
                {t('notes.shareToPublic')}
              </Label>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Selected Text */}
        <blockquote className="border-l-4 border-primary pl-3 py-2 bg-muted/30 rounded-r">
          <p className="text-sm italic text-muted-foreground">{note.selectedText}</p>
        </blockquote>

        {/* Note Content */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">{t('notes.yourNote')}</Label>
          {isEditing ? (
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full min-h-[100px] p-2 border rounded-md text-sm"
              placeholder={t('notes.enterNote')}
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap">{note.note}</p>
          )}
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            <Label className="text-sm">{t('notes.tags')}</Label>
            {!showUserInfo && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingTags(!isEditingTags)}
                className="h-6 px-2"
              >
                {isEditingTags ? <X className="w-3 h-3" /> : <Edit2 className="w-3 h-3" />}
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-1">
            {localTags.map((tag, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-xs flex items-center gap-1"
              >
                {tag}
                {isEditingTags && !showUserInfo && (
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>

          {isEditingTags && !showUserInfo && (
            <div className="flex gap-2">
              <Input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder={t('notes.addTag')}
                className="h-8 text-sm"
              />
              <Button onClick={handleAddTag} size="sm" className="h-8">
                {t('buttons.add')}
              </Button>
            </div>
          )}
        </div>
      </CardContent>

      {!showUserInfo && (
        <CardFooter className="flex justify-end gap-2 pt-3">
          {isEditing ? (
            <>
              <Button onClick={handleCancel} variant="outline" size="sm">
                <X className="w-4 h-4 mr-1" />
                {t('buttons.cancel')}
              </Button>
              <Button onClick={handleSave} size="sm">
                <Save className="w-4 h-4 mr-1" />
                {t('buttons.save')}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                <Edit2 className="w-4 h-4 mr-1" />
                {t('buttons.edit')}
              </Button>
              <Button onClick={handleDelete} variant="destructive" size="sm">
                <Trash2 className="w-4 h-4 mr-1" />
                {t('buttons.delete')}
              </Button>
            </>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
