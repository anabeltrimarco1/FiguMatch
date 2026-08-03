const sharp = require("sharp");
const { glob } = require("glob");
const path = require("path");
const fs = require("fs");

(async () => {
  const files = await glob("public/shields/*.{png,jpg,jpeg,webp}");

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const dir = path.dirname(file);
    const base = path.basename(file, ext);

    const output = path.join(dir, `${base}.png`);
    const temp = path.join(dir, `${base}.tmp.png`);

    try {
      await sharp(file)
        .trim()
        .resize(256, 256, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toFile(temp);

      if (fs.existsSync(output)) {
        fs.unlinkSync(output);
      }

      fs.renameSync(temp, output);

      if (file !== output && fs.existsSync(file)) {
        fs.unlinkSync(file);
      }

      console.log("✔", output);
    } catch (error) {
      console.error("✖ Error en:", file);
      console.error(error.message);

      if (fs.existsSync(temp)) {
        fs.unlinkSync(temp);
      }
    }
  }

  console.log("Todos los escudos fueron normalizados.");
})();
