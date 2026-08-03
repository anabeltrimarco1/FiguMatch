import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_DIR = path.resolve(__dirname, "..");

const INPUT_DIR = path.join(BACKEND_DIR, "public", "oriented");

const RENAME_FILE = path.join(BACKEND_DIR, "renombrar-paginas.txt");

function decodeText(buffer) {
  const isUtf16LE =
    buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe;

  const isUtf16BE =
    buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff;

  if (isUtf16LE) {
    return buffer.subarray(2).toString("utf16le");
  }

  if (isUtf16BE) {
    const bytes = Buffer.from(buffer.subarray(2));

    for (let index = 0; index < bytes.length - 1; index += 2) {
      const first = bytes[index];
      bytes[index] = bytes[index + 1];
      bytes[index + 1] = first;
    }

    return bytes.toString("utf16le");
  }

  return buffer.toString("utf8");
}

async function loadRenameInstructions() {
  const buffer = await fs.readFile(RENAME_FILE);
  const content = decodeText(buffer);

  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const instructions = lines.map((line, index) => {
    const separatorIndex = line.indexOf("|");

    if (separatorIndex === -1) {
      throw new Error(
        `Línea ${index + 1} inválida. ` +
          "Debe tener el formato nombre-actual.jpg|nombre-nuevo.jpg",
      );
    }

    const oldName = line.slice(0, separatorIndex).trim();

    const newName = line.slice(separatorIndex + 1).trim();

    if (!oldName || !newName) {
      throw new Error(
        `Línea ${index + 1} inválida. ` +
          "El nombre actual y el nombre nuevo son obligatorios.",
      );
    }

    return {
      oldName,
      newName,
    };
  });

  return instructions;
}

function validateDuplicates(instructions) {
  const oldNames = instructions.map((instruction) => instruction.oldName);

  const newNames = instructions.map((instruction) => instruction.newName);

  const duplicatedOldNames = oldNames.filter(
    (name, index) => oldNames.indexOf(name) !== index,
  );

  const duplicatedNewNames = newNames.filter(
    (name, index) => newNames.indexOf(name) !== index,
  );

  if (duplicatedOldNames.length > 0) {
    throw new Error(
      "Hay nombres actuales repetidos:\n" +
        [...new Set(duplicatedOldNames)].join("\n"),
    );
  }

  if (duplicatedNewNames.length > 0) {
    throw new Error(
      "Hay nombres nuevos repetidos:\n" +
        [...new Set(duplicatedNewNames)].join("\n"),
    );
  }
}

async function validateFiles(instructions) {
  const missingFiles = [];
  const occupiedNames = [];

  for (const instruction of instructions) {
    const oldPath = path.join(INPUT_DIR, instruction.oldName);

    const newPath = path.join(INPUT_DIR, instruction.newName);

    try {
      const stats = await fs.stat(oldPath);

      if (!stats.isFile()) {
        missingFiles.push(instruction.oldName);
      }
    } catch {
      missingFiles.push(instruction.oldName);
    }

    if (
      instruction.oldName.toLowerCase() !== instruction.newName.toLowerCase()
    ) {
      try {
        await fs.access(newPath);
        occupiedNames.push(instruction.newName);
      } catch {
        // El nombre nuevo todavía no existe.
      }
    }
  }

  if (missingFiles.length > 0) {
    throw new Error(
      "Estos archivos no existen en public/oriented:\n" +
        missingFiles.join("\n"),
    );
  }

  if (occupiedNames.length > 0) {
    throw new Error(
      "Estos nombres nuevos ya existen en public/oriented:\n" +
        occupiedNames.join("\n"),
    );
  }
}

async function renameUsingTemporaryNames(instructions) {
  const temporaryInstructions = [];

  for (let index = 0; index < instructions.length; index += 1) {
    const instruction = instructions[index];

    if (instruction.oldName === instruction.newName) {
      continue;
    }

    const oldPath = path.join(INPUT_DIR, instruction.oldName);

    const temporaryName =
      `__rename_temp_${String(index + 1).padStart(3, "0")}__` +
      path.extname(instruction.oldName);

    const temporaryPath = path.join(INPUT_DIR, temporaryName);

    await fs.rename(oldPath, temporaryPath);

    temporaryInstructions.push({
      temporaryName,
      newName: instruction.newName,
    });
  }

  for (const instruction of temporaryInstructions) {
    const temporaryPath = path.join(INPUT_DIR, instruction.temporaryName);

    const newPath = path.join(INPUT_DIR, instruction.newName);

    await fs.rename(temporaryPath, newPath);

    console.log(`✅ ${instruction.newName}`);
  }

  return temporaryInstructions.length;
}

async function main() {
  console.log("");
  console.log("======================================");
  console.log(" FIGUMATCH - RENOMBRADO DE PÁGINAS");
  console.log("======================================");
  console.log("");

  await fs.mkdir(INPUT_DIR, {
    recursive: true,
  });

  const instructions = await loadRenameInstructions();

  console.log(`📄 Instrucciones encontradas: ${instructions.length}`);
  console.log(`📁 Carpeta: ${INPUT_DIR}`);
  console.log("");

  if (instructions.length === 0) {
    console.log("⚠️ renombrar-paginas.txt está vacío.");
    return;
  }

  validateDuplicates(instructions);
  await validateFiles(instructions);

  const renamed = await renameUsingTemporaryNames(instructions);

  console.log("");
  console.log("======================================");
  console.log(" RESULTADO");
  console.log("======================================");
  console.log(`✅ Renombradas: ${renamed}`);
  console.log(`⏭️ Sin cambios: ${instructions.length - renamed}`);
  console.log("");
}

main().catch((error) => {
  console.error("");
  console.error("❌ Error durante el renombrado:");
  console.error(error.message);
  process.exitCode = 1;
});
