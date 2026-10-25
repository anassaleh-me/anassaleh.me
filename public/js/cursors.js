// Custom cursor styles. setCursor(name) switches between them; "default" restores the system cursor.
// liquid: gooey blob trail · ring: dot + ring that stretches with speed · ink: smoky trail
// pencil: a graphite line that fades · spotlight: soft light that follows the pointer
const fine = matchMedia("(pointer: fine)").matches;
const lerp = (a, b, t) => a + (b - a) * t;
const root = document.createElement("div");
root.className = "cur-root";
root.innerHTML = `
<style>
.cur-root, .cur-root * { pointer-events: none; }
.cur-root > * { position: fixed; inset: 0; z-index: 9999; display: none; }
.c-liquid, .c-ring, .c-ink, .c-pencil { mix-blend-mode: difference; }
.c-spot { mix-blend-mode: soft-light; }
.cur-root[data-c="liquid"] .c-liquid, .cur-root[data-c="ring"] .c-ring, .cur-root[data-c="ink"] .c-ink,
.cur-root[data-c="pencil"] .c-pencil, .cur-root[data-c="spotlight"] .c-spot { display: block; }
.c-liquid svg { width: 100%; height: 100%; mix-blend-mode: difference; }
.c-ring .dot, .c-ring .ring, .c-dot { position: fixed; left: 0; top: 0; border-radius: 50%; will-change: transform; }
.c-ring .dot, .c-dot { width: 8px; height: 8px; margin: -4px 0 0 -4px; background: #fff; mix-blend-mode: difference; }
.c-ring .ring { width: 44px; height: 44px; margin: -22px 0 0 -22px; border: 1.5px solid #fff; mix-blend-mode: difference; display: grid; place-items: center; transition: width .5s cubic-bezier(.16,1,.3,1), height .5s cubic-bezier(.16,1,.3,1), margin .5s cubic-bezier(.16,1,.3,1), background .4s; }
.c-ring .ring span { font: 700 11px/1 "Barlow Semi Condensed", sans-serif; letter-spacing: .12em; text-transform: uppercase; color: #000; opacity: 0; transition: opacity .3s; }
.c-ring.big .ring { width: 96px; height: 96px; margin: -48px 0 0 -48px; background: #fff; }
.c-ring.big .ring span { opacity: 1; }
.c-ink canvas, .c-pencil canvas { width: 100%; height: 100%; mix-blend-mode: difference; }
.c-ink canvas { filter: blur(7px); }
.c-spot .glow { position: fixed; left: 0; top: 0; width: 620px; height: 620px; margin: -310px 0 0 -310px; border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,.22), rgba(255,255,255,.06) 40%, transparent 70%); mix-blend-mode: soft-light; will-change: transform; }
html.cur-hide, html.cur-hide * { cursor: none !important; }
</style>
<div class="c-liquid"><svg aria-hidden="true"><defs><filter id="cgoo"><feGaussianBlur in="SourceGraphic" stdDeviation="9"/><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"/></filter></defs><g filter="url(#cgoo)" fill="#fff"></g></svg></div>
<div class="c-ring"><i class="ring"><span></span></i><i class="dot"></i></div>
<div class="c-ink"><canvas></canvas></div>
<div class="c-pencil"><canvas></canvas><i class="c-dot"></i></div>
<div class="c-spot"><i class="glow"></i><i class="c-dot"></i></div>`;

const mouse = { x: innerWidth / 2, y: innerHeight / 2, px: 0, py: 0, moved: 0 };
let mode = "default";
let started = false;

// liquid blob: a chain of circles that follow each other
const g = root.querySelector(".c-liquid g");
const blobs = Array.from({ length: 10 }, (_, i) => {
  const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  c.setAttribute("r", String(20 - i * 1.4));
  g.append(c);
  return { el: c, x: mouse.x, y: mouse.y };
});
let blobBoost = 0;

// ring
const ringWrap = root.querySelector(".c-ring");
const ring = root.querySelector(".c-ring .ring");
const ringLabel = ring.querySelector("span");
const dot = root.querySelector(".c-ring .dot");
const rp = { x: mouse.x, y: mouse.y };

// canvases
const inkC = root.querySelector(".c-ink canvas");
const penC = root.querySelector(".c-pencil canvas");
const inkX = inkC.getContext("2d");
const penX = penC.getContext("2d");
const trail = [];
const strokes = [];
const sizeCanvases = () => {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  for (const c of [inkC, penC]) { c.width = innerWidth * dpr; c.height = innerHeight * dpr; c.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0); }
};
const dots = [...root.querySelectorAll(".c-dot")];
const glow = root.querySelector(".glow");

