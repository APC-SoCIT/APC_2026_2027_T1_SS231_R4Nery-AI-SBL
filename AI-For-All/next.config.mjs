/** @type {import('next').NextConfig} */
// Filenames are not content-hashed, so use a long-but-revalidatable cache
const ONE_YEAR = 'public, max-age=604800, stale-while-revalidate=2592000'

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['lucide-react', 'react-hot-toast'],
  },
  async headers() {
    return [
      {
        source: '/ai-for-all/:path*',
        headers: [{ key: 'Cache-Control', value: ONE_YEAR }],
      },
      {
        source: '/:file(apc-logo.webp|Home-Page-Mascot.png|icon.svg|apple-icon.png)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
    ]
  },
}

export default nextConfig
