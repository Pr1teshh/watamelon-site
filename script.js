(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- Nav: background on scroll + mobile menu ---------- */
  const nav = $("#nav");
  const toggle = $(".menu-toggle");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 24);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const setMenu = (open) => {
    nav.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  toggle.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
  $$("#mobile-menu a").forEach((a) => a.addEventListener("click", () => setMenu(false)));

  /* ---------- Hero: wedge glides to the centre and gets sliced on scroll ---------- */
  const scene = $("#cut-scroll");
  const heroEl = $(".hero", scene || document);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (scene && heroEl && !reduce) {
    const art = $(".hero-art", heroEl);
    const mover = $(".melon-move", heroEl);
    const top = $(".piece-top", heroEl);
    const bottom = $(".piece-bottom", heroEl);
    const line = $(".cut-line", heroEl);
    const knife = $(".knife", heroEl);
    const juice = $(".juice", heroEl);
    const tagline = $(".cut-tagline", heroEl);
    const fadeText = $$(".hero-inner > .eyebrow, .hero-inner > .hero-title, .hero-inner > .hero-bottom", heroEl);
    $$("i", juice).forEach((d) => d.style.setProperty("--xf", parseFloat(d.style.getPropertyValue("--x")) / 100));

    const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const seg = (p, a, b) => clamp((p - a) / (b - a));
    // cut line in the image: (0, 33.5%) -> (100%, 27%) — takes the tip off, misses the stickers
    const Y0 = 0.335, Y1 = 0.27;

    const render = () => {
      const vh = window.innerHeight, vw = window.innerWidth;
      const total = scene.offsetHeight - vh;
      const p = clamp(-scene.getBoundingClientRect().top / total);

      // 1) glide to the centre (0 – .32)
      const m = ease(seg(p, 0, 0.32));
      const r = art.getBoundingClientRect();           // art box itself is never transformed by JS
      const dx = vw / 2 - (r.left + r.width / 2);
      const dy = vh / 2 - (r.top + r.height / 2);
      const target = Math.min(vw < 861 ? 1.5 : 1.35, (vh * 0.7) / r.height);
      const sc = 1 + (target - 1) * m;
      mover.style.transform = `translate(${dx * m}px, ${dy * m}px) scale(${sc})`;
      heroEl.classList.toggle("cutting", p > 0.01);

      // headline fades up and away
      const f = seg(p, 0, 0.22);
      fadeText.forEach((el, i) => {
        el.style.opacity = String(1 - f);
        el.style.transform = `translateY(${-50 * f * (1 + i * 0.3)}px)`;
      });

      // 2) knife slices across (.36 – .52)
      const k = seg(p, 0.36, 0.52);
      const W = top.offsetWidth, H = top.offsetHeight;
      const ang = Math.atan2((Y1 - Y0) * H, W);
      const kwLocal = knife.offsetWidth || W * 0.64;
      const khLocal = knife.offsetHeight || kwLocal * 0.17;
      const tipX = -0.15 * W + k * 1.45 * W;
      const tipY = Y0 * H + (tipX / W) * (Y1 - Y0) * H;
      const px = tipX - kwLocal * Math.cos(ang);
      const py = tipY - kwLocal * Math.sin(ang);
      knife.style.transform = `translate(${px}px, ${py - khLocal + 6}px) rotate(${ang}rad)`;
      knife.style.opacity = String(k > 0 && k < 1 ? 1 : 0);
      line.style.setProperty("--cut", String(1 - clamp(k * 1.15)));
      line.style.setProperty("--cut-o", String(k > 0 ? 1 - seg(p, 0.55, 0.62) : 0));

      // 3) pieces fall apart, juice flies, tagline shows (.52 – .86)
      const s = ease(seg(p, 0.52, 0.86));
      // the tip flies up-left; the body drops low so the tagline sits in the gap
      const drop = vw < 861 ? 50 : 44;
      top.style.transform = `translate(${-10 * s}%, ${-16 * s}%) rotate(${-16 * s}deg)`;
      bottom.style.transform = `translate(${3 * s}%, ${drop * s}%) rotate(${4 * s}deg)`;
      const jt = seg(p, 0.48, 0.72);
      juice.style.setProperty("--jt", String(jt));
      juice.style.setProperty("--j", String(jt > 0 ? 1 - jt : 0));
      tagline.style.setProperty("--tag", String(seg(p, 0.6, 0.8)));
    };

    let ticking = false;
    const onScrollCut = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { render(); ticking = false; });
    };
    window.addEventListener("scroll", onScrollCut, { passive: true });
    window.addEventListener("resize", onScrollCut);
    render();
  }

  /* ---------- Services: cards stack; the ones underneath shrink and dim ---------- */
  const scards = $$(".scard");
  if (scards.length && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const renderStack = () => {
      const vh = window.innerHeight;
      scards.forEach((card, i) => {
        const next = scards[i + 1];
        if (!next) return;
        const nTop = next.getBoundingClientRect().top;
        const stickAt = parseFloat(getComputedStyle(next).top) || 0;
        const p = Math.min(1, Math.max(0, (vh - nTop) / (vh - stickAt)));
        const depth = scards.length - i;
        card.style.transform = `scale(${1 - 0.05 * p * Math.min(depth, 2)})`;
        card.style.filter = `brightness(${1 - 0.45 * p})`;
      });
    };
    let t2 = false;
    window.addEventListener("scroll", () => {
      if (t2) return; t2 = true;
      requestAnimationFrame(() => { renderStack(); t2 = false; });
    }, { passive: true });
    window.addEventListener("resize", renderStack);
    renderStack();
  }

  /* ---------- Product covers: fall back to a styled cover if an image fails ---------- */
  $$(".product-media img").forEach((img) => {
    const fail = () => { img.closest(".product-media").classList.add("no-img"); img.remove(); };
    if (img.complete && img.naturalWidth === 0) fail(); else img.addEventListener("error", fail);
  });

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }),
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  $$(".reveal").forEach((el) => io.observe(el));

  /* ---------- Work cards: load image/video, fall back to a placeholder ---------- */
  $$(".work-media").forEach((box) => {
    const card = box.closest(".work-card");
    const title = $("h3", card)?.textContent || "";
    const kind = $("small", card)?.textContent || "";
    const placeholder = () => {
      if ($(".work-ph", box)) return;
      const ph = document.createElement("div");
      ph.className = "work-ph";
      ph.innerHTML = `<div><span></span><small></small></div>`;
      $("span", ph).textContent = title.split("—")[0].trim();
      $("small", ph).textContent = kind;
      box.appendChild(ph);
    };

    if (box.dataset.video) {
      const v = document.createElement("video");
      Object.assign(v, { muted: true, loop: true, playsInline: true, preload: "metadata" });
      v.setAttribute("muted", "");
      v.src = box.dataset.video;
      v.addEventListener("error", () => { v.remove(); placeholder(); });
      v.addEventListener("loadeddata", () => {
        const play = document.createElement("span");
        play.className = "play"; play.textContent = "▶";
        box.appendChild(play);
      });
      card.addEventListener("mouseenter", () => v.play().catch(() => {}));
      card.addEventListener("mouseleave", () => v.pause());
      box.appendChild(v);
    } else if (box.dataset.src) {
      const img = new Image();
      img.alt = title;
      img.loading = "lazy";
      img.onerror = () => { img.remove(); placeholder(); };
      img.src = box.dataset.src;
      box.appendChild(img);
    } else {
      placeholder();
    }
  });
  const count = $$(".work-card").length;
  const countEl = $("#work-count");
  if (countEl) countEl.textContent = `${count} projects`;

  /* ---------- Work rail: drag to scroll (mouse) ---------- */
  const rail = $("#work-rail");
  let down = false, startX = 0, startLeft = 0, moved = false;
  rail.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") return;
    down = true; moved = false; startX = e.clientX; startLeft = rail.scrollLeft;
  });
  window.addEventListener("pointermove", (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 4) { moved = true; rail.classList.add("dragging"); }
    rail.scrollLeft = startLeft - dx;
  });
  window.addEventListener("pointerup", () => { down = false; rail.classList.remove("dragging"); });
  rail.addEventListener("click", (e) => { if (moved) e.preventDefault(); }, true);

  /* ---------- Pricing buttons pre-select the matching service chip ---------- */
  $$("[data-service]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const box = $(`.chips input[value="${btn.dataset.service}"]`);
      if (box) box.checked = true;
    })
  );

  /* ---------- Contact form: send without leaving the page ---------- */
  const form = $("#contact-form");
  const status = $("#form-status");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("button[type=submit]", form);
    const data = new FormData(form);
    // join selected services into one readable line
    const services = data.getAll("services[]");
    data.delete("services[]");
    data.set("services", services.join(", ") || "Not specified");

    btn.disabled = true; btn.textContent = "Sending…";
    try {
      const res = await fetch(form.action.replace("formsubmit.co/", "formsubmit.co/ajax/"), {
        method: "POST",
        headers: { Accept: "application/json" },
        body: data,
      });
      if (!res.ok) throw new Error("Request failed");
      form.reset();
      status.textContent = "Thanks — we've got your brief. Expect a reply within 24 hours.";
      status.classList.add("ok");
    } catch {
      status.textContent = "Couldn't send right now. Email us at Heyywatamelon@gmail.com instead.";
    } finally {
      btn.disabled = false; btn.textContent = "Get in Touch →";
    }
  });

  /* ---------- Footer year ---------- */
  $("#year").textContent = new Date().getFullYear();
})();
