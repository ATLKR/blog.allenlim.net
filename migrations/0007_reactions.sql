-- Lightweight ♥ reactions per entry.
ALTER TABLE posts ADD COLUMN reactions INTEGER NOT NULL DEFAULT 0;
