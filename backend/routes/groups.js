import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

/**
 * GET /api/groups
 * Devuelve los 12 grupos con sus selecciones.
 */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        group_code,
        json_agg(
          json_build_object(
            'code', code,
            'name', name,
            'flag', flag_emoji
          )
          ORDER BY name
        ) AS teams
      FROM teams
      GROUP BY group_code
      ORDER BY group_code
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener grupos:", error);

    res.status(500).json({
      error: "No se pudieron obtener los grupos.",
    });
  }
});

/**
 * GET /api/groups/A
 * Devuelve las cuatro selecciones de un grupo.
 */
router.get("/:groupCode", async (req, res) => {
  try {
    const groupCode = String(req.params.groupCode).trim().toUpperCase();

    const result = await pool.query(
      `
        SELECT
          code,
          name,
          group_code,
          flag_emoji
        FROM teams
        WHERE group_code = $1
        ORDER BY name
      `,
      [groupCode],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Grupo no encontrado.",
      });
    }

    res.json({
      group: groupCode,
      teams: result.rows,
    });
  } catch (error) {
    console.error("Error al obtener el grupo:", error);

    res.status(500).json({
      error: "No se pudo obtener el grupo.",
    });
  }
});

export default router;
