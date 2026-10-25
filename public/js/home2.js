// Home page (stage 2): opening animation, hero scroll scene, what-I-do words, works wheel, spider slot,
// in progress, drawings and contact. Content comes from /content/site.json and /content/projects.json.
import { mountHero } from "/js/hero2.js";
import { mountPillNav } from "/js/nav.js";
import { mountRingCursor } from "/js/cursors.js";
import { mountWorksWheel } from "/js/works-wheel.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sstep = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
// "[word]" in CMS text becomes the accent colour
const accent = (s = "") => esc(s).replace(/\[([^\]]+)\]/g, '<span class="acc">$1</span>');
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const EASE_OUT = "cubic-bezier(.16, 1, .3, 1)";
const CAT = { design: "Design", "3d": "3D", motion: "Motion", video: "Video" };
const cats = (p) => (p.categories || []).map((c) => CAT[c]).join(" · ");
const cover = (p) => p.cover || `/images/covers/${p.slug}.webp`;
const thumb = (p) => (cover(p).startsWith("/images/covers/") ? cover(p).replace("/images/covers/", "/images/covers/thumb/") : cover(p));
const GLOWS = { none: ["0px", 0], "very-light": ["28px", 0.1], light: ["44px", 0.16], strong: ["64px", 0.24] };

const LOGO = `<svg viewBox="0 0 226.08 342.55" aria-hidden="true"><defs><mask id="LM"><rect width="226.08" height="342.55" fill="#fff"/><path transform="matrix(1,0,0,-1,113.045,265.925)" d="M0 0V65.23H43.11ZM-31.28 94.65H-62.55L-31.28 142.04ZM62.55 142.04H31.27V189.43L0 236.81-31.28 189.42-62.55 142.04-93.83 94.65-62.56 47.27V65.19H-31.28V-.12L0-47.51 93.82 94.65Z" fill="#000"/></mask></defs><g mask="url(#LM)"><path transform="matrix(1,0,0,-1,113.04,.000091552738)" d="M0 0-17.83-27.01-26.26-39.79-49.1-74.4-57.53-87.169-80.37-121.78-88.81-134.57-111.65-169.17-113.04-171.28-88.81-207.99-83.16-216.55-57.53-255.38-51.88-263.94-26.26-302.76-20.61-311.33 0-342.55 5.02-334.94 20.61-311.33 36.29-287.57 51.88-263.94 67.57-240.169 83.16-216.55 98.84-192.79 113.04-171.28 111.65-169.17 98.84-149.76 80.37-121.78 67.57-102.38 49.1-74.4 36.29-54.99 17.83-27.01Z" fill="currentColor"/></g></svg>`;
const ICONS = {
  instagram: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/></svg>',
};

const [site, all] = await Promise.all([
  fetch("/content/site.json").then((r) => r.json()),
  fetch("/content/projects.json").then((r) => r.json()),
]);
const projects = all.filter((p) => !p.draft);
const h = site.home || {};
const c = site.contact || {};

/* ---------- shell ---------- */
mountPillNav({
  logo: LOGO,
  name: site.name,
  links: [{ href: "/work", label: "Work" }, { href: "/about", label: "About" }, { href: "/in-progress", label: "In progress" }],
  cta: { href: "/contact", label: "Let's talk" },
});
mountRingCursor({ accent: "#6f8faf" });
const lenis = window.Lenis ? new Lenis({ lerp: 0.11, wheelMultiplier: 1 }) : null;
window.__lenis = lenis;
document.addEventListener("click", (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || a.getAttribute("href").length < 2) return;
  const target = $(a.getAttribute("href"));
  if (target && lenis) { e.preventDefault(); lenis.scrollTo(target, { offset: -40, duration: 1.4 }); }
});

