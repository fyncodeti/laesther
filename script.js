/* ==========================================================================
   script.js - La’Esther
   - Header (burger + focus-trap + overlay)
   - Reveal (IntersectionObserver)
   - Header elevation + FAB (scroll unificado)
   ========================================================================== */
"use strict";

/* =========================
   Preferências do usuário
========================= */
const prefersReducedMotion = (() => {
  try {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  } catch {
    return false;
  }
})();

/* =========================
   1) HEADER: burger + overlay + focus-trap
========================= */
(() => {
  const header  = document.querySelector(".site-header");
  const burger  = document.getElementById("menu_checkbox");
  const nav     = document.getElementById("primary-nav");
  const overlay = document.getElementById("navOverlay");
  if (!header || !burger || !nav || !overlay) return;

  const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
  let lastFocused = null;

  // Controles para evitar fechamento por micro-scroll
  let openScrollY = 0;
  let openGuardUntil = 0;     // janela de proteção após abrir (ms)
  const CLOSE_DELTA = 24;     // tolerância de rolagem antes de fechar (px)

  function trapFocus(e) {
    if (e.key !== "Tab") return;
    const focusables = [...nav.querySelectorAll(FOCUSABLE)]
      .filter(el => el.offsetParent !== null);
    if (!focusables.length) return;

    const first = focusables[0];
    const last  = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function openMenu() {
    header.classList.add("is-open");
    burger.setAttribute("aria-expanded", "true");
    overlay.hidden = false;
    overlay.setAttribute("aria-modal", "true");
    document.body.style.overflow = "hidden";

    lastFocused = document.activeElement;
    const first = nav.querySelector(FOCUSABLE);
    if (first) first.focus();

    document.addEventListener("keydown", trapFocus);

    // memoriza posição e aplica guarda contra micro-scroll
    openScrollY = window.scrollY || 0;
    openGuardUntil = (window.performance?.now?.() || Date.now()) + 250; // 250ms de proteção
  }

  function closeMenu() {
    header.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
    overlay.hidden = true;
    overlay.removeAttribute("aria-modal");
    document.body.style.overflow = "";

    if (lastFocused) lastFocused.focus();
    document.removeEventListener("keydown", trapFocus);
  }

  function syncMenu() {
    burger.checked ? openMenu() : closeMenu();
  }

  burger.setAttribute("aria-expanded", burger.checked ? "true" : "false");
  if (burger.checked) header.classList.add("is-open");

  burger.addEventListener("change", syncMenu);

  overlay.addEventListener("click", () => {
    burger.checked = false;
    syncMenu();
  });

  nav.addEventListener("click", (e) => {
    const target = e.target.closest("a");
    if (target) {
      burger.checked = false;
      syncMenu();
    }
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && header.classList.contains("is-open")) {
      burger.checked = false;
      syncMenu();
    }
  });

  // Fechar menu ao rolar com histerese e proteção a micro-scroll
  window.addEventListener(
    "scroll",
    () => {
      if (!header.classList.contains("is-open")) return;

      const now = (window.performance?.now?.() || Date.now());
      if (now < openGuardUntil) return;

      const dy = Math.abs((window.scrollY || 0) - openScrollY);
      if (dy > CLOSE_DELTA) {
        burger.checked = false;
        syncMenu();
      }
    },
    { passive: true }
  );
})();

/* =========================
   2) REVEAL: IntersectionObserver
   Ajuste: reduzir o tempo de entrada (delays menores)
========================= */
(() => {
  const NODES = document.querySelectorAll(".reveal");
  if (!NODES.length) return;

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    NODES.forEach((el) => el.classList.add("reveal-in"));
    return;
  }

  const io = new IntersectionObserver(
    (entries, obs) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal-in");
          obs.unobserve(entry.target);
        }
      }
    },
    { rootMargin: "0px 0px -5% 0px", threshold: 0.15 }
  );

  NODES.forEach((el, i) => {
    const customDelay = el.getAttribute("data-reveal-delay");
    const parsed = customDelay != null ? parseInt(customDelay, 10) : NaN;

    const delay = Number.isFinite(parsed) ? parsed : Math.min(i * 30, 180);

    el.style.setProperty("--reveal-delay", String(delay));
    io.observe(el);
  });

  window.addEventListener("resize", () => io.takeRecords(), { passive: true });
})();

