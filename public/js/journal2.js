// Journal (blog): notes, stories and things Anas loves. Posts come from /content/blog.json.
// Hidden until "Show the journal" is ticked in Pages CMS; add ?preview to the address to see it (drafts included).
import { shell, $, $$, esc } from "/js/shell2.js";

const [{ site, reveal }, all] = await Promise.all([shell({ current: "journal" }), fetch("/content/blog.json").then((r) => r.json()).catch(() => [])]);
const j = site.journal || {};
const main = $("[data-journal]");
const E = "cubic-bezier(.16,1,.3,1)";
const preview = new URLSearchParams(location.search).has("preview");
const q = preview ? "?preview" : "";
const fmtDate = (d) => { const t = new Date(d); return isNaN(t) ? d || "" : t.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); };
const posts = all.filter((p) => preview || !p.draft).sort((a, b) => String(b.date).localeCompare(String(a.date)));

if (!j.show && !preview) {
  main.innerHTML = `<header class="ph wrap"><span class="label">Journal</span><h1 class="ph__title up"><span class="ln"><span class="w">Coming</span></span> <span class="ln"><span class="w acc">soon</span></span></h1>
    <div class="ph__foot"><p>The journal isn't open yet.</p></div></header>`;
  document.documentElement.classList.remove("intro");
} else render();

function card(p, big = false) {
  return `<a class="jr-card${big ? " jr-card--big" : ""}" href="/journal/${esc(p.slug)}${q}" data-reveal data-cursor="Read">
    <span class="jr-card__img">${p.cover ? `<img src="${esc(p.cover)}" alt="" loading="${big ? "eager" : "lazy"}">` : ""}${p.draft ? '<span class="sc__status">Draft</span>' : ""}</span>
    <span class="jr-card__body">
      <span class="jr-meta">${p.tag ? `<b>${esc(p.tag)}</b>` : ""}<time datetime="${esc(p.date)}">${esc(fmtDate(p.date))}</time></span>
      <span class="jr-card__t up">${esc(p.title)}</span>
      ${p.excerpt ? `<span class="jr-card__x">${esc(p.excerpt)}</span>` : ""}
      ${big ? '<span class="arrow">Read the story</span>' : ""}
    </span>
  </a>`;
}

function render() {
  if (j.show) $("[data-robots]")?.remove();
  const tags = [...new Set(posts.map((p) => p.tag).filter(Boolean))];
  main.innerHTML = `
  <header class="ph wrap">
    <span class="label" data-reveal>Journal</span>
    <h1 class="ph__title up"><span class="ln"><span class="w">The</span></span> <span class="ln"><span class="w acc">journal</span></span></h1>
    <div class="ph__foot"><p data-reveal>${esc(j.intro || "Notes, stories and things I love. Process, drawings, films, ideas and the odd tip.")}</p></div>
  </header>
  <section class="jr wrap" aria-label="Journal entries">
    ${tags.length > 1 ? `<div class="chips jr-tags" role="group" aria-label="Filter entries" data-reveal><button type="button" class="chip" data-tag="" aria-pressed="true">All</button>${tags.map((t) => `<button type="button" class="chip" data-tag="${esc(t)}" aria-pressed="false">${esc(t)}</button>`).join("")}</div>` : ""}
    <div data-list></div>
  </section>`;

  const list = $("[data-list]");
  const draw = (tag) => {
    const shown = posts.filter((p) => !tag || p.tag === tag);
    list.innerHTML = shown.length
      ? `${card(shown[0], true)}${shown.length > 1 ? `<div class="jr-grid">${shown.slice(1).map((p) => card(p)).join("")}</div>` : ""}`
      : `<p class="pr-empty">The first entry is coming soon.</p>`;
    reveal(list);
  };
  draw("");
  $(".jr-tags")?.addEventListener("click", (e) => {
    const b = e.target.closest("[data-tag]");
    if (!b) return;
    $$(".jr-tags .chip").forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
    list.classList.add("swap");
    setTimeout(() => { draw(b.dataset.tag); list.classList.remove("swap"); }, 250);
  });

  $$(".ph__title .w").forEach((w, i) => w.animate([{ transform: "translateY(110%) rotate(3deg)" }, { transform: "none" }], { duration: 1300, delay: 150 + i * 140, easing: E, fill: "backwards" }));
  document.documentElement.classList.remove("intro");
  reveal();
}
