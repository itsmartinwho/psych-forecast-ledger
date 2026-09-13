import { describe, expect, it } from "vitest";
import { countAccent, renderMarkup } from "@/lib/testing/markup";
import { Card } from "@/components/card/Card";
import { CardSplit } from "@/components/card/CardSplit";
import { Legend } from "@/components/card/Legend";
import { Note } from "@/components/card/Note";

describe("Card", () => {
  it("renders the anatomy: card, h2 conclusion, sub, chart, src", () => {
    const m = renderMarkup(
      <Card title="Owen beats the base rate on dated calls" sub="one dot = one prediction · Brier · 2021 to 2026" src="Leaderboard · headline panel · ledger v1">
        <svg viewBox="0 0 400 320" />
      </Card>,
    );
    expect(m.startsWith('<section class="card">')).toBe(true);
    expect(m).toContain("<h2>Owen beats the base rate on dated calls</h2>");
    expect(m).toContain('<p class="sub">one dot = one prediction · Brier · 2021 to 2026</p>');
    expect(m).toContain('<svg viewBox="0 0 400 320"></svg>');
    expect(m).toContain('<p class="src">Leaderboard · headline panel · ledger v1</p>');
    expect(m.indexOf("<h2>")).toBeLessThan(m.indexOf('class="sub"'));
    expect(m.indexOf("<svg")).toBeLessThan(m.indexOf('class="src"'));
    expect(countAccent(m)).toBe(0);
  });
  it("omits sub and src when not given", () => {
    const m = renderMarkup(<Card title="t">x</Card>);
    expect(m).not.toContain('class="sub"');
    expect(m).not.toContain('class="src"');
  });
  it("adds wide, dark and big variants", () => {
    const m = renderMarkup(
      <Card title="t" wide dark big id="lead">
        x
      </Card>,
    );
    expect(m).toContain('<section class="card wide card--dark" id="lead">');
    expect(m).toContain('<h2 class="big">t</h2>');
  });
  it("moves the title into the split column with note and legend", () => {
    const m = renderMarkup(
      <Card title="t" sub="s" wide split={{ note: "A note.", legend: <Legend items={[{ glyph: "hollow", label: "miss" }]} /> }}>
        <svg />
      </Card>,
    );
    expect(m).toContain('<div class="split">');
    expect(m).toContain('<div class="split-aside"><h2>t</h2><p class="sub">s</p><p class="note">A note.</p><div class="legend">');
    expect(m).toContain('<div class="split-chart"><svg></svg></div>');
  });
});

describe("CardSplit, Note, Legend", () => {
  it("CardSplit works on its own", () => {
    const m = renderMarkup(
      <CardSplit note="n">
        <b>c</b>
      </CardSplit>,
    );
    expect(m).toBe('<div class="split"><div class="split-aside"><p class="note">n</p></div><div class="split-chart"><b>c</b></div></div>');
  });
  it("Note is a .note paragraph", () => {
    expect(renderMarkup(<Note>hi</Note>)).toBe('<p class="note">hi</p>');
  });
  it("Legend maps glyph kinds to the globals.css glyph classes", () => {
    const m = renderMarkup(
      <Legend
        items={[
          { glyph: "solid", label: "hit" },
          { glyph: "hollow", label: "miss" },
          { glyph: "void", label: "void" },
          { glyph: "tick", label: "event" },
          { glyph: "dash", label: "median" },
          { glyph: "accent", label: "owen" },
        ]}
      />,
    );
    expect(m).toContain('<i class="glyph" aria-hidden="true"></i>hit');
    expect(m).toContain('class="glyph glyph--hollow"');
    expect(m).toContain('class="glyph glyph--void"');
    expect(m).toContain('class="glyph glyph--tick"');
    expect(m).toContain('class="glyph glyph--dash"');
    expect(m).toContain('class="glyph glyph--accent"');
    expect(countAccent(m)).toBe(0);
  });
});
