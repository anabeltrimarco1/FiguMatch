# Figuritas del Mundial

App para intercambiar figuritas del álbum del Mundial: cada usuario carga qué tiene,
qué le sobra (repetidas) y qué le falta, la app le sugiere con quién puede intercambiar,
y permite coordinar por chat.

- **Backend**: Node.js + Express + PostgreSQL + Socket.IO (API REST + chat en tiempo real)
- **Frontend**: React + Vite

> Nota sobre el catálogo: `backend/src/utils/seedStickers.js` genera un álbum de ejemplo
> (32 selecciones x 18 figuritas c/u) con jugadores genéricos ("Jugador 1", "Jugador 2"...),
> porque los planteles reales recién se confirman cerca del torneo. Podés reemplazar ese
> archivo o cargar tu propio catálogo directamente en la tabla `stickers`.

## Requisitos

- Node.js 18+
- PostgreSQL 14+ (local o vía Docker)

## 1. Base de datos

Opción rápida con Docker (recomendado):

```bash
cd backend
docker compose up -d
```

Esto levanta Postgres en `localhost:5432` con la base `figuritas` ya creada y el esquema
de `schema.sql` aplicado automáticamente.

Si preferís usar un Postgres que ya tenés instalado, creá la base y corré el esquema a mano:

```bash
createdb figuritas
psql -d figuritas -f backend/schema.sql
```

## 2. Backend

```bash
cd backend
npm install
cp .env.example .env      # ajustá DATABASE_URL / JWT_SECRET si hace falta
npm run seed               # carga el catálogo de figuritas (una sola vez)
npm run dev                 # levanta la API en http://localhost:4000
```

## 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env       # por defecto apunta a http://localhost:4000
npm run dev                 # levanta la app en http://localhost:5173
```

Abrí `http://localhost:5173`, registrate y empezá a marcar tu álbum.

## Cómo funciona el matching de intercambios

En "Intercambios", la app cruza tu álbum con el de otros usuarios:

- **Te puede dar**: figuritas que vos tenés como "me falta" y otro usuario tiene "repetida".
- **Le podés dar**: figuritas que a otro usuario le faltan y vos tenés "repetida".

Los usuarios se ordenan por cantidad de coincidencias. Desde ahí podés escribirle directo
por el chat integrado.

## Estructura del proyecto

```
figuritas/
  backend/
    schema.sql          # esquema de la base de datos
    docker-compose.yml  # Postgres listo para desarrollo
    src/
      server.js          # servidor Express + Socket.IO
      db.js               # conexión a Postgres
      middleware/auth.js  # verificación de JWT
      routes/             # auth, stickers, album, matches, messages
      utils/seedStickers.js
  frontend/
    src/
      pages/              # Login, Register, Album, Matches, Chat
      context/AuthContext.jsx
      api.js
```

## Notas

- La autenticación usa JWT (7 días de expiración) guardado en `localStorage`.
- El chat usa Socket.IO para mensajes en tiempo real; el historial se guarda en Postgres.
- Este proyecto está pensado para correr en tu máquina. Si más adelante querés desplegarlo
  para que otras personas lo usen, avisame y ajustamos CORS, variables de entorno y hosting.
