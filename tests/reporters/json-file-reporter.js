/**
 * @fileOverview Custom Jest Reporter for JSON Test Results
 *
 * This reporter generates comprehensive JSON reports of test results including:
 * - Test suite summaries
 * - Individual test results
 * - Test failures and errors
 * - Code coverage information
 * - Execution timing data
 */

const fs = require('fs');
const path = require('path');

class JsonFileReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options || {};
  }

  onRunComplete(contexts, results) {
    const outputDir = global.__TEST_CONFIG__?.outputDir || 'test-output/current-run';

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate comprehensive test results JSON
    const testResults = {
      success: results.numFailedTests === 0,
      startTime: results.startTime,
      numTotalTestSuites: results.numTotalTestSuites,
      numPassedTestSuites: results.numPassedTestSuites,
      numFailedTestSuites: results.numFailedTestSuites,
      numPendingTestSuites: results.numPendingTestSuites,
      numTotalTests: results.numTotalTests,
      numPassedTests: results.numPassedTests,
      numFailedTests: results.numFailedTests,
      numPendingTests: results.numPendingTests,
      numTodoTests: results.numTodoTests,
      testResults: [],
    };

    // Process each test suite
    results.testResults.forEach(testResult => {
      const suite = {
        name: path.relative(process.cwd(), testResult.testFilePath),
        status: testResult.numFailingTests === 0 ? 'passed' : 'failed',
        startTime: testResult.perfStats.start,
        endTime: testResult.perfStats.end,
        duration: testResult.perfStats.runtime,
        tests: [],
      };

      // Process individual tests
      testResult.testResults.forEach(test => {
        const testCase = {
          title: test.title,
          fullName: test.fullName,
          status: test.status,
          duration: test.duration,
        };

        // Include failure details if test failed
        if (test.status === 'failed') {
          testCase.failureMessages = test.failureMessages;
          testCase.failureDetails = test.failureDetails;
        }

        suite.tests.push(testCase);
      });

      testResults.testResults.push(suite);
    });

    // Add coverage summary if available
    if (results.coverageMap) {
      const coverageSummary = results.coverageMap.getCoverageSummary();
      testResults.coverage = {
        lines: coverageSummary.lines,
        statements: coverageSummary.statements,
        functions: coverageSummary.functions,
        branches: coverageSummary.branches,
      };
    }

    // Write main test results file
    const resultsPath = path.join(outputDir, 'test-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));

    // Write summary file
    const summaryPath = path.join(outputDir, 'test-execution-summary.json');
    const summary = {
      totalTests: results.numTotalTests,
      passedTests: results.numPassedTests,
      failedTests: results.numFailedTests,
      pendingTests: results.numPendingTests,
      totalSuites: results.numTotalTestSuites,
      passedSuites: results.numPassedTestSuites,
      failedSuites: results.numFailedTestSuites,
      success: results.numFailedTests === 0,
      timestamp: new Date().toISOString(),
    };
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    console.log(`\n📊 Test results saved to: ${resultsPath}`);
    console.log(`📋 Test summary saved to: ${summaryPath}`);
  }
}

module.exports = JsonFileReporter;
