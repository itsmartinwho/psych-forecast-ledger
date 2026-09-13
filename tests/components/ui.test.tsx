import { describe, expect, it } from "vitest";
import { countAccent, renderMarkup } from "@/lib/testing/markup";
import { Stat } from "@/components/ui/Stat";
import { Quote } from "@/components/ui/Quote";
import { SourceLink, hostOf } from "@/components/ui/SourceLink";
import { StateMark } from "@/components/ui/StateMark";
import { DateText } from "@/components/ui/DateText";
import { TierBadge } from "@/components/ui/TierBadge";
import { LADDER, PALETTE } from "@/lib/tokens";

describe("Stat", () => {
  it("renders label, value and unit with the globals.css classes", () => {
    const m = renderMarkup(<Stat label="Brier" value="0.19" unit="headline" />);
    expect(m).toContain('class="eyebrow"');
    expect(m).toContain('<div class="stat">0.19<span class="stat-unit">headline</span></div>');
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
  it("encodes state as solid, hollow, dashed hollow or tiny", () => {
    const hit = renderMarkup(<StateMark state="true" />);
    expect(hit).toContain('aria-label="Hit"');
    expect(hit).toContain("mark--solid");
    const miss = renderMarkup(<StateMark state="false" />);
    expect(miss).toContain("mark--hollow");
    expect(miss).toContain(`fill="${PALETTE.paper}"`);
    const pending = renderMarkup(<StateMark state="pending" />);
    expect(pending).toContain('stroke-dasharray="1.5 1.5"');
    const voided = renderMarkup(<StateMark state="void" withLabel />);
    expect(voided).toContain("mark--tiny");
    expect(voided).toContain(`fill="${LADDER[4]}"`);
    expect(voided).toContain("<span>Void</span>");
    expect(countAccent(hit + miss + pending + voided)).toBe(0);
  });
});

describe("TierBadge", () => {
  it("is a solid chip for full evidence and hollow otherwise", () => {
    expect(renderMarkup(<TierBadge tier="T2" />)).toBe('<span class="chip" title="Full">Full</span>');
    expect(renderMarkup(<TierBadge tier="T1" />)).toContain('class="chip chip--hollow"');
    expect(renderMarkup(<TierBadge tier="T0" />)).toContain(">Counts only<");
  });
});
