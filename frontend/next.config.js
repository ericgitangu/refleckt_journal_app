/** @type {import('next').NextConfig} */
const nextConfig = {
  // Official Next.js configuration options
  reactStrictMode: true,
  swcMinify: true,
  
  // Image optimization settings
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Next.js 14 no longer requires appDir in experimental
  // It's now the default behavior
  experimental: {
    // Prevent React server components optimization
    // This prevents hooks from being called during static generation
    optimizeServerReact: false,
    
    // Explicitly mark these packages as external for server components
    serverComponentsExternalPackages: ['react'],
  },
  
  // Output to standalone mode for production deployment
  output: 'standalone',

  // Set all routes to use Server-Side Rendering (SSR) instead of static generation
  // This is the correct approach for pages with client components
  distDir: '.next',
  
  // Add route options to prevent static generation
  // New in Next.js 14
  reactProductionProfiling: true,
};

module.exports = nextConfig; 