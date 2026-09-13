import { defineConfig } from "vitest/config";
import path from "node:path";

// tsconfig keeps jsx "preserve" for Next; Vite 8 (oxc) must still transform the JSX in .tsx tests
export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    include: ["lib/**/*.test.ts", "components/**/*.test.ts", "components/**/*.test.tsx", "scripts/**/*.test.ts", "tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environment: "node",
  },
  resolve: { alias: { "@": path.resolve(import.meta.dirname) } },
});
