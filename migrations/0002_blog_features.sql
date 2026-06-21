-- Blog features: post/page type, pinning, cover image, full-text search.

ALTER TABLE posts ADD COLUMN type TEXT NOT NULL DEFAULT 'post';   -- 'post' | 'page'
ALTER TABLE posts ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;   -- 0 | 1
ALTER TABLE posts ADD COLUMN cover_url TEXT;                       -- /media/... cover image

CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type);
CREATE INDEX IF NOT EXISTS idx_posts_pinned ON posts(pinned);

-- Full-text search. Trigram tokenizer handles mixed Korean/English substrings.
-- This is a derived search index (title/excerpt/body plaintext); R2 remains the
-- source of truth for bodies. Kept in sync by the content service.
CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
	post_id UNINDEXED,
	title,
	excerpt,
	body,
	tokenize = 'trigram'
);
