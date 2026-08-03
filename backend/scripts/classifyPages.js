import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_DIR = path.resolve(__dirname, "..");

const INPUT_DIR = path.join(BACKEND_DIR, "public", "cropped-pages");

const OUTPUT_FILE = path.join(BACKEND_DIR, "data", "pageTypes.json");

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const VALID_SIDES = new Set(["LEFT", "RIGHT"]);

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

function parseFilename(filename) {
  const extension = path.extname(filename);

  const basename = path.basename(filename, extension);

  const match = basename.match(/^(\d{3})_([A-Z0-9]{2,4})_(LEFT|RIGHT)$/);

  if (!match) {
    return null;
  }

  const pageNumber = Number(match[1]);
  const team = match[2];
  const side = match[3];

  if (
    !Number.isInteger(pageNumber) ||
    pageNumber < 1 ||
    !VALID_SIDES.has(side)
  ) {
    return null;
  }

  return {
    pageNumber,
    team,
    type: side === "LEFT" ? "TEAM_LEFT" : "TEAM_RIGHT",
  };
}

async function loadExistingData() {
  try {
    const content = await fs.readFile(OUTPUT_FILE, "utf8");

    const parsed = JSON.parse(content);

    return Array.isArray(parsed.pages) ? parsed.pages : [];
  } catch {
    return [];
  }
}

async function main() {
  console.log("");
  console.log("======================================");
  console.log(" FIGUMATCH - INVENTARIO AUTOMÁTICO");
  console.log("======================================");
  console.log("");

  await fs.mkdir(INPUT_DIR, {
    recursive: true,
  });

  const files = await getImageFiles();

  console.log(`🖼️ Imágenes encontradas: ${files.length}`);

  if (files.length === 0) {
    console.log("⚠️ No se encontraron imágenes en public/cropped-pages.");
    return;
  }

  const previousPages = await loadExistingData();

  const previousByFile = new Map(
    previousPages.map((page) => [page.file, page]),
  );

  const pages = [];
  const invalidFiles = [];

  for (const file of files) {
    const parsed = parseFilename(file);

    if (!parsed) {
      invalidFiles.push(file);

      const previous = previousByFile.get(file);

      pages.push({
        pageNumber: previous?.pageNumber ?? null,
        file,
        type: previous?.type ?? "UNKNOWN",
        team: previous?.team ?? null,
        notes: previous?.notes ?? "Nombre de archivo no reconocido",
      });

      continue;
    }

    const previous = previousByFile.get(file);

    pages.push({
      pageNumber: parsed.pageNumber,
      file,
      type: parsed.type,
      team: parsed.team,
      notes: previous?.notes ?? "",
    });
  }

  pages.sort((a, b) => {
    const numberA = a.pageNumber ?? Number.MAX_SAFE_INTEGER;

    const numberB = b.pageNumber ?? Number.MAX_SAFE_INTEGER;

    return numberA - numberB;
  });

  const pageNumbers = pages
    .filter((page) => Number.isInteger(page.pageNumber))
    .map((page) => page.pageNumber);

  const duplicatedNumbers = pageNumbers.filter(
    (number, index) => pageNumbers.indexOf(number) !== index,
  );

  if (duplicatedNumbers.length > 0) {
    throw new Error(
      "Hay números de página repetidos:\n" +
        [...new Set(duplicatedNumbers)].join("\n"),
    );
  }

  const result = {
    version: "2.0",
    totalPages: pages.length,
    types: ["TEAM_LEFT", "TEAM_RIGHT", "UNKNOWN"],
    pages,
  };

  await fs.mkdir(path.dirname(OUTPUT_FILE), {
    recursive: true,
  });

  await fs.writeFile(OUTPUT_FILE, JSON.stringify(result, null, 2), "utf8");

  const leftCount = pages.filter((page) => page.type === "TEAM_LEFT").length;

  const rightCount = pages.filter((page) => page.type === "TEAM_RIGHT").length;

  const unknownCount = pages.filter((page) => page.type === "UNKNOWN").length;

  console.log("");
  console.log(`✅ Páginas generadas: ${pages.length}`);
  console.log(`⬅️ TEAM_LEFT: ${leftCount}`);
  console.log(`➡️ TEAM_RIGHT: ${rightCount}`);
  console.log(`❓ UNKNOWN: ${unknownCount}`);

  if (invalidFiles.length > 0) {
    console.log("");
    console.log("⚠️ Archivos con nombre no reconocido:");

    for (const file of invalidFiles) {
      console.log(`- ${file}`);
    }
  }

  console.log("");
  console.log("📄 Inventario generado en:");
  console.log(OUTPUT_FILE);
  console.log("");
}

main().catch((error) => {
  console.error("");
  console.error("❌ Error al crear el inventario:");
  console.error(error.message);
  process.exitCode = 1;
});