function hoverTarget(el) {
  return el?.closest?.("a, button, [data-cursor]");
}

function tick() {
  requestAnimationFrame(tick);
  if (mode === "default") return;
  const vx = mouse.x - mouse.px, vy = mouse.y - mouse.py;
  const speed = Math.hypot(vx, vy);
  mouse.px = mouse.x; mouse.py = mouse.y;

  if (mode === "liquid") {
    let lx = mouse.x, ly = mouse.y;
    blobs.forEach((b, i) => {
      b.x = lerp(b.x, lx, i === 0 ? 0.35 : 0.42);
      b.y = lerp(b.y, ly, i === 0 ? 0.35 : 0.42);
      b.el.setAttribute("cx", b.x.toFixed(1));
      b.el.setAttribute("cy", b.y.toFixed(1));
      b.el.setAttribute("r", String(Math.max(2, (20 - i * 1.4) * (1 + blobBoost * (i === 0 ? 1.6 : 0.4)))));
      lx = b.x; ly = b.y;
    });
  }
  if (mode === "ring") {
    rp.x = lerp(rp.x, mouse.x, 0.16);
    rp.y = lerp(rp.y, mouse.y, 0.16);
    const big = ringWrap.classList.contains("big");
    const stretch = big ? 1 : Math.min(1.6, 1 + speed / 40);
    const ang = Math.atan2(vy, vx) * 180 / Math.PI;
    ring.style.transform = `translate(${rp.x}px, ${rp.y}px) rotate(${ang}deg) scale(${stretch}, ${1 / stretch})`;
    ringLabel.style.transform = `rotate(${-ang}deg)`;
    dot.style.transform = `translate(${mouse.x}px, ${mouse.y}px)`;
  }
  if (mode === "ink") {
    if (speed > 0.5) trail.push({ x: mouse.x, y: mouse.y, r: Math.min(26, 8 + speed * 0.6), life: 1 });
    inkX.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = trail.length - 1; i >= 0; i--) {
      const t = trail[i];
      t.life -= 0.018; t.r *= 1.012;
      if (t.life <= 0) { trail.splice(i, 1); continue; }
      inkX.fillStyle = `rgba(255,255,255,${t.life * 0.55})`;
      inkX.beginPath(); inkX.arc(t.x, t.y, t.r, 0, Math.PI * 2); inkX.fill();
    }
  }
  if (mode === "pencil") {
    if (speed > 0.3) strokes.push({ x1: mouse.x - vx, y1: mouse.y - vy, x2: mouse.x, y2: mouse.y, life: 1, w: Math.max(0.6, 2.2 - speed * 0.04) });
    penX.clearRect(0, 0, innerWidth, innerHeight);
    penX.lineCap = "round";
    for (let i = strokes.length - 1; i >= 0; i--) {
      const s = strokes[i];
      s.life -= 0.012;
      if (s.life <= 0) { strokes.splice(i, 1); continue; }
      penX.strokeStyle = `rgba(255,255,255,${s.life * 0.75})`;
      penX.lineWidth = s.w;
      penX.beginPath(); penX.moveTo(s.x1, s.y1); penX.lineTo(s.x2 + (Math.random() - 0.5) * 0.6, s.y2 + (Math.random() - 0.5) * 0.6); penX.stroke();
    }
  }
  if (mode === "spotlight") glow.style.transform = `translate(${mouse.x}px, ${mouse.y}px)`;
  dots.forEach((d) => (d.style.transform = `translate(${mouse.x}px, ${mouse.y}px)`));
  blobBoost = lerp(blobBoost, root.dataset.hover ? 1 : 0, 0.12);
}

export function setCursor(name) {
  if (!fine) return;
  if (!started) {
    started = true;
    document.body.append(root);
    sizeCanvases();
    addEventListener("resize", sizeCanvases);
    addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    addEventListener("pointerover", (e) => {
      const t = hoverTarget(e.target);
      root.dataset.hover = t ? "1" : "";
      ringWrap.classList.toggle("big", Boolean(t));
      ringLabel.textContent = t?.dataset?.cursor || (t?.tagName === "A" ? "View" : "");
    });
    requestAnimationFrame(tick);
  }
  mode = name;
  root.dataset.c = name;
  document.documentElement.classList.toggle("cur-hide", name !== "default");
  trail.length = 0; strokes.length = 0;
}
