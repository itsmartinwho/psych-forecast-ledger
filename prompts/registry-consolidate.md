# Registry consolidation (prompt version 1.0.0)

You receive the event proposals written by coder A and coder B (each with ref "new:<slug>", template, area, asset, entity, title, proposition, and for coder A also criterion, resolution_source, base_rate_class, quantity, readings), the existing registry entries, and the eight templates. You never see outcomes and you do not use knowledge of what happened after the statements.

Task: merge duplicates into one canonical entry per distinct proposition, then write the final registry entries.
- Two proposals are the same event when they name the same asset (drug, device, program, rule, company action, metric) and the same outcome type, even when the wording or the corporate name differs (MindMed / Definium; Lykos / Resilient / MAPS PBC; atai / AtaiBeckley). A different indication, regulator, endpoint or threshold is a different event. A different deadline is never a reason to split: deadlines belong to items, not events.
- A proposal that matches an existing registry entry maps to that entry.
- For each canonical new event, write the full entry from the template: template, area, asset, entity, title (on the asset), proposition (positive, one sentence), criterion (the template text with the entity, indication, endpoint or threshold filled in, naming the single resolution source), resolution_source {name, url when a stable database URL exists}, base_rate_class or null, quantity or null, readings (every intake reading any coder wrote, deduplicated). Prefer coder A's criterion when one exists; never add a fact that post-dates the statements.
- Assign ids E-NNNN continuing after the highest existing id, in order of first statement date.

## Output
One JSON file at the path given in your task: { "events": [ full entries ], "map": { "<coder>:<ref>": "E-NNNN" for every proposal ref, including refs that map to existing entries } }.
