// Shared site code: content loading, palette, nav, footer, smooth scroll, reveals.
// Each page sets <body data-page="..."> and gets its own module from /js/pages/.

const cache = new Map();
export function getJSON(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch(path, { cache: "no-cache" }).then((r) => {
      if (!r.ok) throw new Error(`${path}: ${r.status}`);
      return r.json();
    }));
  }
  return cache.get(path);
}
export const getSite = () => getJSON("/content/site.json");
export const getProjects = () =>
  getJSON("/content/projects.json").then((list) => list.filter((p) => !p.draft && p.cover));

export const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

export const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const CATEGORY_LABELS = { design: "Design", "3d": "3D", motion: "Motion", video: "Video" };

export const icons = {
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 4v12M6 10l6 6 6-6M4 20h16"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05C20.6 8.65 21 11.2 21 14.5V21h-4v-5.8c0-1.4 0-3.2-1.95-3.2S13 13.5 13 15.1V21H9z"/></svg>',
  behance: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8.2 11.3c.9-.4 1.5-1.1 1.5-2.2C9.7 7 8.2 6 6.2 6H1v12h5.4c2.1 0 4-1 4-3.4 0-1.5-.8-2.6-2.2-3.3zM3.6 8.1h2.3c.9 0 1.6.3 1.6 1.2 0 .9-.6 1.3-1.5 1.3H3.6zm2.5 7.8H3.6v-3.1h2.6c1 0 1.7.4 1.7 1.6s-.8 1.5-1.8 1.5zM15 7h5v1.4h-5zm2.6 2.3c-2.6 0-4.3 1.9-4.3 4.4 0 2.6 1.6 4.4 4.3 4.4 2 0 3.3-.9 4-2.8h-2.2c-.2.7-1.1 1-1.7 1-1.3 0-2-.7-2-2h6c.2-2.6-1.3-5-4.1-5zm-1.9 3.4c.1-1 .8-1.7 1.9-1.7 1 0 1.6.6 1.7 1.7z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 2.9 2.9 0 00-.9 2.2c0 1.3.9 2.5 1 2.7.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.6-.3z"/></svg>',
};

let logoId = 0;
export function logoSVG(cls = "") {
  const id = `lm${++logoId}`;
  return `<svg class="${cls}" viewBox="0 0 226.08 342.55" role="img" aria-label="Anas Saleh logo"><defs><mask id="${id}"><rect width="226.08" height="342.55" fill="#fff"/><path transform="matrix(1,0,0,-1,113.045,265.925)" d="M0 0V65.23H43.11ZM-31.28 94.65H-62.55L-31.28 142.04ZM62.55 142.04H31.27V189.43L0 236.81-31.28 189.42-62.55 142.04-93.83 94.65-62.56 47.27V65.19H-31.28V-.12L0-47.51 93.82 94.65Z" fill="#000"/></mask></defs><g mask="url(#${id})"><path transform="matrix(1,0,0,-1,113.04,.000091552738)" d="M0 0-17.83-27.01-26.26-39.79-49.1-74.4-57.53-87.169-80.37-121.78-88.81-134.57-111.65-169.17-113.04-171.28-88.81-207.99-83.16-216.55-57.53-255.38-51.88-263.94-26.26-302.76-20.61-311.33 0-342.55 5.02-334.94 20.61-311.33 36.29-287.57 51.88-263.94 67.57-240.169 83.16-216.55 98.84-192.79 113.04-171.28 111.65-169.17 98.84-149.76 80.37-121.78 67.57-102.38 49.1-74.4 36.29-54.99 17.83-27.01Z" fill="currentColor"/></g></svg>`;
}

/* ---------- palette ---------- */
const PALETTES = ["paper", "stone", "sand"];
function applyPalette(site) {
  const fromUrl = new URLSearchParams(location.search).get("palette");
  const p = PALETTES.includes(fromUrl) ? fromUrl : site.theme?.palette;
  if (PALETTES.includes(p)) document.documentElement.dataset.palette = p;
  if (!fromUrl) {
    try { localStorage.setItem("palette", p); } catch {}
    return;
  }
  // Preview switcher, only when the URL asks for a palette.
  const bar = document.createElement("div");
  bar.className = "palette-switch";
  bar.setAttribute("role", "group");
  bar.setAttribute("aria-label", "Colour palette preview");
  bar.innerHTML = PALETTES.map((name) => `<button type="button" data-p="${name}">${name}</button>`).join("");
  const sync = () => bar.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.p === document.documentElement.dataset.palette)));
  bar.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    document.documentElement.dataset.palette = b.dataset.p;
    const u = new URL(location.href);
    u.searchParams.set("palette", b.dataset.p);
    history.replaceState(null, "", u);
    document.querySelectorAll('a[href^="/"]').forEach((a) => {
      const href = new URL(a.href);
      href.searchParams.set("palette", b.dataset.p);
      a.href = href.pathname + href.search + href.hash;
    });
    sync();
  });
  sync();
  document.body.append(bar);
  // keep the palette while browsing the preview
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="/"]');
    if (!a || a.href.includes("palette=")) return;
    const href = new URL(a.href);
    href.searchParams.set("palette", document.documentElement.dataset.palette);
    a.href = href.pathname + href.search + href.hash;
  }, true);
}

