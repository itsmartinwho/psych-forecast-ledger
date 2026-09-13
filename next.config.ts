import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: { "*": ["./data/raw/posts/**", "./data/raw/paid/**", "./data/raw/packets/**", "./data/research/**"] },
};

export default nextConfig;
