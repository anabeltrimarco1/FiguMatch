import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import pg from "pg";
import { fileURLToPath } from "url";

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  console.log("====================================");
  console.log("FIGUMATCH - IMPORTAR STICKERS");
  console.log("====================================");

  const result = await pool.query(
    "SELECT COUNT(*)::int AS total FROM stickers"
  );

  const total = result.rows[0].total;

  console.log("Figuritas actuales:", total);

  if (total > 0) {
    console.log("La tabla ya tiene datos.");
    return;
  }

  const sqlFile = path.resolve(
     __dirname,
    "../stickers.sql"
    );

  const sql = await fs.readFile(sqlFile, "utf8");

  console.log("Importando figuritas...");

  await pool.query(sql);

  const check = await pool.query(
    "SELECT COUNT(*)::int AS total FROM stickers"
  );

  console.log("");
  console.log("====================================");
  console.log("IMPORTACIÓN COMPLETADA");
  console.log("Figuritas:", check.rows[0].total);
  console.log("====================================");
}

main()
  .catch(console.error)
  .finally(async () => {
    await pool.end();
  });