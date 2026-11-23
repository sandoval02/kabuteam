import type { NextConfig } from "next";

// cacheComponents/partialPrefetching are off on purpose: every screen depends on the
// signed-in user, so standard dynamic rendering is simpler (see ARCHITECTURE.md decision log).
const nextConfig: NextConfig = {
  // The dev badge covers the resident bottom nav and flashes "Rendering..." on every
  // navigation. Errors still surface in dev without it.
  devIndicators: false,
  poweredByHeader: false,
  // The admin's AI provider test reads this sample bill from disk at runtime.
  outputFileTracingIncludes: { "/admin": ["./scripts/fixtures/sample-bill.jpg"] },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
