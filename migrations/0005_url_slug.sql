-- Shared URL slug across languages: /en/<url_slug> and /ko/<url_slug> point to
-- the same conceptual entry. The internal `slug` stays globally unique (used by
-- the admin and for redirecting old non-prefixed URLs); `url_slug` is shared by
-- translations and is what public routes use.

ALTER TABLE posts ADD COLUMN url_slug TEXT;
UPDATE posts SET url_slug = slug WHERE url_slug IS NULL;
-- The Korean resume shares the English resume's URL slug.
UPDATE posts SET url_slug = 'resume' WHERE slug = 'resume-ko';

CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_urlslug_locale ON posts(url_slug, locale);
CREATE INDEX IF NOT EXISTS idx_posts_urlslug ON posts(url_slug);
