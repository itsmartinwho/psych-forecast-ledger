import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { TickDonut } from "@/components/charts/TickDonut";
import { tickDonutCensusFixture, tickDonutFixture } from "@/components/charts/fixtures/TickDonut.fixture";
import { FOOTNOTE_PER_RECORD, KEY_GAP, KEY_PITCH, LABEL_MAX_CHARS, LABEL_SIZE, LEADER_MIN_TICKS, MAX_TICKS, R_INNER, R_OUTER, keyWidth, layoutTickDonut, ticksPerSegment, truncateLabel } from "@/components/charts/layout/TickDonut.layout";
import { countAccent, minFontSize, renderMarkup } from "@/lib/testing/markup";
import { FONT, FRAME, LADDER, PALETTE } from "@/lib/tokens";

const { w: HW, h: HH } = FRAME.half;
const { w: WW, h: WH } = FRAME.wide;

describe("layoutTickDonut", () => {
  it("is deterministic on the fixture", () => {
    const a = layoutTickDonut(tickDonutFixture, HW, HH);
    const b = layoutTickDonut(tickDonutFixture, HW, HH);
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(layoutTickDonut(tickDonutCensusFixture, WW, WH)).toEqual(layoutTickDonut(tickDonutCensusFixture, WW, WH));
  });
  it("draws one tick per record when the total is 100 or less", () => {
    const L = layoutTickDonut(tickDonutFixture, HW, HH);
    expect(L.oneTickPerRecord).toBe(true);
    expect(L.ticksTotal).toBe(84);
    for (const seg of L.segments) expect(seg.ticks.length).toBe(tickDonutFixture.segments.find((s) => s.id === seg.id)!.count);
    // One empty slot between segments: 84 ticks plus 4 gaps.
    expect(L.slots).toBe(84 + 4);
    const used = new Set(L.segments.flatMap((s) => s.ticks.map((t) => t.slot)));
    expect(used.size).toBe(84);
    for (let i = 1; i < L.segments.length; i++) {
      const prevLast = L.segments[i - 1].ticks.at(-1)!.slot;
      const first = L.segments[i].ticks[0].slot;
      expect(first - prevLast).toBe(2);
    }
  });
  it("scales to 100 ticks when the total is larger", () => {
    const L = layoutTickDonut(tickDonutCensusFixture, HW, HH);
    expect(L.oneTickPerRecord).toBe(false);
    expect(L.ticksTotal).toBe(MAX_TICKS);
    expect(L.slots).toBe(MAX_TICKS + tickDonutCensusFixture.segments.length);
    expect(ticksPerSegment([212, 118, 61, 44, 37, 14], 486).reduce((a, b) => a + b, 0)).toBe(100);
    expect(ticksPerSegment([1, 999], 1000)).toEqual([1, 99]);
    expect(ticksPerSegment([3, 4], 7)).toEqual([3, 4]);
    expect(ticksPerSegment([0, 0], 0)).toEqual([0, 0]);
  });
  it("centres the dial left of the key column and places each tick from r 92 to r 120", () => {
    const L = layoutTickDonut(tickDonutFixture, HW, HH);
    expect(L.cx).toBe((HW - keyWidth(HW) - KEY_GAP) / 2);
    expect(L.cy).toBe(HH / 2 - 4);
    expect(layoutTickDonut(tickDonutCensusFixture, WW, WH).cx).toBe((WW - keyWidth(WW) - KEY_GAP) / 2);
    for (const seg of L.segments) {
      for (const t of seg.ticks) {
        expect(Math.hypot(t.x1 - L.cx, t.y1 - L.cy)).toBeCloseTo(R_INNER, 1);
        expect(Math.hypot(t.x2 - L.cx, t.y2 - L.cy)).toBeCloseTo(R_OUTER, 1);
      }
    }
    expect(L.segments[0].ticks[0].angle).toBeGreaterThan(0);
    expect(L.segments[0].ticks[0].angle).toBeLessThan(5);
  });
  it("maps tones to the ladder and gives the accent to one segment only", () => {
    const L = layoutTickDonut(tickDonutFixture, HW, HH);
    expect(L.segments.map((s) => s.color)).toEqual([LADDER[0], LADDER[2], LADDER[5], LADDER[6]]);
    expect(L.segments.filter((s) => s.accent).length).toBe(0);
    const C = layoutTickDonut(tickDonutCensusFixture, HW, HH);
    expect(C.segments.filter((s) => s.color === PALETTE.accent).map((s) => s.id)).toEqual(["admitted"]);
    const two = layoutTickDonut({ ...tickDonutCensusFixture, segments: tickDonutCensusFixture.segments.map((s, i) => (i === 1 ? { ...s, tone: "accent" as const } : s)) }, HW, HH);
    expect(two.segments.filter((s) => s.color === PALETTE.accent).length).toBe(1);
    const hero = layoutTickDonut(tickDonutFixture, HW, HH, { hero: "pending" });
    expect(hero.segments.filter((s) => s.color === PALETTE.accent).map((s) => s.id)).toEqual(["pending"]);
  });
  it("lays the key out as one row per segment, right of the dial, KEY_PITCH apart", () => {
    for (const [data, W, H] of [[tickDonutCensusFixture, HW, HH], [tickDonutCensusFixture, WW, WH], [tickDonutFixture, HW, HH]] as const) {
      const L = layoutTickDonut(data, W, H);
      expect(L.segments.length).toBe(data.segments.length);
      expect(L.keyX).toBe(W - keyWidth(W));
      for (const s of L.segments) {
        expect(s.label.x).toBeGreaterThanOrEqual(L.cx + R_OUTER + 12);
        expect(s.label.anchor).toBe("start");
        expect(s.countText.anchor).toBe("end");
        expect(s.countText.x).toBeLessThanOrEqual(W);
        expect(s.swatch.x).toBe(L.keyX);
        expect(s.swatch.y2 - s.swatch.y1).toBe(8);
        expect(s.label.y).toBeGreaterThan(0);
        expect(s.label.y).toBeLessThan(H);
      }
      for (let i = 1; i < L.segments.length; i++) expect(L.segments[i].label.y - L.segments[i - 1].label.y).toBeCloseTo(KEY_PITCH, 5);
    }
  });
  it("ties a leader only to right-side segments with three or more ticks", () => {
    const L = layoutTickDonut(tickDonutCensusFixture, HW, HH);
    for (const s of L.segments) {
      expect(s.hasLeader).toBe(s.side === "right" && s.ticks.length >= LEADER_MIN_TICKS);
      if (s.hasLeader) {
        expect(s.leader.x2).toBe(L.keyX - 5);
        expect(s.leader.y2).toBe(s.label.y - 3);
      }
    }
    expect(L.segments.some((s) => s.hasLeader)).toBe(true);
    expect(L.segments.some((s) => !s.hasLeader)).toBe(true);
    const small = layoutTickDonut({ segments: [{ id: "a", label: "A", count: 2, tone: "ink" }, { id: "b", label: "B", count: 50, tone: "muted" }], total: 52, centerLabel: "52", unit: "items" }, HW, HH);
    expect(small.segments.find((s) => s.id === "a")!.hasLeader).toBe(false);
  });
  it("cuts long labels to 14 characters and keeps the full text", () => {
    expect(truncateLabel("VAGUE OR PROMOTIONAL")).toBe("VAGUE OR PROM…");
    expect(truncateLabel("VAGUE OR PROMOTIONAL").length).toBe(LABEL_MAX_CHARS);
    expect(truncateLabel("OWN VENTURE")).toBe("OWN VENTURE");
    const L = layoutTickDonut(tickDonutCensusFixture, HW, HH);
    const vague = L.segments.find((s) => s.id === "vague")!;
    expect(vague.label.text).toBe("VAGUE OR PROM…");
    expect(vague.label.full).toBe("VAGUE OR PROMOTIONAL");
    expect(L.segments.find((s) => s.id === "control")!.label.text).toBe("OWN VENTURE");
  });
  it("writes the total and unit at the centre and the tick unit in the footnote", () => {
    const L = layoutTickDonut(tickDonutCensusFixture, HW, HH);
    expect(L.total.text).toBe("486");
    expect(L.unit.text).toBe("STATEMENTS");
    expect(L.footnote.text).toBe("1 tick = 1% of 486");
    expect(layoutTickDonut(tickDonutFixture, HW, HH).footnote.text).toBe(FOOTNOTE_PER_RECORD);
    expect(FOOTNOTE_PER_RECORD).toBe("1 tick = 1 item");
  });
});

