// Stage 1d options board: hero, cream textures, and six project layouts (five kept and upgraded, plus the dock reel).
import { mountHero } from "/js/hero2.js";
import { mountPillNav } from "/js/nav.js";
import { mountRingCursor } from "/js/cursors.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const pad = (n) => String(n).padStart(2, "0");
// Blur only changes in 0.5px steps, so the browser doesn't repaint filters every frame for nothing.
const setBlur = (el, px, extra = "") => {
  const v = Math.round(px * 2) / 2;
  const f = (v > 0 ? `blur(${v}px) ` : "") + extra;
  if (el._f !== f) { el.style.filter = f || "none"; el._f = f; }
};

const LOGO = `<svg viewBox="0 0 226.08 342.55" aria-hidden="true"><defs><mask id="nlm"><rect width="226.08" height="342.55" fill="#fff"/><path transform="matrix(1,0,0,-1,113.045,265.925)" d="M0 0V65.23H43.11ZM-31.28 94.65H-62.55L-31.28 142.04ZM62.55 142.04H31.27V189.43L0 236.81-31.28 189.42-62.55 142.04-93.83 94.65-62.56 47.27V65.19H-31.28V-.12L0-47.51 93.82 94.65Z" fill="#000"/></mask></defs><g mask="url(#nlm)"><path transform="matrix(1,0,0,-1,113.04,.000091552738)" d="M0 0-17.83-27.01-26.26-39.79-49.1-74.4-57.53-87.169-80.37-121.78-88.81-134.57-111.65-169.17-113.04-171.28-88.81-207.99-83.16-216.55-57.53-255.38-51.88-263.94-26.26-302.76-20.61-311.33 0-342.55 5.02-334.94 20.61-311.33 36.29-287.57 51.88-263.94 67.57-240.169 83.16-216.55 98.84-192.79 113.04-171.28 111.65-169.17 98.84-149.76 80.37-121.78 67.57-102.38 49.1-74.4 36.29-54.99 17.83-27.01Z" fill="currentColor"/></g></svg>`;
mountPillNav({
  logo: LOGO,
  links: [{ href: "#layouts", label: "Work", key: "work" }, { href: "#hero", label: "About" }, { href: "#layouts", label: "In production" }],
  cta: { href: "#hero", label: "Let's talk" },
});
mountRingCursor({ accent: "#6f8faf" });

/* reveal: blurred, then into focus */
const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))), { threshold: 0.12 });
$$(".head, .demo-title, .demo-note, .tag").forEach((el) => { el.classList.add("reveal"); io.observe(el); });

