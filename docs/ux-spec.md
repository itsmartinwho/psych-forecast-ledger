# Forecast Ledger: final UX specification

Repo: `/Users/josequesada/Documents/Development/psych-forecast-ledger`. Base: the editorial proposal, with grafts from the product proposal (right-aligned stamp, admission funnel, gray-3 not-admitted rows, state sort, popover link to the method page) and from the scientific proposal (exact leaderboard column arithmetic, `chrome-terms.ts` build check, collapsed ground-truth quarters, `?a=` event filter, methodology section map, mobile font floor).

Every number quoted below is the live value in `data/generated/scores.json` on 2026-09-13 (rules 1.1.0). Numbers are examples of what a function returns; none is typed into JSX. Thresholds come from `data/rules/thresholds.json`; display-only minimums come from `lib/content/display.ts` (section 3.3).

Live facts the design must handle today: Muir is T1 (provisional), Brier 0.20 (95% 0.06 to 0.36) on 13 resolved events, hit rate 10 of 11, 23 pending, 5 known true, 1 void; `over_time` has 7 quarters; calibration has 13 of 20; timing has 1 of 5; the area matrix has 1 filled cell (regulatory, 8 events); sensitivity has 13 of 10; skill against base rates has 2 of 10 paired events; market skill has 0 of 5. Angermayer has 1 resolved event, Doblin 2, both tier C. The census: 2,495 statements, 71 admitted (including void), 2,424 not admitted, 27 resolved items.

One word is banned in code under `components/**` and `lib/testing/**` by `tests/components/conventions.test.ts`: "unlock". No UI string, comment or identifier in this spec uses it. Locked rows say "needs" and "now".

---

## 0. The decisions that resolve the conflicts

| Question | Decision |
|---|---|
| Home H1 | The hero person's name (`ds.forecasters.find(f => f.hero)`), under the masthead. Never "Overview". |
| Nav label for `/` | "Overview" (not "Ledger", not "Scoreboard": Scoreboard is a card name). |
| Nav item 2 | The hero forecaster's full name, href `/forecasters/{slug}`, read from data. No `/forecasters` index page in this release. When a second tier-A forecaster is added, the item becomes "Forecasters" and an index page is built; not now. |
| Version and date | Once per page, in a right-aligned stamp on the H1 baseline: `RULES 1.1.0 · AS OF 13 SEP 2026`. Not in the masthead, not in card src lines, not in the footer, not in SVG. |
| Tagline | Three homes: the masthead subject popover (hover or focus), the About page lede, and `metadata.description`. On touch the subject is a link to `/about`. |
| Text registers | Four: R1 Title, R2 Takeaway, R3 Body, R4 Meta. No figure numbers. |
| Card title | A noun phrase, a chart type allowed ("Leaderboard"). The conclusion is the takeaway line. `docs/design-language.md` card_anatomy is updated to say so. |
| Locked charts | Never a full card. One wide card "Waiting for data" at the end of the grid, one row per locked chart with progress ticks and "M OF N UNIT". Same rule on every page. Conditional charts with no data (receding horizon, shared events) are hidden, not listed. |
| Home donut population | The Scoreboard donut shows the hero's admitted items only (one tick = one item). The 2,424 not-admitted statements are told by the Admission card (funnel rungs) and the Not admitted by reason card. No 97 percent gray dial. |
| Donut labels | A key column at the right of the dial, one row per segment, 13px pitch; leaders only for right-side segments with 3 or more ticks. `spread()` is deleted. |
| Leaderboard row end | Value column and an evidence column with a 16px gutter. T0 rows: `1 of 10` (two tspans) plus progress ticks. Scored rows: Brier plus `13 EVENTS`. No tier text, no group labels inside the SVG. Footnote `← BETTER` at the left of the baseline; `BRIER` at the right. |
| Statements default | Admitted rows only (71). Scope chips Admitted / Not admitted / All. Facets as chips with conditional counts. 200-row paging. Reason chips carry the human label. |
| Sort on Statements | Said date descending; the STATE header toggles a state sort (`sort=state`). No other sorts. |
| Area page | Leaderboard, Status, Claims and events, Claims. The base-rate table and the ground-truth list are cut; links go to `/methodology#references` and `/events?a={slug}`. |
| Term popover | CSS only (`:hover`, `:focus-within`), a `plain` prop for `.scroll-x` containers, `side="end"` near the right edge, a "Method ›" link inside the popover. Anchor `g-{slug}`. |
| Glossary check | `lib/content/chrome-terms.ts` lists every term used in chrome; a test proves each resolves in `GLOSSARY`. `Term` throws at build on an unknown term. |

---

## 1. Site frame

### 1.1 Masthead (`components/layout/Masthead.tsx`, new)

```
Forecast Ledger · interventional psychiatry and psychedelic medicine        OVERVIEW  OWEN SCOTT MUIR  STATEMENTS  EVENTS  METHOD  ABOUT
────────────────────────────────────────────────────────────────────────────────────────────────── hairline 0.6px var(--color-grid)
```

- `<header class="masthead">`: flex, `justify-content: space-between`, `align-items: baseline`, `gap: 24px`, `padding-bottom: 14px`, `border-bottom: 0.6px solid var(--color-grid)`, `margin-bottom: 28px`.
- Wordmark: `<a href="/" class="wordmark">Forecast Ledger</a>`, 16.5px/700, letter-spacing -0.02em, ink, no underline; hover opacity 0.7.
- Separator: `<span class="masthead-dot" aria-hidden="true">·</span>`, 11.5px muted, `margin: 0 8px`.
- Subject: `<span class="subject">` wrapping `<a href="/about" class="subject-link">interventional psychiatry and psychedelic medicine</a>` plus `<span class="term-def" role="tooltip">Quoted, dated predictions scored against public outcomes under one written method. Every score links to the words, the rule and the evidence.</span>`. 11.5px/400 muted, no underline; the popover uses the same CSS as `Term` (section 4). On hover or focus the tagline appears; on tap the link goes to `/about`, where the same sentence is the lede.
- Nav: `<nav aria-label="Main">` in R4, gap 22px, current item in ink with `aria-current="page"`. `Nav` keeps its `current` prop; it matches by first path segment so `/forecasters/owen` marks item 2 and `/predictions/owen-0412` marks Statements.

### 1.2 Navigation (`components/layout/Nav.tsx`)

`NAV_LINKS` becomes a function of the dataset hero, `navLinks(hero: { slug, name })`:

| Order | Label | href |
|---|---|---|
| 1 | Overview | `/` |
| 2 | {hero.name} ("Owen Scott Muir") | `/forecasters/{hero.slug}` |
| 3 | Statements | `/predictions` |
| 4 | Events | `/events` |
| 5 | Method | `/methodology` |
| 6 | About | `/about` |

Hrefs do not change. `tests/components/layout.test.tsx` "Nav" block: labels change; hrefs stay; the class on links becomes `nav-link` (R4), so the `class="eyebrow"` count assertion becomes a `class="nav-link"` count.

### 1.3 Page header (`components/layout/PageHeader.tsx`, new)

```html
<header class="page-head">
  <div class="page-head-row">
    <h1>Owen Scott Muir</h1>
    <p class="stamp">RULES 1.1.0 · AS OF 13 SEP 2026</p>
  </div>
  <p class="dateline">PSYCHIATRIST · CHIEF MEDICAL OFFICER, RADIAL · FULL ARCHIVE (TIER A)</p>
  <p class="lede">optional one sentence</p>
</header>
```

Props: `title: string`, `meta?: ReactNode[]` (fragments joined by ` · `; fragments may contain `Term`), `lede?: ReactNode`, `version: { version: string; as_of: string }`. The component renders the stamp from `version`; pages pass `ds.version`.

- `.page-head-row`: flex, `justify-content: space-between`, `align-items: baseline`, `gap: 16px`.
- `h1`: R1 24px/800, -0.02em, line-height 1.15, `max-width: 30ch`, `text-wrap: balance`. Always a noun phrase.
- `.stamp`: R4, `white-space: nowrap`, text `RULES {version} · AS OF {fmtDate(as_of)}` (uppercase by CSS). The only place on the page with the version and the date.
- `.dateline`: R4, `margin-top: 6px`. Context only, no date, no version.
- `.lede`: R3, `max-width: 68ch`, `margin-top: 10px`. Used on Areas, Method and About only.
- Header `margin-bottom: 24px`.

Every `.eyebrow` kicker above an H1 today is removed ("FORECAST LEDGER · …", "the ledger", "registry and ground truth", "area", "provenance", "clinician · coverage tier A · …").

### 1.4 Footer (`components/layout/Footer.tsx`)

One R4 row, hairline above, `margin-top: 56px`, `padding-top: 14px`:

`FORECAST LEDGER · METHOD · GLOSSARY · CORRECTIONS · ABOUT · SOURCE DATA`

Links: `/`, `/methodology`, `/methodology#glossary`, `/methodology#corrections`, `/about`, the repository URL (`https://github.com/…`, read from `package.json` `repository.url` or a constant in `lib/content/site.ts`). `dataVersion` and `ruleVersion` props are removed. The "Footer" test block asserts the six links and that the text contains neither "Data " nor "Rules ".

### 1.5 Shell (`components/layout/Shell.tsx`)

Renders `Masthead`, `main`, `Footer`. Props: `current`, `hero: { slug, name }`, `children`. `main` has no top margin (the masthead owns the 28px gap). `.shell` stays `max-width: 1200px`, padding 40px (20px 16px under 760px). The Shell test asserts `<header class="masthead">` before `<main>` and `<footer>` after.

---

## 2. Text hierarchy: four registers

| # | Name | Size / weight / spacing | Case | Colour | Single job |
|---|---|---|---|---|---|
| R1 | Title | H1 24px/800, -0.02em, lh 1.15. Card H2 16.5px/700, -0.02em, lh 1.25 | Sentence | ink `#1C1C1A` | Name the page or the card. A noun phrase. Never a conclusion. |
| R2 | Takeaway | 13px/500, lh 1.45, max 2 lines (`max-width: 70ch`). Big numbers `.stat` 26px/800 and `.stat--sm` 20px/800 belong to R2: a number is a takeaway. | Sentence | ink | One finding from the data, computed. |
| R3 | Body | 12.5px/400, lh 1.5, `max-width: 68ch`; 11.5px inside tables; 13px for the verbatim quote | Sentence | gray-2 `#4A4944`; the quote in ink | Explain and list: disclosures, definitions, record tables, quotes. |
| R4 | Meta | 9.5px/600, 0.08em, uppercase by CSS | Upper | muted `#8F8E88`; ink for the current, selected or value item | Label and locate: nav, stamp, dateline, legend, chips, table headers, src line, footer, facet labels, stat labels. Inside SVG the same register is axis 9.5/600, row labels 8/700, footnote 7/600 0.12em (`lib/tokens.ts` FONT). |

