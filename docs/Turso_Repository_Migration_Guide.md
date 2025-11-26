# Turso Repository Migration Guide

## Migration from better-sqlite3 to @libsql/client

This guide provides step-by-step instructions for migrating all repository files from synchronous better-sqlite3 to asynchronous @libsql/client (Turso).

## Files to Migrate

1. `/src/lib/repositories/user-repository.ts` (1742 lines, 50+ functions)
2. `/src/lib/repositories/task-repository.ts` (441 lines, 10+ functions)
3. `/src/lib/repositories/progress-repository.ts` (381 lines, 10+ functions)
4. `/src/lib/repositories/community-repository.ts` (759 lines, 20+ functions)
5. `/src/lib/repositories/comment-repository.ts` (585 lines, 15+ functions)
6. `/src/lib/repositories/highlight-repository.ts` (262 lines, 10+ functions)
7. `/src/lib/repositories/note-repository.ts` (441 lines, 15+ functions)

**Total**: ~4,611 lines of code, 140+ functions to migrate

## Migration Rules

### 1. Import Changes

**Before:**
```typescript
import { getDatabase } from '../sqlite-db';
```

**After:**
```typescript
import { getDatabase, type Client } from '../sqlite-db';
```

### 2. Function Signatures

**Before:**
```typescript
export function getUserById(userId: string): UserProfile | null {
  const db = getDatabase();
  // ...
}
```

**After:**
```typescript
export async function getUserById(userId: string): Promise<UserProfile | null> {
  const db = await getDatabase();
  // ...
}
```

### 3. SELECT Query (Single Row)

**Before:**
```typescript
const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
const row = stmt.get(userId) as UserRow | undefined;
```

**After:**
```typescript
const result = await db.execute({
  sql: 'SELECT * FROM users WHERE id = ?',
  args: [userId]
});
const row = result.rows[0] as UserRow | undefined;
```

### 4. SELECT Query (Multiple Rows)

**Before:**
```typescript
const stmt = db.prepare('SELECT * FROM posts ORDER BY createdAt DESC LIMIT ?');
const rows = stmt.all(limit) as PostRow[];
```

**After:**
```typescript
const result = await db.execute({
  sql: 'SELECT * FROM posts ORDER BY createdAt DESC LIMIT ?',
  args: [limit]
});
const rows = result.rows as PostRow[];
```

### 5. INSERT / UPDATE / DELETE Queries

**Before:**
```typescript
const stmt = db.prepare('INSERT INTO users (id, username) VALUES (?, ?)');
stmt.run(userId, username);
```

**After:**
```typescript
await db.execute({
  sql: 'INSERT INTO users (id, username) VALUES (?, ?)',
  args: [userId, username]
});
```

### 6. COUNT Queries

**Before:**
```typescript
const stmt = db.prepare('SELECT COUNT(*) as count FROM users WHERE id = ?');
const result = stmt.get(userId) as { count: number };
return result.count > 0;
```

**After:**
```typescript
const result = await db.execute({
  sql: 'SELECT COUNT(*) as count FROM users WHERE id = ?',
  args: [userId]
});
return (result.rows[0] as { count: number }).count > 0;
```

### 7. Transactions (Method 1: Using transaction helper)

**Before:**
```typescript
const result = db.transaction(() => {
  // Step 1
  const user = getUserById(userId);
  // Step 2
  updateUser(userId, { xp: user.xp + 10 });
  // Step 3
  return user;
})();
```

**After:**
```typescript
import { transaction } from '../sqlite-db';

const result = await transaction(async (db) => {
  // Step 1
  const user = await getUserById(userId);
  // Step 2
  await updateUser(userId, { xp: user.xp + 10 });
  // Step 3
  return user;
});
```

### 8. Transactions (Method 2: Manual BEGIN/COMMIT)

**Before:**
```typescript
const result = db.transaction(() => {
  // operations...
  return someValue;
})();
```

**After:**
```typescript
const db = await getDatabase();
try {
  await db.execute('BEGIN');
  // operations...
  await db.execute('COMMIT');
  return someValue;
} catch (error) {
  await db.execute('ROLLBACK');
  throw error;
}
```

### 9. Calling Other Repository Functions

