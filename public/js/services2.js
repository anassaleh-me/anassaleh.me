// Services page: the service areas as a list you open one at a time (the services each covers), a frame beside it that
// shows that area's work, ready-made packages grouped by service, a vertical timeline of how a project runs, questions,
// and a way to ask for a quote.
// Content comes from site.json (servicesPage, from content/services.json); a service's examples are the newest
// projects in the categories it names, or the images set on it.
import { shell, $, $$, esc, accent, pad, slug, cover, srcset, inCategory, canHover } from "/js/shell2.js";

const { site, projects, lenis, reveal } = await shell({ current: "services" });
const s = site.servicesPage || {};
const items = s.items || [];
const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg>';
const words = (t) => accent(t).replace(/<span class="acc">(.*?)<\/span>|(\S+)/g, (m, a, w) => (a ? a.split(" ").map((x) => `<span class="ln"><span class="w acc">${x}</span></span>`).join(" ") : `<span class="ln"><span class="w">${w}</span></span>`));

// the title is already in the page (so it rises at once); it only changes if the CMS headline is different
const title = $("[data-sv-title]");
if (s.headline && title.textContent.replace(/\s+/g, " ").trim().toLowerCase() !== s.headline.replace(/[[\]]/g, "").toLowerCase()) title.innerHTML = words(s.headline);
$("[data-sv-intro]").textContent = s.intro || "";

// what a service shows: the projects picked for it in Pages CMS (by page address or title), else the newest projects
// in its categories; or its own images (drawings, shown side by side)
const findProject = (ref) => { const k = slug(ref); return projects.find((p) => p.slug === k || slug(p.title) === k); };
const shows = items.map((x) => {
  if ((x.images || []).length) return { art: true, list: x.images.slice(0, 3).map((src) => ({ src })) };
  let picked = (x.projects || []).map(findProject).filter(Boolean);
  if (!picked.length) {
    const keys = String(x.examples || "").split(",").map((c) => slug(c)).filter(Boolean);
    picked = projects.filter((p) => keys.some((k) => inCategory(p, k))).sort((a, b) => (b.featured === true) - (a.featured === true)).slice(0, 3);
  }
  return { art: false, list: picked.slice(0, 6).map((p) => ({ src: cover(p), title: p.title, href: `/work/${p.slug}` })) };
});
const SIZES = "(max-width: 960px) 100vw, 40vw";
const PREV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>';
// a carousel of a service's examples: slides cross-fade on their own, a line along the bottom shows the time to the next,
// arrows and a counter underneath, and a swipe works on touch screens
const carouselHTML = (sh, name) => {
  const slides = sh.art
    ? `<div class="sv-slide sv-slide--art on">${sh.list.map((x) => `<span><img src="${esc(x.src)}"${srcset(x.src, "(max-width: 960px) 33vw, 14vw")} alt="Pencil drawing by ${esc(site.fullName)}" loading="lazy"></span>`).join("")}</div>`
    : sh.list.map((x, j) => `<a class="sv-slide${j ? "" : " on"}" href="${x.href}" data-cursor="View" tabindex="${j ? -1 : 0}" aria-hidden="${j ? "true" : "false"}"><img src="${esc(x.src)}"${srcset(x.src, SIZES)} alt="${esc(x.title)}, ${esc(name)} example" loading="lazy"><span class="sv-slide__t">${esc(x.title)}</span></a>`).join("");
  const n = sh.art ? 1 : sh.list.length;
  return `<div class="cr" data-cr data-n="${n}">
    <div class="cr__box">${slides}${n > 1 ? '<span class="cr__time" aria-hidden="true"><i></i></span>' : ""}</div>
    <div class="cr__ui"><span class="cr__name">${esc(name)}</span>${n > 1 ? `<span class="cr__count" aria-live="polite"><b>01</b> / ${pad(n)}</span><button type="button" class="cr__btn" data-prev aria-label="Previous example">${PREV}</button><button type="button" class="cr__btn" data-next aria-label="Next example">${ARROW}</button>` : ""}</div>
  </div>`;
};
const DELAY = 4200;
function carousel(root) {
  const slides = $$(".sv-slide", root), n = slides.length, time = $(".cr__time i", root), count = $(".cr__count b", root);
  let i = 0, timer = 0, playing = false, hover = false;
  const go = (k) => {
    i = (k + n) % n;
    slides.forEach((el, j) => { el.classList.toggle("on", j === i); el.tabIndex = j === i ? 0 : -1; el.setAttribute("aria-hidden", String(j !== i)); });
    if (count) count.textContent = pad(i + 1);
    tick();
  };
  // the time line restarts with every slide and runs while the carousel plays
  const tick = () => {
    clearTimeout(timer);
    if (!time) return;
    time.style.animation = "none"; void time.offsetWidth;
    if (!playing || hover) return;
    time.style.animation = `cr-time ${DELAY}ms linear forwards`;
    timer = setTimeout(() => go(i + 1), DELAY);
  };
  if (n > 1) {
    $("[data-prev]", root).addEventListener("click", () => go(i - 1));
    $("[data-next]", root).addEventListener("click", () => go(i + 1));
    const box = $(".cr__box", root);
    box.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") { hover = true; tick(); } });
    box.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") { hover = false; tick(); } });
    let x0 = null, swiped = false;
    box.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") { x0 = e.clientX; swiped = false; } });
    box.addEventListener("pointerup", (e) => { if (x0 === null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 40) { swiped = true; go(i + (dx < 0 ? 1 : -1)); } });
    box.addEventListener("click", (e) => { if (swiped) { e.preventDefault(); swiped = false; } }, true);
  }
  return { play() { playing = true; go(0); }, stop() { playing = false; tick(); } };
}

