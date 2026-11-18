// Watamelon Website Score — the rubric.
//
// Three scores, each 0–100, built from weighted checks. Every check returns a value from 0 to 1
// (1 = fully met), so a check worth 12 points gives 0, 6 or 12 points etc.
//
//   Conversion   — does the page turn visitors into enquiries or sales?
//   User-friendly — is it easy, fast and accessible to use, especially on a phone?
//   Creativity   — does it look and feel crafted rather than default?
//
// Overall = 40% Conversion + 35% User-friendly + 25% Creativity.
// This is an automated scan of the page's code, not a human review. Weights live here so they're
// easy to tune.

const PILLAR_WEIGHTS = { conversion: 0.4, ux: 0.35, creative: 0.25 };

const CTA_WORDS = /\b(get( started| in touch| a quote| your| my| the| free)?|start|book|buy|shop|order|contact|call|talk|try|sign ?up|join|subscribe|download|request|schedule|claim|hire|enquire|inquire|apply|reserve|let'?s (talk|go|chat))\b/i;
const PROOF_PATTERNS = [
  /testimonial/i, /\breviews?\b/i, /\brated\b|\brating\b/i, /trusted by/i, /our clients|happy clients|clients include/i,
  /case stud/i, /★|⭐|5[- ]star/i, /customers (say|love)/i, /as (seen|featured) (in|on)/i, /"@type"\s*:\s*"(Review|AggregateRating)"/i,
];
const MOTION_PATTERNS = [
  /@keyframes/i, /\banimation(-name)?\s*:/i, /\btransition\s*:/i, /gsap|scrolltrigger/i, /lottie/i, /framer-motion|data-framer/i,
  /\baos\b|data-aos/i, /three(\.min)?\.js|webgl/i, /lenis|locomotive-scroll/i, /swiper|splide|slick/i, /IntersectionObserver/,
];
const LAYOUT_PATTERNS = [
  /display\s*:\s*grid/i, /display\s*:\s*flex/i, /clamp\(/i, /aspect-ratio/i, /backdrop-filter/i,
  /mix-blend-mode/i, /clip-path/i, /mask(-image)?\s*:/i, /var\(--/i, /@container/i,
];
const TEMPLATE_MARKERS = [
  /<meta[^>]+generator[^>]+(wix|squarespace|weebly|godaddy|site123|jimdo)/i,
  /wp-content\/themes\/(twenty|astra|hello-elementor|oceanwp|generatepress)/i,
  /cdn\.shopify\.com\/[^"']*\/(dawn|debut)/i,
];

// ---------- small HTML helpers (regex-based: fast, no dependencies) ----------
const strip = (html) => html
  .replace(/<!--[\s\S]*?-->/g, " ")
  .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, " ");
const textOf = (html) => strip(html).replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
const tags = (html, name) => html.match(new RegExp(`<${name}\\b[^>]*>`, "gi")) || [];
const blocks = (html, name) => html.match(new RegExp(`<${name}\\b[^>]*>[\\s\\S]*?<\\/${name}>`, "gi")) || [];
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i")); return m ? (m[2] ?? m[3] ?? m[4] ?? "") : null; };
const words = (s) => (s.match(/[\p{L}\p{N}'’]+/gu) || []).length;
const clamp01 = (n) => Math.max(0, Math.min(1, n));
const step = (v, steps) => { for (const [min, score] of steps) if (v >= min) return score; return 0; };

function analyze({ html, css = "", url, https, firstByteMs, bytes }) {
  const body = (html.match(/<body\b[\s\S]*$/i) || [html])[0];
  const clean = strip(body);
  const text = textOf(body);
  const wordCount = words(text);
  const all = html + "\n" + css;               // code to look for design signals in
  const head = (html.match(/<head\b[\s\S]*?<\/head>/i) || [""])[0];

  // CTAs: links and buttons whose text reads like an action
  const clickables = [...blocks(clean, "a"), ...blocks(clean, "button"), ...tags(clean, "input").filter((t) => /type\s*=\s*["']?(submit|button)/i.test(t))];
  const ctaLabel = (el) => (textOf(el) || attr(el, "value") || attr(el, "aria-label") || "").slice(0, 60);
  const ctas = clickables.filter((el) => { const l = ctaLabel(el); return l && words(l) <= 6 && CTA_WORDS.test(l); });
  const earlyCut = Math.floor(clean.length * 0.25);
  const earlyCtas = ctas.filter((el) => clean.indexOf(el) > -1 && clean.indexOf(el) <= earlyCut);

  const h1s = blocks(clean, "h1").map(textOf).filter(Boolean);
  const h2s = blocks(clean, "h2");
  const forms = blocks(clean, "form");
  const inputsIn = (f) => tags(f, "input").filter((t) => !/type\s*=\s*["']?(hidden|submit|button|checkbox|radio)/i.test(t)).length + tags(f, "textarea").length + tags(f, "select").length;
  const leadForms = forms.filter((f) => /type\s*=\s*["']?email|name\s*=\s*["']?[^"'>]*email/i.test(f));
  const imgs = tags(clean, "img");
  const imgsWithAlt = imgs.filter((t) => attr(t, "alt") !== null);
  const fields = tags(clean, "input").filter((t) => !/type\s*=\s*["']?(hidden|submit|button)/i.test(t));
  // a field counts as labelled if it has its own label text, a <label for>, or sits inside a <label>
  const wrappedInLabel = blocks(clean, "label").reduce((n, l) => n + tags(l, "input").length + tags(l, "textarea").length, 0);
  const ownLabel = fields.filter((t) => attr(t, "aria-label") || attr(t, "placeholder") || attr(t, "title") ||
    (attr(t, "id") && new RegExp(`for\\s*=\\s*["']?${attr(t, "id").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'\\s>]`, "i").test(clean))).length;
  const labelled = { length: Math.min(fields.length, Math.max(ownLabel, wrappedInLabel)) };
  const navLinks = blocks(clean, "nav").reduce((n, nav) => n + tags(nav, "a").length, 0) || tags((clean.match(/<header\b[\s\S]*?<\/header>/i) || [""])[0], "a").length;
  const scripts = tags(html, "script").length;
  const title = textOf((html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || ["", ""])[1]);
  const metaDesc = attr(tags(head, "meta").find((t) => /name\s*=\s*["']?description/i.test(t)) || "", "content") || "";
  const viewport = tags(head, "meta").find((t) => /name\s*=\s*["']?viewport/i.test(t)) || "";
  const lang = attr(tags(html, "html")[0] || "", "lang");
  const favicon = /rel\s*=\s*["']?[^"'>]*icon/i.test(head);
  const fontFamilies = new Set([
    ...[...all.matchAll(/fonts\.googleapis\.com\/css2?\?([^"')\s]+)/gi)].flatMap((m) => [...m[1].matchAll(/family=([^:&]+)/gi)].map((f) => f[1].toLowerCase())),
    ...[...all.matchAll(/@font-face\s*{[^}]*font-family\s*:\s*["']?([^;"']+)/gi)].map((m) => m[1].trim().toLowerCase()),
  ]);
  const usesFontService = /use\.typekit\.net|fonts\.bunny\.net|fontshare|\.woff2?\b/i.test(all);
  const colors = new Set((all.match(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b|rgba?\([^)]+\)|hsla?\([^)]+\)/gi) || []).map((c) => c.toLowerCase().replace(/\s+/g, "")));
  const hasContact = {
    form: forms.length > 0,
    phone: /href\s*=\s*["']?tel:/i.test(clean),
    email: /href\s*=\s*["']?mailto:/i.test(clean),
    chat: /wa\.me|whatsapp|intercom|crisp\.chat|tawk\.to|calendly|cal\.com/i.test(html),
  };
  const contactTypes = Object.values(hasContact).filter(Boolean).length;
  const proofHits = PROOF_PATTERNS.filter((p) => p.test(text) || p.test(html)).length;
  const motionHits = MOTION_PATTERNS.filter((p) => p.test(all)).length;
  const layoutHits = LAYOUT_PATTERNS.filter((p) => p.test(all)).length;
  const mediaKinds = [imgs.length >= 5, /<svg\b/i.test(body), /<video\b|youtube\.com\/embed|player\.vimeo/i.test(body), /<picture\b|srcset=/i.test(body)].filter(Boolean).length;
  const privacy = /href\s*=\s*["'][^"']*(privacy|terms|policy)/i.test(clean) || /privacy policy/i.test(text);
  const template = TEMPLATE_MARKERS.some((p) => p.test(html));

  const C = (id, pillar, weight, label, value, tip, detail) => ({ id, pillar, weight, label, value: clamp01(value), tip, detail });
  const checks = [
    // ---------------- Conversion (100) ----------------
    C("headline", "conversion", 12, "One clear main headline",
      h1s.length === 1 && words(h1s[0]) >= 2 && words(h1s[0]) <= 14 ? 1 : h1s.length ? 0.5 : 0,
      "Lead with a single, short headline (2–14 words) that says what you do and for whom.",
      h1s.length ? `Found ${h1s.length} main headline${h1s.length > 1 ? "s" : ""}: “${h1s[0].slice(0, 80)}”` : "No main headline (H1) found."),
    C("cta", "conversion", 16, "Clear call-to-action buttons", step(ctas.length, [[3, 1], [2, 0.8], [1, 0.5]]),
      "Use action words on buttons — “Book a call”, “Get a quote”, “Shop now” — not “Submit” or “Learn more”.",
      `${ctas.length} action button${ctas.length === 1 ? "" : "s"} found${ctas[0] ? `, e.g. “${ctaLabel(ctas[0])}”` : ""}.`),
    C("cta-early", "conversion", 10, "Call-to-action near the top", earlyCtas.length ? 1 : 0,
      "Put your main button in the first screen, so visitors don't have to scroll to act.",
      earlyCtas.length ? "There's an action button early on the page." : "No action button in the top quarter of the page."),
    C("contact", "conversion", 12, "Easy ways to get in touch", step(contactTypes, [[2, 1], [1, 0.6]]),
      "Offer at least two ways to reach you — a form plus WhatsApp, phone or email.",
      `Found: ${Object.entries(hasContact).filter(([, v]) => v).map(([k]) => k).join(", ") || "none"}.`),
    C("proof", "conversion", 14, "Social proof", step(proofHits, [[3, 1], [2, 0.75], [1, 0.45]]),
      "Show reviews, client logos, ratings or case studies — proof sells better than promises.",
      `${proofHits} kind${proofHits === 1 ? "" : "s"} of proof found (reviews, ratings, client mentions…).`),
    C("lead-form", "conversion", 10, "Short lead capture form",
      leadForms.length ? (inputsIn(leadForms[0]) <= 6 ? 1 : 0.5) : forms.length ? 0.3 : 0,
      "Capture emails with a short form — every extra field loses people. Aim for 3–5 fields.",
      leadForms.length ? `Email form with ${inputsIn(leadForms[0])} field${inputsIn(leadForms[0]) === 1 ? "" : "s"}.` : forms.length ? "There's a form, but it doesn't ask for an email." : "No form on the page."),
    C("value-prop", "conversion", 8, "Search & share description", metaDesc.length >= 50 && metaDesc.length <= 170 ? 1 : metaDesc ? 0.5 : 0,
      "Write a 50–160 character page description — it's your pitch in Google results and link previews.",
      metaDesc ? `${metaDesc.length} characters: “${metaDesc.slice(0, 90)}${metaDesc.length > 90 ? "…" : ""}”` : "No meta description."),
    C("trust", "conversion", 8, "Trust basics", (https ? 0.6 : 0) + (privacy ? 0.4 : 0),
      "Serve the site over HTTPS and link a privacy policy — browsers and buyers both look for it.",
      `${https ? "HTTPS ✓" : "No HTTPS"} · ${privacy ? "privacy/terms link ✓" : "no privacy policy link"}`),
    C("response", "conversion", 10, "Fast server response", firstByteMs == null ? 0.5 : step(-firstByteMs, [[-600, 1], [-1200, 0.7], [-2500, 0.35]]),
      "Slow first responses lose visitors before they see anything. Use good hosting or a CDN.",
      firstByteMs == null ? "Couldn't time it." : `First response in ${firstByteMs} ms.`),

    // ---------------- User-friendly (100) ----------------
    C("mobile", "ux", 16, "Mobile-ready", /width\s*=\s*device-width/i.test(viewport) ? 1 : viewport ? 0.4 : 0,
      "Add a responsive viewport tag and design for phones first — most visitors are on mobile.",
      viewport ? "Responsive viewport tag found." : "No viewport tag, so phones show a zoomed-out desktop page."),
    C("weight", "ux", 10, "Lightweight page", step(-bytes, [[-150_000, 1], [-400_000, 0.6], [-1_000_000, 0.3]]),
      "Keep the HTML lean; heavy pages are slow on mobile data.",
      `HTML is ${Math.round(bytes / 1024)} KB.`),
    C("scripts", "ux", 8, "Not overloaded with scripts", step(-scripts, [[-15, 1], [-30, 0.5], [-60, 0.2]]),
      "Each extra script slows the page. Remove unused plugins, trackers and widgets.",
      `${scripts} script tag${scripts === 1 ? "" : "s"}.`),
    C("alt", "ux", 12, "Images described for everyone", imgs.length ? imgsWithAlt.length / imgs.length : 1,
      "Give every image alt text — it helps screen readers and Google Images.",
      imgs.length ? `${imgsWithAlt.length} of ${imgs.length} images have alt text.` : "No images to check."),
    C("structure", "ux", 10, "Clear page structure", (h1s.length === 1 ? 0.5 : h1s.length ? 0.25 : 0) + (h2s.length >= 2 ? 0.5 : h2s.length ? 0.25 : 0),
      "Use one H1 and section headings (H2s) so people can scan and Google understands the page.",
      `${h1s.length} H1, ${h2s.length} H2 heading${h2s.length === 1 ? "" : "s"}.`),
    C("nav", "ux", 10, "Easy navigation", step(navLinks, [[3, 1], [1, 0.5]]),
      "Give visitors a simple menu (3–7 links) so they can find what they need.",
      `${navLinks} menu link${navLinks === 1 ? "" : "s"}.`),
    C("title", "ux", 8, "Descriptive page title", title.length >= 10 && title.length <= 65 ? 1 : title ? 0.5 : 0,
      "Write a 10–60 character title with your brand and what you do — it shows on tabs and in Google.",
      title ? `“${title.slice(0, 70)}” (${title.length} characters)` : "No page title."),
    C("labels", "ux", 8, "Labelled form fields", fields.length ? labelled.length / fields.length : 1,
      "Label every form field so people (and screen readers) know what to type.",
      fields.length ? `${labelled.length} of ${fields.length} fields are labelled.` : "No form fields to check."),
    C("content", "ux", 6, "Enough helpful content", step(wordCount, [[250, 1], [100, 0.5]]),
      "Explain what you offer in plain words; very thin pages leave visitors guessing.",
      `About ${wordCount} words of readable text.`),
    C("lang", "ux", 6, "Language set", lang ? 1 : 0, "Set the page language (<html lang=\"en\">) for screen readers and translation.",
      lang ? `Language: ${lang}.` : "No language set."),
    C("favicon", "ux", 6, "Browser tab icon", favicon ? 1 : 0, "Add a favicon so your tab is recognisable and the site feels finished.",
      favicon ? "Favicon found." : "No favicon."),

    // ---------------- Creativity (100) ----------------
    C("fonts", "creative", 18, "Distinctive typography", fontFamilies.size >= 2 ? 1 : fontFamilies.size === 1 || usesFontService ? 0.6 : 0,
      "Pair a characterful display font with a clean body font — type is half of a brand's personality.",
      fontFamilies.size ? `Custom fonts: ${[...fontFamilies].slice(0, 4).map((f) => f.replace(/\+/g, " ")).join(", ")}.` : usesFontService ? "Uses web fonts." : "Only default system fonts."),
    C("motion", "creative", 20, "Motion & interaction", step(motionHits, [[4, 1], [3, 0.8], [2, 0.6], [1, 0.35]]),
      "Add purposeful motion — scroll reveals, hover states, micro-interactions — to make the page feel alive.",
      `${motionHits} kind${motionHits === 1 ? "" : "s"} of motion or interaction found.`),
    C("visuals", "creative", 18, "Rich visuals", step(mediaKinds, [[3, 1], [2, 0.7], [1, 0.4]]),
      "Mix original photos, illustrations or SVG graphics and video instead of text-only sections.",
      `Images: ${imgs.length}${/<svg\b/i.test(body) ? ", SVG graphics" : ""}${/<video\b|youtube\.com\/embed|player\.vimeo/i.test(body) ? ", video" : ""}.`),
    C("color", "creative", 14, "Considered colour palette", step(colors.size, [[6, 1], [3, 0.5], [1, 0.25]]),
      "Define a brand palette — a main colour, an accent and neutrals — and use it consistently.",
      `${colors.size} distinct colour${colors.size === 1 ? "" : "s"} in the page's styles.`),
    C("layout", "creative", 16, "Modern layout craft", step(layoutHits, [[5, 1], [3, 0.7], [1, 0.35]]),
      "Modern CSS (grid, fluid type, layered effects) gives room for layouts that don't look like everyone else's.",
      `${layoutHits} modern layout technique${layoutHits === 1 ? "" : "s"} detected.`),
    C("original", "creative", 14, "Custom-built feel", template ? 0.4 : 1,
      "Default templates look like thousands of other sites. Customise beyond the theme to stand out.",
      template ? "Default theme or builder markers found." : "No default-template markers found."),
  ];

  const pillar = (p) => {
    const list = checks.filter((c) => c.pillar === p);
    const total = list.reduce((s, c) => s + c.weight, 0);
    return Math.round((list.reduce((s, c) => s + c.weight * c.value, 0) / total) * 100);
  };
  const scores = { conversion: pillar("conversion"), ux: pillar("ux"), creative: pillar("creative") };
  const overall = Math.round(Object.entries(PILLAR_WEIGHTS).reduce((s, [k, w]) => s + scores[k] * w, 0));

  // Sites that build everything with JavaScript show us very little in their raw HTML.
  const limited = wordCount < 60 && /<div[^>]+id\s*=\s*["']?(root|app|__next|__nuxt)|<script[^>]+type\s*=\s*["']?module/i.test(html);

  return {
    url, overall, band: band(overall), scores, weights: PILLAR_WEIGHTS, limited,
    checks: checks.map((c) => ({ ...c, points: Math.round(c.weight * c.value * 10) / 10, value: Math.round(c.value * 100) / 100 })),
  };
}

function band(n) {
  if (n >= 85) return { name: "Fresh-cut", note: "This site is in great shape. A few tweaks could still squeeze out more." };
  if (n >= 70) return { name: "Juicy", note: "Solid foundations, with clear wins left on the table." };
  if (n >= 50) return { name: "Getting ripe", note: "Good bones, but visitors are slipping through the gaps." };
  return { name: "Needs juice", note: "There's a lot of easy upside here — this site could be working much harder." };
}

module.exports = { analyze, PILLAR_WEIGHTS };
