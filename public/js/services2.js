// Services page: the services as a list you open one at a time (packages and what each includes), a frame beside it
// that shows that service's work, a vertical timeline of how a project runs, questions, and a way to ask for a quote.
// Content comes from site.json (servicesPage, from content/services.json); a service's examples are the newest
// projects in the categories it names, or the images set on it.
import { shell, $, $$, esc, accent, pad, slug, cover, srcset, inCategory, canHover } from "/js/shell2.js";

const { site, projects, lenis, reveal } = await shell({ current: "services" });
const s = site.servicesPage || {};
const items = s.items || [];
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg>';
const words = (t) => accent(t).replace(/<span class="acc">(.*?)<\/span>|(\S+)/g, (m, a, w) => (a ? a.split(" ").map((x) => `<span class="ln"><span class="w acc">${x}</span></span>`).join(" ") : `<span class="ln"><span class="w">${w}</span></span>`));

// the title is already in the page (so it rises at once); it only changes if the CMS headline is different
const title = $("[data-sv-title]");
if (s.headline && title.textContent.replace(/\s+/g, " ").trim().toLowerCase() !== s.headline.replace(/[[\]]/g, "").toLowerCase()) title.innerHTML = words(s.headline);
$("[data-sv-intro]").textContent = s.intro || "";

// what a service shows: a few projects (cover, title, link), or its own images (drawings, shown side by side)
const shows = items.map((x) => {
  if ((x.images || []).length) return { art: true, list: x.images.slice(0, 3).map((src) => ({ src })) };
  const keys = String(x.examples || "").split(",").map((c) => slug(c)).filter(Boolean);
  const list = projects.filter((p) => keys.some((k) => inCategory(p, k)))
    .sort((a, b) => (b.featured === true) - (a.featured === true)).slice(0, 3)
    .map((p) => ({ src: cover(p), title: p.title, href: `/work/${p.slug}` }));
  return { art: false, list };
});
const SIZES = "(max-width: 960px) 100vw, 40vw";
const slidesHTML = (sh, alt) => sh.art
  ? `<div class="sv-slide sv-slide--art on">${sh.list.map((x) => `<span><img src="${esc(x.src)}"${srcset(x.src, "(max-width: 960px) 33vw, 14vw")} alt="Pencil drawing by ${esc(site.fullName)}" loading="lazy"></span>`).join("")}</div>`
  : sh.list.map((x, j) => `<a class="sv-slide${j ? "" : " on"}" href="${x.href}" data-cursor="View" tabindex="${j ? -1 : 0}"><img src="${esc(x.src)}"${srcset(x.src, SIZES)} alt="${esc(x.title)}, ${esc(alt)} example" loading="lazy"><span class="sv-slide__t">${esc(x.title)}</span></a>`).join("");

$("[data-sv]").innerHTML = items.map((x, i) => {
  const ask = `/contact?service=${encodeURIComponent(x.formService || x.name)}`;
  const packs = x.packages || [];
  return `<li class="sv-row" id="${slug(x.name)}" data-reveal>
    <h2 class="sv-row__h"><button type="button" class="sv-row__btn" aria-expanded="false" aria-controls="sv-body-${i}" id="sv-btn-${i}">
      <span class="sv-row__n">${pad(i + 1)}</span>
      <span class="sv-row__name up">${esc(x.name)}</span>
      <span class="sv-row__count">${packs.length} ${packs.length === 1 ? "package" : "packages"}</span>
      <span class="pm" aria-hidden="true"><i></i></span>
    </button></h2>
    <div class="sv-row__body" id="sv-body-${i}" role="region" aria-labelledby="sv-btn-${i}"><div><div class="sv-row__inner">
      <div class="sv-row__pic">${shows[i].list.length ? slidesHTML({ ...shows[i], list: shows[i].list.slice(0, shows[i].art ? 3 : 1) }, x.name) : ""}</div>
      <p class="sv-row__line">${esc(x.line || "")}</p>
      <div class="sv-packs">${packs.map((k, j) => `<section class="sv-pack">
        <div class="sv-pack__head"><span class="sv-pack__n">${String.fromCharCode(65 + j)}</span><h3 class="sv-pack__name up">${esc(k.name)}</h3></div>
        ${k.text ? `<p class="sv-pack__text">${esc(k.text)}</p>` : ""}
        ${(k.includes || []).length ? `<div class="sv-pack__inc"><span class="sv-pack__label">What's included</span><ul>${k.includes.map((t) => `<li>${CHECK}<span>${esc(t)}</span></li>`).join("")}</ul></div>` : ""}
      </section>`).join("")}</div>
      <div class="sv-row__foot">
        <a class="btn btn--ink" href="${ask}">Ask for a quote ${ARROW}</a>
        ${x.note ? `<p class="sv-row__note">${esc(x.note)}</p>` : ""}
      </div>
    </div></div></div>
  </li>`;
}).join("");

