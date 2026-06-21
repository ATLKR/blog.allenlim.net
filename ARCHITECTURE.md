# Architecture

A small, self-built CMS for a personal blog. The design goal is unusual and
deliberate: **the source code is public (this repo is a portfolio piece), while
the content stays private** — posts never enter git history, and each post has
its own visibility.

## The split that makes "public code, private content" work

```
                         ┌──────────────────────────────┐
   git (public repo)     │ TanStack Start + admin CMS    │   ← this repo
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

Enforced in `src/lib/content.ts` (`listPosts` filters to live public entries,
`isReachable` gates direct access incl. scheduling) and surfaced through the
`getEntryFn` server function consumed by `src/routes/posts.$slug.tsx`.

## Auth

Single-admin (extensible). Passwords hashed with PBKDF2-SHA256 via Web Crypto
(`src/lib/auth.ts`, 100k iterations — the Workers ceiling); sessions stored in KV
with an `HttpOnly; Secure; SameSite=Lax` cookie. Mutations go through
`createServerFn` server functions that require a valid session. First run
bootstraps the owner account at `/admin/setup`.

## Layout

```
migrations/            D1 schema (0001 core, 0002 blog features + FTS)
src/lib/               env, db, r2, auth, content, markdown, slug, site
src/lib/server.ts      server functions (auth + content) — the data boundary
src/routes/            file-based routes: index, posts(.$slug), tag, category,
                       tags, search, $slug (pages), admin/* 
src/components/        ui (layout/card/pager), PostEditor
src/router.tsx         router setup; routeTree.gen.ts is generated
```

## Runtime notes

- TanStack Start + TanStack Router on Vite, deployed to Cloudflare Workers via
  `@cloudflare/vite-plugin`. SSR by default.
- Bindings are read with `import { env } from "cloudflare:workers"` inside
  server functions (`src/lib/env.ts`). The browser never touches D1/R2/KV — all
  data access is server-side through `src/lib/server.ts`.
- Bindings: `DB` (D1), `MEDIA` (R2), `SESSION` (KV), `IMAGES`. See `wrangler.jsonc`.
- Search uses a derived D1 FTS5 (trigram) index kept in sync on write; R2 stays
  the source of truth for bodies.