/* reveal: blurred, then into focus */
const revealIO = new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) return;
  const el = e.target;
  const siblings = [...el.parentElement.querySelectorAll(":scope > [data-reveal]")];
  el.style.transitionDelay = `${Math.max(0, siblings.indexOf(el)) * 70}ms`;
  el.classList.add("in");
  revealIO.unobserve(el);
}), { threshold: 0.15, rootMargin: "0px 0px 4% 0px" });
const watchReveals = () => $$("[data-reveal]:not(.in)").forEach((el) => revealIO.observe(el));

/* ---------- hero ---------- */
const stage = $("[data-stage]");
const [glowSize, glowA] = GLOWS[h.heroGlow] || GLOWS.light;
stage.style.setProperty("--glow", glowSize);
stage.style.setProperty("--glow-a", glowA);
$("[data-headline]").innerHTML = accent(h.headline ? h.headline.replace(/art director/i, "[art director]") : "Visual artist and [art director]");
$("[data-intro]").textContent = h.intro || "";
const heroReady = mountHero(stage, { image: h.heroImage || "/images/portrait-v2.webp", depth: h.heroDepth || "/images/portrait-v2-depth.png", alt: `Portrait of ${site.fullName}`, mode: 0, reduceMotion: reduce, fit: [0.07, 0.1, 0.86, 0.9] });

// statement: each word is its own mask, so the words rise into place one after another
$("[data-statement-text]").innerHTML = (h.statement || "").split(/\s+/).map((w) => `<span class="ln" style="display:inline-block;margin-right:.24em"><span>${accent(w)}</span></span>`).join("");
$("[data-statement-sub]").textContent = h.statementSub || "";

// The soft white glow is drawn once from the portrait's own silhouette (white, blurred) and kept still behind it,
// so the moving portrait never has to recompute a shadow filter every frame.
async function makeGlow(hero) {
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const k = 0.5, w = Math.round(stage.clientWidth * k), h2 = Math.round(stage.clientHeight * k);
  const shape = document.createElement("canvas");
  shape.width = w; shape.height = h2;
  const sc = shape.getContext("2d");
  hero.snapshot(sc, w, h2);
  sc.globalCompositeOperation = "source-in";
  sc.fillStyle = "#fff"; sc.fillRect(0, 0, w, h2);
  const glow = document.createElement("canvas");
  glow.width = w; glow.height = h2; glow.className = "glow";
  const gc = glow.getContext("2d");
  gc.filter = `blur(${parseFloat(glowSize) * k / 2}px)`;
  gc.drawImage(shape, 0, 0);
  stage.prepend(glow);
  return glow;
}

