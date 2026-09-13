import { describe, expect, it } from "vitest";
import { countAccent, renderMarkup } from "@/lib/testing/markup";
import { FONT, HALO, LADDER, PALETTE, STROKE } from "@/lib/tokens";
import { Halo } from "@/components/svg/Halo";
import { Baseline } from "@/components/svg/Baseline";
import { BarcodeFloor } from "@/components/svg/BarcodeFloor";
import { Whisker } from "@/components/svg/Whisker";
import { Leader } from "@/components/svg/Leader";
import { MedianFlag } from "@/components/svg/MedianFlag";
import { Footnote } from "@/components/svg/Footnote";
import { Mark, TINY_RADIUS } from "@/components/svg/Mark";
import { Hairline, hairlineWidth } from "@/components/svg/Hairline";
import { Tick } from "@/components/svg/Tick";

const svg = (node: React.ReactNode) => renderMarkup(<svg viewBox="0 0 400 320">{node}</svg>);

describe("Halo", () => {
  it("is weight 800 with a 3px paper stroke painted under the fill", () => {
    const m = svg(<Halo x={10} y={20}>0.23</Halo>);
    expect(m).toContain('font-weight="800"');
    expect(m).toContain('paint-order="stroke fill"');
    expect(m).toContain(`stroke="${HALO.stroke}"`);
    expect(m).toContain('stroke-width="3"');
    expect(m).toContain('class="halo"');
    expect(m).toContain(`fill="${PALETTE.ink}"`);
    expect(m).toContain(`font-size="${FONT.value.max}"`);
    expect(m).toContain(">0.23</text>");
  });
  it("takes a stagger delay and an anchor", () => {
    const m = svg(<Halo x={0} y={0} anchor="end" delay={24}>x</Halo>);
    expect(m).toContain('text-anchor="end"');
    expect(m).toContain("animation-delay:24ms");
  });
});

describe("Baseline", () => {
  it("draws one 0.8px ink line plus ticks and labels", () => {
    const m = svg(<Baseline x1={10} x2={390} y={300} ticks={[10, 200, 390]} labels={["a", "b", "c"]} />);
    expect(m.match(/<line /g)?.length).toBe(4);
    expect(m.match(new RegExp(`stroke-width="${STROKE.baseline}"`, "g"))?.length).toBe(4);
    expect(m).toContain(`stroke="${PALETTE.ink}"`);
    expect(m).toContain(`font-size="${FONT.axis.size}"`);
    expect(m).toContain(">b</text>");
  });
});

describe("BarcodeFloor", () => {
  it("draws one 0.6px faint tick per unit", () => {
    const m = svg(<BarcodeFloor xs={[0, 10, 20, 30]} y={300} />);
    expect(m.match(/<line /g)?.length).toBe(4);
    expect(m.match(new RegExp(`stroke-width="${STROKE.hairline}"`, "g"))?.length).toBe(4);
    expect(m.match(new RegExp(`stroke="${PALETTE.faint}"`, "g"))?.length).toBe(4);
  });
  it("marks every n-th tick as major", () => {
    const m = svg(<BarcodeFloor xs={[0, 10, 20, 30, 40]} y={300} major={2} />);
    expect(m.match(new RegExp(`stroke="${PALETTE.muted}"`, "g"))?.length).toBe(3);
  });
});

describe("Whisker", () => {
  it("is a 0.8px line with 7px perpendicular caps", () => {
    const m = svg(<Whisker x1={20} y1={50} x2={120} y2={50} />);
    expect(m.match(/<line /g)?.length).toBe(3);
    expect(m).toContain(`stroke-width="${STROKE.whisker}"`);
    expect(m).toContain('x1="20" y1="46.5" x2="20" y2="53.5"');
    expect(m).toContain('x1="120" y1="46.5" x2="120" y2="53.5"');
  });
  it("keeps caps perpendicular on a vertical whisker", () => {
    const m = svg(<Whisker x1={40} y1={10} x2={40} y2={90} />);
    expect(m).toContain('x1="43.5" y1="10" x2="36.5" y2="10"');
  });
});

