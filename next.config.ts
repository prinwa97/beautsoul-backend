// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  turbopack: {
    root: __dirname,
  },

  // PDFKit ko server bundle se external rakho
  serverExternalPackages: ["pdfkit"],

  // pdfkit ke AFM font metrics files deploy output me force-include karo
  outputFileTracingIncludes: {
    "/api/distributor/retailer-orders/invoices/[invoiceId]/pdf/route": [
      "./node_modules/pdfkit/js/data/*.afm",
    ],
  },

  // Old compatibility flag; optional hai, but rakh sakte ho
  experimental: {
    serverComponentsExternalPackages: ["pdfkit"],
  },
};

export default nextConfig;