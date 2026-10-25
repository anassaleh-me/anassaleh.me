// Stage 1 options board: live hero sample, accent colours, cream textures and five project layouts.
import { mountHero } from "/js/hero2.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const picked = { color: "A", texture: "1" };
const showPicked = () => ($("[data-picked]").innerHTML = `اختيارك: لون <b>${picked.color}</b> · تكستشر <b>${picked.texture}</b>`);

/* ---------- accent colours ---------- */
const PALETTES = [
  { id: "A", name: "Brass", hex: "#b08d57", ar: "نحاسي ذهبي هادي. فخم، وبيرجع للذهبي يلي بتحبو بلوغوهاتك (PHILOSOPHY وDubai Sports)." },
  { id: "B", name: "Sage", hex: "#8e9b7a", ar: "أخضر رمادي (ساج). هادي وطبيعي وبريميوم، قريب من الزيتي يلي عند Lando بس أنعم." },
  { id: "C", name: "Ember", hex: "#d4622a", ar: "برتقالي محروق. فيه طاقة وحركة، بيذكّر بسباقات الفورمولا ومكلارين." },
  { id: "D", name: "Signal", hex: "#c6e03a", ar: "ليموني قوي متل Lando. بيشد العين كتير، بس بينحط بس على الفحمي وبكميات صغيرة." },
  { id: "E", name: "Mist blue", hex: "#6f8faf", ar: "أزرق ضبابي. بارد وسينمائي، بيعطي إحساس تقني وهادي." },
];
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
let hero;
function setAccent(p) {
  document.documentElement.style.setProperty("--accent", p.hex);
  picked.color = p.id;
  $$("[data-pal]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.pal === p.id)));
  hero?.set({ accent: hexToRgb(p.hex) });
  showPicked();
}
$("[data-palettes]").innerHTML = PALETTES.map((p) => `
  <button class="pal" type="button" data-pal="${p.id}" aria-pressed="false">
    <div class="ratio"><i style="flex:6;background:#f1ece2"></i><i style="flex:3;background:#1d1d1b"></i><i style="flex:1;background:${p.hex}"></i></div>
    <div class="mock"><span class="up">Visual <span style="color:${p.hex}">artist</span></span><br><span class="btn" style="background:${p.hex};color:#1d1d1b">Start a project</span></div>
    <div class="dark"><span class="up">Selected work</span><span class="chip" style="background:${p.hex};width:22px;height:22px"></span></div>
    <div class="info"><b>${p.id} · ${p.name.toUpperCase()} <span style="color:var(--muted)">${p.hex}</span></b><p>${p.ar}</p></div>
  </button>`).join("");
$$("[data-pal]").forEach((b) => b.addEventListener("click", () => setAccent(PALETTES.find((p) => p.id === b.dataset.pal))));

/* ---------- textures (drawn procedurally) ---------- */
function noise2D(seed = 1) {
  const p = new Uint8Array(512);
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const perm = [...Array(256).keys()].sort(() => r() - 0.5);
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const grad = (h, x, y) => ((h & 1) ? -x : x) + ((h & 2) ? -y : y);
  return (x, y) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y), a = p[X] + Y, b = p[X + 1] + Y;
    const l = (t, a1, b1) => a1 + t * (b1 - a1);
    return l(v, l(u, grad(p[a], x, y), grad(p[b], x - 1, y)), l(u, grad(p[a + 1], x, y - 1), grad(p[b + 1], x - 1, y - 1)));
  };
}
const canvasURL = (w, h, draw) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); return c.toDataURL("image/png"); };

