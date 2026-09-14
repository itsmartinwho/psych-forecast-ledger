# Design language brief (lieflat-charts)

Source: https://github.com/larashero3-dotcom/lieflat-charts (PolyForm Noncommercial). We follow the design language and token values and write our own components; no template code is copied.

## tokens

Mono: paper #F0EFEB, ink #1C1C1A, muted #8F8E88, faint #C6C5BF, grid #DEDDD6; ladder #1C1C1A #4A4944 #6A6963 #8F8E88 #B0AFA9 #C6C5BF #D8D7D1 (darkest = most important); dark card #1C1C1A, ink #F0EFEB, grid #2E2D29. Porcelain (ordinal blue): BG #F7F2EB, TXT/HERO #081F5C, DATA #334EAC, DATA2 #7096D1, light #BAD6EB. Palm (categorical): BG #F0EFEB, TXT #58402E, CAT4 #43593B #77835A #ACAD79 #F2D17E, HERO #D4A017. Wire (mono + accent): BG #F0F0EE, TXT #1F1E1C, DATA #22211F, DATA2 #8F8E86, HERO #F5572F on one element. Color: strokes x1.8, opacity floor .85, one system per deliverable.

## typography

Inter only. Four registers. R1 Title: H1 24px/800, card h2 16.5px/700, spacing -.02em (19px .big for the gallery only). R2 Takeaway: 13px/500 ink; big numbers 26px/800 and 20px/800. R3 Body: 12.5px/400 gray-2, 11.5px in tables, 13px for the verbatim quote. R4 Meta: 9.5px/600 uppercase, spacing .08em, muted (nav, stamp, dateline, legend, chips, table headers, src, footer). Axis 9.5px/600. In-chart values always 800 (9-11px). Row labels 7-8.5px/700 #6A6963. SVG footnote 7px/600 uppercase, spacing .12em, #B0AFA9. Floor 6.5px (half card), 5.5px (wide); move to hover, never shrink.

## card_anatomy

Six parts in a fixed order. .card-head = h2 + optional .card-n count. h2 = the chart name, a noun phrase of one to four words (a chart type is allowed: "Leaderboard"); never a conclusion. .takeaway = the conclusion: one computed sentence under the title (13px/500, ink, max 70ch). .legend = uppercase glyph items (9.5px/600), only when the chart draws two or more mark kinds; glyphs: solid, hollow, void, tick, dash, accent, progress (three ticks), whisker (solid or dashed), text (no glyph). .chart: SVG viewBox 400x320 (half) or 800x300 (wide). details.how = "How to read", collapsed body text (12.5px) for axis meanings, method notes and a "Method ›" link. .src = SOURCE · SCOPE · N, uppercase, at most three fragments, never the version or the date. Wide cards may use .split: a 250px aside (head, takeaway, then the aside node) beside the chart. .sub, .note and .stat-unit stay in CSS for the gallery only. An uppercase SVG footnote states the unit or direction only ("← BETTER", "BRIER", "1 RUNG = 50 STATEMENTS"); it never restates the legend.

## layout_grammar

