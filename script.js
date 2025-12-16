/* ==========================================================================
   script.js — La’Esther
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

  // --- NOVOS controles para evitar fechamento por micro-scroll ---
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
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
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

    // >>> ADIÇÃO: memoriza posição e aplica guarda contra micro-scroll
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
  overlay.addEventListener("click", () => { burger.checked = false; syncMenu(); });
  nav.addEventListener("click", (e) => {
    const target = e.target.closest("a");
    if (target) { burger.checked = false; syncMenu(); }
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && header.classList.contains("is-open")) {
      burger.checked = false; syncMenu();
    }
  });

  // Fechar menu ao rolar — COM histerese e proteção a micro-scroll
  window.addEventListener("scroll", () => {
    if (!header.classList.contains("is-open")) return;

    const now = (window.performance?.now?.() || Date.now());
    if (now < openGuardUntil) return; // ainda no período de proteção

    const dy = Math.abs((window.scrollY || 0) - openScrollY);
    if (dy > CLOSE_DELTA) {
      burger.checked = false;
      syncMenu();
    }
  }, { passive: true });
})();

/* =========================
   2) REVEAL: IntersectionObserver
========================= */
(() => {
  const NODES = document.querySelectorAll(".reveal");
  if (!NODES.length) return;

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    NODES.forEach(el => el.classList.add("reveal-in"));
    return;
  }

  const io = new IntersectionObserver((entries, obs) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("reveal-in");
        obs.unobserve(entry.target);
      }
    }
  }, { rootMargin: "0px 0px -5% 0px", threshold: 0.15 });

  NODES.forEach((el, i) => {
    const customDelay = el.getAttribute("data-reveal-delay");
    const parsed = customDelay != null ? parseInt(customDelay, 10) : NaN;
    const delay = Number.isFinite(parsed) ? parsed : Math.min(i * 60, 360);
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
  const fab    = document.querySelector(".fab-whatsapp");
  if (!header && !fab) return;

  let lastY = 0, ticking = false;

  function onScrollUnified() {
    lastY = window.scrollY || 0;
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateHeaderElevation(lastY);
        updateFABVisibility(lastY);
        ticking = false;
      });
      ticking = true;
    }
  }

  function updateHeaderElevation(y) {
    header?.classList.toggle("is-elevated", y > 8);
  }

  function updateFABVisibility(y) {
    if (!fab) return;
    const show = y > window.innerHeight * 0.4;
    fab.classList.toggle("is-visible", show);
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

  links.forEach(link => {
    link.addEventListener("click", e => {
      const targetId = link.getAttribute("href").slice(1);
      const target = document.getElementById(targetId);
      if (!target) return;
      e.preventDefault();

      const headerHeight = header.offsetHeight || 0;
      const top = target.getBoundingClientRect().top + window.scrollY - headerHeight + 4; // pequeno ajuste

      window.scrollTo({
        top,
        behavior: "smooth"
      });
    });
  });
})();

/* =========================
   4) SCROLLSPY
   - Ativa .is-active e aria-current="page" no link da seção visível
   - IO primário com thresholds; fallback com rAF
   ========================= */
