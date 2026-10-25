// Project page (stage 3), served at /work/<slug>. Dark opener with the title rising in, the cover that grows to
// full width as you scroll (always whole, never cropped), the story, the film, the gallery, previous and next project.
import { shell, $, $$, esc, lerp, clamp, cats, cover } from "/js/shell2.js";

const { projects, reveal } = await shell({ current: "work" });
const main = $("[data-project]");
const slug = location.pathname.match(/^\/work\/([\w-]+)/)?.[1] || new URLSearchParams(location.search).get("p");
const i = projects.findIndex((p) => p.slug === slug);
const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

// Vimeo and YouTube links become their players. Other links (the old Adobe/Behance players stopped working) are skipped.
const embed = (u = "") => {
  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?dnt=1&autoplay=1`;
  const yt = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0&autoplay=1`;
  return "";
};

if (i < 0) {
  document.title = "Not found, Anas Saleh";
  main.innerHTML = `<header class="ph wrap"><span class="label">404</span><h1 class="ph__title up">Not <span class="acc">found</span></h1>
    <div class="ph__foot"><p>This project doesn't exist or was moved.</p><a class="btn btn--ink" href="/work">See all work ${ARROW}</a></div></header>`;
} else render(projects[i], projects[(i - 1 + projects.length) % projects.length], projects[(i + 1) % projects.length]);

