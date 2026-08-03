// Genera un catálogo de ejemplo tipo "álbum del Mundial" para poder probar la app.
// Los nombres de jugadores son genéricos (Jugador 1, Jugador 2, ...) porque las
// planteles reales se confirman recién cerca del torneo. Podés reemplazar estos
// datos por el álbum real editando la tabla `stickers` o este script.
import { pool } from "../db.js";

const TEAMS = [
  "Argentina",
  "Brasil",
  "Francia",
  "Alemania",
  "España",
  "Inglaterra",
  "Portugal",
  "Países Bajos",
  "Bélgica",
  "Uruguay",
  "Croacia",
  "Italia",
  "México",
  "Estados Unidos",
  "Canadá",
  "Japón",
  "Corea del Sur",
  "Marruecos",
  "Senegal",
  "Ghana",
  "Nigeria",
  "Camerún",
  "Australia",
  "Arabia Saudita",
  "Ecuador",
  "Colombia",
  "Chile",
  "Suiza",
  "Dinamarca",
  "Polonia",
  "Serbia",
  "Gales",
];

const PLAYERS_PER_TEAM = 17;

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query("SELECT COUNT(*) FROM stickers");
    if (Number(existing.rows[0].count) > 0) {
      console.log("El catálogo ya tiene datos, no se vuelve a sembrar.");
      await client.query("ROLLBACK");
      return;
    }

    let number = 1;
    for (const team of TEAMS) {
      await client.query(
        `INSERT INTO stickers (number, team, category, name) VALUES ($1, $2, 'escudo', $3)`,
        [number++, team, `Escudo de ${team}`],
      );
      for (let p = 1; p <= PLAYERS_PER_TEAM; p++) {
        await client.query(
          `INSERT INTO stickers (number, team, category, name) VALUES ($1, $2, 'jugador', $3)`,
          [number++, team, `${team} - Jugador ${p}`],
        );
      }
    }

    await client.query("COMMIT");
    console.log(
      `Catálogo sembrado: ${number - 1} figuritas de ${TEAMS.length} selecciones.`,
    );
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error sembrando catálogo:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
