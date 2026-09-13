import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  outputFileTracingExcludes: { "*": ["./data/raw/**"] },
};
export default nextConfig;
