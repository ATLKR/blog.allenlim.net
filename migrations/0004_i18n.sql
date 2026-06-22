-- Per-entry localization. Each entry has a locale; translations of the same
-- entry share a translation_group so the language toggle can swap between them.

ALTER TABLE posts ADD COLUMN locale TEXT NOT NULL DEFAULT 'en';
ALTER TABLE posts ADD COLUMN translation_group TEXT;

-- Every existing entry starts as its own group.
UPDATE posts SET translation_group = id WHERE translation_group IS NULL;

CREATE INDEX IF NOT EXISTS idx_posts_locale ON posts(locale);
CREATE INDEX IF NOT EXISTS idx_posts_tgroup ON posts(translation_group);
