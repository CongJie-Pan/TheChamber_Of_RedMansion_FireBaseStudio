#!/usr/bin/env ts-node
/**
 * Automated Repository Migration Script
 *
 * Migrates repository files from better-sqlite3 (sync) to @libsql/client (async)
 *
 * Usage:
 *   npm install -g ts-node
 *   ts-node scripts/migrate-repositories-to-turso.ts
 *
 * Or use npx:
 *   npx ts-node scripts/migrate-repositories-to-turso.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const REPO_FILES = [
  'src/lib/repositories/user-repository.ts',
  'src/lib/repositories/task-repository.ts',
  'src/lib/repositories/progress-repository.ts',
  'src/lib/repositories/community-repository.ts',
  'src/lib/repositories/comment-repository.ts',
  'src/lib/repositories/highlight-repository.ts',
  'src/lib/repositories/note-repository.ts',
];

interface MigrationStats {
  file: string;
  functionsConverted: number;
  queriesConverted: number;
  transactionsConverted: number;
}

function backupFile(filePath: string): string {
  const backupPath = filePath.replace('.ts', '.sync-backup.ts');
  fs.copyFileSync(filePath, backupPath);
  console.log(`✅ Backed up: ${filePath} → ${backupPath}`);
  return backupPath;
}

function migrateImports(content: string): string {
  // Update imports to include Client type
  content = content.replace(
    /import { getDatabase(.*?) } from '..\/sqlite-db';/g,
    "import { getDatabase, type Client$1 } from '../sqlite-db';"
  );

  // Add transaction helper if transactions are used
  if (content.includes('db.transaction(')) {
    content = content.replace(
      /import { getDatabase, type Client } from '..\/sqlite-db';/,
      "import { getDatabase, type Client, transaction } from '../sqlite-db';"
    );
  }

  return content;
}

function migrateFunctionSignatures(content: string): { content: string; count: number } {
  let count = 0;

  // Pattern 1: export function name(...): ReturnType {
  content = content.replace(
    /export function (\w+)\(([\s\S]*?)\): ([^{]+)\{/g,
    (match, funcName, params, returnType) => {
      count++;
      const trimmedReturn = returnType.trim();

      // Skip if already async
      if (match.includes('async')) {
        count--;
        return match;
      }

      // Handle void return
      if (trimmedReturn === 'void') {
        return `export async function ${funcName}(${params}): Promise<void> {`;
      }

      // Wrap return type in Promise
      return `export async function ${funcName}(${params}): Promise<${trimmedReturn}> {`;
    }
  );

  return { content, count };
}

function migrateGetDatabase(content: string): string {
  // Convert: const db = getDatabase();
  // To: const db = await getDatabase();
  content = content.replace(
    /const db = getDatabase\(\);/g,
    'const db = await getDatabase();'
  );

  return content;
}

function migrateSelectSingleRow(content: string): { content: string; count: number } {
  let count = 0;

  // Pattern: db.prepare('...').get(...) with multiline support
  content = content.replace(
    /const stmt = db\.prepare\((`[^`]+`|'[^']+'|"[^"]+")\);[\s]*const (\w+) = stmt\.get\((.*?)\) as (.*?);/g,
    (match, query, varName, args, type) => {
      count++;
      const cleanQuery = query.slice(1, -1); // Remove quotes
      const argsList = args.trim() ? `[${args}]` : '[]';

      return `const result = await db.execute({\n    sql: \`${cleanQuery}\`,\n    args: ${argsList}\n  });\n  const ${varName} = result.rows[0] as ${type};`;
    }
  );

  return { content, count };
}

function migrateSelectMultipleRows(content: string): { content: string; count: number } {
  let count = 0;

  // Pattern: db.prepare('...').all(...) with multiline support
  content = content.replace(
    /const stmt = db\.prepare\((`[^`]+`|'[^']+'|"[^"]+")\);[\s]*const (\w+) = stmt\.all\((.*?)\) as (.*?);/g,
    (match, query, varName, args, type) => {
      count++;
      const cleanQuery = query.slice(1, -1); // Remove quotes
      const argsList = args.trim() ? `[${args}]` : '[]';

      return `const result = await db.execute({\n    sql: \`${cleanQuery}\`,\n    args: ${argsList}\n  });\n  const ${varName} = result.rows as ${type};`;
    }
  );

  return { content, count };
}

function migrateInsertUpdateDelete(content: string): { content: string; count: number } {
  let count = 0;

  // Pattern: db.prepare('...').run(...)
  content = content.replace(
    /const stmt = db\.prepare\((`[^`]+`|'[^']+'|"[^"]+")\);[\s]*stmt\.run\((.*?)\);/gs,
    (match, query, args) => {
      count++;
      const cleanQuery = query.slice(1, -1); // Remove quotes
      const argsList = args.trim() ? `[${args}]` : '[]';

      return `await db.execute({\n    sql: \`${cleanQuery}\`,\n    args: ${argsList}\n  });`;
    }
  );

  return { content, count };
}

function migrateTransactions(content: string): { content: string; count: number } {
  let count = 0;

  // Pattern: db.transaction(() => { ... })()
  // This is complex and may need manual adjustment
  content = content.replace(
    /const result = db\.transaction\(\(\) => \{([\s\S]*?)\}\)\(\);/g,
    (match, body) => {
      count++;
      return `const result = await transaction(async (db) => {${body}});`;
    }
  );

  return { content, count };
}

function migrateRepositoryCalls(content: string): string {
  // Add await to calls to repository functions
  // This is a heuristic approach - may need manual review

  const repoFunctions = [
    'getUserById', 'createUser', 'updateUser', 'deleteUser', 'getUserByEmail',
    'getTaskById', 'createTask', 'updateTask', 'deleteTask',
    'getProgress', 'createProgress', 'updateProgress',
    'getPostById', 'createPost', 'updatePost', 'deletePost',
    'getCommentById', 'createComment', 'deleteComment',
    'getHighlightById', 'createHighlight', 'deleteHighlight',
    'getNoteById', 'createNote', 'updateNote', 'deleteNote',
  ];

  repoFunctions.forEach(funcName => {
    // Pattern: const x = funcName(...)
    const pattern = new RegExp(`const (\\w+) = ${funcName}\\(`, 'g');
    content = content.replace(pattern, `const $1 = await ${funcName}(`);

    // Pattern: if (funcName(...))
    const ifPattern = new RegExp(`if \\(${funcName}\\(`, 'g');
    content = content.replace(ifPattern, `if (await ${funcName}(`);

    // Pattern: return funcName(...)
    const returnPattern = new RegExp(`return ${funcName}\\(`, 'g');
    content = content.replace(returnPattern, `return await ${funcName}(`);
  });

  return content;
}

function migrateFile(filePath: string): MigrationStats {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔄 Migrating: ${filePath}`);
  console.log('='.repeat(80));

  let content = fs.readFileSync(filePath, 'utf-8');
  const stats: MigrationStats = {
    file: path.basename(filePath),
    functionsConverted: 0,
    queriesConverted: 0,
    transactionsConverted: 0,
  };

  // Step 1: Migrate imports
  console.log('📦 Step 1: Updating imports...');
  content = migrateImports(content);

  // Step 2: Migrate function signatures
  console.log('🔧 Step 2: Converting function signatures to async...');
  const funcResult = migrateFunctionSignatures(content);
  content = funcResult.content;
  stats.functionsConverted = funcResult.count;
  console.log(`   ✅ Converted ${stats.functionsConverted} functions to async`);

  // Step 3: Migrate getDatabase calls
  console.log('🗄️  Step 3: Adding await to getDatabase() calls...');
  content = migrateGetDatabase(content);

  // Step 4: Migrate SELECT queries (single row)
  console.log('🔍 Step 4: Converting SELECT queries (single row)...');
  const selectSingleResult = migrateSelectSingleRow(content);
  content = selectSingleResult.content;
  console.log(`   ✅ Converted ${selectSingleResult.count} single-row queries`);
  stats.queriesConverted += selectSingleResult.count;

  // Step 5: Migrate SELECT queries (multiple rows)
  console.log('🔍 Step 5: Converting SELECT queries (multiple rows)...');
  const selectMultiResult = migrateSelectMultipleRows(content);
  content = selectMultiResult.content;
  console.log(`   ✅ Converted ${selectMultiResult.count} multi-row queries`);
  stats.queriesConverted += selectMultiResult.count;

  // Step 6: Migrate INSERT/UPDATE/DELETE queries
  console.log('✏️  Step 6: Converting INSERT/UPDATE/DELETE queries...');
  const iudResult = migrateInsertUpdateDelete(content);
  content = iudResult.content;
  console.log(`   ✅ Converted ${iudResult.count} write queries`);
  stats.queriesConverted += iudResult.count;

  // Step 7: Migrate transactions
  console.log('🔄 Step 7: Converting transactions...');
  const txResult = migrateTransactions(content);
  content = txResult.content;
  stats.transactionsConverted = txResult.count;
  console.log(`   ✅ Converted ${stats.transactionsConverted} transactions`);

  // Step 8: Add await to repository function calls
  console.log('⏳ Step 8: Adding await to repository function calls...');
  content = migrateRepositoryCalls(content);

  // Write migrated file
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ Migration complete: ${filePath}`);

  return stats;
}

function main() {
  console.log('🚀 Starting Repository Migration to Turso');
  console.log('='.repeat(80));

  const allStats: MigrationStats[] = [];

  REPO_FILES.forEach(file => {
    const fullPath = path.join(process.cwd(), file);

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ File not found: ${fullPath}`);
      return;
    }

    // Backup file
    backupFile(fullPath);

    // Migrate file
    const stats = migrateFile(fullPath);
    allStats.push(stats);
  });

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(80));

  allStats.forEach(stats => {
    console.log(`\n📁 ${stats.file}:`);
    console.log(`   Functions: ${stats.functionsConverted}`);
    console.log(`   Queries: ${stats.queriesConverted}`);
    console.log(`   Transactions: ${stats.transactionsConverted}`);
  });

  const totals = allStats.reduce((acc, stats) => ({
    functionsConverted: acc.functionsConverted + stats.functionsConverted,
    queriesConverted: acc.queriesConverted + stats.queriesConverted,
    transactionsConverted: acc.transactionsConverted + stats.transactionsConverted,
  }), { functionsConverted: 0, queriesConverted: 0, transactionsConverted: 0 });

  console.log('\n' + '='.repeat(80));
  console.log('TOTALS:');
  console.log(`   Functions: ${totals.functionsConverted}`);
  console.log(`   Queries: ${totals.queriesConverted}`);
  console.log(`   Transactions: ${totals.transactionsConverted}`);
  console.log('='.repeat(80));

  console.log('\n✅ Migration complete!');
  console.log('\n⚠️  IMPORTANT: Please review the migrated files manually and run tests!');
  console.log('⚠️  Backups created with .sync-backup.ts extension');
}

main();
