import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["*.app.github.dev", "*.githubpreview.dev"],
    },
  },
};

export default nextConfig;
