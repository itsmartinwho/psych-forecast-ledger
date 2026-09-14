import { describe, expect, it } from "vitest";
import { countAccent, renderMarkup } from "@/lib/testing/markup";
import { Stat } from "@/components/ui/Stat";
import { Quote } from "@/components/ui/Quote";
import { SourceLink, hostOf } from "@/components/ui/SourceLink";
import { StateMark } from "@/components/ui/StateMark";
import { DateText } from "@/components/ui/DateText";
import { TierBadge } from "@/components/ui/TierBadge";
import { Term, termHref } from "@/components/ui/Term";
import { ReasonChip, reasonLabel } from "@/components/ui/ReasonChip";
import { Progress, progressFilled, progressTicks, progressWidth, PROGRESS_PITCH } from "@/components/svg/Progress";
import { CHROME_TERMS } from "@/lib/content/chrome-terms";
import { GLOSSARY, defineTerm, glossarySlug } from "@/lib/content/glossary";
import codes from "@/data/rules/reason-codes.json";
import { LADDER, PALETTE } from "@/lib/tokens";

describe("Stat", () => {
  it("renders label, value and sub with the globals.css classes", () => {
    const m = renderMarkup(<Stat label="Brier" value="0.19" sub="headline" />);
    expect(m).toContain('class="eyebrow"');
    expect(m).toContain('class="stat"');
    expect(m).toContain(">0.19<");
    expect(m).toContain("headline");
    expect(m).not.toContain("stat-unit");
    expect(renderMarkup(<Stat value="7" small />)).toContain('class="stat stat--sm"');
  });
});

describe("SourceLink and hostOf", () => {
  it("opens in a new tab with a safe rel and a host label by default", () => {
    const m = renderMarkup(<SourceLink href="https://www.fda.gov/x" />);
    expect(m).toBe('<a href="https://www.fda.gov/x" target="_blank" rel="noopener noreferrer">fda.gov</a>');
    expect(renderMarkup(<SourceLink href="https://a.b/c">Label</SourceLink>)).toContain(">Label</a>");
    expect(hostOf("not a url")).toBe("not a url");
  });
});

describe("DateText", () => {
  it("keeps the ISO date in datetime and shows the long, short or upper form", () => {
    expect(renderMarkup(<DateText iso="2026-03-05" />)).toBe('<time dateTime="2026-03-05">5 Mar 2026</time>');
    expect(renderMarkup(<DateText iso="2026-03-05" short />)).toContain(">Mar 2026<");
    expect(renderMarkup(<DateText iso="2026-03-05" upper />)).toContain(">MAR 2026<");
  });
});

describe("Quote", () => {
  it("shows the words verbatim with date and source", () => {
    const m = renderMarkup(
      <Quote date="2024-02-01" source={{ url: "https://x.y/post", title: "The post" }}>
        MDMA will be approved this year.
      </Quote>,
    );
    expect(m).toContain("“MDMA will be approved this year.”");
    expect(m).toContain('<time dateTime="2024-02-01">1 Feb 2024</time>');
    expect(m).toContain(">The post</a>");
    expect(m).toContain('<figcaption class="src"');
  });
  it("drops the caption when there is no date or source", () => {
    expect(renderMarkup(<Quote>Only words.</Quote>)).not.toContain("figcaption");
  });
});

describe("StateMark", () => {
  it("encodes state as solid, hollow, dashed hollow or tiny, labelled True, False, Pending, Void", () => {
    const hit = renderMarkup(<StateMark state="true" />);
    expect(hit).toContain('aria-label="True"');
    expect(hit).toContain("mark--solid");
    const miss = renderMarkup(<StateMark state="false" withLabel />);
    expect(miss).toContain("mark--hollow");
    expect(miss).toContain(`fill="${PALETTE.paper}"`);
    expect(miss).toContain("<span>False</span>");
    const pending = renderMarkup(<StateMark state="pending" />);
    expect(pending).toContain('stroke-dasharray="1.5 1.5"');
    expect(pending).toContain('aria-label="Pending"');
    const voided = renderMarkup(<StateMark state="void" withLabel />);
    expect(voided).toContain("mark--tiny");
    expect(voided).toContain(`fill="${LADDER[4]}"`);
    expect(voided).toContain("<span>Void</span>");
    expect(countAccent(hit + miss + pending + voided)).toBe(0);
  });
});

describe("TierBadge", () => {
  it("is a solid chip for full evidence and hollow otherwise", () => {
    const full = renderMarkup(<TierBadge tier="T2" />);
    expect(full).toContain('class="chip" title="Full"');
    expect(full).toContain(">Full<");
    expect(renderMarkup(<TierBadge tier="T1" />)).toContain('class="chip chip--hollow"');
    expect(renderMarkup(<TierBadge tier="T0" />)).toContain(">Counts only<");
  });
});

