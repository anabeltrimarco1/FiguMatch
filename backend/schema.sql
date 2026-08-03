-- Esquema de base de datos para Figuritas del Mundial
-- Ejecutar contra una base Postgres vacía: psql -U postgres -d figuritas -f schema.sql

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(40) UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Catálogo de figuritas del álbum (editable / seedeable)
CREATE TABLE IF NOT EXISTS stickers (
  id          SERIAL PRIMARY KEY,
  group_name  VARCHAR(5),
  team        VARCHAR(120) NOT NULL,
  code        VARCHAR(30) UNIQUE NOT NULL,
  number      INTEGER NOT NULL,
  category    VARCHAR(40) NOT NULL,
  name        VARCHAR(160) NOT NULL,
  image_path  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Álbum de cada usuario: qué tiene, qué le sobra (repetida) y qué le falta
CREATE TABLE IF NOT EXISTS user_stickers (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sticker_id INTEGER NOT NULL REFERENCES stickers(id) ON DELETE CASCADE,
  status     VARCHAR(10) NOT NULL CHECK (status IN ('tengo', 'repetida', 'me_falta')),
  quantity   INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, sticker_id)
);

-- Mensajes de chat entre dos usuarios (para coordinar intercambios)
CREATE TABLE IF NOT EXISTS messages (
  id          SERIAL PRIMARY KEY,
  sender_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_stickers_status ON user_stickers(status);
CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(sender_id, receiver_id);
