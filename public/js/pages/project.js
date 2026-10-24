import { getProjects, esc, videoHTML, CATEGORY_LABELS, icons, reveal } from "/js/site.js";

export default async function project() {
  const main = document.querySelector("[data-project]");
  const slug = location.pathname.match(/^\/work\/([\w-]+)/)?.[1] || new URLSearchParams(location.search).get("p");
  const projects = await getProjects();
  const i = projects.findIndex((p) => p.slug === slug);
  if (i < 0) {
    main.innerHTML = `<section class="page-head wrap"><h1 class="display">Not found</h1><p class="lead">This project doesn't exist or was moved.</p><a class="btn" href="/work">See all work</a></section>`;
    document.title = "Not found, Anas Saleh";
    return;
  }
  const p = projects[i];
  const next = projects[(i + 1) % projects.length];
  document.title = `${p.title}, Anas Saleh`;
  document.querySelector('meta[name="description"]').setAttribute("content", `${p.title}: ${p.subtitle}. ${p.description}`.slice(0, 160));

  const meta = [
    ["Client", p.client],
    ["Year", p.year],
    ["Role", p.role],
    ["Tools", p.tools || p.format],
  ].filter(([, v]) => v);
  const tall = /9:16/.test(p.format || "");

  main.innerHTML = `
    <header class="p-head wrap">
      <a class="arrow-link muted" href="/work" data-reveal><span style="transform:scaleX(-1);display:inline-flex">${icons.arrow}</span> All work</a>
      <h1 class="display" style="margin-top:28px" data-reveal="1">${esc(p.title)}</h1>
      <p class="p-sub" data-reveal="2">${esc(p.subtitle)}</p>
      <div class="tags" data-reveal="2">${(p.categories || []).map((c) => `<span class="tag">${CATEGORY_LABELS[c] || esc(c)}</span>`).join("")}</div>
      <dl class="p-meta" data-reveal="3">${meta.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
    </header>
    <div class="wrap p-cover" data-reveal>
      ${p.video ? videoHTML(p.video, tall ? "" : p.cover, p.title, tall) : `<img src="${esc(p.cover)}" alt="${esc(p.title)}" fetchpriority="high">`}
    </div>
    <section class="section section--tight">
      <div class="wrap p-desc">
        <p class="eyebrow" data-reveal>About the project</p>
        <div data-reveal="1"><p>${esc(p.description)}</p>${p.format ? `<p class="muted" style="font-size:var(--step-0)">Format: ${esc(p.format)}</p>` : ""}</div>
      </div>
    </section>
    ${(p.images || []).length ? `<section class="wrap p-gallery" aria-label="Project images">
      ${p.images.map((src, n) => `<figure class="is-wide" data-reveal="${n % 2}"><img src="${esc(src)}" alt="${esc(p.title)}, image ${n + 1}" loading="lazy" decoding="async"></figure>`).join("")}
    </section>` : ""}
    <section class="section">
      <div class="wrap">
        <a class="p-next" href="/work/${esc(next.slug)}">
          <span class="eyebrow">Next project</span><br>
          <span class="display">${esc(next.title)}</span>
        </a>
      </div>
    </section>
    <section class="section section--tight is-dark cta">
      <div class="wrap">
        <p class="eyebrow">Like what you see?</p>
        <h2 class="display">Let's work together.</h2>
        <div class="cta__row"><a class="btn" href="/contact">Start a project ${icons.arrow}</a></div>
      </div>
    </section>`;

  // Pair up images that aren't wide, so tall and square shots sit side by side.
  const figs = [...main.querySelectorAll(".p-gallery figure")];
  await Promise.all(figs.map((f) => {
    const img = f.querySelector("img");
    return (img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = r; })).then(() => {
      f.dataset.ratio = img.naturalWidth / (img.naturalHeight || 1);
    });
  }));
  for (let n = 0; n < figs.length; n++) {
    const r = Number(figs[n].dataset.ratio);
    const nr = Number(figs[n + 1]?.dataset.ratio);
    if (r < 1.25 && nr < 1.25) {
      figs[n].classList.remove("is-wide");
      figs[n + 1].classList.remove("is-wide");
      n++;
    }
  }
  reveal(main);
  window.ScrollTrigger?.refresh();
}
