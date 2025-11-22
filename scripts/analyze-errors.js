const fs = require('fs');
const path = require('path');

const TYPECHECK_REPORT = 'lintAndTypeError_Check/typecheck-report.txt';
const SUMMARY_OUTPUT = 'lintAndTypeError_Check/error-summary.txt';

console.log('📊 Analyzing TypeScript errors...\n');

if (!fs.existsSync(TYPECHECK_REPORT)) {
  console.error('❌ Error report not found. Please run: npm run check:report');
  process.exit(1);
}

const content = fs.readFileSync(TYPECHECK_REPORT, 'utf8');
const lines = content.split('\n');

// Parse TypeScript errors
const errors = [];
const errorPattern = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/;

for (const line of lines) {
  const match = line.match(errorPattern);
  if (match) {
    errors.push({
      file: match[1],
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      code: match[4],
      message: match[5]
    });
  }
}

// Group errors by error code
const errorsByCode = {};
const errorsByFile = {};

errors.forEach(error => {
  // By code
  if (!errorsByCode[error.code]) {
    errorsByCode[error.code] = {
      count: 0,
      message: error.message,
      examples: []
    };
  }
  errorsByCode[error.code].count++;
  if (errorsByCode[error.code].examples.length < 3) {
    errorsByCode[error.code].examples.push({
      file: error.file,
      line: error.line
    });
  }

  // By file
  if (!errorsByFile[error.file]) {
    errorsByFile[error.file] = [];
  }
  errorsByFile[error.file].push(error);
});

// Generate summary
let summary = '';
summary += '='.repeat(80) + '\n';
summary += '📊 TYPESCRIPT ERROR SUMMARY\n';
summary += '='.repeat(80) + '\n\n';

summary += `Total Errors: ${errors.length}\n`;
summary += `Unique Error Codes: ${Object.keys(errorsByCode).length}\n`;
summary += `Files Affected: ${Object.keys(errorsByFile).length}\n\n`;

summary += '='.repeat(80) + '\n';
summary += '🔢 ERRORS BY TYPE (Top 20)\n';
summary += '='.repeat(80) + '\n\n';

const sortedCodes = Object.entries(errorsByCode)
  .sort((a, b) => b[1].count - a[1].count)
  .slice(0, 20);

sortedCodes.forEach(([code, data]) => {
  summary += `${code} (${data.count} occurrences)\n`;
  summary += `  Message: ${data.message}\n`;
  summary += `  Examples:\n`;
  data.examples.forEach(ex => {
    summary += `    - ${ex.file}:${ex.line}\n`;
  });
  summary += '\n';
});

summary += '='.repeat(80) + '\n';
summary += '📁 FILES WITH MOST ERRORS (Top 20)\n';
summary += '='.repeat(80) + '\n\n';

const sortedFiles = Object.entries(errorsByFile)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 20);

sortedFiles.forEach(([file, fileErrors]) => {
  summary += `${file} (${fileErrors.length} errors)\n`;
  const errorCounts = {};
  fileErrors.forEach(err => {
    errorCounts[err.code] = (errorCounts[err.code] || 0) + 1;
  });
  Object.entries(errorCounts).forEach(([code, count]) => {
    summary += `  - ${code}: ${count}\n`;
  });
  summary += '\n';
});

summary += '='.repeat(80) + '\n';
summary += '🎯 RECOMMENDED FIXES\n';
summary += '='.repeat(80) + '\n\n';

// Provide recommendations based on common errors
const recommendations = [];

if (errorsByCode['TS2307']) {
  recommendations.push(`TS2307 (Module not found): Check import paths and ensure all dependencies are installed.`);
}
if (errorsByCode['TS2345']) {
  recommendations.push(`TS2345 (Type mismatch): Review function arguments and ensure types match.`);
}
if (errorsByCode['TS2339']) {
  recommendations.push(`TS2339 (Property does not exist): Verify object types and interfaces.`);
}
if (errorsByCode['TS7006']) {
  recommendations.push(`TS7006 (Implicit any): Add type annotations or enable stricter type checking.`);
}
if (errorsByCode['TS2304']) {
  recommendations.push(`TS2304 (Cannot find name): Check for typos or missing type definitions.`);
}

if (recommendations.length === 0) {
  recommendations.push('No specific recommendations. Review individual errors above.');
}

recommendations.forEach((rec, i) => {
  summary += `${i + 1}. ${rec}\n`;
});

summary += '\n' + '='.repeat(80) + '\n';

// Write summary
fs.writeFileSync(SUMMARY_OUTPUT, summary);

console.log(summary);
console.log(`\n✅ Summary saved to: ${path.resolve(SUMMARY_OUTPUT)}`);
console.log(`\n💡 Next steps:`);
console.log(`   1. Review the summary above`);
console.log(`   2. Share the summary file with Claude Code`);
console.log(`   3. Let Claude Code fix the errors systematically\n`);
