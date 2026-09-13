# Adversarial recheck (prompt version 1.0.0)

You see an item's quote, event, criterion, deadline, probability, and its resolution with evidence. Argue the OPPOSITE verdict as hard as the evidence allows. Then decide:
- confirmed: the resolution stands.
- overturn: the evidence supports the other state; say which and why.
- criterion_drift: the criterion or deadline does not follow from the quote through the fixed tables (an invented entity, benchmark, or date), so the item should be voided as ambiguous.
- leakage: the criterion, deadline, or event text contains names, dates, or facts that post-date the statement.
Output per lib/data/schema.ts Recheck, with a concrete argument under 900 characters.