Removed registers and their fate:

| Today | Fate |
|---|---|
| `h1.h2.big` sentence (19px) as page title | Removed. The sentence becomes the Scoreboard verdict (R2) or is cut (section 9). |
| `.eyebrow` as a page kicker | Removed as a heading. The class stays as the R4 utility (nav, labels). |
| `.sub` legend fragments under an H2 | Removed. Glyph meanings go to `Legend` (R4); axis meanings and encodings a glyph cannot show go to "How to read" (R3); units go to the SVG footnote. |
| `.note` paragraph under a chart | Removed from the card face. Goes to "How to read". `Note.tsx` stays for the gallery only. |
| `.stat-unit` sentences ("right · counts only") | Removed. A stat is label (R4) + value (R2) + optional `sub` (R4 under the value). Extra facts become their own row in "More metrics". |
| `.src` with version and date | Kept as the card meta line with at most three fragments `SOURCE · SCOPE · N`. Never the version or the date. |
| SVG footnote that restates the legend | Footnote states unit or direction only (`← BETTER`, `BRIER`, `1 RUNG = 50 STATEMENTS`). |

CSS added to `app/globals.css` (group 1 owns this file):

```css
.masthead { display: flex; justify-content: space-between; align-items: baseline; gap: 24px; padding-bottom: 14px; border-bottom: 0.6px solid var(--color-grid); margin-bottom: 28px; }
.wordmark { font-size: 16.5px; font-weight: 700; letter-spacing: -0.02em; color: var(--color-ink); text-decoration: none; }
.wordmark:hover { opacity: 0.7; }
.subject { position: relative; font-size: 11.5px; color: var(--color-muted); }
.subject-link { color: inherit; text-decoration: none; }
.nav-link { font-size: 9.5px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-muted); text-decoration: none; }
.nav-link[aria-current="page"] { color: var(--color-ink); }
.page-head { margin-bottom: 24px; }
.page-head-row { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; flex-wrap: wrap; }
.page-head h1 { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.15; margin: 0; max-width: 30ch; text-wrap: balance; }
.stamp, .dateline { font-size: 9.5px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-muted); margin: 0; }
.stamp { white-space: nowrap; }
.dateline { margin-top: 6px; }
.lede { font-size: 12.5px; line-height: 1.5; color: var(--color-gray-2); max-width: 68ch; margin: 10px 0 0; }
.card-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
.card-n { font-size: 9.5px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-muted); white-space: nowrap; }
.takeaway { font-size: 13px; font-weight: 500; line-height: 1.45; color: var(--color-ink); margin: 4px 0 0; max-width: 70ch; }
.card .legend { margin-top: 10px; }
.card .chart { margin-top: 12px; }
.how { margin-top: 10px; }
.how > summary { font-size: 9.5px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-muted); cursor: pointer; list-style: none; }
.how > summary::-webkit-details-marker { display: none; }
.how > summary::before { content: "▸ "; }
.how[open] > summary::before { content: "▾ "; }
.how > div { font-size: 12.5px; line-height: 1.5; color: var(--color-gray-2); max-width: 68ch; padding: 8px 0 0; }
.src { margin-top: 10px; }
.term { position: relative; }
.term-link { color: inherit; text-decoration: underline dotted 0.6px; text-decoration-color: var(--color-faint); text-underline-offset: 2px; }
.term-link:hover, .term-link:focus { text-decoration-color: var(--color-ink); }
.term-def { display: none; position: absolute; top: calc(100% + 4px); left: 0; z-index: 10; width: min(280px, calc(100vw - 32px)); padding: 10px 12px; background: var(--color-paper); border: 0.6px solid var(--color-grid); border-radius: 8px; font-size: 11.5px; line-height: 1.45; font-weight: 400; letter-spacing: 0; text-transform: none; color: var(--color-gray-2); }
.term--end .term-def { left: auto; right: 0; }
.term:hover .term-def, .term:focus-within .term-def, .subject:hover .term-def, .subject:focus-within .term-def { display: block; }
.term-def a { color: var(--color-ink); }
.locked-row { display: grid; grid-template-columns: 180px 1fr auto; align-items: center; gap: 16px; min-height: 28px; border-top: 0.6px solid var(--color-grid); }
.locked-row:first-of-type { border-top: 0; }
.locked-name { font-size: 12.5px; font-weight: 600; color: var(--color-ink); }
.score-value { font-size: 26px; font-weight: 800; letter-spacing: -0.03em; line-height: 1; font-variant-numeric: tabular-nums; }
.score-sub { font-size: 9.5px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-muted); margin-top: 6px; }
.stat-list { display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; margin-top: 16px; align-items: baseline; }
.stat-list dt { font-size: 9.5px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-muted); }
.stat-list dd { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.chip--on { background: var(--color-ink); color: var(--color-paper); }
.facet { display: flex; align-items: baseline; gap: 8px; margin-top: 8px; }
.facet-label { flex: 0 0 80px; }
.facet-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.card--short { contain-intrinsic-size: auto 160px; }
```

`.card h2` stays 16.5px/700. `.card h2.big` stays in CSS for the gallery only; no page uses it. `.sub`, `.note`, `.stat-unit` stay in CSS for the gallery; no page uses them.

Where the long text goes:

- Tagline: masthead subject popover, About lede, `metadata.description` in `app/layout.tsx`.
- Leaderboard method notes ("Persons are ranked only when…", "Comparators are ad hoc collections…"): the Leaderboard "How to read".
- Bio: forecaster page "About this person" disclosure under the dateline.
- Reason-code tests and event criteria: disclosures in the row or the record.

---

## 3. Card anatomy

### 3.1 Order and spacing (`components/card/Card.tsx`)

```
section.card                     padding 24px 24px 18px; radius 24px; no border; paper
  div.card-head                  flex; space-between; baseline
    h2                           R1 16.5px          "Leaderboard"
    span.card-n                  R4 (optional)      "13 EVENTS"
  p.takeaway                     R2, margin-top 4px (optional)
  div.legend                     R4 glyphs, margin-top 10px (only when the chart draws 2+ mark kinds)
  div.chart                      margin-top 12px    children
  details.how                    margin-top 10px (optional)
    summary                      R4 "HOW TO READ"
    div                          R3, 1 to 5 sentences, may end with a link "Method ›"
  p.src                          R4, margin-top 10px (optional)   "HEADLINE PANEL · 3 FORECASTERS"
```

```ts
export interface CardProps {
  title: string;              // noun phrase; a chart type is allowed
  takeaway?: string;          // one sentence from the data, computed in lib/data/text.ts
  n?: string;                 // right-aligned count in the head row, e.g. "13 events" (uppercased by CSS)
  legend?: LegendItem[];      // rendered by <Legend>
  how?: ReactNode;            // "How to read" body
  src?: string;               // SOURCE · SCOPE · N; never the version or the date
  wide?: boolean; dark?: boolean; id?: string; className?: string;
  split?: { aside: ReactNode }; // aside column (250px) left of the chart; used by Scoreboard
  children: ReactNode;
}
```

`sub`, `big`, `split.note`, `split.legend` are removed. `CardSplit` keeps `head`/`children` and gains `aside`; `Note` stays for the gallery. `tests/components/card.test.tsx`: "renders the anatomy" asserts the order `h2 → .takeaway → .legend → .chart → details.how → .src` and that no `.sub` exists; the split test asserts `.split-aside` holds the aside node and `.split-chart` holds the children.

Rules inside a card:

- No fact appears twice. If the legend says "solid = true", the SVG footnote does not.
- The takeaway never repeats a number shown as a big value in the same card.
- The `src` line has at most three fragments.
- `LegendGlyph` gains `progress` (three 1.5px ticks: two ink, one grid) and `whisker` (12px hairline with 3px caps). `LegendItem` gains `glyph: "text"` for a text-only item ("dot area = p").

### 3.2 Locked state (`components/card/Locked.tsx`, new)

A chart whose display minimum is not met does not render a card. The page collects locked charts into one wide card, title "Waiting for data", placed last in the grid. `className="card--short"`.

```
Waiting for data
Calibration              ▮▮▮▮▮▮▮▮▮▮▮▮▮▯▯▯▯▯▯▯      13 OF 20 RESOLVED EVENTS
Forecasters by area      ▮▯                        1 OF 2 CELLS WITH 5 RESOLVED EVENTS
Boldness and accuracy    ▮▯                        1 OF 2 FORECASTERS WITH A SCORE
Timing                   ▮▯▯▯▯                     1 OF 5 FALSE CLAIMS THAT LATER CAME TRUE
▸ HOW TO READ
```

- `LockedRow` props: `name: string`, `now: number`, `need: number`, `unit: string`, `href?: string` (link to the method section). Grid `180px 1fr auto`, min-height 28px, hairline between rows.
- Name: `.locked-name` R3 12.5px/600 ink.
- Progress: `components/svg/Progress.tsx` (new, pure): props `n`, `need`, `x = 0`, `y = 0`, `pitch = 4.4`, `height = 8`, `cap = 30`. Draws `min(need, cap)` ticks, stroke 1.2px; the first `round(n / need * shown)` in `LADDER[0]`, the rest in `PALETTE.grid`. When `need > cap` one tick stands for `ceil(need / cap)` events. Ticks use `.fade` with a 10ms stagger. Exported `progressWidth(need, pitch, cap)` so layouts can reserve the column.
- Count text: R4 `{fmtInt(now)} OF {fmtInt(need)} {UNIT}`; uppercase by CSS.
- How to read: "A chart appears when its minimum n is met. The minimums are fixed in the rules and listed under Method › Metrics." with the link to `/methodology#metrics`.
- A row with zero progress still appears.

### 3.3 Display minimums (`lib/content/display.ts`, new; outside the banned-word directories)

```ts
import T from "@/data/rules/thresholds.json";
export const DISPLAY = { over_time_min_periods: 3, matrix_min_cells: 2, boldness_min_forecasters: 2 } as const;
export type LockKey = "calibration" | "over_time" | "matrix" | "boldness" | "timing" | "sensitivity";
export interface LockState { key: LockKey; name: string; now: number; need: number; unit: string; shown: boolean; href: string }
export function lockState(key: LockKey, ctx: { f?: ForecasterScores; snap: ScoreSnapshot }): LockState
```

