// Chart agents append entries here; app/(dev)/gallery renders every entry in both frames.
// Keep this file free of JSX (it is .ts): build nodes with createElement or import a component and call it.
import { createElement, type ReactNode } from "react";
import { AreaRungBars } from "@/components/charts/AreaRungBars";
import { LeaderboardTickRows } from "@/components/charts/LeaderboardTickRows";
import { TickDonut } from "@/components/charts/TickDonut";
import { admissionRungBarsFixture, areaRungBarsFixture } from "@/components/charts/fixtures/AreaRungBars.fixture";
import { leaderboardTickRowsFixture } from "@/components/charts/fixtures/LeaderboardTickRows.fixture";
import { tickDonutCensusFixture, tickDonutFixture } from "@/components/charts/fixtures/TickDonut.fixture";

export interface GalleryEntry {
  title: string;
  wide: ReactNode;
  half: ReactNode;
}

export const GALLERY: GalleryEntry[] = [
  {
    title: "Tick donut · key column",
    wide: createElement(TickDonut, { data: tickDonutCensusFixture, size: "wide" }),
    half: createElement(TickDonut, { data: tickDonutFixture, size: "half" }),
  },
  {
    title: "Leaderboard tick rows · value and evidence columns",
    wide: createElement(LeaderboardTickRows, { data: leaderboardTickRowsFixture, size: "wide", ranked: true }),
    half: createElement(LeaderboardTickRows, { data: leaderboardTickRowsFixture, size: "half", ranked: true }),
  },
  {
    title: "Rung bars · one rung = 50 statements",
    wide: createElement(AreaRungBars, { data: admissionRungBarsFixture, size: "wide" }),
    half: createElement(AreaRungBars, { data: areaRungBarsFixture, size: "half" }),
  },
];
