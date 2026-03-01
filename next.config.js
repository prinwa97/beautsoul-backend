// beautsoul-backend/next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  // NOTE: Next.js 16+ me `eslint` key next.config.js me valid nahi hai.
  // Lint ko alag se `npm run lint` se run karo (CI / local).
  reactStrictMode: true,

  // optional: if you still want a no-op webpack hook
  webpack: (config) => config,
};

module.exports = nextConfig;