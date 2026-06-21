# blog.allenlim.net

A custom, self-hosted CMS powering [blog.allenlim.net](https://blog.allenlim.net),
built on Astro + Cloudflare (Workers, D1, R2, KV).

It's intentionally split so this **source code can be public** as a portfolio
piece while the **content stays private** — posts live in D1 + R2, never in git,
and each post is independently `public` / `unlisted` / `private` / `draft`.

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for the design, including why D1
holds only metadata so the 10 GB limit never bites.

## Features

- Markdown posts with per-post visibility
- Tags + categories with archive pages
- Admin: first-run setup, login, dashboard, markdown editor, image upload to R2
- RSS (public posts only), SEO/`noindex` handling for non-public posts
- Light/dark theme, server-rendered on Cloudflare Workers

## Develop

```bash
pnpm install
pnpm db:migrate:local      # apply schema to the local D1
pnpm dev                   # http://localhost:4321  (visit /admin/setup first)
```

## Deploy

```bash
pnpm db:migrate:remote     # apply schema to the production D1 (once)
pnpm deploy                # astro build && wrangler deploy
```

Bindings (`DB`, `MEDIA`, `SESSION`, `IMAGES`) are configured in `wrangler.jsonc`.

## Stack

Astro 6 · `@astrojs/cloudflare` · Cloudflare D1 / R2 / KV · `marked` · TypeScript
