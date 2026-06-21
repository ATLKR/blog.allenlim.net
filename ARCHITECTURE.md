# Architecture

A small, self-built CMS for a personal blog. The design goal is unusual and
deliberate: **the source code is public (this repo is a portfolio piece), while
the content stays private** — posts never enter git history, and each post has
its own visibility.

## The split that makes "public code, private content" work

```
                         ┌──────────────────────────────┐
   git (public repo)     │  Astro app + admin CMS code   │   ← this repo
                         └──────────────────────────────┘
                                      │ deployed to
                                      ▼
                         ┌──────────────────────────────┐
   Cloudflare Workers    │   server-rendered site        │
                         └───────────────┬──────────────┘
                          reads/writes    │
                ┌─────────────────────────┼─────────────────────────┐
                ▼                         ▼                          ▼
        ┌──────────────┐         ┌──────────────┐          ┌──────────────┐
        │   D1 (SQL)   │         │  R2 (objects)│          │  KV (SESSION)│
        │  metadata    │         │  bodies +    │          │  login       │
        │  + pointers  │         │  media bytes │          │  sessions    │
        └──────────────┘         └──────────────┘          └──────────────┘
```

Nothing in the public repo contains a post. The only content-shaped file ever
committed is `seed/` (schema/demo only). `data.db`, `*.db`, `.dev.vars`, and
`uploads/` are git-ignored.

## Why D1 holds *only* metadata (the 10 GB question)

Cloudflare D1 has a 10 GB per-database ceiling. Instead of storing post bodies
and media in D1, **D1 stores just the index** — title, slug, visibility, tags,
dates, and an R2 *pointer* (`body_key`). The actual markdown body lives in R2 at
`posts/<id>.md`, and uploaded media at `media/<id>/<file>`.

- A blog's metadata is tiny (hundreds of bytes/row), so D1 could hold millions
  of posts before the ceiling matters.
- All the bulk — long posts, images, attachments — lands in **R2**, which is
  effectively unbounded and cheaper per GB.
- Result: the 10 GB limit is never the binding constraint.

See `migrations/0001_init.sql` for the schema and `src/lib/content.ts` for the
D1-metadata + R2-body stitching.

## Visibility model

Every post carries one of four states (`src/lib/db.ts`):

| visibility | listed (home/archives/RSS) | direct URL (anon) | direct URL (logged in) |
|------------|:--------------------------:|:-----------------:|:----------------------:|
| `public`   | ✅                          | ✅                 | ✅                      |
| `unlisted` | ❌                          | ✅ (`noindex`)     | ✅                      |
| `private`  | ❌                          | ❌ (404)           | ✅                      |
| `draft`    | ❌                          | ❌ (404)           | ✅                      |

Enforced in `src/lib/content.ts` (`listPosts` filters to `public`;
`isReachable` gates direct access) and in `src/pages/posts/[slug].astro`.

## Auth

Single-admin (extensible). Passwords hashed with PBKDF2-SHA256 via Web Crypto
(`src/lib/auth.ts`); sessions stored in KV with an `HttpOnly; Secure; SameSite=Lax`
cookie. Mutations additionally check same-origin (`src/lib/http.ts`). First run
bootstraps the owner account at `/admin/setup`.

## Layout

```
migrations/            D1 schema
src/lib/               env, db, r2, auth, content, markdown, slug, site, http
src/middleware.ts      session load + /admin guard + binds locals.env
src/pages/             public site (index, posts, tag, category, rss, media)
src/pages/admin/       setup, login, dashboard, editor
src/pages/api/         setup, login, logout, posts (CRUD), media (upload)
src/components/        PostCard, PostEditor
src/layouts/           Base (public), Admin
```

## Runtime notes

- Astro v6 + `@astrojs/cloudflare`. Bindings are read via
  `import { env } from "cloudflare:workers"` (the adapter removed
  `Astro.locals.runtime.env` in v6); middleware exposes it as `Astro.locals.env`.
- Bindings: `DB` (D1), `MEDIA` (R2), `SESSION` (KV), `IMAGES`. See `wrangler.jsonc`.
