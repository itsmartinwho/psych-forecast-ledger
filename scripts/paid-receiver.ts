// Local receiver for paid post bodies captured in the user's logged-in browser session.
// The browser page (same origin as the Substack API) fetches /api/v1/posts/<slug> with its own cookies
// and POSTs the JSON here. Nothing but post bodies crosses this boundary; no cookies are read or stored.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { htmlToText } from "./lib/html-to-text";

const OUT = path.resolve(__dirname, "../data/raw/paid");
fs.mkdirSync(OUT, { recursive: true });
const PORT = 8787;

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Private-Network", "true");
  res.setHeader("Access-Control-Allow-Local-Network", "true");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  if (req.method === "GET" && req.url === "/status") {
    const files = fs.readdirSync(OUT).filter((f) => f.endsWith(".json"));
    res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ saved: files.length })); return;
  }
  if (req.method !== "POST" || !req.url?.startsWith("/save")) { res.writeHead(404); res.end(); return; }
  let body = "";
  req.on("data", (c) => { body += c; if (body.length > 20_000_000) req.destroy(); });
  req.on("end", () => {
    try {
      const p = JSON.parse(body);
      const slug = String(p.slug ?? "").replace(/[^a-z0-9-]/gi, "");
      const body_html = String(p.body_html ?? "");
      if (!slug || !body_html) throw new Error("missing slug or body_html");
      const text = htmlToText(body_html);
      const words = text.split(/\s+/).filter(Boolean).length;
      const rec = {
        id: p.id, slug, title: p.title, subtitle: p.subtitle ?? null, post_date: p.post_date, audience: p.audience, type: p.type,
        canonical_url: p.canonical_url, wordcount: p.wordcount ?? null,
        source: "browser_session" as const, fetched_at: new Date().toISOString(),
        body_sha256: createHash("sha256").update(body_html).digest("hex"),
        text_words: words,
        complete: words >= Math.min(120, Math.floor((p.wordcount ?? 0) * 0.6)) && !/Continue reading this post for free/i.test(text),
        body_html, text,
      };
      fs.writeFileSync(path.join(OUT, `${slug}.json`), JSON.stringify(rec));
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, slug, words, complete: rec.complete }));
    } catch (e) {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: (e as Error).message }));
    }
  });
});
server.listen(PORT, "127.0.0.1", () => console.error(`paid-receiver listening on http://127.0.0.1:${PORT}`));
