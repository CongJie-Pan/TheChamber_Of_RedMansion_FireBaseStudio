/**
 * @fileOverview Test Fixtures for Community Module
 *
 * Provides reusable test data for community feature testing including:
 * - Mock users with sessions
 * - Sample posts (clean and with profanity)
 * - Sample comments
 * - Mock API responses
 *
 * @phase Phase 3 - Community Module Testing
 * @date 2025-10-30
 */

import type { CreatePostData, CreateCommentData } from '@/types/community';

/**
 * Standard test users with consistent IDs
 */
export const TEST_USERS = {
  user1: {
    id: 'test-user-001',
    name: 'Alice Reader',
    email: 'alice@test.com',
  },
  user2: {
    id: 'test-user-002',
    name: 'Bob Scholar',
    email: 'bob@test.com',
  },
  user3: {
    id: 'test-user-003',
    name: 'Carol Enthusiast',
    email: 'carol@test.com',
  },
  admin: {
    id: 'test-admin-001',
    name: 'Admin User',
    email: 'admin@test.com',
    role: 'admin',
  },
};

/**
 * Mock NextAuth sessions for testing authenticated endpoints
 */
export const MOCK_SESSIONS = {
  user1: {
    user: TEST_USERS.user1,
    expires: new Date(Date.now() + 86400000).toISOString(), // 24 hours
  },
  user2: {
    user: TEST_USERS.user2,
    expires: new Date(Date.now() + 86400000).toISOString(),
  },
  user3: {
    user: TEST_USERS.user3,
    expires: new Date(Date.now() + 86400000).toISOString(),
  },
  admin: {
    user: TEST_USERS.admin,
    expires: new Date(Date.now() + 86400000).toISOString(),
  },
  expired: {
    user: TEST_USERS.user1,
    expires: new Date(Date.now() - 1000).toISOString(), // Expired
  },
};

/**
 * Sample post data - clean content for happy path tests
 */
export const CLEAN_POST_DATA: CreatePostData = {
  authorId: TEST_USERS.user1.id,
  authorName: TEST_USERS.user1.name,
  title: '賈寶玉與林黛玉的情感解析',
  content: `
    在《紅樓夢》中，賈寶玉與林黛玉的愛情是最令人動容的部分之一。
    他們的感情建立在對彼此深刻的理解之上，超越了世俗的物質追求。
    林黛玉的才情與寶玉的叛逆精神相互呼應，形成了完美的精神契合。
    這種愛情悲劇反映了封建社會對個人情感自由的壓抑。
  `,
  tags: ['賈寶玉', '林黛玉', '愛情', '文學分析'],
  category: 'discussion',
};

/**
 * Sample post data - contains mild profanity for moderation testing
 */
export const PROFANITY_POST_DATA: CreatePostData = {
  authorId: TEST_USERS.user2.id,
  authorName: TEST_USERS.user2.name,
  title: '我對王熙鳳的看法',
  content: `
    王熙鳳這個角色實在太狡猾了，她為了權力不擇手段。
    她的行為真的很混蛋，欺負弱小毫無人性。
    但不得不承認她的管理能力確實出眾。
  `,
  tags: ['王熙鳳', '人物分析'],
  category: 'character-analysis',
};

/**
 * Sample post data - minimal valid content
 */
export const MINIMAL_POST_DATA: CreatePostData = {
  authorId: TEST_USERS.user3.id,
  authorName: TEST_USERS.user3.name,
  content: '剛讀完第一回，感覺很有意思！',
  tags: [],
};

/**
 * Sample comment data - clean content
 */
export const CLEAN_COMMENT_DATA: CreateCommentData = {
  postId: 'post-001',
  authorId: TEST_USERS.user2.id,
  authorName: TEST_USERS.user2.name,
  content: '非常同意你的觀點！林黛玉的詩詞才華確實令人驚嘆。',
};

