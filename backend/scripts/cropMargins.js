import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_DIR = path.resolve(__dirname, "..");

const INPUT_DIR = path.join(BACKEND_DIR, "public", "oriented");

const OUTPUT_DIR = path.join(BACKEND_DIR, "public", "cropped-pages");

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const TRIM_OPTIONS = {
  background: "#ffffff",
  threshold: 12,
};

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

async function cropMargins(filename) {
  const inputPath = path.join(INPUT_DIR, filename);

  const outputPath = path.join(OUTPUT_DIR, filename);

  const image = sharp(inputPath);

  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("No se pudieron leer las dimensiones.");
  }

  await image
    .trim(TRIM_OPTIONS)
    .jpeg({
      quality: 96,
      chromaSubsampling: "4:4:4",
    })
    .toFile(outputPath);

  const outputMetadata = await sharp(outputPath).metadata();

  return {
    originalWidth: metadata.width,
    originalHeight: metadata.height,
    croppedWidth: outputMetadata.width,
    croppedHeight: outputMetadata.height,
  };
}

async function main() {
  console.log("");
  console.log("======================================");
  console.log(" FIGUMATCH - RECORTE DE MÁRGENES");
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
    console.log("⚠️ No se encontraron imágenes en public/oriented.");
    console.log("");
    return;
  }

  let processed = 0;
  let errors = 0;

  for (const filename of files) {
    try {
      const result = await cropMargins(filename);

      processed += 1;

      console.log(
        `✅ ${filename} — ` +
          `${result.originalWidth}x${result.originalHeight} → ` +
          `${result.croppedWidth}x${result.croppedHeight}`,
      );
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
  console.log("📁 Carpeta de salida:");
  console.log(OUTPUT_DIR);
  console.log("");
}

main().catch((error) => {
  console.error("");
  console.error("❌ Error general:");
  console.error(error.message);
  process.exitCode = 1;
});
