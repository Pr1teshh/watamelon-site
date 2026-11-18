// GET /api/score?url=example.com  →  JSON score report
// Runs on Vercel as a serverless function (no setup needed: files in /api are picked up automatically).
const { fetchPage, normalizeUrl } = require("./_lib/fetch-page");
const { analyze } = require("./_lib/rubric");

const MAX_STYLESHEETS = 4;

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "GET") { res.statusCode = 405; return res.end(JSON.stringify({ error: "Use GET." })); }

  try {
    const target = normalizeUrl(new URL(req.url, "http://x").searchParams.get("url"));
    const page = await fetchPage(target);
    if (page.status >= 400) throw Object.assign(new Error(`That website answered with an error (${page.status}).`), { userFacing: true });
    const type = String(page.headers["content-type"] || "");
    if (type && !/html/i.test(type)) throw Object.assign(new Error("That address isn't a web page."), { userFacing: true });

    // Pull in the page's own stylesheets too: fonts, colours and animations usually live there.
    const hrefs = [...page.body.matchAll(/<link\b[^>]*rel\s*=\s*["']?stylesheet[^>]*>/gi)]
      .map((m) => (m[0].match(/href\s*=\s*["']([^"']+)["']/i) || [])[1]).filter(Boolean).slice(0, MAX_STYLESHEETS);
    const sheets = await Promise.all(hrefs.map(async (h) => {
      try {
        const u = new URL(h, page.finalUrl);
        if (/fonts\.googleapis\.com/.test(u.hostname)) return `/* ${u.href} */`; // the URL itself names the fonts
        const r = await fetchPage(u, { timeoutMs: 4000, maxBytes: 400_000 });
        return r.status < 400 ? r.body : "";
      } catch { return ""; }
    }));
    const inlineCss = (page.body.match(/<style\b[\s\S]*?<\/style>/gi) || []).join("\n");

    const report = analyze({
      html: page.body, css: inlineCss + "\n" + sheets.join("\n") + "\n" + hrefs.join("\n"),
      url: page.finalUrl, https: page.https, firstByteMs: page.firstByteMs, bytes: page.bytes,
    });
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    res.end(JSON.stringify({ ...report, scannedAt: new Date().toISOString() }));
  } catch (e) {
    res.statusCode = e.userFacing ? 422 : 500;
    if (!e.userFacing) console.error(e);
    res.end(JSON.stringify({ error: e.userFacing ? e.message : "Something went wrong while scoring that site." }));
  }
};
