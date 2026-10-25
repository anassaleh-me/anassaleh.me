// Journal entry, served at /journal/<slug>: title, cover, then the same layout rows as projects
// (formatted text, images side by side, captions), a share button and the previous and next entries.
import { getJSON } from "/js/data.js";
import { shell, $, $$, esc, rowsHTML, fitRows } from "/js/shell2.js";

const [{ site, reveal }, all] = await Promise.all([shell({ current: "journal" }), getJSON("/content/blog.json").catch(() => [])]);
const main = $("[data-post]");
const E = "cubic-bezier(.16,1,.3,1)";
const preview = new URLSearchParams(location.search).has("preview");
const q = preview ? "?preview" : "";
const fmtDate = (d) => { const t = new Date(d); return isNaN(t) ? d || "" : t.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); };
const posts = all.filter((p) => preview || (!p.draft && site.journal?.show)).sort((a, b) => String(b.date).localeCompare(String(a.date)));
const slug = location.pathname.match(/^\/journal\/([\w-]+)/)?.[1] || new URLSearchParams(location.search).get("p");
const i = posts.findIndex((p) => p.slug === slug);

if (i < 0) {
  document.title = "Not found, Anas Saleh";
  main.innerHTML = `<header class="ph wrap"><span class="label">Journal</span><h1 class="ph__title up">Not <span class="acc">found</span></h1>
    <div class="ph__foot"><p>This entry doesn't exist or isn't published yet.</p><a class="btn btn--ink" href="/">Back home</a></div></header>`;
  document.documentElement.classList.remove("intro");
} else render(posts[i], posts[i + 1], posts[i - 1]);

function render(p, older, newer) {
  if (site.journal?.show && !p.draft) $("[data-robots]")?.remove();
  document.title = `${p.title}, Anas Saleh`;
  const words = (p.blocks || []).map((r) => (r.text || "").replace(/<[^>]+>/g, " ")).join(" ").split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.round(words / 220));
  const side = (x, dir) => x ? `<a class="pj-nav__item ${dir}" href="/journal/${esc(x.slug)}${q}" data-cursor="${dir === "prev" ? "Newer" : "Older"}">
      <span class="label">${dir === "prev" ? "Newer entry" : "Older entry"}</span>
      <span class="pj-nav__t up">${esc(x.title)}</span>
      <span class="pj-nav__s">${esc(x.tag || "")}${x.tag ? " · " : ""}${esc(fmtDate(x.date))}</span>
      ${x.cover ? `<span class="pj-nav__img" aria-hidden="true"><img src="${esc(x.cover)}" alt="" loading="lazy"></span>` : ""}
    </a>` : `<a class="pj-nav__item ${dir}" href="/journal${q}"><span class="label">Journal</span><span class="pj-nav__t up">All entries</span></a>`;

  main.innerHTML = `
  <article>
    <header class="po-head wrap">
      <a class="pj-back po-back" href="/journal${q}" data-intro><span aria-hidden="true">&larr;</span> Journal</a>
      <p class="jr-meta" data-intro>${p.tag ? `<b>${esc(p.tag)}</b>` : ""}<time datetime="${esc(p.date)}">${esc(fmtDate(p.date))}</time><span>${mins} min read</span></p>
      <h1 class="po-title up">${p.title.split(/\s+/).map((w) => `<span class="ln"><span class="w">${esc(w)}</span></span>`).join(" ")}</h1>
      ${p.excerpt ? `<p class="po-lead" data-intro>${esc(p.excerpt)}</p>` : ""}
    </header>
    ${p.cover ? `<figure class="po-cover wrap" data-cover><img src="${esc(p.cover)}" alt="${esc(p.title)}" fetchpriority="high"></figure>` : ""}
    <div class="po-body wrap">${rowsHTML(p.blocks || [], p.title, { rich: true })}</div>
    <div class="po-share wrap" data-reveal>
      <span class="label">Share</span>
      <button class="chip" type="button" data-share>Copy link</button>
      <a class="chip" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(`${p.title} ${location.origin}/journal/${p.slug}`)}">WhatsApp</a>
    </div>
  </article>
  <nav class="pj-nav dark" data-dark aria-label="More entries">${side(newer, "prev")}${side(older, "next")}</nav>`;

  $("[data-share]").addEventListener("click", async (e) => {
    const b = e.currentTarget;
    try { await navigator.clipboard.writeText(`${location.origin}/journal/${p.slug}`); b.textContent = "Copied"; } catch { b.textContent = "Copy failed"; }
    setTimeout(() => (b.textContent = "Copy link"), 1600);
  });
  $$(".po-title .w").forEach((w, n) => w.animate([{ transform: "translateY(110%) rotate(4deg)" }, { transform: "none" }], { duration: 1200, delay: 200 + n * 90, easing: E, fill: "backwards" }));
  $$("[data-intro]").forEach((el, n) => el.animate([{ opacity: 0, transform: "translateY(16px)", filter: "blur(6px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], { duration: 1000, delay: 350 + n * 120, easing: E, fill: "backwards" }));
  $("[data-cover]")?.animate([{ opacity: 0, transform: "translateY(60px) scale(.96)", filter: "blur(14px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], { duration: 1400, delay: 500, easing: E, fill: "backwards" });
  document.documentElement.classList.remove("intro");
  fitRows(main);
  reveal();

  // previous and next covers follow the pointer, as on project pages
  $$(".pj-nav__item").forEach((a) => {
    const img = a.querySelector(".pj-nav__img");
    if (!img) return;
    a.addEventListener("pointermove", (e) => { const r = a.getBoundingClientRect(); img.style.transform = `translate(${e.clientX - r.left}px, ${e.clientY - r.top}px) translate(-50%, -50%)`; });
  });
}
