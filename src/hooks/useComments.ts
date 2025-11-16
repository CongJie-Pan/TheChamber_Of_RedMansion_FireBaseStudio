'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

/**
 * Comment type from API
 */
export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  parentCommentId?: string;
  depth: number;
  replyCount: number;
  likes: number;
  likedBy: string[];
  createdAt: {
    seconds: number;
    nanoseconds: number;
    toMillis: () => number;
    toDate: () => Date;
  };
  updatedAt: {
    seconds: number;
    nanoseconds: number;
    toMillis: () => number;
    toDate: () => Date;
  };
  isEdited: boolean;
  status: 'active' | 'hidden' | 'deleted';
}

/**
 * Fetch comments from API
 */
async function fetchComments(postId: string, limit?: number): Promise<PostComment[]> {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());

  const response = await fetch(`/api/community/posts/${postId}/comments?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch comments (${response.status})`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch comments');
  }

  return result.comments || [];
}

/**
 * Hook to fetch comments for a post with caching
 *
 * @param postId - ID of the post
 * @param enabled - Whether to fetch (default: true)
 * @returns React Query result with comments data
 */
export function useComments(postId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['comments', postId],
    queryFn: () => fetchComments(postId),
    enabled,
    staleTime: 60 * 1000, // 1 minute (from user preference)
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchInterval: enabled ? 60 * 1000 : false, // Auto-refresh every 1 minute when expanded
  });
}

/**
 * Hook to prefetch comments (for hover/touch interactions)
 *
 * @returns Function to prefetch comments for a post
 */
export function usePrefetchComments() {
  const queryClient = useQueryClient();

  return (postId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['comments', postId],
      queryFn: () => fetchComments(postId),
      staleTime: 60 * 1000,
    });
  };
}

/**
 * Hook to prefetch comments when post comes into view (for mobile)
 *
 * @param postId - ID of the post
 * @param elementRef - Ref to the post element
 * @returns Whether the element is in view
 */
export function useCommentsInView(postId: string, elementRef: React.RefObject<HTMLElement>) {
  const queryClient = useQueryClient();
  const hasPrefetched = useRef(false);

  useEffect(() => {
    if (!elementRef.current || hasPrefetched.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasPrefetched.current) {
            hasPrefetched.current = true;
            queryClient.prefetchQuery({
              queryKey: ['comments', postId],
              queryFn: () => fetchComments(postId),
              staleTime: 60 * 1000,
            });
          }
        });
      },
      {
        rootMargin: '100px', // Start prefetching 100px before element enters viewport
      }
    );

    observer.observe(elementRef.current);

    return () => {
      observer.disconnect();
    };
  }, [postId, elementRef, queryClient]);

  return hasPrefetched.current;
}
