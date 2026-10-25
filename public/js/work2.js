// Work page (stage 3): filter chips over an index of every project (the works wheel lives on the home page).
// ?f=<filter> in the URL picks the starting chip (the home page's discipline words link here).
import { shell, $, $$, esc, lerp, clamp, pad, cats, thumb } from "/js/shell2.js";

const { projects, reveal } = await shell({ current: "work" });

// [key, chip label, test, the short line shown under the chips]
const FILTERS = [
  ["all", "All", () => true, "Every project, client work and personal."],
  ["direction", "Art direction", (p) => /direct/i.test(`${p.role} ${p.subtitle}`), "Projects where I led the creative direction."],
  ["design", "Design", (p) => p.categories?.includes("design"), "Brand identity, packaging, social and visual design."],
  ["3d", "3D", (p) => p.categories?.includes("3d"), "Models, product renders and animation, made in Blender."],
  ["motion", "Motion", (p) => p.categories?.includes("motion"), "Animation, motion graphics and type in motion."],
  ["video", "Video", (p) => p.categories?.includes("video"), "Films I directed, shot and edited."],
].filter(([, , test]) => projects.some(test));

const chips = $("[data-chips]");
chips.innerHTML = FILTERS.map(([k, label]) => `<button type="button" class="chip" data-f="${k}" aria-pressed="false">${label}</button>`).join("");

const fnote = $("[data-fnote]");
const list = $("[data-index]");
// the hover previews are fetched as soon as the list comes near, so the first hover already has its picture
new IntersectionObserver(([e], io) => {
  if (!e.isIntersecting) return;
  projects.forEach((p) => { new Image().src = thumb(p); });
  io.disconnect();
}, { rootMargin: "400px 0px" }).observe(list);
let current = "";

function apply(key, { first = false } = {}) {
  const f = FILTERS.find(([k]) => k === key) || FILTERS[0];
  if (f[0] === current) return;
  current = f[0];
  const items = projects.filter(f[2]);
  $$(".chip", chips).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.f === current)));
  history.replaceState(null, "", current === "all" ? "/work" : `/work?f=${current}`);

  // the line under the chips says what this filter shows
  fnote.textContent = f[3];
  if (!first) fnote.animate([{ opacity: 0, transform: "translateY(8px)", filter: "blur(6px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], { duration: 600, easing: "cubic-bezier(.16,1,.3,1)" });

  // index: the lines blur out, the new set comes into focus line by line
  const build = () => {
    list.innerHTML = items.map((p, i) => `<li data-reveal><a class="ix__row" href="/work/${esc(p.slug)}" data-cursor="View" data-cover="${thumb(p)}">
      <span class="ix__n">${pad(i + 1)}</span><span class="ix__t up">${esc(p.title)}</span><span class="ix__s">${esc(p.subtitle)}</span><span class="ix__c">${cats(p)}</span><span class="ix__y">${esc(p.year)}</span>
      <span class="ix__img" aria-hidden="true"><img src="${thumb(p)}" alt="" loading="lazy"></span></a></li>`).join("");
    list.classList.remove("swap");
    reveal(list);
  };
  if (first) build(); else { list.classList.add("swap"); setTimeout(build, 300); }
}

chips.addEventListener("click", (e) => { const b = e.target.closest("[data-f]"); if (b) apply(b.dataset.f); });
apply(new URLSearchParams(location.search).get("f") || "all", { first: true });

reveal();

// index hover: the cover follows the pointer
const float = $("[data-float]");
const fl = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2 };
addEventListener("pointermove", (e) => { fl.tx = e.clientX; fl.ty = e.clientY; }, { passive: true });
list.addEventListener("pointerover", (e) => {
  const row = e.target.closest(".ix__row");
  if (!row || float.dataset.src === row.dataset.cover) return;
  float.dataset.src = row.dataset.cover;
  const img = new Image();
  img.alt = ""; img.style.opacity = "0";
  img.onload = () => requestAnimationFrame(() => (img.style.opacity = "1"));
  img.src = row.dataset.cover;
  float.append(img);
  $$("img", float).slice(0, -2).forEach((o) => o.remove());
  float.classList.add("on");
});
list.addEventListener("pointerleave", () => float.classList.remove("on"));
(function loop() {
  requestAnimationFrame(loop);
  fl.x = lerp(fl.x, fl.tx, 0.16); fl.y = lerp(fl.y, fl.ty, 0.16);
  float.style.transform = `translate(${fl.x}px, ${fl.y}px) translate(28px, -50%) rotate(${clamp((fl.tx - fl.x) * 0.08, -10, 10)}deg)`;
})();

