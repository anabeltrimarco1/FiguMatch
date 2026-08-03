import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_DIR = path.resolve(__dirname, "..");

const INPUT_DIR = path.join(BACKEND_DIR, "public", "scans");

const OUTPUT_DIR = path.join(BACKEND_DIR, "public", "oriented");

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

async function getImageFiles() {
  const entries = await fs.readdir(INPUT_DIR, {
    withFileTypes: true,
  });

  return entries
    .filter((entry) => {
      if (!entry.isFile()) {
        return false;
      }

      const extension = path.extname(entry.name).toLowerCase();

      return IMAGE_EXTENSIONS.has(extension);
    })
    .map((entry) => entry.name)
    .sort((a, b) =>
      a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
}

async function orientImage(filename) {
  const inputPath = path.join(INPUT_DIR, filename);

  const outputPath = path.join(OUTPUT_DIR, filename);

  await sharp(inputPath)
    .rotate()
    .withMetadata({
      orientation: 1,
    })
    .toFile(outputPath);

  return outputPath;
}

async function main() {
  console.log("");
  console.log("======================================");
  console.log(" FIGUMATCH - ORIENTACIÓN DE PÁGINAS");
  console.log("======================================");
  console.log("");

  await fs.mkdir(INPUT_DIR, {
    recursive: true,
  });

  await fs.mkdir(OUTPUT_DIR, {
    recursive: true,
  });

  const files = await getImageFiles();

  console.log(`📁 Entrada: ${INPUT_DIR}`);
  console.log(`📁 Salida : ${OUTPUT_DIR}`);
  console.log(`🖼️ Imágenes encontradas: ${files.length}`);
  console.log("");

  if (files.length === 0) {
    console.log("⚠️ No se encontraron imágenes dentro de public/scans.");
    console.log("");
    return;
  }

  let processed = 0;
  let errors = 0;

  for (const filename of files) {
    try {
      await orientImage(filename);
      processed += 1;

      console.log(`✅ ${filename}`);
    } catch (error) {
      errors += 1;

      console.error(`❌ ${filename}: ${error.message}`);
    }
  }

  console.log("");
  console.log("======================================");
  console.log(" RESULTADO");
  console.log("======================================");
  console.log(`✅ Procesadas: ${processed}`);
  console.log(`❌ Errores: ${errors}`);
  console.log("");
}

main().catch((error) => {
  console.error("");
  console.error("❌ Error general:");
  console.error(error.message);
  process.exitCode = 1;
});