**Before:**
```typescript
const user = getUserById(userId);
if (!user) {
  throw new Error('User not found');
}
const posts = getPostsByAuthor(userId);
```

**After:**
```typescript
const user = await getUserById(userId);
if (!user) {
  throw new Error('User not found');
}
const posts = await getPostsByAuthor(userId);
```

## Migration Checklist for Each File

### Step 1: Update Imports
- [ ] Add `type Client` to import from '../sqlite-db'
- [ ] Add `transaction` helper if using transactions

### Step 2: Convert All Functions
For each function:
- [ ] Add `async` keyword to function declaration
- [ ] Change return type from `T` to `Promise<T>`
- [ ] Add `await` to `getDatabase()` call
- [ ] Convert all `db.prepare().get()` to `await db.execute()` with `result.rows[0]`
- [ ] Convert all `db.prepare().all()` to `await db.execute()` with `result.rows`
- [ ] Convert all `db.prepare().run()` to `await db.execute()`
- [ ] Add `await` to all calls to other repository functions
- [ ] Convert transactions to use `transaction()` helper or BEGIN/COMMIT

### Step 3: Test Each File
After migration:
- [ ] Run TypeScript compilation: `npm run typecheck`
- [ ] Run tests: `npm test -- <test-file>`
- [ ] Check for any remaining synchronous calls

## Priority Order

Migrate in this order (based on dependencies):

1. **user-repository.ts** - Core dependency, no dependencies on other repositories
2. **task-repository.ts** - Minimal dependencies
3. **progress-repository.ts** - Depends on task-repository
4. **highlight-repository.ts** - Simple, no dependencies
5. **note-repository.ts** - Simple, no dependencies
6. **community-repository.ts** - Depends on user-repository
7. **comment-repository.ts** - Depends on community-repository

## Automated Migration Script (Recommended)

Due to the large number of functions (140+), consider using a script to automate the migration:

```typescript
// migration-script.ts
import * as fs from 'fs';

function migrateRepository(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // 1. Update imports
  content = content.replace(
    /import { getDatabase } from '..\/sqlite-db';/,
    "import { getDatabase, type Client } from '../sqlite-db';"
  );

  // 2. Convert function signatures
  content = content.replace(
    /export function (\w+)\((.*?)\): (.*?) \{/g,
    'export async function $1($2): Promise<$3> {'
  );

  // 3. Convert getDatabase calls
  content = content.replace(
    /const db = getDatabase\(\);/g,
    'const db = await getDatabase();'
  );

  // 4. Convert db.prepare().get()
  content = content.replace(
    /const stmt = db\.prepare\(`([^`]+)`\);\s+const (\w+) = stmt\.get\((.*?)\) as (.*?);/g,
    'const result = await db.execute({\n  sql: `$1`,\n  args: [$3]\n});\nconst $2 = result.rows[0] as $4;'
  );

  // ... more replacements

  fs.writeFileSync(filePath, content, 'utf-8');
}
```

## Common Pitfalls

1. **Forgetting await**: All database calls must use `await`
2. **Forgetting to await repository calls**: Functions calling other repositories need `await`
3. **Transaction syntax**: Must use `transaction()` helper or manual BEGIN/COMMIT
4. **Return types**: Must wrap in `Promise<T>`
5. **Row access**: Use `result.rows[0]` not `stmt.get()`

## Testing Strategy

1. **Unit test each migrated function** with mocked database
2. **Integration test** with actual Turso database
3. **Compare results** between old and new implementation
4. **Performance test** to ensure no regression

## Rollback Plan

Keep backups of original files:
```bash
cp src/lib/repositories/user-repository.ts src/lib/repositories/user-repository.sync.backup.ts
```

## Estimated Time

- **Manual migration**: 2-3 hours per file × 7 files = 14-21 hours
- **Script-assisted migration**: 4-6 hours total
- **Testing**: 4-6 hours total

**Total**: 8-27 hours depending on approach

## Next Steps

1. Choose migration approach (manual vs script-assisted)
2. Create backup of all repository files
3. Start with user-repository.ts (highest priority)
4. Test thoroughly after each file
5. Update dependent services that call repositories
6. Deploy to staging environment
7. Monitor for errors
8. Deploy to production

---

**Status**: Migration guide created 2025-11-25
**Next Action**: Choose migration approach and begin with user-repository.ts