describe("TickDonut markup", () => {
  const half = renderMarkup(createElement(TickDonut, { data: tickDonutFixture, size: "half" }));
  const census = renderMarkup(createElement(TickDonut, { data: tickDonutCensusFixture, size: "half" }));
  const wide = renderMarkup(createElement(TickDonut, { data: tickDonutCensusFixture, size: "wide" }));
  it("renders one svg per frame", () => {
    expect(half.startsWith("<svg")).toBe(true);
    expect(half).toContain(`viewBox="0 0 ${HW} ${HH}"`);
    expect(wide).toContain(`viewBox="0 0 ${WW} ${WH}"`);
  });
  it("uses the accent at most once", () => {
    expect(countAccent(half)).toBe(0);
    expect(countAccent(census)).toBe(1);
    expect(countAccent(wide)).toBe(1);
  });
  it("keeps every font size at 8px or more, above the floor", () => {
    expect(minFontSize(half)).toBe(LABEL_SIZE);
    expect(minFontSize(half)!).toBeGreaterThanOrEqual(FONT.floorHalf);
    expect(minFontSize(wide)!).toBeGreaterThanOrEqual(FONT.floorWide);
  });
  it("draws one 1.6px tick per record, one swatch per row, leaders on big right segments, and a 22px halo total", () => {
    const n = tickDonutFixture.segments.length;
    const L = layoutTickDonut(tickDonutFixture, HW, HH);
    const leaders = L.segments.filter((s) => s.hasLeader).length;
    expect(half.match(/<line /g)?.length).toBe(84 + n + leaders);
    expect(half.match(/class="fade" style="animation-delay/g)?.length).toBe(84);
    expect(half.match(/class="donut-key fade"/g)?.length).toBe(n);
    expect(half.match(/stroke-width="1\.6"/g)?.length).toBe(2 * n);
    expect(half.match(/stroke-dasharray="1 3"/g)?.length).toBe(leaders);
    expect(half).toContain('font-size="22"');
    expect(half).toContain(">84</text>");
    expect(half).toContain(">ITEMS</text>");
    expect(half).toContain(">1 TICK = 1 ITEM</text>");
    expect(census).toContain(">1 TICK = 1% OF 486</text>");
    expect(census).toContain("<title>VAGUE OR PROMOTIONAL</title>VAGUE OR PROM…");
    expect(census.match(/<line /g)?.length).toBe(MAX_TICKS + tickDonutCensusFixture.segments.length + layoutTickDonut(tickDonutCensusFixture, HW, HH).segments.filter((s) => s.hasLeader).length);
  });
});
