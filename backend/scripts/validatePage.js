import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_DIR = path.resolve(__dirname, "..");

const [filename] = process.argv.slice(2);

if (!filename) {
  console.error("");
  console.error("❌ Falta indicar el nombre de la página.");
  console.error("");
  console.error("Uso: node .\\scripts\\validatePage.js 002_MEX_RIGHT.jpg");
  process.exit(1);
}

const INPUT_PATH = path.join(BACKEND_DIR, "public", "cropped-pages", filename);

const OUTPUT_DIR = path.join(BACKEND_DIR, "public", "debug", "page-validation");

const BORDER_SIZE = 60;
const LIGHT_THRESHOLD = 205;
const REQUIRED_LIGHT_PERCENTAGE = 0.7;

function averageBrightness(buffer, channels) {
  let total = 0;
  let pixels = 0;

  for (let index = 0; index < buffer.length; index += channels) {
    const red = buffer[index] ?? 0;
    const green = buffer[index + 1] ?? red;
    const blue = buffer[index + 2] ?? red;

    total += (red + green + blue) / 3;
    pixels += 1;
  }

  return pixels > 0 ? total / pixels : 0;
}

function lightPixelPercentage(buffer, channels) {
  let lightPixels = 0;
  let totalPixels = 0;

  for (let index = 0; index < buffer.length; index += channels) {
    const red = buffer[index] ?? 0;
    const green = buffer[index + 1] ?? red;
    const blue = buffer[index + 2] ?? red;

    const brightness = (red + green + blue) / 3;

    if (brightness >= LIGHT_THRESHOLD) {
      lightPixels += 1;
    }

    totalPixels += 1;
  }

  return totalPixels > 0 ? lightPixels / totalPixels : 0;
}

async function analyzeRegion(region) {
  const { data, info } = await sharp(INPUT_PATH)
    .extract(region)
    .removeAlpha()
    .raw()
    .toBuffer({
      resolveWithObject: true,
    });

  return {
    brightness: averageBrightness(data, info.channels),

    lightPercentage: lightPixelPercentage(data, info.channels),
  };
}

function borderHasPossibleMargin(analysis) {
  return (
    analysis.brightness >= LIGHT_THRESHOLD &&
    analysis.lightPercentage >= REQUIRED_LIGHT_PERCENTAGE
  );
}

function percentage(value) {
  return `${(value * 100).toFixed(1)} %`;
}

function createValidationSvg(width, height) {
  return Buffer.from(`
    <svg
      width="${width}"
      height="${height}"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="5"
        y="5"
        width="${width - 10}"
        height="${height - 10}"
        fill="none"
        stroke="#ff0000"
        stroke-width="10"
      />

      <line
        x1="0"
        y1="${BORDER_SIZE}"
        x2="${width}"
        y2="${BORDER_SIZE}"
        stroke="#ffff00"
        stroke-width="7"
      />

      <line
        x1="0"
        y1="${height - BORDER_SIZE}"
        x2="${width}"
        y2="${height - BORDER_SIZE}"
        stroke="#ffff00"
        stroke-width="7"
      />

      <line
        x1="${BORDER_SIZE}"
        y1="0"
        x2="${BORDER_SIZE}"
        y2="${height}"
        stroke="#ffff00"
        stroke-width="7"
      />

      <line
        x1="${width - BORDER_SIZE}"
        y1="0"
        x2="${width - BORDER_SIZE}"
        y2="${height}"
        stroke="#ffff00"
        stroke-width="7"
      />

      <rect
        x="25"
        y="25"
        width="780"
        height="145"
        rx="15"
        fill="rgba(0,0,0,0.72)"
      />

      <text
        x="55"
        y="82"
        fill="#ffffff"
        font-size="38"
        font-family="Arial"
        font-weight="bold"
      >
        Validación de página
      </text>

      <text
        x="55"
        y="135"
        fill="#ffffff"
        font-size="30"
        font-family="Arial"
      >
        Líneas amarillas: zona analizada
      </text>
    </svg>
  `);
}

