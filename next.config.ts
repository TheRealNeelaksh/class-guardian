import type { NextConfig } from "next";
import withPWA from "next-pwa";

const isProd = process.env.NODE_ENV === "production";

const config: NextConfig = {
  experimental: {
    serverActions: true,
  },
  // Ensure consistent manifest handling, especially in production
  output: isProd ? "standalone" : undefined,
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  // Disable PWA during development to avoid interfering with App Router hydration
  disable: !isProd,
})(config);
