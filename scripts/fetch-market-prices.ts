// Market price histories. Manifold: every bet's probAfter, reduced to the last price per calendar day
// (the standing probability changes only when a bet is placed). Writes the series into data/market-refs.json
// and fixes the market URL slug. Polymarket: the Yes token's daily close from the CLOB price history.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const file = path.join(ROOT, "data/market-refs.json");
type Ref = { id: string; event_id: string; venue: string; url: string; question: string; deadline: string | null; prices: { date: string; p: number }[] };
const SLUGS: Record<string, string> = {
  "M-001": "will-the-fda-approve-mdma-as-a-trea",
  "M-002": "metaculus-will-mdma-be-fdaapproved",
  "M-003": "will-mdmaassisted-therapy-for-ptsd",
  "M-004": "acx-2026-will-the-fda-approve-a-psi",
};

async function getJson(url: string): Promise<unknown> {
  const r = await fetch(url, { headers: { accept: "application/json", "user-agent": "psych-forecast-ledger/1.0 (research; contact via repository)" } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function manifoldSeries(slug: string): Promise<{ date: string; p: number }[]> {
  type Bet = { id: string; createdTime: number; probAfter?: number; isRedemption?: boolean; amount?: number };
  const bets: Bet[] = [];
  let before: string | undefined;
  for (let page = 0; page < 20; page++) {
    const batch = (await getJson(`https://api.manifold.markets/v0/bets?contractSlug=${slug}&limit=1000${before ? `&before=${before}` : ""}`)) as Bet[];
    bets.push(...batch);
    if (batch.length < 1000) break;
    before = batch[batch.length - 1].id;
    await new Promise((r) => setTimeout(r, 1100));
  }
  const byDay = new Map<string, { t: number; p: number }>();
  for (const b of bets) {
    if (b.isRedemption || typeof b.probAfter !== "number") continue;
    const date = new Date(b.createdTime).toISOString().slice(0, 10);
    const cur = byDay.get(date);
    if (!cur || b.createdTime > cur.t) byDay.set(date, { t: b.createdTime, p: b.probAfter });
  }
  return [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([date, v]) => ({ date, p: Math.round(v.p * 1000) / 1000 }));
}

const POLYMARKET: Record<string, string> = { "M-005": "fda-approves-a-psychedelic-for-medical-use-in-2026" };

// Polymarket: the Yes token's daily close from the CLOB price history (fidelity 1440 minutes)
async function polymarketSeries(eventSlug: string): Promise<{ url: string; question: string; end: string | null; prices: { date: string; p: number }[] }> {
  const events = (await getJson(`https://gamma-api.polymarket.com/events?slug=${eventSlug}`)) as { title: string; slug: string; markets: { question: string; clobTokenIds: string; outcomes: string; endDate?: string }[] }[];
  const ev = events[0];
  const market = ev.markets[0];
  const tokens = JSON.parse(market.clobTokenIds) as string[];
  const outcomes = JSON.parse(market.outcomes) as string[];
  const yes = tokens[Math.max(0, outcomes.findIndex((o) => /^yes$/i.test(o)))];
  const hist = (await getJson(`https://clob.polymarket.com/prices-history?market=${yes}&interval=max&fidelity=1440`)) as { history: { t: number; p: number }[] };
  const byDay = new Map<string, { t: number; p: number }>();
  for (const h of hist.history) { const date = new Date(h.t * 1000).toISOString().slice(0, 10); const cur = byDay.get(date); if (!cur || h.t > cur.t) byDay.set(date, { t: h.t, p: h.p }); }
  const prices = [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([date, v]) => ({ date, p: Math.round(v.p * 1000) / 1000 }));
  return { url: `https://polymarket.com/event/${ev.slug}`, question: market.question || ev.title, end: market.endDate ? market.endDate.slice(0, 10) : null, prices };
}

async function main() {
  const refs = JSON.parse(fs.readFileSync(file, "utf8")) as Ref[];
  for (const ref of refs) {
    const slug = SLUGS[ref.id];
    if (!slug && POLYMARKET[ref.id]) {
      const before = ref.prices.length;
      const pm = await polymarketSeries(POLYMARKET[ref.id]);
      ref.url = pm.url; ref.question = pm.question; if (pm.prices.length) ref.prices = pm.prices;
      console.log(`${ref.id}: ${before} -> ${ref.prices.length} daily prices, ${ref.prices[0]?.date} .. ${ref.prices[ref.prices.length - 1]?.date} (polymarket, market end ${pm.end})`);
      await new Promise((r) => setTimeout(r, 1100));
      continue;
    }
    if (!slug) { console.log(`${ref.id}: kept ${ref.prices.length} hand-copied prices (${ref.venue})`); continue; }
    const market = (await getJson(`https://api.manifold.markets/v0/slug/${slug}`)) as { question: string; url: string; closeTime?: number; resolution?: string; createdTime: number };
    const series = await manifoldSeries(slug);
    const before = ref.prices.length;
    ref.url = market.url;
    ref.question = ref.venue === "metaculus" ? `${market.question.replace(/^\[Metaculus\]\s*/, "")} (Metaculus, Manifold mirror)` : market.question;
    ref.prices = series.length ? series : ref.prices;
    console.log(`${ref.id}: ${before} -> ${ref.prices.length} daily prices, ${ref.prices[0]?.date} .. ${ref.prices[ref.prices.length - 1]?.date}; resolution ${market.resolution ?? "open"}`);
    await new Promise((r) => setTimeout(r, 1100));
  }
  fs.writeFileSync(file, JSON.stringify(refs, null, 1) + "\n");
  const audit = path.join(ROOT, "data/audit/log.jsonl");
  fs.appendFileSync(audit, JSON.stringify({ at: new Date().toISOString(), script: "fetch-market-prices", refs: refs.map((r) => ({ id: r.id, prices: r.prices.length })) }) + "\n");
}
main().catch((e) => { console.error(e); process.exit(1); });
