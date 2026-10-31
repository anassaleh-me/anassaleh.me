// Services page: each service with its packages and a few examples, how a project runs, questions, and a way to ask
// for a quote. Content comes from site.json (servicesPage, from content/services.json); examples are the newest
// projects in the categories a service names, or the images set on it.
import { shell, $, $$, esc, accent, pad, slug, cover, srcset, inCategory } from "/js/shell2.js";

const { site, projects, lenis, reveal } = await shell({ current: "services" });
const s = site.servicesPage || {};
const items = s.items || [];
const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const words = (t) => accent(t).replace(/<span class="acc">(.*?)<\/span>|(\S+)/g, (m, a, w) => (a ? a.split(" ").map((x) => `<span class="ln"><span class="w acc">${x}</span></span>`).join(" ") : `<span class="ln"><span class="w">${w}</span></span>`));

// the title is already in the page (so it rises at once); it only changes if the CMS headline is different
const title = $("[data-sv-title]");
if (s.headline && title.textContent.replace(/\s+/g, " ").trim().toLowerCase() !== s.headline.replace(/[[\]]/g, "").toLowerCase()) title.innerHTML = words(s.headline);
$("[data-sv-intro]").textContent = s.intro || "";
$("[data-sv-jump]").innerHTML = items.map((x) => `<a class="chip" href="#${slug(x.name)}">${esc(x.name)}</a>`).join("");

const examples = (x) => {
  if ((x.images || []).length) return x.images.slice(0, 3).map((src) => `<span class="sv-ex sv-ex--art"><img src="${esc(src)}"${srcset(src, "(max-width: 760px) 33vw, 20vw")} alt="Pencil drawing by ${esc(site.fullName)}" loading="lazy"></span>`).join("");
  const keys = String(x.examples || "").split(",").map((c) => slug(c)).filter(Boolean);
  const list = projects.filter((p) => keys.some((k) => inCategory(p, k)));
  return list.sort((a, b) => (b.featured === true) - (a.featured === true)).slice(0, 3)
    .map((p) => `<a class="sv-ex" href="/work/${p.slug}" data-cursor="View"><img src="${esc(cover(p))}"${srcset(cover(p), "(max-width: 760px) 33vw, 20vw")} alt="${esc(p.title)}, cover" loading="lazy"><span class="sv-ex__t">${esc(p.title)}</span></a>`).join("");
};

$("[data-sv]").innerHTML = items.map((x, i) => {
  const ex = examples(x);
  const ask = `/contact?service=${encodeURIComponent(x.formService || x.name)}`;
  return `<article class="sv-item" id="${slug(x.name)}" aria-labelledby="sv-${i}">
    <div class="sv-item__side">
      <span class="sv-item__n" data-reveal>${pad(i + 1)}</span>
      <h2 class="sv-item__name up" id="sv-${i}" data-reveal>${esc(x.name)}</h2>
      <p class="sv-item__line" data-reveal>${esc(x.line || "")}</p>
      ${x.note ? `<p class="sv-item__note" data-reveal>${esc(x.note)}</p>` : ""}
      <a class="btn btn--ink" href="${ask}" data-reveal>Ask for a quote ${ARROW}</a>
    </div>
    <div class="sv-item__main">
      <ul class="sv-packs">${(x.packages || []).map((k) => `<li class="sv-pack" data-reveal>
        <h3 class="sv-pack__name up">${esc(k.name)}</h3>
        ${k.text ? `<p class="sv-pack__text">${esc(k.text)}</p>` : ""}
        ${(k.includes || []).length ? `<ul class="sv-pack__list">${k.includes.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
      </li>`).join("")}</ul>
      ${ex ? `<div class="sv-exs" data-reveal><span class="label">Examples</span><div class="sv-exs__row">${ex}</div></div>` : ""}
    </div>
  </article>`;
}).join("");

// jump chips glide to their service
$$("[data-sv-jump] a").forEach((a) => a.addEventListener("click", (e) => {
  const to = $(a.getAttribute("href"));
  if (!to || !lenis) return;
  e.preventDefault();
  lenis.scrollTo(to, { offset: -90 });
}));

const p = s.process || {};
$("[data-process-title]").innerHTML = accent(p.title || "How we [work]");
$("[data-process-intro]").textContent = p.intro || "";
$("[data-steps]").innerHTML = (p.steps || []).map((st, i) => `<li class="sv-step" data-reveal>
  <span class="sv-step__n">${pad(i + 1)}</span>
  <h3 class="sv-step__t up">${esc(st.title)}</h3>
  <p>${esc(st.text)}</p>
</li>`).join("");
if (!(p.steps || []).length) $(".sv-process").remove();

const f = s.faq || {};
$("[data-faq-title]").innerHTML = accent(f.title || "Questions");
$("[data-faq]").innerHTML = (f.items || []).map((q) => `<details class="sv-q" data-reveal>
  <summary><span>${esc(q.q)}</span><i aria-hidden="true"></i></summary>
  <p>${esc(q.a)}</p>
</details>`).join("");
if (!(f.items || []).length) $(".sv-faq").remove();

$("[data-sv-cta]").textContent = s.cta || "";
reveal();
// the page grew after the content came in, so smooth scroll measures it again
lenis?.resize();
