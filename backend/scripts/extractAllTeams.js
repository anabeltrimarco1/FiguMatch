import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_DIR = path.resolve(__dirname, "..");

const INPUT_DIR = path.join(BACKEND_DIR, "public", "cropped-pages");

const TEMPLATE_DIR = path.join(BACKEND_DIR, "templates");

const OUTPUT_DIR = path.join(
  BACKEND_DIR,
  "public",
  "debug",
  "all-stickers-review",
);

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function parsePageFilename(filename) {
  const extension = path.extname(filename);
  const basename = path.basename(filename, extension);

  const match = basename.match(/^(\d{3})_([A-Z0-9]{2,4})_(LEFT|RIGHT)$/);

  if (!match) {
    return null;
  }

  return {
    pageNumber: Number(match[1]),
    team: match[2],
    side: match[3],
  };
}

async function getPageFiles() {
  const entries = await fs.readdir(INPUT_DIR, {
    withFileTypes: true,
  });

  return entries
    .filter((entry) => {
      if (!entry.isFile()) {
        return false;
      }

      return IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase());
    })
    .map((entry) => entry.name)
    .sort((a, b) =>
      a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
}

async function loadTemplate(side) {
  const templateName = side === "LEFT" ? "TEAM_LEFT.json" : "TEAM_RIGHT.json";

  const templatePath = path.join(TEMPLATE_DIR, templateName);

  const content = await fs.readFile(templatePath, "utf8");

  return JSON.parse(content);
}

function scaleCrop(sticker, scaleX, scaleY) {
  return {
    left: Math.round(sticker.left * scaleX),
    top: Math.round(sticker.top * scaleY),
    width: Math.round(sticker.width * scaleX),
    height: Math.round(sticker.height * scaleY),
  };
}

function keepCropInsideImage(crop, imageWidth, imageHeight) {
  const left = Math.max(0, crop.left);
  const top = Math.max(0, crop.top);

  const width = Math.min(crop.width, imageWidth - left);

  const height = Math.min(crop.height, imageHeight - top);

  if (width <= 0 || height <= 0) {
    throw new Error("Las coordenadas quedan fuera de la imagen.");
  }

  return {
    left,
    top,
    width,
    height,
  };
}

async function extractPage(filename, pageInfo) {
  const inputPath = path.join(INPUT_DIR, filename);

  const metadata = await sharp(inputPath).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error(`No se pudieron leer las dimensiones de ${filename}`);
  }

  const template = await loadTemplate(pageInfo.side);

  if (
    !template.referenceWidth ||
    !template.referenceHeight ||
    !Array.isArray(template.stickers)
  ) {
    throw new Error(`Template inválido para ${pageInfo.side}`);
  }

  const scaleX = metadata.width / template.referenceWidth;

  const scaleY = metadata.height / template.referenceHeight;

  const teamOutputDir = path.join(OUTPUT_DIR, pageInfo.team);

  await fs.mkdir(teamOutputDir, {
    recursive: true,
  });

  for (const sticker of template.stickers) {
    const scaledCrop = scaleCrop(sticker, scaleX, scaleY);

    const crop = keepCropInsideImage(
      scaledCrop,
      metadata.width,
      metadata.height,
    );

    const outputName = `${pageInfo.team}_${String(sticker.number).padStart(2, "0")}.jpg`;

    const outputPath = path.join(teamOutputDir, outputName);

    await sharp(inputPath)
      .extract(crop)
      .jpeg({
        quality: 96,
        chromaSubsampling: "4:4:4",
      })
      .toFile(outputPath);
  }

  return template.stickers.length;
}

async function main() {
  console.log("");
  console.log("======================================");
  console.log(" FIGUMATCH - EXTRACCIÓN MASIVA");
  console.log("======================================");
  console.log("");

  await fs.mkdir(OUTPUT_DIR, {
    recursive: true,
  });

  const files = await getPageFiles();

  let processedPages = 0;
  let extractedStickers = 0;
  const errors = [];

  for (const filename of files) {
    const pageInfo = parsePageFilename(filename);

    if (!pageInfo) {
      console.log(`⏭️ Nombre no reconocido: ${filename}`);
      continue;
    }

    try {
      const count = await extractPage(filename, pageInfo);

      processedPages += 1;
      extractedStickers += count;

      console.log(`✅ ${filename} → ${count} figuritas`);
    } catch (error) {
      errors.push({
        filename,
        message: error.message,
      });

      console.error(`❌ ${filename}: ${error.message}`);
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    inputDirectory: INPUT_DIR,
    outputDirectory: OUTPUT_DIR,
    processedPages,
    extractedStickers,
    errors,
  };

  await fs.writeFile(
    path.join(OUTPUT_DIR, "_report.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );

  console.log("");
  console.log("======================================");
  console.log(" RESULTADO");
  console.log("======================================");
  console.log(`✅ Páginas procesadas: ${processedPages}`);
  console.log(`🖼️ Figuritas generadas: ${extractedStickers}`);
  console.log(`❌ Errores: ${errors.length}`);
  console.log("");
  console.log("📁 Revisión:");
  console.log(OUTPUT_DIR);
  console.log("");
}

main().catch((error) => {
  console.error("");
  console.error("❌ Error general:");
  console.error(error.message);
  process.exitCode = 1;
});
