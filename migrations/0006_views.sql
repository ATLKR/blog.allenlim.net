-- View counter for "popular posts".
ALTER TABLE posts ADD COLUMN views INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_posts_views ON posts(views DESC);
