# Turso Migration Quick Reference Card

**Print this and keep it handy while migrating!**

---

## 📋 Basic Transformation Rules

| Component | Sync (better-sqlite3) | Async (@libsql/client) |
|-----------|----------------------|------------------------|
| **Import** | `import { getDatabase }` | `import { getDatabase, type Client }` |
| **Function** | `export function fn(): T` | `export async function fn(): Promise<T>` |
| **Get DB** | `const db = getDatabase()` | `const db = await getDatabase()` |

---

## 🔍 Query Transformations

### SELECT (Single Row)
```typescript
// BEFORE
const stmt = db.prepare('SELECT * FROM table WHERE id = ?');
const row = stmt.get(id) as Row | undefined;

// AFTER
const result = await db.execute({ sql: 'SELECT * FROM table WHERE id = ?', args: [id] });
const row = result.rows[0] as Row | undefined;
```

### SELECT (Multiple Rows)
```typescript
// BEFORE
const stmt = db.prepare('SELECT * FROM table WHERE userId = ?');
const rows = stmt.all(userId) as Row[];

// AFTER
const result = await db.execute({ sql: 'SELECT * FROM table WHERE userId = ?', args: [userId] });
const rows = result.rows as Row[];
```

### INSERT
```typescript
// BEFORE
const stmt = db.prepare('INSERT INTO table (a, b) VALUES (?, ?)');
stmt.run(val1, val2);

// AFTER
await db.execute({ sql: 'INSERT INTO table (a, b) VALUES (?, ?)', args: [val1, val2] });
```

### UPDATE
```typescript
// BEFORE
const stmt = db.prepare('UPDATE table SET col = ? WHERE id = ?');
stmt.run(value, id);

// AFTER
await db.execute({ sql: 'UPDATE table SET col = ? WHERE id = ?', args: [value, id] });
```

### DELETE
```typescript
// BEFORE
const stmt = db.prepare('DELETE FROM table WHERE id = ?');
stmt.run(id);

// AFTER
await db.execute({ sql: 'DELETE FROM table WHERE id = ?', args: [id] });
```

### COUNT
```typescript
// BEFORE
const stmt = db.prepare('SELECT COUNT(*) as count FROM table WHERE col = ?');
const result = stmt.get(val) as { count: number };
return result.count > 0;

// AFTER
const result = await db.execute({ sql: 'SELECT COUNT(*) as count FROM table WHERE col = ?', args: [val] });
return (result.rows[0] as { count: number }).count > 0;
```

---

## 🔄 Transaction Transformations

### Option 1: Transaction Helper (Recommended)
```typescript
// BEFORE
const result = db.transaction(() => {
  const x = getX();
  updateY(x);
  return x;
})();

// AFTER
import { transaction } from '../sqlite-db';
const result = await transaction(async (db) => {
  const x = await getX();
  await updateY(x);
  return x;
});
```

### Option 2: Manual BEGIN/COMMIT
```typescript
// BEFORE
const result = db.transaction(() => {
  // operations
  return value;
})();

// AFTER
const db = await getDatabase();
try {
  await db.execute('BEGIN');
  // operations (with await)
  await db.execute('COMMIT');
  return value;
} catch (error) {
  await db.execute('ROLLBACK');
  throw error;
}
```

---

## 📞 Function Calls

### Repository Function Calls
```typescript
// BEFORE
const user = getUserById(id);
const posts = getPostsByUser(id);

// AFTER
const user = await getUserById(id);
const posts = await getPostsByUser(id);
```

---

## ✅ Migration Checklist

For each function, verify:

- [ ] `async` keyword added
- [ ] Return type wrapped in `Promise<T>`
- [ ] `await getDatabase()` added
- [ ] All `db.prepare().get()` → `await db.execute()` + `.rows[0]`
- [ ] All `db.prepare().all()` → `await db.execute()` + `.rows`
- [ ] All `db.prepare().run()` → `await db.execute()`
- [ ] All parameters moved to `args` array
- [ ] All repository calls have `await`
- [ ] Transactions use `transaction()` helper

---

## 🚀 Quick Start

1. **Backup file:**
   ```bash
   cp file.ts file.sync-backup.ts
   ```

2. **Run migration script:**
   ```bash
   npx ts-node scripts/migrate-repositories-to-turso.ts
   ```

3. **Verify TypeScript:**
   ```bash
   npm run typecheck
   ```

4. **Run tests:**
   ```bash
   npm test
   ```

---

## 🐛 Common Mistakes

| ❌ Wrong | ✅ Correct |
|---------|-----------|
| `const db = getDatabase()` | `const db = await getDatabase()` |
| `const row = stmt.get(id)` | `const row = (await db.execute(...)).rows[0]` |
| `function fn(): T` | `async function fn(): Promise<T>` |
| `const user = getUserById(id)` | `const user = await getUserById(id)` |
| `stmt.run(a, b, c)` | `await db.execute({ args: [a, b, c] })` |
| `db.transaction(() => {...})()` | `await transaction(async (db) => {...})` |

---

## 📊 Progress Tracking

| File | Functions | Status |
|------|-----------|--------|
| user-repository.ts | 50+ | ⏸️ Pending |
| task-repository.ts | 10+ | ⏸️ Pending |
| progress-repository.ts | 10+ | ⏸️ Pending |
| community-repository.ts | 20+ | ⏸️ Pending |
| comment-repository.ts | 15+ | ⏸️ Pending |
| highlight-repository.ts | 10+ | ⏸️ Pending |
| note-repository.ts | 15+ | ⏸️ Pending |

Mark ✅ when complete!

---

## 🆘 Need Help?

- **Migration Guide**: `/docs/Turso_Repository_Migration_Guide.md`
- **Full Examples**: `/docs/Turso_Migration_Examples.md`
- **Summary**: `/docs/Turso_Repository_Migration_Summary.md`
- **Script**: `/scripts/migrate-repositories-to-turso.ts`

---

**Remember**: Test after EACH file migration, not at the end!
