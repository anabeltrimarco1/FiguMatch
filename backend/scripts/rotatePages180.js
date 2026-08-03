import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_DIR = path.resolve(__dirname, "..");

const LIST_FILE = path.join(BACKEND_DIR, "paginas-180.txt");

const INPUT_DIR = path.join(BACKEND_DIR, "public", "oriented");

function decodeText(buffer) {
  const isUtf16LE =
    buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe;

  const isUtf16BE =
    buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff;

  if (isUtf16LE) {
    return buffer.subarray(2).toString("utf16le");
  }

  if (isUtf16BE) {
    const bytes = buffer.subarray(2);

    for (let index = 0; index < bytes.length - 1; index += 2) {
      const first = bytes[index];
      bytes[index] = bytes[index + 1];
      bytes[index + 1] = first;
    }

    return bytes.toString("utf16le");
  }

  return buffer.toString("utf8");
}

async function loadFilenames() {
  const buffer = await fs.readFile(LIST_FILE);
  const content = decodeText(buffer);

  return content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function rotateFile(filename) {
  const inputPath = path.join(INPUT_DIR, filename);
  await fs.access(inputPath);

  const backupPath = path.join(INPUT_DIR, `temp_${filename}`);

  // Renombramos el archivo original
  await fs.rename(inputPath, backupPath);

  // Generamos el archivo girado con el nombre original
  await sharp(backupPath)
    .rotate(180)
    .withMetadata({
      orientation: 1,
    })
    .jpeg({
      quality: 96,
      chromaSubsampling: "4:4:4",
    })
    .toFile(inputPath);

  // Eliminamos el archivo temporal
  await fs.unlink(backupPath);

  console.log(`✅ ${filename} → 180°`);
}

async function main() {
  console.log("");
  console.log("======================================");
  console.log(" FIGUMATCH - GIRO MASIVO 180°");
  console.log("======================================");
  console.log("");

  await fs.mkdir(INPUT_DIR, {
    recursive: true,
  });

  const filenames = await loadFilenames();

  console.log(`📄 Lista: ${LIST_FILE}`);
  console.log(`📁 Carpeta: ${INPUT_DIR}`);
  console.log(`🖼️ Archivos indicados: ${filenames.length}`);
  console.log("");

  if (filenames.length === 0) {
    console.log("⚠️ paginas-180.txt está vacío.");

    return;
  }

  let processed = 0;
  let errors = 0;

  for (const filename of filenames) {
    try {
      await rotateFile(filename);
      processed += 1;
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