$("[data-sv]").innerHTML = items.map((x, i) => {
  const ask = `/contact?service=${encodeURIComponent(x.formService || x.name)}`;
  const list = x.services || [];
  const group = (s.packages?.groups || []).find((g) => (g.formService || g.name) === (x.formService || x.name));
  return `<li class="sv-row" id="${slug(x.name)}" data-reveal>
    <h2 class="sv-row__h"><button type="button" class="sv-row__btn" aria-expanded="false" aria-controls="sv-body-${i}" id="sv-btn-${i}">
      <span class="sv-row__n">${pad(i + 1)}</span>
      <span class="sv-row__name up">${esc(x.name)}</span>
      <span class="sv-row__count">${list.length} ${list.length === 1 ? "service" : "services"}</span>
      <span class="pm" aria-hidden="true"><i></i></span>
    </button></h2>
    <div class="sv-row__body" id="sv-body-${i}" role="region" aria-labelledby="sv-btn-${i}"><div><div class="sv-row__inner">
      ${shows[i].list.length ? `<div class="sv-row__pic">${carouselHTML(shows[i], x.name)}</div>` : ""}
      <p class="sv-row__line">${esc(x.line || "")}</p>
      <ul class="sv-svcs">${list.map((k) => `<li><h3 class="sv-svc__name">${esc(k.name)}</h3><p>${esc(k.text || "")}</p></li>`).join("")}</ul>
      <div class="sv-row__foot">
        <a class="btn btn--ink" href="${ask}">Ask for a quote ${ARROW}</a>
        ${group ? `<a class="sv-row__pk" href="#pk-${slug(group.name)}" data-jump>See packages <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg></a>` : ""}
      </div>
    </div></div></div>
  </li>`;
}).join("");

