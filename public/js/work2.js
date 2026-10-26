// Work page (stage 3): filter chips over an index of every project (the works wheel lives on the home page).
// ?f=<filter> in the URL picks the starting chip (the home page's discipline words link here).
import { shell, $, $$, esc, lerp, clamp, pad, cats, thumb, inCategory } from "/js/shell2.js";

const { site, projects, reveal } = await shell({ current: "work" });
if (site.workIntro) $(".ph__foot p").textContent = site.workIntro;

// [key, chip label, test, the short line shown under the chips]. The categories, their names and lines come from
// Pages CMS (Work > Categories); a chip shows only when at least one project has that category.
const CATS = site.workCategories || [];
const allCat = CATS.find((c) => c.key === "all");
const FILTERS = [
  ["all", "All", () => true, allCat?.description || "Every project, client work and personal."],
  ...CATS.filter((c) => c.key !== "all").map((c) => [c.key, c.label || c.key, (p) => inCategory(p, c.key), c.description || ""]),
].filter(([, , test]) => projects.some(test));

const chips = $("[data-chips]");
chips.innerHTML = FILTERS.map(([k, label]) => `<button type="button" class="chip" data-f="${k}" aria-pressed="false">${label}</button>`).join("");

const fnote = $("[data-fnote]");
const list = $("[data-index]");
// banner for the chosen category (image, title and line from Pages CMS, Site > Work categories)
const BANNERS = Object.fromEntries((site.workCategories || []).map((c) => [c.key, c]));
const banner = $("[data-banner]");
const setBanner = (key, fallback) => {
  const b = BANNERS[key];
  if (!b?.banner) { banner.classList.remove("on"); banner.setAttribute("aria-hidden", "true"); return; }
  const img = new Image();
  img.alt = ""; img.src = b.banner;
  img.onload = () => {
    banner.querySelector(".wb__img").replaceChildren(img);
    requestAnimationFrame(() => img.classList.add("in"));
  };
  banner.querySelector(".wb__t").textContent = b.label || fallback[1];
  banner.querySelector(".wb__d").textContent = b.description || fallback[3];
  banner.classList.add("on"); banner.removeAttribute("aria-hidden");
};
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
  fnote.textContent = BANNERS[current]?.description || f[3];
  setBanner(current, f);
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
// old addresses (?f=video, ?f=design) still land on the right chip
// older shared links (?f=video, ?f=3d...) open the category that replaced them
const ALIAS = { video: "video-production", film: "video-production", design: "branding-graphic-design", graphic: "branding-graphic-design", "graphic-design": "branding-graphic-design", branding: "branding-graphic-design", "3d": "3d-design", motion: "animation", direction: "art-direction", web: "ui-ux", drawing: "traditional-art" };
const asked = new URLSearchParams(location.search).get("f") || "all";
apply(ALIAS[asked] && !FILTERS.some(([k]) => k === asked) ? ALIAS[asked] : asked, { first: true });

reveal();

// index hover: the cover follows the pointer
const float = $("[data-float]");
const fl = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2 };
addEventListener("pointermove", (e) => { fl.tx = e.clientX; fl.ty = e.clientY; }, { passive: true });
list.addEventListener("pointerover", (e) => {
  const row = e.target.closest(".ix__row");
  if (!row) return;
  float.classList.add("on");
  if (float.dataset.src === row.dataset.cover) return;
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