const TEX = {
  grain: () => canvasURL(256, 256, (g, w, h) => {
    const d = g.createImageData(w, h);
    for (let i = 0; i < d.data.length; i += 4) { const v = 150 + Math.random() * 105; d.data[i] = v; d.data[i + 1] = v * 0.97; d.data[i + 2] = v * 0.92; d.data[i + 3] = 46; }
    g.putImageData(d, 0, 0);
  }),
  topo: () => canvasURL(900, 900, (g, w, h) => {
    const n = noise2D(7), step = 6, cols = w / step + 1, rows = h / step + 1, f = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) f.push(n(x * step / 260, y * step / 260) + 0.5 * n(x * step / 120 + 9, y * step / 120 + 3));
    g.strokeStyle = "rgba(60,55,48,.32)"; g.lineWidth = 1;
    for (let lvl = -1; lvl <= 1; lvl += 0.11) {
      g.beginPath();
      for (let y = 0; y < rows - 1; y++) for (let x = 0; x < cols - 1; x++) {
        const a = f[y * cols + x], b = f[y * cols + x + 1], c = f[(y + 1) * cols + x + 1], d = f[(y + 1) * cols + x];
        const pts = [];
        const e = (v1, v2, x1, y1, x2, y2) => { if ((v1 < lvl) !== (v2 < lvl)) { const t = (lvl - v1) / (v2 - v1); pts.push([(x1 + t * (x2 - x1)) * step, (y1 + t * (y2 - y1)) * step]); } };
        e(a, b, x, y, x + 1, y); e(b, c, x + 1, y, x + 1, y + 1); e(c, d, x + 1, y + 1, x, y + 1); e(d, a, x, y + 1, x, y);
        if (pts.length >= 2) { g.moveTo(...pts[0]); g.lineTo(...pts[1]); }
        if (pts.length === 4) { g.moveTo(...pts[2]); g.lineTo(...pts[3]); }
      }
      g.stroke();
    }
  }),
  fibers: () => canvasURL(512, 512, (g, w, h) => {
    const d = g.createImageData(w, h);
    for (let i = 0; i < d.data.length; i += 4) { const v = 170 + Math.random() * 85; d.data[i] = v; d.data[i + 1] = v * 0.96; d.data[i + 2] = v * 0.9; d.data[i + 3] = 30; }
    g.putImageData(d, 0, 0);
    for (let i = 0; i < 260; i++) {
      g.strokeStyle = `rgba(${90 + Math.random() * 60},${80 + Math.random() * 50},${60 + Math.random() * 40},${0.08 + Math.random() * 0.14})`;
      g.lineWidth = Math.random() * 1.1 + 0.3;
      const x = Math.random() * w, y = Math.random() * h, a = Math.random() * Math.PI * 2, l = 6 + Math.random() * 22;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 1) * l * 0.6, y + Math.sin(a + 1) * l * 0.6, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(70,60,50,${Math.random() * 0.25})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, Math.random() * 1.4, 0, 7); g.fill(); }
  }),
  dots: () => canvasURL(28, 28, (g) => { g.fillStyle = "rgba(60,55,48,.28)"; g.beginPath(); g.arc(14, 14, 1.1, 0, 7); g.fill(); }),
  graphite: () => canvasURL(400, 400, (g, w, h) => {
    const n = noise2D(3);
    for (let i = -h; i < w; i += 3) {
      for (let s = 0; s < h; s += 8) {
        const x = i + s, y = s, a = Math.max(0, n(x / 90, y / 90) + 0.15) * 0.22;
        if (a <= 0.01) continue;
        g.strokeStyle = `rgba(50,48,44,${a})`; g.lineWidth = 0.7;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + 8, y + 8); g.stroke();
      }
    }
  }),
};
const TEXTURES = [
  { id: "1", key: "grain", name: "Fine grain", size: "256px", ar: "حبيبات ناعمة متل الورق المطبوع. خفيفة وما بتتعب العين." },
  { id: "2", key: "topo", name: "Topographic", size: "900px", ar: "خطوط طبوغرافية متل خريطة. هي يلي بيستعملها Lando، وبتعطي عمق وحركة." },
  { id: "3", key: "fibers", name: "Paper fibers", size: "512px", ar: "ألياف ورق ونقط صغيرة متل ورق الرسم. طبيعي وبيحكي عن إنك بترسم." },
  { id: "4", key: "dots", name: "Sketchbook dots", size: "28px", ar: "شبكة نقط متل دفتر سكتش. مرتبة وفيها إحساس تصميم." },
  { id: "5", key: "graphite", name: "Graphite hatch", size: "400px", ar: "تظليل رصاص مايل وخفيف. بيوصل فكرة الرسم اليدوي بشكل مباشر." },
];
const texURLs = {};
TEXTURES.forEach((t) => (texURLs[t.key] = TEX[t.key]()));
document.documentElement.style.setProperty("--topo", `url(${texURLs.topo})`);
function setTexture(t) {
  document.documentElement.style.setProperty("--tex", `url(${texURLs[t.key]})`);
  document.documentElement.style.setProperty("--tex-size", t.size);
  picked.texture = t.id;
  $$("[data-tex]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tex === t.id)));
  showPicked();
}
$("[data-textures]").innerHTML = TEXTURES.map((t) => `
  <button class="tex" type="button" data-tex="${t.id}" aria-pressed="false">
    <div class="layer" style="background-image:url(${texURLs[t.key]});background-size:${t.size}"></div>
    <div class="lbl"><span class="up">${t.id} · ${t.name}</span><p>${t.ar}</p></div>
  </button>`).join("");
$$("[data-tex]").forEach((b) => b.addEventListener("click", () => setTexture(TEXTURES.find((t) => t.id === b.dataset.tex))));

setAccent(PALETTES[0]);
setTexture(TEXTURES[0]);

/* ---------- hero sample ---------- */
(async () => {
  hero = await mountHero($("[data-stage]"), {
    image: "/images/portrait-v2.webp",
    depth: "/images/portrait-v2-depth.png",
    sketch: "/images/portrait-v2-sketch.webp",
    alt: "Portrait of Anas Saleh",
    mode: 1,
    accent: hexToRgb(PALETTES[0].hex),
    reduceMotion: reduce,
  });
  $$("[data-lens]").forEach((b) => b.addEventListener("click", () => {
    hero.set({ mode: Number(b.dataset.lens) });
    $$("[data-lens]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  }));
  $$("[data-bg]").forEach((b) => b.addEventListener("click", () => {
    $("[data-hero]").classList.toggle("light", b.dataset.bg === "light");
    $$("[data-bg]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  }));
})();

/* ---------- projects ---------- */
const projects = (await fetch("/content/projects.json").then((r) => r.json())).filter((p) => !p.draft);
const cover = (p) => `/images/covers/${p.slug}.webp`;
const CAT = { design: "Design", "3d": "3D", motion: "Motion", video: "Video" };
const cats = (p) => (p.categories || []).map((c) => CAT[c]).join(" · ");

/* I hover list */
const float = $("[data-hl-float]");
$("[data-hl]").innerHTML = projects.slice(0, 8).map((p) => `<a href="/work/${p.slug}" data-img="${cover(p)}"><span class="up">${p.title}</span><span>${cats(p)}</span><span>${p.year}</span></a>`).join("");
projects.slice(0, 8).forEach((p) => { const i = new Image(); i.src = cover(p); });
let fx = 0, fy = 0, tx = 0, ty = 0, prevX = 0;
addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; });
$$("[data-hl] a").forEach((a) => a.addEventListener("pointerenter", () => {
  const img = document.createElement("img");
  img.src = a.dataset.img; img.alt = "";
  img.style.opacity = "0";
  float.prepend(img);
  requestAnimationFrame(() => (img.style.opacity = "1"));
  $$("img", float).slice(2).forEach((o) => o.remove());
  float.classList.add("on");
}));
$("[data-hl]").addEventListener("pointerleave", () => float.classList.remove("on"));

/* II collage */
const cl = $("[data-cl]");
const spots = [[4, 6, 22, 0.25], [62, 2, 26, 0.6], [34, 22, 18, 0.15], [74, 30, 20, 0.45], [8, 44, 24, 0.55], [46, 52, 22, 0.3], [70, 64, 17, 0.7], [18, 74, 19, 0.2], [52, 82, 25, 0.5]];
projects.slice(0, spots.length).forEach((p, i) => {
  const [x, y, w, sp] = spots[i];
  const f = document.createElement("figure");
  f.style.cssText = `left:${x}%;top:${y}%;width:${w}vw;`;
  f.dataset.speed = sp;
  f.innerHTML = `<img src="${cover(p)}" alt="${p.title}" loading="lazy"><figcaption>${p.title} · ${p.year}</figcaption>`;
  cl.append(f);
});

/* III stage */
const st = $("[data-st]");
const stList = projects.slice(0, 6);
st.style.height = `${stList.length * 100}vh`;
$("[data-st-card]").innerHTML = stList.map((p, i) => `<img src="${cover(p)}" alt="${p.title}" style="opacity:${i ? 0 : 1}">`).join("");
let stIndex = -1;
const setStage = (i) => {
  if (i === stIndex) return;
  stIndex = i;
  const w = $("[data-st-word]");
  w.classList.add("out");
  setTimeout(() => { w.textContent = stList[i].title; w.classList.remove("out"); }, stIndex === 0 && !w.textContent ? 0 : 260);
  $$("[data-st-card] img").forEach((im, j) => { im.style.opacity = j === i ? "1" : "0"; im.style.transform = j === i ? "scale(1)" : "scale(1.12)"; });
  $("[data-st-sub]").textContent = `${stList[i].subtitle} · ${cats(stList[i])}`;
  $("[data-st-count]").textContent = `${String(i + 1).padStart(2, "0")} / ${String(stList.length).padStart(2, "0")}`;
};
setStage(0);

/* IV reel */
const rl = $("[data-rl]");
const rlList = projects.slice(0, 8);
$("[data-rl-track]").innerHTML = rlList.map((p) => `<a class="rl-card" href="/work/${p.slug}"><div class="img"><img src="${cover(p)}" alt="${p.title}" loading="lazy"></div><div class="row"><span class="up">${p.title}</span><span>${p.year}</span></div></a>`).join("");

/* V stack */
$("[data-sk]").innerHTML = projects.slice(0, 5).map((p, i) => `<article class="sk-card" data-sk-card style="top:${10 + i * 1.5}vh"><img src="${cover(p)}" alt="${p.title}" loading="lazy"><div class="txt"><div><span class="n">${String(i + 1).padStart(2, "0")}</span><h4 class="up" style="margin:14px 0 0">${p.title}</h4><p>${p.subtitle}. ${p.role}.</p></div><span style="font-weight:700;letter-spacing:.1em;text-transform:uppercase;font-size:14px">${cats(p)} · ${p.year}</span></div></article>`).join("");

/* ---------- one loop for everything that follows scroll or the pointer ---------- */
const lenis = !reduce && window.Lenis ? new Lenis({ lerp: 0.1 }) : null;
const progress = (el) => { const r = el.getBoundingClientRect(); return Math.min(1, Math.max(0, -r.top / (r.height - innerHeight))); };
function loop(t) {
  lenis?.raf(t);
  // I
  fx += (tx - fx) * 0.14; fy += (ty - fy) * 0.14;
  const vx = fx - prevX; prevX = fx;
  float.style.transform = `translate(${fx}px, ${fy}px) translate(-50%, -50%) rotate(${Math.max(-12, Math.min(12, vx * 0.6))}deg) scale(${float.classList.contains("on") ? 1 : 0.7})`;
  // II
  const cr = cl.getBoundingClientRect();
  if (cr.bottom > 0 && cr.top < innerHeight) $$("figure", cl).forEach((f) => (f.style.transform = `translateY(${(cr.top - innerHeight / 2) * Number(f.dataset.speed) * -0.6}px)`));
  // III
  const sp = progress(st);
  setStage(Math.min(stList.length - 1, Math.floor(sp * stList.length * 0.999)));
  // IV
  const rp = progress(rl);
  const track = $("[data-rl-track]");
  const max = track.scrollWidth - innerWidth;
  track.style.transform = `translateX(${-rp * max}px)`;
  $("[data-rl-bar]").style.width = `${rp * 100}%`;
  // V
  $$("[data-sk-card]").forEach((c, i, all) => {
    const next = all[i + 1];
    if (!next) return;
    const nr = next.getBoundingClientRect(), cr2 = c.getBoundingClientRect();
    const k = Math.min(1, Math.max(0, 1 - (nr.top - cr2.top) / innerHeight));
    c.style.transform = `scale(${1 - k * 0.06})`;
    c.style.filter = `brightness(${1 - k * 0.35})`;
  });
  requestAnimationFrame(loop);
}
const rlSize = () => (rl.style.height = `${Math.max(200, ($("[data-rl-track]").scrollWidth / innerWidth) * 100)}vh`);
rlSize();
addEventListener("resize", rlSize);
requestAnimationFrame(loop);
