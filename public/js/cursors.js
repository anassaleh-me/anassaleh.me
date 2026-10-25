// Ring cursor: a small dot plus a ring in the accent colour that trails the pointer and stretches with speed.
// Over links and [data-cursor] elements the ring grows into a filled disc with a label ("View", "Drag").
// No blend modes: colours switch explicitly between light and dark areas ([data-dark]).
const fine = matchMedia("(pointer: fine)").matches;
const lerp = (a, b, t) => a + (b - a) * t;

export function mountRingCursor({ accent = "#6f8faf" } = {}) {
  if (!fine) return;
  const root = document.createElement("div");
  root.className = "ring-cursor";
  root.innerHTML = `
  <style>
  .ring-cursor, .ring-cursor * { pointer-events: none; }
  .ring-cursor { --rc-accent: ${accent}; --rc-dot: #1d1d1b; }
  .ring-cursor.on-dark { --rc-dot: #f1ece2; }
  .ring-cursor i { position: fixed; left: 0; top: 0; z-index: 9999; border-radius: 50%; will-change: transform; }
  .rc-dot { width: 7px; height: 7px; margin: -3.5px 0 0 -3.5px; background: var(--rc-dot); transition: background .3s, opacity .3s; }
  .rc-ring { width: 42px; height: 42px; margin: -21px 0 0 -21px; border: 1.5px solid var(--rc-accent); display: grid; place-items: center;
    transition: width .55s cubic-bezier(.16,1,.3,1), height .55s cubic-bezier(.16,1,.3,1), margin .55s cubic-bezier(.16,1,.3,1), background .4s, border-color .4s; }
  .rc-ring b { font: 700 11px/1 "Barlow Semi Condensed", sans-serif; letter-spacing: .14em; text-transform: uppercase; color: #1d1d1b; opacity: 0; transition: opacity .3s .05s; }
  .ring-cursor.big .rc-ring { width: 92px; height: 92px; margin: -46px 0 0 -46px; background: var(--rc-accent); }
  .ring-cursor.big .rc-ring b { opacity: 1; }
  .ring-cursor.big .rc-dot { opacity: 0; }
  .ring-cursor.hidden i { opacity: 0; }
  html.rc-hide, html.rc-hide * { cursor: none !important; }
  </style>
  <i class="rc-ring"><b></b></i><i class="rc-dot"></i>`;
  document.body.append(root);
  document.documentElement.classList.add("rc-hide");
  const ring = root.querySelector(".rc-ring");
  const label = ring.querySelector("b");
  const dot = root.querySelector(".rc-dot");
  const m = { x: -100, y: -100 }, r = { x: -100, y: -100 }, prev = { x: 0, y: 0 };

  addEventListener("pointermove", (e) => {
    m.x = e.clientX; m.y = e.clientY;
    const el = document.elementFromPoint(m.x, m.y);
    root.classList.toggle("on-dark", Boolean(el?.closest?.("[data-dark]")));
  }, { passive: true });
  addEventListener("pointerover", (e) => {
    const t = e.target.closest?.("a, button, [data-cursor]");
    const text = t?.dataset?.cursor || (t?.tagName === "A" ? "View" : "");
    root.classList.toggle("big", Boolean(text));
    label.textContent = text;
  });
  document.addEventListener("pointerleave", () => root.classList.add("hidden"));
  document.addEventListener("pointerenter", () => root.classList.remove("hidden"));

  (function tick() {
    requestAnimationFrame(tick);
    const vx = m.x - prev.x, vy = m.y - prev.y;
    prev.x = m.x; prev.y = m.y;
    r.x = lerp(r.x, m.x, 0.15); r.y = lerp(r.y, m.y, 0.15);
    const big = root.classList.contains("big");
    const s = big ? 1 : Math.min(1.55, 1 + Math.hypot(vx, vy) / 45);
    const a = Math.atan2(vy, vx) * 57.3;
    ring.style.transform = `translate(${r.x}px, ${r.y}px) rotate(${big ? 0 : a}deg) scale(${s}, ${1 / s})`;
    dot.style.transform = `translate(${m.x}px, ${m.y}px)`;
  })();
}
