#!/bin/bash

###############################################################################
# Daily Task Bug Fixes - Test Execution Script
#
# This script provides various options to test the 4 bug fixes in the
# daily task system (每日修身).
#
# Usage:
#   ./scripts/test-daily-task-fixes.sh [option]
#
# Options:
#   all         - Run all daily task bug fix tests
#   bug1        - Test Bug #1: TaskResultModal overflow
#   bug2        - Test Bug #2: Attribute names standardization
#   bug3        - Test Bug #3: TaskModal content display
#   bug4        - Test Bug #4: Guest user reset functionality
#   components  - Test all component tests (Bug #1, #3)
#   services    - Test all service tests (Bug #2, #4)
#   quick       - Run quick validation (one test per bug)
#
# Examples:
#   ./scripts/test-daily-task-fixes.sh all
#   ./scripts/test-daily-task-fixes.sh bug1
#   ./scripts/test-daily-task-fixes.sh quick
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test timeout in milliseconds
TIMEOUT=90000

# Function to print colored output
print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to run a test with proper error handling
run_test() {
    local test_name="$1"
    local test_command="$2"

    print_header "Running: $test_name"

    if eval "$test_command"; then
        print_success "$test_name passed"
        return 0
    else
        print_error "$test_name failed"
        return 1
    fi
}

# Function to clear Jest cache
clear_cache() {
    print_info "Clearing Jest cache..."
    npm test -- --clearCache 2>/dev/null || true
    print_success "Cache cleared"
}

# Test Bug #1: TaskResultModal overflow
test_bug1() {
    run_test "Bug #1: TaskResultModal Overflow" \
        "npm test -- tests/components/daily-tasks/TaskResultModal.test.tsx --maxWorkers=1 --testTimeout=$TIMEOUT"
}

# Test Bug #2: Attribute names
test_bug2() {
    run_test "Bug #2: Attribute Names Standardization" \
        "npm test -- tests/lib/task-generator.test.ts --testNamePattern='Bug Fix #2' --maxWorkers=1 --testTimeout=$TIMEOUT"
}

# Test Bug #3: TaskModal content
test_bug3() {
    run_test "Bug #3: TaskModal Content Display" \
        "npm test -- tests/components/daily-tasks/TaskModal.test.tsx --maxWorkers=1 --testTimeout=$TIMEOUT"
}

# Test Bug #4: Guest reset
test_bug4() {
    run_test "Bug #4: Guest User Reset" \
        "npm test -- tests/lib/daily-task-service.test.ts --testNamePattern='Bug Fix #4' --maxWorkers=1 --testTimeout=$TIMEOUT"
}

# Test all components
test_components() {
    print_header "Testing All Component Fixes (Bug #1, #3)"
    test_bug1
    test_bug3
}

# Test all services
test_services() {
    print_header "Testing All Service Fixes (Bug #2, #4)"
    test_bug2
    test_bug4
}

# Quick validation - one key test per bug
test_quick() {
    print_header "Quick Validation - Key Tests Only"

    print_info "Testing Bug #1 - Modal overflow constraint..."
    npm test -- tests/components/daily-tasks/TaskResultModal.test.tsx \
        -t "should render modal with max-height constraint" \
        --maxWorkers=1 --testTimeout=$TIMEOUT || true

    print_info "Testing Bug #2 - Attribute name standardization..."
    npm test -- tests/lib/task-generator.test.ts \
        -t "should use standardized attribute names" \
        --maxWorkers=1 --testTimeout=$TIMEOUT || true

    print_info "Testing Bug #3 - Character name display..."
    npm test -- tests/components/daily-tasks/TaskModal.test.tsx \
        -t "should display character name correctly" \
        --maxWorkers=1 --testTimeout=$TIMEOUT || true

    print_info "Testing Bug #4 - Delete today progress..."
    npm test -- tests/lib/daily-task-service.test.ts \
        -t "should delete todays progress" \
        --maxWorkers=1 --testTimeout=$TIMEOUT || true
}

# Test all bug fixes
test_all() {
    print_header "Testing All Daily Task Bug Fixes"

    local failed=0

    test_bug1 || ((failed++))
    test_bug2 || ((failed++))
    test_bug3 || ((failed++))
    test_bug4 || ((failed++))

    echo ""
    if [ $failed -eq 0 ]; then
        print_success "All tests passed! 🎉"
        return 0
    else
        print_error "$failed test suite(s) failed"
        return 1
    fi
}

# Show usage
show_usage() {
    cat << EOF
Daily Task Bug Fixes - Test Execution Script

Usage: $0 [option]

Options:
  all         - Run all daily task bug fix tests
  bug1        - Test Bug #1: TaskResultModal overflow
  bug2        - Test Bug #2: Attribute names standardization
  bug3        - Test Bug #3: TaskModal content display
  bug4        - Test Bug #4: Guest user reset functionality
  components  - Test all component tests (Bug #1, #3)
  services    - Test all service tests (Bug #2, #4)
  quick       - Run quick validation (one test per bug)
  clear-cache - Clear Jest cache and exit
  help        - Show this help message

Examples:
  $0 all          # Run all tests
  $0 bug1         # Test only Bug #1
  $0 quick        # Quick validation
  $0 clear-cache  # Clear cache before running tests

For detailed testing guide, see:
  docs/testing/DAILY_TASK_BUG_FIXES_TEST_GUIDE.md

EOF
}

# Main script logic
main() {
    local option="${1:-help}"

    print_header "Daily Task Bug Fixes - Test Runner"
    print_info "Option: $option"
    print_info "Timeout: ${TIMEOUT}ms"
    echo ""

    case "$option" in
        all)
            clear_cache
            test_all
            ;;
        bug1)
            clear_cache
            test_bug1
            ;;
        bug2)
            clear_cache
            test_bug2
            ;;
        bug3)
            clear_cache
            test_bug3
            ;;
        bug4)
            clear_cache
            test_bug4
            ;;
        components)
            clear_cache
            test_components
            ;;
        services)
            clear_cache
            test_services
            ;;
        quick)
            clear_cache
            test_quick
            ;;
        clear-cache)
            clear_cache
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            print_error "Unknown option: $option"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
