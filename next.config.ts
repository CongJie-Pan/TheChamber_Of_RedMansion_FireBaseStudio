import type { NextConfig } from 'next';

// Phase 4-T3: Bundle analyzer for optimization insights
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Phase 4-T3: Performance Optimizations
  swcMinify: true, // Enable SWC minification for faster builds
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  experimental: {
    optimizeCss: true, // Enable CSS optimization
    optimizePackageImports: ['lucide-react', 'd3', '@radix-ui/react-icons'], // Tree-shake specific packages
    instrumentationHook: true, // Phase 4-T1: Enable instrumentation for guest account seeding
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'sc0.blr1.digitaloceanspaces.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/project-ai-prototyper.appspot.com/**',
      },
      {
        protocol: 'https',
        hostname: 'github.com',
        port: '',
        pathname: '/user-attachments/assets/**', // Ensures this specific path pattern is allowed
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'theme.npm.edu.tw',
        port: '',
        pathname: '/Attachments/WebSitePictures/**',
      },
    ],
  },
  webpack: (
    config: any,
    { isServer, dev }: { isServer: boolean; dev: boolean }
  ) => {
    if (!isServer) {
      // Prevent bundling of Node.js specific modules on the client
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}), // Ensure fallback object exists
        async_hooks: false,
        'node:async_hooks': false,
        fs: false,
        'node:fs': false,
        tls: false,
        'node:tls': false,
        net: false,
        'node:net': false,
        http2: false,
        'node:http2': false,
        dns: false,
        'node:dns': false,
      };

      // Add chunk loading error handling and retry logic
      if (dev) {
        // Development-specific optimizations for chunk loading
        config.optimization = {
          ...config.optimization,
          // Improve chunk splitting for better loading reliability
          splitChunks: {
            ...config.optimization.splitChunks,
            chunks: 'all',
            cacheGroups: {
              ...config.optimization.splitChunks?.cacheGroups,
              // Separate vendor chunks for better caching
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendors',
                chunks: 'all',
                priority: 20,
              },
              // Separate common chunks
              common: {
                name: 'common',
                minChunks: 2,
                chunks: 'all',
                priority: 10,
              },
            },
          },
        };

        // Add runtime chunk configuration for better HMR
        config.optimization.runtimeChunk = 'single';
      }

      // Improved chunk loading configuration for development
      if (dev) {
        // Add better error handling for chunk loading
        config.output = {
          ...config.output,
          // Use deterministic chunk names for better caching
          chunkFilename: 'static/chunks/[name]-[contenthash].js',
          // Add chunk loading global variable
          chunkLoadingGlobal: 'webpackChunkload',
        };
      }
    }
    return config;
  },
};

export default withBundleAnalyzer(nextConfig);
