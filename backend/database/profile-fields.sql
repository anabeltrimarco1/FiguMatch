-- Sprint 7.4.2.1
-- Campos editables del perfil de usuario

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS display_name VARCHAR(80),
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS favorite_team VARCHAR(100),
  ADD COLUMN IF NOT EXISTS bio VARCHAR(280),
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS profile_updated_at TIMESTAMPTZ;

UPDATE users
SET
  display_name = COALESCE(NULLIF(TRIM(display_name), ''), TRIM(username)),
  profile_updated_at = COALESCE(profile_updated_at, NOW())
WHERE display_name IS NULL
   OR TRIM(display_name) = '';

CREATE INDEX IF NOT EXISTS idx_users_favorite_team
  ON users (favorite_team);
