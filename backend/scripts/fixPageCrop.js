import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_DIR = path.resolve(__dirname, "..");

const [filename, topArg = "270"] = process.argv.slice(2);

if (!filename) {
  console.error("Uso: node .\\scripts\\fixPageCrop.js 002_MEX_RIGHT.jpg 270");
  process.exit(1);
}

const topToRemove = Number(topArg);

if (!Number.isInteger(topToRemove) || topToRemove < 0) {
  console.error("La cantidad de píxeles debe ser un número entero positivo.");
  process.exit(1);
}

const PAGE_DIR = path.join(BACKEND_DIR, "public", "cropped-pages");

const inputPath = path.join(PAGE_DIR, filename);

const temporaryPath = path.join(PAGE_DIR, `__temp_${filename}`);

async function main() {
  await fs.access(inputPath);

  const metadata = await sharp(inputPath).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("No se pudieron leer las dimensiones.");
  }

  if (topToRemove >= metadata.height) {
    throw new Error("El recorte superior es mayor que la altura de la imagen.");
  }

  await fs.rename(inputPath, temporaryPath);

  try {
    await sharp(temporaryPath)
      .extract({
        left: 0,
        top: topToRemove,
        width: metadata.width,
        height: metadata.height - topToRemove,
      })
      .jpeg({
        quality: 96,
        chromaSubsampling: "4:4:4",
      })
      .toFile(inputPath);

    await fs.unlink(temporaryPath);

    console.log("");
    console.log("✅ Página corregida");
    console.log(`📄 Archivo: ${filename}`);
    console.log(`✂️ Eliminados arriba: ${topToRemove} px`);
    console.log(
      `📐 Nueva medida: ${metadata.width} × ${metadata.height - topToRemove}`,
    );
    console.log("");
  } catch (error) {
    try {
      await fs.rename(temporaryPath, inputPath);
    } catch {
      // Conserva el error original.
    }

    throw error;
  }
}

main().catch((error) => {
  console.error("");
  console.error("❌ Error:");
  console.error(error.message);
  process.exitCode = 1;
});