// the frame beside the list (wide screens): each service's work, cross-fading through its examples
const frame = $("[data-sv-frame]");
frame.innerHTML = `<div class="sv-frame__box">${items.map((x, i) => `<div class="sv-set${shows[i].art ? " sv-set--art" : ""}" data-set="${i}">${slidesHTML(shows[i], x.name)}</div>`).join("")}</div>
  <div class="sv-frame__bar"><span class="sv-frame__name" data-frame-name></span><span class="sv-frame__dots" data-frame-dots></span></div>`;
const sets = $$(".sv-set", frame);
let cur = -1, slide = 0, timer;
const dots = $("[data-frame-dots]");
const showSlide = (j) => {
  const list = $$(".sv-slide", sets[cur]);
  if (shows[cur].art || !list.length) return;
  slide = (j + list.length) % list.length;
  list.forEach((el, k) => { el.classList.toggle("on", k === slide); el.tabIndex = k === slide ? 0 : -1; });
  $$("button", dots).forEach((d, k) => d.setAttribute("aria-current", String(k === slide)));
};
const play = () => { clearInterval(timer); if (!reduce && !shows[cur].art && shows[cur].list.length > 1) timer = setInterval(() => showSlide(slide + 1), 3400); };
const showSet = (i) => {
  if (i === cur || !sets[i]) return;
  cur = i;
  sets.forEach((el, k) => el.classList.toggle("on", k === i));
  $("[data-frame-name]").textContent = items[i].name;
  const n = shows[i].art ? 0 : shows[i].list.length;
  dots.innerHTML = n > 1 ? Array.from({ length: n }, (_, k) => `<button type="button" aria-label="Example ${k + 1}"></button>`).join("") : "";
  $$("button", dots).forEach((d, k) => d.addEventListener("click", () => { showSlide(k); play(); }));
  showSlide(0);
  play();
};

// open one service at a time; pointing at a row (with a mouse) also shows its work in the frame
const rows = $$(".sv-row");
const setOpen = (row, open) => {
  row.classList.toggle("open", open);
  $(".sv-row__btn", row).setAttribute("aria-expanded", String(open));
};
rows.forEach((row, i) => {
  $(".sv-row__btn", row).addEventListener("click", () => {
    const open = !row.classList.contains("open");
    rows.forEach((r) => setOpen(r, false));
    setOpen(row, open);
    if (open) showSet(i);
    // the page height changes while the row opens, so smooth scroll measures again afterwards
    setTimeout(() => lenis?.resize(), 750);
  });
  if (canHover) row.addEventListener("pointerenter", () => showSet(i));
});
setOpen(rows[0], true);
showSet(0);
// an address like /services#3d-design opens that service
const hashRow = location.hash && rows.find((r) => `#${r.id}` === location.hash);
if (hashRow) { rows.forEach((r) => setOpen(r, false)); setOpen(hashRow, true); showSet(rows.indexOf(hashRow)); }

// process: a vertical timeline
const p = s.process || {};
$("[data-process-title]").innerHTML = accent(p.title || "How we [work]");
$("[data-process-intro]").textContent = p.intro || "";
const tlList = $("[data-steps]");
tlList.innerHTML = (p.steps || []).map((st, i) => `<li class="sv-step">
  <span class="sv-step__n">Step ${pad(i + 1)}</span>
  <h3 class="sv-step__t up">${esc(st.title)}</h3>
  <p>${esc(st.text)}</p>
  ${st.tag ? `<span class="sv-step__tag">${esc(st.tag)}</span>` : ""}
</li>`).join("");
if (!(p.steps || []).length) $(".sv-process").remove();
const steps = $$(".sv-step", tlList), fill = $("[data-tl-fill]"), tl = $(".sv-tl");

const f = s.faq || {};
$("[data-faq-title]").innerHTML = accent(f.title || "Questions");
$("[data-faq]").innerHTML = (f.items || []).map((q) => `<details class="sv-q" data-reveal>
  <summary><span>${esc(q.q)}</span><span class="pm" aria-hidden="true"><i></i></span></summary>
  <p>${esc(q.a)}</p>
</details>`).join("");
if (!(f.items || []).length) $(".sv-faq").remove();

$("[data-sv-cta]").textContent = s.cta || "";
reveal();
lenis?.resize();

// the timeline line fills down to the reading line, and each step lights up as it reaches it
if (tl) (function loop() {
  requestAnimationFrame(loop);
  const r = tl.getBoundingClientRect(), line = innerHeight * 0.68;
  if (r.bottom < -100 || r.top > innerHeight + 100) return;
  fill.style.transform = `scaleY(${Math.min(1, Math.max(0, (line - r.top) / r.height))})`;
  steps.forEach((el) => el.classList.toggle("on", el.getBoundingClientRect().top < line));
})();
