// Stage 1b options board: hero sample, floating glass nav, and project layouts VI to X plus IV and V.
import { mountHero } from "/js/hero2.js";
import { mountPillNav } from "/js/nav.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ACCENT = [0x6f / 255, 0x8f / 255, 0xaf / 255];

const LOGO = `<svg viewBox="0 0 226.08 342.55" aria-hidden="true"><defs><mask id="nlm"><rect width="226.08" height="342.55" fill="#fff"/><path transform="matrix(1,0,0,-1,113.045,265.925)" d="M0 0V65.23H43.11ZM-31.28 94.65H-62.55L-31.28 142.04ZM62.55 142.04H31.27V189.43L0 236.81-31.28 189.42-62.55 142.04-93.83 94.65-62.56 47.27V65.19H-31.28V-.12L0-47.51 93.82 94.65Z" fill="#000"/></mask></defs><g mask="url(#nlm)"><path transform="matrix(1,0,0,-1,113.04,.000091552738)" d="M0 0-17.83-27.01-26.26-39.79-49.1-74.4-57.53-87.169-80.37-121.78-88.81-134.57-111.65-169.17-113.04-171.28-88.81-207.99-83.16-216.55-57.53-255.38-51.88-263.94-26.26-302.76-20.61-311.33 0-342.55 5.02-334.94 20.61-311.33 36.29-287.57 51.88-263.94 67.57-240.169 83.16-216.55 98.84-192.79 113.04-171.28 111.65-169.17 98.84-149.76 80.37-121.78 67.57-102.38 49.1-74.4 36.29-54.99 17.83-27.01Z" fill="currentColor"/></g></svg>`;
mountPillNav({
  logo: LOGO,
  links: [{ href: "#layouts", label: "Work", key: "work" }, { href: "#hero", label: "About" }, { href: "#layouts", label: "In production" }],
  cta: { href: "#hero", label: "Let's talk" },
});

/* reveal: blurred, then into focus */
const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))), { threshold: 0.12 });
$$(".head, .demo-title, .demo-note, .tag, .chosen, .controls").forEach((el) => { el.classList.add("reveal"); io.observe(el); });

