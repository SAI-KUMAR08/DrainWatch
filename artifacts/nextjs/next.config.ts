import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Transpile workspace packages so Next.js can process their TypeScript source
  transpilePackages: [
    '@workspace/api-client-react',
    '@workspace/api-zod',
    '@workspace/db',
  ],
  // Disable x-powered-by header
  poweredByHeader: false,
};

export default nextConfig;
