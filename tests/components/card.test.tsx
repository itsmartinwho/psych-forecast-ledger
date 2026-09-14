import { describe, expect, it } from "vitest";
import { countAccent, renderMarkup } from "@/lib/testing/markup";
import { Card } from "@/components/card/Card";
import { CardSplit } from "@/components/card/CardSplit";
import { HowToRead } from "@/components/card/HowToRead";
import { Legend } from "@/components/card/Legend";
import { Note } from "@/components/card/Note";

describe("Card", () => {
  it("renders the anatomy in order: h2, takeaway, legend, chart, how to read, src", () => {
    const m = renderMarkup(
      <Card title="Leaderboard" n="13 events" takeaway="Muir is the only forecaster with a score." legend={[{ glyph: "solid", label: "score" }, { glyph: "whisker", label: "95% range" }]} how={<p>Persons are ranked only when both have enough events.</p>} src="Headline panel · 3 forecasters">
        <svg viewBox="0 0 400 320" />
      </Card>,
    );
    expect(m.startsWith('<section class="card">')).toBe(true);
    expect(m).toContain('<div class="card-head"><h2>Leaderboard</h2><span class="card-n">13 events</span></div>');
    expect(m).toContain('<p class="takeaway">Muir is the only forecaster with a score.</p>');
    expect(m).toContain('<div class="chart"><svg viewBox="0 0 400 320"></svg></div>');
    expect(m).toContain('<details class="how"><summary>How to read</summary><div><p>Persons are ranked only when both have enough events.</p></div></details>');
    expect(m).toContain('<p class="src">Headline panel · 3 forecasters</p>');
    const order = ["<h2>", 'class="takeaway"', 'class="legend"', 'class="chart"', '<details class="how"', 'class="src"'].map((s) => m.indexOf(s));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(m).not.toContain('class="sub"');
    expect(m).not.toContain('class="note"');
    expect(countAccent(m)).toBe(0);
  });
  it("omits the optional parts when not given", () => {
    const m = renderMarkup(<Card title="t">x</Card>);
    expect(m).toBe('<section class="card"><div class="card-head"><h2>t</h2></div><div class="chart">x</div></section>');
    expect(renderMarkup(<Card title="t" legend={[]}>x</Card>)).not.toContain('class="legend"');
  });
  it("adds wide, dark, id and className variants", () => {
    const m = renderMarkup(
      <Card title="t" wide dark id="lead" className="card--short">
        x
      </Card>,
    );
    expect(m).toContain('<section class="card wide card--dark card--short" id="lead">');
    expect(m).not.toContain("big");
  });
  it("puts the head and the aside in the split column and the chart beside it", () => {
    const m = renderMarkup(
      <Card title="Scoreboard" takeaway="Ahead of a coin flip, provisional." wide split={{ aside: <dl className="stat-list" /> }} src="Headline panel">
        <svg />
      </Card>,
    );
    expect(m).toContain('<div class="split">');
    expect(m).toContain('<div class="split-aside"><div class="card-head"><h2>Scoreboard</h2></div><p class="takeaway">Ahead of a coin flip, provisional.</p><dl class="stat-list"></dl></div>');
    expect(m).toContain('<div class="split-chart"><div class="chart"><svg></svg></div></div>');
    expect(m.indexOf('class="split"')).toBeLessThan(m.indexOf('class="src"'));
  });
});

describe("CardSplit, HowToRead, Note, Legend", () => {
  it("CardSplit works on its own", () => {
    const m = renderMarkup(
      <CardSplit aside={<i>a</i>}>
        <b>c</b>
      </CardSplit>,
    );
    expect(m).toBe('<div class="split"><div class="split-aside"><i>a</i></div><div class="split-chart"><b>c</b></div></div>');
  });
  it("HowToRead is a details.how with a custom summary", () => {
    expect(renderMarkup(<HowToRead>hi</HowToRead>)).toBe('<details class="how"><summary>How to read</summary><div>hi</div></details>');
    expect(renderMarkup(<HowToRead summary="More metrics" open>x</HowToRead>)).toContain('<details class="how" open=""><summary>More metrics</summary>');
  });
  it("Note is a .note paragraph", () => {
    expect(renderMarkup(<Note>hi</Note>)).toBe('<p class="note">hi</p>');
  });
  it("Legend maps glyph kinds to the globals.css glyph classes", () => {
    const m = renderMarkup(
      <Legend
        items={[
          { glyph: "solid", label: "true" },
          { glyph: "hollow", label: "false" },
          { glyph: "void", label: "void" },
          { glyph: "tick", label: "event" },
          { glyph: "dash", label: "median" },
          { glyph: "accent", label: "happened" },
          { glyph: "progress", label: "resolved events toward the 10 a score needs" },
          { glyph: "whisker", label: "95% range" },
          { glyph: "whisker-dashed", label: "provisional" },
          { glyph: "text", label: "dot area = p" },
        ]}
      />,
    );
    expect(m).toContain('<i class="glyph" aria-hidden="true"></i>true');
    expect(m).toContain('class="glyph glyph--hollow"');
    expect(m).toContain('class="glyph glyph--void"');
    expect(m).toContain('class="glyph glyph--tick"');
    expect(m).toContain('class="glyph glyph--dash"');
    expect(m).toContain('class="glyph glyph--accent"');
    expect(m).toContain('<i class="glyph glyph--progress" aria-hidden="true"><b></b><b></b><b></b></i>');
    expect(m).toContain('class="glyph glyph--whisker"');
    expect(m).toContain('class="glyph glyph--whisker-dashed"');
    expect(m).toContain('<span class="legend-item legend-item--text">dot area = p</span>');
    expect(countAccent(m)).toBe(0);
  });
});