let introDone = false;
async function playIntro() {
  const portrait = (await heroReady).el;
  const curtain = $("[data-curtain]");
  const words = $$("[data-name] .w");
  const meta = $("[data-meta]");
  const glowImg = await makeGlow(await heroReady);
  curtain.animate([{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }], { duration: 1100, delay: 150, easing: "cubic-bezier(.76, 0, .24, 1)", fill: "forwards" })
    .finished.then(() => (curtain.style.display = "none"));
  portrait.animate([
    { transform: "scale(1.45)", filter: "blur(24px)", opacity: 0 },
    { transform: "scale(1)", filter: "blur(0px)", opacity: 1 },
  ], { duration: 2016, delay: 400, easing: EASE_OUT, fill: "backwards" });
  // the glow fades in last, once the photo has settled
  glowImg.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 2400, fill: "backwards" });
  glowImg.animate([{ opacity: 0 }, { opacity: glowA }], { duration: 800, delay: 2400, easing: "ease-out", fill: "backwards" });
  words.forEach((w, i) => w.animate([{ transform: "translateY(110%) rotate(4deg)" }, { transform: "translateY(0) rotate(0)" }], { duration: 1300, delay: 2100 + i * 150, easing: EASE_OUT, fill: "backwards" }));
  [...meta.children].forEach((el, i) => el.animate([{ opacity: 0, transform: "translateY(24px)", filter: "blur(8px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], { duration: 1200, delay: 2600 + i * 120, easing: EASE_OUT, fill: "backwards" }));
  setTimeout(() => {
    [curtain, portrait, glowImg, ...words, ...meta.children].forEach((el) => el.getAnimations().forEach((a) => { if ((a.currentTime ?? 0) < 50) a.finish(); }));
    curtain.style.display = "none";
    introDone = true;
  }, 4000);
}
playIntro();

// spotlight under the pointer
const hero = $("[data-hero]");
const spot = $("[data-spot]");
const sp = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2 };
hero.addEventListener("pointermove", (e) => { sp.tx = e.clientX; sp.ty = e.clientY; });

/* ---------- what I do ---------- */
// Each word shows the work behind it: hovering cycles through that discipline's covers (or the drawings).
const disc = $("[data-disc]");
const discImages = (f) => {
  if (f === "drawing") return (site.drawings?.images || []).slice();
  if (f === "direction") return projects.filter((p) => /direct/i.test(`${p.role} ${p.subtitle}`)).map(thumb);
  return projects.filter((p) => (p.categories || []).includes(f)).map(thumb);
};
const discHref = (f) => (f === "drawing" ? "#drawings" : f ? `/work?f=${esc(f)}` : "/work");
const discs = (h.disciplines || []).map((d) => ({ ...d, images: discImages(d.filter).length ? discImages(d.filter) : [d.image] }));
disc.innerHTML = discs.map((d, i) => `<li data-reveal><a href="${discHref(d.filter)}" data-i="${i}" data-cursor="${d.filter === "drawing" ? "Drawings" : "See work"}">${esc(d.title)}</a></li>`).join("");
discs.forEach((d) => d.images.forEach((src) => { const i = new Image(); i.src = src; }));
const float = $("[data-float]");
float.insertAdjacentHTML("beforeend", '<span class="float-count" data-float-count></span>');
const fl = { x: 0, y: 0, tx: 0, ty: 0 };
let cycle = 0, cycleI = 0;
addEventListener("pointermove", (e) => { fl.tx = e.clientX; fl.ty = e.clientY; }, { passive: true });
const showImg = (src) => {
  const img = new Image();
  img.alt = ""; img.style.opacity = "0";
  img.onload = () => requestAnimationFrame(() => (img.style.opacity = "1"));
  img.src = src;
  float.append(img);
  $$("img", float).slice(0, -2).forEach((o) => o.remove());
};
disc.addEventListener("pointerover", (e) => {
  const t = e.target.closest("[data-i]");
  if (!t) return;
  const d = discs[Number(t.dataset.i)];
  clearInterval(cycle);
  // random order every time, but only this discipline's work
  d.images = d.images.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  cycleI = 0;
  // switching words: drop the previous word's pictures at once, so no other discipline shows through
  $$("img", float).forEach((o) => o.remove());
  showImg(d.images[0]);
  $("[data-float-count]").textContent = `${d.images.length} ${d.filter === "drawing" ? (d.images.length === 1 ? "drawing" : "drawings") : d.images.length === 1 ? "project" : "projects"}`;
  if (d.images.length > 1) cycle = setInterval(() => showImg(d.images[(++cycleI) % d.images.length]), 750);
  float.classList.add("on");
});
disc.addEventListener("pointerleave", () => { float.classList.remove("on"); clearInterval(cycle); });

/* ---------- works wheel ---------- */
mountWorksWheel($("[data-works]"), {
  items: projects,
  label: esc(h.worksLabel || "Works '26").replace(/&#39;(\d+)/, '<span class="acc">&#39;$1</span>'),
  cover,
  meta: (p) => `${cats(p)} · ${p.year}`,
});

/* ---------- spider slot ---------- */
const spd = site.spider || {};
if (spd.title) $("[data-spider-title]").innerHTML = accent(spd.title.replace(/spider/i, "[Spider]"));
$("[data-spider-text]").textContent = spd.text || "";
if (spd.link) $("[data-spider-link]").href = spd.link;
const spStage = $("[data-spider-stage]"), spHint = $("[data-spider-hint]");
const sh = { x: 0, y: 0, tx: 0, ty: 0 };
spStage.addEventListener("pointermove", (e) => { const r = spStage.getBoundingClientRect(); sh.tx = (e.clientX - r.left) / r.width - 0.5; sh.ty = (e.clientY - r.top) / r.height - 0.5; });
spStage.addEventListener("pointerleave", () => { sh.tx = 0; sh.ty = 0; });

/* ---------- in progress (teaser of the In progress page) ---------- */
const STATUS = { "in-production": ["In production", true], "coming-soon": ["Coming soon", false], idea: ["Idea", false] };
$("[data-studio]").innerHTML = (site.studio || []).map((s) => {
  const [label, live] = STATUS[s.status] || ["In progress", true];
  const href = `/in-progress#${String(s.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
  const tag = "a";
  return `<${tag} class="sc" data-reveal href="${href}" data-cursor="Open">
    <div class="sc__img"><img src="${esc(s.image)}" alt="" loading="lazy"><span class="sc__status${live ? " live" : ""}"><i></i>${label}</span></div>
    <div class="sc__body"><h3 class="up">${esc(s.title)}</h3><p>${esc(s.text)}</p></div>
  </${tag}>`;
}).join("");

/* ---------- drawings ---------- */
const dr = site.drawings || {};
if (dr.title) $("[data-draw-title]").innerHTML = accent(dr.title.replace(/draw$/i, "[draw]"));
$("[data-draw-text]").textContent = dr.text || "";
const row = $("[data-draw-row]");
const tilts = [-4, 3, -2, 4, -3, 2];
// An endless strip: the set of drawings is repeated three times and wraps around, so every drawing comes by.
// It drifts on its own, speeds up with the scroll, and can be dragged (with a little throw when you let go).
const drawSet = dr.images || [];
const drawRepeat = drawSet.length ? Math.max(3, Math.ceil(12 / drawSet.length)) : 0;
row.innerHTML = Array.from({ length: drawRepeat }, () => drawSet).flat().map((src, i) => `<figure class="paper" style="margin:0;transform:rotate(${tilts[i % tilts.length]}deg)" data-tilt="${tilts[i % tilts.length]}"><img src="${esc(src)}" alt="${i < drawSet.length ? `Pencil drawing by ${esc(site.fullName)}` : ""}" loading="lazy" draggable="false"></figure>`).join("");
const drawSection = row.closest(".draw");
const drag = { x: 0, v: -0.45, down: false, lastX: 0, moved: 0 };
const setW = () => (row.children[drawSet.length]?.offsetLeft || 0) - (row.children[0]?.offsetLeft || 0);
row.addEventListener("pointerdown", (e) => { drag.down = true; drag.lastX = e.clientX; drag.moved = 0; row.setPointerCapture(e.pointerId); row.classList.add("dragging"); });
row.addEventListener("pointermove", (e) => {
  if (!drag.down) return;
  const dx = e.clientX - drag.lastX;
  drag.lastX = e.clientX; drag.moved += Math.abs(dx);
  drag.x += dx; drag.v = dx;
});
const dragEnd = () => { drag.down = false; row.classList.remove("dragging"); };
row.addEventListener("pointerup", dragEnd);
row.addEventListener("pointercancel", dragEnd);
$$(".paper", row).forEach((p) => {
  p.addEventListener("pointerenter", () => { if (!drag.down) p.style.transform = "rotate(0deg) scale(1.06) translateY(-10px)"; });
  p.addEventListener("pointerleave", () => (p.style.transform = `rotate(${p.dataset.tilt}deg)`));
});
row.dataset.cursor = "Drag";

/* ---------- contact and footer ---------- */
$("[data-mail]").href = `mailto:${c.email}`;
$("[data-mail]").textContent = c.email;
$("[data-mailto]").href = `mailto:${c.email}?subject=${encodeURIComponent("Project enquiry")}`;
const wa = $("[data-wa]");
if (c.whatsapp) wa.href = c.whatsapp; else wa.remove();
$("[data-copy]").addEventListener("click", async (e) => {
  const b = e.currentTarget;
  try { await navigator.clipboard.writeText(c.email); b.textContent = "Copied"; } catch { b.textContent = "Ctrl+C"; }
  setTimeout(() => (b.textContent = "Copy"), 1600);
});
$("[data-logo]").innerHTML = LOGO;
$("[data-socials]").innerHTML = [["Instagram", c.instagram], ["Behance", c.behance], ["LinkedIn", c.linkedin], ["WhatsApp", c.whatsapp]]
  .filter(([, u]) => u).map(([n, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${n}</a></li>`).join("");
$("[data-year]").textContent = `© ${new Date().getFullYear()} ${site.fullName}`;

watchReveals();

/* ---------- one loop for everything that follows scroll or the pointer ---------- */
const scene = $("[data-hero-scene]");
const nameL = $('[data-ln="l"]'), nameR = $('[data-ln="r"]');
const meta = $("[data-meta]");
const stWords = $$("[data-statement-text] .ln > span");
const stSub = $("[data-statement-sub]");
const sceneP = { v: 0 };
let lastScroll = scrollY;
function loop(t) {
  requestAnimationFrame(loop);
  lenis?.raf(t);

  // hero scene: the name parts slide apart, the portrait sinks back, then the statement rises
  const r = scene.getBoundingClientRect();
  if (r.bottom > 0) {
    const p = clamp(-r.top / (r.height - innerHeight), 0, 1);
    sceneP.v = lerp(sceneP.v, p, 0.14);
    const q = sceneP.v;
    const apart = sstep(0, 0.45, q);
    if (introDone || q > 0.01) {
      nameL.style.transform = `translateX(${-apart * 32}vw)`;
      nameR.style.transform = `translateX(${apart * 32}vw)`;
      nameL.style.opacity = nameR.style.opacity = String(1 - apart);
      meta.style.opacity = String(1 - sstep(0, 0.2, q));
    }
    const sink = sstep(0.05, 0.6, q);
    stage.style.transform = `translateX(-50%) scale(${1 - sink * 0.14})`;
    stage.style.opacity = String(1 - sink * 0.55);
    stWords.forEach((w, i) => {
      const k = sstep(0.32 + i * 0.045, 0.62 + i * 0.045, q);
      w.style.transform = `translateY(${(1 - k) * 110}%)`;
    });
    stSub.style.opacity = String(sstep(0.7, 0.9, q));
    stSub.style.transform = `translateY(${(1 - sstep(0.7, 0.9, q)) * 20}px)`;
    sp.x = lerp(sp.x, sp.tx, 0.1); sp.y = lerp(sp.y, sp.ty, 0.1);
    spot.style.transform = `translate(${sp.x}px, ${sp.y}px)`;
  }

  // floating discipline image
  fl.x = lerp(fl.x, fl.tx, 0.16); fl.y = lerp(fl.y, fl.ty, 0.16);
  const vx = fl.tx - fl.x;
  float.style.transform = `translate(${fl.x}px, ${fl.y}px) translate(-50%, -50%) rotate(${clamp(vx * 0.08, -10, 10)}deg)`;

  // spider stage: the hint and floor lean toward the pointer
  sh.x = lerp(sh.x, sh.tx, 0.08); sh.y = lerp(sh.y, sh.ty, 0.08);
  spHint.style.transform = `translate(${sh.x * 30}px, ${sh.y * 20}px)`;

  // drawings: endless strip that drifts, follows the scroll and can be dragged
  const dRect = drawSection.getBoundingClientRect();
  if (dRect.bottom > 0 && dRect.top < innerHeight && drawSet.length) {
    const vy = scrollY - lastScroll;
    if (!drag.down) {
      drag.v = lerp(drag.v, -0.45 - Math.abs(vy) * 0.25, 0.04);
      drag.x += drag.v;
    }
    const w = setW();
    if (w > 0) drag.x = ((drag.x % w) - w) % w;
    row.style.transform = `translateX(${drag.x}px)`;
  }
  lastScroll = scrollY;
}
requestAnimationFrame(loop);