/**
 * Sample comment data - with profanity
 */
export const PROFANITY_COMMENT_DATA: CreateCommentData = {
  postId: 'post-001',
  authorId: TEST_USERS.user3.id,
  authorName: TEST_USERS.user3.name,
  content: '你說的什麼鬼話，根本就是胡說八道！',
};

/**
 * Sample comment data - reply to another comment
 */
export const REPLY_COMMENT_DATA: CreateCommentData = {
  postId: 'post-001',
  authorId: TEST_USERS.user1.id,
  authorName: TEST_USERS.user1.name,
  content: '感謝你的回覆！我也認為這個解讀很有深度。',
  parentCommentId: 'comment-001',
};

/**
 * Complete post object (as returned from database)
 */
export const MOCK_POST = {
  id: 'post-001',
  authorId: TEST_USERS.user1.id,
  authorName: TEST_USERS.user1.name,
  title: CLEAN_POST_DATA.title,
  content: CLEAN_POST_DATA.content,
  tags: CLEAN_POST_DATA.tags,
  category: CLEAN_POST_DATA.category,
  likes: 5,
  likedBy: ['user-a', 'user-b', 'user-c'],
  bookmarkedBy: ['user-d'],
  commentCount: 3,
  viewCount: 42,
  status: 'active' as const,
  isEdited: false,
  moderationAction: 'allow' as const, // Added for content moderation tests
  createdAt: {
    toDate: () => new Date('2025-10-30T10:00:00Z'),
    toMillis: () => 1730282400000,
    seconds: 1730282400,
    nanoseconds: 0,
  },
  updatedAt: {
    toDate: () => new Date('2025-10-30T10:00:00Z'),
    toMillis: () => 1730282400000,
    seconds: 1730282400,
    nanoseconds: 0,
  },
};

/**
 * Post with moderation applied
 */
export const MODERATED_POST = {
  ...MOCK_POST,
  id: 'post-002',
  authorId: TEST_USERS.user2.id,
  authorName: TEST_USERS.user2.name,
  content: '王熙鳳這個角色實在太狡猾了，她為了權力不擇手段。她的行為真的很[內容已過濾]，欺負弱小毫無人性。',
  originalContent: PROFANITY_POST_DATA.content,
  moderationAction: JSON.stringify({
    shouldHide: true,
    filteredContent: '王熙鳳這個角色實在太狡猾了，她為了權力不擇手段。她的行為真的很[內容已過濾]，欺負弱小毫無人性。',
    violations: ['profanity'],
    action: 'filter',
  }),
  moderationWarning: '此內容已被自動審核並過濾部分詞彙',
};

/**
 * Complete comment object
 */
export const MOCK_COMMENT = {
  id: 'comment-001',
  postId: 'post-001',
  authorId: TEST_USERS.user2.id,
  authorName: TEST_USERS.user2.name,
  content: CLEAN_COMMENT_DATA.content,
  likes: 2,
  likedBy: ['user-e', 'user-f'],
  status: 'active' as const,
  createdAt: {
    toDate: () => new Date('2025-10-30T10:30:00Z'),
    toMillis: () => 1730284200000,
    seconds: 1730284200,
    nanoseconds: 0,
  },
  updatedAt: {
    toDate: () => new Date('2025-10-30T10:30:00Z'),
    toMillis: () => 1730284200000,
    seconds: 1730284200,
    nanoseconds: 0,
  },
};

/**
 * Array of mock posts for list testing
 */
export const MOCK_POSTS_LIST = [
  MOCK_POST,
  {
    ...MOCK_POST,
    id: 'post-002',
    authorId: TEST_USERS.user2.id,
    authorName: TEST_USERS.user2.name,
    title: '薛寶釵的性格特點',
    tags: ['薛寶釵', '人物分析'],
    category: 'character-analysis',
    likes: 8,
    commentCount: 5,
  },
  {
    ...MOCK_POST,
    id: 'post-003',
    authorId: TEST_USERS.user3.id,
    authorName: TEST_USERS.user3.name,
    title: '第五回的詩詞賞析',
    tags: ['詩詞', '文學分析'],
    category: 'poetry',
    likes: 12,
    commentCount: 7,
  },
];

