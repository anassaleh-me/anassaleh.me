// Ring cursor: a small dot plus an accent ring that trails the pointer and stretches with speed.
// Over links and [data-cursor] elements the ring grows into a filled disc with a label ("View", "Drag").
// Everything moves with transforms only (no width/height changes), so the big state keeps up with the pointer.
// No blend modes: colours switch explicitly between light and dark areas ([data-dark]).
const fine = matchMedia("(pointer: fine)").matches;
const lerp = (a, b, t) => a + (b - a) * t;
const SIZE = 92;          // the ring is drawn at its big size and scaled down when small
const SMALL = 40 / SIZE;  // small ring diameter, as a fraction of SIZE

export function mountRingCursor({ accent = "#6f8faf" } = {}) {
  if (!fine) return;
  const root = document.createElement("div");
  root.className = "ring-cursor";
  root.innerHTML = `
  <style>
  .ring-cursor, .ring-cursor * { pointer-events: none; }
  .ring-cursor { --rc-accent: ${accent}; --rc-dot: #1d1d1b; }
  .ring-cursor.on-dark { --rc-dot: #f1ece2; }
  .ring-cursor > i { position: fixed; left: 0; top: 0; z-index: 9999; border-radius: 50%; will-change: transform; }
  .rc-dot { width: 7px; height: 7px; margin: -3.5px 0 0 -3.5px; background: var(--rc-dot); transition: background .25s, opacity .15s; }
  .rc-ring { width: ${SIZE}px; height: ${SIZE}px; margin: -${SIZE / 2}px 0 0 -${SIZE / 2}px; display: grid; place-items: center; }
  .rc-ring::before { content: ""; position: absolute; inset: 0; border-radius: 50%; border: var(--rc-bw, 3.4px) solid var(--rc-accent); background: transparent; transition: background-color .08s; }
  .ring-cursor.big .rc-ring::before { background-color: var(--rc-accent); }
  .rc-ring b { position: relative; font: 700 11px/1 "Barlow Semi Condensed", sans-serif; letter-spacing: .14em; text-transform: uppercase; color: #1d1d1b; opacity: 0; transition: opacity .08s; }
  .ring-cursor.big .rc-ring b { opacity: 1; }
  .ring-cursor.big .rc-dot { opacity: 0; }
  .ring-cursor.hidden > i { opacity: 0; }
  html.rc-hide, html.rc-hide * { cursor: none !important; }
  </style>
  <i class="rc-ring"><b></b></i><i class="rc-dot"></i>`;
  document.body.append(root);
  document.documentElement.classList.add("rc-hide");
  const ring = root.querySelector(".rc-ring");
  const label = ring.querySelector("b");
  const dot = root.querySelector(".rc-dot");
  const m = { x: -200, y: -200 }, r = { x: -200, y: -200 }, prev = { x: 0, y: 0 };
  let big = false, size = SMALL, stretch = 1, angle = 0;

  const check = (x, y) => {
    const el = document.elementFromPoint(x, y);
    root.classList.toggle("on-dark", Boolean(el?.closest?.("[data-dark]")));
    const t = el?.closest?.("a, button, [data-cursor]");
    const text = t ? (t.dataset.cursor ?? (t.tagName === "A" ? "View" : "")) : "";
    big = Boolean(text);
    root.classList.toggle("big", big);
    if (label.textContent !== text) label.textContent = text;
  };
  addEventListener("pointermove", (e) => { m.x = e.clientX; m.y = e.clientY; check(m.x, m.y); }, { passive: true });
  addEventListener("scroll", () => check(m.x, m.y), { passive: true });
  document.addEventListener("pointerleave", () => root.classList.add("hidden"));
  document.addEventListener("pointerenter", () => root.classList.remove("hidden"));

  (function tick() {
    requestAnimationFrame(tick);
    const vx = m.x - prev.x, vy = m.y - prev.y;
    prev.x = m.x; prev.y = m.y;
    // The big disc sits right on the pointer; the small ring trails a little.
    const follow = big ? 1 : 0.35;
    r.x = lerp(r.x, m.x, follow); r.y = lerp(r.y, m.y, follow);
    size = lerp(size, big ? 1 : SMALL, 0.42);
    const speed = Math.hypot(vx, vy);
    stretch = lerp(stretch, big ? 1 : Math.min(1.5, 1 + speed / 50), 0.25);
    if (speed > 0.5) angle = Math.atan2(vy, vx) * 57.3;
    const bw = (1.5 / size).toFixed(1);
    if (ring._bw !== bw) { ring.style.setProperty("--rc-bw", `${bw}px`); ring._bw = bw; }
    ring.style.transform = `translate(${r.x}px, ${r.y}px) rotate(${big ? 0 : angle}deg) scale(${size * stretch}, ${size / stretch})`;
    label.style.transform = `rotate(${big ? 0 : -angle}deg) scale(${1 / Math.max(size, 0.01)})`;
    dot.style.transform = `translate(${m.x}px, ${m.y}px)`;
  })();
}
