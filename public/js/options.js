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

/* hero */
mountHero($("[data-stage]"), { image: "/images/portrait-v2.webp", depth: "/images/portrait-v2-depth.png", alt: "Portrait of Anas Saleh", mode: 0, reduceMotion: reduce });

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
    url: canvasURL(260, 260, pixels(260, 260, () => [90 + Math.random() * 60, Math.random() * 70])) },
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

/* D dock reel */
const dk = $("[data-dk]");
dk.style.height = "300vh";
$("[data-dk-track]").innerHTML = projects.map((p) => `<a class="dk-card" href="/work/${p.slug}"><div class="img"><img src="${cover(p)}" alt="${p.title}" loading="lazy"></div><span class="up">${p.title}</span></a>`).join("");
const dkCards = $$(".dk-card");
const dkTrack = $("[data-dk-track]");
const dkPointer = { x: -9999, tx: -9999, inside: false };
const dkRow = $(".dk-row");
dkRow.addEventListener("pointermove", (e) => { dkPointer.tx = e.clientX; dkPointer.inside = true; });
dkRow.addEventListener("pointerleave", () => (dkPointer.inside = false));
const dkScale = dkCards.map(() => 1);
let dkP = 0;

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

/* C wave reel */
const wv = $("[data-wv]");
wv.style.height = "320vh";
$("[data-wv-track]").innerHTML = list.map((p) => `<a class="wv-card" href="/work/${p.slug}"><div class="img"><img src="${cover(p)}" alt="${p.title}" loading="lazy"></div><span class="up">${p.title}</span></a>`).join("");
const wvCards = $$(".wv-card");
let wvP = 0;

/* E split columns */
const sc = $("[data-sc]");
const half = Math.ceil(list.length / 2);
const colA = list.slice(0, half), colB = list.slice(half);
const colHTML = (arr) => [...arr, ...arr].map((p) => `<a href="/work/${p.slug}" data-title="${p.title}" data-sub="${cats(p)} · ${p.year}"><img src="${cover(p)}" alt="${p.title}" loading="lazy"></a>`).join("");
$("[data-sc-a]").innerHTML = colHTML(colA);
$("[data-sc-b]").innerHTML = colHTML(colB);
let scP = 0;

/* F stacking cards */
$("[data-sk]").innerHTML = list.slice(0, 5).map((p, i) => `<article class="sk-card" data-sk-card style="top:${12 + i * 1.6}vh"><div class="img"><img src="${cover(p)}" alt="${p.title}" loading="lazy"></div><div class="txt"><div><span class="n">${pad(i + 1)} / 05</span><h4 class="up" style="margin:14px 0 0">${p.title}</h4><p>${p.subtitle}. ${p.role}.</p></div><a class="go" href="/work/${p.slug}">View project</a></div></article>`).join("");
const skCards = $$("[data-sk-card]");
const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener("pointermove", (e) => { tilt.tx = e.clientX / innerWidth - 0.5; tilt.ty = e.clientY / innerHeight - 0.5; }, { passive: true });

/* ---------- one smooth loop ---------- */
const lenis = window.Lenis ? new Lenis({ lerp: 0.08, wheelMultiplier: 0.9 }) : null;
const prog = (el) => { const r = el.getBoundingClientRect(); return clamp(-r.top / (r.height - innerHeight), 0, 1); };
const sm = { cv: 0, vel: 0 };
let lastY = scrollY;
function loop(t) {
  lenis?.raf(t);
  const v = scrollY - lastY; lastY = scrollY;
  sm.vel = lerp(sm.vel, v, 0.1);
  const W = innerWidth, H = innerHeight;
  tilt.x = lerp(tilt.x, tilt.tx, 0.06); tilt.y = lerp(tilt.y, tilt.ty, 0.06);

  // D dock reel: magnify around the pointer with a smooth falloff, lift, and ripple
  dkP = lerp(dkP, prog(dk), 0.08);
  const maxShift = Math.max(0, dkTrack.scrollWidth - W);
  dkTrack.style.transform = `translate(${-dkP * maxShift}px, -50%)`;
  dkPointer.x = lerp(dkPointer.x, dkPointer.inside ? dkPointer.tx : -9999, 0.12);
  let best = -1, bestS = 1;
  dkCards.forEach((c, i) => {
    const r = c.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const d = (dkPointer.x - cx) / 210;
    const target = 1 + 0.9 * Math.exp(-d * d * 2.2);
    dkScale[i] = lerp(dkScale[i], target, 0.14);
    const s = dkScale[i];
    const ripple = Math.sin(t / 260 - i * 0.9) * 8 * (s - 1);
    c.style.transform = `translateY(${-(s - 1) * 70 + ripple}px) scale(${s})`;
    c.style.marginInline = `${(s - 1) * 46}px`;
    c.classList.toggle("on", s > 1.5);
    if (s > bestS) { bestS = s; best = i; }
  });
  swapText($("[data-dk-title]"), best >= 0 && bestS > 1.4 ? projects[best].title : "Hover the row");
  $("[data-dk-bar]").style.width = `${dkP * 100}%`;

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

  // C wave reel
  wvP = lerp(wvP, prog(wv), 0.08);
  const spread = W * 0.3, total = (wvCards.length - 1) * spread + W, now = t / 1000;
  let wvBest = 0, wvD = 1e9;
  wvCards.forEach((c, i) => {
    const x = W * 0.9 + i * spread - wvP * total;
    const ph = (x / W) * Math.PI * 2 + now * 0.6;
    const center = x + c.offsetWidth / 2;
    const dc = Math.abs(center - W / 2) / (W / 2);
    const s = 1 + 0.35 * Math.max(0, 1 - dc * 1.6);
    c.style.transform = `translate3d(${x}px, ${Math.sin(ph) * H * 0.11}px, 0) rotate(${Math.cos(ph) * 7}deg) scale(${s})`;
    setBlur(c, clamp((dc - 0.25) * 9, 0, 8));
    c.style.opacity = String(clamp(1.25 - dc * 0.7, 0.25, 1));
    if (Math.abs(center - W / 2) < wvD) { wvD = Math.abs(center - W / 2); wvBest = i; }
  });
  wvCards.forEach((c, i) => c.classList.toggle("center", i === wvBest));
  $("[data-wv-bar]").style.width = `${wvP * 100}%`;

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

  // F stacking cards
  skCards.forEach((c, i) => {
    const next = skCards[i + 1];
    const k = next ? clamp(1 - (next.getBoundingClientRect().top - c.getBoundingClientRect().top) / H, 0, 1) : 0;
    const r = c.getBoundingClientRect();
    const active = k < 0.05 && r.top < H * 0.5 && r.bottom > H * 0.3;
    c.style.transform = `perspective(1400px) scale(${1 - k * 0.08}) rotateX(${active ? tilt.y * -3 : 0}deg) rotateY(${active ? tilt.x * 4 : 0}deg)`;
    setBlur(c, k * 6, `brightness(${1 - k * 0.45})`);
  });
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
