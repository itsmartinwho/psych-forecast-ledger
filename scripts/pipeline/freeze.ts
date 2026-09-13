// Freeze the intake files: hash and timestamp before any outcome is looked up (rule 12).
import fs from "node:fs";
import { rel, readJson, writeJson, sha256, appendAudit } from "./common";
const release = process.argv[2] ?? "1.0.0";
const files = ["data/intake/owen.json", "data/intake/angermayer.json", "data/intake/doblin.json", "data/intake/coder-b/owen.json", "data/intake/coder-b/angermayer.json", "data/intake/coder-b/doblin.json", "data/registry/events.json", "data/statements/owen.json", "data/statements/angermayer.json", "data/statements/doblin.json"].filter((f) => fs.existsSync(rel(f)));
const entry = { release, frozen_at: new Date().toISOString(), files: files.map((f) => ({ path: f, sha256: sha256(fs.readFileSync(rel(f), "utf8")) })), note: "Intake frozen before resolution; every item in this release is retrospective (coded after its outcome was public) unless tagged prospective." };
const existing = fs.existsSync(rel("data/intake/freeze.json")) ? readJson<{ releases: unknown[] }>(rel("data/intake/freeze.json")) : { releases: [] };
existing.releases.push(entry);
writeJson(rel("data/intake/freeze.json"), existing);
appendAudit({ script: "freeze", release, files: entry.files.length });
console.log(`frozen ${entry.files.length} files for release ${release} at ${entry.frozen_at}`);
