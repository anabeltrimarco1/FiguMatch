import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

/*
 * GET /api/stickers
 * Filtros opcionales:
 * ?team=MEX
 * ?group=A
 * ?search=messi
 */
router.get("/", async (req, res) => {
  try {
    const team = req.query.team
      ? String(req.query.team).trim().toUpperCase()
      : null;

    const group = req.query.group
      ? String(req.query.group).trim().toUpperCase()
      : null;

    const search = req.query.search ? String(req.query.search).trim() : null;

    const conditions = [];
    const values = [];

    if (team) {
      values.push(team);
      conditions.push(`s.team_code = $${values.length}`);
    }

    if (group) {
      values.push(group);
      conditions.push(`t.group_code = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`
        (
          s.name ILIKE $${values.length}
          OR s.code ILIKE $${values.length}
          OR t.name ILIKE $${values.length}
        )
      `);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await pool.query(
      `
        SELECT
          s.id,
          s.code,
          s.team_code,
          t.name AS team_name,
          t.group_code,
          t.flag_emoji,
          s.number AS sticker_number,
          s.category,
          s.name AS sticker_name,
          s.display_emoji,
          s.display_label,
          s.player_position
        FROM stickers s
        JOIN teams t
          ON t.code = s.team_code
        ${whereClause}
        ORDER BY
          t.group_code,
          t.name,
          s.number
      `,
      values,
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener figuritas:", error);

    res.status(500).json({
      error: "No se pudieron obtener las figuritas.",
    });
  }
});

/*
 * GET /api/stickers/team/:teamCode
 * Devuelve las 20 figuritas de una selección.
 */
router.get("/team/:teamCode", async (req, res) => {
  try {
    const teamCode = req.params.teamCode.trim().toUpperCase();

    const result = await pool.query(
      `
          SELECT
            s.id,
            s.code,
            s.team_code,
            t.name AS team_name,
            t.group_code,
            t.flag_emoji,
            s.number AS sticker_number,
            s.category,
            s.name AS sticker_name,
            s.display_emoji,
            s.display_label,
            s.player_position
          FROM stickers s
          JOIN teams t
            ON t.code = s.team_code
          WHERE s.team_code = $1
          ORDER BY s.number
        `,
      [teamCode],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "No se encontraron figuritas.",
      });
    }

    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener figuritas del equipo:", error);

    res.status(500).json({
      error: "No se pudieron obtener las figuritas del equipo.",
    });
  }
});

/*
 * GET /api/stickers/:code
 * Acepta códigos como:
 * MEX_01
 * MEX 1
 */
router.get("/:code", async (req, res) => {
  try {
    const rawCode = decodeURIComponent(req.params.code).trim().toUpperCase();

    const normalizedCode = rawCode.replace("_", " ").replace(/\s+/g, " ");

    const result = await pool.query(
      `
        SELECT
          s.id,
          s.code,
          s.team_code,
          t.name AS team_name,
          t.group_code,
          t.flag_emoji,
          s.number AS sticker_number,
          s.category,
          s.name AS sticker_name,
          s.display_emoji,
          s.display_label,
          s.player_position
        FROM stickers s
        JOIN teams t
          ON t.code = s.team_code
        WHERE UPPER(s.code) = $1
      `,
      [normalizedCode],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Figurita no encontrada.",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al obtener la figurita:", error);

    res.status(500).json({
      error: "No se pudo obtener la figurita.",
    });
  }
});

export default router;
