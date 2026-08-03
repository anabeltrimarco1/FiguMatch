import { Router } from "express";
import { query } from "../src/config/db.js";
import { requireAuth } from "../src/middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT 
          s.id,
          s.group_name,
          s.team,
          s.code,
          s.number,
          s.category,
          s.name,
          s.image_path,
          COALESCE(us.status, 'me_falta') AS status,
          COALESCE(us.quantity, 0) AS quantity
       FROM stickers s
       LEFT JOIN user_stickers us 
         ON us.sticker_id = s.id 
        AND us.user_id = $1
       ORDER BY s.number`,
      [req.userId],
    );

    res.json(result.rows);
  } catch (err) {
    console.error("ERROR AL CARGAR ÁLBUM:", err.message);
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/:stickerId", requireAuth, async (req, res) => {
  try {
    const stickerId = Number(req.params.stickerId);
    const { status, quantity } = req.body;

    const validStatuses = ["tengo", "repetida", "me_falta"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Estado inválido" });
    }

    const qty = Number.isInteger(quantity)
      ? quantity
      : status === "me_falta"
        ? 0
        : 1;

    await query(
      `INSERT INTO user_stickers (user_id, sticker_id, status, quantity, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (user_id, sticker_id)
       DO UPDATE SET 
         status = EXCLUDED.status,
         quantity = EXCLUDED.quantity,
         updated_at = now()`,
      [req.userId, stickerId, status, qty],
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("ERROR AL ACTUALIZAR FIGURITA:", err.message);
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
