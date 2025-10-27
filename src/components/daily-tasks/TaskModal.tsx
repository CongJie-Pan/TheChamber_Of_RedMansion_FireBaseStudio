/**
 * @fileOverview TaskModal Component - Task Execution Dialog
 *
 * This component renders a modal dialog for completing daily tasks.
 * It provides type-specific interfaces for each task type:
 * - Morning Reading: Passage + Question + Answer Input
 * - Poetry: Original poem + Recitation input
 * - Character Analysis: Character description + Analysis editor
 * - Cultural Quiz: Knowledge card + Multiple choice / Short answer
 * - Commentary: Commentary text + Interpretation input
 *
 * Features:
 * - Type-specific UI for each task
 * - Rich text input areas
 * - Word count display
 * - Submit validation
 * - Loading states
 * - Error handling
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BookOpen,
  Feather,
  Users,
  Landmark,
  BookMarked,
  Loader2,
  AlertCircle,
  Send,
  Lightbulb
} from "lucide-react";

import { DailyTask, DailyTaskType } from '@/lib/types/daily-task';

interface TaskModalProps {
  task: DailyTask;
  open: boolean;
  onClose: () => void;
  onSubmit: (taskId: string, userResponse: string) => Promise<void>;
}

/**
 * TaskModal Component
 */