/* ---------- nav ---------- */
function buildNav(site) {
  const el = document.getElementById("nav");
  if (!el) return;
  const page = document.body.dataset.page;
  const links = [
    { href: "/work", label: "Work", key: "work" },
    site.inProduction?.show ? { href: "/in-production", label: "In Production", key: "production" } : null,
    { href: "/about", label: "About", key: "about" },
  ].filter(Boolean);
  el.className = "nav";
  el.innerHTML = `<div class="wrap nav__inner">
      <a class="nav__brand" href="/" aria-label="${esc(site.name)}, home">${logoSVG("nav__logo")}<span class="nav__name">${esc(site.name)}</span></a>
      <button class="nav__toggle" type="button" aria-expanded="false" aria-controls="nav-links"><span></span><b class="sr-only">Menu</b></button>
      <ul class="nav__links" id="nav-links">
        ${links.map((l) => `<li><a class="link" href="${l.href}"${l.key === page ? ' aria-current="page"' : ""}>${l.label}</a></li>`).join("")}
        <li><a class="nav__cta" href="/contact"${page === "contact" ? ' aria-current="page"' : ""}><span>Contact</span></a></li>
      </ul>
    </div>`;
  const toggle = el.querySelector(".nav__toggle");
  toggle.addEventListener("click", () => {
    const open = el.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
    document.documentElement.style.overflow = open ? "hidden" : "";
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && el.classList.contains("is-open")) toggle.click();
  });

  // Light text over dark sections
  const check = () => {
    const y = (parseFloat(getComputedStyle(el).height) || 72) / 2;
    const over = [...document.querySelectorAll(".is-dark")].some((s) => {
      const r = s.getBoundingClientRect();
      return r.top <= y && r.bottom >= y;
    });
    el.classList.toggle("on-dark", over);
  };
  // Hide on scroll down, show on scroll up
  let last = scrollY;
  const onScroll = () => {
    check();
    const y = scrollY;
    if (!el.classList.contains("is-open")) el.classList.toggle("is-hidden", y > last && y > 400);
    last = y;
  };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", check);
  check();
}

/* ---------- footer ---------- */
function buildFooter(site) {
  const el = document.getElementById("footer");
  if (!el) return;
  const c = site.contact || {};
  el.className = "footer is-dark";
  el.innerHTML = `<div class="wrap">
      <div class="footer__top">
        <div>
          ${logoSVG("footer__logo")}
          <p class="eyebrow">Get in touch</p>
          <div class="footer__mail"><a class="link" href="mailto:${esc(c.email)}">${esc(c.email)}</a><button class="copy-btn" type="button" data-copy="${esc(c.email)}">Copy</button></div>
          <div class="socials">
            ${c.linkedin ? `<a href="${esc(c.linkedin)}" target="_blank" rel="noopener" aria-label="LinkedIn">${icons.linkedin}</a>` : ""}
            ${c.behance ? `<a href="${esc(c.behance)}" target="_blank" rel="noopener" aria-label="Behance">${icons.behance}</a>` : ""}
            ${c.instagram ? `<a href="${esc(c.instagram)}" target="_blank" rel="noopener" aria-label="Instagram">${icons.instagram}</a>` : ""}
            ${c.whatsapp ? `<a href="${esc(c.whatsapp)}" target="_blank" rel="noopener" aria-label="WhatsApp">${icons.whatsapp}</a>` : ""}
          </div>
        </div>
        <div>
          <h3>Pages</h3>
          <ul>
            <li><a class="link" href="/">Home</a></li>
            <li><a class="link" href="/work">Work</a></li>
            ${site.inProduction?.show ? '<li><a class="link" href="/in-production">In Production</a></li>' : ""}
            <li><a class="link" href="/about">About</a></li>
            <li><a class="link" href="/contact">Contact</a></li>
          </ul>
        </div>
        <div>
          <h3>Based in</h3>
          <p>${esc(site.location)}</p>
          <a class="arrow-link" href="${esc(site.about?.cv)}" target="_blank" rel="noopener">Download CV ${icons.download}</a>
        </div>
      </div>
      <p class="display footer__big" aria-hidden="true">${esc(site.name)}</p>
      <div class="footer__bottom"><span>&copy; ${new Date().getFullYear()} ${esc(site.fullName)}</span><span>anassaleh.me</span></div>
    </div>`;
}

