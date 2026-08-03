import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_DIR = path.resolve(__dirname, "..");
const PAGE_NAME = "001_MEX_LEFT.jpg";

const PAGE_PATH = path.join(BACKEND_DIR, "public", "cropped-pages", PAGE_NAME);

const TEMPLATE_PATH = path.join(BACKEND_DIR, "templates", "TEAM_LEFT.json");

const OUTPUT_DIR = path.join(BACKEND_DIR, "public", "debug", "stickers-test");

async function loadTemplate() {
  const content = await fs.readFile(TEMPLATE_PATH, "utf8");

  return JSON.parse(content);
}

async function createOutputFolder() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

async function cropSticker(sticker) {
  const outputName = `MEX_${String(sticker.number).padStart(2, "0")}.jpg`;

  const outputPath = path.join(OUTPUT_DIR, outputName);

  await sharp(PAGE_PATH)
    .extract({
      left: sticker.left,
      top: sticker.top,
      width: sticker.width,
      height: sticker.height,
    })

    .jpeg({
      quality: 100,
      chromaSubsampling: "4:4:4",
    })

    .toFile(outputPath);

  console.log(`✅ ${outputName}`);
}

async function main() {
  console.log("");
  console.log("======================================");
  console.log(" FIGUMATCH - TEMPLATE TEST");
  console.log("======================================");
  console.log("");

  await createOutputFolder();

  const template = await loadTemplate();

  console.log(`📄 Página : ${PAGE_NAME}`);
  console.log(`📄 Layout : ${template.layout}`);
  console.log("");

  for (const sticker of template.stickers) {
    await cropSticker(sticker);
  }

  console.log("");
  console.log("======================================");
  console.log(" RESULTADO");
  console.log("======================================");
  console.log("");

  console.log(`📁 Los recortes fueron guardados en:`);

  console.log(OUTPUT_DIR);

  console.log("");
}

main().catch((error) => {
  console.error("");
  console.error("❌ Error:");
  console.error(error.message);

  process.exitCode = 1;
});
