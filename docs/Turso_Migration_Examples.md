# Turso Migration: Before & After Examples

Real examples from the repository showing exactly how to migrate each pattern.

---

## Example 1: Simple SELECT (Single Row)

### File: `user-repository.ts` - `getUserById()`

**BEFORE (better-sqlite3):**
```typescript
export function getUserById(userId: string): UserProfile | null {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM users WHERE id = ?
  `);

  const row = stmt.get(userId) as UserRow | undefined;

  if (!row) {
    return null;
  }

  return rowToUserProfile(row);
}
```

**AFTER (@libsql/client):**
```typescript
export async function getUserById(userId: string): Promise<UserProfile | null> {
  const db = await getDatabase();

  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [userId]
  });

  const row = result.rows[0] as UserRow | undefined;

  if (!row) {
    return null;
  }

  return rowToUserProfile(row);
}
```

**Changes:**
1. ✅ Added `async` keyword
2. ✅ Changed return type to `Promise<UserProfile | null>`
3. ✅ Added `await` to `getDatabase()`
4. ✅ Replaced `db.prepare().get()` with `await db.execute()`
5. ✅ Access result with `result.rows[0]`

---

## Example 2: SELECT with Multiple Rows

### File: `task-repository.ts` - `getTasksByType()`

**BEFORE:**
```typescript
export function getTasksByType(taskType: DailyTaskType): DailyTask[] {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM daily_tasks
    WHERE taskType = ?
    ORDER BY createdAt DESC
  `);

  const rows = stmt.all(taskType) as TaskRow[];

  return rows.map(rowToTask);
}
```

**AFTER:**
```typescript
export async function getTasksByType(taskType: DailyTaskType): Promise<DailyTask[]> {
  const db = await getDatabase();

  const result = await db.execute({
    sql: `
      SELECT * FROM daily_tasks
      WHERE taskType = ?
      ORDER BY createdAt DESC
    `,
    args: [taskType]
  });

  const rows = result.rows as TaskRow[];

  return rows.map(rowToTask);
}
```

**Changes:**
1. ✅ Added `async` keyword
2. ✅ Changed return type to `Promise<DailyTask[]>`
3. ✅ Added `await` to `getDatabase()`
4. ✅ Replaced `db.prepare().all()` with `await db.execute()`
5. ✅ Access result with `result.rows`

---

## Example 3: INSERT Statement

### File: `user-repository.ts` - `createUser()`

**BEFORE:**
```typescript
export function createUser(
  userId: string,
  username: string,
  email?: string
): UserProfile {
  const db = getDatabase();
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT INTO users (
      id, username, email, currentLevel, currentXP, totalXP,
      createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    userId,
    username,
    email || null,
    0, // currentLevel
    0, // currentXP
    0, // totalXP
    now,
    now
  );

  console.log(`✅ Created user: ${userId}`);
  return userProfile;
}
```

**AFTER:**
```typescript
export async function createUser(
  userId: string,
  username: string,
  email?: string
): Promise<UserProfile> {
  const db = await getDatabase();
  const now = Date.now();

  await db.execute({
    sql: `
      INSERT INTO users (
        id, username, email, currentLevel, currentXP, totalXP,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      userId,
      username,
      email || null,
      0, // currentLevel
      0, // currentXP
      0, // totalXP
      now,
      now
    ]
  });

  console.log(`✅ Created user: ${userId}`);
  return userProfile;
}
```

**Changes:**
1. ✅ Added `async` keyword
2. ✅ Changed return type to `Promise<UserProfile>`
3. ✅ Added `await` to `getDatabase()`
4. ✅ Replaced `db.prepare().run()` with `await db.execute()`
5. ✅ Moved all parameters into `args` array

---

## Example 4: UPDATE Statement

### File: `user-repository.ts` - `updateUser()`

**BEFORE:**
```typescript
export function updateUser(
  userId: string,
  updates: Partial<UserProfile>
): UserProfile {
  const db = getDatabase();
  const now = Date.now();

  const stmt = db.prepare(`
    UPDATE users
    SET username = ?, email = ?, updatedAt = ?
    WHERE id = ?
  `);

  stmt.run(
    updates.username,
    updates.email || null,
    now,
    userId
  );

  const updated = getUserById(userId);
  return updated!;
}
```

**AFTER:**
```typescript
export async function updateUser(
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  const db = await getDatabase();
  const now = Date.now();

  await db.execute({
    sql: `
      UPDATE users
      SET username = ?, email = ?, updatedAt = ?
      WHERE id = ?
    `,
    args: [
      updates.username,
      updates.email || null,
      now,
      userId
    ]
  });

  const updated = await getUserById(userId);
  return updated!;
}
```

**Changes:**
1. ✅ Added `async` keyword
2. ✅ Changed return type to `Promise<UserProfile>`
3. ✅ Added `await` to `getDatabase()`
4. ✅ Replaced `db.prepare().run()` with `await db.execute()`
5. ✅ Added `await` to `getUserById()` call

---

## Example 5: DELETE Statement

### File: `user-repository.ts` - `deleteUser()`

**BEFORE:**
```typescript
export function deleteUser(userId: string): void {
  const db = getDatabase();

  const stmt = db.prepare(`DELETE FROM users WHERE id = ?`);
  stmt.run(userId);

  console.log(`✅ Deleted user: ${userId}`);
}
```

**AFTER:**
```typescript
export async function deleteUser(userId: string): Promise<void> {
  const db = await getDatabase();

  await db.execute({
    sql: 'DELETE FROM users WHERE id = ?',
    args: [userId]
  });

  console.log(`✅ Deleted user: ${userId}`);
}
```

**Changes:**
1. ✅ Added `async` keyword
2. ✅ Changed return type to `Promise<void>`
3. ✅ Added `await` to `getDatabase()`
4. ✅ Replaced `db.prepare().run()` with `await db.execute()`

---

## Example 6: COUNT Query

### File: `user-repository.ts` - `userExists()`

**BEFORE:**
```typescript
export function userExists(userId: string): boolean {
  const db = getDatabase();

  const stmt = db.prepare(`SELECT COUNT(*) as count FROM users WHERE id = ?`);
  const result = stmt.get(userId) as { count: number };

  return result.count > 0;
}
```

**AFTER:**
```typescript
export async function userExists(userId: string): Promise<boolean> {
  const db = await getDatabase();

  const result = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM users WHERE id = ?',
    args: [userId]
  });

  return (result.rows[0] as { count: number }).count > 0;
}
```

**Changes:**
1. ✅ Added `async` keyword
2. ✅ Changed return type to `Promise<boolean>`
3. ✅ Added `await` to `getDatabase()`
4. ✅ Replaced `db.prepare().get()` with `await db.execute()`
5. ✅ Access count with `result.rows[0]`

---

## Example 7: Transaction (Using transaction helper)

### File: `user-repository.ts` - `awardXPWithTransaction()`

**BEFORE:**
```typescript
export function awardXPWithTransaction(
  userId: string,
  amount: number
): { success: boolean; newTotalXP: number } {
  const db = getDatabase();

  const result = db.transaction(() => {
    const user = getUserById(userId);
    if (!user) throw new Error('User not found');

    const newTotalXP = user.totalXP + amount;
    updateUser(userId, { totalXP: newTotalXP });
    createXPTransaction({ userId, amount });

    return { success: true, newTotalXP };
  })();

  return result;
}
```

**AFTER:**
```typescript
import { transaction } from '../sqlite-db';

