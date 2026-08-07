import { Router } from "express";
import { query, getClient } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import {
  createNotificationSafely,
  NOTIFICATION_TYPES,
} from "../services/notificationService.js";

const router = Router();

/* =====================================================
   SOLICITUDES RECIBIDAS
===================================================== */

router.get("/received", requireAuth, async (req, res) => {
  try {
    const receiverId = Number(req.userId);

    const result = await query(
      `
      SELECT
        tr.id,
        tr.requester_id,
        requester.username AS requester_username,
        tr.receiver_id,
        tr.offered_sticker_id,
        tr.requested_sticker_id,
        tr.status,
        tr.created_at,
        tr.updated_at
      FROM trade_requests tr
      LEFT JOIN users requester
        ON requester.id = tr.requester_id
      WHERE tr.receiver_id = $1
      ORDER BY tr.created_at DESC
      `,
      [receiverId]
    );

    return res.json({
      authenticatedUserId: receiverId,
      tradeRequests: result.rows,
    });

  } catch (error) {

    console.error(
      "ERROR AL LISTAR SOLICITUDES RECIBIDAS:",
      error
    );

    return res.status(500).json({
      error:
        "No se pudieron cargar las solicitudes recibidas",
      message: error.message,
    });

  }
});

/* =====================================================
   SOLICITUDES ENVIADAS
===================================================== */

router.get("/sent", requireAuth, async (req, res) => {

  try {

    const requesterId = Number(req.userId);

    const result = await query(

      `
      SELECT
        tr.id,
        tr.requester_id,
        tr.receiver_id,
        receiver.username AS receiver_username,
        tr.offered_sticker_id,
        tr.requested_sticker_id,
        tr.status,
        tr.created_at,
        tr.updated_at
      FROM trade_requests tr
      INNER JOIN users receiver
        ON receiver.id = tr.receiver_id
      WHERE tr.requester_id = $1
      ORDER BY tr.created_at DESC
      `,

      [requesterId]

    );

    return res.json({

      tradeRequests: result.rows,

    });

  } catch (error) {

    console.error(
      "ERROR AL LISTAR SOLICITUDES ENVIADAS:",
      error
    );

    return res.status(500).json({

      error:
        "No se pudieron cargar las solicitudes enviadas",

      message: error.message,

    });

  }

});

/* =====================================================
   CREAR SOLICITUD DE INTERCAMBIO
===================================================== */

