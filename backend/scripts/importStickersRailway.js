import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import pg from "pg";
import { fileURLToPath } from "url";

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlPath = path.resolve(
  __dirname,
  "../database/stickers_railway.sql"
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no está configurada.");
  }

  const existing = await pool.query(
    "SELECT COUNT(*)::integer AS total FROM stickers"
  );

  const total = Number(existing.rows[0].total);

  console.log(`Figuritas actuales: ${total}`);

  if (total > 0) {
    console.log("La base ya tiene figuritas. No se importa nuevamente.");
    return;
  }

  const sql = await fs.readFile(sqlPath, "utf8");

  console.log("Importando catálogo...");

  await pool.query(sql);

  const result = await pool.query(
    "SELECT COUNT(*)::integer AS total FROM stickers"
  );

  console.log(
    `Importación finalizada. Total: ${result.rows[0].total}`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });