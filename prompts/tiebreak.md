# Admission tiebreak, coder C (prompt version 1.0.0)

Coders A and B disagreed on whether these statements are admitted. You see each statement (quote, context, date, horizon words, confidence words, entities), the affiliations, the registry, the templates, the lexicon, the anchor table and the reason codes. You do not see the other coders' answers and you never see outcomes. Decide admission under the same tests as coder A (prompts/intake-a.md, section 1). When you admit, also write the event (existing id or proposal), deadline with origin and text, asserts, bin or p_stated, phrase, affiliated and tags exactly as coder A would. When you reject, give one reason code.

## Output
One JSON file at the path given in your task: { "coder": "C", "run": "<run id>", "records": [ same record shape as coder A ] }.
