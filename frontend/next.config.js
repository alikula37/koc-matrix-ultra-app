/** @type {import('next').NextConfig} */
const _withPWA = require('next-pwa');
const withPWA = (_withPWA.default || _withPWA)({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  async rewrites() {
    // For docker internal, backend is http://backend:8000; for browser, NEXT_PUBLIC_API_URL is http://localhost:8001
    // Use backend host when running inside container, fallback to NEXT_PUBLIC_API_URL for local dev
    const apiDest = process.env.NODE_ENV === 'production' ? 'http://backend:8000' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001');
    return [
      {
        source: '/api/:path*',
        destination: `${apiDest}/api/:path*`,
      },
    ]
  },
}

module.exports = withPWA(nextConfig)
