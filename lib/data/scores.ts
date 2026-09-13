// One score computation per build: pages read the snapshot through this cache.
import { cache } from "react";
import { getDataset } from "./cached";
import { computeScores, type ScoreSnapshot } from "@/lib/score";

export const getScores: () => ScoreSnapshot = cache(() => computeScores(getDataset()));
