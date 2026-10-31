// Cloudflare Worker in front of the static site.
// - /work/<slug>   serves project.html with that project's title, description and cover in the page head,
//                  so shared links show the right preview (404 for unknown or draft projects)
// - /journal/<slug> serves journal-post.html with that entry's head (404 for unknown entries)
// - /content/site.json  built from the per-page files Anas edits in Pages CMS (settings, home, work, about, contact,
//                  progress, film, journal), in the shape the pages read
// - hidden pages   a page switched off in Pages CMS answers with the 404 page (add ?preview to see it anyway)
// - /sitemap.xml   built from the content, so new pages are listed and hidden ones left out without touching code
// - /img/<width>/images/...  a smaller copy of an uploaded image for smaller screens (Cloudflare Images binding),
//                  kept in the edge cache; if resizing is unavailable the original is served, so an image never breaks
// - /llms.txt     a plain text summary of who Anas is, his services and work, for AI assistants (built from the content)
// - readable pages  home, Work, Services, About and project pages also carry their real text and links inside
//                  <noscript>, for search and AI crawlers that don't run JavaScript, plus structured data about Anas
// - /api/contact   receives the contact form, stores it (KV), adds it to the Notion database "Project requests"
//                  (NOTION_TOKEN secret + NOTION_DB) and emails it (send_email binding)
// Everything else falls through to the static assets in ./public.
import { EmailMessage } from "cloudflare:email";

const SITE = "https://anassaleh.me";
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const attr = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

async function content(env, url, name) {
  const res = await env.ASSETS.fetch(new Request(new URL(`/content/${name}.json`, url)));
  return res.ok ? res.json() : null;
}

// The combined content the pages read. Every page file has a "show" switch; a missing switch means shown.
async function buildSite(env, url) {
  const names = ["settings", "home", "work", "about", "contact", "progress", "film", "journal", "services"];
  const [settings, home, work, about, contact, progress, film, journal, services, projectList] = (await Promise.all([...names.map((n) => content(env, url, n)), projects(env, url)])).map((x) => x || {});
  const on = (x) => x?.show !== false;
  const items = progress.items || [];
  return {
    name: settings.name, fullName: settings.fullName, location: settings.location, contact: settings.contact || {},
    home: {
      headline: home.headline, intro: home.intro, statement: home.statement, statementSub: home.statementSub,
      heroImage: home.heroImage, heroDepth: home.heroDepth, heroGlow: home.heroGlow,
      worksLabel: home.works?.label, disciplines: home.disciplines?.items || [],
    },
    homeSections: {
      disciplines: on(home.disciplines), works: on(home.works), spider: on(home.spider),
      inProgress: on(home.inProgress), drawings: on(home.drawings), contact: on(home.contact),
    },
    spider: home.spider || {}, drawings: home.drawings || {},
    about: { ...about, cv: settings.cv }, services: contact.services || [],
    contactPage: { headline: contact.headline, intro: contact.intro, replyNote: contact.replyNote, budgets: contact.budgets || [], sources: contact.sources || [] },
    servicesPage: services,
    studio: items, inProduction: film, journal, workIntro: work.intro, workCategories: workCategories(work, Array.isArray(projectList) ? projectList : []),
    pages: { work: on(work), services: on(services) && (services.items || []).length > 0, about: on(about), contact: on(contact), progress: on(progress) && items.length > 0, film: film.show === true, journal: journal.show === true },
  };
}

// "Art direction" -> "art-direction": the key used in Work page addresses (?f=) and to match names
const slug = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// The Work page categories: the ones listed under Work page > Categories (in that order, with their line and banner),
// then any other name typed on a project. A category only becomes a filter when a project uses it.
function workCategories(work, projectList) {
  const listed = (work.categories || []).filter((c) => c.name).map((c) => ({ key: slug(c.name), label: c.name, description: c.description || "", banner: c.banner || "", show: c.show !== false }));
  const seen = new Set(listed.map((c) => c.key));
  const extra = [];
  for (const p of projectList) for (const n of p.categories || []) { const k = slug(n); if (k && !seen.has(k)) { seen.add(k); extra.push({ key: k, label: String(n).trim(), description: "", banner: "", show: true }); } }
  const all = work.all || {};
  return [{ key: "all", label: all.label || "All work", description: all.description || "", banner: all.banner || "" }, ...listed, ...extra].filter((c) => c.show !== false);
}

