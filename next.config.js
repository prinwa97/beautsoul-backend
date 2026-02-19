// next.config.js
const isProd = process.env.NODE_ENV === "production";

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: !isProd,
  scope: "/",
});

module.exports = withPWA({
  reactStrictMode: true,

  // ✅ silence workspace root warning + correct tracing root
  outputFileTracingRoot: require("path").join(__dirname, ".."),
});