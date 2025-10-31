Read the "docs\structure_module_infoMD\project_structure.md" first, and please according to the bug provided, and the output to plan the debugging plan.To describe with the traditional chinese (繁體中文)  please just planning for me, and wait for my confrim for the implementation :

## 🔍 Current Issue Status (5W1H)
**What**: [One-sentence description of the bug]  
**When**: [Trigger time + Git commit/PR]  
**Where**: [File path + line number where the error occurs]  
**Expected vs. Actual**:  
  - Expected: [Desired behavior]  
  - Actual: [Current erroneous behavior]  
**Full Stack Trace**:  

## 📋 Context Loading  
@[Primary error file] @[Relevant test files] @[Recently modified files]  
**Recent Changes**: [Relevant commits]  
**Related Issues/PRs**: [Links]

## 🧠 Root Cause Analysis (Think Hard)  
Please use "think harder" mode for deep analysis and explore using the following methods:  
1. **5 Whys Analysis**: Starting from the error message, ask "why" five times consecutively.  
2. **Binary Search**: Identify the last known good commit.  
3. **Dependency Chain Tracing**: List all affected modules/functions.

Provide 3 hypotheses, each including:  
- [ ] **Hypothesis A**: [Description]  
  - Likelihood: [High/Medium/Low]  
  - Scope of Changes: [X files, Y lines of code]  
  - Breaking Risk: [Score 1–5]  
  - Estimated Fix Time: [Completable within ≤30 minutes]  

- [ ] **Hypothesis B**: [Description]  
  - Likelihood: [High/Medium/Low]  
  - Scope of Changes: [X files, Y lines of code]  
  - Breaking Risk: [Score 1–5]  
  - Estimated Fix Time: [Completable within ≤30 minutes]  

- [ ] **Hypothesis C**: [Description]  
  - Likelihood: [High/Medium/Low]  
  - Scope of Changes: [X files, Y lines of code]  
  - Breaking Risk: [Score 1–5]  
  - Estimated Fix Time: [Completable within ≤30 minutes]  

## ✅ Implementation Plan (Recommended Approach)  
**Selected Option**: [A/B/C] **Reason**: [One-sentence justification]

### Execution Steps  
- [ ] **Step 1**: Validate hypothesis – [Specific validation method]  
  - Expected Outcome: [Success criteria]  
  - Fallback Plan: [Plan B if validation fails]  

- [ ] **Step 2**: Modify `[file path]` – [Specific changes]  
  - Impact Scope: [List all dependent files]  

- [ ] **Step 3**: Run tests `[test command]`  
  - Required Passing Tests: [List]  
  - Regression Test Coverage: [%]  

- [ ] **Step 4**: Manual Verification – [Step-by-step instructions]

### Safety Checks  
- [ ] All existing tests pass  
- [ ] No new linter warnings introduced  
- [ ] API remains backward compatible  
- [ ] No performance regression (<5% difference)

