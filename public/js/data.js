// Content files, loaded fast: each page head starts the download (<link rel="preload">), and a copy is kept for the
// visit (sessionStorage), so moving between pages doesn't wait for the network. A fresh copy is always fetched in the
// background, so changes made in Pages CMS show up on the next page. A kept copy older than ten minutes is not used,
// so a returning visitor never sees content from an earlier visit.
const KEY = "content:";
const FRESH_FOR = 10 * 60 * 1000;

export function getJSON(url) {
  let kept = null;
  try {
    const at = Number(sessionStorage.getItem(KEY + "at:" + url));
    if (Date.now() - at < FRESH_FOR) kept = sessionStorage.getItem(KEY + url);
  } catch {}
  const fresh = fetch(url)
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then((text) => { try { sessionStorage.setItem(KEY + url, text); sessionStorage.setItem(KEY + "at:" + url, String(Date.now())); } catch {} return JSON.parse(text); });
  if (kept) {
    fresh.catch(() => {});
    try { return Promise.resolve(JSON.parse(kept)); } catch {}
  }
  return fresh;
}

// Pages open straight away when the pointer rests on a link: every page sends a Speculation-Rules header
// (public/_headers) pointing at /speculation-rules.json, so the browser fetches the page ahead of the click
// (Chrome and Edge; other browsers skip it). Kept as a no-op so pages that call it need no change.
export function prefetchOnHover() {}
