import type { NextConfig } from "next";

// cacheComponents/partialPrefetching are off on purpose: every screen depends on the
// signed-in user, so standard dynamic rendering is simpler (see ARCHITECTURE.md decision log).
const nextConfig: NextConfig = {
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
