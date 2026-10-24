import { esc, icons } from "/js/site.js";

const STAGES = [
  ["development", "Development"],
  ["pre-production", "Pre-production"],
  ["production", "Production"],
  ["post-production", "Post-production"],
  ["release", "Release"],
];

export default async function production({ site }) {
  const f = site.inProduction || {};
  const main = document.querySelector("[data-production]");
  // Hidden until switched on in Pages CMS. Add ?preview to the URL to see it anyway.
  const preview = new URLSearchParams(location.search).has("preview");
  if (!f.show && !preview) {
    main.innerHTML = `<section class="page-head wrap"><h1 class="display">Coming soon</h1><p class="lead">This page isn't open yet.</p><a class="btn" href="/">Back home</a></section>`;
    return;
  }
  if (f.show) document.querySelector("[data-robots]")?.remove();
  const current = Math.max(0, STAGES.findIndex(([k]) => k === f.stage));
  const diary = [...(f.diary || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)));

  main.innerHTML = `
    <section class="hero is-dark" style="height:auto;min-height:88svh;display:flex;align-items:flex-end;padding-block:calc(var(--nav-h) + 40px) 56px">
      ${f.poster ? `<img src="${esc(f.poster)}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.45;z-index:-1">` : '<div class="hero__bg"></div>'}
      <div class="wrap">
        <p class="eyebrow" data-reveal>In production</p>
        <h1 class="display" style="font-size:var(--step-4);max-width:14ch" data-reveal="1">${esc(f.title)}</h1>
        <p class="lead" style="margin-top:20px;color:var(--night-muted)" data-reveal="2">${esc(f.logline)}</p>
      </div>
    </section>
    <section class="section section--tight">
      <div class="wrap">
        <p class="eyebrow" style="margin-bottom:20px" data-reveal>Where it is now</p>
        <ol class="stages" data-reveal="1">${STAGES.map(([, label], i) => `<li class="${i < current ? "is-done" : i === current ? "is-current" : ""}"${i === current ? ' aria-current="step"' : ""}>${label}</li>`).join("")}</ol>
      </div>
    </section>
    <section class="section section--tight">
      <div class="wrap two-col">
        <p class="eyebrow" data-reveal>About the film</p>
        <div class="bio" data-reveal="1"><p>${esc(f.about)}</p></div>
      </div>
    </section>
    <section class="section section--tight">
      <div class="wrap">
        <div class="section-head"><h2 class="display" data-reveal>Production diary</h2></div>
        ${diary.length ? `<ul class="diary">${diary.map((d) => `<li data-reveal>
            <span class="muted">${esc(d.date)}</span>
            <div><h3 class="display" style="font-size:var(--step-1)">${esc(d.title)}</h3><p style="margin-top:10px">${esc(d.text)}</p>${d.image ? `<img src="${esc(d.image)}" alt="" loading="lazy">` : ""}</div>
          </li>`).join("")}</ul>` : '<p class="muted" data-reveal>The first entry is coming soon.</p>'}
      </div>
    </section>
    <section class="section section--tight is-dark cta">
      <div class="wrap">
        <p class="eyebrow">Want to be part of it?</p>
        <h2 class="display">Follow the film.</h2>
        <div class="cta__row"><a class="btn" href="/contact">Get in touch ${icons.arrow}</a></div>
      </div>
    </section>`;
}