export async function awardXPWithTransaction(
  userId: string,
  amount: number
): Promise<{ success: boolean; newTotalXP: number }> {
  const result = await transaction(async (db) => {
    const user = await getUserById(userId);
    if (!user) throw new Error('User not found');

    const newTotalXP = user.totalXP + amount;
    await updateUser(userId, { totalXP: newTotalXP });
    await createXPTransaction({ userId, amount });

    return { success: true, newTotalXP };
  });

  return result;
}
```

**Changes:**
1. ✅ Added `import { transaction }` from sqlite-db
2. ✅ Added `async` keyword
3. ✅ Changed return type to `Promise<{...}>`
4. ✅ Replaced `db.transaction()` with `await transaction()`
5. ✅ Made transaction callback `async`
6. ✅ Added `await` to all function calls inside transaction

---

## Example 8: Transaction (Manual BEGIN/COMMIT)

### File: `user-repository.ts` - Complex transaction

**BEFORE:**
```typescript
export function complexOperation(userId: string): Result {
  const db = getDatabase();

  const result = db.transaction(() => {
    // Step 1: Validate
    const user = getUserById(userId);
    if (!user) throw new Error('User not found');

    // Step 2: Update
    updateUser(userId, { lastActivityAt: new Date() });

    // Step 3: Create record
    createActivityLog(userId, 'login');

    return { success: true };
  })();

  return result;
}
```

**AFTER (Option A: Using transaction helper):**
```typescript
import { transaction } from '../sqlite-db';

