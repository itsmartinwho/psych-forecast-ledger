// React-side entry: one dataset read per request. Server components import this; scripts import ./load.
import { cache } from "react";
import { loadDataset, type Dataset } from "./load";

export const getDataset: (root?: string) => Dataset = cache((root?: string) => loadDataset(root));
