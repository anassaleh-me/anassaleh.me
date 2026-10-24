import { getProjects, esc, cardHTML, icons, videoEmbed, reduceMotion } from "/js/site.js";
import { mountDepthPortrait } from "/js/hero.js";

export default async function home({ site, motion }) {
  const h = site.home || {};
  const { gsap } = window;

  /* hero */
  const stage = document.querySelector(".hero__stage");
  document.querySelector("[data-hero-headline]").textContent = h.headline || "";
  document.querySelector("[data-hero-intro]").textContent = h.intro || "";
  const portrait = await mountDepthPortrait(stage, {
    image: h.heroImage || "/images/portrait.webp",
    depth: h.heroDepth,
    alt: `Portrait of ${site.fullName}`,
    reduceMotion,
  });

  const reel = videoEmbed(h.showreelUrl);
  const reelBtn = document.querySelector("[data-reel]");
  if (reel) {
    reelBtn.hidden = false;
    const modal = document.querySelector(".modal");
    const box = modal.querySelector(".modal__box");
    const close = () => { modal.classList.remove("is-open"); box.innerHTML = ""; reelBtn.focus(); };
    reelBtn.addEventListener("click", () => {
      box.innerHTML = `<div class="video"><iframe src="${esc(reel.src)}" title="Showreel" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
      modal.classList.add("is-open");
      modal.querySelector(".modal__close").focus();
    });
    modal.querySelector(".modal__close").addEventListener("click", close);
    modal.addEventListener("click", (e) => e.target === modal && close());
    addEventListener("keydown", (e) => e.key === "Escape" && modal.classList.contains("is-open") && close());
  }

  const name = document.querySelector(".hero__name");
  if (motion && gsap) {
    // Load: portrait comes into focus, the name rises behind it.
    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.from(portrait.el, { opacity: 0, filter: "blur(24px)", scale: 1.08, duration: 1.6 })
      .from(name.querySelectorAll(".w"), { yPercent: 40, opacity: 0, duration: 1.2, stagger: 0.08 }, 0.15)
      .from(".hero__meta > *", { y: 20, opacity: 0, duration: 0.9, stagger: 0.08 }, 0.6)
      .set(portrait.el, { clearProps: "filter" });

    // Scroll: the name drifts up and spreads, the portrait sinks and dims.
    gsap.timeline({ scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } })
      .to(name, { yPercent: -35, letterSpacing: "0.04em", ease: "none" }, 0)
      .to(stage, { yPercent: 12, scale: 0.94, opacity: 0.35, ease: "none" }, 0)
      .to(".hero__meta", { opacity: 0, y: -30, ease: "none" }, 0);

    // The name answers the pointer a little, opposite to the face, to sell the depth.
    if (portrait.pointer) {
      const setX = gsap.quickTo(name, "x", { duration: 0.8, ease: "power3.out" });
      gsap.ticker.add(() => setX(-portrait.pointer.x * 18));
    }
  }

  /* statement */
  document.querySelector("[data-statement]").textContent = h.statement || "";

  /* disciplines */
  const discs = h.disciplines || [];
  const list = document.querySelector(".disc__list");
  const media = document.querySelector(".disc__media");
  list.innerHTML = discs.map((d, i) => `<li class="disc__item${i === 0 ? " is-active" : ""}" data-i="${i}">
      <span class="disc__num">0${i + 1}</span>
      <h3>${esc(d.title)}</h3>
      <p>${esc(d.text)}</p>
      <a class="arrow-link" href="/work?f=${esc(d.filter)}">See ${esc(d.title.toLowerCase())} work ${icons.arrow}</a>
      <div class="disc__item-media"><img src="${esc(d.image)}" alt="" loading="lazy"></div>
    </li>`).join("");
  media.innerHTML = discs.map((d, i) => `<img src="${esc(d.image)}" alt="${esc(d.title)} work" loading="lazy"${i === 0 ? ' class="is-active"' : ""}>`).join("");
  const setActive = (i) => {
    list.querySelectorAll(".disc__item").forEach((el, j) => el.classList.toggle("is-active", i === j));
    media.querySelectorAll("img").forEach((el, j) => el.classList.toggle("is-active", i === j));
  };
  // The chapter crossing the middle of the screen is the active one.
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => en.isIntersecting && setActive(Number(en.target.dataset.i)));
  }, { rootMargin: "-45% 0px -45% 0px" });
  list.querySelectorAll(".disc__item").forEach((el) => io.observe(el));
  list.querySelectorAll(".disc__item").forEach((el, i) => el.addEventListener("pointerenter", () => setActive(i)));

  /* selected work */
  const projects = await getProjects();
  const featured = projects.filter((p) => p.featured).slice(0, 8);
  document.querySelector("[data-featured]").innerHTML = featured.map(cardHTML).join("");

  /* about teaser */
  const a = site.about || {};
  document.querySelector("[data-teaser-img]").innerHTML = `<img src="${esc(a.portrait)}" alt="${esc(site.fullName)}" loading="lazy">`;
  document.querySelector("[data-teaser-text]").textContent = (a.bio || [])[0] || "";

  /* cta */
  const c = site.contact || {};
  const wa = document.querySelector("[data-cta-wa]");
  if (c.whatsapp) wa.href = c.whatsapp; else wa.remove();
  const mail = document.querySelector("[data-cta-mail]");
  mail.href = `mailto:${c.email}`;
}