/* hero */
(async () => {
  const hero = await mountHero($("[data-stage]"), {
    image: "/images/portrait-v2.webp", depth: "/images/portrait-v2-depth.png", sketch: "/images/portrait-v2-sketch.webp",
    alt: "Portrait of Anas Saleh", mode: 1, accent: ACCENT, reduceMotion: reduce,
  });
  $$("[data-lens]").forEach((b) => b.addEventListener("click", () => { hero.set({ mode: Number(b.dataset.lens) }); $$("[data-lens]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); }));
  $$("[data-bg]").forEach((b) => b.addEventListener("click", () => {
    const light = b.dataset.bg === "light";
    $("[data-hero]").classList.toggle("light", light);
    light ? $("[data-hero]").removeAttribute("data-dark") : $("[data-hero]").setAttribute("data-dark", "");
    $$("[data-bg]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  }));
})();

/* data */
const projects = (await fetch("/content/projects.json").then((r) => r.json())).filter((p) => !p.draft);
const cover = (p) => `/images/covers/${p.slug}.webp`;
const CAT = { design: "Design", "3d": "3D", motion: "Motion", video: "Video" };
const cats = (p) => (p.categories || []).map((c) => CAT[c]).join(" · ");
const pad = (n) => String(n).padStart(2, "0");
const list = projects.slice(0, 9);

/* VI curved reel */
const cv = $("[data-cv]");
cv.style.height = `${list.length * 70}vh`;
$("[data-cv-track]").innerHTML = list.map((p) => `<a class="cv-card" href="/work/${p.slug}"><div class="img"><img src="${cover(p)}" alt="${p.title}" loading="lazy"></div><span class="up">${p.title}</span><span>${cats(p)} · ${p.year}</span></a>`).join("");
const cvCards = $$(".cv-card");

/* VII into the frame */
const zt = $("[data-zt]");
const GAP = 1100;
const zPos = [[-0.22, -0.1], [0.24, 0.08], [-0.18, 0.12], [0.2, -0.12], [-0.26, 0.02], [0.22, 0.1], [-0.12, -0.14], [0.26, -0.02], [0, 0.12]];
$("[data-zt-items]").innerHTML = list.map((p, i) => `<div class="zt-item" data-i="${i}"><img src="${cover(p)}" alt="${p.title}" loading="lazy"></div>`).join("");
const ztItems = $$(".zt-item");
let ztCur = -1;

/* VIII drag canvas */
const dc = $("[data-dc]");
const COLS = 4, ROWS = 3;
const dcItems = [];
const sizes = [[300, 230], [240, 300], [340, 250], [260, 200], [280, 340], [320, 240], [250, 250], [300, 220], [240, 320], [340, 260], [270, 210], [300, 300]];
for (let i = 0; i < COLS * ROWS; i++) {
  const p = projects[i % projects.length];
  const [w, h] = sizes[i];
  const el = document.createElement("a");
  el.className = "dc-item";
  el.href = `/work/${p.slug}`;
  el.draggable = false;
  el.innerHTML = `<div class="img" style="width:${w}px;height:${h}px"><img src="${cover(p)}" alt="${p.title}" loading="lazy"></div><span>${p.title}</span>`;
  dc.append(el);
  const col = i % COLS, row = Math.floor(i / COLS);
  dcItems.push({ el, bx: col * 420 + (row % 2) * 140 + (i * 37) % 60, by: row * 420 + (i * 53) % 90 });
}
const TW = COLS * 420, TH = ROWS * 420;
const drag = { x: 0, y: 0, tx: -200, ty: -120, down: false, sx: 0, sy: 0, vx: 0, vy: 0, lx: 0, ly: 0, moved: false };
dc.addEventListener("pointerdown", (e) => { drag.down = true; drag.moved = false; drag.sx = e.clientX - drag.tx; drag.sy = e.clientY - drag.ty; drag.lx = e.clientX; drag.ly = e.clientY; dc.classList.add("drag", "used"); dc.setPointerCapture(e.pointerId); });
dc.addEventListener("pointermove", (e) => {
  if (!drag.down) return;
  drag.vx = e.clientX - drag.lx; drag.vy = e.clientY - drag.ly; drag.lx = e.clientX; drag.ly = e.clientY;
  if (Math.abs(drag.vx) + Math.abs(drag.vy) > 2) drag.moved = true;
  drag.tx = e.clientX - drag.sx; drag.ty = e.clientY - drag.sy;
});
const endDrag = () => { if (!drag.down) return; drag.down = false; drag.tx += drag.vx * 12; drag.ty += drag.vy * 12; dc.classList.remove("drag"); };
dc.addEventListener("pointerup", endDrag);
dc.addEventListener("pointercancel", endDrag);
dc.addEventListener("click", (e) => { if (drag.moved) e.preventDefault(); }, true);

/* IX deck */
const dk = $("[data-dk]");
const deck = list.slice(0, 6);
dk.style.height = `${deck.length * 80}vh`;
$("[data-dk-stack]").innerHTML = deck.map((p, i) => `<div class="dk-card" style="z-index:${deck.length - i}"><img src="${cover(p)}" alt="${p.title}" loading="lazy"></div>`).join("");
const dkCards = $$(".dk-card");
let dkCur = -1;
const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener("pointermove", (e) => { tilt.tx = (e.clientX / innerWidth - 0.5) * 2; tilt.ty = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });

/* X film strips */
$("[data-fs]").innerHTML = list.slice(0, 7).map((p, i) => `<a href="/work/${p.slug}"${i === 0 ? ' class="on"' : ""}><img src="${cover(p)}" alt="${p.title}" loading="lazy"><span class="vert up">${p.title}</span><div class="lbl full"><span style="font-weight:700;letter-spacing:.12em;font-size:13px;color:#cfd9e3">${pad(i + 1)} · ${cats(p)}</span><h4 class="up" style="margin:8px 0 0">${p.title}</h4></div></a>`).join("");
$("[data-fs]").addEventListener("pointerover", (e) => { const a = e.target.closest("a"); if (!a) return; $$("[data-fs] a").forEach((x) => x.classList.toggle("on", x === a)); });

/* IV reel and V stack */
const rl = $("[data-rl]");
$("[data-rl-track]").innerHTML = list.map((p) => `<a class="rl-card" href="/work/${p.slug}"><div class="img"><img src="${cover(p)}" alt="${p.title}" loading="lazy"></div><div class="row"><span class="up">${p.title}</span><span>${p.year}</span></div></a>`).join("");
$("[data-sk]").innerHTML = list.slice(0, 5).map((p, i) => `<article class="sk-card" data-sk-card style="top:${12 + i * 1.5}vh"><img src="${cover(p)}" alt="${p.title}" loading="lazy"><div class="txt"><div><span class="n">${pad(i + 1)}</span><h4 class="up" style="margin:14px 0 0">${p.title}</h4><p>${p.subtitle}. ${p.role}.</p></div><span style="font-weight:700;letter-spacing:.1em;text-transform:uppercase;font-size:14px">${cats(p)} · ${p.year}</span></div></article>`).join("");
const sizeRl = () => (rl.style.height = `${Math.max(200, ($("[data-rl-track]").scrollWidth / innerWidth) * 100)}vh`);
sizeRl();
addEventListener("resize", sizeRl);

/* ---------- one smooth loop ---------- */
const lenis = window.Lenis ? new Lenis({ lerp: 0.08, wheelMultiplier: 0.9 }) : null;
const prog = (el) => { const r = el.getBoundingClientRect(); return clamp(-r.top / (r.height - innerHeight), 0, 1); };
const sm = { cv: 0, zt: 0, dk: 0, rl: 0, vel: 0 };
let lastScroll = scrollY;
function loop(t) {
  lenis?.raf(t);
  const v = scrollY - lastScroll; lastScroll = scrollY;
  sm.vel = lerp(sm.vel, v, 0.1);

  // VI
  sm.cv = lerp(sm.cv, prog(cv), 0.09);
  const off = sm.cv * (cvCards.length - 1);
  const cw = cvCards[0].offsetWidth * 1.08;
  cvCards.forEach((c, i) => {
    const rel = i - off;
    const a = clamp(rel * -24 + sm.vel * -0.4, -70, 70);
    c.style.transform = `translateX(${rel * cw}px) translateZ(${-Math.abs(rel) * 160}px) rotateY(${a}deg)`;
    c.style.opacity = String(clamp(1.4 - Math.abs(rel) * 0.35, 0, 1));
  });
  const cvi = clamp(Math.round(off), 0, cvCards.length - 1);
  const big = $("[data-cv-big]");
  if (big.dataset.i !== String(cvi)) { big.dataset.i = cvi; big.textContent = list[cvi].title; }
  $("[data-cv-bar]").style.width = `${sm.cv * 100}%`;

  // VII
  sm.zt = lerp(sm.zt, prog(zt), 0.07);
  const cam = sm.zt * (ztItems.length - 1) * GAP;
  const vw = innerWidth, vh = innerHeight;
  ztItems.forEach((el, i) => {
    const z = -i * GAP + cam;
    const [px, py] = zPos[i % zPos.length];
    const near = clamp(1 - Math.abs(z) / GAP, 0, 1);
    el.style.transform = `translate3d(${px * vw * (1 - near * 0.9)}px, ${py * vh * (1 - near * 0.9)}px, ${z}px)`;
    el.style.opacity = String(z > 350 ? clamp(1 - (z - 350) / 300, 0, 1) : clamp(1 + (z + 4200) / 1200, 0, 1));
  });
  const zi = clamp(Math.round(sm.zt * (ztItems.length - 1)), 0, ztItems.length - 1);
  if (zi !== ztCur) {
    ztCur = zi;
    const n = $("[data-zt-name]");
    n.style.opacity = "0"; n.style.transform = "translateY(20px)";
    setTimeout(() => { n.textContent = list[zi].title; n.style.opacity = "1"; n.style.transform = "none"; }, 220);
    $("[data-zt-count]").textContent = `${pad(zi + 1)} / ${pad(ztItems.length)}`;
  }

  // VIII
  if (!drag.down) { drag.vx *= 0.9; drag.vy *= 0.9; }
  drag.x = lerp(drag.x, drag.tx, 0.08);
  drag.y = lerp(drag.y, drag.ty, 0.08);
  dcItems.forEach((it) => {
    const x = ((((it.bx + drag.x) % TW) + TW) % TW) - 360;
    const y = ((((it.by + drag.y) % TH) + TH) % TH) - 360;
    it.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  });

  // IX
  sm.dk = lerp(sm.dk, prog(dk), 0.08);
  tilt.x = lerp(tilt.x, tilt.tx, 0.06); tilt.y = lerp(tilt.y, tilt.ty, 0.06);
  const k = sm.dk * (dkCards.length - 1);
  dkCards.forEach((c, i) => {
    const d = i - k;
    if (d < 0) {
      const f = clamp(-d, 0, 1.2);
      c.style.transform = `translate3d(${-f * 70}vw, ${-f * 18}vh, ${f * 200}px) rotate(${-f * 28}deg)`;
      c.style.opacity = String(clamp(1 - f, 0, 1));
    } else {
      c.style.transform = `translate3d(${d * 26}px, ${-d * 22}px, ${-d * 90}px) rotateX(${tilt.y * -6}deg) rotateY(${tilt.x * 8}deg) rotate(${d * 2.5}deg)`;
      c.style.opacity = String(clamp(1 - d * 0.18, 0, 1));
    }
  });
  const di = clamp(Math.round(k), 0, dkCards.length - 1);
  if (di !== dkCur) {
    dkCur = di;
    const name = $("[data-dk-name]");
    name.style.opacity = "0"; name.style.transform = "translateY(24px)";
    setTimeout(() => { name.textContent = deck[di].title; $("[data-dk-sub]").textContent = `${deck[di].subtitle}. ${deck[di].role}.`; $("[data-dk-n]").textContent = `${pad(di + 1)} / ${pad(deck.length)} · ${cats(deck[di])}`; name.style.opacity = "1"; name.style.transform = "none"; }, 220);
  }

  // IV
  sm.rl = lerp(sm.rl, prog(rl), 0.08);
  const track = $("[data-rl-track]");
  track.style.transform = `translateX(${-sm.rl * (track.scrollWidth - innerWidth)}px) skewX(${clamp(sm.vel * -0.08, -6, 6)}deg)`;
  $("[data-rl-bar]").style.width = `${sm.rl * 100}%`;

  // V
  $$("[data-sk-card]").forEach((c, i, all) => {
    const next = all[i + 1];
    if (!next) return;
    const kk = clamp(1 - (next.getBoundingClientRect().top - c.getBoundingClientRect().top) / innerHeight, 0, 1);
    c.style.transform = `scale(${1 - kk * 0.07})`;
    c.style.filter = `brightness(${1 - kk * 0.4})`;
  });
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
