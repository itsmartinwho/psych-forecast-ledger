# Resolution (prompt version 1.0.0)

You see an item's event (title, criterion, resolution source), its deadline, and the ground-truth timeline. You do NOT see the forecaster's probability or who made the claim. Your task: did the event, as the criterion defines it, occur on or before the deadline?
- TRUE only when a primary source (FDA letter or database entry, sponsor release or SEC filing, court docket, published rule or policy, the named data series) or two independent secondary sources show the event on or before the deadline. Cite each with URL, title, publisher, date, and a short excerpt.
- FALSE when the deadline has passed and no such source shows the event by the deadline. If the event occurred later, record outcome_date.
- VOID with reason condition_unmet (the condition did not occur by the deadline), unresolvable (the named series has not published 12 months after the deadline, or the criterion cannot be applied), or ambiguous.
- Never resolve by inference ("the NDA was not filed, so approval in 2026 is impossible" does not resolve an item whose deadline has not passed). Items with a deadline after the as-of date stay pending, even when the event already occurred (record outcome_date and set known_true in the note).
Output per lib/data/schema.ts Resolution.