/* ---------- copy buttons ---------- */
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-copy]");
  if (!b) return;
  const label = b.textContent;
  try {
    await navigator.clipboard.writeText(b.dataset.copy);
    b.textContent = "Copied";
  } catch {
    b.textContent = "Press Ctrl+C";
  }
  setTimeout(() => (b.textContent = label), 1600);
});

/* ---------- motion ---------- */
export let lenis = null;
function startMotion() {
  const { gsap, ScrollTrigger, Lenis } = window;
  if (reduceMotion || !gsap || !ScrollTrigger) return false;
  document.documentElement.classList.add("js-motion");
  gsap.registerPlugin(ScrollTrigger);
  if (Lenis) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a || a.getAttribute("href").length < 2) return;
      const target = document.querySelector(a.getAttribute("href"));
      if (target) { e.preventDefault(); lenis.scrollTo(target, { offset: -20 }); }
    });
  }
  return true;
}

export function reveal(root = document) {
  const items = [...root.querySelectorAll("[data-reveal]:not(.is-in)")];
  if (!document.documentElement.classList.contains("js-motion")) {
    items.forEach((el) => el.classList.add("is-in"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      el.style.transitionDelay = `${Math.min(Number(el.dataset.reveal) || 0, 6) * 80}ms`;
      el.classList.add("is-in");
      io.unobserve(el);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  items.forEach((el) => io.observe(el));
}

/* ---------- shared bits ---------- */
export function cardHTML(p, i = 0) {
  return `<a class="card" href="/work/${esc(p.slug)}" data-cats="${esc((p.categories || []).join(" "))}" data-reveal="${i % 2}">
    <div class="card__media"><img src="${esc(p.cover)}" alt="${esc(p.title)}, ${esc(p.subtitle)}" loading="lazy" decoding="async" width="1600" height="1200"></div>
    <div class="card__body">
      <div><h3 class="card__title">${esc(p.title)}</h3><span class="card__sub">${esc(p.subtitle)}</span></div>
      <span class="card__year">${esc(p.year)}</span>
    </div>
  </a>`;
}

export function videoEmbed(url) {
  if (!url) return null;
  let m;
  if ((m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/)))
    return { src: `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&rel=0`, thumb: `https://i.ytimg.com/vi/${m[1]}/maxresdefault.jpg` };
  if ((m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)))
    return { src: `https://player.vimeo.com/video/${m[1]}?autoplay=1&dnt=1`, thumb: null };
  if (/adobe\.io\/.*\/embed/.test(url)) return { src: url, thumb: null };
  return { src: url, thumb: null };
}

export function videoHTML(url, poster, title, tall = false) {
  const v = videoEmbed(url);
  if (!v) return "";
  return `<div class="video${tall ? " video--tall" : ""}" data-src="${esc(v.src)}" data-title="${esc(title)}">
    ${poster || v.thumb ? `<img src="${esc(poster || v.thumb)}" alt="" loading="lazy">` : ""}
    <button class="video__play" type="button" aria-label="Play video: ${esc(title)}"><span>${icons.play} Play film</span></button>
  </div>`;
}
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".video__play");
  if (!btn) return;
  const box = btn.closest(".video");
  box.innerHTML = `<iframe src="${box.dataset.src}" title="${box.dataset.title}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe>`;
});

/* ---------- boot ---------- */
async function boot() {
  const site = await getSite().catch(() => ({ name: "Anas Saleh", fullName: "Anas Al Shikh Saleh", contact: {} }));
  applyPalette(site);
  const motion = startMotion();
  buildFooter(site);
  buildNav(site);
  const page = document.body.dataset.page;
  try {
    const mod = await import(`/js/pages/${page}.js`);
    await mod.default?.({ site, motion });
  } catch (err) {
    console.error(err);
  }
  reveal();
  window.ScrollTrigger?.refresh();
}
boot();
