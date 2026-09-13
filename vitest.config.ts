import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts", "components/**/*.test.ts", "components/**/*.test.tsx", "scripts/**/*.test.ts", "tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environment: "node",
  },
  resolve: { alias: { "@": path.resolve(__dirname) } },
});