// which switch hides which address
const PAGE_OF = { "/work": "work", "/services": "services", "/about": "about", "/contact": "contact", "/in-progress": "progress", "/film": "film", "/journal": "journal" };

async function notFound(env, url) {
  const res = await env.ASSETS.fetch(new Request(new URL("/404", url)));
  return new Response(res.body, { status: 404, headers: res.headers });
}

async function projects(env, url) {
  const res = await env.ASSETS.fetch(new Request(new URL("/content/projects.json", url)));
  return res.ok ? (await res.json()).filter((p) => !p.draft) : [];
}

// ---------- readable without JavaScript ----------
const h = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const plain = (s) => String(s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const ul = (items) => (items.length ? `<ul>${items.join("")}</ul>` : "");
const projectItem = (p) => `<li><a href="/work/${p.slug}">${h(p.title)}</a>${p.subtitle ? `, ${h(p.subtitle)}` : ""}</li>`;

// structured data about Anas (schema.org Person), so search engines and assistants connect the name to this site
function personLD(site, page) {
  const c = site.contact || {};
  const person = {
    "@type": "Person", "@id": `${SITE}/#person`, name: site.fullName || "Anas Al Shikh Saleh",
    alternateName: [site.name || "Anas Saleh", "Anas Al Sheikh Saleh", "أنس صالح", "أنس الشيخ صالح"],
    url: `${SITE}/`, image: `${SITE}/images/og-v2.jpg`, jobTitle: "Visual artist and art director",
    description: "Visual artist and art director in Dubai. Art direction, design, 3D, motion, film and drawing.",
    address: { "@type": "PostalAddress", addressLocality: "Dubai", addressCountry: "AE" },
    email: c.email ? `mailto:${c.email}` : undefined,
    knowsAbout: ["Art direction", "Brand identity", "Graphic design", "3D design", "Blender", "Animation", "Motion graphics", "Video production", "Portrait drawing"],
    sameAs: [c.linkedin, c.behance, c.instagram].filter(Boolean),
  };
  const graph = [person, { "@type": "WebSite", "@id": `${SITE}/#website`, url: `${SITE}/`, name: site.name || "Anas Saleh", publisher: { "@id": `${SITE}/#person` } }];
  if (page === "/about") graph.push({ "@type": "ProfilePage", url: `${SITE}/about`, mainEntity: { "@id": `${SITE}/#person` } });
  return `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c")}</script>`;
}

// the page's real content as plain HTML, shown only where JavaScript doesn't run
async function readable(env, url, path, project) {
  const [site, list] = await Promise.all([buildSite(env, url), projects(env, url)]);
  const a = site.about || {}, sv = site.servicesPage || {};
  let body = "";
  if (path === "/") {
    body = `<h2>${h(site.home?.headline)}</h2><p>${h(site.home?.intro)}</p>${(a.bio || []).slice(0, 1).map((t) => `<p>${h(t)}</p>`).join("")}
      <h2>Services</h2>${ul((sv.items || []).map((x) => `<li><a href="/services">${h(x.name)}</a>: ${h(x.line)}</li>`))}
      <h2>Selected work</h2>${ul(list.filter((p) => p.featured).map(projectItem))}<p><a href="/work">All work</a> · <a href="/about">About</a> · <a href="/contact">Contact</a></p>`;
  } else if (path === "/work") {
    body = `<p>${h(site.workIntro)}</p>${ul(list.map(projectItem))}`;
  } else if (path === "/about") {
    body = `${(a.bio || []).map((t) => `<p>${h(t)}</p>`).join("")}
      <h2>Experience</h2>${ul((a.experience || []).map((x) => `<li>${h(x.role)}, ${h(x.company)} (${h(x.period)})${x.note ? `. ${h(x.note)}` : ""}</li>`))}
      <h2>Tools</h2><p>${h([...(a.tools || []), ...(a.workflowTools || [])].join(", "))}</p>${a.cv ? `<p><a href="${h(a.cv)}">Download CV</a></p>` : ""}`;
  } else if (path === "/services") {
    const pk = sv.packages || {}, pr = sv.process || {}, fq = sv.faq || {};
    body = `<p>${h(sv.intro)}</p>${(sv.items || []).map((x) => `<h2>${h(x.name)}</h2><p>${h(x.line)}</p>${ul((x.services || []).map((k) => `<li>${h(k.name)}: ${h(k.text)}</li>`))}`).join("")}
      <h2>Packages</h2><p>${h(pk.intro)}</p>${(pk.groups || []).map((g) => `<h3>${h(g.name)}</h3>${ul((g.cards || []).map((c) => `<li>${h(c.name)}: ${h(c.text)} Includes: ${h((c.includes || []).join("; "))}.</li>`))}`).join("")}
      <h2>How we work</h2><ol>${(pr.steps || []).map((s) => `<li>${h(s.title)}: ${h(s.text)}</li>`).join("")}</ol>
      <h2>Questions</h2>${(fq.items || []).map((q) => `<h3>${h(q.q)}</h3><p>${h(q.a)}</p>`).join("")}<p><a href="/contact">Ask for a quote</a></p>`;
  } else if (project) {
    const p = project;
    const meta = [["Client", p.client], ["Year", p.year], ["Role", p.role], ["Tools", p.tools], ["Format", p.format]].filter(([, v]) => v);
    body = `<h1>${h(p.title)}</h1><p>${h(p.subtitle)}</p><p>${h(p.description)}</p>${ul(meta.map(([k, v]) => `<li>${k}: ${h(v)}</li>`))}
      ${(p.blocks || []).filter((r) => r.text).map((r) => `<p>${h(plain(r.text))}</p>`).join("")}<p><a href="/work">All work</a></p>`;
  }
  return { html: body ? `<noscript><div class="wrap ssr">${body}</div></noscript>` : "", site };
}

// /llms.txt: a short, plain summary for AI assistants
async function llms(env, url) {
  const [site, list] = await Promise.all([buildSite(env, url), projects(env, url)]);
  const a = site.about || {}, sv = site.servicesPage || {}, c = site.contact || {};
  const lines = [
    `# ${site.fullName} (${site.name})`, "",
    `> Visual artist and art director based in ${site.location || "Dubai, UAE"}. Art direction, brand identity and graphic design, 3D design in Blender, animation, video production and portrait drawing.`, "",
    ...(a.bio || []), "",
    "## Experience", ...(a.experience || []).map((x) => `- ${x.role}, ${x.company} (${x.period})`), "",
    "## Services", ...(sv.items || []).map((x) => `- ${x.name}: ${x.line} (${(x.services || []).map((k) => k.name).join(", ")})`),
    `- Packages and process: ${SITE}/services`, "",
    "## Work", ...list.map((p) => `- [${p.title}](${SITE}/work/${p.slug}): ${p.subtitle || ""}${p.client ? `, ${p.client}` : ""}${p.year ? `, ${p.year}` : ""}`), "",
    "## Links", `- Website: ${SITE}`, `- About: ${SITE}/about`, `- Contact: ${SITE}/contact (${c.email || ""})`,
    ...[["LinkedIn", c.linkedin], ["Behance", c.behance], ["Instagram", c.instagram]].filter(([, u]) => u).map(([n, u]) => `- ${n}: ${u}`), "",
  ];
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}

// The widths the pages ask for (js/shell2.js srcset); anything else is refused so the copies stay few.
const WIDTHS = [360, 720, 1080, 1440];

async function resized(request, env, ctx, url) {
  const m = url.pathname.match(/^\/img\/(\d+)(\/images\/.+\.(?:webp|jpe?g|png))$/i);
  if (!m || !WIDTHS.includes(Number(m[1]))) return notFound(env, url);
  const original = () => env.ASSETS.fetch(new Request(new URL(m[2], url)));
  const cache = caches.default;
  const hit = await cache.match(request);
  if (hit) return hit;
  const src = await original();
  if (!src.ok || !env.IMAGES) return src;
  try {
    const out = await env.IMAGES.input(src.body).transform({ width: Number(m[1]), fit: "scale-down" }).output({ format: "image/webp", quality: 84 });
    const res = new Response(out.image(), { headers: { "content-type": "image/webp", "cache-control": "public, max-age=604800" } });
    ctx.waitUntil(cache.put(request, res.clone()));
    return res;
  } catch (err) {
    console.error("resize failed", url.pathname, err);
    return original();
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/img/")) return resized(request, env, ctx, url);

    if (url.pathname === "/api/contact") {
      if (request.method !== "POST") return json({ ok: false, error: "method" }, 405);
      return handleContact(request, env, ctx);
    }

    if (url.pathname === "/content/site.json") {
      return new Response(JSON.stringify(await buildSite(env, url)), {
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=0, must-revalidate" },
      });
    }

    const preview = url.searchParams.has("preview");
    const pageKey = PAGE_OF[url.pathname.replace(/\/$/, "")] || (url.pathname.startsWith("/journal/") ? "journal" : null);
    if (pageKey && !preview) {
      const site = await buildSite(env, url);
      if (!site.pages[pageKey]) return notFound(env, url);
    }

    if (url.pathname === "/llms.txt") return llms(env, url);

    // home, Work, Services and About: the static page plus its readable copy and structured data
    const path = url.pathname.replace(/\/$/, "") || "/";
    if (["/", "/work", "/services", "/about"].includes(path) && request.method === "GET") {
      const [res, { html, site }] = await Promise.all([env.ASSETS.fetch(request), readable(env, url, path)]);
      if (!res.ok || !(res.headers.get("content-type") || "").includes("text/html")) return res;
      const rw = new HTMLRewriter().on("main", { element: (el) => el.append(html, { html: true }) });
      if (path === "/" || path === "/about") rw.on("head", { element: (el) => el.append(personLD(site, path), { html: true }) });
      return rw.transform(res);
    }

    if (url.pathname === "/sitemap.xml") {
      const [list, site, blog] = await Promise.all([projects(env, url), buildSite(env, url), content(env, url, "blog")]);
      const journal = site.pages.journal ? ["/journal", ...(blog || []).filter((p) => !p.draft).map((p) => `/journal/${p.slug}`)] : [];
      const pages = ["/", ...["work", "services", "about", "progress", "contact"].filter((k) => site.pages[k]).map((k) => (k === "progress" ? "/in-progress" : `/${k}`)), "/privacy", ...(site.pages.film ? ["/film"] : []), ...journal, ...list.map((p) => `/work/${p.slug}`)];
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>${SITE}${p}</loc></url>`).join("\n")}\n</urlset>\n`;
      return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
    }

    const m = url.pathname.match(/^\/work\/([a-z0-9-]+)\/?$/);
    if (m) {
      const [res, list] = await Promise.all([env.ASSETS.fetch(new Request(new URL("/project", url), request)), projects(env, url)]);
      const p = list.find((x) => x.slug === m[1]);
      const out = new Response(res.body, { status: p ? res.status : 404, headers: res.headers });
      if (!p) return out;
      const title = `${p.title}, Anas Saleh`;
      const desc = `${p.subtitle}. ${p.description || ""}`.slice(0, 160);
      // share previews: a JPG copy where there is one (some apps don't show WebP), else the CMS cover
      const c = p.cover || `/images/covers/${p.slug}.webp`;
      const image = SITE + (c.startsWith("/images/covers/") ? c.replace("/images/covers/", "/images/covers/og/").replace(/\.webp$/, ".jpg") : c);
      const set = (content) => ({ element: (el) => el.setAttribute("content", content) });
      const { html } = await readable(env, url, null, p);
      return new HTMLRewriter()
        .on("main", { element: (el) => el.append(html, { html: true }) })
        .on("title", { element: (el) => el.setInnerContent(title) })
        .on('meta[name="description"]', set(desc))
        .on('meta[property="og:image"]', set(image))
        .on("head", { element: (el) => el.append(`<link rel="preload" as="image" href="${attr(c)}" fetchpriority="high"><meta property="og:title" content="${attr(title)}"><meta property="og:description" content="${attr(desc)}"><meta property="og:type" content="article"><meta property="og:url" content="${SITE}/work/${p.slug}"><meta name="twitter:card" content="summary_large_image"><link rel="canonical" href="${SITE}/work/${p.slug}">`, { html: true }) })
        .transform(out);
    }

    const j = url.pathname.match(/^\/journal\/([a-z0-9-]+)\/?$/);
    if (j) {
      const [res, blog] = await Promise.all([env.ASSETS.fetch(new Request(new URL("/journal-post", url), request)), content(env, url, "blog")]);
      const p = (blog || []).find((x) => x.slug === j[1]);
      const out = new Response(res.body, { status: p ? res.status : 404, headers: res.headers });
      if (!p) return out;
      const title = `${p.title}, Anas Saleh`;
      const desc = (p.excerpt || "").slice(0, 160);
      const set = (value) => ({ element: (el) => el.setAttribute("content", value) });
      return new HTMLRewriter()
        .on("title", { element: (el) => el.setInnerContent(title) })
        .on('meta[name="description"]', set(desc || "A journal entry by Anas Al Shikh Saleh."))
        .on('meta[property="og:image"]', set(p.cover ? SITE + p.cover : `${SITE}/images/og-v2.jpg`))
        .on("head", { element: (el) => el.append(`${p.cover ? `<link rel="preload" as="image" href="${attr(p.cover)}" fetchpriority="high">` : ""}<meta property="og:title" content="${attr(title)}"><meta property="og:description" content="${attr(desc)}"><meta property="og:type" content="article"><meta property="og:url" content="${SITE}/journal/${p.slug}"><meta name="twitter:card" content="summary_large_image">`, { html: true }) })
        .transform(out);
    }

    return env.ASSETS.fetch(request);
  },
};

const clean = (v, max = 500) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max);