router.post("/", requireAuth, async (req, res) => {

  try {

    const requesterId = Number(req.userId);

    const {
      receiverUserId,
      offeredStickerId,
      requestedStickerId,
    } = req.body;

    if (
      !receiverUserId ||
      !offeredStickerId ||
      !requestedStickerId
    ) {      return res.status(400).json({
        error:
          "Faltan receiverUserId, offeredStickerId o requestedStickerId",
      });

    }

    const receiverId = Number(receiverUserId);
    const offeredId = Number(offeredStickerId);
    const requestedId = Number(requestedStickerId);

    if (
      !Number.isInteger(receiverId) ||
      !Number.isInteger(offeredId) ||
      !Number.isInteger(requestedId)
    ) {

      return res.status(400).json({
        error:
          "Los identificadores deben ser números válidos",
      });

    }

    if (requesterId === receiverId) {

      return res.status(400).json({
        error:
          "No podés enviarte una solicitud a vos misma",
      });

    }

    const offeredResult = await query(

      `
      SELECT sticker_id
      FROM user_stickers
      WHERE user_id = $1
        AND sticker_id = $2
        AND status = 'repetida'
      `,

      [requesterId, offeredId]

    );

    if (offeredResult.rows.length === 0) {

      return res.status(400).json({
        error:
          "La figurita ofrecida no figura como repetida en tu álbum",
      });

    }

    const requestedResult = await query(

      `
      SELECT sticker_id
      FROM user_stickers
      WHERE user_id = $1
        AND sticker_id = $2
        AND status = 'repetida'
      `,

      [receiverId, requestedId]

    );

    if (requestedResult.rows.length === 0) {

      return res.status(400).json({
        error:
          "El usuario seleccionado no tiene esa figurita como repetida",
      });

    }

    const duplicateResult = await query(

      `
      SELECT id
      FROM trade_requests
      WHERE requester_id = $1
        AND receiver_id = $2
        AND offered_sticker_id = $3
        AND requested_sticker_id = $4
        AND status = 'pending'
      `,

      [
        requesterId,
        receiverId,
        offeredId,
        requestedId,
      ]

    );

    if (duplicateResult.rows.length > 0) {

      return res.status(409).json({
        error:
          "Esta solicitud de intercambio ya fue enviada",
      });

    }

    const result = await query(

      `
      INSERT INTO trade_requests (

        requester_id,
        receiver_id,
        offered_sticker_id,
        requested_sticker_id,
        status,
        created_at,
        updated_at

      )

      VALUES (

        $1,
        $2,
        $3,
        $4,
        'pending',
        NOW(),
        NOW()

      )

      RETURNING *

      `,

      [
        requesterId,
        receiverId,
        offeredId,
        requestedId,
      ]

    );

    const io = req.app.get("io");

    const requesterUsername =
      String(req.username || "").trim() ||
      "Un coleccionista";

    await createNotificationSafely({
      io,
      userId: receiverId,
      type: NOTIFICATION_TYPES.TRADE_REQUEST,
      title: "Nueva propuesta de intercambio",
      message:
        `${requesterUsername} quiere intercambiar figuritas con vos.`,
      link: "/intercambios",
    });

    return res.status(201).json({

      message:
        "Solicitud de intercambio enviada correctamente",

      tradeRequest: result.rows[0],

    });

  } catch (error) {

    console.error(
      "ERROR AL CREAR SOLICITUD:",
      error
    );

    return res.status(500).json({

      error:
        "No se pudo crear la solicitud de intercambio",

      message: error.message,

    });

  }

});
/* =====================================================
   ACEPTAR SOLICITUD
===================================================== */

router.put("/:id/accept", requireAuth, async (req, res) => {
  try {
    const tradeId = Number(req.params.id);
    const receiverId = Number(req.userId);

    if (!Number.isInteger(tradeId) || tradeId <= 0) {
      return res.status(400).json({
        error: "Identificador de solicitud inválido",
      });
    }

    const result = await query(
      `
      UPDATE trade_requests
      SET
        status = 'accepted',
        updated_at = NOW()
      WHERE id = $1
        AND receiver_id = $2
        AND status = 'pending'
      RETURNING *
      `,
      [tradeId, receiverId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error:
          "La solicitud no existe, no te pertenece o ya fue respondida",
      });
    }

    const io = req.app.get("io");

    const receiverUsername =
      String(req.username || "").trim() ||
      "El otro coleccionista";

    await createNotificationSafely({
      io,
      userId: result.rows[0].requester_id,
      type: NOTIFICATION_TYPES.TRADE_ACCEPTED,
      title: "Intercambio aceptado",
      message:
        `${receiverUsername} aceptó tu propuesta de intercambio.`,
      link: "/intercambios",
    });

    return res.json({
      message: "Intercambio aceptado correctamente",
      tradeRequest: result.rows[0],
    });
  } catch (error) {
    console.error(
      "ERROR AL ACEPTAR INTERCAMBIO:",
      error
    );

    return res.status(500).json({
      error: "No se pudo aceptar el intercambio",
      message: error.message,
    });
  }
});

/* =====================================================
   RECHAZAR SOLICITUD
===================================================== */