// the frame beside the list (wide screens) holds one carousel per service and shows the current one; on narrow screens
// each open row has its own carousel instead
const frame = $("[data-sv-frame]");
frame.innerHTML = items.map((x, i) => `<div class="sv-set" data-set="${i}">${shows[i].list.length ? carouselHTML(shows[i], x.name) : ""}</div>`).join("");
const sets = $$(".sv-set", frame);
const wide = matchMedia("(min-width: 961px)");
const frameCr = sets.map((el) => (el.firstElementChild ? carousel(el.firstElementChild) : null));
const rowCr = $$(".sv-row").map((row) => { const el = $(".sv-row__pic [data-cr]", row); return el ? carousel(el) : null; });
let cur = -1, openI = -1;
const showSet = (i) => {
  if (i === cur || !sets[i]) return;
  frameCr[cur]?.stop();
  cur = i;
  sets.forEach((el, k) => el.classList.toggle("on", k === i));
  if (wide.matches) frameCr[i]?.play();
};
// only the carousel in view plays: the frame's on wide screens, the open row's on narrow ones
const sync = () => {
  frameCr.forEach((c, k) => (wide.matches && k === cur ? c?.play() : c?.stop()));
  rowCr.forEach((c, k) => (!wide.matches && k === openI ? c?.play() : c?.stop()));
};
wide.addEventListener("change", sync);

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
    openI = open ? i : -1;
    if (open) showSet(i);
    sync();
    // the page height changes while the row opens, so smooth scroll measures again afterwards
    setTimeout(() => lenis?.resize(), 750);
  });
  if (canHover) row.addEventListener("pointerenter", () => showSet(i));
});
setOpen(rows[0], true);
openI = 0;
showSet(0);
// an address like /services#3d-design opens that service
const fromHash = () => {
  const row = location.hash && rows.find((r) => `#${r.id}` === location.hash);
  if (!row) return;
  rows.forEach((r) => setOpen(r, false));
  setOpen(row, true);
  openI = rows.indexOf(row);
  showSet(openI);
  sync();
};
fromHash();
addEventListener("hashchange", fromHash);
sync();

// packages: ready-made scopes, grouped by service
const pk = s.packages || {};
const groups = (pk.groups || []).filter((g) => (g.cards || []).length);
$("[data-pk-title]").innerHTML = accent(pk.title || "Ready-made [packages]");
$("[data-pk-intro]").textContent = pk.intro || "";
$("[data-pk]").innerHTML = groups.map((g, i) => `<div class="pk-group" id="pk-${slug(g.name)}">
  <div class="pk-group__side" data-reveal>
    <span class="pk-group__n">${pad(i + 1)}</span>
    <h3 class="pk-group__name up">${esc(g.name)}</h3>
    ${g.line ? `<p class="pk-group__line">${esc(g.line)}</p>` : ""}
    ${g.note ? `<p class="pk-group__note">${esc(g.note)}</p>` : ""}
  </div>
  <div class="pk-cards" data-n="${g.cards.length}">${g.cards.map((c) => `<article class="pk-card${c.tag ? " pk-card--tag" : ""}" data-reveal>
    <div class="pk-card__top">
      <h4 class="pk-card__name up">${esc(c.name)}</h4>
      ${c.tag ? `<span class="pk-card__tag">${esc(c.tag)}</span>` : ""}
    </div>
    ${c.text ? `<p class="pk-card__text">${esc(c.text)}</p>` : ""}
    ${(c.includes || []).length ? `<div class="pk-card__inc"><span class="pk-card__label">What's included</span><ul>${c.includes.map((t) => `<li>${CHECK}<span>${esc(t)}</span></li>`).join("")}</ul></div>` : ""}
    ${(c.terms || []).length ? `<div class="pk-card__terms"><span class="pk-card__label">Plans</span><div class="pk-terms">${c.terms.map((t) => `<span>${esc(t)}</span>`).join("")}</div>${c.termsNote ? `<p>${esc(c.termsNote)}</p>` : ""}</div>` : ""}
    <a class="btn btn--line pk-card__btn" href="/contact?service=${encodeURIComponent(g.formService || g.name)}&package=${encodeURIComponent(`${g.name}, ${c.name}`)}">Ask for a quote ${ARROW}</a>
  </article>`).join("")}</div>
</div>`).join("");
if (!groups.length) $(".pk").remove();
// "See packages" links glide down to their group
$$("[data-jump]").forEach((a) => a.addEventListener("click", (e) => {
  const to = $(a.getAttribute("href"));
  if (!to || !lenis) return;
  e.preventDefault();
  lenis.scrollTo(to, { offset: -100 });
}));

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