async function handleContact(request, env, ctx) {
  // only the site's own pages may send the form (browsers always say where a request comes from)
  const origin = request.headers.get("origin");
  if (!origin || !/^https:\/\/(www\.)?anassaleh\.me$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$|-anassaleh\.anassors-200\.workers\.dev$/.test(origin)) {
    return json({ ok: false, error: "origin" }, 403);
  }
  if (Number(request.headers.get("content-length") || 0) > 20000) return json({ ok: false, error: "too_large" }, 413);
  // a few requests a minute per visitor at most, so nobody can flood the inbox, Notion or the store
  if (env.FORM_LIMIT) {
    const { success } = await env.FORM_LIMIT.limit({ key: request.headers.get("cf-connecting-ip") || "unknown" });
    if (!success) return json({ ok: false, error: "busy" }, 429);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid" }, 400);
  }
  // Honeypot: bots fill the hidden field. Pretend it worked.
  if (clean(body.website)) return json({ ok: true });

  const entry = {
    name: clean(body.name, 120),
    company: clean(body.company, 120),
    email: clean(body.email, 200),
    phone: clean(body.phone, 40),
    services: (Array.isArray(body.services) ? body.services : []).map((s) => clean(s, 60)).filter(Boolean).slice(0, 10),
    brief: clean(body.brief, 5000),
    budget: clean(body.budget, 80),
    date: clean(body.date, 20),
    source: clean(body.source, 80),
    links: clean(body.links, 500),
    consent: body.consent === true,
    page: clean(body.page, 300),
    receivedAt: new Date().toISOString(),
    country: request.cf?.country || "",
  };
  const missing = [];
  if (!entry.name) missing.push("name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.email)) missing.push("email");
  if (entry.phone.replace(/\D/g, "").length < 7) missing.push("phone");
  if (!entry.services.length) missing.push("services");
  if (entry.brief.length < 20) missing.push("brief");
  if (!entry.consent) missing.push("consent");
  if (missing.length) return json({ ok: false, error: "missing", fields: missing }, 422);

  let stored = false;
  let mailed = false;
  if (env.SUBMISSIONS) {
    const key = `${entry.receivedAt}_${crypto.randomUUID().slice(0, 8)}`;
    await env.SUBMISSIONS.put(key, JSON.stringify(entry), { metadata: { name: entry.name, email: entry.email, services: entry.services.join(", ") } });
    stored = true;
  }
  if (env.NOTION_TOKEN && env.NOTION_DB) {
    try {
      await addToNotion(env, entry);
      stored = true;
    } catch (err) {
      console.error("notion failed", err);
    }
  }
  if (env.MAILER && env.MAIL_FROM && env.MAIL_TO) {
    try {
      await sendMail(env, entry);
      mailed = true;
    } catch (err) {
      console.error("mail failed", err);
    }
  }
  if (!stored && !mailed) return json({ ok: false, error: "unavailable" }, 503);
  return json({ ok: true });
}

// One row in Notion's "Project requests" database (Work > Website), with the brief also written into the page.
async function addToNotion(env, e) {
  const text = (s) => {
    const parts = [];
    for (let i = 0; i < String(s).length; i += 1900) parts.push({ text: { content: String(s).slice(i, i + 1900) } });
    return parts.slice(0, 50);
  };
  const option = (s) => s.replace(/,/g, " ").slice(0, 100);
  const props = {
    Name: { title: text(e.name || "No name") },
    Status: { status: { name: "New" } },
    Services: { multi_select: e.services.map((s) => ({ name: option(s) })) },
    Company: { rich_text: text(e.company) },
    Email: { email: e.email || null },
    Phone: { phone_number: e.phone || null },
    Budget: { rich_text: text(e.budget) },
    Brief: { rich_text: text(e.brief) },
    Links: { rich_text: text(e.links) },
    Country: { rich_text: text(e.country) },
    Received: { date: { start: e.receivedAt } },
  };
  if (/^\d{4}-\d{2}-\d{2}$/.test(e.date)) props.Deadline = { date: { start: e.date } };
  if (e.source) props["Found me via"] = { select: { name: option(e.source) } };
  if (/^https?:\/\//.test(e.page)) props["From page"] = { url: e.page };
  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: { authorization: `Bearer ${env.NOTION_TOKEN}`, "notion-version": "2022-06-28", "content-type": "application/json" },
    body: JSON.stringify({
      parent: { database_id: env.NOTION_DB },
      properties: props,
      children: [
        { object: "block", type: "heading_3", heading_3: { rich_text: text("Brief") } },
        ...e.brief.split(/\n{2,}/).filter(Boolean).slice(0, 40).map((p) => ({ object: "block", type: "paragraph", paragraph: { rich_text: text(p) } })),
      ],
    }),
  });
  if (!res.ok) throw new Error(`notion ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

function encodeHeader(s) {
  return /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode(s)))}?=`;
}

async function sendMail(env, e) {
  const lines = [
    "New project request from anassaleh.me",
    "",
    `Name: ${e.name}`,
    e.company ? `Company: ${e.company}` : null,
    `Email: ${e.email}`,
    `Phone / WhatsApp: ${e.phone}`,
    `Services: ${e.services.join(", ")}`,
    e.budget ? `Budget: ${e.budget}` : null,
    e.date ? `Deadline / date: ${e.date}` : null,
    e.source ? `Found me via: ${e.source}` : null,
    e.links ? `Links: ${e.links}` : null,
    "",
    "Brief:",
    e.brief,
    "",
    `Received: ${e.receivedAt}${e.country ? ` (${e.country})` : ""}`,
    `Reply to this email to answer ${e.name} directly.`,
  ];
  const text = lines.filter((l) => l !== null).join("\r\n");
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(text))).replace(/.{76}/g, "$&\r\n");
  const raw = [
    `From: anassaleh.me <${env.MAIL_FROM}>`,
    `To: ${env.MAIL_TO}`,
    `Reply-To: ${encodeHeader(e.name.replace(/[<>"\r\n]/g, ""))} <${e.email.replace(/[<>\r\n\s]/g, "")}>`,
    `Subject: ${encodeHeader(`New request: ${e.services.join(", ")} from ${e.name}`.replace(/[\r\n]/g, " "))}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@anassaleh.me>`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=utf-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    b64,
  ].join("\r\n");
  await env.MAILER.send(new EmailMessage(env.MAIL_FROM, env.MAIL_TO, raw));
}
