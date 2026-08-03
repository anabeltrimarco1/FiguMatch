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
  "all-stickers-review-v2",
);

const REPORT_FILE = path.join(OUTPUT_DIR, "_motor-v2-report.json");

const [requestedTeamRaw] = process.argv.slice(2);

const REQUESTED_TEAM = requestedTeamRaw
  ? requestedTeamRaw.trim().toUpperCase()
  : null;

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

/*
 * Margen adicional alrededor de la coordenada original.
 *
 * 0.10 = 10 %
 * 0.14 = 14 %
 *
 * Un margen mayor evita cortar nombres, logos y bordes.
 */
const OVERSCAN_X_PERCENT = 0.14;
const OVERSCAN_Y_PERCENT = 0.16;

/*
 * Margen agregado después del recorte automático.
 */
const FINAL_PADDING = 14;

/*
 * Sensibilidad para quitar el fondo exterior.
 *
 * Valores aproximados:
 * 8  = muy estricto
 * 15 = moderado
 * 25 = más agresivo
 */
const TRIM_THRESHOLD = 18;

/*
 * Evita aceptar un trim que haya destruido gran parte
 * de la figurita.
 */
const MIN_RETAINED_WIDTH_PERCENT = 0.55;
const MIN_RETAINED_HEIGHT_PERCENT = 0.55;

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

async function loadTemplate(side) {
  const filename = side === "LEFT" ? "TEAM_LEFT.json" : "TEAM_RIGHT.json";

  const templatePath = path.join(TEMPLATE_DIR, filename);

  const content = await fs.readFile(templatePath, "utf8");

  const template = JSON.parse(content);

  if (
    !template.referenceWidth ||
    !template.referenceHeight ||
    !Array.isArray(template.stickers)
  ) {
    throw new Error(`El template ${filename} no tiene una estructura válida.`);
  }

  return template;
}

function scaleSticker(sticker, scaleX, scaleY) {
  return {
    left: Math.round(sticker.left * scaleX),
    top: Math.round(sticker.top * scaleY),
    width: Math.round(sticker.width * scaleX),
    height: Math.round(sticker.height * scaleY),
  };
}

function createExpandedCrop(crop, imageWidth, imageHeight) {
  const extraX = Math.round(crop.width * OVERSCAN_X_PERCENT);

  const extraY = Math.round(crop.height * OVERSCAN_Y_PERCENT);

  const left = Math.max(0, crop.left - extraX);

  const top = Math.max(0, crop.top - extraY);

  const right = Math.min(imageWidth, crop.left + crop.width + extraX);

  const bottom = Math.min(imageHeight, crop.top + crop.height + extraY);

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
}

function validateCrop(crop, imageWidth, imageHeight) {
  if (crop.left < 0 || crop.top < 0 || crop.width <= 0 || crop.height <= 0) {
    return false;
  }

  if (
    crop.left + crop.width > imageWidth ||
    crop.top + crop.height > imageHeight
  ) {
    return false;
  }

  return true;
}

async function createExpandedBuffer(inputPath, expandedCrop) {
  return sharp(inputPath)
    .extract(expandedCrop)
    .jpeg({
      quality: 100,
      chromaSubsampling: "4:4:4",
    })
    .toBuffer();
}

async function getMetadataFromBuffer(buffer) {
  const metadata = await sharp(buffer).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("No se pudieron determinar las dimensiones del recorte.");
  }

  return {
    width: metadata.width,
    height: metadata.height,
  };
}

async function createTrimmedBuffer(expandedBuffer) {
  /*
   * Sin indicar background, Sharp toma como referencia
   * el píxel superior izquierdo.
   *
   * Como el recorte se amplía, normalmente ese píxel
   * pertenece al fondo de la página.
   */
  return sharp(expandedBuffer)
    .trim({
      threshold: TRIM_THRESHOLD,
    })
    .jpeg({
      quality: 100,
      chromaSubsampling: "4:4:4",
    })
    .toBuffer();
}

function trimIsReasonable(original, trimmed) {
  const retainedWidth = trimmed.width / original.width;

  const retainedHeight = trimmed.height / original.height;

  return (
    retainedWidth >= MIN_RETAINED_WIDTH_PERCENT &&
    retainedHeight >= MIN_RETAINED_HEIGHT_PERCENT
  );
}