/* =========================
   3) HEADER elevation + FAB WhatsApp (scroll unificado)
========================= */
(() => {
  const header = document.querySelector(".site-header");
  const fab = document.querySelector(".fab-whatsapp");
  if (!header && !fab) return;

  let lastY = 0;
  let ticking = false;

  function updateHeaderElevation(y) {
    header?.classList.toggle("is-elevated", y > 8);
  }

  function updateFABVisibility(y) {
    if (!fab) return;
    const show = y > window.innerHeight * 0.4;
    fab.classList.toggle("is-visible", show);
  }

  function onScrollUnified() {
    lastY = window.scrollY || 0;
    if (ticking) return;

    ticking = true;
    window.requestAnimationFrame(() => {
      updateHeaderElevation(lastY);
      updateFABVisibility(lastY);
      ticking = false;
    });
  }

  if (!prefersReducedMotion) {
    window.addEventListener("scroll", onScrollUnified, { passive: true });
    onScrollUnified();
  } else {
    fab?.classList.add("is-visible");
  }
})();

/* =========================
   Scroll suave com offset (header fixo)
========================= */
(() => {
  const header = document.querySelector(".site-header");
  const links = document.querySelectorAll('a[href^="#"]:not([href="#"])');
  if (!header || !links.length) return;

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      const targetId = link.getAttribute("href").slice(1);
      const target = document.getElementById(targetId);
      if (!target) return;

      e.preventDefault();

      const headerHeight = header.offsetHeight || 0;
      const top =
        target.getBoundingClientRect().top +
        window.scrollY -
        headerHeight +
        4;

      window.scrollTo({ top, behavior: "smooth" });
    });
  });
})();

/* =========================
   4) SCROLLSPY
   - Ativa .is-active e aria-current="page" no link da seção visível
   - IO primário com thresholds; fallback com rAF
   - Correção: não acumular listeners nem observers no resize
========================= */
(() => {
  const nav = document.getElementById("primary-nav");
  if (!nav) return;

  const header = document.querySelector(".site-header");

  const cssVar = getComputedStyle(document.documentElement)
    .getPropertyValue("--h-header")
    .trim();
  const cssVarNum = cssVar ? parseInt(cssVar, 10) : NaN;

  function getHeaderHeight() {
    const h = header?.offsetHeight || (Number.isFinite(cssVarNum) ? cssVarNum : 84);
    return Math.max(0, h);
  }

  const links = [...nav.querySelectorAll('.nav__link[href^="#"]')];

  const map = new Map();
  for (const a of links) {
    const id = a.getAttribute("href").slice(1);
    const sec = document.getElementById(id);
    if (sec) map.set(id, { section: sec, link: a });
  }
  if (!map.size) return;

  let activeId = null;

  function setActive(id) {
    for (const { link } of map.values()) {
      link.classList.remove("is-active");
      link.removeAttribute("aria-current");
    }
    const obj = map.get(id);
    if (obj) {
      obj.link.classList.add("is-active");
      obj.link.setAttribute("aria-current", "page");
      activeId = id;
    }
  }

  function closestActiveByGeometry() {
    const hh = getHeaderHeight();
    const activationY = hh + Math.round(window.innerHeight * 0.3);
    let bestId = null;
    let bestDist = Infinity;

    for (const [id, { section }] of map.entries()) {
      const rect = section.getBoundingClientRect();
      const top = rect.top;
      const bottom = rect.bottom;

      if (activationY >= top && activationY <= bottom) {
        bestId = id;
        bestDist = 0;
      } else {
        const dist = Math.min(
          Math.abs(top - activationY),
          Math.abs(bottom - activationY)
        );
        if (dist < bestDist) {
          bestDist = dist;
          bestId = id;
        }
      }
    }
    return bestId;
  }

  function setupFallback() {
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const id = closestActiveByGeometry();
        if (id && id !== activeId) setActive(id);
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
  }

  const supportsIO =
    "IntersectionObserver" in window &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let cleanupObserver = null;
  let resizeRaf = null;

  function buildObserver() {
    const hh = getHeaderHeight();
    const topOffset = hh + Math.round(window.innerHeight * 0.3);
    const rootMargin = `-${topOffset}px 0px -45% 0px`;
    const thresholds = [0, 0.25, 0.5, 0.75, 1];

    const scores = new Map();

    const io = new IntersectionObserver(
      (entries) => {
        const hhNow = getHeaderHeight();
        const activationY = hhNow + Math.round(window.innerHeight * 0.3);

        for (const entry of entries) {
          const id = entry.target.id;
          const prox = 1 / (1 + Math.abs(entry.boundingClientRect.top - activationY));
          const score = entry.isIntersecting
            ? entry.intersectionRatio * 0.8 + prox * 0.2
            : 0;
          scores.set(id, score);
        }

        let bestId = null;
        let bestScore = -1;
        for (const [id, score] of scores.entries()) {
          if (score > bestScore) {
            bestScore = score;
            bestId = id;
          }
        }

        if (bestId && bestId !== activeId) setActive(bestId);
      },
      { root: null, rootMargin, threshold: thresholds }
    );

    for (const { section } of map.values()) io.observe(section);
    return () => io.disconnect();
  }

  function rebuildObserver() {
    if (!supportsIO) return;
    if (cleanupObserver) cleanupObserver();
    cleanupObserver = buildObserver();
  }

  function onResizeRebuild() {
    if (!supportsIO) return;
    if (resizeRaf) return;

    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = null;
      rebuildObserver();

      const id = closestActiveByGeometry();
      if (id && id !== activeId) setActive(id);
    });
  }

  nav.addEventListener("click", (e) => {
    const a = e.target.closest('.nav__link[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href").slice(1);
    if (map.has(id)) setActive(id);
  });

  window.addEventListener("hashchange", () => {
    const id = (location.hash || "").replace("#", "");
    if (id && map.has(id)) setActive(id);
  });

  if (supportsIO) {
    rebuildObserver();
    window.addEventListener("resize", onResizeRebuild, { passive: true });

    const initial = (location.hash || "").replace("#", "") || closestActiveByGeometry();
    if (initial && map.has(initial)) setActive(initial);
  } else {
    setupFallback();
  }
})();