| key | name | need | now | unit |
|---|---|---|---|---|
| calibration | Calibration | `T.calibration_min_clusters` (20) | `f.headline.n_clusters` | resolved events |
| over_time | Brier over time | `DISPLAY.over_time_min_periods` (3) | `f.over_time.length` | quarters with resolutions |
| matrix | Forecasters by area | `DISPLAY.matrix_min_cells` (2) | `snap.matrix.filter(c => c.shown).length` | cells with {T.calibration_min_per_bin} resolved events |
| boldness | Boldness and accuracy | `DISPLAY.boldness_min_forecasters` (2) | persons in `snap.leaderboard` with `brier !== null` | forecasters with a score |
| timing | Timing | `T.timing_min` (5) | `f.timing.n` | false claims that later came true |
| sensitivity | Sensitivity | `T.min_clusters_headline` (10) | `f.headline.n_clusters` | resolved events |

`shown = now >= need`. Metrics that are not charts (skill against base rates, market skill, Murphy decomposition, non-affiliated block) are not listed here; they are rows in "More metrics" with their own "needs N · M now" text (section 6.1).

Hidden, not listed: shared events when `shared_events` is empty; receding horizon when no cluster has 2+ deadlines; trend lanes and almanac when the person has no items.

---

## 4. Glossary linking: the `Term` component

### 4.1 Markup (`components/ui/Term.tsx`, new, server component)

```tsx
<Term t="admitted" />                    // link text = the term
<Term t="not admitted">rejected</Term>   // custom text
<Term t="deadline" plain />              // link only, no popover (inside .scroll-x)
<Term t="Brier score" side="end" />      // popover anchored right
```

Renders:

```html
<span class="term">
  <a class="term-link" href="/methodology#g-not-admitted" aria-describedby="def-not-admitted-3">rejected</a>
  <span class="term-def" role="tooltip" id="def-not-admitted-3">A statement that failed intake for a logged reason code. Listed and counted, never scored. <a href="/methodology#g-not-admitted">Method ›</a></span>
</span>
```

- `t` matches a `GLOSSARY` term case-insensitively. Unknown term: `throw new Error(...)` at render, which fails `next build`.
- Anchor id: `g-` + `glossarySlug(term)` (`toLowerCase().replace(/[^a-z0-9]+/g, "-")`). Add `slug` to `GlossaryTerm` and export `glossarySlug()` from `lib/content/glossary.ts`.
- The id suffix: `React.useId()` (it works in server components). No module counter.
- Popover: CSS only (section 2). Touch: a tap follows the link to the anchor.
- `plain`: renders `<a class="term-link">` only. Required inside `.scroll-x` (methodology tables, shared events table).
- `side="end"`: adds `term--end` for the last two columns of a table header.
- Never inside SVG text.

### 4.2 Chrome terms check (`lib/content/chrome-terms.ts`, new)

`export const CHROME_TERMS = ["admitted", "not admitted", "resolved", "pending", "known true", "void", "Brier score", "cluster", "coin flip", "coverage tier", "evidence tier", "undated panel", "headline panel", "dated view", "base rate", "reference row", "deadline", "anchor table", "lexicon", "bin", "hit rate", "skill score", "scoreable share", "sensitivity panel", "timing", "reason code", "registry event", "outcome", "bootstrap interval", "calibration", "Murphy decomposition", "market reference", "non-affiliated block", "affiliated", "leave-one-out change", "halving rule", "denial", "window-close scoring", "template", "item", "as-of date", "paired comparison", "kappa"] as const;`

`tests/components/ui.test.tsx` renders `<Term t={x} />` for every entry and asserts an href `/methodology#g-…`. Pages import term names from this list where practical; the test is the guard.

### 4.3 Methodology anchors

- Each glossary row: `<tr id="g-{slug}">` with `scroll-margin-top: 24px`; the term cell links to its own anchor.
- Each `see` entry renders as `<Term plain>`.
- Section cards keep their ids (`headline`, `rules`, `lexicon`, `anchors`, `quantities`, `exclusions`, `templates`, `references`, `metrics`, `evidence-tiers`, `coverage-tiers`, `hindsight`, `sensitivity`, `reading-a-row`, `limits`, `corrections`, `versions`, `glossary`) and get `scroll-margin-top: 24px`.
- Reason-code rows in the exclusions table: `<tr id="rc-{CODE}">`.

### 4.4 Where `Term` is required (first occurrence per card or header)

| Place | Terms |
|---|---|
| Scoreboard stat labels and More metrics rows | Brier score, resolved, pending, known true, void, hit rate, base rate, scoreable share, headline panel, dated view, undated panel, coverage tier, evidence tier, skill score, market reference, leave-one-out change, affiliated, Murphy decomposition |
| Leaderboard legend and How to read | coin flip, reference row, bootstrap interval, coverage tier, evidence tier, resolved |
| Admission and Not admitted by reason How to read | admitted, not admitted, reason code, item |
| Statements scope and facet chips | admitted, not admitted, known true, pending, void, dated view, undated panel; reason chips → `ReasonChip` |
| Statements table headers | STATE → outcome; DUE → deadline; P → lexicon; BRIER → Brier score |
| Statement record keys | registry event, deadline, anchor table, lexicon, bin, denial, base rate, halving rule, cluster, known true, window-close scoring, Brier score, timing, market reference, kappa |
| Events headers and How to read | registry event, outcome, resolved, template |
| Area dateline | admitted, resolved, base rate |
| Waiting for data rows | calibration, timing, sensitivity panel (as the row name link) |
| Methodology glossary `see` column | every entry |

`ReasonChip` (`components/ui/ReasonChip.tsx`, new): `<a class="chip chip--hollow term-link" href="/methodology#rc-VAGUE">Vague or promotional</a>` inside a `.term` span with the code's `test` as the popover. Labels and tests come from `data/rules/reason-codes.json`.

---

## 5. Chart fixes

### 5.1 Tick donut: key column (`components/charts/layout/TickDonut.layout.ts`, `TickDonut.tsx`)

Labels never sit on the dial's radius. They form a key column at the right, one row per segment in data order.

- Constants: `KEY_W = 118` (half, W < 600) / `150` (wide); `KEY_PITCH = 13`; `LABEL_SIZE = 8` (was 7); `COUNT_SIZE = 9` (was 8); `LEADER_MIN_TICKS = 3`. `LABEL_GAP` and `spread()` are deleted.
- `cx = (W - KEY_W - 12) / 2` (half 135, wide 319); `cy = H / 2 - 4`; `R_INNER`, `R_OUTER` unchanged.
- `keyX = W - KEY_W`; `keyTop = clamp(cy - (n * KEY_PITCH) / 2 + 4, 12, H - 18 - n * KEY_PITCH)`; row i at `y = keyTop + i * KEY_PITCH`.
- Row: swatch `<line>` from `(keyX, y - 3)` to `(keyX, y + 5)` in the segment colour, stroke `TICK_STROKE`; label at `(keyX + 8, y + 3)`, `LABEL_SIZE`/600, 0.06em, `LADDER[2]`, uppercase, anchor start, truncated to 14 characters with "…" (`<title>` carries the full text); count as a `Halo` `COUNT_SIZE`/800 ink, anchor end at `W - EDGE_MARGIN`.
- Leader: dotted `1 3` from `polar(LEADER_R, midAngle)` to `(keyX - 5, y)` only when `side === "right"` and `ticks.length >= LEADER_MIN_TICKS`. Left-side and small segments have no leader; the swatch ties them.
- `DonutSegmentLayout` keeps `label`, `countText`, `leader`; adds `swatch: { x, y1, y2 }` and `hasLeader: boolean`. `TickDonut.tsx` draws the leader only when `hasLeader`.
- Footnote: `1 TICK = 1 ITEM` when `oneTickPerRecord`, else `1 TICK = 1% OF {fmtInt(total)}`. The `centerLabel` prefix is dropped. `data.centerLabel` is derived by the deriver from the segment sum (`fmtInt(total)`), never passed by a page.
- Tests (`tests/charts/TickDonut.test.ts`): replace the "keeps labels apart" block with: every `label.x >= cx + R_OUTER + 12`; consecutive rows exactly `KEY_PITCH` apart; `hasLeader` false for segments under 3 ticks; the census fixture gives one row per segment; `footnote.text` equals `1 TICK = 1% OF 486` / `1 TICK = 1 ITEM`; `minFontSize` of the half-frame markup is 8. Determinism test unchanged.

Data (`lib/data/derive.ts`): `statusDonut(counts, opts: { includeNotAdmitted?: boolean } = {})` drops the `centerLabel` argument, returns `centerLabel = fmtInt(total)`, labels `true`, `false`, `known true`, `pending`, `void`, and `not admitted` only when `includeNotAdmitted`. The Scoreboard calls it with the person's counts and `includeNotAdmitted: false`. New test `tests/data/derive.test.ts`: the total equals the sum of the segments.

### 5.2 Leaderboard row end (`components/charts/layout/LeaderboardTickRows.layout.ts`, `LeaderboardTickRows.tsx`)

Columns from the right (wide W = 800): evidence 56px start-anchored at `evidenceX = W - 56`; gutter 16; value 44px end-anchored at `valueX = evidenceX - 16`; gutter 12; track ends at `x1 = valueX - 44 - 12`. Half (W = 400): evidence 48, gutter 12, value 40, gutter 8. Label column 120 (wide) / 96 (half), `x0 = labelW + 12`.

`TickRow` changes: remove `tierText`, `tierX`; add:

```ts
value: { text: string; sub?: string; x: number }            // T0: text "1", sub "of 10"; scored: text "0.20"
evidence: { kind: "progress"; n: number; need: number; x: number; y: number } | { kind: "text"; text: string; x: number; y: number } | null
```