async function generateDebugImage(width, height) {
  await fs.mkdir(OUTPUT_DIR, {
    recursive: true,
  });

  const extension = path.extname(filename);

  const basename = path.basename(filename, extension);

  const outputPath = path.join(OUTPUT_DIR, `${basename}_VALIDATION.jpg`);

  const svg = createValidationSvg(width, height);

  await sharp(INPUT_PATH)
    .composite([
      {
        input: svg,
        top: 0,
        left: 0,
      },
    ])
    .jpeg({
      quality: 96,
      chromaSubsampling: "4:4:4",
    })
    .toFile(outputPath);

  return outputPath;
}

async function main() {
  console.log("");
  console.log("======================================");
  console.log(" FIGUMATCH - VALIDADOR DE PÁGINAS");
  console.log("======================================");
  console.log("");

  await fs.access(INPUT_PATH);

  const metadata = await sharp(INPUT_PATH).metadata();

  const width = metadata.width;
  const height = metadata.height;

  if (!width || !height) {
    throw new Error("No se pudieron obtener las dimensiones.");
  }

  if (width <= BORDER_SIZE * 2 || height <= BORDER_SIZE * 2) {
    throw new Error("La imagen es demasiado pequeña para analizarla.");
  }

  const regions = {
    top: {
      left: 0,
      top: 0,
      width,
      height: BORDER_SIZE,
    },

    bottom: {
      left: 0,
      top: height - BORDER_SIZE,
      width,
      height: BORDER_SIZE,
    },

    left: {
      left: 0,
      top: 0,
      width: BORDER_SIZE,
      height,
    },

    right: {
      left: width - BORDER_SIZE,
      top: 0,
      width: BORDER_SIZE,
      height,
    },
  };

  const topAnalysis = await analyzeRegion(regions.top);

  const bottomAnalysis = await analyzeRegion(regions.bottom);

  const leftAnalysis = await analyzeRegion(regions.left);

  const rightAnalysis = await analyzeRegion(regions.right);

  const possibleMargins = {
    top: borderHasPossibleMargin(topAnalysis),

    bottom: borderHasPossibleMargin(bottomAnalysis),

    left: borderHasPossibleMargin(leftAnalysis),

    right: borderHasPossibleMargin(rightAnalysis),
  };

  const hasPossibleMargin = Object.values(possibleMargins).some(Boolean);

  const debugPath = await generateDebugImage(width, height);

  console.log(`📄 Archivo: ${filename}`);
  console.log(`📐 Ancho: ${width}`);
  console.log(`📐 Alto: ${height}`);
  console.log("");

  console.log("ANÁLISIS DE BORDES");
  console.log("------------------");

  console.log(
    `Superior  → brillo: ${topAnalysis.brightness.toFixed(1)} | ` +
      `píxeles claros: ${percentage(topAnalysis.lightPercentage)} | ` +
      `${possibleMargins.top ? "⚠️ Posible margen" : "✅ Correcto"}`,
  );

  console.log(
    `Inferior  → brillo: ${bottomAnalysis.brightness.toFixed(1)} | ` +
      `píxeles claros: ${percentage(bottomAnalysis.lightPercentage)} | ` +
      `${possibleMargins.bottom ? "⚠️ Posible margen" : "✅ Correcto"}`,
  );

  console.log(
    `Izquierdo → brillo: ${leftAnalysis.brightness.toFixed(1)} | ` +
      `píxeles claros: ${percentage(leftAnalysis.lightPercentage)} | ` +
      `${possibleMargins.left ? "⚠️ Posible margen" : "✅ Correcto"}`,
  );

  console.log(
    `Derecho   → brillo: ${rightAnalysis.brightness.toFixed(1)} | ` +
      `píxeles claros: ${percentage(rightAnalysis.lightPercentage)} | ` +
      `${possibleMargins.right ? "⚠️ Posible margen" : "✅ Correcto"}`,
  );

  console.log("");
  console.log("======================================");
  console.log(" RESULTADO");
  console.log("======================================");

  if (hasPossibleMargin) {
    console.log("⚠️ REVISAR: se detectaron posibles márgenes claros.");
  } else {
    console.log("✅ APROBADA: no se detectaron márgenes claros importantes.");
  }

  console.log("");
  console.log("🖼️ Imagen de validación:");
  console.log(debugPath);
  console.log("");
}

main().catch((error) => {
  console.error("");
  console.error("❌ Error durante la validación:");
  console.error(error.message);
  process.exitCode = 1;
});