describe("Term", () => {
  it("links to the glossary anchor with a popover that carries the definition and a Method link", () => {
    const m = renderMarkup(<Term t="not admitted">rejected</Term>);
    const def = defineTerm("not admitted")!;
    expect(m.startsWith('<span class="term"><a class="term-link" href="/methodology#g-not-admitted" aria-describedby="def-not-admitted-')).toBe(true);
    expect(m).toContain(">rejected</a>");
    const id = /aria-describedby="([^"]+)"/.exec(m)![1];
    expect(m).toContain(`<span class="term-def" role="tooltip" id="${id}">${def.definition} <a href="/methodology#g-not-admitted">Method ›</a></span>`);
    expect(termHref("Brier score")).toBe("/methodology#g-brier-score");
  });
  it("defaults the link text to the term and matches case-insensitively", () => {
    expect(renderMarkup(<Term t="brier score" />)).toContain('href="/methodology#g-brier-score" aria-describedby="def-brier-score-');
    expect(renderMarkup(<Term t="brier score" />)).toContain(">Brier score</a>");
  });
  it("plain renders the link only; side=end adds the modifier", () => {
    const plain = renderMarkup(<Term t="deadline" plain />);
    expect(plain).toBe('<a class="term-link" href="/methodology#g-deadline">deadline</a>');
    expect(renderMarkup(<Term t="Brier score" side="end" />)).toContain('<span class="term term--end">');
  });
  it("throws on an unknown term", () => {
    expect(() => renderMarkup(<Term t="no such term" />)).toThrow(/Unknown glossary term/);
    expect(() => termHref("no such term")).toThrow(/Unknown glossary term/);
  });
  it("gives two terms on one page different popover ids", () => {
    const m = renderMarkup(
      <p>
        <Term t="pending" /> and <Term t="pending" />
      </p>,
    );
    const ids = [...m.matchAll(/aria-describedby="([^"]+)"/g)].map((x) => x[1]);
    expect(ids.length).toBe(2);
    expect(ids[0]).not.toBe(ids[1]);
    for (const id of ids) expect(m).toContain(`id="${id}"`);
  });
  it("resolves every chrome term", () => {
    for (const t of CHROME_TERMS) {
      const m = renderMarkup(<Term t={t} />);
      expect(m).toContain(`href="/methodology#g-${glossarySlug(t)}"`);
    }
  });
  it("glossary slugs are unique and match the anchor form", () => {
    const slugs = GLOSSARY.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(glossarySlug("Brier score")).toBe("brier-score");
    expect(glossarySlug("as-of date")).toBe("as-of-date");
  });
});

describe("ReasonChip", () => {
  it("is a hollow chip with the human label, the test as popover and a link to the code row", () => {
    const m = renderMarkup(<ReasonChip code="VAGUE" />);
    const c = codes.not_admitted.find((r) => r.code === "VAGUE")!;
    expect(m.startsWith('<span class="term"><a class="chip chip--hollow term-link" href="/methodology#rc-VAGUE" aria-describedby="')).toBe(true);
    expect(m).toContain(`>${c.label}</a>`);
    expect(m).toContain(`role="tooltip"`);
    expect(m).toContain(c.test.slice(0, 40));
    expect(reasonLabel("CONTROL")).toBe("Commitment (own venture)");
  });
  it("plain renders the chip link only and unknown codes throw", () => {
    expect(renderMarkup(<ReasonChip code="REPORT" plain />)).toBe('<a class="chip chip--hollow term-link" href="/methodology#rc-REPORT">Report or scoop</a>');
    expect(() => renderMarkup(<ReasonChip code="NOPE" />)).toThrow(/Unknown reason code/);
  });
  it("covers every not-admitted code in the rules", () => {
    for (const r of codes.not_admitted) expect(renderMarkup(<ReasonChip code={r.code} plain />)).toContain(`#rc-${r.code}`);
  });
});

describe("Progress", () => {
  it("draws one tick per unit up to the cap, the first n in ink", () => {
    const m = renderMarkup(
      <svg>
        <Progress n={6} need={10} x={0} y={10} />
      </svg>,
    );
    expect(m.match(/<line /g)?.length).toBe(10);
    expect(m.match(new RegExp(`stroke="${LADDER[0]}"`, "g"))?.length).toBe(6);
    expect(m.match(new RegExp(`stroke="${PALETTE.grid}"`, "g"))?.length).toBe(4);
    expect(m).toContain('aria-label="6 of 10"');
    expect(progressTicks(50)).toBe(30);
    expect(progressFilled(13, 20)).toBe(13);
    expect(progressWidth(10)).toBeCloseTo(9 * PROGRESS_PITCH + 1.2);
  });
});
