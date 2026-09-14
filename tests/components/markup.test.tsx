import { describe, expect, it } from "vitest";
import { TickDonut } from "@/components/charts/TickDonut";
import { tickDonutFixture } from "@/components/charts/fixtures/TickDonut.fixture";
import { countAccent, countHex, minFontSize, renderMarkup } from "@/lib/testing/markup";
import { FONT, PALETTE } from "@/lib/tokens";

describe("lib/testing/markup", () => {
  it("renders static markup", () => {
    expect(renderMarkup(<p className="sub">hi</p>)).toBe('<p class="sub">hi</p>');
  });
  it("counts the accent hex regardless of case", () => {
    const m = renderMarkup(
      <svg>
        <circle fill={PALETTE.accent} />
        <circle fill={PALETTE.accent.toLowerCase()} />
        <circle fill={PALETTE.ink} />
      </svg>,
    );
    expect(countAccent(m)).toBe(2);
    expect(countHex(m, PALETTE.ink)).toBe(1);
    expect(countAccent("")).toBe(0);
  });
  it("finds the smallest font size", () => {
    const m = renderMarkup(
      <svg>
        <text fontSize={9.5}>a</text>
        <text fontSize={6.5}>b</text>
        <text style={{ fontSize: 8 }}>c</text>
      </svg>,
    );
    expect(minFontSize(m)).toBe(6.5);
    expect(minFontSize("<svg></svg>")).toBeNull();
  });
  it("guards the donut half frame at 8px, so a 368px render stays above the floor", () => {
    const m = renderMarkup(<TickDonut data={tickDonutFixture} size="half" />);
    expect(minFontSize(m)).toBe(8);
    expect(8 * (368 / 400)).toBeGreaterThanOrEqual(FONT.floorHalf);
  });
});
