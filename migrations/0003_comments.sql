-- Comments. Guests now (Turnstile + rate-limit); schema is member-ready
-- (nullable user_id) so registered users can comment later with no migration.

CREATE TABLE IF NOT EXISTS comments (
	id           TEXT PRIMARY KEY,
	post_id      TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
	user_id      TEXT REFERENCES users(id) ON DELETE SET NULL,   -- set when a logged-in member comments
	author_name  TEXT NOT NULL,
	author_email TEXT,                                           -- optional, private (notify/gravatar)
	body         TEXT NOT NULL,
	-- published | hidden | spam
	status       TEXT NOT NULL DEFAULT 'published',
	ip_hash      TEXT,
	parent_id    TEXT REFERENCES comments(id) ON DELETE CASCADE, -- threading (future)
	created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status, created_at);
