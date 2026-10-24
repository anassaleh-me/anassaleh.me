import { getProjects, cardHTML, CATEGORY_LABELS, reveal } from "/js/site.js";

export default async function work({ motion }) {
  const projects = await getProjects();
  const grid = document.querySelector("[data-grid]");
  const chips = document.querySelector("[data-chips]");
  grid.innerHTML = projects.map(cardHTML).join("");

  const counts = { all: projects.length };
  projects.forEach((p) => (p.categories || []).forEach((c) => (counts[c] = (counts[c] || 0) + 1)));
  const filters = ["all", ...Object.keys(CATEGORY_LABELS).filter((k) => counts[k])];
  chips.innerHTML = filters
    .map((f) => `<button class="chip" type="button" data-f="${f}" aria-pressed="false">${f === "all" ? "All" : CATEGORY_LABELS[f]}<sup>${counts[f]}</sup></button>`)
    .join("");

  const { Flip } = window;
  if (motion && Flip) window.gsap.registerPlugin(Flip);

  const apply = (f, animate) => {
    const cards = [...grid.querySelectorAll(".card")];
    const state = animate && motion && Flip ? Flip.getState(cards) : null;
    cards.forEach((c) => c.classList.toggle("is-hidden-card", f !== "all" && !c.dataset.cats.split(" ").includes(f)));
    chips.querySelectorAll(".chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.f === f)));
    cards.forEach((c) => c.classList.add("is-in"));
    if (state) {
      Flip.from(state, {
        duration: 0.6, ease: "power3.out", absolute: true, scale: true,
        onEnter: (els) => window.gsap.fromTo(els, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.5 }),
        onLeave: (els) => window.gsap.to(els, { opacity: 0, scale: 0.96, duration: 0.3 }),
        onComplete: () => window.ScrollTrigger?.refresh(),
      });
    }
    const u = new URL(location.href);
    if (f === "all") u.searchParams.delete("f"); else u.searchParams.set("f", f);
    history.replaceState(null, "", u);
  };

  chips.addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (b) apply(b.dataset.f, true);
  });
  const start = new URLSearchParams(location.search).get("f");
  apply(filters.includes(start) ? start : "all", false);
  reveal(grid);
}
