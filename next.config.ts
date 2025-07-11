
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
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
    ],
  },
  webpack: (config, { isServer }) => {
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
    }
    return config;
  },
  experimental: {
    allowedDevOrigins: [
        "https://6000-firebase-studio-1747373869163.cluster-44kx2eiocbhe2tyk3zoyo3ryuo.cloudworkstations.dev",
    ],
  },
};

export default nextConfig;
