'use client';

/**
 * @fileOverview Conversation Flow Component
 *
 * Professional messaging-app-style conversation UI with:
 * - "--開啟新對話--" separator pattern
 * - Message bubble UI (user vs AI messages)
 * - Conversation history display
 * - Timestamp formatting
 * - Smooth scroll to new messages
 * - Avatar display for user and AI
 *
 * Follows the UX design pattern specified in improvement report
 */

import React, { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { User, Bot, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PerplexityCitation } from '@/types/perplexity-qa';

/**
 * Message type definitions
 */
export type MessageRole = 'user' | 'ai' | 'system';

/**
 * Conversation message interface
 */
export interface ConversationMessage {
  /** Unique message ID */
  id: string;

  /** Message role/sender */
  role: MessageRole;

  /** Message content (markdown supported) */
  content: string;

  /** Message timestamp */
  timestamp: Date;

  /** Optional citations (for AI messages) */
  citations?: PerplexityCitation[];

  /** Optional thinking process (for AI messages) */
  thinkingProcess?: string;

  /** Thinking duration in seconds (for AI messages) */
  thinkingDuration?: number;

  /** Whether message is currently streaming */
  isStreaming?: boolean;

  /** Whether message failed to send/receive */
  hasError?: boolean;

  /** Error message if failed */
  errorMessage?: string;
}

/**
 * Component props interface
 */
export interface ConversationFlowProps {
  /** Array of conversation messages */
  messages: ConversationMessage[];

  /** Whether to show new conversation separator */
  showNewConversationSeparator?: boolean;

  /** Callback when user wants to start a new conversation */
  onNewConversation?: () => void;

  /** Whether to auto-scroll to latest message */
  autoScroll?: boolean;

  /** Whether auto-scroll is enabled (Fix Issue #7) */
  autoScrollEnabled?: boolean;

  /** Scroll event handler for detecting user scroll intent (Fix Issue #7) */
  onScrollIntent?: (e: React.UIEvent<HTMLDivElement>) => void;

  /** Custom render function for message content */
  renderMessageContent?: (message: ConversationMessage) => React.ReactNode;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Format timestamp for display
 */
function formatMessageTime(date: Date): string {
  return format(date, 'HH:mm', { locale: zhTW });
}

/**
 * Format full timestamp with date
 */
function formatFullMessageTime(date: Date): string {
  return format(date, 'yyyy/MM/dd HH:mm:ss', { locale: zhTW });
}

/**
 * Get avatar configuration for message role
 */
function getAvatarConfig(role: MessageRole) {
  switch (role) {
    case 'user':
      return {
        icon: User,
        bgColor: 'bg-blue-500 dark:bg-blue-600',
        label: '您',
      };
    case 'ai':
      return {
        icon: Bot,
        bgColor: 'bg-green-500 dark:bg-green-600',
        label: 'AI',
      };
    case 'system':
      return {
        icon: MessageSquare,
        bgColor: 'bg-gray-500 dark:bg-gray-600',
        label: '系統',
      };
  }
}

/**
 * Message Avatar Component
 */
interface MessageAvatarProps {
  role: MessageRole;
  className?: string;
}

function MessageAvatar({ role, className }: MessageAvatarProps) {
  const config = getAvatarConfig(role);
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0',
        config.bgColor,
        className
      )}
      title={config.label}
    >
      <Icon className="w-4 h-4 text-white" />
    </div>
  );
}

/**
 * Message Bubble Component
 */
interface MessageBubbleProps {
  message: ConversationMessage;
  renderContent?: (message: ConversationMessage) => React.ReactNode;
}

