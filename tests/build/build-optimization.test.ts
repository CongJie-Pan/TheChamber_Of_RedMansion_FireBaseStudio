/**
 * @fileOverview Build Optimization Tests
 *
 * Tests for verifying build performance optimizations implemented in Task 1.1:
 * - Next.js config optimizations (optimizePackageImports, optimizeCss)
 * - D3.js selective imports
 * - Recharts selective imports
 * - ReactMarkdown lazy loading
 *
 * These tests ensure that the performance optimizations are correctly configured
 * and that the imports are structured to reduce bundle size.
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Build Optimization Configuration', () => {
  const projectRoot = path.resolve(__dirname, '../..');

  describe('Next.js Configuration', () => {
    let nextConfigContent: string;

    beforeAll(() => {
      const nextConfigPath = path.join(projectRoot, 'next.config.ts');
      nextConfigContent = fs.readFileSync(nextConfigPath, 'utf-8');
    });

    it('should have optimizeCss enabled', () => {
      // Check that optimizeCss is enabled (not commented out)
      const hasOptimizeCss = nextConfigContent.includes('optimizeCss: true');
      const isCommentedOut = nextConfigContent.match(/\/\/\s*optimizeCss:\s*true/);

      expect(hasOptimizeCss).toBe(true);
      expect(isCommentedOut).toBeNull();
    });

    it('should have optimizePackageImports configured with required packages', () => {
      const requiredPackages = [
        'lucide-react',
        'd3',
        '@radix-ui/react-icons',
        'recharts',
        'date-fns',
        'react-markdown',
      ];

      requiredPackages.forEach(pkg => {
        expect(nextConfigContent).toContain(`'${pkg}'`);
      });
    });

    it('should have bundle analyzer configured', () => {
      expect(nextConfigContent).toContain('@next/bundle-analyzer');
      expect(nextConfigContent).toContain("ANALYZE === 'true'");
    });

    it('should have console removal for production', () => {
      expect(nextConfigContent).toContain('removeConsole');
      expect(nextConfigContent).toContain("NODE_ENV === 'production'");
    });
  });

  describe('D3.js Selective Imports', () => {
    let knowledgeGraphContent: string;

    beforeAll(() => {
      const filePath = path.join(projectRoot, 'src/components/KnowledgeGraphViewer.tsx');
      knowledgeGraphContent = fs.readFileSync(filePath, 'utf-8');
    });

    it('should NOT have full D3 import (import * as d3)', () => {
      const hasFullImport = knowledgeGraphContent.match(/import\s+\*\s+as\s+d3\s+from\s+['"]d3['"]/);
      expect(hasFullImport).toBeNull();
    });

    it('should have selective D3 imports', () => {
      const selectiveImports = [
        'select',
        'forceSimulation',
        'forceLink',
        'forceManyBody',
        'forceCenter',
        'forceCollide',
        'drag',
        'zoom',
        'zoomIdentity',
      ];

      selectiveImports.forEach(importName => {
        expect(knowledgeGraphContent).toContain(importName);
      });
    });

    it('should import D3 types separately', () => {
      expect(knowledgeGraphContent).toContain("import type {");
      expect(knowledgeGraphContent).toContain('Simulation');
      expect(knowledgeGraphContent).toContain('ZoomBehavior');
      expect(knowledgeGraphContent).toContain('ZoomTransform');
    });
  });

  describe('Recharts Selective Imports', () => {
    let chartContent: string;

    beforeAll(() => {
      const filePath = path.join(projectRoot, 'src/components/ui/chart.tsx');
      chartContent = fs.readFileSync(filePath, 'utf-8');
    });

    it('should NOT have full Recharts import (import * as RechartsPrimitive)', () => {
      const hasFullImport = chartContent.match(/import\s+\*\s+as\s+RechartsPrimitive\s+from\s+['"]recharts['"]/);
      expect(hasFullImport).toBeNull();
    });

    it('should have selective Recharts imports', () => {
      const selectiveImports = [
        'ResponsiveContainer',
        'Tooltip',
        'Legend',
      ];

      selectiveImports.forEach(importName => {
        expect(chartContent).toContain(importName);
      });
    });

    it('should import LegendProps type', () => {
      expect(chartContent).toContain("import type { LegendProps }");
    });
  });

  describe('ReactMarkdown Lazy Loading', () => {
    describe('read-book page', () => {
      let readBookContent: string;

      beforeAll(() => {
        const filePath = path.join(projectRoot, 'src/app/(main)/read-book/page.tsx');
        readBookContent = fs.readFileSync(filePath, 'utf-8');
      });

      it('should NOT have static ReactMarkdown import', () => {
        const hasStaticImport = readBookContent.match(/^import\s+ReactMarkdown\s+from\s+['"]react-markdown['"]/m);
        expect(hasStaticImport).toBeNull();
      });

      it('should have dynamic ReactMarkdown import', () => {
        expect(readBookContent).toContain("const ReactMarkdown = dynamic(");
        expect(readBookContent).toContain("() => import('react-markdown')");
      });

      it('should have loading state for ReactMarkdown', () => {
        expect(readBookContent).toContain('loading:');
        expect(readBookContent).toContain('animate-pulse');
      });

      it('should disable SSR for ReactMarkdown', () => {
        // Find the ReactMarkdown dynamic import block
        const dynamicImportMatch = readBookContent.match(/const ReactMarkdown = dynamic\([\s\S]*?ssr:\s*false/);
        expect(dynamicImportMatch).not.toBeNull();
      });
    });

    describe('StructuredQAResponse component', () => {
      let structuredQAContent: string;

      beforeAll(() => {
        const filePath = path.join(projectRoot, 'src/components/ui/StructuredQAResponse.tsx');
        structuredQAContent = fs.readFileSync(filePath, 'utf-8');
      });

      it('should NOT have static ReactMarkdown import', () => {
        const hasStaticImport = structuredQAContent.match(/^import\s+ReactMarkdown\s+from\s+['"]react-markdown['"]/m);
        expect(hasStaticImport).toBeNull();
      });

      it('should have dynamic ReactMarkdown import', () => {
        expect(structuredQAContent).toContain("const ReactMarkdown = dynamic(");
        expect(structuredQAContent).toContain("() => import('react-markdown')");
      });

      it('should import next/dynamic', () => {
        expect(structuredQAContent).toContain("import dynamic from 'next/dynamic'");
      });
    });
  });

  describe('KnowledgeGraphViewer Lazy Loading', () => {
    let readBookContent: string;

    beforeAll(() => {
      const filePath = path.join(projectRoot, 'src/app/(main)/read-book/page.tsx');
      readBookContent = fs.readFileSync(filePath, 'utf-8');
    });

    it('should have dynamic KnowledgeGraphViewer import', () => {
      expect(readBookContent).toContain("const KnowledgeGraphViewer = dynamic(");
      expect(readBookContent).toContain("() => import('@/components/KnowledgeGraphViewer')");
    });

    it('should disable SSR for KnowledgeGraphViewer', () => {
      const dynamicImportMatch = readBookContent.match(/const KnowledgeGraphViewer = dynamic\([\s\S]*?ssr:\s*false/);
      expect(dynamicImportMatch).not.toBeNull();
    });

    it('should have loading state for KnowledgeGraphViewer', () => {
      expect(readBookContent).toContain('載入知識圖譜');
    });
  });
});

describe('Bundle Size Optimization Patterns', () => {
  const projectRoot = path.resolve(__dirname, '../..');

  it('should not have unused D3 modules in KnowledgeGraphViewer', () => {
    const filePath = path.join(projectRoot, 'src/components/KnowledgeGraphViewer.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // These D3 modules are typically not needed for force-directed graphs
    const unusedModules = [
      'd3-geo',
      'd3-contour',
      'd3-chord',
      'd3-sankey',
    ];

    unusedModules.forEach(module => {
      expect(content).not.toContain(module);
    });
  });

  it('should use direct function calls instead of namespace in KnowledgeGraphViewer', () => {
    const filePath = path.join(projectRoot, 'src/components/KnowledgeGraphViewer.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Should use direct calls like select() instead of d3.select()
    expect(content).toContain('const svg = select(svgRef.current)');
    expect(content).toContain('const simulation = forceSimulation<');

    // Should NOT have d3.select, d3.forceSimulation, etc.
    expect(content).not.toMatch(/d3\.select\(/);
    expect(content).not.toMatch(/d3\.forceSimulation\(/);
    expect(content).not.toMatch(/d3\.zoom\(/);
  });
});

describe('Performance Optimization Comments', () => {
  const projectRoot = path.resolve(__dirname, '../..');

  it('should have Phase 4-T4 comment for ReactMarkdown lazy loading in read-book', () => {
    const filePath = path.join(projectRoot, 'src/app/(main)/read-book/page.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('Phase 4-T4');
    expect(content).toContain('Lazy load ReactMarkdown');
  });

  it('should have Phase 4-T3 comment for KnowledgeGraphViewer lazy loading', () => {
    const filePath = path.join(projectRoot, 'src/app/(main)/read-book/page.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('Phase 4-T3');
    expect(content).toContain('Lazy load KnowledgeGraphViewer');
  });

  it('should have optimization comment in KnowledgeGraphViewer for D3 selective imports', () => {
    const filePath = path.join(projectRoot, 'src/components/KnowledgeGraphViewer.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('Performance optimization');
    expect(content).toContain('Selective D3.js imports');
  });

  it('should have optimization comment in chart.tsx for Recharts selective imports', () => {
    const filePath = path.join(projectRoot, 'src/components/ui/chart.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('Performance optimization');
    expect(content).toContain('Selective Recharts imports');
  });
});
