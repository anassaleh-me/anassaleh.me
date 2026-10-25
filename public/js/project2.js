// Project page (stage 3), served at /work/<slug>. Dark opener with the title rising in, the cover that opens up
// to full width as you scroll, the story, the film, the gallery, and the next project.
import { shell, $, $$, esc, lerp, clamp, cats, cover } from "/js/shell2.js";

const { projects, reveal } = await shell({ current: "work" });
const main = $("[data-project]");
const slug = location.pathname.match(/^\/work\/([\w-]+)/)?.[1] || new URLSearchParams(location.search).get("p");
const i = projects.findIndex((p) => p.slug === slug);
const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

// YouTube and Vimeo page links become their players; other player links are used as they are
const embed = (u) => {
  const yt = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0`;
  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?dnt=1`;
  return u;
};

if (i < 0) {
  document.title = "Not found, Anas Saleh";
  main.innerHTML = `<header class="ph wrap"><span class="label">404</span><h1 class="ph__title up">Not <span class="acc">found</span></h1>
    <div class="ph__foot"><p>This project doesn't exist or was moved.</p><a class="btn btn--ink" href="/work">See all work ${ARROW}</a></div></header>`;
} else render(projects[i], projects[(i + 1) % projects.length]);

function render(p, next) {
  document.title = `${p.title}, Anas Saleh`;
  $('meta[name="description"]').setAttribute("content", `${p.title}: ${p.subtitle}. ${p.description || ""}`.slice(0, 160));
  const meta = [["Client", p.client], ["Year", p.year], ["Role", p.role], ["Tools", p.tools], ["Format", p.format]].filter(([, v]) => v);
  const words = p.title.split(/\s+/);
  const tall = /9:16/.test(p.format || "");

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

  ${p.video ? `<section class="pj-film dark" data-dark aria-label="Film">
    <div class="wrap"><span class="label" data-reveal>Watch</span>
      <div class="pj-player${tall ? " tall" : ""}" data-reveal><iframe src="${esc(embed(p.video))}" title="${esc(p.title)}, film" loading="lazy" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe></div>
    </div>
  </section>` : ""}

  ${(p.images || []).length ? `<section class="pj-gallery wrap" aria-label="Project images">
    ${p.images.map((src, n) => `<figure class="wide" data-reveal><div class="pj-par"><img src="${esc(src)}" alt="${esc(p.title)}, image ${n + 1}" loading="lazy" decoding="async"></div></figure>`).join("")}
  </section>` : ""}

  <a class="pj-next dark" data-dark href="/work/${esc(next.slug)}" data-cursor="Next">
    <div class="wrap">
      <span class="label">Next project</span>
      <span class="pj-next__t up">${esc(next.title)}</span>
      <span class="pj-next__s">${esc(next.subtitle)} · ${cats(next)}</span>
    </div>
    <span class="pj-next__img" aria-hidden="true"><img src="${cover(next)}" alt="" loading="lazy"></span>
  </a>`;

  // opening: title words rise one after another, the cover comes into focus from below
  const E = "cubic-bezier(.16,1,.3,1)";
  $$(".pj-title .w").forEach((w, n) => w.animate([{ transform: "translateY(110%) rotate(4deg)" }, { transform: "none" }], { duration: 1300, delay: 200 + n * 120, easing: E, fill: "backwards" }));
  $$("[data-intro]").forEach((el, n) => el.animate([{ opacity: 0, transform: "translateY(20px)", filter: "blur(8px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], { duration: 1100, delay: 500 + n * 160, easing: E, fill: "backwards" }));
  const coverEl = $("[data-cover]");
  coverEl.animate([{ opacity: 0, transform: "translateY(80px)", filter: "blur(18px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], { duration: 1600, delay: 450, easing: E, fill: "backwards" });

  // gallery: images that aren't wide sit side by side in pairs
  const figs = $$(".pj-gallery figure");
  Promise.all(figs.map((f) => {
    const img = f.querySelector("img");
    return (img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = r; })).then(() => (f.dataset.ratio = img.naturalWidth / (img.naturalHeight || 1)));
  })).then(() => {
    for (let n = 0; n < figs.length; n++) {
      if (Number(figs[n].dataset.ratio) < 1.25 && Number(figs[n + 1]?.dataset.ratio) < 1.25) { figs[n].classList.remove("wide"); figs[n + 1].classList.remove("wide"); n++; }
    }
  });
  reveal();

  // scroll: the cover opens out to the full width, gallery images drift inside their frames,
  // and the next-project cover follows the pointer
  const coverImg = coverEl.querySelector("img");
  const pars = $$(".pj-par img");
  const nx = $(".pj-next"), nImg = $(".pj-next__img");
  const nm = { x: 0, y: 0, tx: 0, ty: 0 };
  nx.addEventListener("pointermove", (e) => { const r = nx.getBoundingClientRect(); nm.tx = e.clientX - r.left; nm.ty = e.clientY - r.top; });
  let open = 0;
  (function loop() {
    requestAnimationFrame(loop);
    const r = coverEl.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0) {
      const target = clamp(1 - (r.top - innerHeight * 0.12) / (innerHeight * 0.7), 0, 1);
      open = lerp(open, target, 0.12);
      const inset = (1 - open) * Math.min(innerWidth * 0.09, 140);
      coverEl.style.clipPath = `inset(0 ${inset}px round ${(1 - open) * 22 + 2}px)`;
      coverImg.style.transform = `scale(${1.12 - open * 0.12}) translateY(${(r.top / innerHeight) * -6}%)`;
    }
    pars.forEach((img) => {
      const b = img.parentElement.getBoundingClientRect();
      if (b.bottom < 0 || b.top > innerHeight) return;
      const k = (b.top + b.height / 2 - innerHeight / 2) / innerHeight;
      img.style.transform = `translateY(${k * -7}%) scale(1.12)`;
    });
    nm.x = lerp(nm.x, nm.tx, 0.12); nm.y = lerp(nm.y, nm.ty, 0.12);
    nImg.style.transform = `translate(${nm.x}px, ${nm.y}px) translate(-50%, -50%) rotate(${clamp((nm.tx - nm.x) * 0.06, -8, 8)}deg)`;
  })();
}
