import type { NextConfig } from "next";

const nextConfig = {
  // Allow the Arena/e2b live-preview host during dev.
  allowedDevOrigins: ["*.e2b.app", "localhost"],
} satisfies NextConfig;

export default nextConfig;
