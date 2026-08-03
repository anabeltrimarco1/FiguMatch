import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_DIR = path.resolve(__dirname, "..");

const [filename] = process.argv.slice(2);

if (!filename) {
  console.error("Uso: node scripts/inspectPage.js 001_MEX_LEFT.jpg");
  process.exit(1);
}

const inputPath = path.join(BACKEND_DIR, "public", "cropped-pages", filename);

async function main() {
  await fs.access(inputPath);

  const metadata = await sharp(inputPath).metadata();

  console.log("");
  console.log("======================================");
  console.log(" FIGUMATCH - INSPECCIÓN DE PÁGINA");
  console.log("======================================");
  console.log("");
  console.log(`📄 Archivo: ${filename}`);
  console.log(`📐 Ancho: ${metadata.width}`);
  console.log(`📐 Alto: ${metadata.height}`);
  console.log(`🖼️ Formato: ${metadata.format}`);
  console.log("");
}

main().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exitCode = 1;
});