router.put("/:id/reject", requireAuth, async (req, res) => {
  try {
    const tradeId = Number(req.params.id);
    const receiverId = Number(req.userId);

    if (!Number.isInteger(tradeId) || tradeId <= 0) {
      return res.status(400).json({
        error: "Identificador de solicitud inválido",
      });
    }

    const result = await query(
      `
      UPDATE trade_requests
      SET
        status = 'rejected',
        updated_at = NOW()
      WHERE id = $1
        AND receiver_id = $2
        AND status = 'pending'
      RETURNING *
      `,
      [tradeId, receiverId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error:
          "La solicitud no existe, no te pertenece o ya fue respondida",
      });
    }

    const io = req.app.get("io");

    const receiverUsername =
      String(req.username || "").trim() ||
      "El otro coleccionista";

    await createNotificationSafely({
      io,
      userId: result.rows[0].requester_id,
      type: NOTIFICATION_TYPES.TRADE_REJECTED,
      title: "Intercambio rechazado",
      message:
        `${receiverUsername} rechazó tu propuesta de intercambio.`,
      link: "/intercambios",
    });

    return res.json({
      message: "Solicitud rechazada",
      tradeRequest: result.rows[0],
    });
  } catch (error) {
    console.error(
      "ERROR AL RECHAZAR INTERCAMBIO:",
      error
    );

    return res.status(500).json({
      error: "No se pudo rechazar la solicitud",
      message: error.message,
    });
  }
});
/* =====================================================
   CANCELAR SOLICITUD ENVIADA
===================================================== */

router.put("/:id/cancel", requireAuth, async (req, res) => {
  try {
    const tradeId = Number(req.params.id);
    const requesterId = Number(req.userId);

    if (!Number.isInteger(tradeId) || tradeId <= 0) {
      return res.status(400).json({
        error: "Identificador de solicitud inválido",
      });
    }

    const result = await query(
      `
      UPDATE trade_requests
      SET
        status = 'cancelled',
        updated_at = NOW()
      WHERE id = $1
        AND requester_id = $2
        AND status = 'pending'
      RETURNING *
      `,
      [tradeId, requesterId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error:
          "La solicitud no existe, no te pertenece o ya fue respondida",
      });
    }

    const io = req.app.get("io");

    const requesterUsername =
      String(req.username || "").trim() ||
      "El otro coleccionista";

    await createNotificationSafely({
      io,
      userId: result.rows[0].receiver_id,
      type: NOTIFICATION_TYPES.TRADE_CANCELLED,
      title: "Propuesta cancelada",
      message:
        `${requesterUsername} canceló la propuesta de intercambio.`,
      link: "/intercambios",
    });

    return res.json({
      message: "Solicitud cancelada",
      tradeRequest: result.rows[0],
    });
  } catch (error) {
    console.error(
      "ERROR AL CANCELAR INTERCAMBIO:",
      error
    );

    return res.status(500).json({
      error: "No se pudo cancelar la solicitud",
      message: error.message,
    });
  }
});
/* =====================================================
   COMPLETAR INTERCAMBIO
===================================================== */

