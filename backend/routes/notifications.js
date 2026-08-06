import { Router } from "express";
import { query } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function normalizeLimit(value) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 30;
  }

  return Math.min(parsed, 100);
}

// GET /api/notifications
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = Number(req.userId);
    const limit = normalizeLimit(req.query.limit);

    const result = await query(
      `
      SELECT
        id,
        type,
        title,
        message,
        link,
        is_read,
        created_at,
        read_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
      `,
      [userId, limit],
    );

    const unreadResult = await query(
      `
      SELECT COUNT(*)::INTEGER AS unread_count
      FROM notifications
      WHERE user_id = $1
        AND is_read = FALSE
      `,
      [userId],
    );

    return res.json({
      notifications: result.rows,
      unreadCount: unreadResult.rows[0]?.unread_count || 0,
    });
  } catch (error) {
    console.error("ERROR AL LISTAR NOTIFICACIONES:", error);

    return res.status(500).json({
      error: "No se pudieron cargar las notificaciones.",
    });
  }
});

// PUT /api/notifications/read-all
router.put("/read-all", requireAuth, async (req, res) => {
  try {
    const userId = Number(req.userId);

    await query(
      `
      UPDATE notifications
      SET
        is_read = TRUE,
        read_at = COALESCE(read_at, NOW())
      WHERE user_id = $1
        AND is_read = FALSE
      `,
      [userId],
    );

    return res.json({
      message: "Notificaciones marcadas como leídas.",
    });
  } catch (error) {
    console.error("ERROR AL MARCAR TODAS COMO LEÍDAS:", error);

    return res.status(500).json({
      error: "No se pudieron actualizar las notificaciones.",
    });
  }
});

// PUT /api/notifications/:id/read
router.put("/:id/read", requireAuth, async (req, res) => {
  try {
    const userId = Number(req.userId);
    const notificationId = Number(req.params.id);

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({
        error: "Notificación inválida.",
      });
    }

    const result = await query(
      `
      UPDATE notifications
      SET
        is_read = TRUE,
        read_at = COALESCE(read_at, NOW())
      WHERE id = $1
        AND user_id = $2
      RETURNING
        id,
        type,
        title,
        message,
        link,
        is_read,
        created_at,
        read_at
      `,
      [notificationId, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "La notificación no existe.",
      });
    }

    return res.json({
      notification: result.rows[0],
    });
  } catch (error) {
    console.error("ERROR AL MARCAR NOTIFICACIÓN:", error);

    return res.status(500).json({
      error: "No se pudo actualizar la notificación.",
    });
  }
});

// DELETE /api/notifications/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const userId = Number(req.userId);
    const notificationId = Number(req.params.id);

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({
        error: "Notificación inválida.",
      });
    }

    const result = await query(
      `
      DELETE FROM notifications
      WHERE id = $1
        AND user_id = $2
      RETURNING id
      `,
      [notificationId, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "La notificación no existe.",
      });
    }

    return res.json({
      message: "Notificación eliminada.",
    });
  } catch (error) {
    console.error("ERROR AL ELIMINAR NOTIFICACIÓN:", error);

    return res.status(500).json({
      error: "No se pudo eliminar la notificación.",
    });
  }
});

export default router;
