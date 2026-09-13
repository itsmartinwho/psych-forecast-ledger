# Paid post capture through the user's browser session

The user subscribed to The Frontier Psychiatrists on 2026-09-13 and authorized reading paid posts through their logged-in Chrome session with Claude in Chrome (navigate and get_page_text). No cookies, passwords or credentials are handled; nobody types into a login form. A page that shows a paywall or login prompt is recorded as "paywalled" and skipped.

Batches live in data/raw/paid-batches/batch-NN.json. For each post the agent navigates to the URL in its own tab, waits two seconds, reads the page text, checks the title and length against the archive word count (80 percent), scrolls and retries once when short, writes the text to data/raw/paid/_tmp/<slug>.txt and runs scripts/save-post-text.ts, which strips Substack navigation, hashes the text, judges stubs and writes data/raw/paid/<slug>.json. scripts/paid-manifest.ts lists what is still missing; scripts/coverage.ts reports the census coverage.
