// Guards for the repo conventions inside the shared components: no clock, no randomness, no banned words.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
// Directories that must exist are listed first; the scoreboard and ledger directories are created by other groups
// and are read when present.
const DIRS = ["components/layout", "components/card", "components/motion", "components/svg", "components/ui", "components/charts", "components/charts/layout", "components/scoreboard", "components/ledger", "lib/testing"];
const FILES = [
  ...DIRS.filter((d) => fs.existsSync(path.join(ROOT, d))).flatMap((d) => fs.readdirSync(path.join(ROOT, d)).map((f) => path.join(d, f))),
  "lib/format.ts",
  "app/(dev)/gallery/page.tsx",
].filter((f) => /\.(ts|tsx)$/.test(f));

const BANNED_WORDS = ["leverage", "robust", "seamless", "unlock", "streamline", "landscape", "ecosystem"];

describe("component conventions", () => {
  it("covers the owned files", () => {
    expect(FILES.length).toBeGreaterThan(20);
  });
  for (const f of FILES) {
    const src = fs.readFileSync(path.join(ROOT, f), "utf8");
    it(`${f} touches no clock and no randomness`, () => {
      expect(src).not.toMatch(/Date\.now\(/);
      expect(src).not.toMatch(/new Date\(\)/);
      expect(src).not.toMatch(/Math\.random/);
    });
    it(`${f} avoids the banned words`, () => {
      for (const w of BANNED_WORDS) expect(src.toLowerCase()).not.toContain(w);
    });
  }
});