async function addFinalPadding(inputBuffer, outputPath) {
  await sharp(inputBuffer)
    .extend({
      top: FINAL_PADDING,
      bottom: FINAL_PADDING,
      left: FINAL_PADDING,
      right: FINAL_PADDING,
      background: {
        r: 255,
        g: 255,
        b: 255,
        alpha: 1,
      },
    })
    .jpeg({
      quality: 96,
      chromaSubsampling: "4:4:4",
    })
    .toFile(outputPath);
}

async function processSticker({
  inputPath,
  outputPath,
  sticker,
  scaleX,
  scaleY,
  imageWidth,
  imageHeight,
}) {
  const scaledCrop = scaleSticker(sticker, scaleX, scaleY);

  const expandedCrop = createExpandedCrop(scaledCrop, imageWidth, imageHeight);

  if (!validateCrop(expandedCrop, imageWidth, imageHeight)) {
    throw new Error("La zona ampliada quedó fuera de la página.");
  }

  const expandedBuffer = await createExpandedBuffer(inputPath, expandedCrop);

  const expandedMetadata = await getMetadataFromBuffer(expandedBuffer);

  let finalBuffer = expandedBuffer;

  let usedAutoTrim = false;
  let trimRejected = false;

  try {
    const trimmedBuffer = await createTrimmedBuffer(expandedBuffer);

    const trimmedMetadata = await getMetadataFromBuffer(trimmedBuffer);

    if (trimIsReasonable(expandedMetadata, trimmedMetadata)) {
      finalBuffer = trimmedBuffer;
      usedAutoTrim = true;
    } else {
      trimRejected = true;
    }
  } catch {
    trimRejected = true;
  }

  await addFinalPadding(finalBuffer, outputPath);

  const finalMetadata = await sharp(outputPath).metadata();

  return {
    originalCrop: scaledCrop,
    expandedCrop,
    usedAutoTrim,
    trimRejected,
    outputWidth: finalMetadata.width ?? null,
    outputHeight: finalMetadata.height ?? null,
  };
}

async function processPage(filename, pageInfo, templates) {
  const inputPath = path.join(INPUT_DIR, filename);

  const metadata = await sharp(inputPath).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error(`No se pudieron leer las dimensiones de ${filename}.`);
  }

  const template = pageInfo.side === "LEFT" ? templates.left : templates.right;

  const scaleX = metadata.width / template.referenceWidth;

  const scaleY = metadata.height / template.referenceHeight;

  const teamOutputDir = path.join(OUTPUT_DIR, pageInfo.team);

  await fs.mkdir(teamOutputDir, {
    recursive: true,
  });

  const pageResults = [];

  for (const sticker of template.stickers) {
    const outputName = `${pageInfo.team}_${String(sticker.number).padStart(
      2,
      "0",
    )}.jpg`;

    const outputPath = path.join(teamOutputDir, outputName);

    try {
      const analysis = await processSticker({
        inputPath,
        outputPath,
        sticker,
        scaleX,
        scaleY,
        imageWidth: metadata.width,
        imageHeight: metadata.height,
      });

      pageResults.push({
        file: outputName,
        number: sticker.number,
        type: sticker.type ?? "PLAYER",
        status: "OK",
        ...analysis,
      });
    } catch (error) {
      pageResults.push({
        file: outputName,
        number: sticker.number,
        type: sticker.type ?? "PLAYER",
        status: "ERROR",
        error: error.message,
      });
    }
  }

  return {
    filename,
    pageNumber: pageInfo.pageNumber,
    team: pageInfo.team,
    side: pageInfo.side,
    width: metadata.width,
    height: metadata.height,
    stickers: pageResults,
  };
}

async function clearOutput() {
  await fs.rm(OUTPUT_DIR, {
    recursive: true,
    force: true,
  });

  await fs.mkdir(OUTPUT_DIR, {
    recursive: true,
  });
}