describe("Leader and MedianFlag", () => {
  it("leader is dotted 1 3", () => {
    const m = svg(<Leader x1={0} y1={0} x2={10} y2={10} />);
    expect(m).toContain('stroke-dasharray="1 3"');
    expect(m).toContain(`stroke="${PALETTE.muted}"`);
  });
  it("median flag is dashed 2 4 with an uppercase 7px note", () => {
    const m = svg(<MedianFlag x1={100} y1={300} x2={100} y2={40} label="median 14 mo" />);
    expect(m).toContain('stroke-dasharray="2 4"');
    expect(m).toContain(">MEDIAN 14 MO</text>");
    expect(m).toContain(`font-size="${FONT.footnote.size}"`);
  });
});

describe("Footnote", () => {
  it("is uppercase 7px 600 with .12em tracking in the fifth ladder step", () => {
    const m = svg(<Footnote x={0} y={310}>brier · lower is better</Footnote>);
    expect(m).toContain('font-size="7"');
    expect(m).toContain('font-weight="600"');
    expect(m).toContain('letter-spacing="0.12em"');
    expect(m).toContain(`fill="${LADDER[4]}"`);
    expect(m).toContain(">BRIER · LOWER IS BETTER</text>");
  });
});

describe("Mark", () => {
  it("solid is ink fill, hollow is paper fill with a 0.9px ink stroke, tiny is r 1.2", () => {
    const solid = svg(<Mark cx={5} cy={5} r={4} variant="solid" />);
    expect(solid).toContain(`fill="${PALETTE.ink}"`);
    expect(solid).toContain('class="mark mark--solid"');
    const hollow = svg(<Mark cx={5} cy={5} r={4} variant="hollow" />);
    expect(hollow).toContain(`fill="${PALETTE.paper}"`);
    expect(hollow).toContain(`stroke="${PALETTE.ink}"`);
    expect(hollow).toContain(`stroke-width="${STROKE.hairlineMax}"`);
    const tiny = svg(<Mark cx={5} cy={5} r={9} variant="tiny" />);
    expect(tiny).toContain(`r="${TINY_RADIUS}"`);
    expect(tiny).toContain(`fill="${LADDER[4]}"`);
  });
  it("carries a title for a real record and a delay for stagger", () => {
    const m = svg(<Mark cx={5} cy={5} title="E-0001 · hit" delay={12} className="pop" />);
    expect(m).toContain("<title>E-0001 · hit</title>");
    expect(m).toContain("animation-delay:12ms");
    expect(m).toContain('class="mark mark--solid pop"');
  });
  it("uses the accent only when asked, and then once", () => {
    const m = svg(<Mark cx={5} cy={5} color={PALETTE.accent} />);
    expect(countAccent(m)).toBe(1);
    expect(countAccent(svg(<Mark cx={5} cy={5} />))).toBe(0);
  });
});

describe("Hairline and Tick", () => {
  it("hairline width stays in the 0.5 to 0.9 band", () => {
    expect(hairlineWidth(0.1)).toBe(0.5);
    expect(hairlineWidth(2)).toBe(0.9);
    expect(hairlineWidth(0.7)).toBe(0.7);
    const m = svg(<Hairline x1={0} y1={10} x2={400} y2={10} width={3} dash="2 5" />);
    expect(m).toContain('stroke-width="0.9"');
    expect(m).toContain(`stroke="${PALETTE.grid}"`);
    expect(m).toContain('stroke-dasharray="2 5"');
  });
  it("tick points in the given direction and labels past its end", () => {
    const down = svg(<Tick x={50} y={300} label="JAN" />);
    expect(down).toContain('x1="50" y1="300" x2="50" y2="304"');
    expect(down).toContain(">JAN</text>");
    const left = svg(<Tick x={50} y={100} direction="left" length={6} />);
    expect(left).toContain('x2="44" y2="100"');
    expect(left).not.toContain("<text");
  });
});
