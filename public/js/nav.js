// Floating glass pill nav. Hides on scroll down, returns on scroll up or when the pointer nears the top.
// Switches to its dark style over elements marked [data-dark].
export function mountPillNav({ links = [], logo = "", name = "Anas Saleh", cta = { href: "/contact", label: "Contact" }, current = "" } = {}) {
  const nav = document.createElement("nav");
  nav.className = "pill-nav";
  nav.setAttribute("aria-label", "Main");
  const roll = (t) => `<span class="pn-clip"><span class="pn-roll" data-t="${t}">${t}</span></span>`;
  nav.innerHTML = `
    <a class="pn-brand" href="/">${logo}<span>${name}</span></a>
    <ul class="pn-links">${links.map((l) => `<li><a href="${l.href}"${l.key === current ? ' aria-current="page"' : ""}>${roll(l.label)}</a></li>`).join("")}</ul>
    <a class="pn-cta" href="${cta.href}"><i></i>${roll(cta.label)}</a>
    <button class="pn-menu" type="button" aria-expanded="false" aria-label="Menu"><span></span></button>
    <div class="pn-panel">${links.map((l) => `<a href="${l.href}">${l.label}</a>`).join("")}<a href="${cta.href}" class="acc">${cta.label}</a></div>`;
  document.body.prepend(nav);
  const menuBtn = nav.querySelector(".pn-menu");
  menuBtn.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  nav.querySelector(".pn-panel").addEventListener("click", () => { nav.classList.remove("is-open"); menuBtn.setAttribute("aria-expanded", "false"); });

  let lastY = scrollY, away = false, nearTop = false, hovering = false;
  const set = () => {
    const show = !away || nearTop || hovering || nav.matches(":focus-within");
    nav.classList.toggle("is-away", !show);
  };
  addEventListener("scroll", () => {
    const y = scrollY;
    if (Math.abs(y - lastY) > 4) away = y > lastY && y > 120;
    lastY = y;
    // dark style over dark sections
    const mid = 40;
    const dark = [...document.querySelectorAll("[data-dark]")].some((el) => {
      const r = el.getBoundingClientRect();
      return r.top <= mid && r.bottom >= mid;
    });
    nav.classList.toggle("is-dark", dark);
    set();
  }, { passive: true });
  addEventListener("pointermove", (e) => { nearTop = e.clientY < 90; set(); }, { passive: true });
  nav.addEventListener("pointerenter", () => { hovering = true; set(); });
  nav.addEventListener("pointerleave", () => { hovering = false; set(); });
  return nav;
}