router.put("/:id/complete", requireAuth, async (req, res) => {
  const tradeId = Number(req.params.id);
  const authenticatedUserId = Number(req.userId);

  if (!Number.isInteger(tradeId) || tradeId <= 0) {
    return res.status(400).json({
      error: "Identificador de solicitud inválido",
    });
  }

  const client = await getClient();

  try {
    await client.query("BEGIN");

    const tradeResult = await client.query(
      `
      SELECT
        id,
        requester_id,
        receiver_id,
        offered_sticker_id,
        requested_sticker_id,
        status
      FROM trade_requests
      WHERE id = $1
      FOR UPDATE
      `,
      [tradeId],
    );

    if (tradeResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        error: "La solicitud de intercambio no existe",
      });
    }

    const trade = tradeResult.rows[0];
        const isParticipant =
      authenticatedUserId === Number(trade.requester_id) ||
      authenticatedUserId === Number(trade.receiver_id);

    if (!isParticipant) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        error:
          "No tenés permiso para completar este intercambio",
      });
    }

    if (trade.status !== "accepted") {
      await client.query("ROLLBACK");

      return res.status(409).json({
        error:
          "Solo se pueden completar intercambios aceptados",
      });
    } 
        const requesterStickerResult = await client.query(
      `
      SELECT
        user_id,
        sticker_id,
        status,
        quantity
      FROM user_stickers
      WHERE user_id = $1
        AND sticker_id = $2
      FOR UPDATE
      `,
      [
        trade.requester_id,
        trade.offered_sticker_id,
      ],
    );

    const requesterSticker =
      requesterStickerResult.rows[0];

    if (
      !requesterSticker ||
      requesterSticker.status !== "repetida" ||
      Number(requesterSticker.quantity || 0) < 2
    ) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        error:
          "La figurita ofrecida ya no está disponible como repetida",
      });
    }
        const receiverStickerResult = await client.query(
      `
      SELECT
        user_id,
        sticker_id,
        status,
        quantity
      FROM user_stickers
      WHERE user_id = $1
        AND sticker_id = $2
      FOR UPDATE
      `,
      [
        trade.receiver_id,
        trade.requested_sticker_id,
      ],
    );

    const receiverSticker =
      receiverStickerResult.rows[0];

    if (
      !receiverSticker ||
      receiverSticker.status !== "repetida" ||
      Number(receiverSticker.quantity || 0) < 2
    ) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        error:
          "La figurita solicitada ya no está disponible como repetida",
      });
    }
        await client.query(
      `
      UPDATE user_stickers
      SET
        quantity = quantity - 1,
        status = CASE
          WHEN quantity - 1 >= 2
            THEN 'repetida'
          ELSE 'tengo'
        END
      WHERE user_id = $1
        AND sticker_id = $2
      `,
      [
        trade.requester_id,
        trade.offered_sticker_id,
      ],
    );
        await client.query(
      `
      UPDATE user_stickers
      SET
        quantity = quantity - 1,
        status = CASE
          WHEN quantity - 1 >= 2
            THEN 'repetida'
          ELSE 'tengo'
        END
      WHERE user_id = $1
        AND sticker_id = $2
      `,
      [
        trade.receiver_id,
        trade.requested_sticker_id,
      ],
    );
        await client.query(
      `
      INSERT INTO user_stickers (
        user_id,
        sticker_id,
        status,
        quantity
      )
      VALUES (
        $1,
        $2,
        'tengo',
        1
      )
      ON CONFLICT (user_id, sticker_id)
      DO UPDATE SET
        quantity = user_stickers.quantity + 1,
        status = CASE
          WHEN user_stickers.quantity + 1 >= 2
            THEN 'repetida'
          ELSE 'tengo'
        END
      `,
      [
        trade.receiver_id,
        trade.offered_sticker_id,
      ],
    );
        await client.query(
      `
      INSERT INTO user_stickers (
        user_id,
        sticker_id,
        status,
        quantity
      )
      VALUES (
        $1,
        $2,
        'tengo',
        1
      )
      ON CONFLICT (user_id, sticker_id)
      DO UPDATE SET
        quantity = user_stickers.quantity + 1,
        status = CASE
          WHEN user_stickers.quantity + 1 >= 2
            THEN 'repetida'
          ELSE 'tengo'
        END
      `,
      [
        trade.requester_id,
        trade.requested_sticker_id,
      ],
    );
        const completedResult = await client.query(
      `
      UPDATE trade_requests
      SET
        status = 'completed',
        updated_at = NOW()
      WHERE id = $1
        AND status = 'accepted'
      RETURNING *
      `,
      [tradeId],
    );

    if (completedResult.rows.length === 0) {
      throw new Error(
        "No se pudo marcar el intercambio como completado",
      );
    }

    await client.query("COMMIT");

    const completedTrade = completedResult.rows[0];
        const io = req.app.get("io");

    const notificationType =
      NOTIFICATION_TYPES.TRADE_COMPLETED ||
      "trade_completed";

    await createNotificationSafely({
      io,
      userId: completedTrade.requester_id,
      type: notificationType,
      title: "Intercambio completado",
      message:
        "Tu intercambio fue completado y tu álbum fue actualizado.",
      link: "/intercambios",
    });

    await createNotificationSafely({
      io,
      userId: completedTrade.receiver_id,
      type: notificationType,
      title: "Intercambio completado",
      message:
        "Tu intercambio fue completado y tu álbum fue actualizado.",
      link: "/intercambios",
    });

    return res.json({
      message: "Intercambio completado correctamente",
      tradeRequest: completedTrade,
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error(
        "ERROR AL HACER ROLLBACK:",
        rollbackError,
      );
    }

    console.error(
      "ERROR AL COMPLETAR INTERCAMBIO:",
      error,
    );

    return res.status(500).json({
      error: "No se pudo completar el intercambio",
      message: error.message,
    });
  } finally {
    client.release();
  }
});

  export default router;