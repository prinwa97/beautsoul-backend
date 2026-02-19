const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: false, // ✅ service worker build me hamesha generate hoga
});

module.exports = withPWA({
  reactStrictMode: true,
});