/**
 * Mock API response - successful post creation
 */
export const MOCK_CREATE_POST_SUCCESS = {
  success: true,
  postId: 'post-new-001',
  post: MOCK_POST,
};

/**
 * Mock API response - authentication error
 */
export const MOCK_ERROR_UNAUTHORIZED = {
  success: false,
  error: 'Unauthorized - Please log in',
};

/**
 * Mock API response - validation error
 */
export const MOCK_ERROR_VALIDATION = {
  success: false,
  error: 'Invalid request data',
  details: [
    {
      code: 'too_small',
      minimum: 1,
      type: 'string',
      inclusive: true,
      exact: false,
      message: 'Content is required',
      path: ['content'],
    },
  ],
};

/**
 * Mock API response - authorization error (ID mismatch)
 */
export const MOCK_ERROR_FORBIDDEN = {
  success: false,
  error: 'Forbidden - Author ID does not match authenticated user',
};

/**
 * Mock API response - database error
 */
export const MOCK_ERROR_DATABASE = {
  success: false,
  error: 'Database error - Service temporarily unavailable',
};

/**
 * Mock moderation result - content is clean
 */
export const MOCK_MODERATION_CLEAN = {
  shouldHide: false,
  filteredContent: null,
  violations: [],
  action: 'none',
};

/**
 * Mock moderation result - content needs filtering
 */
export const MOCK_MODERATION_FILTER = {
  shouldHide: true,
  filteredContent: '這段內容包含[內容已過濾]詞彙',
  violations: ['profanity'],
  action: 'filter',
};

/**
 * Mock moderation result - content should be blocked
 */
export const MOCK_MODERATION_BLOCK = {
  shouldHide: true,
  filteredContent: null,
  violations: ['severe_profanity', 'harassment'],
  action: 'block',
};

/**
 * Invalid post data - missing required fields
 */
export const INVALID_POST_DATA_NO_CONTENT = {
  authorId: TEST_USERS.user1.id,
  authorName: TEST_USERS.user1.name,
  tags: [],
  // Missing content field
};

/**
 * Invalid post data - content too long
 */
export const INVALID_POST_DATA_TOO_LONG = {
  authorId: TEST_USERS.user1.id,
  authorName: TEST_USERS.user1.name,
  content: 'a'.repeat(10001), // Exceeds 10000 char limit
  tags: [],
};

/**
 * Invalid post data - empty authorId
 */
export const INVALID_POST_DATA_NO_AUTHOR = {
  authorId: '',
  authorName: TEST_USERS.user1.name,
  content: 'Test content',
  tags: [],
};

/**
 * Helper function to create a mock NextRequest
 */
export function createMockRequest(
  body: any,
  headers: Record<string, string> = { 'content-type': 'application/json' }
): any {
  return {
    headers: new Headers(headers),
    json: async () => body,
    nextUrl: {
      searchParams: new URLSearchParams(),
    },
  } as any;
}

/**
 * Helper function to create a mock NextRequest with query parameters
 */
export function createMockRequestWithParams(
  body: any,
  queryParams: Record<string, string> = {},
  headers: Record<string, string> = { 'content-type': 'application/json' }
): any {
  const searchParams = new URLSearchParams(queryParams);
  return {
    headers: new Headers(headers),
    json: async () => body,
    nextUrl: {
      searchParams,
    },
  } as any;
}

/**
 * Helper function to read JSON from mocked NextResponse
 */
export async function readMockResponseJson(res: any): Promise<any> {
  if (res.json) {
    return await res.json();
  }
  if (res.text) {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return res;
}
