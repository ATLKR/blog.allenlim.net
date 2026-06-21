-- Custom CMS schema.
-- D1 holds ONLY metadata + pointers. Post bodies and media bytes live in R2,
-- so the D1 10GB ceiling is never the binding constraint.

-- Single-admin (extensible) auth.
CREATE TABLE IF NOT EXISTS users (
	id            TEXT PRIMARY KEY,
	email         TEXT NOT NULL UNIQUE,
	name          TEXT,
	password_hash TEXT NOT NULL,          -- PBKDF2 (see src/lib/auth.ts)
	role          TEXT NOT NULL DEFAULT 'admin',
	created_at    TEXT NOT NULL
);

-- Posts: metadata + R2 pointer. NO body bytes here.
CREATE TABLE IF NOT EXISTS posts (
	id                TEXT PRIMARY KEY,
	slug              TEXT NOT NULL UNIQUE,
	title             TEXT NOT NULL,
	excerpt           TEXT,
	-- draft | private | unlisted | public
	visibility        TEXT NOT NULL DEFAULT 'draft',
	body_key          TEXT,               -- R2 object key for the markdown body
	format            TEXT NOT NULL DEFAULT 'md',
	reading_time      INTEGER NOT NULL DEFAULT 1,
	word_count        INTEGER NOT NULL DEFAULT 0,
	featured_media_id TEXT,
	author_id         TEXT,
	published_at      TEXT,
	created_at        TEXT NOT NULL,
	updated_at        TEXT NOT NULL,
	FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
	FOREIGN KEY (featured_media_id) REFERENCES media(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_posts_visibility_pub ON posts(visibility, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_updated ON posts(updated_at DESC);

-- Taxonomies.
CREATE TABLE IF NOT EXISTS tags (
	slug  TEXT PRIMARY KEY,
	label TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS categories (
	slug   TEXT PRIMARY KEY,
	label  TEXT NOT NULL,
	parent TEXT REFERENCES categories(slug) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS post_tags (
	post_id  TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
	tag_slug TEXT NOT NULL REFERENCES tags(slug) ON DELETE CASCADE,
	PRIMARY KEY (post_id, tag_slug)
);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON post_tags(tag_slug);
CREATE TABLE IF NOT EXISTS post_categories (
	post_id       TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
	category_slug TEXT NOT NULL REFERENCES categories(slug) ON DELETE CASCADE,
	PRIMARY KEY (post_id, category_slug)
);
CREATE INDEX IF NOT EXISTS idx_post_categories_cat ON post_categories(category_slug);

-- Media index. Bytes live in R2 under `key`; this table is just the catalog.
CREATE TABLE IF NOT EXISTS media (
	id         TEXT PRIMARY KEY,
	key        TEXT NOT NULL UNIQUE,      -- R2 object key
	filename   TEXT NOT NULL,
	mime       TEXT NOT NULL,
	size       INTEGER NOT NULL DEFAULT 0,
	alt        TEXT,
	width      INTEGER,
	height     INTEGER,
	created_at TEXT NOT NULL
);

-- Small key/value site settings (title, tagline, etc.).
CREATE TABLE IF NOT EXISTS settings (
	key   TEXT PRIMARY KEY,
	value TEXT
);
