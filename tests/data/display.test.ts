// Display minimums on the live snapshot: which charts show and how far the others are from their minimum.
import { describe, expect, it } from "vitest";
import T from "@/data/rules/thresholds.json";
import { DISPLAY, LOCK_KEYS, lockState, lockStates, lockedRows } from "@/lib/content/display";
import { loadDatasetUncached } from "@/lib/data/load";
import { computeScores } from "@/lib/score";

const ds = loadDatasetUncached();
const snap = computeScores(ds);
const hero = ds.forecasters.find((f) => f.hero)!;
const f = snap.forecasters[hero.slug];
const ctx = { f, snap };

describe("lockState on the live snapshot", () => {
  it("calibration counts resolved events against the rule minimum", () => {
    const s = lockState("calibration", ctx);
    expect(s).toMatchObject({ name: "Calibration", term: "calibration", now: f.headline.n_clusters, need: T.calibration_min_clusters, unit: "resolved events", href: "/methodology#metrics" });
    expect(s.shown).toBe(s.now >= s.need);
  });
  it("timing counts false claims that later came true", () => {
    const s = lockState("timing", ctx);
    expect(s).toMatchObject({ name: "Timing", term: "timing", now: f.timing.n, need: T.timing_min, unit: "false claims that later came true" });
    expect(s.shown).toBe(s.now >= s.need);
  });
  it("sensitivity shows at the headline minimum", () => {
    const s = lockState("sensitivity", ctx);
    expect(s).toMatchObject({ name: "Sensitivity", term: "sensitivity panel", now: f.headline.n_clusters, need: T.min_clusters_headline, href: "/methodology#sensitivity" });
    expect(s.shown).toBe(s.now >= s.need);
  });
  it("over time shows with three or more quarters", () => {
    const s = lockState("over_time", ctx);
    expect(s).toMatchObject({ name: "Brier over time", now: f.over_time.length, need: DISPLAY.over_time_min_periods, unit: "quarters with resolutions" });
    expect(s.shown).toBe(s.now >= s.need);
  });
  it("matrix counts shown cells and boldness counts scored forecasters", () => {
    const m = lockState("matrix", ctx);
    expect(m).toMatchObject({ name: "Forecasters by area", now: snap.matrix.filter((c) => c.shown).length, need: DISPLAY.matrix_min_cells, unit: `cells with ${T.calibration_min_per_bin} resolved events` });
    expect(m.shown).toBe(m.now >= m.need);
    const b = lockState("boldness", ctx);
    expect(b).toMatchObject({ name: "Boldness and accuracy", now: snap.leaderboard.filter((r) => r.kind === "person" && r.brier !== null).length, need: DISPLAY.boldness_min_forecasters, unit: "forecasters with a score" });
    expect(b.shown).toBe(b.now >= b.need);
  });
  it("a forecaster's own count is used, and no f means zero", () => {
    const c = lockState("calibration", { f: snap.forecasters.angermayer, snap });
    expect(c.now).toBe(snap.forecasters.angermayer.headline.n_clusters);
    expect(c.shown).toBe(c.now >= c.need);
    expect(lockState("timing", { snap }).now).toBe(0);
  });
  it("lockStates keeps the order and lockedRows drops the shown ones", () => {
    const all = lockStates(LOCK_KEYS, ctx);
    expect(all.map((s) => s.key)).toEqual([...LOCK_KEYS]);
    const home = lockedRows(["calibration", "matrix", "boldness", "timing"], ctx);
    expect(home.every((s) => !s.shown)).toBe(true);
    expect(home.map((s) => s.key)).toEqual(["calibration", "matrix", "boldness", "timing"].filter((k) => !lockState(k as (typeof LOCK_KEYS)[number], ctx).shown));
    for (const s of all) {
      expect(s.shown).toBe(s.now >= s.need);
      expect(s.unit).toBe(s.unit.toLowerCase());
    }
  });
});
