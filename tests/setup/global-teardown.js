/**
 * @fileOverview Global Test Teardown
 * 
 * This file runs once after all tests complete. It cleans up the testing environment,
 * generates final reports, and provides summary information about the test run.
 * 
 * Key responsibilities:
 * - Generate test run summary
 * - Clean up temporary files
 * - Archive test results
 * - Create final reports
 */

const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🧹 Running global test teardown...');

  if (global.__TEST_CONFIG__) {
    const { outputDir, timestamp, startTime } = global.__TEST_CONFIG__;
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Create test run summary
    const summary = {
      testRunId: timestamp,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      duration: `${Math.round(duration / 1000)}s`,
      outputDirectory: outputDir,
    };

    // Write summary to file
    const summaryPath = path.join(outputDir, 'test-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    // Generate final consolidated report
    const consolidatedReport = {
      metadata: {
        testRunId: timestamp,
        startTime: summary.startTime,
        endTime: summary.endTime,
        duration: summary.duration,
        outputDirectory: outputDir,
      },
      files: {},
    };

    // Recursively find all JSON files in output directory
    const findJsonFiles = (dir, fileList = []) => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          findJsonFiles(filePath, fileList);
        } else if (file.endsWith('.json')) {
          fileList.push(filePath);
        }
      });
      return fileList;
    };

    const jsonFiles = findJsonFiles(outputDir);
    jsonFiles.forEach(filePath => {
      const relativePath = path.relative(outputDir, filePath);
      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        consolidatedReport.files[relativePath] = content;
      } catch (e) {
        // Skip files that can't be parsed
      }
    });

    // Write consolidated report
    const consolidatedPath = path.join(outputDir, 'consolidated-report.json');
    fs.writeFileSync(consolidatedPath, JSON.stringify(consolidatedReport, null, 2));

    console.log(`📊 Test run completed in ${summary.duration}`);
    console.log(`📁 Results saved to: ${outputDir}`);
    console.log(`📄 Consolidated report: ${consolidatedPath}`);

    // List generated files
    const files = fs.readdirSync(outputDir);
    console.log('📋 Generated files:');
    files.forEach(file => {
      const filePath = path.join(outputDir, file);
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        console.log(`   - ${file}`);
      } else if (stat.isDirectory()) {
        console.log(`   - ${file}/ (directory)`);
      }
    });
  }

  console.log('✅ Global test teardown complete');
}; 