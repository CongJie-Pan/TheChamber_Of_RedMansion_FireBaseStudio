const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = 'lintAndTypeError_Check';
const LINT_REPORT = path.join(OUTPUT_DIR, 'lint-report.txt');
const TYPECHECK_REPORT = path.join(OUTPUT_DIR, 'typecheck-report.txt');

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`✅ Created directory: ${OUTPUT_DIR}`);
}

const mode = process.argv[2] || 'all';

function runCommand(command, outputFile, label) {
  console.log(`\n🔍 Running ${label}...`);

  // Delete old report file to ensure fresh results
  if (fs.existsSync(outputFile)) {
    fs.unlinkSync(outputFile);
    console.log(`🗑️  Cleared old report: ${outputFile}`);
  }

  try {
    const output = execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: process.cwd()
    });

    // Write output to file
    fs.writeFileSync(outputFile, output);
    const stats = fs.statSync(outputFile);
    const timestamp = new Date(stats.mtime).toLocaleTimeString();

    console.log(`✅ ${label} completed - Report saved to: ${outputFile}`);
    console.log(`   📄 File size: ${stats.size} bytes | Updated: ${timestamp}`);

    return true;
  } catch (error) {
    // Commands may exit with error code if there are lint/type errors
    // We still want to capture the output
    const output = error.stdout || error.stderr || error.message;

    // Write output to file
    fs.writeFileSync(outputFile, output);
    const stats = fs.statSync(outputFile);
    const timestamp = new Date(stats.mtime).toLocaleTimeString();

    console.log(`⚠️  ${label} found issues - Report saved to: ${outputFile}`);
    console.log(`   📄 File size: ${stats.size} bytes | Updated: ${timestamp}`);

    // Show preview of output (first 3 lines)
    const lines = output.split('\n').filter(line => line.trim()).slice(0, 3);
    if (lines.length > 0) {
      console.log(`   📝 Preview: ${lines[0].substring(0, 80)}${lines[0].length > 80 ? '...' : ''}`);
    }

    return false;
  }
}

console.log('📊 Generating Error Reports...\n');
console.log(`Output directory: ${path.resolve(OUTPUT_DIR)}\n`);

let success = true;

if (mode === 'lint' || mode === 'all') {
  // Use ESLint directly with flat config (ESLint v9+)
  // --no-cache ensures fresh results every time
  success = runCommand('npx eslint . --no-cache --max-warnings 0', LINT_REPORT, 'ESLint') && success;
}

if (mode === 'typecheck' || mode === 'all') {
  success = runCommand('npx tsc --noEmit --pretty false', TYPECHECK_REPORT, 'TypeScript Check') && success;
}

console.log('\n' + '='.repeat(60));
if (success) {
  console.log('✅ All checks passed! Reports generated in:');
} else {
  console.log('⚠️  Issues found! Reports generated in:');
}
console.log(`   ${path.resolve(OUTPUT_DIR)}`);
console.log('='.repeat(60) + '\n');

process.exit(0); // Always exit with 0 so npm doesn't show error
