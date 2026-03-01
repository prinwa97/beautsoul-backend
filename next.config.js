// beautsoul-backend/next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Next 16: Turbopack default hota hai.
  // Empty object rakhne se Vercel/Turbopack warning/error silent ho jaata hai.
  turbopack: {},

  // NOTE:
  // Next 16 me next.config.js ka "eslint" option supported nahi hai.
  // Isliye isko hata rahe hain.
  //
  // Agar ESLint build pe fail na ho:
  // package.json me next build ke saath lint disable kar do (neeche option 2).
};

module.exports = nextConfig;