- T0 rows (persons and references): `value.text = String(n)`, `value.sub = "of {minN}"`; rendered as two tspans, 10px/800 ink and 8px/600 muted with a 3px gap; `evidence = { kind: "progress", n, need: minN }` drawn with `Progress` (`pitch 4.4`, height 8, centred on the row `y`). No dot, no whisker when `value === null`; a faint dot stays when a value exists (today's rule).
- T1 rows: solid dot, whisker dashed `2 2`, `value.text = fmtBrier(value)`, `evidence = { kind: "text", text: "{n} EVENTS" }` in 8px/600 muted.
- T2 rows: as T1 with a solid whisker.
- Reference rows: hollow dot, same value and evidence rules.
- Rows: persons in rank order when `ranked` (today), else alphabetical; references last. No group labels.
- Footnote: `FOOTNOTE_TEXT = "← better"` at `x = plot.x0`, `y = H - 6`; a second text `UNIT_TEXT = "Brier"` end-anchored at `x = plot.x1`, same `y`, both in the footnote register. `COIN_FLIP_TEXT` unchanged.
- Legend (card): `● score` · `whisker 95% range` · `dash provisional (under 30 events)` · `progress resolved events toward the 10 a score needs` · `○ reference row` · `dash coin flip 0.25`. The whisker dash and the coin-flip dash are different glyphs: use `whisker` with a `dashed` modifier (`glyph--whisker-dashed`) for provisional.
- Tests: `doblin.value` equals `{ text: "6", sub: "of 10" }`; `doblin.evidence.kind === "progress"`; `evidence.x - valueX >= 16` for every row; `FOOTNOTE_TEXT === "← better"`; `UNIT_TEXT === "Brier"`; the order test stays; no `tierText` on any row.

### 5.3 Rung bars with a rung unit (`AreaRungBars.layout.ts`, `types.ts`)

`RungBarsData` gains `rungUnit?: number` (default 1). The layout divides counts by `rungUnit` (ceil) and writes the footnote `1 RUNG = {rungUnit} {UNIT}` when `rungUnit > 1`. `rungUnitFor(max)` in `lib/data/derive.ts` picks the smallest of `[1, 5, 10, 25, 50, 100]` with `ceil(max / unit) <= 60`. Tests: one case with `rungUnit: 50`.

### 5.4 Other in-chart text

- `BrierHairline` footnote → `BRIER · LOWER IS BETTER` (hollow-dot meaning goes to the legend).
- `CalibrationPlumb` footnote → `SHARE THAT CAME TRUE`; merged-bin label `all bins · n=8` with the merged list in `<title>`.
- `MatrixHeat` column labels use `short` from `data/areas.json` (`Regulatory`, `Trials`, `Company`, `Payer`, `Practice`); `lib/data/schema.ts` accepts `short`.
- `TickDonut` half-frame labels are 8px, above the 6.5px floor at a 368px render width (8 × 0.92 = 7.4).

### 5.5 Chart names, takeaways, legends, src

Every takeaway is a function in `lib/data/text.ts`. Chart words ("dot", "bar", "cell", "row", "chart") never appear in a takeaway.

| Chart | Title | Takeaway function and template | Output today | Legend | src |
|---|---|---|---|---|---|
| Scoreboard (aside) | Scoreboard | `scoreboardVerdict(h, minN)`: see 8.10 | Ahead of a coin flip, provisional. | none (donut key) | `HEADLINE PANEL · {n_items_total} ITEMS` |
| LeaderboardTickRows | Leaderboard | `leaderboardTakeaway(rows, minN)`: all T0 → "No forecaster has {minN} resolved events yet." One scored → "{short} is the only forecaster with a score: {b} on {n} events{, provisional}." Ranked → "{short} leads; the intervals do not overlap." Else → "The intervals overlap; no ranking yet." | Muir is the only forecaster with a score: 0.20 on 13 events, provisional. | 5.2 | `HEADLINE PANEL · 3 FORECASTERS` |
| BrierHairline | Brier over time | `overTimeTakeaway(f)`: "Cumulative Brier {last} after {n} events, {up/down} from {first} in {period}." | Cumulative Brier 0.20 after 13 events, up from 0.02 in 2023 Q2. | `● quarter` · `○ fewer than 3 events` · `dash coin flip 0.25` | `HEADLINE PANEL · BY DEADLINE QUARTER` |
| AreaRungBars (funnel) | Admission | `admissionTakeaway(funnel)`: "1 in {round(found / admitted)} statements is a checkable claim; {resolved} are resolved." | 1 in 35 statements is a checkable claim; 27 are resolved. | `▮ {rungUnit} statements` | `EVERY STATEMENT · {scope}` |
| AreaRungBars (reasons) | Not admitted by reason | `reasonsTakeaway(groups)`: "{topLabel} accounts for {k} of {n} statements not admitted." | Vague or promotional accounts for 852 of 2,424 statements not admitted. | `▮ {rungUnit} statements` | `NOT ADMITTED · REASON CODES` |
| AreaRungBars (areas) | Areas | `areasTakeaway(byArea)`: "{topArea} holds {k} of {n} resolved events." | Regulatory decisions holds 8 of 13 resolved events. | `▮ one resolved event` · `text Brier per area (null under 5)` | `RESOLVED EVENTS BY AREA` |
| CalibrationPlumb | Calibration | existing `calibrationTitle` minus the locked branch, renamed `calibrationTakeaway` | (locked, 13 of 20) | `● bin, area = events` · `dash perfect calibration` · `text x stated confidence` | `HEADLINE PANEL · {n} EVENTS` |
| MatrixHeat | Forecasters by area | `matrixTakeaway(snap)`: "{short} has the best cell: {area}, Brier {v} on {n} events." | (locked, 1 of 2 cells) | five-step ladder · `· under 5 events` · `dashed square best cell` | `RESOLVED EVENTS BY AREA` |
| BoldnessPlumb | Boldness and accuracy | "{short} sits {x} from the base rate on average, at Brier {y}." | (locked, 1 of 2 forecasters) | `● forecaster` · `dash coin flip` | `HEADLINE PANEL` |
| TimingRungHistogram | Timing | "Median miss {m} months late on {n} claims." | (locked, 1 of 5) | `▮ one claim` · `dash median` | `FALSE CLAIMS THAT LATER CAME TRUE` |
| LedgerAlmanac (home) | Claims that came due | `recentTakeaway(items)`: "{t} of the last {n} came true." | 5 of the last 12 came true. | `● true` · `○ false` · `text dot area = p` · `text hairline = said to due` | `HEADLINE PANEL · NEWEST FIRST` |
| LedgerAlmanac (person) | Claims | `claimsTakeaway(items)`: "{n} claims since {year}; {r} resolved, {p} pending." | 45 claims since 2021; 16 resolved, 28 pending. | `● true` · `○ false` · `dash pending` · `· void` | `ALL ADMITTED ITEMS` |
| TrendLanes | Claims and events | `lanesTakeaway(lanes, events)`: "{n} claims against {m} events in the field." | 45 claims against 217 events in the field. | `● said` · `○ due` · `tick event` | `HEADLINE PANEL · {area or ALL AREAS}` |
| RecedingHorizon | Receding horizon | `horizonTakeaway(short, event, k, date)`: "{short} promised {event} {k} times; it happened on {date}." / "…; it has not happened." | Doblin promised MDMA-assisted therapy approved by FDA 8 times; it has not happened. | `● promised date` · `accent happened` | `CLUSTER {event_id}` |
| Shared events (table) | Shared events | `sharedTakeaway(shared)`: "{n} event{s} ha{s/ve} claims from more than one forecaster." | 1 event has claims from more than one forecaster. | none | `REGISTRY` |
| Sensitivity (table) | Sensitivity | `sensitivityTakeaway(f)`: "Other rules move the headline by at most {delta}." | Other rules move the headline by at most 0.02. | none | `SENSITIVITY PANEL · SAME EVENTS` |
| TickDonut (area) | Status | `statusTakeaway(counts)`: "{t} of {r} resolved claims came true." | (per area) | none (key) | `{AREA} · {n} ITEMS` |

Lieflat rules kept: one accent per chart, hairlines 0.5 to 0.9px, halos on values, no gradients, floor 6.5px (half) / 5.5px (wide).

---

## 6. Page by page

`Grid2` with 22px gaps stays. Order is the story: scoreboard, comparison, record, what is waiting.

### 6.1 Home `/` (`app/page.tsx`)

```
[Masthead]
Owen Scott Muir                                         RULES 1.1.0 · AS OF 13 SEP 2026
PSYCHIATRIST · CHIEF MEDICAL OFFICER, RADIAL · FULL ARCHIVE (TIER A)

Scoreboard (wide, split) ───────────────────────────────────────────────────────────
  aside 250px                                   │ chart: status donut, hero's admitted items
  0.20                          (.score-value)  │ TRUE 5 · FALSE 11 · KNOWN TRUE 5 ·
  BRIER · 95% 0.06 TO 0.36 · PROVISIONAL        │ PENDING 23 · VOID 3   (key column)
  Ahead of a coin flip, provisional. (.takeaway)│
  RESOLVED EVENTS 13 · PENDING 23 · KNOWN TRUE 5 · VOID 1   (.stat-list)
  ▸ MORE METRICS                                │
Leaderboard (wide)
Brier over time (wide)                                   shown when over_time.length >= 3
Admission (half)              │ Not admitted by reason (half)
Claims that came due (wide)
Shared events (wide table)                               only when non-empty
Waiting for data (wide)                                  Calibration · Forecasters by area · Boldness and accuracy · Timing
FORECASTERS  Owen Scott Muir · Christian Angermayer · Rick Doblin        AREAS  Regulatory decisions · Trial outcomes · …
```

- `Scoreboard` (`components/scoreboard/Scoreboard.tsx`, new, server) takes `{ f: Forecaster, s: ForecasterScores, status: StatusCounts, minN, thresholds }` and is used here and on the forecaster page. Aside contents, in order:
  1. `.score-value`: `f2(h.brier.point)` when `h.brier`, else `{n_true} of {n_true + n_false}`.
  2. `.score-sub`: `BRIER · 95% {lo} TO {hi} · {LABEL}` when scored; `RESOLVED CLAIMS CAME TRUE` when not.
  3. `.takeaway`: `scoreboardVerdict(h, minN)`.
  4. `.stat-list` (`<dl>`): RESOLVED EVENTS `n_clusters` · PENDING `n_pending` · KNOWN TRUE `n_known_true` · VOID `n_void`. Labels are `Term`s.
  5. `<details class="how">` with summary `MORE METRICS` and a `<dl>` of R4 label / R3 value rows: Hit rate `79% (10 of 11)` or `needs 10 events · {n} now`; Dated view `{brier or n_true of resolved} · {n} events`; Undated panel `0.16 · 11 events · 24-month window`; Skill against base rates `needs 10 paired events · 2 now` or `+12%`; Market skill `needs 5 events with a market quote · 0 now`; Leave-one-out change `0.05`; Affiliated share `4%`; Headline without affiliated items `0.20`; Murphy decomposition `needs 30 resolved events · 13 now`; Scoreable share `0.7% (15 dated of 2,118 sincere)`. Labels are `Term`s. The `needs … now` strings come from `metricNeed(need, now, unit)` in `lib/data/text.ts`.
  6. `src`: `HEADLINE PANEL · {n_items_total} ITEMS`.
  - Chart side: `TickDonut` of `statusDonut(snap.status[slug], { includeNotAdmitted: false })`, wide frame.
- Admission (half): `admissionFunnel(ds, snap, slug?)` returns `RungBarsData` with groups Found / Sincere / Admitted / Resolved and `rungUnit = rungUnitFor(found)`. Counts: `ds.statements` (filtered by forecaster when `slug`), sum of `composition.sincere`, admitted statements, resolved items. How to read: "Found is every forward-looking statement in the corpus. Sincere removes satire and third-party claims. Admitted passed intake under the rules. Resolved has an outcome. Method › Reason codes." Card `n`: `{admitted} ADMITTED`.
- Not admitted by reason (half): `reasonRungBars(ds, slug?)` counts `reason_code` over not-admitted statements, sorted descending, label from `reason-codes.json`, `href` per group to `/predictions?scope=not&r={CODE}{&f=slug}`; `rungUnit = rungUnitFor(max)`.
- Brier over time, Leaderboard, Claims that came due, Shared events: as in 5.5. Shared events table headers use R4 with `Term plain`; the deadlines and p columns show one line per item.
- The three `Stat` blocks in today's header are gone: posts read moves to About; the other two are in the Scoreboard and Admission.
- Bottom link rows: two R4 rows `FORECASTERS` and `AREAS`, links without arrows.

### 6.2 Forecaster `/forecasters/[slug]`

```
Owen Scott Muir                                          RULES 1.1.0 · AS OF 13 SEP 2026
CLINICIAN · CHIEF MEDICAL OFFICER, RADIAL · FULL ARCHIVE (TIER A) · 2,429 STATEMENTS
▸ ABOUT THIS PERSON              (details.how: bio in R3, channels as links)

Scoreboard (wide, split)
Brier over time (wide)
Areas (half)                  │ Admission (half)
Not admitted by reason (half) │ Sensitivity (half, table)     Sensitivity shown when n_clusters >= 10
Claims (wide)                 one almanac for all years
Claims and events (wide)
Receding horizon (wide)       one per cluster with 2+ deadlines
Waiting for data (wide)       Calibration · Timing (+ Sensitivity when locked)
```

- Dateline fragments: `archetype` · role parts split on `;` (first two) · `FULL ARCHIVE (TIER A)` / `AD HOC COLLECTION (TIER C)` (from `coverage.tier`, the phrase from a map in `lib/data/text.ts`) · `{found} STATEMENTS`.
- The six-stat grid is replaced by the Scoreboard aside and More metrics. The "Base-rate skill" 7-row table folds into More metrics. The "Not admitted, by reason" table becomes rung bars. The two 40-quote list cards are cut; the reason rungs link to the filtered Statements page.
- Sensitivity card: table with columns VARIANT · BRIER · N. Row names: `Headline`, `Dated items only`, `Lexicon ends 0.85/0.15`, `Flat 0.75`, `Kent words`, `Non-affiliated only`, `Prospective only`, `Undated 36 months`; the long `note` goes in the row's `title`. A null Brier shows `— needs 10 · {n} now`. Takeaway from `sensitivityTakeaway`. `n`: `{n_clusters} EVENTS`.
- Areas card: `areaRungBars` with `valueLabel` Brier per area; groups link to `/areas/{slug}`.
- Claims: one `LedgerAlmanac` from the first item year to `as_of` (`ROW_CAP` 120; Muir has 45).

### 6.3 Statements `/predictions` (`app/predictions/page.tsx`, `components/ledger/Ledger.tsx`, `components/ledger/Facets.tsx`)

```
Statements                                               RULES 1.1.0 · AS OF 13 SEP 2026
2,495 STATEMENTS · 3 FORECASTERS · 2021 TO 2026

[ ADMITTED 71 ] [ NOT ADMITTED 2,424 ] [ ALL 2,495 ]                  [ search: quote, event or reason ]
FORECASTER  Muir 50 · Angermayer 6 · Doblin 15
STATE       True 5 · False 22 · Known true 5 · Pending 24 · Void 7            (admitted scope)
REASON      Vague or promotional 852 · Commitment (own venture) 525 · …        (not-admitted scope)
AREA        Regulatory 38 · Trials 6 · Company 4 · Payer 11 · Practice 3      (admitted scope)
PANEL       Dated 29 · Undated 38                                             (admitted scope)
YEAR        2026 · 2025 · 2024 · …

71 SHOWN
STATE        SAID         WHO     STATEMENT                                              DUE          P      BRIER
● True       1 Jun 2023   Muir    "…quote, two-line clamp…"                              31 Dec 2024  0.70   0.49
                                  MDMA-ASSISTED THERAPY APPROVED BY FDA · E-0001
```

- Scope: three R4 chips; selected `.chip.chip--on`, others `.chip--hollow`. URL `scope=not|all`; absent means admitted. Default rows: admitted statements (status admitted or void), newest said first.
- Facets replace the five `<select>`s. `Facets.tsx` is the client component; `Ledger.tsx` keeps URL state (`useSearchParams`, `router.replace`). Each facet row: R4 label 80px, then chips with counts computed on the rows that match the scope and every other active facet. Chips with zero count are hidden unless selected. One value per facet (radio); clicking the selected chip clears it. URL keys stay `f`, `a`, `s`, `p` (`dated` | `undated`), `y`, `q`; new `r` (reason code), `sort` (`state`), `n` (rows shown). A URL with `r` implies `scope=not`. `s=not_admitted` in an old URL maps to `scope=not`.
- Search input R3, placeholder `quote, event or reason`, 240px, full width under 760px.
- Count line: one R4 `{n} SHOWN` above the table. The old count sentence is cut.
- Admitted layout columns: STATE 110px (`StateMark` + word; known true shows `● Known true` with `DUE {date}` under it in R4) · SAID 88px (R4 mono `fmtDate`) · WHO 72px (short name, link) · STATEMENT flex (quote R3 13px, `-webkit-line-clamp: 2`; second line R4: event title + ` · ` + event id, link to `/events#{id}`) · DUE 96px (R4 mono; undated rows add a hollow chip `24 M`) · P 44px (mono) · BRIER 52px (mono, `–` when unscored).
- Not-admitted layout columns: SAID · WHO · STATEMENT (one-line clamp) · REASON 180px (`ReasonChip`).
- All scope: the admitted layout; not-admitted rows in gray-3 `#6A6963`, no glyph, STATE cell reads `Not admitted`, the reason chip on the STATEMENT second line, DUE/P/BRIER empty.
- Row link: the quote is the `<a>`; the row gets `cursor: pointer` and an `onClick` that follows the same href (keyboard users use the link).
- Sort: the STATE header is a button; click sets `sort=state` (rank true, false, known true, pending, void, not admitted; then said desc); click again clears it. Header shows `▾` when active.
- Paging: 200 rows; a hollow chip `SHOW 200 MORE` sets `n=400` and so on. The 600-row cap and its sentence are cut.
- Column headers: R4, `Term` on STATE (outcome), DUE (deadline), P (lexicon), BRIER (Brier score); the last two use `side="end"`. The table is not inside `.scroll-x` (it stacks under 760px, section 7).
- `LedgerRow` gains `b: number | null` (Brier), `rl: string` (reason label), `kt: string` (known-true deadline or ""), `sr: number` (state rank).

### 6.4 Statement `/predictions/[id]`

```
False · Brier 0.49                                       RULES 1.1.0 · AS OF 13 SEP 2026
CHRISTIAN ANGERMAYER · SAID 1 JUN 2023 · ANGERMAYER-0007

Quote (wide)                 verbatim quote R3 13px ink; caption R4: date · source title link · source type · PAID chip
                             context in R3 12.5 under; for a not-admitted statement: reason label (R2) and test (R3)
Intake (half)                dl: dt R4, dd R3 11.5: event · area · deadline (+ origin chip STATED / ANCHOR / TABLE) · probability (+ origin, bin, phrase, denial) · base rate · tags · coder B
                             ▸ REGISTRY ENTRY  (proposition, criterion, resolution source, intake readings)
                             How to read: "The event, criterion and deadline were written at intake, before the outcome was looked up. Coder B coded the statement independently."
                             src: CODER A
Resolution (half)            state · outcome (+ date, checked through) · evidence links · Brier formula · happened later · base-rate Brier · market price · restatements
                             ▸ ADVERSARIAL RECHECK (verdict, challenged, argument)
                             How to read: "State at window close; the outcome comes from the registry, the score from the rule."
                             src: REGISTRY
Receding horizon (wide)      only when the cluster has 2+ deadlines
Timeline (wide)              trend lane of this claim against its area's events
← EARLIER   LATER →   ALL STATEMENTS
```

H1 forms (`statementTitle(detail)` in `text.ts`, using `STATE_WORD`): `True · Brier 0.02`; `False · Brier 0.49`; `Known true · enters {fmtDate}`; `Pending · due {fmtDate}`; `Void · {void reason label}`; `Not admitted · {reason label}`. `STATE_WORD.known_true` becomes `Known true` (the "pending" suffix moves to the H1 form).

### 6.5 Events `/events`

```
Events                                                   RULES 1.1.0 · AS OF 13 SEP 2026
69 REGISTRY EVENTS · 217 GROUND-TRUTH EVENTS · 2021 TO 2026

Registry (wide)     takeaway: "{occurred} of {n} events have occurred; {open} are open."
  EVENT                                        AREA          OUTCOME                  CLAIMS
  MDMA-assisted therapy approved by FDA        Regulatory    ○ Not occurred · 2024    ○ Angermayer  ○ Doblin ×8  ● Muir ×11
  E-0001 · ▸ CRITERION                                       ▸ RECHECK ×2
Ground truth (wide) takeaway: "{k} events in {latest quarter}."
  quarter groups as <details>; the latest four open, older closed with summary "2024 Q2 · 14 EVENTS"
  row: DATE (R4 mono) · entity (R3 600) · event text · source link · confidence chip when not high
```

- Criterion and resolution source leave the row face; they sit in `<details>` under the title (summary `CRITERION`, R4). Rows keep `id={event.id}` and `scroll-margin-top: 24px`.
- Claims column: one `StateMark` per item and the forecaster short name; repeats collapse to `×n` with a `<title>` listing the deadlines.
- `?a={area}` filters both tables; the dateline then adds `· {AREA}` and the H1 stays "Events".
- The header sentence and the definition paragraph are cut; the registry definition is the Registry card's How to read: "A registry event is one proposition with one criterion and one resolution source, written before outcomes are looked up. Method › Event templates."

### 6.6 Areas `/areas/[slug]`

```
Regulatory decisions                                     RULES 1.1.0 · AS OF 13 SEP 2026
38 ADMITTED CLAIMS · 10 RESOLVED · 94 GROUND-TRUTH EVENTS (link → /events?a=regulatory) · BASE RATES (link → /methodology#references)
lede: area definition, one sentence

Leaderboard (wide)     area-scoped rows; T0 progress uses `T.calibration_min_per_bin` (5) as minN; takeaway from leaderboardTakeaway(rows, 5)
Status (half)          donut of the area's items; takeaway statusTakeaway
Claims and events (wide)
Claims (wide)
```

The ground-truth list card and the base-rate table card are cut.

### 6.7 Method `/methodology`

- H1 `Method`. Lede: "Every rule was written before an outcome was checked; the tables come from the rule files, so the page and the score cannot disagree."
- Section nav row stays (R4 links), becomes `position: sticky; top: 0; background: var(--color-paper); padding: 8px 0; z-index: 5` on desktop.
- The local `Card` function is deleted; the page uses the shared `Card` with `title` = section noun and `takeaway` = today's sentence:

| id | Title | Takeaway (today's title) |
|---|---|---|
| headline | Headline | Each number is a Brier score on claims we could check. |
| rules | Rules | The rules were fixed before we looked, and each has one reason. |
| lexicon | Lexicon | The same word gets the same number for everyone. |
| anchors | Anchor table | Only the person's words set a deadline. |
| quantities | Quantity rules | A number claim resolves on the named series only. |
| exclusions | Reason codes | Vague, controlled and reported claims never enter the score. |
| templates | Event templates | Every event is written on the asset, from one of eight templates. |
| references | Reference rows | The base rate and the market are scored on the same events as the person. |
| metrics | Metrics | Eleven metrics, each with its formula and its minimum n. |
| evidence-tiers | Evidence tiers | Below {T.min_clusters_headline} clusters we show counts, not a score. |
| coverage-tiers | Coverage tiers | We rank only people whose archives were read the same way. |
| hindsight | Hindsight controls | Coders never see outcomes, and resolvers never see probabilities. |
| sensitivity | Sensitivity panel | The headline is shown again under seven alternative rules. |
| reading-a-row | Worked examples | One event gives one vote, however often it was predicted. |
| limits | Known limits | The score is honest about what it cannot show. |
| corrections | Corrections | Every change to a published number is logged here. |
| versions | Versions | Rules version {v} is in force. |
| glossary | Glossary | Each term keeps one meaning across the site. |

- `sub` column descriptions are cut (table headers say it). `src` lines keep only the file path (`data/rules/lexicon.json`); no version (the Versions card is the exception: its table is about versions).
- Glossary: a letter index row (R4, letters present in the glossary, links to the first term of each letter) above the table; rows with `g-` anchors; `see` cells as `Term plain`. Reason-code rows with `rc-` anchors.
- Tables stay 11.5px on this page and inside `.scroll-x`; `Term plain` inside them.

### 6.8 About `/about`

- H1 `About`; lede = the tagline.
- Dateline: `{read} OF {archive} POSTS READ · {words} WORDS · GENERATED {fmtDate}`.
- Cards: Coverage (table), Pipeline (ordered list; takeaway "Coder agreement on admission: κ 0.75 on 2,153 statements." from `agreement`), one card per forecaster titled with the person's name (`n`: `TIER A · 2021 TO 2026`; corpus paragraph and sources), Design and code. The Corrections card is cut; the footer links to `/methodology#corrections`.

---

## 7. Mobile (400px)

- Masthead: line 1 wordmark (16.5px); line 2 subject (11.5px, no dot); line 3 the nav as one horizontal row, `overflow-x: auto; white-space: nowrap; scrollbar-width: none; margin: 0 -16px; padding: 0 16px`. Breakpoints: 900px (nav wraps under the wordmark), 760px (three lines).
- Page header: H1 20px/800; the stamp drops under the dateline (the flex row wraps; `.stamp { order: 3; flex-basis: 100% }` under 600px); dateline fragments stay on one line each (`display: inline-block`).
- Cards: padding 20px 16px 16px; radius 16px; one column (existing 900px rule). `ChartFrame` swaps to the 400×320 frame under 760px. The Scoreboard split stacks with the aside first (existing `.split` rule).
- Legend chips wrap. "How to read" summaries stay one line.
- Waiting-for-data rows: grid becomes `1fr` with progress and count on a second line.
- Statements table under 760px: `tr` as `display: block` rows, `td` as flex items; line 1 STATE · SAID · WHO (R4); line 2 quote (2-line clamp); line 3 event title (R4) with P · BRIER right-aligned. Facet rows scroll horizontally like the nav; the scope control stays visible; the search box goes full width.
- Events registry rows stack the same way; the criterion `details` stays.
- `Term` popovers: width `min(280px, calc(100vw - 32px))`; on touch a tap navigates.
- No element wider than the viewport; `.scroll-x` only on the methodology tables and the shared-events table. Donut key labels are 8px (7.4px rendered at 368px width, above the 6.5px floor). `tests/components/markup.test.tsx` `minFontSize` stays the guard.

---

## 8. Copy rules

1. Sentence case everywhere except R4, which is uppercase by CSS. Strings in code are never typed in capitals (`"Waiting for data"`, not `"WAITING FOR DATA"`).
2. A card never says the same thing twice. Legend, SVG footnote, takeaway and How to read carry different information.
3. The rules version and the as-of date appear once per page, in the stamp.
4. Every number in a takeaway, verdict, dateline or locked row is computed in `lib/data/text.ts` or `lib/content/display.ts` from `ds`, `snap` and `thresholds.json`. No literal number in JSX text. `fmtInt` for counts, `f2` for Brier, `fmtDate` for people-facing dates, ISO only in `datetime` attributes and `mono` sort keys.
5. A takeaway is one sentence, under 20 words, active voice, no chart words. When the data cannot support a finding, the card is locked; there is no "no data yet" takeaway.
6. Card titles are noun phrases of one to four words. A chart type is allowed.
7. Method words in R2, R3 and R4 text use `Term` on first occurrence in a card or header.
8. The word "unlock" does not appear in any UI string, comment or identifier. Locked rows read `{now} OF {need} {unit}`; metric rows read `needs {need} {unit} · {now} now`.
9. Person references: full name in H1, nav and the About cards; `short` everywhere else.
10. `scoreboardVerdict(h, minN)`: T0 with no resolved events → "No claim has come due yet."; T0 → "A score needs {minN} resolved events."; T1 → "{Band}, provisional."; T2 → "{Band}." Bands from the Brier point: `< 0.15` "Well ahead of a coin flip", `< 0.25` "Ahead of a coin flip", `< 0.35` "No better than a coin flip", else "Worse than a coin flip". `headlineSentence` is deleted.

### 8.1 Copy sheet (every fixed string)

| Place | String |
|---|---|
| Masthead wordmark | Forecast Ledger |
| Masthead subject | interventional psychiatry and psychedelic medicine |
| Masthead popover, About lede, metadata.description | Quoted, dated predictions scored against public outcomes under one written method. Every score links to the words, the rule and the evidence. |
| Nav | Overview · {hero name} · Statements · Events · Method · About |
| Stamp | RULES {version} · AS OF {date} |
| Footer | Forecast Ledger · Method · Glossary · Corrections · About · Source data |
| Page H1s | {person name} · Statements · {verdict form 6.4} · Events · {area name} · Method · About |
| Card titles | Scoreboard · Leaderboard · Brier over time · Admission · Not admitted by reason · Claims that came due · Shared events · Waiting for data · Areas · Sensitivity · Claims · Claims and events · Receding horizon · Calibration · Forecasters by area · Boldness and accuracy · Timing · Quote · Intake · Resolution · Timeline · Registry · Ground truth · Status · Coverage · Pipeline · Design and code · the 18 method section nouns (6.7) |
| Disclosure summaries | How to read · More metrics · About this person · Registry entry · Adversarial recheck · Criterion · Recheck |
| Locked row text | {now} of {need} {unit} (units in 3.3) |
| Waiting for data How to read | A chart appears when its minimum n is met. The minimums are fixed in the rules and listed under Method › Metrics. |
| Metric need text | needs {need} {unit} · {now} now |
| Scope chips | Admitted · Not admitted · All |
| Facet labels | Forecaster · State · Reason · Area · Panel · Year |
| Facet chips | True · False · Known true · Pending · Void · Dated · Undated · reason labels from `reason-codes.json` · area `short` names · years |
| Table headers (Statements) | State · Said · Who · Statement · Due · P · Brier · Reason |
| Table headers (Events) | Event · Area · Outcome · Claims |
| Table headers (Shared events) | Event · Forecaster · Deadlines · P · State · Cluster Brier |
| Table headers (Sensitivity) | Variant · Brier · N |
| Paging chip | Show 200 more |
| Count line | {n} shown |
| Search placeholder | quote, event or reason |
| Prev/next | ← Earlier · Later → · All statements |
| Undated chip | 24 m |
| Leaderboard footnotes | ← better · Brier |
| Donut footnote | 1 tick = 1 item · 1 tick = 1% of {total} |
| Rung footnote | 1 rung = {unit} statements |
| StateMark labels | True · False · Pending · Void |
| Coverage phrases | Full archive (tier A) · Archive plus search (tier B) · Ad hoc collection (tier C) |

---

## 9. Cut list

"Cut" means gone; "How to read" means the card's disclosure; "dateline" means the page header context line; "stamp" means the header stamp.

### Home

| String | Fate |
|---|---|
| `Forecast Ledger · interventional psychiatry and psychedelic medicine · as of 13 Sep 2026` | Masthead (title, subject); date to the stamp |
| `Muir: 1 of 2 resolved claims came true; below 10 events the ledger shows counts, not a score.` (H1) | Scoreboard value and verdict |
| Tagline paragraph | Masthead popover; About lede; metadata.description |
| `posts read · 1119 of 1124` | About dateline |
| `forward-looking claims found · 2495 statements` | Admission funnel rung "Found" |
| `dated items scored · 27 resolved · 29 pending` | Scoreboard stat list |
| `No forecaster has ten resolved events yet; the board shows counts.` | Title `Leaderboard`; takeaway `leaderboardTakeaway` |
| `Brier score · whisker = 95% interval · n = resolved events · lower is better · dashed rule = coin flip 0.25` | Legend; footnote `← BETTER` and `BRIER` |
| `Persons are ranked only when both have ten or more resolved events…` and `Comparators are ad hoc collections (tier C): rows and counts only.` | Leaderboard How to read |
| `Leaderboard · dated claims · rules v1.0.0 · as of 2026-09-13` | `HEADLINE PANEL · 3 FORECASTERS` |
| SVG `COUNTS ONLY` ×5 and `1 OF 10` | `1` + `of 10` tspans and progress ticks |
| SVG `LOWER IS BETTER · 95% RANGE` | `← BETTER`; legend `95% range` |
| `2495 statements: 27 scored, 2424 not admitted.` | Titles `Admission` and `Not admitted by reason` with takeaways |
| `one tick = 1% of statements · ink = scored · light = not admitted` | Donut key; footnote |
| SVG `2495 · 1 TICK = 1% OF 2,487` | `1 TICK = 1 ITEM` on the hero's items; the census mismatch is gone because the donut no longer mixes populations |
| `Status · every statement in the census` | Cut |
| `Calibration needs 20 resolved events; Muir has 2.` + sub + src | Waiting for data `Calibration · 13 of 20 resolved events` |
| `Muir's cumulative Brier by the quarter each claim came due.` + sub + src | Title `Brier over time`; takeaway; legend; `HEADLINE PANEL · BY DEADLINE QUARTER` |
| `Forecasters by area: darkest cell is the best score.` + sub + src | Waiting for data `Forecasters by area · 1 of 2 cells with 5 resolved events` |
| `Bold and right, or bold and wrong.` + sub + src | Waiting for data `Boldness and accuracy · 1 of 2 forecasters with a score` |
| `1 event more than one forecaster called.` + sub + src | Title `Shared events`; takeaway; How to read "The only direct comparison across persons: the same event, the same outcome."; `REGISTRY` |
| `The last 12 claims that came due.` + sub + src | Title `Claims that came due`; takeaway; legend; `HEADLINE PANEL · NEWEST FIRST` |
| `Owen Scott Muir →` … `Practice adoption →` | Two R4 link rows without arrows |
| Footer `Data 2026-09-13 · Rules 1.0.0` | Stamp |

### Forecaster

| String | Fate |
|---|---|
| `clinician · coverage tier A · Psychiatrist; Chief Medical Officer, Radial; author of…` | Dateline |
| H1 `headlineSentence` | Scoreboard verdict |
| Bio paragraph and channels `src` | `About this person` disclosure |
| Stat units `95% 0.05 to 0.32 · provisional`, `right · counts only`, `needs 10 events`, `0 paired events`, `events · 10 pending · 0 void`, `15 dated of 2118 sincere claims`, `undated panel · 24-month window · 11 events` | Score sub line; stat list; More metrics rows |
| `Where the resolved claims sit, by area.` + sub | Title `Areas`; takeaway; legend |
| `When Muir was wrong on timing, the median miss was … months.` / `No false claim has later come true yet.` | Waiting for data `Timing · 1 of 5 false claims that later came true` |
| `Base-rate comparison on … paired events…` / `No paired base rate yet.` + 7-row table | More metrics row `Skill against base rates · needs 10 paired events · 2 now` |
| `{event}: promised 8 times.` + sub | Title `Receding horizon`; takeaway |
| `50 claims against the events of the field.` + sub | Title `Claims and events`; takeaway; legend |
| `2021: 3 claims.` … one card per year | One card `Claims` |
| `2377 statements not admitted, by reason.` + sub + table | Title `Not admitted by reason`; rung bars |
| `Every statement by Muir →` | Card `n` link `2,429 STATEMENTS →` on Admission |
| `Sensitivity: the headline under other rules.` + sub + eight `–` rows | Title `Sensitivity`; short variant names; `— needs 10 · 2 now` |
| `516 commitments about Muir's own organizations…` + 40 quotes | Cut; rung `Commitment (own venture) 516` links to `/predictions?scope=not&r=CONTROL&f=owen` |
| `20 reports passed on as information…` + 40 quotes | Cut; rung `Report or scoop 20` links likewise |

### Statements

| String | Fate |
|---|---|
| `the ledger` | Cut |
| `2495 statements, every one with its quote, source and status.` | H1 `Statements`; dateline |
| `Filters live in the address bar, so a view can be shared. Each row opens the full record.` | Cut |
| `Loading the ledger…` | Kept as the Suspense fallback (R4) |
| Five `<select>` labels and `text` | Facet labels; search placeholder |
| State option `awaiting resolution` | Cut (`unresolved` folds into Pending) |
| `2495 of 2495 statements · 5 true · 22 false · …` | Chips with counts; `71 SHOWN` |
| `Showing the first 600 rows; narrow the filters to see the rest.` | `SHOW 200 MORE` chip |
| Reason code chips `OUT_OF_AREA`, `CONTROL`, `NOT_FORECAST` | `ReasonChip` with human labels |
| Chip `known, pending` | `● Known true` + `DUE {date}` |
| Chip `24m` | `24 M` |

### Statement

| String | Fate |
|---|---|
| `{Name} · 2023-06-01 · angermayer-0007` (eyebrow) | Dateline `{NAME} · SAID 1 JUN 2023 · ANGERMAYER-0007` |
| `The words.` / `verbatim quote · date · source` / `Statement · substack post · paid post` | Title `Quote`; caption |
| `The event and the rule, written before looking.` / `registry entry · criterion · …` / `Intake · coder A · rules v1.0.0` | Title `Intake`; How to read; `CODER A` |
| `{State}.` / `state at window close · outcome from the registry · score` / `Resolution · as of 2026-09-13` | Title `Resolution`; How to read; `REGISTRY` |
| `Muir put {n} deadlines on this event.` / `x = said · y = promised · accent = happened` / `Receding horizon` | Title `Receding horizon`; takeaway; legend; `CLUSTER {id}` |
| `The claim against the events of its area.` / `solid dot = said · hollow = deadline · ticks = ground-truth events` / `Trend lane` | Title `Timeline`; legend; `{AREA}` |
| `← earlier · later → · all statements` | Kept, R4 |
| Row keys `probability p(E)`, `intake readings`, `adversarial recheck`, `leave-one-event-out max change` | `Probability`, `Readings`, `Adversarial recheck` (disclosure), `Leave-one-out change` |

### Events

| String | Fate |
|---|---|
| `registry and ground truth` | Cut |
| `{n} registry events resolve every claim; {m} dated events are the record.` | H1 `Events`; dateline |
| Definition paragraph | Registry How to read |
| `Registry: the propositions the ledger scores.` / `state · date it became true · items citing it` / `Event registry` | Title `Registry`; takeaway; `REGISTRY · {n} EVENTS` |
| Criterion paragraph in every row | `details` per row |
| `Ground truth by quarter.` / `dated, sourced events used as evidence · newest first` / `Timeline · 2021 to 2026` | Title `Ground truth`; takeaway; `TIMELINE · {first} TO {last}` |

### Areas

| String | Fate |
|---|---|
| `area` | Cut |
| `{Area}: {n} admitted claims, {r} resolved.` | H1 area name; dateline |
| Definition paragraph | Lede |
| `Forecasters inside this area.` + sub + src | Title `Leaderboard`; takeaway; `{AREA} · {n} EVENTS` |
| `{n} dated items in {area}.` + sub + src | Title `Status`; takeaway; key |
| `{n} ground-truth events recorded in this area.` list card | Cut; dateline link to `/events?a={slug}` |
| `Claims against the area's events.` / `Every dated claim in the area.` + subs | Titles `Claims and events`, `Claims`; legends |
| `Base rates the ledger uses as the reference row.` table | Cut; dateline link to `/methodology#references` |

### Method

| String | Fate |
|---|---|
| `Methodology · rules v1.0.0 · as of 2026-09-13` | Stamp |
| `How a quote becomes a score` (H1) | Cut; H1 `Method`; lede sentence (6.7) |
| 18 sentence titles | Takeaways |
| 18 column-description subs | Cut |
| `src` lines with version | File path only |
| `Ranking rule: a helper canRank(a, b)…` note | Kept as R3 under the Metrics table |

### About

| String | Fate |
|---|---|
| `provenance` | Cut |
| `1119 of 1124 posts read; every number on this site traces to a quote, a rule and a source.` | H1 `About`; dateline; lede = tagline |
| `Corpus and coverage.` + sub + src | Title `Coverage`; How to read; `GENERATED …` in the dateline |
| `How the census was built.` + sub + src | Title `Pipeline`; kappa takeaway; `PROMPTS V1.0.0` |
| `{Name}: coverage tier A.` + sub + src | Title `{Name}`; `n` slot `TIER A · 2021 TO 2026`; `CORPUS` |
| `Corrections log.` card | Cut; footer link |
| `Design and code.` + sub + src | Title `Design and code`; How to read; `ATTRIBUTION` |

---

## 10. Implementation notes

### 10.1 New files

| File | What |
|---|---|
| `components/layout/Masthead.tsx` | wordmark, subject popover, nav |
| `components/layout/PageHeader.tsx` | H1, stamp, dateline, lede |
| `components/card/HowToRead.tsx` | `details.how` wrapper |
| `components/card/Locked.tsx` | `WaitingForData` card and `LockedRow` |
| `components/svg/Progress.tsx` | tick progress, pure; `progressWidth()` |
| `components/scoreboard/Scoreboard.tsx` | split card: aside, verdict, stat list, More metrics, donut |
| `components/ui/Term.tsx` | glossary link with popover |
| `components/ui/ReasonChip.tsx` | reason label chip, popover = code test, link `#rc-CODE` |
| `components/ledger/Facets.tsx` | scope control and facet rows (client) |
| `lib/content/display.ts` | `DISPLAY`, `lockState()` |
| `lib/content/chrome-terms.ts` | `CHROME_TERMS` |
| `lib/content/site.ts` | repository URL, tagline, coverage phrases |
| `tests/components/text.test.ts` | every takeaway function on a fixture and on the live `scores.json` |
| `tests/data/derive.test.ts` | `statusDonut` total, `admissionFunnel`, `reasonRungBars`, `rungUnitFor` |
| `tests/data/display.test.ts` | `lockState` on the live snapshot |

### 10.2 Changed files

| File | Change |
|---|---|
| `app/globals.css` | section 2 CSS; stacked table rules under 760px; masthead and nav breakpoints; legend glyphs `progress`, `whisker`, `whisker-dashed`, text items |
| `lib/tokens.ts` | `FONT.keyLabel { size: 8, weight: 600 }`, `FONT.keyCount { size: 9, weight: 800 }` |
| `components/card/Card.tsx`, `CardSplit.tsx`, `Legend.tsx` | props in 3.1; `aside`; new glyphs |
| `components/layout/Nav.tsx`, `Shell.tsx`, `Footer.tsx` | 1.2, 1.4, 1.5 |
| `components/ui/Stat.tsx` | `unit` removed; `sub?: string` in R4 under the value |
| `components/ui/StateMark.tsx` | `STATE_LABEL` → `True`, `False`, `Pending`, `Void` |
| `components/ui/TierBadge.tsx` | unchanged strings; renders a `Term t="evidence tier"` around the chip |
| `components/charts/layout/TickDonut.layout.ts`, `TickDonut.tsx` | 5.1 |
| `components/charts/layout/LeaderboardTickRows.layout.ts`, `LeaderboardTickRows.tsx` | 5.2 |
| `components/charts/layout/AreaRungBars.layout.ts`, `types.ts` | `rungUnit` |
| `components/charts/MatrixHeat.tsx`, `data/areas.json`, `lib/data/schema.ts` | `short` labels |
| `components/charts/BrierHairline.tsx`, `CalibrationPlumb.tsx` | footnote text |
| `components/ledger/Ledger.tsx` | scope, facets, two layouts, sort, paging, stacked rows |
| `lib/data/derive.ts` | `statusDonut` signature, `admissionFunnel`, `reasonRungBars`, `rungUnitFor`, `LedgerRow` fields `b`, `rl`, `kt`, `sr`; `STATE_WORD.known_true = "Known true"` |
| `lib/data/text.ts` | `scoreboardVerdict`, `metricNeed`, `leaderboardTakeaway`, `overTimeTakeaway`, `admissionTakeaway`, `reasonsTakeaway`, `areasTakeaway`, `calibrationTakeaway`, `matrixTakeaway`, `boldnessTakeaway`, `timingTakeaway`, `recentTakeaway`, `claimsTakeaway`, `lanesTakeaway`, `horizonTakeaway`, `sharedTakeaway`, `sensitivityTakeaway`, `statusTakeaway`, `registryTakeaway`, `groundTruthTakeaway`, `statementTitle`, `coveragePhrase`; `headlineSentence`, `leaderboardTitle`, `calibrationTitle`, `skillSentence` deleted |
| `lib/content/glossary.ts` | `slug`, `glossarySlug()` |
| `app/layout.tsx` | `metadata.description` = the tagline |
| `app/page.tsx`, `app/forecasters/[slug]/page.tsx`, `app/predictions/page.tsx`, `app/predictions/[id]/page.tsx`, `app/events/page.tsx`, `app/areas/[slug]/page.tsx`, `app/methodology/page.tsx`, `app/about/page.tsx` | section 6 |
| `docs/design-language.md` | card_anatomy: "h2 = the chart name, a noun phrase (a chart type is allowed); the conclusion is the takeaway line under it; .sub is replaced by the glyph legend and a collapsed How to read; .src carries source · scope · n." |
| `tests/components/conventions.test.ts` | `DIRS` gains `components/scoreboard`, `components/ledger`, `components/charts` (layouts included) |

### 10.3 Tests that change

- `tests/charts/TickDonut.test.ts`: 5.1 invariants; footnote strings; no `LABEL_GAP`.
- `tests/charts/LeaderboardTickRows.test.ts`: 5.2 assertions; column snapshot.
- `tests/charts/AreaRungBars.test.ts`: `rungUnit` case.
- `tests/components/card.test.tsx`: new anatomy; `sub` and `big` gone; `aside`.
- `tests/components/layout.test.tsx`: nav labels via `navLinks(hero)`; footer links; Shell masthead.
- `tests/components/ui.test.tsx`: `Term` (href, anchor id, popover text, `plain`, `side`, unknown throws, every `CHROME_TERMS` entry resolves); `ReasonChip`; `Progress`; `Stat` `sub`; `StateMark` labels.
- `tests/components/markup.test.tsx`: unchanged; the donut half frame renders at min 8px.
- New: `text.test.ts`, `derive.test.ts`, `display.test.ts`. A build check (`scripts/check-pages.ts` run after `next build`, or a vitest over the exported HTML) asserts every page has exactly one `.stamp` containing `RULES` and `AS OF`.

### 10.4 Risks

1. `Term` popovers inside `.scroll-x` are clipped: use `plain` there. The statements table is not in `.scroll-x`.
2. `content-visibility: auto` with `contain-intrinsic-size: auto 400px` reserves too much for short cards: `.card--short` sets 160px (Waiting for data, Shared events, Sensitivity).
3. `ChartFrame` renders both frames on the server; HTML-level tests count per visible frame.
4. Rules 1.1.0 field names: the Scoreboard reads `s.headline`, `s.dated`, `s.undated`, `s.headline_non_affiliated`; `hit`, `skill_base`, `skill_market`, `loo_max_change` are on the panel; `composition.affiliated_share`, `composition.scoreable_share`. All present in the live snapshot.
5. `StateMark` label change breaks the aria-label assertion in `ui.test.tsx`; update it.
6. The leaderboard half frame: five rows at 320px height give 45px pitch; the progress ticks (8px) and two-tspan values fit. If rows exceed 8, the page passes a taller `H` (the layout already takes `H`).
7. The conventions test now covers `components/charts`: check the existing chart files for `Math.random` and banned words before extending `DIRS` (use `rnd` from tokens; no `Date.now`).

---

## 11. Ordered implementation plan by file ownership

Each group owns the listed files and their tests; no two groups edit the same file. Groups 1 and 2 start first and run in parallel; groups 3 to 10 start when group 1 has merged `Card`, `PageHeader`, `Shell`, `Term`, `display.ts`, `text.ts` and `derive.ts` (the interfaces above are the contract, so page groups can code against them before the merge). Group 2 codes `Progress` usage against the interface in 3.2 and merges after group 1.

### Group 1: shared primitives, CSS, data helpers

Files: `app/globals.css`, `lib/tokens.ts`, `components/layout/Masthead.tsx` (new), `components/layout/PageHeader.tsx` (new), `components/layout/Nav.tsx`, `components/layout/Shell.tsx`, `components/layout/Footer.tsx`, `components/card/Card.tsx`, `components/card/CardSplit.tsx`, `components/card/Legend.tsx`, `components/card/HowToRead.tsx` (new), `components/card/Locked.tsx` (new), `components/svg/Progress.tsx` (new), `components/scoreboard/Scoreboard.tsx` (new), `components/ui/Term.tsx` (new), `components/ui/ReasonChip.tsx` (new), `components/ui/Stat.tsx`, `components/ui/StateMark.tsx`, `components/ui/TierBadge.tsx`, `lib/content/glossary.ts`, `lib/content/display.ts` (new), `lib/content/chrome-terms.ts` (new), `lib/content/site.ts` (new), `lib/data/text.ts`, `lib/data/derive.ts`, `app/layout.tsx`, `docs/design-language.md`, tests: `tests/components/card.test.tsx`, `layout.test.tsx`, `ui.test.tsx`, `conventions.test.ts`, `tests/components/text.test.ts` (new), `tests/data/derive.test.ts` (new), `tests/data/display.test.ts` (new).

Order inside the group: 1 CSS and tokens; 2 `Term`, `glossary.ts`, `chrome-terms.ts`; 3 `Card`, `Legend`, `HowToRead`; 4 `Progress`, `Locked`, `display.ts`; 5 `Masthead`, `PageHeader`, `Nav`, `Shell`, `Footer`; 6 `text.ts`, `derive.ts`; 7 `Scoreboard`, `Stat`, `StateMark`, `TierBadge`, `ReasonChip`; 8 tests; 9 `app/layout.tsx`, `docs/design-language.md`.

### Group 2: chart layouts

Files: `components/charts/layout/TickDonut.layout.ts`, `components/charts/TickDonut.tsx`, `components/charts/layout/LeaderboardTickRows.layout.ts`, `components/charts/LeaderboardTickRows.tsx`, `components/charts/layout/AreaRungBars.layout.ts`, `components/charts/AreaRungBars.tsx`, `components/charts/types.ts`, `components/charts/MatrixHeat.tsx`, `components/charts/BrierHairline.tsx`, `components/charts/CalibrationPlumb.tsx`, `components/charts/fixtures/*`, `data/areas.json`, `lib/data/schema.ts`, tests: `tests/charts/TickDonut.test.ts`, `LeaderboardTickRows.test.ts`, `AreaRungBars.test.ts`, `tests/components/markup.test.tsx`.

Order: 1 `types.ts` (`rungUnit`, new `TickRow` and `DonutSegmentLayout` fields); 2 TickDonut layout and renderer with tests; 3 LeaderboardTickRows layout and renderer with tests; 4 AreaRungBars `rungUnit` with test; 5 MatrixHeat short labels, `areas.json`, `schema.ts`; 6 footnote strings.

### Group 3: Home

Files: `app/page.tsx`.

### Group 4: Forecaster page

Files: `app/forecasters/[slug]/page.tsx`.

### Group 5: Statements

Files: `app/predictions/page.tsx`, `components/ledger/Ledger.tsx`, `components/ledger/Facets.tsx` (new), `tests/components/ledger.test.tsx` (new: facet counts on a fixture, scope default, sort rank, paging URL).

### Group 6: Statement detail

Files: `app/predictions/[id]/page.tsx`.

### Group 7: Events

Files: `app/events/page.tsx`.

### Group 8: Areas

Files: `app/areas/[slug]/page.tsx`.

### Group 9: Method

Files: `app/methodology/page.tsx`, `lib/content/methodology.ts` (section nouns and takeaways as data).

### Group 10: About and final checks

Files: `app/about/page.tsx`, `scripts/check-pages.ts` (new: one `.stamp` per page, no `.sub`/`.note`/`.stat-unit` in page HTML, no horizontal overflow markers), the 400px pass on every route.

Merge order: 1 and 2, then 3 to 9 in any order, then 10.
