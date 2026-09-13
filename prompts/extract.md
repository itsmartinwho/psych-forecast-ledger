# Census extraction (prompt version 1.0.0)

You read one batch of posts by ONE forecaster and log every forward-looking statement the author makes. You never look up outcomes. You never use knowledge of what happened after the post date to decide anything. The post text and this rubric are your only inputs.

## What to log
A statement is forward-looking when, at the time of writing, it asserts, expects, doubts, or denies a future state of the world. Log it when it is:
- about the world outside the text (a regulator, a trial, a company, a payer, a court, a market, clinical practice), or about the author's own organization (log it; it is coded CONTROL below);
- the author's own view (quoted claims by others are logged only when the author explicitly endorses or rejects them; then the author's stance is the statement).
Log hedged claims ("may", "could"), negative claims ("will not", "never", "is dead"), conditional claims ("if the FDA approves, then"), numeric or dated claims, and claims inside satirical posts when the claim reads as sincere. Do not log "should" or "must" statements, questions, past analysis, or generic truisms ("things change").

## Fields per statement
- quote: verbatim from the text, 12 to 700 characters, may elide with "..." inside; must be a substring of the post after whitespace normalization.
- context: up to 400 characters of your own words naming the entities and the claim in the third person.
- sincere: false only when the framing is satire, parody, fiction, or a joke.
- area: one of regulatory, clinical_trial, company_market, payer_policy, practice_adoption, or "other".
- horizon_text: the time words in the quote ("by 2024", "this year", "soon", "never", "Q4 2023") or "none".
- entities: names mentioned (companies, drugs, devices, agencies, payers, laws).
- proposed_status and proposed_reason: "admitted" when a third party decides an observable outcome in one of the five areas and the claim can be written as an event; otherwise "not_admitted" with one reason code:
  - SATIRE: the framing is satire or fiction.
  - THIRD_PARTY: a quoted or paraphrased claim by someone else, not endorsed by the author.
  - NORMATIVE: "should", "must", a wish, or advice.
  - CONTROL: the author's own organization (Radial, Neurolief, Fermata, Acacia, Ampa trial sites, Psyrin, Videra, RAMHT events, this newsletter) decides whether it happens: openings, launches, hires, publications by the author, events, products.
  - REPORT: the statement passes on information ("sources say", "I am told", "we were told", "will be announced") or names another organization's internal action 30 days or less ahead (layoffs, closures, a meeting).
  - KNOWN: the outcome was already public on the post date (the post reports it).
  - OUT_OF_AREA: none of the five areas (AI, culture, politics, personal life, general medicine outside psychiatry).
  - VAGUE: no observable event, threshold, or entity can be written from the text ("things will get interesting", "the future is bright", "game changer").
  - UNDATED is not a reason at this stage; undated but otherwise admissible claims are "admitted" with horizon_text "none".
- affiliated_hint: true when the claim is about a third-party decision on an entity where the author has a disclosed role (for Owen: Radial, Neurolief, Fermata, Acacia, Ampa, Psyrin, Videra; FDA decisions on Neurolief devices are affiliated, not CONTROL).

## Output
One JSON object: { "forecaster_id", "batch", "posts": [{ "slug", "post_date", "audience", "read": true|false, "statements_found": n }], "statements": [ ...fields above plus "post_slug", "post_date" ] }.
Include every post in the batch in "posts" even when it yields nothing. Be exhaustive: a borderline forward-looking statement logged as not_admitted with a reason is better than an omission.
