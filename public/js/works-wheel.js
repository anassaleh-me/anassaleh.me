// Works wheel: a portfolio index built as a wheel you turn (plain-JS port of the React component Anas picked).
// At rest the covers sit in a ring round a label; the first stretch of scroll blows the ring open into a vertical
// drum with one card flat at the front, and further scroll turns the next piece round to the front.
// One number drives it all: `turn` (0 = ring, 1 = drum with item 0 in front, +1 per item after that).
// Every card carries its own perspective (the container is flat), so the 3D card planes never slice through each other.

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rad = (d) => (d * Math.PI) / 180;
const pad = (n) => String(n).padStart(2, "0");
const G = { CARD_H: 0.4, CARD_MAX_W: 0.36, RATIO: 1.29, STEP: 40, DRUM: 2.22, LENS: 2.7, RING_R: 1.14, BOW: 1.82, CULL: 1.6 };

export function mountWorksWheel(root, { items, label, meta = () => "", cover }) {
  const stage = root.querySelector("[data-ww-stage]");
  const wheel = root.querySelector("[data-ww-wheel]");
  const index = root.querySelector("[data-ww-index]");
  const nameEl = root.querySelector("[data-ww-name]");
  const numEl = root.querySelector("[data-ww-n]");
  const catEl = root.querySelector("[data-ww-cat]");
  const labelEl = root.querySelector("[data-ww-label]");
  const titleEl = root.querySelector("[data-ww-title]");
  const bar = root.querySelector("[data-ww-bar]");
  if (label && labelEl) labelEl.innerHTML = label;
  root.style.height = `${(items.length + 2) * 55}vh`;

  wheel.innerHTML = items.map((p) => `<a class="ww-card" href="/work/${p.slug}" aria-label="${p.title}"><span class="face"><img src="${cover(p)}" alt="" loading="lazy" draggable="false"></span></a>`).join("");
  index.innerHTML = items.map((p, i) => `<li><button type="button" data-i="${i}" data-cursor="Go">${p.title}</button></li>`).join("");
  const cards = [...wheel.children];
  const faces = cards.map((c) => c.firstElementChild);
  const M = {};
  const measure = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    const cardW = Math.min(h * G.CARD_H * G.RATIO, w * (w < 760 ? 0.5 : G.CARD_MAX_W)), cardH = cardW / G.RATIO;
    Object.assign(M, { cardW, cardH, drumR: cardH * G.DRUM, ringR: cardH * G.RING_R, bow: cardH * G.BOW, lens: cardH * G.LENS });
    M.ringScale = clamp((((2 * Math.PI * M.ringR) / items.length) * 0.82) / cardW, 0.16, w < 760 ? 0.55 : 1);
    cards.forEach((c) => { c.style.width = `${cardW}px`; c.style.height = `${cardH}px`; c.style.margin = `${-cardH / 2}px 0 0 ${-cardW / 2}px`; });
  };
  measure();
  addEventListener("resize", measure);
  let dead = false;

  const progress = () => { const r = root.getBoundingClientRect(); return clamp(-r.top / (r.height - innerHeight), 0, 1); };
  const S = { turn: 0, active: -1, visible: false };
  const io = new IntersectionObserver(([e]) => (S.visible = e.isIntersecting), { rootMargin: "200px 0px" });
  io.observe(root);

  index.onclick = (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const top = root.getBoundingClientRect().top + scrollY;
    const y = top + ((Number(b.dataset.i) + 1) / (items.length + 0.6)) * (root.offsetHeight - innerHeight);
    window.__lenis ? window.__lenis.scrollTo(y, { duration: 1.4 }) : scrollTo({ top: y, behavior: "smooth" });
  };

  const setBlur = (el, px) => { const v = Math.round(px * 2) / 2; const f = v > 0 ? `blur(${v}px)` : "none"; if (el._f !== f) { el.style.filter = f; el._f = f; } };
  const swap = (text) => {
    if (nameEl.dataset.t === text) return;
    nameEl.dataset.t = text;
    nameEl.style.opacity = "0"; nameEl.style.transform = "translateY(16px)";
    clearTimeout(nameEl._t);
    nameEl._t = setTimeout(() => { nameEl.textContent = text; nameEl.style.opacity = "1"; nameEl.style.transform = "none"; }, 200);
  };

  function draw() {
    if (dead) return;
    requestAnimationFrame(draw);
    if (!S.visible) return;
    const p = progress();
    S.turn = lerp(S.turn, p * (items.length + 0.6), 0.12);
    const t = S.turn, m = clamp(t, 0, 1), pos = Math.max(0, t - 1);
    const spin = (1 - m) * t * 30;
    cards.forEach((c, i) => {
      const d = i - pos, drumDeg = d * G.STEP, ringDeg = i * (360 / items.length);
      c.style.transform =
        `perspective(${M.lens}px) translateZ(${-m * M.drumR}px) rotateZ(${spin}deg)` +
        ` translateX(${m * -M.bow * (1 - Math.cos(rad(drumDeg)))}px) rotateZ(${(1 - m) * ringDeg}deg)` +
        ` translateY(${-(1 - m) * M.ringR}px) rotateX(${m * drumDeg}deg) translateZ(${m * M.drumR}px)`;
      c.style.opacity = m > 0.5 && Math.abs(d) > G.CULL ? "0" : "1";
      c.style.zIndex = String(Math.round(100 - Math.abs(d) * 2));
      faces[i].style.transform = `scale(${lerp(M.ringScale, 1, m)})`;
      setBlur(faces[i], m > 0.5 ? clamp((Math.abs(d) - 0.25) * 6, 0, 6) : 0);
    });
    labelEl.style.opacity = String(1 - m);
    titleEl.style.opacity = String(m);
    bar.style.width = `${p * 100}%`;
    const near = clamp(Math.round(pos), 0, items.length - 1);
    if (near !== S.active) {
      S.active = near;
      swap(items[near].title);
      numEl.textContent = `${pad(near + 1)} / ${pad(items.length)}`;
      catEl.textContent = meta(items[near]);
      index.querySelectorAll("button").forEach((b, i) => b.classList.toggle("on", i === near));
    }
  }
  requestAnimationFrame(draw);
  // destroy() stops this wheel, so a filtered set can be mounted in the same place
  return { destroy() { dead = true; io.disconnect(); removeEventListener("resize", measure); clearTimeout(nameEl._t); delete nameEl.dataset.t; } };
}