/* =========================
   5) DETAILS LABEL TOGGLER (Equipe)
   - Alterna o texto do <summary> ao abrir/fechar <details>
   - Suporta rótulos customizados via data-open/data-closed
========================= */
(() => {
  const detailsList = document.querySelectorAll(".pro-card__details");
  if (!detailsList.length) return;

  detailsList.forEach((dt) => {
    const summary = dt.querySelector("summary");
    if (!summary) return;

    const CLOSED = summary.getAttribute("data-closed") || "Ler história completa";
    const OPEN = summary.getAttribute("data-open") || "Ler menos";

    let label = summary.querySelector(".summary__label");
    if (!label) {
      label = document.createElement("span");
      label.className = "summary__label";
      summary.textContent = "";
      summary.appendChild(label);
    }

    function apply() {
      const isOpen = dt.hasAttribute("open");
      label.textContent = isOpen ? OPEN : CLOSED;
      summary.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }

    apply();
    dt.addEventListener("toggle", apply);
  });
})();

/* =========================
   6) HERO ROTATOR
   - Rotação suave da palavra após “Essência Materna -”
   - Efeito “carregando” com pontinhos
   - Respeita prefers-reduced-motion
========================= */
(() => {
  const container = document.querySelector(".hero__rotator");
  if (!container) return;

  if (prefersReducedMotion) return;

  if (container.dataset.rotatorInit === "1") return;
  container.dataset.rotatorInit = "1";

  const label = container.querySelector("span");
  if (!label) return;

  const words = ["Fisioterapia", "Pilates", "Reabilitação"];
  let wordIndex = 0;

  const WORD_INTERVAL = 3500;
  const DOT_INTERVAL = 450;
  const MAX_DOTS = 3;
  const TRANSITION = 260;

  let currentDots = 1;
  let wordTimer = null;
  let dotTimer = null;

  function render() {
    const base = words[wordIndex];
    const dots = ".".repeat(currentDots);
    label.textContent = base + dots;
  }

  function startDots() {
    if (dotTimer) return;
    dotTimer = window.setInterval(() => {
      currentDots = (currentDots % MAX_DOTS) + 1;
      render();
    }, DOT_INTERVAL);
  }

  function startWordRotation() {
    if (wordTimer) return;

    function cycleWord() {
      container.classList.add("is-hiding");

      window.setTimeout(() => {
        wordIndex = (wordIndex + 1) % words.length;
        currentDots = 1;
        render();
        container.classList.remove("is-hiding");
      }, TRANSITION);
    }

    wordTimer = window.setTimeout(function kickoff() {
      cycleWord();
      wordTimer = window.setInterval(cycleWord, WORD_INTERVAL);
    }, WORD_INTERVAL);
  }

  wordIndex = 0;
  currentDots = 1;
  render();

  startDots();
  startWordRotation();
})();
