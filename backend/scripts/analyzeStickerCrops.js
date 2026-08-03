import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_DIR = path.resolve(__dirname, "..");

const INPUT_DIR = path.join(
  BACKEND_DIR,
  "public",
  "debug",
  "all-stickers-review",
);

const REVIEW_DIR = path.join(
  BACKEND_DIR,
  "public",
  "debug",
  "stickers-to-review",
);

const REPORT_FILE = path.join(
  BACKEND_DIR,
  "data",
  "stickerValidationReport.json",
);

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const BORDER_SIZE = 20;
const VERY_LIGHT = 235;
const VERY_DARK = 20;

async function getImageFiles(directory) {
  const entries = await fs.readdir(directory, {
    withFileTypes: true,
  });

  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await getImageFiles(fullPath)));
      continue;
    }

    if (
      entry.isFile() &&
      IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

function averageBrightness(buffer, channels) {
  let sum = 0;
  let pixels = 0;

  for (let index = 0; index < buffer.length; index += channels) {
    const red = buffer[index] ?? 0;
    const green = buffer[index + 1] ?? red;
    const blue = buffer[index + 2] ?? red;

    sum += (red + green + blue) / 3;
    pixels += 1;
  }

  return pixels ? sum / pixels : 0;
}

function percentageOutsideRange(buffer, channels) {
  let suspicious = 0;
  let pixels = 0;

  for (let index = 0; index < buffer.length; index += channels) {
    const red = buffer[index] ?? 0;
    const green = buffer[index + 1] ?? red;
    const blue = buffer[index + 2] ?? red;

    const brightness = (red + green + blue) / 3;

    if (brightness >= VERY_LIGHT || brightness <= VERY_DARK) {
      suspicious += 1;
    }

    pixels += 1;
  }

  return pixels ? suspicious / pixels : 0;
}

async function analyzeRegion(imagePath, region) {
  const { data, info } = await sharp(imagePath)
    .extract(region)
    .removeAlpha()
    .raw()
    .toBuffer({
      resolveWithObject: true,
    });

  return {
    brightness: averageBrightness(data, info.channels),

    extremePercentage: percentageOutsideRange(data, info.channels),
  };
}

async function analyzeSticker(imagePath) {
  const metadata = await sharp(imagePath).metadata();

  const width = metadata.width;
  const height = metadata.height;

  if (!width || !height) {
    throw new Error("No se pudieron leer las dimensiones.");
  }

  const border = Math.min(
    BORDER_SIZE,
    Math.floor(width / 4),
    Math.floor(height / 4),
  );

  const regions = {
    top: {
      left: 0,
      top: 0,
      width,
      height: border,
    },
    bottom: {
      left: 0,
      top: height - border,
      width,
      height: border,
    },
    left: {
      left: 0,
      top: 0,
      width: border,
      height,
    },
    right: {
      left: width - border,
      top: 0,
      width: border,
      height,
    },
  };

  const top = await analyzeRegion(imagePath, regions.top);

  const bottom = await analyzeRegion(imagePath, regions.bottom);

  const left = await analyzeRegion(imagePath, regions.left);

  const right = await analyzeRegion(imagePath, regions.right);

  const reasons = [];

  const ratio = width / height;

  if (ratio < 0.45 || ratio > 1.8) {
    reasons.push("proporción inusual");
  }

  const sides = {
    arriba: top,
    abajo: bottom,
    izquierda: left,
    derecha: right,
  };

  for (const [name, analysis] of Object.entries(sides)) {
    if (analysis.extremePercentage > 0.85) {
      reasons.push(`borde ${name} sospechoso`);
    }
  }

  return {
    width,
    height,
    ratio,
    borders: {
      top,
      bottom,
      left,
      right,
    },
    status: reasons.length > 0 ? "REVISAR" : "OK",
    reasons,
  };
}

async function main() {
  console.log("");
  console.log("======================================");
  console.log(" FIGUMATCH - ANÁLISIS DE RECORTES");
  console.log("======================================");
  console.log("");

  await fs.mkdir(REVIEW_DIR, {
    recursive: true,
  });

  const files = await getImageFiles(INPUT_DIR);

  const results = [];
  let suspiciousCount = 0;

  for (const imagePath of files) {
    const relativePath = path.relative(INPUT_DIR, imagePath);

    try {
      const analysis = await analyzeSticker(imagePath);

      results.push({
        file: relativePath,
        ...analysis,
      });

      if (analysis.status === "REVISAR") {
        suspiciousCount += 1;

        const outputPath = path.join(REVIEW_DIR, relativePath);

        await fs.mkdir(path.dirname(outputPath), {
          recursive: true,
        });

        await fs.copyFile(imagePath, outputPath);

        console.log(`⚠️ ${relativePath} → ` + analysis.reasons.join(", "));
      }
    } catch (error) {
      results.push({
        file: relativePath,
        status: "ERROR",
        reasons: [error.message],
      });

      console.error(`❌ ${relativePath}: ${error.message}`);
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    total: files.length,
    suspicious: suspiciousCount,
    ok: files.length - suspiciousCount,
    results,
  };

  await fs.mkdir(path.dirname(REPORT_FILE), {
    recursive: true,
  });

  await fs.writeFile(REPORT_FILE, JSON.stringify(report, null, 2), "utf8");

  console.log("");
  console.log("======================================");
  console.log(" RESULTADO");
  console.log("======================================");
  console.log(`🖼️ Analizadas: ${files.length}`);
  console.log(`✅ Correctas: ${report.ok}`);
  console.log(`⚠️ Para revisar: ${suspiciousCount}`);
  console.log("");
  console.log("📄 Reporte:");
  console.log(REPORT_FILE);
  console.log("");
  console.log("📁 Figuritas sospechosas:");
  console.log(REVIEW_DIR);
  console.log("");
}

main().catch((error) => {
  console.error("");
  console.error("❌ Error general:");
  console.error(error.message);
  process.exitCode = 1;
});
