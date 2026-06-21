# blog.allenlim.net

A custom, self-hosted CMS powering [blog.allenlim.net](https://blog.allenlim.net),
built on **TanStack Start + TanStack Router** and Cloudflare (Workers, D1, R2, KV).

It's intentionally split so this **source code can be public** as a portfolio
piece while the **content stays private** — posts live in D1 + R2, never in git,
and each post is independently `public` / `unlisted` / `private` / `draft`.

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for the design, including why D1
holds only metadata so the 10 GB limit never bites.

## Features

- Markdown posts + standalone pages (e.g. `/resume`), with per-post visibility
- Tags & categories with archive pages and a topics index
- Full-text search (D1 FTS5, trigram — works for Korean + English)
- Pinned posts, cover images, scheduled publishing (future publish date)
- Reading time, table of contents, prev/next, related posts
- Admin: first-run setup, login, dashboard, markdown editor
- Light/dark theme, server-rendered on Cloudflare Workers

## Stack

TanStack Start · TanStack Router · React 19 · Vite · Cloudflare D1 / R2 / KV ·
`marked` · TypeScript. Bindings are read via `import { env } from "cloudflare:workers"`
inside server functions (`src/lib/server.ts`).

## Develop

```bash
pnpm install
pnpm db:migrate:local      # apply schema to the local D1
pnpm dev                   # http://localhost:3000  (visit /admin/setup first)
```

## Deploy

```bash
pnpm db:migrate:remote     # apply new migrations to the production D1
pnpm deploy                # vite build && wrangler deploy
```

Bindings (`DB`, `MEDIA`, `SESSION`, `IMAGES`) are configured in `wrangler.jsonc`.

## Roadmap

Server routes for RSS / sitemap.xml / robots.txt, R2 media serving + in-editor
image upload, per-page `<title>`/OG tags, and client-side code highlighting.
