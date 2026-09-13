import { describe, expect, it } from "vitest";
import { renderMarkup } from "@/lib/testing/markup";
import { Nav, NAV_LINKS } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { Shell } from "@/components/layout/Shell";
import { Grid2 } from "@/components/layout/Grid2";
import rules from "@/data/rules/version.json";

describe("Nav", () => {
  it("links the six sections in order, uppercase", () => {
    const m = renderMarkup(<Nav />);
    const hrefs = [...m.matchAll(/href="([^"]+)"/g)].map((x) => x[1]);
    expect(hrefs).toEqual(["/", "/forecasters/owen", "/predictions", "/events", "/methodology", "/about"]);
    expect(NAV_LINKS.map((l) => l.href)).toEqual(hrefs);
    expect(m.match(/class="eyebrow"/g)?.length).toBe(6);
    expect(m).toContain('<nav aria-label="Main"');
  });
  it("marks the current page", () => {
    const m = renderMarkup(<Nav current="/events" />);
    expect(m.match(/aria-current="page"/g)?.length).toBe(1);
    expect(m).toContain('class="eyebrow" aria-current="page" style="color:#1C1C1A" href="/events"');
  });
});

describe("Footer", () => {
  it("shows the data version and the rule version", () => {
    const m = renderMarkup(<Footer dataVersion="2026-09-13" />);
    expect(m).toContain("Data 2026-09-13");
    expect(m).toContain(`Rules ${rules.version}`);
    expect(m).toContain('class="src"');
  });
  it("shows only the rule version when no data version is given", () => {
    const m = renderMarkup(<Footer ruleVersion="9.9.9" />);
    expect(m).not.toContain("Data ");
    expect(m).toContain("Rules 9.9.9");
  });
});

describe("Shell and Grid2", () => {
  it("shell wraps nav, main and footer in a 1200px column", () => {
    const m = renderMarkup(
      <Shell current="/" dataVersion="v">
        <p>body</p>
      </Shell>,
    );
    expect(m).toContain('<div class="shell" style="max-width:1200px">');
    expect(m.indexOf("<nav")).toBeLessThan(m.indexOf("<main"));
    expect(m.indexOf("<main")).toBeLessThan(m.indexOf("<footer"));
    expect(m).toContain("<p>body</p>");
  });
  it("grid2 is the two-column grid", () => {
    expect(renderMarkup(<Grid2><i /></Grid2>)).toBe('<div class="grid2"><i></i></div>');
  });
});
