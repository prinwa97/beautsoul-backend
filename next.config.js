// beautsoul-backend/next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Fix: silence turbopack migration warning (keeps compatibility)
  turbopack: {},

  // ✅ Recommended for stable builds on Vercel
  reactStrictMode: true,

  // ✅ If you previously had experimental.esmExternals, REMOVE it (causes issues in Next 16)
  // experimental: { esmExternals: true }, // ❌ don't use

  // ✅ Keep webpack hook (in case plugins/addons rely on it)
  webpack: (config) => {
    return config;
  },
};

module.exports = nextConfig;
