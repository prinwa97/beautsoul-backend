// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },

  // ✅ Fix PDFKit Helvetica.afm ENOENT by preventing bundling
  serverExternalPackages: ["pdfkit"],

  // ✅ Backward/experimental compatibility (safe to keep)
  experimental: {
    serverComponentsExternalPackages: ["pdfkit"],
  },
};

export default nextConfig;