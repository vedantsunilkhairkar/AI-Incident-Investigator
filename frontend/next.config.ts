import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output is only for Docker; Vercel handles its own packaging and crashes if standalone is set
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
};

export default nextConfig;
