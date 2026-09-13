# The old tool (sipp-sage-tracker) and what we keep

## data_model

Person: id, name, photoUrl, shortBio, averageAccuracy (1-3), categoryAccuracy {economy, politics, technology, foreign_policy, social_trends}, patternAnalysis (text), predictions[]. Prediction: id, dateStated, predictedOutcome, category (5 values), timeframe (free text), verificationStatus (verified|pending|unverified), actualOutcome?, accuracyRating? (1-3), normalizedScore?, analysisExplanation?. preloadData.cjs adds source (URL) but the SIPP type drops it. No resolution date, confidence, or rater.

## pages

Two routes. '/' Index: title PROPHET; Dashboard with name/bio search, category select (all + 5), sort toggle (highest/lowest), card grid. Card links to '/sipp/:id'. SippDetail: avatar, name, bio, overall badge; tabs Predictions (list, newest first), Analysis (category bar chart + patternAnalysis), Detailed Analysis (sub-tabs Overview, Categories, Patterns & Bias). Data: fetch /data/sippData.json; fallback to hard-coded SIPP_DATA or a live GPT-4o call.

## visuals

1 SippCard: photo, accuracy badge (<1.7 red, <2.3 amber, else green), 'scale: 1-3', top-2 category badges; a category filter swaps in that category score. 2 Analysis tab: vertical bar chart, 5 categories, domain 0-3. 3 Overview: big 'x.x out of 3.0' plus pie of verified ratings in 3 bins (<1.5, 1.5-2.5, >=2.5). 4 Categories: sorted horizontal bars colored by thresholds, Strongest/Weakest badges. 5 Patterns: BiasPattern cards with '% of predictions', templated prose, up to 3 wrong predictions. 6 PredictionItem: category-colored border, date, 'x.x/3' badge, 'Normalized', predicted vs actual, analysis line. 7 AccuracyChart.tsx: animated bars, never imported.

## metrics

Rating 1 wrong, 2 partial, 3 correct; fractions allowed. averageAccuracy = mean over verified predictions; categoryAccuracy = per-category mean; empty category = overall mean; zero verified = 2.0. assessPrediction (unused by preload): start 2, keyword matches on outcome text set 1 or 3; 'off by N%' shifts +/-0.5 against CATEGORY_VARIANCE (economy 5/15%, politics 10/20%, tech 30/50%, foreign 20/40%, social 25/45%); if both texts hold a percent, |pred-actual|/actual maps to 3/2/1. Two 'normalized' formulas: app = rating x CATEGORY_DIFFICULTY (0.9, 0.8, 0.7, 0.75, 0.6); preload = rating/3. Bias: keyword counts / verified count; an && vs || precedence bug ignores the rating. Fallback category mix 20/25/20/15/20%. No n, CI, time or confidence weighting.

## data_provenance

Three generators, all LLM or random. (a) utils.ts fetchSippPredictions: browser gpt-4o, temp 0.8, asks to 'generate 50 realistic predictions' the person 'likely made', with invented outcome and rating. Fabrication; API key in client. (b) preloadData.cjs fetchPredictionsForSipp: gpt-4o Responses API with web_search, temp 0.2, 'never invent'; the model returns quote, URL, date, outcome and its own 1-3 rating. If parsing yields zero, createFallbackPredictions makes 50 template sentences with random fill-ins, 70% 'verified', rating = 2 + bell noise clamped 1-3, outcome text derived from the rating, explanation random. The parser reads response.output.content[0].text, not the Responses API shape, so the fallback likely produced sippData.json. A second gpt-4o call writes patternAnalysis. (c) sippData.ts: every person shares the same 13 sample predictions with a hand-typed average; loadRealSippData gives random ratings to every third prediction.

## flaws

1 No ground truth: predictions, outcomes and ratings come from one LLM pass or a random generator. 2 Grader = generator. 3 Deliberate noise: Dashboard.validateSippScores and loadRealSippData replace any 2.0 or equal scores with random +/-0.4 values, so ranks change per load. 4 Dashboard overwrites JSON averages with hard-coded ones; card and detail scores disagree. 5 Empty categories inherit the overall mean. 6 Means of ordinal 1-3 values with no n, CI or base rate. 7 Two inconsistent normalizations with guessed weights. 8 Keyword scoring of free text; precedence bug in bias detection. 9 Only model-chosen 'verified' items count. 10 Fallback templates put fake facts in quoted 'predictions'. 11 'Detailed analysis' is a string template. 12 Pending items have no resolution date. 13 Debug logs and toasts ship to users.

## keep

Person page with a prediction ledger (quote, date, category, timeframe, status, actual outcome, explanation); index search, category filter and sort; strongest/weakest summary; category bars on a fixed domain; rating distribution chart; one shared color scale; the 5-category taxonomy as a start; pending vs resolved states; a build-time JSON data file; the wrong-prediction post-mortem list.

## drop

LLM 'likely' predictions and LLM self-rating; template/random fallback data; random variance injection and 2.0 hacks; hard-coded per-person averages; keyword assessPrediction and CATEGORY_VARIANCE; difficulty multipliers and rating/3 'normalized'; keyword bias detection and templated prose; empty-category fill; client-side OpenAI key; unused AccuracyChart.tsx; debug logging. Replace with human-sourced claims with URLs, explicit resolution criteria and dates, Brier/calibration scoring on stated probabilities, n and CI beside every mean, and 'no data' instead of 2.0.