/* hero: opening animation, cursor spotlight, glow options */
const heroEl = $("[data-hero]");
const EASE_OUT = "cubic-bezier(.16, 1, .3, 1)";
const heroReady = mountHero($("[data-stage]"), { image: "/images/portrait-v2.webp", depth: "/images/portrait-v2-depth.png", alt: "Portrait of Anas Saleh", mode: 0, reduceMotion: reduce });
async function playIntro() {
  const portrait = (await heroReady).el;
  const curtain = $("[data-curtain]");
  const words = $$("[data-name] .w");
  const meta = $("[data-meta]");
  curtain.style.display = "block";
  curtain.animate([{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }], { duration: 1100, delay: 150, easing: "cubic-bezier(.76, 0, .24, 1)", fill: "forwards" })
    .finished.then(() => (curtain.style.display = "none"));
  portrait.animate(
    [{ transform: "scale(1.45)", filter: "blur(24px)", opacity: 0 }, { transform: "scale(1)", filter: "blur(0px)", opacity: 1 }],
    { duration: 2200, delay: 450, easing: EASE_OUT, fill: "backwards" },
  );
  words.forEach((w, i) => w.animate(
    [{ transform: "translateY(110%) rotate(4deg)" }, { transform: "translateY(0) rotate(0)" }],
    { duration: 1300, delay: 950 + i * 140, easing: EASE_OUT, fill: "backwards" },
  ));
  [...meta.children].forEach((el, i) => el.animate(
    [{ opacity: 0, transform: "translateY(24px)", filter: "blur(8px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }],
    { duration: 1200, delay: 1600 + i * 120, easing: EASE_OUT, fill: "backwards" },
  ));
  // Safety net: if the browser never advances the animations (hidden tab, power saving), jump to the end
  // so the hero is never left covered or blurred.
  setTimeout(() => {
    [curtain, portrait, ...words, ...meta.children].forEach((el) => el.getAnimations().forEach((a) => { if ((a.currentTime ?? 0) < 50) a.finish(); }));
    curtain.style.display = "none";
  }, 4200);
}
playIntro();
$("[data-replay]").addEventListener("click", () => { scrollTo({ top: 0 }); lenisRef?.scrollTo(0, { immediate: true }); setTimeout(playIntro, 80); });

const spot = $("[data-spot]");
const spotP = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2 };
heroEl.addEventListener("pointermove", (e) => { const r = heroEl.getBoundingClientRect(); spotP.tx = e.clientX - r.left; spotP.ty = e.clientY - r.top; });
(function spotLoop() { requestAnimationFrame(spotLoop); spotP.x = lerp(spotP.x, spotP.tx, 0.1); spotP.y = lerp(spotP.y, spotP.ty, 0.1); spot.style.transform = `translate(${spotP.x}px, ${spotP.y}px)`; })();

const glowRow = $("[data-glows]");
[["بدون", "0px", 0], ["خفيف جداً", "28px", 0.1], ["خفيف", "44px", 0.16], ["أوضح", "64px", 0.24]].forEach(([label, size, a], i) => {
  const b = document.createElement("button");
  b.type = "button"; b.textContent = label; b.setAttribute("aria-pressed", String(i === 1));
  b.addEventListener("click", () => {
    $("[data-stage]").style.setProperty("--glow", size);
    $("[data-stage]").style.setProperty("--glow-a", a);
    $$("button", glowRow).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  });
  glowRow.append(b);
  if (i === 1) b.click();
});
let lenisRef = null;

/* cream textures */
const canvasURL = (w, h, draw) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); return c.toDataURL("image/png"); };
const valueNoise = (seed, P) => {
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const g = Array.from({ length: P * P }, r);
  const m = (v) => ((v % P) + P) % P;
  return (x, y) => {
    const xi = m(Math.floor(x)), yi = m(Math.floor(y)), xf = x - Math.floor(x), yf = y - Math.floor(y);
    const a = g[yi * P + xi], b = g[yi * P + m(xi + 1)], c = g[m(yi + 1) * P + xi], d = g[m(yi + 1) * P + m(xi + 1)];
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
};
const pixels = (w, h, fn) => (g) => { const d = g.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [v, a] = fn(x, y); const i = (y * w + x) * 4; d.data[i] = v; d.data[i + 1] = v * 0.96; d.data[i + 2] = v * 0.9; d.data[i + 3] = a; } g.putImageData(d, 0, 0); };
const TEXTURES = [
  { name: "Paper grain", ar: "حبيبات ورق واضحة وناعمة. أقرب شي لورق طباعة فاخر.", size: "260px", op: 1,
    url: canvasURL(260, 260, pixels(260, 260, () => [90 + Math.random() * 60, Math.random() * 48])) },
  { name: "Linen", ar: "نسيج كتان متل قماش اللوحات. خطوط أفقية وعمودية ناعمة.", size: "180px", op: 1,
    url: canvasURL(180, 180, (g, w, h) => {
      pixels(w, h, () => [110, Math.random() * 30])(g);
      for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(90,82,70,${0.04 + Math.random() * 0.08})`; g.fillRect(0, y, w, 1); }
      for (let x = 0; x < w; x += 2) { g.fillStyle = `rgba(90,82,70,${0.03 + Math.random() * 0.07})`; g.fillRect(x, 0, 1, h); }
    }) },
  { name: "Watercolour paper", ar: "ورق ألوان مائية (cold press): بقع ناعمة وملمس محبّب. بيحكي عن الرسم.", size: "512px", op: 1,
    url: canvasURL(512, 512, (() => { const n1 = valueNoise(3, 8), n2 = valueNoise(7, 32), n3 = valueNoise(5, 64); return pixels(512, 512, (x, y) => { const v = n1(x / 64, y / 64) * 0.5 + n2(x / 16, y / 16) * 0.35 + n3(x / 8, y / 8) * 0.15; return [90, Math.max(0, (v - 0.4)) * 60 + Math.random() * 14]; }); })()) },
  { name: "Recycled fibres", ar: "ورق معاد تدويره: ألياف ونقط صغيرة ظاهرة. طبيعي ودافي.", size: "420px", op: 1,
    url: canvasURL(420, 420, (g, w, h) => {
      pixels(w, h, () => [100, Math.random() * 40])(g);
      for (let i = 0; i < 520; i++) { g.strokeStyle = `rgba(${90 + Math.random() * 50},${80 + Math.random() * 40},${60 + Math.random() * 30},${0.1 + Math.random() * 0.22})`; g.lineWidth = 0.4 + Math.random() * 1; const x = Math.random() * w, y = Math.random() * h, a = Math.random() * 6.3, l = 5 + Math.random() * 20; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 1) * l / 2, y + Math.sin(a + 1) * l / 2, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
      for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(60,50,40,${Math.random() * 0.35})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, Math.random() * 1.3, 0, 7); g.fill(); }
    }) },
  { name: "Plaster", ar: "جبصين ناعم متل حيط مدهون يدوي. ملمس هادي وفخم.", size: "600px", op: 1,
    url: canvasURL(600, 600, (() => { const n1 = valueNoise(11, 12), n2 = valueNoise(13, 40), n3 = valueNoise(17, 100); return pixels(600, 600, (x, y) => { const v = n1(x / 50, y / 50) * 0.45 + n2(x / 15, y / 15) * 0.35 + n3(x / 6, y / 6) * 0.2; return [95, Math.abs(v - 0.5) * 110]; }); })()) },
];
const setTex = (t, i) => {
  document.documentElement.style.setProperty("--tex", `url(${t.url})`);
  document.documentElement.style.setProperty("--tex-size", t.size);
  document.documentElement.style.setProperty("--tex-op", t.op);
  $$("[data-tex]").forEach((b, j) => b.setAttribute("aria-pressed", String(i === j)));
};
$("[data-textures]").innerHTML = TEXTURES.map((t, i) => `<button class="tex" type="button" data-tex="${i}" aria-pressed="false"><div class="layer" style="background-image:url(${t.url});background-size:${t.size}"></div><div class="lbl"><span class="up">${i + 1} · ${t.name}</span><p>${t.ar}</p></div></button>`).join("");
$$("[data-tex]").forEach((b, i) => b.addEventListener("click", () => setTex(TEXTURES[i], i)));
setTex(TEXTURES[0], 0);

/* data */
const projects = (await fetch("/content/projects.json").then((r) => r.json())).filter((p) => !p.draft);
const cover = (p) => `/images/covers/${p.slug}.webp`;
const CAT = { design: "Design", "3d": "3D", motion: "Motion", video: "Video" };
const cats = (p) => (p.categories || []).map((c) => CAT[c]).join(" · ");
const list = projects.slice(0, 9);
const swapText = (el, text) => {
  if (el.dataset.t === text) return;
  el.dataset.t = text;
  el.style.opacity = "0";
  el.style.transform = "translateY(16px)";
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.textContent = text; el.style.opacity = "1"; el.style.transform = "none"; }, 200);
};

/* A curved reel */
const cv = $("[data-cv]");
cv.style.height = `${list.length * 70}vh`;
$("[data-cv-track]").innerHTML = list.map((p, i) => `<a class="cv-card" href="/work/${p.slug}"><div class="img"><img src="${cover(p)}" alt="${p.title}" loading="lazy"></div><div class="row"><span class="up">${p.title}</span><span class="n">${pad(i + 1)}</span></div></a>`).join("");
const cvCards = $$(".cv-card");

/* B orbit */
const ob = $("[data-ob]");
const R = Math.min(innerWidth * 0.5, 720);
$("[data-ob-ring]").innerHTML = list.map((p, i) => `<a class="ob-card" href="/work/${p.slug}" style="transform:rotateY(${(i * 360) / list.length}deg) translateZ(${R}px)"><img src="${cover(p)}" alt="${p.title}" loading="lazy"></a>`).join("");
const obCards = $$(".ob-card");
const obS = { rot: 0, drag: 0, tdrag: 0, down: false, sx: 0, base: 0 };
$(".ob-pin").addEventListener("pointerdown", (e) => { obS.down = true; obS.sx = e.clientX; obS.base = obS.tdrag; });
addEventListener("pointermove", (e) => { if (obS.down) obS.tdrag = obS.base + (e.clientX - obS.sx) * 0.25; });
addEventListener("pointerup", () => (obS.down = false));

/* E split columns */
const sc = $("[data-sc]");
const half = Math.ceil(list.length / 2);
const colA = list.slice(0, half), colB = list.slice(half);
const colHTML = (arr) => [...arr, ...arr].map((p) => `<a href="/work/${p.slug}" data-title="${p.title}" data-sub="${cats(p)} · ${p.year}"><img src="${cover(p)}" alt="${p.title}" loading="lazy"></a>`).join("");
$("[data-sc-a]").innerHTML = colHTML(colA);
$("[data-sc-b]").innerHTML = colHTML(colB);
let scP = 0;

/* 5 works wheel (ported from the React component Anas sent).
   One number, `turn`: 0 = cards in a ring round the label, 1 = vertical drum with item 0 at the front,
   each whole number after that = one more item turned past. Here the page scroll drives it. */
const ww = $("[data-ww]");
const wwItems = projects;
const WW = { CARD_H: 0.4, CARD_MAX_W: 0.36, RATIO: 1.29, STEP: 40, DRUM: 2.22, LENS: 2.7, RING_R: 1.14, BOW: 1.82, CULL: 1.6 };
ww.style.height = `${(wwItems.length + 2) * 55}vh`;
const wwWheel = $("[data-ww-wheel]"), wwStage = $("[data-ww-stage]");
wwWheel.innerHTML = wwItems.map((p) => `<a class="ww-card" href="/work/${p.slug}"><span class="face"><img src="${cover(p)}" alt="${p.title}" loading="lazy"></span></a>`).join("");
$("[data-ww-index]").innerHTML = wwItems.map((p, i) => `<li><button type="button" data-i="${i}" data-cursor="Go">${p.title}</button></li>`).join("");
const wwCards = $$(".ww-card");
const wwFaces = wwCards.map((c) => c.firstElementChild);
const wwM = {};
const wwMeasure = () => {
  const w = wwStage.clientWidth, h = wwStage.clientHeight;
  const cardW = Math.min(h * WW.CARD_H * WW.RATIO, w * WW.CARD_MAX_W), cardH = cardW / WW.RATIO;
  Object.assign(wwM, { cardW, cardH, drumR: cardH * WW.DRUM, ringR: cardH * WW.RING_R, bow: cardH * WW.BOW });
  wwM.ringScale = clamp((((2 * Math.PI * wwM.ringR) / wwItems.length) * 0.82) / cardW, 0.16, 1);
  wwStage.style.perspective = `${cardH * WW.LENS}px`;
  wwCards.forEach((c) => { c.style.width = `${cardW}px`; c.style.height = `${cardH}px`; c.style.margin = `${-cardH / 2}px 0 0 ${-cardW / 2}px`; });
};
wwMeasure();
addEventListener("resize", wwMeasure);
const rad = (d) => (d * Math.PI) / 180;
const wwS = { turn: 0, active: -1 };
$("[data-ww-index]").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const top = ww.getBoundingClientRect().top + scrollY;
  const y = top + ((Number(b.dataset.i) + 1) / (wwItems.length + 0.6)) * (ww.offsetHeight - innerHeight);
  lenisRef ? lenisRef.scrollTo(y, { duration: 1.4 }) : scrollTo({ top: y, behavior: "smooth" });
});
function wwDraw() {
  // scroll progress -> target turn, eased
  const target = prog(ww) * (wwItems.length + 0.6);
  wwS.turn = lerp(wwS.turn, target, 0.12);
  const t = wwS.turn, m = clamp(t, 0, 1), pos = Math.max(0, t - 1);
  const { ringR, drumR, bow, ringScale } = wwM;
  wwWheel.style.transform = `translateZ(${-m * drumR}px) rotateZ(${(1 - m) * t * 30}deg)`;
  wwCards.forEach((c, i) => {
    const d = i - pos, drumDeg = d * WW.STEP, ringDeg = i * (360 / wwItems.length);
    c.style.transform = `translateX(${m * -bow * (1 - Math.cos(rad(drumDeg)))}px) rotateZ(${(1 - m) * ringDeg}deg) translateY(${-(1 - m) * ringR}px) rotateX(${m * drumDeg}deg) translateZ(${m * drumR}px)`;
    c.style.opacity = m > 0.5 && Math.abs(d) > WW.CULL ? "0" : "1";
    c.style.zIndex = String(Math.round(100 - Math.abs(d) * 2));
    wwFaces[i].style.transform = `scale(${lerp(ringScale, 1, m)})`;
    setBlur(wwFaces[i], m > 0.5 ? clamp((Math.abs(d) - 0.25) * 6, 0, 6) : 0);
  });
  $("[data-ww-label]").style.opacity = String(1 - m);
  $("[data-ww-title]").style.opacity = String(m);
  $("[data-ww-bar]").style.width = `${prog(ww) * 100}%`;
  const near = clamp(Math.round(pos), 0, wwItems.length - 1);
  if (near !== wwS.active) {
    wwS.active = near;
    const p = wwItems[near];
    swapText($("[data-ww-name]"), p.title);
    $("[data-ww-n]").textContent = `${pad(near + 1)} / ${pad(wwItems.length)}`;
    $("[data-ww-cat]").textContent = `${cats(p)} · ${p.year}`;
    $$("[data-ww-index] button").forEach((b, i) => b.classList.toggle("on", i === near));
  }
}

/* 4 dome gallery: covers on a sphere, drag with inertia, click to open */
const dm = $("[data-dm]");
const sphere = $("[data-dm-sphere]");
const SEG = 30, UNIT = 360 / SEG / 2;
const dmR = clamp(Math.max(innerWidth, innerHeight) * 1.05, 700, 1700);
dm.style.setProperty("--R", `${dmR}px`);
const tile = (2 * Math.PI * dmR) / SEG;
const tiles = [];
let k = 0;
for (let x = -SEG; x < SEG; x += 2) {
  const ys = ((x / 2) & 1) ? [-3, -1, 1, 3] : [-4, -2, 0, 2, 4];
  for (const y of ys) {
    const p = projects[(k * 7 + (x & 3)) % projects.length];
    k++;
    tiles.push(`<div class="dm-item" style="width:${tile}px;height:${tile * 0.82}px;margin:${-tile * 0.41}px 0 0 ${-tile / 2}px;transform:rotateY(${UNIT * (x + 1)}deg) rotateX(${UNIT * y}deg) translateZ(${dmR}px)"><button type="button" data-cursor="Open" data-slug="${p.slug}" aria-label="${p.title}"><img src="${cover(p)}" alt="" loading="lazy"></button></div>`);
  }
}
sphere.innerHTML = tiles.join("");
const dmS = { rx: -4, ry: 0, vx: 0, vy: 0, down: false, lx: 0, ly: 0, moved: 0 };
dm.addEventListener("pointerdown", (e) => { dmS.down = true; dmS.moved = 0; dmS.lx = e.clientX; dmS.ly = e.clientY; dmS.vx = dmS.vy = 0; dmS.pid = e.pointerId; });
dm.addEventListener("pointermove", (e) => {
  if (!dmS.down) return;
  const dx = e.clientX - dmS.lx, dy = e.clientY - dmS.ly;
  dmS.lx = e.clientX; dmS.ly = e.clientY;
  dmS.moved += Math.abs(dx) + Math.abs(dy);
  if (dmS.moved > 6 && !dm.hasPointerCapture(e.pointerId)) dm.setPointerCapture(e.pointerId);
  dmS.vy = dx * 0.14; dmS.vx = -dy * 0.1;
  dmS.ry += dmS.vy; dmS.rx = clamp(dmS.rx + dmS.vx, -12, 12);
});
const dmUp = () => (dmS.down = false);
dm.addEventListener("pointerup", dmUp);
dm.addEventListener("pointercancel", dmUp);
const viewer = $("[data-dm-viewer]");
const closeViewer = () => { viewer.classList.remove("show"); setTimeout(() => viewer.classList.remove("on"), 400); };
dm.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-slug]");
  if (!b || dmS.moved > 6) return;
  const p = projects.find((x) => x.slug === b.dataset.slug);
  viewer.innerHTML = `<button class="x" type="button" aria-label="Close">&times;</button><div class="card"><img src="${cover(p)}" alt="${p.title}"><div class="row"><div><span class="up">${p.title}</span><span class="meta">${cats(p)} · ${p.year}</span></div><a href="/work/${p.slug}">View project</a></div></div>`;
  viewer.classList.add("on");
  requestAnimationFrame(() => viewer.classList.add("show"));
});
viewer.addEventListener("pointerdown", (e) => e.stopPropagation());
viewer.addEventListener("click", (e) => { if (e.target === viewer || e.target.closest(".x")) closeViewer(); });
addEventListener("keydown", (e) => e.key === "Escape" && closeViewer());
(function dmLoop() {
  requestAnimationFrame(dmLoop);
  if (!dmS.down) {
    dmS.vy *= 0.95; dmS.vx *= 0.9;
    dmS.ry += dmS.vy + 0.03;
    dmS.rx = clamp(dmS.rx + dmS.vx, -12, 12);
  }
  sphere.style.transform = `translateZ(${-dmR}px) rotateX(${dmS.rx}deg) rotateY(${dmS.ry}deg)`;
})();

/* ---------- one smooth loop ---------- */
const lenis = window.Lenis ? new Lenis({ lerp: 0.08, wheelMultiplier: 0.9 }) : null;
lenisRef = lenis;
const prog = (el) => { const r = el.getBoundingClientRect(); return clamp(-r.top / (r.height - innerHeight), 0, 1); };
const sm = { cv: 0, vel: 0 };
let lastY = scrollY;
function loop(t) {
  lenis?.raf(t);
  const v = scrollY - lastY; lastY = scrollY;
  sm.vel = lerp(sm.vel, v, 0.1);
  const W = innerWidth, H = innerHeight;
  wwDraw();

  // A curved reel
  sm.cv = lerp(sm.cv, prog(cv), 0.09);
  const off = sm.cv * (cvCards.length - 1);
  const cw = cvCards[0].offsetWidth * 1.08;
  cvCards.forEach((c, i) => {
    const rel = i - off, ar = Math.abs(rel);
    const a = clamp(rel * -24 + sm.vel * -0.4, -70, 70);
    c.style.transform = `translateX(${rel * cw}px) translateZ(${-ar * 160}px) rotateY(${a}deg)`;
    c.style.opacity = String(clamp(1.4 - ar * 0.35, 0, 1));
    setBlur(c, clamp((ar - 0.35) * 7, 0, 12), ar > 0.5 ? `grayscale(${Math.min(1, ar - 0.4)})` : "");
  });
  const cvi = clamp(Math.round(off), 0, cvCards.length - 1);
  $("[data-cv-big]").textContent = list[cvi].title;
  $("[data-cv-count]").textContent = `${pad(cvi + 1)} / ${pad(list.length)}`;
  $("[data-cv-bar]").style.width = `${sm.cv * 100}%`;

  // B orbit
  obS.drag = lerp(obS.drag, obS.tdrag, 0.08);
  obS.rot = lerp(obS.rot, -prog(ob) * 360 * 1.5 + obS.drag, 0.08);
  $("[data-ob-ring]").style.transform = `translateZ(${-R}px) rotateX(-6deg) rotateY(${obS.rot}deg)`;
  const step = 360 / list.length;
  const front = ((Math.round(-obS.rot / step) % list.length) + list.length) % list.length;
  obCards.forEach((c, i) => {
    const ang = Math.abs((((i * step + obS.rot) % 360) + 540) % 360 - 180);
    c.style.opacity = String(clamp(1 - ang / 170, 0.12, 1));
    setBlur(c, clamp((ang - 18) / 9, 0, 10));
  });
  swapText($("[data-ob-title]"), list[front].title);
  $("[data-ob-sub]").textContent = `${pad(front + 1)} · ${cats(list[front])}`;

  // E split columns: sharp in the middle band, blurred toward the edges
  scP = lerp(scP, prog(sc), 0.08);
  const ca = $("[data-sc-a]"), cb = $("[data-sc-b]");
  const travel = ca.scrollHeight / 2;
  ca.style.transform = `translateY(${-scP * travel}px)`;
  cb.style.transform = `translateY(${-travel + scP * travel}px)`;
  let scBest = null, scD = 1e9;
  [...$$("a", ca), ...$$("a", cb)].forEach((a) => {
    const r = a.getBoundingClientRect();
    if (r.bottom < -50 || r.top > H + 50) return;
    const d = Math.abs(r.top + r.height / 2 - H / 2) / (H / 2);
    setBlur(a, clamp((d - 0.3) * 10, 0, 9));
    a.style.transform = `scale(${1 - clamp(d - 0.3, 0, 0.6) * 0.12})`;
    if (d < scD) { scD = d; scBest = a; }
  });
  if (scBest) { swapText($("[data-sc-name]"), scBest.dataset.title); $("[data-sc-sub]").textContent = scBest.dataset.sub; }

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
