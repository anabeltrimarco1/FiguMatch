import { Router } from "express";
import { query } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/*
=========================================
ÁLBUM COMPLETO
=========================================
*/

router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await query(
      `
      SELECT
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
      ORDER BY s.number
      `,
      [req.userId],
    );

    res.json(result.rows);
  } catch (err) {
    console.error("ERROR AL CARGAR ÁLBUM:", err.message);
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
});

/*
=========================================
ESTADÍSTICAS GENERALES
=========================================
*/

router.get("/stats", requireAuth, async (req, res) => {
  try {
    const result = await query(
      `
      SELECT

      COUNT(s.id)::INTEGER AS total,

      COUNT(s.id) FILTER (
      WHERE COALESCE(us.quantity,0) >= 1
      )::INTEGER AS owned,

      COUNT(s.id) FILTER (
      WHERE COALESCE(us.quantity,0) = 0
      )::INTEGER AS missing,

      COUNT(s.id) FILTER (
      WHERE COALESCE(us.quantity,0) >= 2
      )::INTEGER AS repeated,

      ROUND(
      (
      COUNT(s.id) FILTER (
      WHERE COALESCE(us.quantity,0) >=1
      )::NUMERIC

      /

      NULLIF(COUNT(s.id),0)

      ) *100,1
      ) AS progress

      FROM stickers s

      LEFT JOIN user_stickers us
      ON us.sticker_id = s.id
      AND us.user_id = $1
      `,
      [req.userId],
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
});

/*
=========================================
FIGURITAS FALTANTES
=========================================
*/

router.get("/missing", requireAuth, async (req, res) => {
  try {
    const result = await query(
      `
      SELECT
      s.*,
      COALESCE(us.quantity,0) AS quantity

      FROM stickers s

      LEFT JOIN user_stickers us
      ON us.sticker_id = s.id
      AND us.user_id = $1

      WHERE COALESCE(us.quantity,0)=0

      ORDER BY s.number
      `,
      [req.userId],
    );

    res.json({
      total: result.rowCount,
      stickers: result.rows,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
});

/*
=========================================
FIGURITAS REPETIDAS
=========================================
*/

router.get("/repeated", requireAuth, async (req, res) => {
  try {
    const result = await query(
      `
      SELECT
      s.*,
      us.quantity

      FROM user_stickers us

      JOIN stickers s
      ON s.id = us.sticker_id

      WHERE
      us.user_id = $1
      AND us.quantity >=2

      ORDER BY s.number
      `,
      [req.userId],
    );

    res.json({
      total: result.rowCount,
      stickers: result.rows,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
});

/*
=========================================
FIGURITAS COMPLETADAS
=========================================
*/

router.get("/completed", requireAuth, async (req, res) => {
  try {
    const result = await query(
      `
      SELECT
      s.*,
      us.quantity

      FROM user_stickers us

      JOIN stickers s
      ON s.id = us.sticker_id

      WHERE
      us.user_id = $1
      AND us.quantity >=1

      ORDER BY s.number
      `,
      [req.userId],
    );

    res.json({
      total: result.rowCount,
      stickers: result.rows,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
});

/*
=========================================
PROGRESO POR SELECCIÓN
=========================================
*/

router.get("/progress-by-team", requireAuth, async (req, res) => {
  try {
    const result = await query(
      `
      SELECT

      s.team,

      COUNT(*)::INTEGER AS total,

      COUNT(*) FILTER (
      WHERE COALESCE(us.quantity,0)>=1
      )::INTEGER AS owned,

      ROUND(

      (
      COUNT(*) FILTER (
      WHERE COALESCE(us.quantity,0)>=1
      )::NUMERIC

      /

      NULLIF(COUNT(*),0)

      )*100,1

      ) AS progress

      FROM stickers s

      LEFT JOIN user_stickers us
      ON us.sticker_id = s.id
      AND us.user_id = $1

      GROUP BY s.team

      ORDER BY s.team
      `,
      [req.userId],
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
});

/*
=========================================
ACTUALIZAR FIGURITA
=========================================
*/

router.put("/:stickerId", requireAuth, async (req, res) => {
  try {
    const stickerId = Number(req.params.stickerId);

    const { status, quantity } = req.body;

    const validStatuses = ["tengo", "repetida", "me_falta"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: "Estado inválido",
      });
    }

    const qty = Number.isInteger(quantity)
      ? quantity
      : status === "me_falta"
        ? 0
        : 1;

    await query(
      `
      INSERT INTO user_stickers
      (
        user_id,
        sticker_id,
        status,
        quantity,
        updated_at
      )

      VALUES
      (
        $1,
        $2,
        $3,
        $4,
        now()
      )

      ON CONFLICT (user_id, sticker_id)

      DO UPDATE SET

      status = EXCLUDED.status,
      quantity = EXCLUDED.quantity,
      updated_at = now()
      `,
      [req.userId, stickerId, status, qty],
    );

    res.json({
      ok: true,
    });
  } catch (err) {
    console.error("ERROR AL ACTUALIZAR FIGURITA:", err.message);
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
});

export default router;
