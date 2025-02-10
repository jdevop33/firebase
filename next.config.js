/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  eslint: {
    ignoreDuringBuilds: true, // Skip ESLint during builds
  },
  typescript: {
    ignoreBuildErrors: true, // Allow TypeScript errors during build
  },
  experimental: {
    swcMinify: true, // Use SWC minification
    forceSwcTransforms: true, // Force SWC transforms
  },
  env: {
    NEXT_DISABLE_SWC_NATIVE: '1', // Forces Next.js to use SWC-WASM instead of native SWC
  },
  compiler: {
    removeConsole: false, // Keep console logs in production
    styledComponents: true, // Enable SWC support for styled-components (if used)
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false }; // Prevents FS module issues
    return config;
  },
};

module.exports = nextConfig;
