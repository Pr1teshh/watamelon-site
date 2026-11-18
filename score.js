/* Watamelon — Website Score page */
(() => {
  // Where leads go. Same Google Sheet script as the contact form, plus an email via FormSubmit.
  const SHEET_URL = "https://script.google.com/macros/s/AKfycbxqKFxWQYafIZLNFYinBIYObyKpr5BbsCyI_rcjoS73v2cmhdtgy6e9uHRo8OjHZjDV5g/exec";
  const NOTIFY_URL = "https://formsubmit.co/ajax/Heyywatamelon@gmail.com";
  const PILLARS = { conversion: "Conversion", ux: "User-friendly", creative: "Creativity" };

  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };

  const urlForm = $("#url-form"), urlInput = $("#url-input"), urlBtn = $("#url-btn"), hint = $("#url-hint");
  const loading = $("#loading"), loadingText = $("#loading-text");
  const result = $("#result"), gate = $("#gate"), report = $("#report"), errorBox = $("#error");
  const leadForm = $("#lead-form"), leadStatus = $("#lead-status");
  let current = null;

  const MESSAGES = ["Slicing open your homepage…", "Counting the buttons people can click…", "Checking it works on a phone…", "Tasting the fonts and colours…", "Weighing the seeds…"];
  let msgTimer;

  async function run(raw) {
    const url = raw.trim();
    if (!url) { setHint("Enter your website address first.", true); urlInput.focus(); return; }
    setHint("We read your public homepage only. Nothing is changed.");
    urlBtn.disabled = true; result.hidden = true; errorBox.hidden = true; loading.hidden = false;
    let i = 0; loadingText.textContent = MESSAGES[0];
    msgTimer = setInterval(() => { loadingText.textContent = MESSAGES[++i % MESSAGES.length]; }, 1600);
    loading.scrollIntoView({ behavior: "smooth", block: "center" });

    try {
      const res = await fetch("/api/score?url=" + encodeURIComponent(url));
      const data = await res.json().catch(() => ({ error: "Something went wrong while scoring that site." }));
      if (!res.ok || data.error) throw new Error(data.error || "Something went wrong.");
      current = data;
      history.replaceState(null, "", "?url=" + encodeURIComponent(url));
      render(data);
    } catch (e) {
      setHint(e.message || "We couldn't score that site.", true);
      document.querySelector(".sc-hero").scrollIntoView({ behavior: "smooth" });
    } finally {
      clearInterval(msgTimer); loading.hidden = true; urlBtn.disabled = false;
    }
  }

  function setHint(text, isError = false) { hint.textContent = text; hint.classList.toggle("err", isError); }

  function render(d) {
    result.hidden = false;
    $("#site-name").textContent = new URL(d.url).hostname.replace(/^www\./, "");
    $("#band-name").textContent = d.band.name;
    $("#band-note").textContent = d.band.note;
    $("#limited").hidden = !d.limited;

    // animate the ring
    const ring = $("#ring"), num = $("#overall");
    ring.style.setProperty("--c", colorFor(d.overall));
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / 900), v = Math.round(d.overall * (1 - Math.pow(1 - p, 3)));
      ring.style.setProperty("--p", v); num.textContent = v;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    const unlockedEmail = store.get("wm-score-email");
    if (unlockedEmail) { saveLead({ email: unlockedEmail, name: store.get("wm-score-name") || "" }); unlock(); }
    else lock();
    result.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function lock() {
    result.classList.add("locked"); gate.hidden = false; report.hidden = true;
    document.querySelectorAll(".sc-pillar").forEach((row) => { $("b", row).textContent = "··"; $(".bar i", row).style.width = ""; });
  }

  function unlock() {
    const d = current;
    result.classList.remove("locked"); gate.hidden = true; report.hidden = false;
    document.querySelectorAll(".sc-pillar").forEach((row) => {
      const v = d.scores[row.dataset.key];
      $("b", row).textContent = v;
      const bar = $(".bar i", row); bar.style.background = colorFor(v);
      requestAnimationFrame(() => { bar.style.width = v + "%"; });
    });

    // Top fixes: the checks that lose the most points, weighted by how much their score counts overall
    const fixes = d.checks.filter((c) => c.value < 1)
      .map((c) => ({ ...c, gain: (c.weight - c.points) * d.weights[c.pillar] }))
      .sort((a, b) => b.gain - a.gain).slice(0, 3);
    $("#fixes").innerHTML = fixes.length
      ? fixes.map((c) => `<li><strong>${esc(c.label)}</strong><p>${esc(c.tip)}</p><span class="gain">+${Math.max(1, Math.round(c.gain))} overall points</span></li>`).join("")
      : `<li><strong>Nothing major to fix</strong><p>Every check passed. Want a human eye on the details? Book a call below.</p></li>`;

    $("#groups").innerHTML = Object.entries(PILLARS).map(([key, name]) => {
      const list = d.checks.filter((c) => c.pillar === key);
      return `<section class="sc-group"><header><h4>${name}</h4><b>${d.scores[key]}/100</b></header>${list.map((c) => {
        const cls = c.value >= 1 ? "ok" : c.value > 0 ? "part" : "";
        return `<div class="sc-check ${cls}"><span class="dot" aria-label="${cls === "ok" ? "Passed" : cls ? "Partly" : "Missing"}"></span>
          <div>${esc(c.label)}<small>${esc(c.detail)}</small>${c.value < 1 ? `<em>${esc(c.tip)}</em>` : ""}</div>
          <span class="pts">${c.points}/${c.weight}</span></div>`;
      }).join("")}</section>`;
    }).join("");
  }

  function colorFor(n) { return n >= 70 ? "var(--good)" : n >= 50 ? "var(--mid)" : "var(--primary)"; }

  // Save a lead to the Google Sheet and email a heads-up. Neither blocks the visitor.
  function saveLead({ email, name }) {
    const d = current;
    const row = new URLSearchParams({
      type: "lead", email, name, website: d.url, overall: d.overall,
      conversion: d.scores.conversion, ux: d.scores.ux, creative: d.scores.creative,
      _honey: leadForm._honey.value, page: location.href,
    });
    fetch(SHEET_URL, { method: "POST", mode: "no-cors", body: row }).catch(() => {});
    return row;
  }

  leadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = leadForm.email.value.trim(), name = leadForm.name.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      leadStatus.textContent = "Please enter a valid email address."; leadStatus.className = "form-status mono err";
      leadForm.email.focus(); return;
    }
    if (leadForm._honey.value) return; // bot
    const btn = $("button", leadForm); btn.disabled = true; btn.textContent = "Unlocking…";
    saveLead({ email, name });
    fetch(NOTIFY_URL, {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        _subject: `New website score lead — ${new URL(current.url).hostname} (${current.overall}/100)`, _template: "table",
        email, name: name || "—", website: current.url, overall: current.overall,
        conversion: current.scores.conversion, user_friendly: current.scores.ux, creativity: current.scores.creative,
      }),
    }).catch(() => {});
    store.set("wm-score-email", email); store.set("wm-score-name", name);
    btn.disabled = false; btn.textContent = "Show my report →"; leadStatus.textContent = "";
    unlock();
    $("#report").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  urlForm.addEventListener("submit", (e) => { e.preventDefault(); run(urlInput.value); });
  $("#again").addEventListener("click", () => { urlInput.value = ""; urlInput.focus(); window.scrollTo({ top: 0, behavior: "smooth" }); });
  $("#year").textContent = new Date().getFullYear();

  // Shared links like /score?url=example.com run straight away
  const pre = new URLSearchParams(location.search).get("url");
  if (pre) { urlInput.value = pre; run(pre); }
})();
