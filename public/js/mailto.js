// "Send email" opens a small menu instead of a bare mailto: link, because a mailto: link does nothing on computers
// with no mail app set up. The menu offers Gmail and Outlook in the browser, the mail app, and copying the address.
const SUBJECT = "Project enquiry";

export function mountMailMenu(button, email) {
  if (!button || !email) return;
  const subject = encodeURIComponent(SUBJECT);
  const to = encodeURIComponent(email);
  const options = [
    ["Gmail", `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}`],
    ["Outlook", `https://outlook.live.com/mail/0/deeplink/compose?to=${to}&subject=${subject}`],
    ["Mail app", `mailto:${email}?subject=${subject}`],
  ];
  const wrap = document.createElement("span");
  wrap.className = "mail-menu";
  button.replaceWith(wrap);
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = button.className;
  trigger.textContent = button.textContent;
  trigger.setAttribute("aria-haspopup", "true");
  trigger.setAttribute("aria-expanded", "false");
  const list = document.createElement("span");
  list.className = "mail-menu__list";
  list.setAttribute("role", "menu");
  list.innerHTML = options.map(([label, href]) => `<a role="menuitem" href="${href}"${href.startsWith("http") ? ' target="_blank" rel="noopener"' : ""}>${label}</a>`).join("")
    + '<button type="button" role="menuitem" data-copy-mail>Copy address</button>';
  wrap.append(trigger, list);

  const close = () => { wrap.classList.remove("open"); trigger.setAttribute("aria-expanded", "false"); };
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = wrap.classList.toggle("open");
    trigger.setAttribute("aria-expanded", String(open));
    if (open) list.querySelector("a")?.focus({ preventScroll: true });
  });
  list.addEventListener("click", async (e) => {
    const copy = e.target.closest("[data-copy-mail]");
    if (copy) {
      e.stopPropagation();
      try { await navigator.clipboard.writeText(email); copy.textContent = "Copied"; } catch { copy.textContent = email; }
      setTimeout(() => { copy.textContent = "Copy address"; close(); }, 1200);
      return;
    }
    if (e.target.closest("a")) setTimeout(close, 100);
  });
  document.addEventListener("click", (e) => { if (!wrap.contains(e.target)) close(); });
  wrap.addEventListener("keydown", (e) => { if (e.key === "Escape") { close(); trigger.focus(); } });
}
