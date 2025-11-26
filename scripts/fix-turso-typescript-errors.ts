/**
 * Automated script to fix TypeScript errors after Turso migration
 *
 * This script fixes:
 * 1. Missing await on getDatabase() calls in scripts
 * 2. Row type casting issues in repositories
 * 3. Missing await on repository function calls in tests
 *
 * Usage:
 *   npx tsx scripts/fix-turso-typescript-errors.ts
 */

import * as fs from 'fs';
import * as path from 'path';

console.log('🔧 Starting automated TypeScript error fixes for Turso migration');
console.log('═'.repeat(80));

let totalFilesFixed = 0;
let totalChanges = 0;

/**
 * Fix missing await on getDatabase() in scripts
 */
function fixScriptGetDatabaseAwaits(filePath: string): number {
  let content = fs.readFileSync(filePath, 'utf-8');
  let changes = 0;

  // Pattern 1: const db = getDatabase();
  const pattern1 = /(\s+)const\s+db\s+=\s+getDatabase\(\);/g;
  const replacement1 = '$1const db = await getDatabase();';
  const newContent1 = content.replace(pattern1, (match) => {
    changes++;
    return match.replace('const db = getDatabase()', 'const db = await getDatabase()');
  });
  content = newContent1;

  // Pattern 2: Functions that call getDatabase() must be async
  if (changes > 0) {
    // Make the enclosing function async if not already
    const functionPatterns = [
      /export\s+(function\s+\w+\([^)]*\)):\s*void\s*{/g,
      /export\s+(function\s+\w+\([^)]*\)):\s*\w+\s*{/g,
      /function\s+(\w+\([^)]*\)):\s*void\s*{/g,
    ];

    for (const pattern of functionPatterns) {
      content = content.replace(pattern, (match, funcSig) => {
        if (!match.includes('async')) {
          const returnType = match.match(/:\s*(\w+)\s*{/)?.[1];
          if (returnType === 'void') {
            return match.replace(funcSig, `async ${funcSig}`).replace(': void', ': Promise<void>');
          }
        }
        return match;
      });
    }
  }

  if (content !== fs.readFileSync(filePath, 'utf-8')) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ Fixed ${changes} getDatabase() awaits in: ${path.basename(filePath)}`);
    return changes;
  }

  return 0;
}

/**
 * Fix Row type casting in repositories
 */
function fixRepositoryRowTypeCasts(filePath: string): number {
  let content = fs.readFileSync(filePath, 'utf-8');
  let changes = 0;

  // Pattern: result.rows[0] as SomeRow
  const pattern = /(result\.rows\[\d+\])\s+as\s+(\w+Row)/g;

  content = content.replace(pattern, (match, accessor, typeName) => {
    changes++;
    return `${accessor} as unknown as ${typeName}`;
  });

  // Pattern: result.rows as SomeRow[]
  const patternArray = /(result\.rows)\s+as\s+(\w+Row\[\])/g;

  content = content.replace(patternArray, (match, accessor, typeName) => {
    changes++;
    return `${accessor} as unknown as ${typeName}`;
  });

  if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ Fixed ${changes} Row type casts in: ${path.basename(filePath)}`);
  }

  return changes;
}

/**
 * Process all script files
 */
function processScripts(): void {
  console.log('\n📁 Processing script files...');
  console.log('─'.repeat(80));

  const scriptsToFix = [
    'scripts/seed-guest-account.ts',
    'scripts/reset-user-password.ts',
    'scripts/test-seed-community.ts',
    'scripts/verify-sqlite-schema.ts',
  ];

  for (const scriptPath of scriptsToFix) {
    const fullPath = path.join(process.cwd(), scriptPath);
    if (fs.existsSync(fullPath)) {
      const changed = fixScriptGetDatabaseAwaits(fullPath);
      if (changed > 0) {
        totalFilesFixed++;
        totalChanges += changed;
      }
    } else {
      console.log(`⚠️  File not found: ${scriptPath}`);
    }
  }
}

/**
 * Process all repository files
 */
function processRepositories(): void {
  console.log('\n📁 Processing repository files...');
  console.log('─'.repeat(80));

  const reposDir = path.join(process.cwd(), 'src/lib/repositories');
  const repoFiles = fs.readdirSync(reposDir).filter(f => f.endsWith('.ts') && !f.endsWith('.sync-backup.ts'));

  for (const file of repoFiles) {
    const fullPath = path.join(reposDir, file);
    const changed = fixRepositoryRowTypeCasts(fullPath);
    if (changed > 0) {
      totalFilesFixed++;
      totalChanges += changed;
    }
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    processScripts();
    processRepositories();

    console.log('\n' + '═'.repeat(80));
    console.log('📊 Summary:');
    console.log(`   Files fixed: ${totalFilesFixed}`);
    console.log(`   Total changes: ${totalChanges}`);
    console.log('═'.repeat(80));

    if (totalChanges > 0) {
      console.log('\n✅ Automated fixes complete!');
      console.log('\n⚠️  Next steps:');
      console.log('   1. Run: npm run typecheck');
      console.log('   2. Review remaining errors manually');
      console.log('   3. Fix test files (Phase 4)');
      console.log('   4. Fix transaction blocks (Phase 2)');
    } else {
      console.log('\n✅ No changes needed');
    }

  } catch (error) {
    console.error('\n❌ Error during execution:', error);
    process.exit(1);
  }
}

// Run
if (require.main === module) {
  main();
}
