// Page checks against a running site: one rules stamp per page, no gallery-only classes in page HTML,
// and every glossary link (/methodology#g-...) resolves to an id on the Method page.
// Usage: tsx scripts/check-pages.ts [baseUrl]   (default http://localhost:3011)
// No side effects on import; main() runs only under tsx.

export const PAGES = ["/", "/forecasters/owen", "/forecasters/angermayer", "/forecasters/doblin", "/predictions", "/predictions/owen-0070", "/events", "/areas/regulatory", "/methodology", "/about"] as const;

export const METHOD_PATH = "/methodology";

/** Classes that stay in CSS for the gallery only. No page may use them. */
export const GALLERY_ONLY_CLASSES = ["sub", "note", "stat-unit"] as const;

export const DEFAULT_BASE = "http://localhost:3011";

export interface PageReport { path: string; problems: string[]; warnings: string[] }

/** Decodes the few entities Next writes into attribute values. */
function decodeEntities(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

/** Text content of an HTML fragment: tags stripped, whitespace collapsed. */
export function textOf(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

/** Every class attribute value in the document, split into tokens. */
export function classTokens(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/\bclass="([^"]*)"/g)) out.push(...m[1].split(/\s+/).filter(Boolean));
  return out;
}

/** The text of every element that carries the given class token. Elements with that class are not nested. */
export function elementsWithClass(html: string, cls: string): string[] {
  const re = new RegExp(`<([a-zA-Z][a-zA-Z0-9]*)\\b[^>]*\\bclass="(?:[^"]*\\s)?${cls}(?:\\s[^"]*)?"[^>]*>([\\s\\S]*?)</\\1>`, "g");
  return [...html.matchAll(re)].map((m) => textOf(m[2]));
}

/** Every id attribute in the document. */
export function idsOf(html: string): Set<string> {
  return new Set([...html.matchAll(/\bid="([^"]*)"/g)].map((m) => decodeEntities(m[1])));
}

/** Every href that points at an anchor on the Method page, as the anchor id. */
export function methodAnchors(html: string): { glossary: string[]; other: string[] } {
  const glossary = new Set<string>();
  const other = new Set<string>();
  for (const m of html.matchAll(/\bhref="([^"]*)"/g)) {
    const href = decodeEntities(m[1]);
    if (!href.startsWith(`${METHOD_PATH}#`)) continue;
    const id = href.slice(METHOD_PATH.length + 1);
    if (!id) continue;
    (id.startsWith("g-") ? glossary : other).add(id);
  }
  return { glossary: [...glossary].sort(), other: [...other].sort() };
}

/** Checks one page's HTML. `methodIds` are the ids on the Method page; null when that page did not load. */
export function checkPage(path: string, html: string, methodIds: Set<string> | null): PageReport {
  const problems: string[] = [];
  const warnings: string[] = [];
  const stamps = elementsWithClass(html, "stamp");
  if (stamps.length !== 1) problems.push(`expected one .stamp, found ${stamps.length}`);
  for (const t of stamps) {
    const low = t.toLowerCase();
    if (!low.includes("rules") || !low.includes("as of")) problems.push(`stamp text "${t}" lacks "Rules" or "as of"`);
  }
  const tokens = new Set(classTokens(html));
  for (const cls of GALLERY_ONLY_CLASSES) if (tokens.has(cls)) problems.push(`class "${cls}" is gallery-only and appears on the page`);
  const anchors = methodAnchors(html);
  if (methodIds === null) {
    if (anchors.glossary.length || anchors.other.length) warnings.push("Method page links not checked: the Method page did not load");
    return { path, problems, warnings };
  }
  for (const id of anchors.glossary) if (!methodIds.has(id)) problems.push(`glossary link ${METHOD_PATH}#${id} has no id on the Method page`);
  for (const id of anchors.other) if (!methodIds.has(id)) warnings.push(`link ${METHOD_PATH}#${id} has no id on the Method page`);
  return { path, problems, warnings };
}

async function fetchPage(base: string, path: string): Promise<{ status: number; html: string }> {
  const res = await fetch(new URL(path, base));
  return { status: res.status, html: await res.text() };
}

export async function checkPages(base: string): Promise<PageReport[]> {
  const pages = new Map<string, { status: number; html: string }>();
  for (const p of PAGES) pages.set(p, await fetchPage(base, p));
  const method = pages.get(METHOD_PATH);
  const methodIds = method && method.status === 200 ? idsOf(method.html) : null;
  return PAGES.map((p) => {
    const page = pages.get(p)!;
    if (page.status !== 200) return { path: p, problems: [`HTTP ${page.status}`], warnings: [] };
    return checkPage(p, page.html, methodIds);
  });
}

function printReport(reports: PageReport[]): number {
  let failures = 0;
  for (const r of reports) {
    const ok = r.problems.length === 0;
    if (!ok) failures += 1;
    console.log(`${ok ? "ok  " : "FAIL"} ${r.path}`);
    for (const p of r.problems) console.log(`       ${p}`);
    for (const w of r.warnings) console.log(`       warning: ${w}`);
  }
  return failures;
}

async function main(): Promise<void> {
  const base = process.argv[2] ?? DEFAULT_BASE;
  let reports: PageReport[];
  try {
    reports = await checkPages(base);
  } catch (e) {
    console.error(`cannot read ${base}: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
  const failures = printReport(reports);
  if (failures) {
    console.error(`${failures} of ${reports.length} pages fail the page checks`);
    process.exit(1);
  }
  console.log(`${reports.length} pages pass the page checks`);
}

if (process.argv[1] && /check-pages\.ts$/.test(process.argv[1])) void main();
