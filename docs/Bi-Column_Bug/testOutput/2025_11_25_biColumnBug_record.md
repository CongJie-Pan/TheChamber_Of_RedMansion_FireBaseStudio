 FAIL  tests/read-book/bi-column-basic.test.tsx
  ● Test suite failed to run
                                                                                                                                                                         
    Cannot find module 'firebase/firestore' from 'tests/read-book/bi-column-basic.test.tsx'                                                                              
                                                                                                                                                                         
      56 |                                                                                                                                                               
      57 | // Mock Firestore                                                                                                                                             
    > 58 | jest.mock('firebase/firestore', () => ({                                                                                                                      
         |      ^                                                                                                                                                        
      59 |   doc: jest.fn(),                                                                                                                                             
      60 |   getDoc: jest.fn(),
      61 |   collection: jest.fn(),

      at Resolver._throwModNotFoundError (node_modules/jest-resolve/build/resolver.js:427:11)
      at Object.<anonymous> (tests/read-book/bi-column-basic.test.tsx:58:6)

(node:8624) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)                                                                                               
 FAIL  tests/read-book/bi-column-responsive.test.tsx                                                                                                                     
  ● Test suite failed to run
                                                                                                                                                                         
    Cannot find module 'firebase/firestore' from 'tests/read-book/bi-column-responsive.test.tsx'                                                                         
                                                                                                                                                                         
      57 |                                                                                                                                                               
      58 | // Mock Firestore                                                                                                                                             
    > 59 | jest.mock('firebase/firestore', () => ({                                                                                                                      
         |      ^                                                                                                                                                        
      60 |   doc: jest.fn(),                                                                                                                                             
      61 |   getDoc: jest.fn(),
      62 |   collection: jest.fn(),

      at Resolver._throwModNotFoundError (node_modules/jest-resolve/build/resolver.js:427:11)
      at Object.<anonymous> (tests/read-book/bi-column-responsive.test.tsx:59:6)

(node:8548) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)                                                                                               
 FAIL  tests/read-book/bi-column-edge-cases.test.tsx                                                                                                                     
  ● Test suite failed to run
                                                                                                                                                                         
    Cannot find module 'firebase/firestore' from 'tests/read-book/bi-column-edge-cases.test.tsx'                                                                         
                                                                                                                                                                         
      56 |                                                                                                                                                               
      57 | // Mock Firestore                                                                                                                                             
    > 58 | jest.mock('firebase/firestore', () => ({                                                                                                                      
         |      ^                                                                                                                                                        
      59 |   doc: jest.fn(),                                                                                                                                             
      60 |   getDoc: jest.fn(),
      61 |   collection: jest.fn(),

      at Resolver._throwModNotFoundError (node_modules/jest-resolve/build/resolver.js:427:11)
      at Object.<anonymous> (tests/read-book/bi-column-edge-cases.test.tsx:58:6)

(node:11968) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)                                                                                               
 FAIL  tests/read-book/bi-column-navigation.test.tsx                                                                                                                     
  ● Test suite failed to run

    Cannot find module 'firebase/firestore' from 'tests/read-book/bi-column-navigation.test.tsx'

      56 |
      57 | // Mock Firestore
    > 58 | jest.mock('firebase/firestore', () => ({
         |      ^
      59 |   doc: jest.fn(),
      60 |   getDoc: jest.fn(),
      61 |   collection: jest.fn(),

      at Resolver._throwModNotFoundError (node_modules/jest-resolve/build/resolver.js:427:11)
      at Object.<anonymous> (tests/read-book/bi-column-navigation.test.tsx:58:6)

(node:15052) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)

📊 Test results saved to: D:\AboutUniversity\114 NSTC_and_SeniorProject\2025-IM-senior-project\TheChamber_Of_RedMansion_FireBaseStudio\test-output\test-run-2025-11-24_23-36-43-153Z\test-results.json
📋 Test summary saved to: D:\AboutUniversity\114 NSTC_and_SeniorProject\2025-IM-senior-project\TheChamber_Of_RedMansion_FireBaseStudio\test-output\test-run-2025-11-24_23-36-43-153Z\test-execution-summary.json
Test Suites: 4 failed, 4 total
Tests:       0 total
Snapshots:   0 total
Time:        24.189 s
Ran all test suites matching /tests\\read-book\\bi-column/i.
🧹 Running global test teardown...
📊 Test run completed in 24s
📁 Results saved to: D:\AboutUniversity\114 NSTC_and_SeniorProject\2025-IM-senior-project\TheChamber_Of_RedMansion_FireBaseStudio\test-output\test-run-2025-11-24_23-36-43-153Z
📄 Consolidated report: D:\AboutUniversity\114 NSTC_and_SeniorProject\2025-IM-senior-project\TheChamber_Of_RedMansion_FireBaseStudio\test-output\test-run-2025-11-24_23-36-43-153Z\consolidated-report.json
📋 Generated files:
   - auth-tests/ (directory)
   - community-page/ (directory)
   - community-service/ (directory)
   - consolidated-report.json
   - coverage-reports/ (directory)
   - error-logs/ (directory)
   - test-execution-summary.json
   - test-metadata.json
   - test-results.json
   - test-summary.json
✅ Global test teardown complete