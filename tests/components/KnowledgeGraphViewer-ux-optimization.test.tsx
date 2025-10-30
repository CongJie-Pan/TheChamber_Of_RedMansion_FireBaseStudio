/**
 * @fileOverview Unit Tests for KnowledgeGraphViewer UX Optimizations (2025-10-30)
 *
 * These tests verify the recent UX improvements made on 2025-10-30:
 * - Initial zoom level changed from 1x to 0.5x for better overview
 * - Relationship label font size increased from 14px to 18px for readability
 * - Reset function returns to 0.5x (not 1x) to match initial state
 *
 * Test Philosophy (Google's Best Practices):
 * - Test behaviors visible to users, not internal implementation
 * - Use public APIs and user interactions
 * - Each test is self-contained with clear assertions
 * - Descriptive test names explain the expected behavior
 * - No complex logic in tests (no loops, conditionals)
 *
 * Context: These tests were added after user feedback that:
 * 1. "圖譜頁面剛打開時 顯得放得太大了" (Graph too large on initial load)
 * 2. "關係的字可以再大一些" (Relationship text should be larger)
 *
 * @phase Phase 1 - Critical UI Tests
 * @date 2025-10-30
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock D3.js to capture method calls
let mockZoomScale: number | null = null;
let mockFontSize: string | null = null;
let mockZoomTransform: any = null;

jest.mock('d3', () => {
  const actualD3 = jest.requireActual('d3');
  
  const mockSimulation = {
    nodes: jest.fn().mockReturnThis(),
    force: jest.fn().mockReturnThis(),
    alpha: jest.fn().mockReturnThis(),
    alphaTarget: jest.fn().mockReturnThis(),
    alphaDecay: jest.fn().mockReturnThis(),
    velocityDecay: jest.fn().mockReturnThis(),
    restart: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    find: jest.fn(),
  };

  const mockSelectChain = {
    selectAll: jest.fn().mockReturnThis(),
    data: jest.fn().mockReturnThis(),
    enter: jest.fn().mockReturnThis(),
    append: jest.fn().mockReturnThis(),
    merge: jest.fn().mockReturnThis(),
    exit: jest.fn().mockReturnThis(),
    remove: jest.fn().mockReturnThis(),
    attr: jest.fn(function(this: any, key: string, value: any) {
      if (key === 'font-size') {
        mockFontSize = typeof value === 'function' ? value() : value;
      }
      return this;
    }),
    style: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    call: jest.fn(function(this: any, transform: any) {
      if (mockZoomTransform) {
        mockZoomTransform(this, transform);
      }
      return this;
    }),
    node: jest.fn(() => ({
      getBBox: () => ({ width: 800, height: 600 }),
    })),
  };

  const mockZoomIdentity = {
    translate: jest.fn().mockReturnThis(),
    scale: jest.fn((scale: number) => {
      mockZoomScale = scale;
      return mockZoomIdentity;
    }),
  };

  return {
    ...actualD3,
    forceSimulation: jest.fn(() => mockSimulation),
    forceLink: jest.fn(() => ({
      id: jest.fn().mockReturnThis(),
      distance: jest.fn().mockReturnThis(),
      strength: jest.fn().mockReturnThis(),
    })),
    forceManyBody: jest.fn(() => ({
      strength: jest.fn().mockReturnThis(),
    })),
    forceCenter: jest.fn(() => actualD3.forceCenter(0, 0)),
    forceCollide: jest.fn(() => ({
      radius: jest.fn().mockReturnThis(),
      strength: jest.fn().mockReturnThis(),
    })),
    select: jest.fn(() => mockSelectChain),
    zoom: jest.fn(() => ({
      scaleExtent: jest.fn().mockReturnThis(),
      translateExtent: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
    })),
    zoomIdentity: mockZoomIdentity,
    drag: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
    })),
  };
});

// Mock knowledgeGraphUtils
jest.mock('@/lib/knowledgeGraphUtils', () => ({
  loadChapterGraphData: jest.fn(async () => ({
    nodes: [
      {
        id: 'node1',
        name: '賈寶玉',
        type: 'character',
        importance: 'primary',
        description: '主角',
        category: '賈家',
        radius: 35,
        color: '#DC2626',
        group: 1,
      },
      {
        id: 'node2',
        name: '林黛玉',
        type: 'character',
        importance: 'primary',
        description: '女主角',
        category: '林家',
        radius: 35,
        color: '#DC2626',
        group: 2,
      },
    ],
    links: [
      {
        source: 'node1',
        target: 'node2',
        relationship: '青梅竹馬',
        strength: 0.8,
        description: '深厚感情',
      },
    ],
  })),
}));

// Import component after mocks
import KnowledgeGraphViewer from '@/components/KnowledgeGraphViewer';

describe('KnowledgeGraphViewer - UX Optimization Tests (2025-10-30)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockZoomScale = null;
    mockFontSize = null;
    mockZoomTransform = null;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial Zoom Level - 0.5x (UX Improvement)', () => {
    /**
     * Test: Initial zoom should be 0.5x instead of 1x
     * 
     * User Feedback: "圖譜頁面剛打開時 顯得放得太大了"
     * (Graph appears too large when first opened)
     * 
     * Expected Behavior:
     * - Graph loads with 0.5x zoom to show complete overview
     * - Users can see all nodes without scrolling/panning
     * - Better first impression of the graph structure
     */
    it('should initialize with 0.5x zoom level on first load', async () => {
      render(<KnowledgeGraphViewer chapter={1} />);

      // Wait for graph to load
      await waitFor(
        () => {
          expect(screen.queryByText(/載入知識圖譜中/i)).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Verify that zoomIdentity.scale was called with 0.5
      await waitFor(() => {
        expect(mockZoomScale).toBe(0.5);
      });
    });

    /**
     * Test: Zoom level indicator should display "50%"
     * 
     * Expected Behavior:
     * - Zoom indicator shows current zoom level
     * - Initial display should be "50%" or "0.5x"
     * - Provides feedback to user about current view scale
     */
    it('should display 50% zoom level indicator on initial render', async () => {
      render(<KnowledgeGraphViewer chapter={1} />);

      await waitFor(() => {
        expect(screen.queryByText(/載入知識圖譜中/i)).not.toBeInTheDocument();
      });

      // Look for zoom level display (may be formatted as "50%" or "0.5x")
      await waitFor(
        () => {
          const zoomDisplay = screen.queryByText(/50%|0\.5x|50/i);
          expect(zoomDisplay).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });
  });

  describe('Relationship Label Font Size - 18px (UX Improvement)', () => {
    /**
     * Test: Relationship labels should use 18px font size
     * 
     * User Feedback: "關係的字可以再大一些"
     * (Relationship text should be larger)
     * 
     * Expected Behavior:
     * - Relationship labels display at 18px (increased from 14px)
     * - Text remains readable at 0.5x zoom level
     * - Improved accessibility for users with vision difficulties
     */
    it('should render relationship labels with 18px font size', async () => {
      render(<KnowledgeGraphViewer chapter={1} />);

      await waitFor(() => {
        expect(screen.queryByText(/載入知識圖譜中/i)).not.toBeInTheDocument();
      });

      // Verify D3 attr was called with font-size: 18px
      await waitFor(
        () => {
          expect(mockFontSize).toBe('18px');
        },
        { timeout: 5000 }
      );
    });

    /**
     * Test: Font size should NOT be 14px (old value)
     * 
     * Expected Behavior:
     * - Ensures the old 14px value is not used
     * - Regression test for UX improvement
     */
    it('should not use the old 14px font size for relationship labels', async () => {
      render(<KnowledgeGraphViewer chapter={1} />);

      await waitFor(() => {
        expect(screen.queryByText(/載入知識圖譜中/i)).not.toBeInTheDocument();
      });

      await waitFor(() => {
        // Font size should be 18px, not 14px
        expect(mockFontSize).not.toBe('14px');
        expect(mockFontSize).toBe('18px');
      });
    });
  });

  describe('Reset Function Behavior - Returns to 0.5x (UX Improvement)', () => {
    /**
     * Test: Reset button should return to 0.5x zoom
     * 
     * Expected Behavior:
     * - Reset button returns view to initial state (0.5x)
     * - Matches the initial zoom level for consistency
     * - Users can easily return to overview after zooming in/out
     */
    it('should reset zoom to 0.5x when reset button is clicked', async () => {
      render(<KnowledgeGraphViewer chapter={1} />);

      await waitFor(() => {
        expect(screen.queryByText(/載入知識圖譜中/i)).not.toBeInTheDocument();
      });

      // Reset the mockZoomScale to track reset call
      mockZoomScale = null;

      // Find and click reset button
      const resetButton = screen.getByRole('button', { name: /重置|reset/i });
      fireEvent.click(resetButton);

      // Verify zoom was reset to 0.5x
      await waitFor(() => {
        expect(mockZoomScale).toBe(0.5);
      });
    });

    /**
     * Test: Reset should NOT return to 1x (old behavior)
     * 
     * Expected Behavior:
     * - Ensures reset matches new initial zoom of 0.5x
     * - Prevents regression to old 1x reset behavior
     */
    it('should not reset to 1x zoom (old behavior)', async () => {
      render(<KnowledgeGraphViewer chapter={1} />);

      await waitFor(() => {
        expect(screen.queryByText(/載入知識圖譜中/i)).not.toBeInTheDocument();
      });

      mockZoomScale = null;

      const resetButton = screen.getByRole('button', { name: /重置|reset/i });
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(mockZoomScale).not.toBe(1);
        expect(mockZoomScale).toBe(0.5);
      });
    });

    /**
     * Test: Zoom indicator should show 50% after reset
     * 
     * Expected Behavior:
     * - After clicking reset, zoom indicator displays "50%"
     * - Provides visual feedback that reset worked correctly
     */
    it('should display 50% zoom level after reset', async () => {
      render(<KnowledgeGraphViewer chapter={1} />);

      await waitFor(() => {
        expect(screen.queryByText(/載入知識圖譜中/i)).not.toBeInTheDocument();
      });

      const resetButton = screen.getByRole('button', { name: /重置|reset/i });
      fireEvent.click(resetButton);

      // Zoom indicator should show 50%
      await waitFor(() => {
        expect(screen.getByText(/50%|0\.5x|50/i)).toBeInTheDocument();
      });
    });
  });

  describe('Consistency Between Initial and Reset Zoom', () => {
    /**
     * Test: Initial zoom and reset zoom should match
     * 
     * Expected Behavior:
     * - Initial load uses 0.5x zoom
     * - Reset returns to 0.5x zoom
     * - Both values are consistent for predictable UX
     */
    it('should maintain consistent 0.5x zoom between initial load and reset', async () => {
      render(<KnowledgeGraphViewer chapter={1} />);

      // Capture initial zoom
      await waitFor(() => {
        expect(screen.queryByText(/載入知識圖譜中/i)).not.toBeInTheDocument();
      });

      const initialZoom = mockZoomScale;
      expect(initialZoom).toBe(0.5);

      // Reset zoom scale tracker
      mockZoomScale = null;

      // Click reset button
      const resetButton = screen.getByRole('button', { name: /重置|reset/i });
      fireEvent.click(resetButton);

      // Verify reset zoom matches initial
      await waitFor(() => {
        expect(mockZoomScale).toBe(initialZoom);
        expect(mockZoomScale).toBe(0.5);
      });
    });
  });

  describe('Edge Cases and Regression Tests', () => {
    /**
     * Test: Zoom bounds should still respect 0.1x minimum
     * 
     * Expected Behavior:
     * - Even with 0.5x initial zoom, min bound is 0.1x
     * - Users can zoom out further if needed
     * - Ensures flexibility after UX change
     */
    it('should allow zooming out below 0.5x down to 0.1x minimum', async () => {
      const mockZoom = require('d3').zoom;
      
      render(<KnowledgeGraphViewer chapter={1} />);

      await waitFor(() => {
        expect(screen.queryByText(/載入知識圖譜中/i)).not.toBeInTheDocument();
      });

      // Verify scaleExtent includes values below 0.5x
      expect(mockZoom).toHaveBeenCalled();
      const zoomInstance = mockZoom.mock.results[0].value;
      expect(zoomInstance.scaleExtent).toHaveBeenCalledWith([0.1, 3]);
    });

    /**
     * Test: Graph should render correctly at 0.5x zoom
     * 
     * Expected Behavior:
     * - All nodes visible at 0.5x zoom
     * - No rendering errors or visual glitches
     * - Graph layout is stable
     */
    it('should render graph correctly at 0.5x zoom without visual issues', async () => {
      render(<KnowledgeGraphViewer chapter={1} />);

      await waitFor(() => {
        expect(screen.queryByText(/載入知識圖譜中/i)).not.toBeInTheDocument();
      });

      // Component should render without errors
      expect(screen.getByPlaceholderText(/搜尋|search/i)).toBeInTheDocument();
      
      // Control buttons should be present and functional
      expect(screen.getByRole('button', { name: /放大|zoom.*in/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /縮小|zoom.*out/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /重置|reset/i })).toBeInTheDocument();
    });
  });
});
