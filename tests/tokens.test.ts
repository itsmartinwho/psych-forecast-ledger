import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PALETTE, LADDER } from "@/lib/tokens";

describe("token parity", () => {
  const css = fs.readFileSync(path.resolve(__dirname, "../app/globals.css"), "utf8");
  it("globals.css carries every palette hex", () => {
    for (const hex of [PALETTE.paper, PALETTE.ink, PALETTE.muted, PALETTE.faint, PALETTE.grid, PALETTE.accent]) expect(css).toContain(hex);
    for (const hex of LADDER) expect(css).toContain(hex);
  });
});
