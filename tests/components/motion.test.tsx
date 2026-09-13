import { describe, expect, it } from "vitest";
import { renderMarkup } from "@/lib/testing/markup";
import { Reveal, REDUCED_MOTION_QUERY } from "@/components/motion/Reveal";
import { ChartFrame, FRAME_BREAKPOINT, WIDE_QUERY, frameMode } from "@/components/motion/ChartFrame";

describe("Reveal", () => {
  it("renders div.reveal without is-in on the server", () => {
    const m = renderMarkup(
      <Reveal>
        <svg />
      </Reveal>,
    );
    expect(m).toBe('<div class="reveal"><svg></svg></div>');
  });
  it("merges an extra class and uses the reduced-motion query", () => {
    expect(renderMarkup(<Reveal className="x">y</Reveal>)).toBe('<div class="reveal x">y</div>');
    expect(REDUCED_MOTION_QUERY).toBe("(prefers-reduced-motion: reduce)");
  });
});

describe("ChartFrame", () => {
  it("server markup shows the wide layout and hides the half one", () => {
    const m = renderMarkup(<ChartFrame wide={<b>W</b>} half={<i>H</i>} />);
    expect(m).toContain('class="chart-frame chart-frame--wide" data-mode="wide"');
    expect(m).toContain('<div class="chart-frame-wide"><b>W</b></div>');
    expect(m).toContain('<div class="chart-frame-half" hidden=""><i>H</i></div>');
  });
  it("frameMode is a pure rule at 760px", () => {
    expect(FRAME_BREAKPOINT).toBe(760);
    expect(WIDE_QUERY).toBe("(min-width: 760px)");
    expect(frameMode(759)).toBe("half");
    expect(frameMode(760)).toBe("wide");
    expect(frameMode(1400)).toBe("wide");
  });
});
