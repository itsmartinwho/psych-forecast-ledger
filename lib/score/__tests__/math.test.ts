import { describe, expect, it } from "vitest";
import { brier, mean, skill, median, quantile } from "../brier";
import { wilson } from "../wilson";
import { bootstrap, bootstrapJoint, leaveOneOutMaxChange } from "../bootstrap";
import { calibrationByBin, murphy } from "../calibration";
import { cohenKappa, weightedKappa } from "../kappa";

describe("brier", () => {
  it("matches hand values", () => {
    expect(brier(0.75, 1)).toBeCloseTo(0.0625, 12);
    expect(brier(0.9, 0)).toBeCloseTo(0.81, 12);
    expect(brier(0.5, 1)).toBeCloseTo(0.25, 12);
    expect(brier(0.1, 0)).toBeCloseTo(0.01, 12);
  });
  it("Doblin worked case: five wrong wills and one wrong probably average 0.757", () => {
    const items = [0.9, 0.9, 0.9, 0.9, 0.9, 0.7].map((p) => brier(p, 0));
    expect(mean(items)!).toBeCloseTo((5 * 0.81 + 0.49) / 6, 12);
    expect(mean(items)!).toBeCloseTo(0.7567, 3);
  });
  it("skill and helpers", () => {
    expect(skill(0.15, 0.25)).toBeCloseTo(0.4, 12);
    expect(skill(0.3, 0)).toBeNull();
    expect(mean([])).toBeNull();
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
  });
});

describe("wilson", () => {
  it("wilson(7, 10) is about [0.397, 0.892]", () => {
    const w = wilson(7, 10)!;
    expect(w.point).toBeCloseTo(0.7, 12);
    expect(w.lo).toBeCloseTo(0.3968, 3);
    expect(w.hi).toBeCloseTo(0.8922, 3);
  });
  it("is null for n = 0 and bounded for extremes", () => {
    expect(wilson(0, 0)).toBeNull();
    const w = wilson(10, 10)!;
    expect(w.hi).toBe(1);
    expect(w.lo).toBeGreaterThan(0.7);
  });
});

describe("bootstrap", () => {
  const units = [0.01, 0.81, 0.25, 0.09, 0.49, 0.01, 0.01, 0.81, 0.25, 0.09];
  it("is deterministic for a fixed seed and contains the point", () => {
    const a = bootstrap(units, (s) => mean(s), { resamples: 2000, seed: 20260913 });
    const b = bootstrap(units, (s) => mean(s), { resamples: 2000, seed: 20260913 });
    expect(a).toEqual(b);
    expect(a!.lo).toBeLessThanOrEqual(a!.point);
    expect(a!.hi).toBeGreaterThanOrEqual(a!.point);
    expect(a!.point).toBeCloseTo(mean(units)!, 12);
  });
  it("changes with the seed and is null on empty input", () => {
    const a = bootstrap(units, (s) => mean(s), { resamples: 500, seed: 1 });
    const b = bootstrap(units, (s) => mean(s), { resamples: 500, seed: 2 });
    expect(a!.lo).not.toBe(b!.lo);
    expect(bootstrap([], (s) => mean(s), { resamples: 10, seed: 1 })).toBeNull();
  });
  it("joint bootstrap reuses the same resamples", () => {
    const j = bootstrapJoint(units, { m: (s) => mean(s), twice: (s) => { const v = mean(s); return v === null ? null : 2 * v; } }, { resamples: 300, seed: 7 });
    expect(j.twice!.lo).toBeCloseTo(2 * j.m!.lo, 12);
    expect(j.twice!.hi).toBeCloseTo(2 * j.m!.hi, 12);
  });
  it("leave-one-out max change", () => {
    expect(leaveOneOutMaxChange([0, 0, 0, 1], (s) => mean(s))).toBeCloseTo(0.25, 12);
    expect(leaveOneOutMaxChange([1], (s) => mean(s))).toBeNull();
  });
});

describe("calibration and Murphy", () => {
  const bins = { E: 0.1, D: 0.3, C: 0.5, B: 0.7, A: 0.9 };
  it("perfectly calibrated bins give zero reliability and the identity holds", () => {
    const rows: { p: number; o: 0 | 1; w: number; bin: string }[] = [];
    // bin A: 0.9 -> 9 of 10 true ; bin C: 0.5 -> 5 of 10 true; bin E: 0.1 -> 1 of 10 true
    for (let i = 0; i < 10; i++) rows.push({ p: 0.9, o: i < 9 ? 1 : 0, w: 1, bin: "A" });
    for (let i = 0; i < 10; i++) rows.push({ p: 0.5, o: i < 5 ? 1 : 0, w: 1, bin: "C" });
    for (let i = 0; i < 10; i++) rows.push({ p: 0.1, o: i < 1 ? 1 : 0, w: 1, bin: "E" });
    const cal = calibrationByBin(rows, bins, 5);
    expect(cal.map((b) => b.bin)).toEqual(["E", "C", "A"]);
    for (const b of cal) expect(b.observed!).toBeCloseTo(b.f, 12);
    const m = murphy(rows, cal)!;
    expect(m.reliability).toBeCloseTo(0, 12);
    expect(m.brier).toBeCloseTo(m.reliability - m.resolution + m.uncertainty, 9);
  });
  it("merges sparse bins toward the middle", () => {
    const rows: { p: number; o: 0 | 1; w: number; bin: string }[] = [];
    for (let i = 0; i < 8; i++) rows.push({ p: 0.9, o: 1, w: 1, bin: "A" });
    rows.push({ p: 0.7, o: 0, w: 1, bin: "B" }); // sparse -> merges into C? C is empty, so it moves toward the middle and lands where mass is
    for (let i = 0; i < 6; i++) rows.push({ p: 0.5, o: 1, w: 1, bin: "C" });
    const cal = calibrationByBin(rows, bins, 5);
    const merged = cal.find((b) => b.merged_from.includes("B"))!;
    expect(merged).toBeDefined();
    expect(cal.every((b) => b.n >= 5)).toBe(true);
  });
});

describe("kappa", () => {
  it("perfect agreement is 1, chance-level is about 0", () => {
    expect(cohenKappa([1, 0, 1, 0], [1, 0, 1, 0])).toBe(1);
    const a = ["x", "x", "y", "y"], b = ["x", "y", "x", "y"];
    expect(cohenKappa(a, b)!).toBeCloseTo(0, 12);
  });
  it("textbook example: 20 agree yes, 5 no/yes, 10 yes/no, 15 agree no -> kappa 0.4", () => {
    const a: string[] = [], b: string[] = [];
    const push = (x: string, y: string, k: number) => { for (let i = 0; i < k; i++) { a.push(x); b.push(y); } };
    push("yes", "yes", 20); push("no", "yes", 5); push("yes", "no", 10); push("no", "no", 15);
    expect(cohenKappa(a, b)!).toBeCloseTo(0.4, 12);
  });
  it("weighted kappa rewards near misses on ordinal bins", () => {
    const order = ["E", "D", "C", "B", "A"];
    const a = ["A", "A", "B", "C", "D", "E", "A", "B"];
    const near = ["A", "B", "B", "C", "C", "E", "A", "A"];
    const far = ["E", "E", "E", "A", "A", "A", "E", "E"];
    expect(weightedKappa(a, a, order)).toBe(1);
    expect(weightedKappa(a, near, order)!).toBeGreaterThan(weightedKappa(a, far, order)!);
  });
});