export const TaskModal: React.FC<TaskModalProps> = ({
  task,
  open,
  onClose,
  onSubmit
}) => {
  const [userResponse, setUserResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  const wordCount = userResponse.trim().length;

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    // Validation
    if (!userResponse.trim()) {
      setError('請輸入你的答案');
      return;
    }

    const minLength = task.gradingCriteria?.minLength || 20;
    if (wordCount < minLength) {
      setError(`答案至少需要 ${minLength} 個字，目前只有 ${wordCount} 個字`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(task.id, userResponse.trim());
      setUserResponse(''); // Reset form
    } catch (error) {
      setError(error instanceof Error ? error.message : '提交失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Render task-specific content
   */
  const renderTaskContent = () => {
    switch (task.type) {
      case DailyTaskType.MORNING_READING:
        return (
          <div className="space-y-4">
            {/* Combined Question Section with Reading Passage */}
            <div>
              <Label className="text-sm font-semibold">❓ 問題</Label>
              <div className="mt-2 p-4 bg-primary/5 rounded-lg border border-primary/20">
                {/* Reading passage embedded in question */}
                <div className="mb-4 p-3 bg-muted/30 rounded-lg border border-border/50">
                  <p className="text-sm leading-relaxed whitespace-pre-line">
                    {task.content.textPassage?.text}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    —— 第{task.content.textPassage?.chapter}回
                  </p>
                </div>
                {/* Question text */}
                <p className="text-sm font-medium">
                  {task.content.textPassage?.question}
                </p>
              </div>
            </div>

            {/* Hint Section with Toggle Button */}
            {task.content.textPassage?.hint && (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHint(!showHint)}
                  className="mb-2"
                  type="button"
                >
                  <Lightbulb className="h-4 w-4 mr-2" />
                  {showHint ? '隱藏提示' : '查看提示'}
                </Button>
                {showHint && (
                  <Alert className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
                    <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                      {task.content.textPassage.hint}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Answer Input */}
            <div>
              <Label htmlFor="answer" className="text-sm font-semibold">
                ✍️ 你的回答
              </Label>
              <Textarea
                id="answer"
                placeholder="請寫下你的理解和見解..."
                value={userResponse}
                onChange={(e) => setUserResponse(e.target.value)}
                rows={8}
                className="mt-2"
              />
            </div>
          </div>
        );

      case DailyTaskType.POETRY:
        return (
          <div className="space-y-4">
            {/* Poem Title */}
            <div className="text-center">
              <h3 className="text-xl font-artistic text-primary">
                《{task.content.poem?.title}》
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {task.content.poem?.author}
              </p>
            </div>

            {/* Original Poem (hidden for recitation) */}
            <div>
              <Label className="text-sm font-semibold">📜 詩詞原文（參考）</Label>
              <div className="mt-2 p-4 bg-muted/30 rounded-lg border border-border">
                <p className="text-sm leading-relaxed whitespace-pre-line text-center font-serif">
                  {task.content.poem?.content}
                </p>
              </div>
            </div>

            {/* Recitation Input */}
            <div>
              <Label htmlFor="recitation" className="text-sm font-semibold">
                🎤 默寫詩詞
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                請憑記憶默寫出這首詩，注意標點符號和格式
              </p>
              <Textarea
                id="recitation"
                placeholder="請在此默寫詩詞原文..."
                value={userResponse}
                onChange={(e) => setUserResponse(e.target.value)}
                rows={6}
                className="mt-2 font-serif"
              />
            </div>
          </div>
        );

      case DailyTaskType.CHARACTER_INSIGHT:
        return (
          <div className="space-y-4">
            {/* Character Info */}
            <div>
              <Label className="text-sm font-semibold">👤 角色分析 - {task.content.character?.characterName}</Label>
              {task.content.character?.context && (
                <div className="mt-2 p-4 bg-muted/30 rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground">
                    情境背景：{task.content.character.context}
                  </p>
                  {task.content.character.chapter && (
                    <p className="text-xs text-muted-foreground mt-1">
                      —— 第 {task.content.character.chapter} 回
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Analysis Prompts */}
            {task.content.character?.analysisPrompts && (
              <div>
                <Label className="text-sm font-semibold">💭 分析提示</Label>
                <ul className="mt-2 space-y-1">
                  {task.content.character.analysisPrompts.map((prompt, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground">
                      • {prompt}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Analysis Input */}
            <div>
              <Label htmlFor="analysis" className="text-sm font-semibold">
                📝 你的分析
              </Label>
              <Textarea
                id="analysis"
                placeholder="請寫下你對這個角色的理解和分析..."
                value={userResponse}
                onChange={(e) => setUserResponse(e.target.value)}
                rows={10}
                className="mt-2"
              />
            </div>
          </div>
        );

      case DailyTaskType.CULTURAL_EXPLORATION:
        return (
          <div className="space-y-4">
            {/* Cultural Element */}
            <div>
              <Label className="text-sm font-semibold">🏛️ 文化知識 - {task.content.culturalElement?.category}</Label>
              <div className="mt-2 p-4 bg-muted/30 rounded-lg border border-border">
                <h4 className="font-semibold text-base mb-2">
                  {task.content.culturalElement?.title}
                </h4>
                <p className="text-sm leading-relaxed whitespace-pre-line">
                  {task.content.culturalElement?.description}
                </p>
              </div>
            </div>

            {/* Quiz Question */}
            {task.content.culturalElement?.questions && task.content.culturalElement.questions.length > 0 && (
              <div>
                <Label className="text-sm font-semibold">❓ 問題</Label>
                <div className="mt-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm font-medium">
                    {task.content.culturalElement.questions[0].question}
                  </p>
                </div>
              </div>
            )}

            {/* Answer Input */}
            <div>
              <Label htmlFor="quiz-answer" className="text-sm font-semibold">
                📋 你的答案
              </Label>
              <Textarea
                id="quiz-answer"
                placeholder="請寫下你的答案..."
                value={userResponse}
                onChange={(e) => setUserResponse(e.target.value)}
                rows={6}
                className="mt-2"
              />
            </div>
          </div>
        );

      case DailyTaskType.COMMENTARY_DECODE:
        return (
          <div className="space-y-4">
            {/* Original Text */}
            {task.content.commentary?.originalText && (
              <div>
                <Label className="text-sm font-semibold">📜 原文</Label>
                <div className="mt-2 p-3 bg-muted/20 rounded-lg border border-border/50">
                  <p className="text-sm leading-relaxed">
                    {task.content.commentary.originalText}
                  </p>
                  {task.content.commentary.chapter && (
                    <p className="text-xs text-muted-foreground mt-1">
                      —— 第 {task.content.commentary.chapter} 回
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Commentary Text */}
            <div>
              <Label className="text-sm font-semibold">📖 {task.content.commentary?.author || '脂硯齋'}批語</Label>
              <div className="mt-2 p-4 bg-red-500/5 rounded-lg border border-red-500/20">
                <p className="text-sm leading-relaxed italic">
                  {task.content.commentary?.commentaryText}
                </p>
              </div>
            </div>

            {/* Interpretation Hint */}
            {task.content.commentary?.hint && (
              <div>
                <Label className="text-sm font-semibold">💡 解讀提示</Label>
                <div className="mt-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm text-muted-foreground">
                    {task.content.commentary.hint}
                  </p>
                </div>
              </div>
            )}

            {/* Interpretation Input */}
            <div>
              <Label htmlFor="interpretation" className="text-sm font-semibold">
                🔍 你的解讀
              </Label>
              <Textarea
                id="interpretation"
                placeholder="請寫下你對這條批語的理解和解讀..."
                value={userResponse}
                onChange={(e) => setUserResponse(e.target.value)}
                rows={10}
                className="mt-2"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8 text-muted-foreground">
            未知的任務類型
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-artistic flex items-center gap-2">
            {task.type === DailyTaskType.MORNING_READING && <BookOpen className="h-6 w-6 text-primary" />}
            {task.type === DailyTaskType.POETRY && <Feather className="h-6 w-6 text-primary" />}
            {task.type === DailyTaskType.CHARACTER_INSIGHT && <Users className="h-6 w-6 text-primary" />}
            {task.type === DailyTaskType.CULTURAL_EXPLORATION && <Landmark className="h-6 w-6 text-primary" />}
            {task.type === DailyTaskType.COMMENTARY_DECODE && <BookMarked className="h-6 w-6 text-primary" />}
            {task.title}
          </DialogTitle>
          <DialogDescription>{task.description}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {renderTaskContent()}
        </div>

        {/* Word Count */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>已輸入 {wordCount} 字</span>
          {task.gradingCriteria?.minLength && (
            <span>最少需要 {task.gradingCriteria.minLength} 字</span>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !userResponse.trim()}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                提交中...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                提交答案
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
