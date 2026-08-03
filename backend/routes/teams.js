import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

/*
 * GET /api/teams
 * Devuelve las 48 selecciones.
 */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        code,
        name,
        group_code,
        flag_emoji
      FROM teams
      ORDER BY group_code, name
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener selecciones:", error);

    res.status(500).json({
      error: "No se pudieron obtener las selecciones.",
    });
  }
});

/*
 * GET /api/teams/:code
 * Devuelve una selección.
 */
router.get("/:code", async (req, res) => {
  try {
    const code = req.params.code.trim().toUpperCase();

    const result = await pool.query(
      `
        SELECT
          code,
          name,
          group_code,
          flag_emoji
        FROM teams
        WHERE code = $1
      `,
      [code],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Selección no encontrada.",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al obtener la selección:", error);

    res.status(500).json({
      error: "No se pudo obtener la selección.",
    });
  }
});

export default router;
