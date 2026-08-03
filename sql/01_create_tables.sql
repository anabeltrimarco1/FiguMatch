CREATE TABLE IF NOT EXISTS stickers (
    id SERIAL PRIMARY KEY,
    grupo VARCHAR(2),
    seleccion VARCHAR(50),
    codigo VARCHAR(10) UNIQUE,
    numero INTEGER,
    tipo VARCHAR(30),
    nombre VARCHAR(100),
    club VARCHAR(100),
    posicion VARCHAR(30),
    imagen VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS user_stickers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    sticker_id INTEGER REFERENCES stickers(id),
    estado VARCHAR(20) CHECK (estado IN ('tengo','repetida','me_falta')),
    cantidad INTEGER DEFAULT 1
);