Body padding 40px on paper. .grid2: two equal columns, gap 22px, max-width 1100-1400px; .wide spans both. Cards share the page color, radius 24px, padding 24px 24px 18px (20px 16px 16px and radius 16px under 760px), no border, no shadow; whitespace separates cards. Hairlines 0.5-0.9px (#DEDDD6, #E3E2DB) carry structure: ledger lines, barcode floors (one tick per time unit), dotted guides '2 5'. No axis spines: one 0.8px baseline plus ticks. Max one dark card in four.

## motion

Entry on by default: 900ms (1200ms big), quarticOut/cubicOut, no bounce. CSS: .pop scale-in .5s, .fade .9s, .draw dashoffset 1s with pathLength=1. Stagger: dots 8-15ms, bars 80-130ms. Reveal on scroll-in (IntersectionObserver .3), replay on click, clear timers first. prefers-reduced-motion turns it off. Motion never dictates layout.

## families

Lupi Editorial (L1-L20, hand SVG): one mark = one record, 0.5-0.7px hairlines, no pre-aggregation, marginal notes, 30s+ reading; reports and stories. Lupi Basics (F1-F17, SVG): familiar silhouettes rebuilt from countable units (one rung = $1k, one tick = 1%); sparse data with density. Glance (G3-G22, Chart.js/ECharts): pre-aggregated, 2px+ strokes, big numbers, <10s; dashboards. Fixed order: Editorial, Basics, then Glance with a written reason.

## annotation_rules

Label heroes only: top 2-3 peaks, best and worst, strongest cell, with a minimum gap so labels never collide. Values 800 with a paper halo (paint-order:stroke, 3px). Hollow vs solid encodes state (weekend, before, outlier). Dashed '2 3' outline marks the key cell; dotted '1 3' leaders tie outside labels; medians are dashed '2 4' flags with an uppercase note. Real records get <title> tooltips; decoration gets none; over 50 marks need hover.

## anti_patterns

No broken axes (let outliers tower, add a magnifier, or tear the bar and say so). No gradients, glow, shadows, glass, 3D. No colors outside the ladder or one preset. No multi-hue for one series; no color above 6 categories. No radius from raw value (use sqrt). No Math.random (use rnd). No chart-type titles. No text below the floor. No hover on decoration. No hybrids of two templates. No radar redesign.

## chart_map

```json
[
 {
  "need": "Leaderboard (Brier + CI)",
  "family": "Lupi Basics",
  "template": "F5 Tick Rows + F15 whisker",
  "how": "One row per forecaster sorted by Brier; 0.8px whisker over the CI with 7px caps; solid ink dot at the score; value in 800 at row end; leader in INK; footnote 'BETTER ←'."
 },
 {
  "need": "Calibration diagram",
  "family": "Lupi Basics",
  "template": "F8 Plumb Scatter",
  "how": "x = confidence bin, y = hit rate; dashed 45-degree hairline as the ideal; one dot per bin, radius sqrt(n); plumb lines to a barcode floor; halo label on the largest gap."
 },
 {
  "need": "Brier over time",
  "family": "Lupi Basics",
  "template": "F2 Hairline Line (<=30) or L3 Barcode Lollipop (60+)",
  "how": "Calendar floor, one tick per period; 1px ink path with .draw; one dot per period, hollow when few resolutions; halo labels on best and worst; sub 'lower is better'."
 },
 {
  "need": "Per-area breakdown",
  "family": "Lupi Basics",
  "template": "F1 Rung Bars (counts) or F5 Tick Rows (scores)",
  "how": "One ladder per area; one rung = one resolved prediction; rung width and opacity jittered with rnd; faint dot every fifth rung; count in 800 on top."
 },
 {
  "need": "Prediction ledger",
  "family": "Lupi Editorial",
  "template": "L9 Bubble Almanac rows (or L12 Colonnade)",
  "how": "Ledger hairlines every ~7px; one row per prediction, uppercase date at left; hairline from date made to resolution = horizon; confidence as dot area sqrt(c); solid = hit, hollow = miss, tiny dot = void."
 },
 {
  "need": "Timeline vs events",
  "family": "Lupi Editorial",
  "template": "L11 Trend Lineage (horizontal)",
  "how": "One lane per prediction over hairline month rules; solid dot at date made, hollow at resolution, dashed while pending, line runs past today if open; events as ink ticks on a top rail."
 },
 {
  "need": "Resolved / pending / void",
  "family": "Lupi Basics",
  "template": "F4 Tick Donut (or L14 Hundred Field)",
  "how": "100 ticks on a dial, one tick = 1% or one prediction; resolved INK, pending #8F8E88, void #B0AFA9; one empty tick between segments; total 22px/800 in the center; dotted leaders to labels."
 },
 {
  "need": "Boldness vs accuracy",
  "family": "Lupi Basics",
  "template": "F8 Plumb Scatter",
  "how": "x = mean distance from 50%, y = 1 - Brier; one dot per forecaster with a 0.55px plumb line; best and worst in INK r 4.6 with halo labels, others r 2.6; floor labels 'HEDGED' and 'BOLD'."
 },
 {
  "need": "Timing-error distribution",
  "family": "Lupi Basics",
  "template": "F14 Rung Histogram or F15 Tick Box (per forecaster)",
  "how": "Bins with meaning (early, on time, late); one rung = one prediction; zero as a 1.5px ink line; dashed median flag. Groups: capsule box rx 9 for IQR, paper median tick, hollow outliers."
 },
 {
  "need": "Cross-forecaster by area",
  "family": "Lupi Editorial",
  "template": "L16 Matrix Heat (G20 for fast read)",
  "how": "Rows = forecasters, columns = areas, 22px cells rx 4; shade = Brier in five ladder steps, darkest = best; empty cell = 0.9px dot; dashed square on the best cell; five-step legend."
 }
]
```

## react_notes

Hand-written SVG with d3-scale and d3-shape is the natural port: Lupi and Basics are plain SVG primitives placed by small scale functions, so one record = one React element. Use scaleLinear/scaleBand for position, d3-shape for paths, and a tokens.ts with palette, FONT, MOTION and the rnd, blob, sect helpers. Card = one component (title, takeaway, n, legend, how, src, children). Animate with CSS classes and animation-delay, gated by IntersectionObserver; honor reduced motion. Use ECharts only for Glance shapes (jitter strip, diverging bar), themed with tipLight; never mix engines in one card.

## license_note

PolyForm Noncommercial 1.0.0: noncommercial use, changes and sharing allowed; commercial use needs the author's permission. Follow the design language and token values and write your own components; do not copy template code verbatim or ship gallery files. Chart.js (MIT), ECharts (Apache-2.0), Inter (OFL) keep their own licenses.
