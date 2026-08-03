import { Router } from "express";
import multer from "multer";
import xlsx from "xlsx";
import { query } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

router.post("/excel", requireAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se recibió ningún archivo" });
    }

    console.log("Usuario autenticado:", req.userId);

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);

    console.log("Cantidad de filas:", rows.length);
    console.log("Primera fila:", rows[0]);

    let updated = 0;
    let notFound = 0;

    for (const row of rows) {
      const code = normalize(row["Código"] || row["Codigo"] || row["code"]);
      const estado = normalize(row["Estado"]);
      const rep = Number(row["Repetidas"] || 0);

      if (!code) continue;

      let status = "me_falta";
      let quantity = 0;

      if (estado === "TENGO") {
        status = rep > 1 ? "repetida" : "tengo";
        quantity = Math.max(rep, 1);
      }

      const result = await query(
        `INSERT INTO user_stickers (user_id, sticker_id, status, quantity, updated_at)
         SELECT $1, s.id, $2, $3, now()
         FROM stickers s
         WHERE UPPER(TRIM(s.code)) = $4
         ON CONFLICT (user_id, sticker_id)
         DO UPDATE SET 
           status = EXCLUDED.status,
           quantity = EXCLUDED.quantity,
           updated_at = now()`,
        [req.userId, status, quantity, code],
      );

      if (result.rowCount > 0) updated++;
      else {
        notFound++;
        console.log("No encontrado:", code);
      }
    }

    res.json({
      ok: true,
      updated,
      notFound,
    });
  } catch (err) {
    console.log("=================================");
    console.log("MENSAJE:", err.message);
    console.log("CODIGO:", err.code);
    console.log("DETAIL:", err.detail);
    console.log("HINT:", err.hint);
    console.log("POSITION:", err.position);
    console.log("STACK:", err.stack);
    console.log("=================================");

    res.status(500).json({
      error: err.message,
    });
  }
});

export default router;