(() => {
  const nav = document.getElementById("primary-nav");
  if (!nav) return;

  const header = document.querySelector(".site-header");
  // Tenta pegar a altura do header por offset; se falhar, usa CSS var ou 84px
  const cssVar = getComputedStyle(document.documentElement).getPropertyValue("--h-header").trim();
  const cssVarNum = cssVar ? parseInt(cssVar, 10) : NaN;
  function getHeaderHeight() {
    const h = header?.offsetHeight || (Number.isFinite(cssVarNum) ? cssVarNum : 84);
    return Math.max(0, h);
  }

  const links = [...nav.querySelectorAll('.nav__link[href^="#"]')];
  // Mapa id -> { section, link }
  const map = new Map();
  for (const a of links) {
    const id = a.getAttribute("href").slice(1);
    const sec = document.getElementById(id);
    if (sec) map.set(id, { section: sec, link: a });
  }
  if (!map.size) return;

  // Helpers para estado ativo
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
    // Fallback: ativa a seção cujo intervalo [top, bottom] contém o ponto de ativação,
    // senão a mais próxima desse ponto.
    const hh = getHeaderHeight();
    const activationY = hh + Math.round(window.innerHeight * 0.3); // ~30% abaixo do header
    let bestId = null;
    let bestDist = Infinity;

    for (const [id, { section }] of map.entries()) {
      const rect = section.getBoundingClientRect();
      const top = rect.top;
      const bottom = rect.bottom;
      if (activationY >= top && activationY <= bottom) {
        // Dentro da seção: prioriza imediatamente
        const dist = 0;
        if (dist < bestDist) { bestDist = dist; bestId = id; }
      } else {
        const dist = Math.min(Math.abs(top - activationY), Math.abs(bottom - activationY));
        if (dist < bestDist) { bestDist = dist; bestId = id; }
      }
    }
    return bestId;
  }

  let activeId = null;

  // IO primário
  function setupObserver() {
    const hh = getHeaderHeight();
    const topOffset = hh + Math.round(window.innerHeight * 0.3); // ~30% da viewport abaixo do header
    // Move a caixa de observação para considerar o header e uma margem inferior
    const rootMargin = `-${topOffset}px 0px -45% 0px`;
    const thresholds = [0, 0.25, 0.5, 0.75, 1];

    // Guardamos o "score" mais recente por seção
    const scores = new Map();

    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const id = entry.target.id;
        // Score híbrido: 80% pelo intersectionRatio + 20% pela proximidade do ponto de ativação
        const activationY = hh + Math.round(window.innerHeight * 0.3);
        const prox = 1 / (1 + Math.abs(entry.boundingClientRect.top - activationY)); // 0..1
        const score = entry.isIntersecting ? (entry.intersectionRatio * 0.8 + prox * 0.2) : 0;
        scores.set(id, score);
      }
      // Escolhe a seção com maior score
      let bestId = null, bestScore = -1;
      for (const [id, score] of scores.entries()) {
        if (score > bestScore) { bestScore = score; bestId = id; }
      }
      if (bestId && bestId !== activeId) setActive(bestId);
    }, { root: null, rootMargin, threshold: thresholds });

    // Observar apenas seções mapeadas
    for (const { section } of map.values()) {
      io.observe(section);
    }

    // Atualiza margens ao redimensionar (para manter proporção ~30%)
    let resizeRaf = null;
    const onResize = () => {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(() => {
        // Recriar o observer com novo rootMargin
        io.disconnect();
        setupObserver(); // simples e seguro (early return impede loop infinito)
      });
    };
    window.addEventListener("resize", onResize, { passive: true });

    // Retorna cleanup para evitar vazamento se necessário (não usamos aqui)
    return () => {
      window.removeEventListener("resize", onResize);
      io.disconnect();
    };
  }

  // Fallback rAF (sem IO)
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
    // Estado inicial
    onScroll();
  }

  // Click otimista nos links (sem interferir no smooth scroll que você já tem)
  nav.addEventListener("click", (e) => {
    const a = e.target.closest('.nav__link[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href").slice(1);
    if (map.has(id)) setActive(id);
  });

  // Sincroniza ao trocar hash (back/forward)
  window.addEventListener("hashchange", () => {
    const id = (location.hash || "").replace("#", "");
    if (id && map.has(id)) setActive(id);
  });

  // Inicialização
  const supportsIO = "IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (supportsIO) {
    setupObserver();
    // Garante estado inicial coerente
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

    // Rótulos: use data-closed / data-open no <summary> se quiser customizar
    const CLOSED = summary.getAttribute("data-closed") || "Ler história completa";
    const OPEN   = summary.getAttribute("data-open")   || "Ler menos";

    // Garante um span para manipular só o texto (caso o summary ganhe ícones no futuro)
    let label = summary.querySelector(".summary__label");
    if (!label) {
      label = document.createElement("span");
      label.className = "summary__label";
      // Zera e reaplica como label (evita duplicar espaços/ícones ocultos)
      summary.textContent = "";
      summary.appendChild(label);
    }

    function apply() {
      const isOpen = dt.hasAttribute("open");
      label.textContent = isOpen ? OPEN : CLOSED;
      summary.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }

    // Estado inicial + responder ao toggle nativo do <details>
    apply();
    dt.addEventListener("toggle", apply);
  });
})();

/* =========================
   6) HERO ROTATOR
   - Rotação suave da palavra após “Essência Materna —”
   - Efeito “carregando” com pontinhos
   - Respeita prefers-reduced-motion
   ========================= */
(() => {
  const container = document.querySelector(".hero__rotator");
  if (!container) return;

  // Honra prefers-reduced-motion: não roda nada se o usuário prefere menos movimento
  if (prefersReducedMotion) return;

  // Evita inicialização dupla
  if (container.dataset.rotatorInit === "1") return;
  container.dataset.rotatorInit = "1";

  const label = container.querySelector("span");
  if (!label) return;

  const words = ["Fisioterapia", "Pilates", "Reabilitação"];
  let wordIndex = 0;

  const WORD_INTERVAL = 3500; // tempo para trocar de palavra
  const DOT_INTERVAL  = 450;  // tempo entre cada variação de pontinhos
  const MAX_DOTS      = 3;
  const TRANSITION    = 260;  // deve bater com o CSS (hero__rotator > span)

  let currentDots = 1;
  let wordTimer   = null;
  let dotTimer    = null;

  function render() {
    const base = words[wordIndex];
    const dots = ".".repeat(currentDots);
    label.textContent = base + dots;
  }

  // animação de “carregando”: Fisioterapia. .. ...
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
      // fase de saída (fade/slide out via CSS .is-hiding)
      container.classList.add("is-hiding");

      window.setTimeout(() => {
        // troca de palavra no “meio” da animação
        wordIndex = (wordIndex + 1) % words.length;
        // opcional: recomeça os pontinhos em 1 para cada nova palavra
        currentDots = 1;
        render();
        container.classList.remove("is-hiding");
      }, TRANSITION);
    }

    // primeira troca depois de um intervalo completo (evita “piscar” no load)
    wordTimer = window.setTimeout(function kickoff() {
      cycleWord();
      wordTimer = window.setInterval(cycleWord, WORD_INTERVAL);
    }, WORD_INTERVAL);
  }

  // Estado inicial: mostra “Fisioterapia.”
  wordIndex = 0;
  currentDots = 1;
  render();

  startDots();
  startWordRotation();
})();