async function main() {
  console.log("");
  console.log("======================================");
  console.log(" FIGUMATCH - MOTOR DE EXTRACCIÓN 2.0");
  console.log("======================================");
  console.log("");

  if (REQUESTED_TEAM) {
    console.log(`🎯 Selección solicitada: ${REQUESTED_TEAM}`);
  } else {
    console.log("🌎 Procesando todas las selecciones");
  }

  console.log("");

  const templates = {
    left: await loadTemplate("LEFT"),
    right: await loadTemplate("RIGHT"),
  };

  const files = await getPageFiles();

  const selectedFiles = files.filter((filename) => {
    const pageInfo = parsePageFilename(filename);

    if (!pageInfo) {
      return false;
    }

    if (!REQUESTED_TEAM) {
      return true;
    }

    return pageInfo.team === REQUESTED_TEAM;
  });

  if (REQUESTED_TEAM && selectedFiles.length === 0) {
    throw new Error(`No se encontraron páginas para ${REQUESTED_TEAM}.`);
  }

  if (!REQUESTED_TEAM) {
    await clearOutput();
  } else {
    await fs.mkdir(OUTPUT_DIR, {
      recursive: true,
    });

    await fs.rm(path.join(OUTPUT_DIR, REQUESTED_TEAM), {
      recursive: true,
      force: true,
    });
  }

  const pages = [];
  const invalidNames = [];

  for (const filename of selectedFiles) {
    const pageInfo = parsePageFilename(filename);

    if (!pageInfo) {
      invalidNames.push(filename);
      continue;
    }

    try {
      const result = await processPage(filename, pageInfo, templates);

      pages.push(result);

      const okCount = result.stickers.filter(
        (item) => item.status === "OK",
      ).length;

      const trimmedCount = result.stickers.filter(
        (item) => item.usedAutoTrim,
      ).length;

      console.log(
        `✅ ${filename} → ` +
          `${okCount} recortes | ` +
          `${trimmedCount} autocentrados`,
      );
    } catch (error) {
      pages.push({
        filename,
        team: pageInfo.team,
        side: pageInfo.side,
        status: "ERROR",
        error: error.message,
      });

      console.error(`❌ ${filename}: ${error.message}`);
    }
  }

  const stickerResults = pages.flatMap((page) =>
    Array.isArray(page.stickers) ? page.stickers : [],
  );

  const totalStickers = stickerResults.length;

  const okStickers = stickerResults.filter(
    (item) => item.status === "OK",
  ).length;

  const errors = stickerResults.filter(
    (item) => item.status === "ERROR",
  ).length;

  const autoTrimmed = stickerResults.filter((item) => item.usedAutoTrim).length;

  const rejectedTrims = stickerResults.filter(
    (item) => item.trimRejected,
  ).length;

  const report = {
    version: "2.0",
    generatedAt: new Date().toISOString(),
    requestedTeam: REQUESTED_TEAM,
    configuration: {
      overscanXPercent: OVERSCAN_X_PERCENT,
      overscanYPercent: OVERSCAN_Y_PERCENT,
      finalPadding: FINAL_PADDING,
      trimThreshold: TRIM_THRESHOLD,
      minRetainedWidthPercent: MIN_RETAINED_WIDTH_PERCENT,
      minRetainedHeightPercent: MIN_RETAINED_HEIGHT_PERCENT,
    },
    processedPages: pages.length,
    totalStickers,
    okStickers,
    errors,
    autoTrimmed,
    rejectedTrims,
    invalidNames,
    pages,
  };

  await fs.writeFile(REPORT_FILE, JSON.stringify(report, null, 2), "utf8");

  console.log("");
  console.log("======================================");
  console.log(" RESULTADO MOTOR 2.0");
  console.log("======================================");
  console.log(`📄 Páginas: ${pages.length}`);
  console.log(`🖼️ Figuritas: ${totalStickers}`);
  console.log(`✅ Correctas: ${okStickers}`);
  console.log(`🎯 Autocentradas: ${autoTrimmed}`);
  console.log(`↩️ Trim descartado: ${rejectedTrims}`);
  console.log(`❌ Errores: ${errors}`);
  console.log("");
  console.log("📁 Resultado:");
  console.log(OUTPUT_DIR);
  console.log("");
  console.log("📄 Reporte:");
  console.log(REPORT_FILE);
  console.log("");
}

main().catch((error) => {
  console.error("");
  console.error("❌ Error general:");
  console.error(error.message);
  process.exitCode = 1;
});