function render(p, prev, next) {
  document.title = `${p.title}, Anas Saleh`;
  $('meta[name="description"]').setAttribute("content", `${p.title}: ${p.subtitle}. ${p.description || ""}`.slice(0, 160));
  const meta = [["Client", p.client], ["Year", p.year], ["Role", p.role], ["Tools", p.tools], ["Format", p.format]].filter(([, v]) => v);
  const words = p.title.split(/\s+/);
  const tall = /9:16/.test(p.format || "");
  const film = embed(p.video);
  const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
  // layout rows from the CMS: 1 to 4 pieces side by side, same height, never cropped.
  // Older entries with a flat `images` list show one per row.
  const rows = (p.blocks || (p.images || []).map((src) => ({ images: [src] }))).filter((r) => r.images?.length);
  let count = 0;
  const media = (src) => {
    count++;
    if (/\.(mp4|webm)$/i.test(src)) {
      const poster = src.replace(/\.(mp4|webm)$/i, "-poster.webp");
      return `<video src="${esc(src)}" poster="${esc(poster)}" muted loop playsinline preload="none" aria-label="${esc(p.title)}, animation ${count}"></video>`;
    }
    return `<img src="${esc(src)}" alt="${esc(p.title)}, image ${count}" loading="lazy" decoding="async">`;
  };
  const rowHTML = (r) => `<div class="pj-row" data-n="${r.images.length}" data-reveal>
      <div class="pj-row__items">${r.images.map((src) => `<figure>${media(src)}</figure>`).join("")}</div>
      ${r.caption ? `<p class="pj-row__cap">${esc(r.caption)}</p>` : ""}
    </div>`;
  const side = (q, dir) => `<a class="pj-nav__item ${dir}" href="/work/${esc(q.slug)}" data-cursor="${dir === "prev" ? "Previous" : "Next"}">
      <span class="label">${dir === "prev" ? "Previous project" : "Next project"}</span>
      <span class="pj-nav__t up">${esc(q.title)}</span>
      <span class="pj-nav__s">${esc(q.subtitle)} · ${cats(q)}</span>
      <span class="pj-nav__img" aria-hidden="true"><img src="${cover(q)}" alt="" loading="lazy"></span>
    </a>`;

  main.innerHTML = `
  <section class="pj-hero dark" data-dark>
    <div class="wrap">
      <a class="pj-back" href="/work" data-intro><span aria-hidden="true">&larr;</span> All work</a>
      <h1 class="pj-title up">${words.map((w, n) => `<span class="ln"><span class="w${n === words.length - 1 && words.length > 1 ? " acc" : ""}">${esc(w)}</span></span>`).join(" ")}</h1>
      <div class="pj-sub" data-intro><p>${esc(p.subtitle)}</p><span>${cats(p)}</span></div>
    </div>
    <div class="pj-cover" data-cover><img src="${cover(p)}" alt="${esc(p.title)}, cover" fetchpriority="high"></div>
  </section>

  <section class="pj-info wrap">
    <div class="pj-story">
      <span class="label" data-reveal>The project</span>
      <p class="pj-lead" data-reveal>${esc(p.description || "")}</p>
    </div>
    <dl class="pj-meta">${meta.map(([k, v]) => `<div data-reveal><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
  </section>

  ${film ? `<section class="pj-film dark" data-dark aria-label="Film">
    <div class="wrap"><span class="label" data-reveal>Watch</span>
      <button type="button" class="pj-player${tall ? " tall" : ""}" data-film="${esc(film)}" data-cursor="Play" aria-label="Play the ${esc(p.title)} film" data-reveal>
        <img src="${cover(p)}" alt="" loading="lazy"><span class="pj-play">${PLAY}</span>
      </button>
    </div>
  </section>` : ""}

  ${rows.length ? `<section class="pj-gallery wrap" aria-label="Project images">${rows.map(rowHTML).join("")}</section>` : ""}

  <nav class="pj-nav dark" data-dark aria-label="More projects">${side(prev, "prev")}${side(next, "next")}</nav>`;

  // the film loads only when asked for: a still cover with a play button until then
  $("[data-film]")?.addEventListener("click", (e) => {
    const b = e.currentTarget;
    b.innerHTML = `<iframe src="${esc(b.dataset.film)}" title="${esc(p.title)}, film" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe>`;
    b.removeAttribute("data-cursor"); b.classList.add("on");
  }, { once: true });

  // opening: title words rise one after another, the cover comes into focus from below
  const E = "cubic-bezier(.16,1,.3,1)";
  $$(".pj-title .w").forEach((w, n) => w.animate([{ transform: "translateY(110%) rotate(4deg)" }, { transform: "none" }], { duration: 1300, delay: 200 + n * 120, easing: E, fill: "backwards" }));
  $$("[data-intro]").forEach((el, n) => el.animate([{ opacity: 0, transform: "translateY(20px)", filter: "blur(8px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], { duration: 1100, delay: 500 + n * 160, easing: E, fill: "backwards" }));
  const coverEl = $("[data-cover]");
  coverEl.animate([{ opacity: 0, transform: "translateY(80px)", filter: "blur(18px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], { duration: 1600, delay: 450, easing: E, fill: "backwards" });

  // rows: each piece takes width in proportion to its shape, so a row lines up at one height.
  // A piece smaller than the page is never blown up past its own size.
  $$(".pj-row figure").forEach((f) => {
    const el = f.firstElementChild;
    const fit = (w, h) => {
      if (!w || !h) return;
      f.style.flex = `${w / h} 1 0`;
      f.style.aspectRatio = `${w} / ${h}`;
      if (f.parentElement.children.length === 1) f.style.maxWidth = `${w}px`;
    };
    if (el.tagName === "VIDEO") {
      const still = new Image();
      still.onload = () => fit(still.naturalWidth, still.naturalHeight);
      still.src = el.poster;
      el.addEventListener("loadedmetadata", () => fit(el.videoWidth, el.videoHeight));
    } else if (el.complete) fit(el.naturalWidth, el.naturalHeight);
    else el.addEventListener("load", () => fit(el.naturalWidth, el.naturalHeight));
  });
  // loops play only while on screen
  const loopIO = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.preload = "auto"; e.target.play().catch(() => {}); } else e.target.pause();
  }), { rootMargin: "200px 0px" });
  $$(".pj-row video").forEach((v) => loopIO.observe(v));
  reveal();

  // scroll: the cover grows to the full width; the previous and next covers follow the pointer
  const navs = $$(".pj-nav__item").map((a) => {
    const m = { img: a.querySelector(".pj-nav__img"), x: 0, y: 0, tx: 0, ty: 0 };
    a.addEventListener("pointermove", (e) => { const r = a.getBoundingClientRect(); m.tx = e.clientX - r.left; m.ty = e.clientY - r.top; });
    a.addEventListener("pointerenter", (e) => { const r = a.getBoundingClientRect(); m.x = m.tx = e.clientX - r.left; m.y = m.ty = e.clientY - r.top; });
    return m;
  });
  let open = 0;
  (function loop() {
    requestAnimationFrame(loop);
    const r = coverEl.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0) {
      const target = clamp(1 - (r.top - innerHeight * 0.12) / (innerHeight * 0.7), 0, 1);
      open = lerp(open, target, 0.12);
      // the whole picture is always visible: it grows from a framed size to the full width
      coverEl.style.transform = `scale(${0.8 + open * 0.2})`;
      coverEl.style.borderRadius = `${(1 - open) * 26}px`;
    }
    navs.forEach((m) => {
      m.x = lerp(m.x, m.tx, 0.14); m.y = lerp(m.y, m.ty, 0.14);
      m.img.style.transform = `translate(${m.x}px, ${m.y}px) translate(-50%, -50%) rotate(${clamp((m.tx - m.x) * 0.06, -8, 8)}deg)`;
    });
  })();
}
