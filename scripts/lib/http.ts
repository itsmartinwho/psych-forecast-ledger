// Serial HTTP client for the Substack API: one request per second, exponential backoff on 429/5xx.
export const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let lastRequestAt = 0;
export const stats = { requests: 0, retries: 0 };

export async function getJson<T>(url: string, opts: { minGapMs?: number; maxTries?: number } = {}): Promise<T> {
  const minGap = opts.minGapMs ?? 1000;
  const maxTries = opts.maxTries ?? 8;
  for (let attempt = 0; ; attempt++) {
    const wait = lastRequestAt + minGap - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    stats.requests++;
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (res.status === 429 || res.status >= 500) {
      stats.retries++;
      if (attempt + 1 >= maxTries) throw new Error(`HTTP ${res.status} after ${maxTries} tries: ${url}`);
      const retryAfter = Number(res.headers.get("retry-after"));
      const backoff = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : Math.min(60_000, 2000 * 2 ** attempt);
      console.error(`HTTP ${res.status} on ${url}; retry ${attempt + 1}/${maxTries} in ${backoff}ms`);
      await sleep(backoff);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
    return (await res.json()) as T;
  }
}
