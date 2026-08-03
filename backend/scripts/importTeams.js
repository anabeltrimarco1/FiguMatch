import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import pg from "pg";
import { fileURLToPath } from "url";

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_DIR = path.resolve(__dirname, "..");

const TEAMS_FILE = path.join(BACKEND_DIR, "data", "teams.json");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function loadTeams() {
  const content = await fs.readFile(TEAMS_FILE, "utf8");

  const teams = JSON.parse(content);

  if (!Array.isArray(teams)) {
    throw new Error("teams.json debe contener un array.");
  }

  return teams;
}

async function importTeam(team) {
  if (!team.code || !team.name || !team.group) {
    throw new Error(`Selección inválida: ${JSON.stringify(team)}`);
  }

  await pool.query(
    `
      INSERT INTO teams (
        code,
        name,
        group_code,
        flag_emoji
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (code)
      DO UPDATE SET
        name = EXCLUDED.name,
        group_code = EXCLUDED.group_code,
        flag_emoji = EXCLUDED.flag_emoji
    `,
    [team.code, team.name, team.group, team.flag ?? null],
  );
}

async function main() {
  console.log("");
  console.log("======================================");
  console.log(" FIGUMATCH - IMPORTAR SELECCIONES");
  console.log("======================================");
  console.log("");

  const teams = await loadTeams();

  console.log(`📄 Selecciones encontradas: ${teams.length}`);

  for (const team of teams) {
    await importTeam(team);

    console.log(`✅ ${team.code} - ${team.name}`);
  }

  const result = await pool.query(
    `
      SELECT COUNT(*)::integer AS total
      FROM teams
    `,
  );

  console.log("");
  console.log(`🏁 Selecciones en PostgreSQL: ${result.rows[0].total}`);
  console.log("");
}

main()
  .catch((error) => {
    console.error("");
    console.error("❌ Error:");
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
