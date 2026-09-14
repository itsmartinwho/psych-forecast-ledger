import { describe, expect, it } from "vitest";
import { renderMarkup } from "@/lib/testing/markup";
import { MORE_LINKS, Nav, firstSegment, isCurrent, navLinks } from "@/components/layout/Nav";
import { Masthead } from "@/components/layout/Masthead";
import { PageHeader, stampText } from "@/components/layout/PageHeader";
import { Footer, FOOTER_LINKS } from "@/components/layout/Footer";
import { Shell } from "@/components/layout/Shell";
import { Grid2 } from "@/components/layout/Grid2";
import { REPO_URL, SUBJECT, TAGLINE } from "@/lib/content/site";

const hero = { slug: "owen", name: "Owen Scott Muir" };

describe("Nav", () => {
  const people = [hero, { slug: "angermayer", name: "Christian Angermayer" }, { slug: "doblin", name: "Rick Doblin" }];
  it("links Overview, every forecaster, then the More menu with the four reference pages", () => {
    const m = renderMarkup(<Nav forecasters={people} />);
    const hrefs = [...m.matchAll(/href="([^"]+)"/g)].map((x) => x[1]);
    expect(hrefs).toEqual(["/", "/forecasters/owen", "/forecasters/angermayer", "/forecasters/doblin", "/predictions", "/events", "/methodology", "/about"]);
    expect(navLinks(people).map((l) => l.label)).toEqual(["Overview", "Owen Scott Muir", "Christian Angermayer", "Rick Doblin"]);
    expect(MORE_LINKS.map((l) => l.label)).toEqual(["Statements", "Events", "Method", "About"]);
    expect(m).toContain('<nav aria-label="Main"');
    expect(m).toContain('class="nav-more"');
    expect(m).toContain('class="nav-more-menu"');
    expect(m).not.toContain("aria-current");
  });
  it("marks the current page: a forecaster by slug, other pages by first path segment, and the More label for its pages", () => {
    const m = renderMarkup(<Nav forecasters={people} current="/events" />);
    expect(m).toContain('aria-current="page" href="/events"');
    expect(m).toContain('nav-more-label" aria-haspopup="true" aria-current="page"');
    expect(renderMarkup(<Nav forecasters={people} current="/forecasters/doblin" />)).toContain('aria-current="page" href="/forecasters/doblin"');
    expect(renderMarkup(<Nav forecasters={people} current="/forecasters/doblin" />)).not.toContain('aria-current="page" href="/forecasters/owen"');
    expect(renderMarkup(<Nav forecasters={people} current="/predictions/owen-0412" />)).toContain('aria-current="page" href="/predictions"');
    expect(renderMarkup(<Nav forecasters={people} current="/" />)).toContain('aria-current="page" href="/"');
    expect(renderMarkup(<Nav forecasters={people} current="/gallery" />)).not.toContain("aria-current");
    expect(firstSegment("/predictions/owen-0412")).toBe("predictions");
    expect(firstSegment("/")).toBe("");
    expect(isCurrent("/forecasters/owen", "/forecasters/owen#x")).toBe(true);
    expect(isCurrent("/forecasters/owen", "/forecasters/doblin")).toBe(false);
  });
});

describe("Masthead", () => {
  it("renders the wordmark, the subject with the tagline popover, and the nav", () => {
    const m = renderMarkup(<Masthead forecasters={[hero]} current="/about" />);
    expect(m.startsWith('<header class="masthead">')).toBe(true);
    expect(m).toContain('class="wordmark" href="/">Forecast Ledger</a>');
    expect(m).toContain('<span class="masthead-dot" aria-hidden="true">·</span>');
    expect(m).toContain(`<span class="subject"><a class="subject-link" href="/about">${SUBJECT}</a><span class="term-def" role="tooltip">${TAGLINE}</span></span>`);
    expect(m.indexOf('class="wordmark"')).toBeLessThan(m.indexOf("<nav"));
    expect(m).toContain('aria-current="page" href="/about"');
  });
});

describe("PageHeader", () => {
  const version = { version: "1.1.0", as_of: "2026-09-13" };
  it("renders the H1, the stamp on its row, the dateline and the lede", () => {
    const m = renderMarkup(<PageHeader title="Owen Scott Muir" meta={["Psychiatrist", <b key="r">Radial</b>, "Full archive (tier A)"]} lede="One sentence." version={version} />);
    expect(m.startsWith('<header class="page-head"><div class="page-head-row"><h1>Owen Scott Muir</h1><p class="stamp">Rules 1.1.0 · as of 13 Sep 2026</p></div>')).toBe(true);
    expect(m).toContain('<p class="dateline"><span class="dateline-part">Psychiatrist</span><span class="dateline-dot"> · </span><span class="dateline-part"><b>Radial</b></span><span class="dateline-dot"> · </span><span class="dateline-part">Full archive (tier A)</span></p>');
    expect(m).toContain('<p class="lede">One sentence.</p>');
    expect(stampText(version)).toBe("Rules 1.1.0 · as of 13 Sep 2026");
    expect(m.match(/class="stamp"/g)?.length).toBe(1);
  });
  it("omits the dateline and the lede when not given, and drops empty fragments", () => {
    const m = renderMarkup(<PageHeader title="Statements" version={version} meta={["", null]} />);
    expect(m).not.toContain("dateline");
    expect(m).not.toContain("lede");
    expect(m).toContain("<h1>Statements</h1>");
  });
});

describe("Footer", () => {
  it("links the six places and carries neither version nor date", () => {
    const m = renderMarkup(<Footer />);
    const hrefs = [...m.matchAll(/href="([^"]+)"/g)].map((x) => x[1]);
    expect(hrefs).toEqual(["/", "/methodology", "/methodology#glossary", "/methodology#corrections", "/about", REPO_URL]);
    expect(FOOTER_LINKS.map((l) => l.label)).toEqual(["Forecast Ledger", "Method", "Glossary", "Corrections", "About", "Source data"]);
    expect(m.startsWith('<footer class="footer">')).toBe(true);
    expect(m).not.toContain("Data ");
    expect(m).not.toContain("Rules ");
    expect(m).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});

describe("Shell and Grid2", () => {
  it("shell wraps masthead, main and footer in a 1200px column", () => {
    const m = renderMarkup(
      <Shell current="/" hero={hero}>
        <p>body</p>
      </Shell>,
    );
    expect(m).toContain('<div class="shell" style="max-width:1200px">');
    expect(m.indexOf('<header class="masthead">')).toBeLessThan(m.indexOf("<main"));
    expect(m.indexOf("<main")).toBeLessThan(m.indexOf("<footer"));
    expect(m).toContain("<main><p>body</p></main>");
  });
  it("grid2 is the two-column grid", () => {
    expect(renderMarkup(<Grid2><i /></Grid2>)).toBe('<div class="grid2"><i></i></div>');
  });
});