function MessageBubble({ message, renderContent }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <div
      className={cn(
        'flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300',
        // Align user messages to the right
        isUser && 'ml-auto flex-row-reverse',
        // Center system messages with a narrow width
        isSystem && 'mx-auto max-w-md'
      )}
    >
      {/* Avatar */}
      {!isSystem && <MessageAvatar role={message.role} />}

      {/* Message Content */}
      <div
        className={cn(
          'min-w-0',
          // Constrain bubble container width instead of stretching full row
          isUser
            ? 'max-w-[85%] md:max-w-[70%]'
            : (isSystem
                ? 'max-w-md'
                : 'max-w-[90%] md:max-w-[85%]')
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-3 shadow-sm',
            isUser
              ? 'bg-blue-500 dark:bg-blue-600 text-white rounded-tr-sm'
              : isSystem
              ? 'bg-gray-100 dark:bg-gray-800 text-center text-sm text-muted-foreground'
              : 'bg-white dark:bg-gray-800 border border-border rounded-tl-sm',
            message.hasError && 'border-red-500 dark:border-red-600'
          )}
        >
          {/* Custom or default content rendering */}
          {(() => {
            // If custom render function provided, try using it
            if (renderContent) {
              const customContent = renderContent(message);
              // Only use custom content if it's not undefined
              if (customContent !== undefined) {
                return customContent;
              }
            }
            // Fall back to default rendering
            return (
              <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                {message.content}
              </div>
            );
          })()}

          {/* Error message */}
          {message.hasError && message.errorMessage && (
            <div className="mt-2 pt-2 border-t border-red-500/20 text-xs text-red-600 dark:text-red-400">
              ⚠️ {message.errorMessage}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div
          className={cn(
            'mt-1 px-1 text-xs text-muted-foreground',
            isUser && 'text-right'
          )}
          title={formatFullMessageTime(message.timestamp)}
        >
          {formatMessageTime(message.timestamp)}
          {message.isStreaming && ' · 傳送中...'}
        </div>
      </div>
    </div>
  );
}

/**
 * New Conversation Separator Component
 */
interface NewConversationSeparatorProps {
  onClick?: () => void;
}

function NewConversationSeparator({ onClick }: NewConversationSeparatorProps) {
  return (
    <div className="flex items-center gap-4 my-6 px-4">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <button
        onClick={onClick}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1 rounded-full hover:bg-accent"
      >
        --開啟新對話--
      </button>
      <div className="flex-1 h-px bg-gradient-to-r from-border via-border to-transparent" />
    </div>
  );
}

/**
 * Main Conversation Flow Component
 */
export function ConversationFlow({
  messages,
  showNewConversationSeparator = true,
  onNewConversation,
  autoScroll = true,
  autoScrollEnabled = true,
  onScrollIntent,
  renderMessageContent,
  className,
}: ConversationFlowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive (if enabled - Fix Issue #7)
  useEffect(() => {
    if (autoScroll && autoScrollEnabled && bottomRef.current?.scrollIntoView) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, autoScroll, autoScrollEnabled]);

  return (
    <div
      ref={scrollContainerRef}
      className={cn(
        'conversation-flow space-y-4 overflow-y-auto',
        className
      )}
      onScroll={onScrollIntent}
    >
      {/* Message history */}
      {messages.length > 0 ? (
        <div className="space-y-4">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              renderContent={renderMessageContent}
            />
          ))}
        </div>
      ) : (
        // Empty state - Task 4.2 Fix: Improved visibility on dark backgrounds
        <div className="flex flex-col items-center justify-center py-12 text-center min-h-[200px] border border-border/30 rounded-lg bg-background/20">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 text-primary/80" />
          </div>
          <p className="text-sm text-foreground/80 font-medium">
            尚無對話記錄
          </p>
          <p className="text-xs text-foreground/60 mt-1">
            開始提出您的問題吧
          </p>
        </div>
      )}

      {/* New conversation separator */}
      {showNewConversationSeparator && messages.length > 0 && (
        <NewConversationSeparator onClick={onNewConversation} />
      )}

      {/* Scroll anchor */}
      <div ref={bottomRef} className="h-px" />
    </div>
  );
}

/**
 * Export utility for creating messages
 */
export function createConversationMessage(
  role: MessageRole,
  content: string,
  options?: Partial<Omit<ConversationMessage, 'id' | 'role' | 'content' | 'timestamp'>>
): ConversationMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    role,
    content,
    timestamp: new Date(),
    ...options,
  };
}