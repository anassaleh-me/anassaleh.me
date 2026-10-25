// "Send email" starts a new email straight away. On phones and tablets the mail app opens (mailto:); on computers,
// where a mailto: link often does nothing because no mail app is set up, Gmail's compose window opens in a new tab.
const SUBJECT = "Project enquiry";

export function mountMailButton(link, email) {
  if (!link || !email) return;
  const subject = encodeURIComponent(SUBJECT);
  const touch = matchMedia("(pointer: coarse)").matches;
  if (touch) {
    link.href = `mailto:${email}?subject=${subject}`;
    link.removeAttribute("target");
  } else {
    link.href = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${subject}`;
    link.target = "_blank";
    link.rel = "noopener";
  }
  // let go of focus after the click, so the button and its card don't stay highlighted
  link.addEventListener("click", () => setTimeout(() => link.blur(), 0));
}
