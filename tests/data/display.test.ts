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
  it("calibration waits for 20 resolved events", () => {
    const s = lockState("calibration", ctx);
    expect(s).toMatchObject({ name: "Calibration", term: "calibration", now: f.headline.n_clusters, need: T.calibration_min_clusters, unit: "resolved events", shown: false, href: "/methodology#metrics" });
    expect(s.now).toBe(13);
    expect(s.need).toBe(20);
  });
  it("timing waits for 5 false claims that later came true", () => {
    const s = lockState("timing", ctx);
    expect(s).toMatchObject({ name: "Timing", term: "timing", now: 1, need: T.timing_min, unit: "false claims that later came true", shown: false });
  });
  it("sensitivity shows at the headline minimum", () => {
    const s = lockState("sensitivity", ctx);
    expect(s).toMatchObject({ name: "Sensitivity", term: "sensitivity panel", now: 13, need: T.min_clusters_headline, shown: true, href: "/methodology#sensitivity" });
  });
  it("over time shows with three or more quarters", () => {
    const s = lockState("over_time", ctx);
    expect(s).toMatchObject({ name: "Brier over time", now: f.over_time.length, need: DISPLAY.over_time_min_periods, unit: "quarters with resolutions", shown: true });
  });
  it("matrix and boldness wait for a second cell and a second scored forecaster", () => {
    const m = lockState("matrix", ctx);
    expect(m).toMatchObject({ name: "Forecasters by area", now: snap.matrix.filter((c) => c.shown).length, need: DISPLAY.matrix_min_cells, unit: `cells with ${T.calibration_min_per_bin} resolved events`, shown: false });
    expect(m.now).toBe(1);
    const b = lockState("boldness", ctx);
    expect(b).toMatchObject({ name: "Boldness and accuracy", now: 1, need: DISPLAY.boldness_min_forecasters, unit: "forecasters with a score", shown: false });
  });
  it("a forecaster with no score has zero progress, and no f means zero", () => {
    const c = lockState("calibration", { f: snap.forecasters.angermayer, snap });
    expect(c.now).toBe(snap.forecasters.angermayer.headline.n_clusters);
    expect(c.shown).toBe(false);
    expect(lockState("timing", { snap }).now).toBe(0);
  });
  it("lockStates keeps the order and lockedRows drops the shown ones", () => {
    const all = lockStates(LOCK_KEYS, ctx);
    expect(all.map((s) => s.key)).toEqual([...LOCK_KEYS]);
    const home = lockedRows(["calibration", "matrix", "boldness", "timing"], ctx);
    expect(home.map((s) => s.name)).toEqual(["Calibration", "Forecasters by area", "Boldness and accuracy", "Timing"]);
    const person = lockedRows(["calibration", "timing", "sensitivity", "over_time"], ctx);
    expect(person.map((s) => s.key)).toEqual(["calibration", "timing"]);
    for (const s of all) {
      expect(s.shown).toBe(s.now >= s.need);
      expect(s.unit).toBe(s.unit.toLowerCase());
    }
  });
});
