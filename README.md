# anassaleh.me

Personal site of Anas Al Shikh Saleh.

- `public/` holds everything that goes live: HTML pages, `css/site.css`, `js/` (shared `site.js`, the 3D portrait in `hero.js`, one module per page in `js/pages/`), images and the content files in `public/content/`.
- `src/worker.js` serves pretty project URLs (`/work/<slug>`) and receives the contact form (`/api/contact`), storing each request in the `SUBMISSIONS` KV store.
- Content is edited with Pages CMS (`.pages.yml`). The colour palette (paper, stone, sand) is a setting there too; add `?palette=stone` to any URL to preview one.
- Hosted on Cloudflare (Worker `anassaleh`). Every push to `main` deploys automatically through Workers Builds.
- Local preview: `npx wrangler dev`