export async function complexOperation(userId: string): Promise<Result> {
  const result = await transaction(async (db) => {
    // Step 1: Validate
    const user = await getUserById(userId);
    if (!user) throw new Error('User not found');

    // Step 2: Update
    await updateUser(userId, { lastActivityAt: new Date() });

    // Step 3: Create record
    await createActivityLog(userId, 'login');

    return { success: true };
  });

  return result;
}
```

**AFTER (Option B: Manual BEGIN/COMMIT):**
```typescript
export async function complexOperation(userId: string): Promise<Result> {
  const db = await getDatabase();

  try {
    await db.execute('BEGIN');

    // Step 1: Validate
    const user = await getUserById(userId);
    if (!user) throw new Error('User not found');

    // Step 2: Update
    await updateUser(userId, { lastActivityAt: new Date() });

    // Step 3: Create record
    await createActivityLog(userId, 'login');

    await db.execute('COMMIT');
    return { success: true };
  } catch (error) {
    await db.execute('ROLLBACK');
    throw error;
  }
}
```

**Changes:**
1. ✅ Added `async` keyword
2. ✅ Changed return type to `Promise<Result>`
3. ✅ Replaced `db.transaction()` with `transaction()` helper OR manual BEGIN/COMMIT
4. ✅ Added `await` to all database operations
5. ✅ Added try/catch with ROLLBACK for manual transactions

---

## Example 9: Function Calling Other Repository Functions

### File: `community-repository.ts` - `createPostWithValidation()`

**BEFORE:**
```typescript
export function createPostWithValidation(
  authorId: string,
  content: string
): string {
  // Validate user exists
  const user = getUserById(authorId);
  if (!user) {
    throw new Error('User not found');
  }

  // Create post
  const postId = `post-${Date.now()}`;
  const post = createPost({
    id: postId,
    authorId,
    authorName: user.username,
    content
  });

  return postId;
}
```

**AFTER:**
```typescript
export async function createPostWithValidation(
  authorId: string,
  content: string
): Promise<string> {
  // Validate user exists
  const user = await getUserById(authorId);
  if (!user) {
    throw new Error('User not found');
  }

  // Create post
  const postId = `post-${Date.now()}`;
  const post = await createPost({
    id: postId,
    authorId,
    authorName: user.username,
    content
  });

  return postId;
}
```

**Changes:**
1. ✅ Added `async` keyword
2. ✅ Changed return type to `Promise<string>`
3. ✅ Added `await` to `getUserById()` call
4. ✅ Added `await` to `createPost()` call

---

## Example 10: Batch Operations

### File: `user-repository.ts` - `batchCreateUsers()`

**BEFORE:**
```typescript
export function batchCreateUsers(users: UserProfile[]): number {
  const db = getDatabase();
  let created = 0;

  const insertMany = db.transaction((usersToInsert: UserProfile[]) => {
    const stmt = db.prepare(`
      INSERT INTO users (id, username, email, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const user of usersToInsert) {
      stmt.run(
        user.userId,
        user.username,
        user.email || null,
        user.createdAt.getTime(),
        user.updatedAt.getTime()
      );
      created++;
    }
  });

  insertMany(users);
  return created;
}
```

**AFTER:**
```typescript
import { transaction } from '../sqlite-db';

export async function batchCreateUsers(users: UserProfile[]): Promise<number> {
  let created = 0;

  await transaction(async (db) => {
    for (const user of users) {
      await db.execute({
        sql: `
          INSERT INTO users (id, username, email, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?)
        `,
        args: [
          user.userId,
          user.username,
          user.email || null,
          user.createdAt.getTime(),
          user.updatedAt.getTime()
        ]
      });
      created++;
    }
  });

  return created;
}
```

**Changes:**
1. ✅ Added `import { transaction }`
2. ✅ Added `async` keyword
3. ✅ Changed return type to `Promise<number>`
4. ✅ Replaced `db.transaction()` with `await transaction()`
5. ✅ Made transaction callback `async`
6. ✅ Replaced `stmt.run()` with `await db.execute()` in loop

---

## Common Patterns Summary

| Pattern | Before | After |
|---------|--------|-------|
| Function | `export function fn()` | `export async function fn()` |
| Return Type | `: Type` | `: Promise<Type>` |
| Get DB | `const db = getDatabase()` | `const db = await getDatabase()` |
| SELECT (1) | `stmt.get(args)` | `(await db.execute({...})).rows[0]` |
| SELECT (many) | `stmt.all(args)` | `(await db.execute({...})).rows` |
| INSERT/UPDATE | `stmt.run(args)` | `await db.execute({...})` |
| Transaction | `db.transaction(() => {...})()` | `await transaction(async (db) => {...})` |
| Repo Call | `getUserById(id)` | `await getUserById(id)` |

---

## Migration Checklist for Each Function

When migrating a function, check:

- [ ] Added `async` keyword to function declaration
- [ ] Wrapped return type in `Promise<T>`
- [ ] Added `await` to `getDatabase()` call
- [ ] Converted all `db.prepare().get()` to `await db.execute()` + `result.rows[0]`
- [ ] Converted all `db.prepare().all()` to `await db.execute()` + `result.rows`
- [ ] Converted all `db.prepare().run()` to `await db.execute()`
- [ ] Added `await` to all repository function calls
- [ ] Migrated transactions to use `transaction()` helper or BEGIN/COMMIT
- [ ] Moved all query parameters into `args` array
- [ ] Tested function with async behavior

---

**Ready to migrate?** Use these examples as a reference while running the automated migration script or performing manual migration.
