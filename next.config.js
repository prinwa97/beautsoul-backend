// beautsoul-backend/next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Fix: silence turbopack migration warning
  turbopack: {},

  // ✅ Stable builds
  reactStrictMode: true,

  // ⭐ IMPORTANT — build fail stop karega
  eslint: {
    ignoreDuringBuilds: true,
  },

  // webpack hook (safe)
  webpack: (config) => {
    return config;
  },
};

module.exports = nextConfig;