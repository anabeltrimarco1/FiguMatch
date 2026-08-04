import { Router } from "express";
import { query } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/*
POST /api/trade-requests

Body:
{
  "receiverUserId": 2,
  "offeredStickerId": 15,
  "requestedStickerId": 27
}
*/
/*
GET /api/trade-requests/received
Lista las solicitudes recibidas por el usuario autenticado.
*/
router.get("/received", requireAuth, async (req, res) => {
  try {
    const receiverId = Number(req.userId);

    console.log("USUARIO AUTENTICADO:", req.userId);
    console.log("receiverId convertido:", receiverId);

    const allRequests = await query(
      `
      SELECT
        id,
        requester_id,
        receiver_id,
        offered_sticker_id,
        requested_sticker_id,
        status
      FROM trade_requests
      ORDER BY id
      `,
    );

    console.log("TODAS LAS SOLICITUDES DE LA BASE:", allRequests.rows);

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
      [receiverId],
    );

    console.log("SOLICITUDES RECIBIDAS PARA EL USUARIO:", result.rows);

    return res.json({
      authenticatedUserId: receiverId,
      allTradeRequests: allRequests.rows,
      tradeRequests: result.rows,
    });
  } catch (error) {
    console.error("ERROR AL LISTAR SOLICITUDES RECIBIDAS:", error);

    return res.status(500).json({
      error: "No se pudieron cargar las solicitudes recibidas",
      message: error.message,
    });
  }
});

/*
GET /api/trade-requests/sent
Lista las solicitudes enviadas por el usuario autenticado.
*/
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
      [requesterId],
    );

    return res.json({
      tradeRequests: result.rows,
    });
  } catch (error) {
    console.error("ERROR AL LISTAR SOLICITUDES ENVIADAS:", error);

    return res.status(500).json({
      error: "No se pudieron cargar las solicitudes enviadas",
      message: error.message,
    });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const requesterId = req.userId;

    const { receiverUserId, offeredStickerId, requestedStickerId } = req.body;

    console.log("===== DEBUG TRADE REQUEST =====");
    console.log("requesterId:", requesterId);
    console.log("receiverUserId:", receiverUserId);
    console.log("offeredStickerId:", offeredStickerId);
    console.log("requestedStickerId:", requestedStickerId);

    if (!receiverUserId || !offeredStickerId || !requestedStickerId) {
      return res.status(400).json({
        error: "Faltan receiverUserId, offeredStickerId o requestedStickerId",
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
        error: "Los identificadores deben ser números válidos",
      });
    }

    if (requesterId === receiverId) {
      return res.status(400).json({
        error: "No podés enviarte una solicitud a vos misma",
      });
    }

    /*
    Verificar que la figurita ofrecida sea una repetida
    del usuario que realiza la solicitud.
    */
    const offeredResult = await query(
      `
        SELECT sticker_id
        FROM user_stickers
        WHERE user_id = $1
        AND sticker_id = $2
        AND status = 'repetida'
     `,
      [requesterId, offeredId],
    );

    console.log("offeredResult:", offeredResult.rows);

    if (offeredResult.rows.length === 0) {
      return res.status(400).json({
        error: "La figurita ofrecida no figura como repetida en tu álbum",
      });
    }

    /*
    Verificar que el receptor tenga como repetida
    la figurita solicitada.
    */
    const requestedResult = await query(
      `
      SELECT sticker_id
      FROM user_stickers
      WHERE user_id = $1
        AND sticker_id = $2
        AND status = 'repetida'
      `,
      [receiverId, requestedId],
    );

    if (requestedResult.rows.length === 0) {
      return res.status(400).json({
        error: "El usuario seleccionado no tiene esa figurita como repetida",
      });
    }

    /*
    Evitar solicitudes pendientes duplicadas.
    */
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
      [requesterId, receiverId, offeredId, requestedId],
    );

    if (duplicateResult.rows.length > 0) {
      return res.status(409).json({
        error: "Esta solicitud de intercambio ya fue enviada",
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
      VALUES ($1, $2, $3, $4, 'pending', NOW(), NOW())
      RETURNING *
      `,
      [requesterId, receiverId, offeredId, requestedId],
    );

    return res.status(201).json({
      message: "Solicitud de intercambio enviada correctamente",
      tradeRequest: result.rows[0],
    });
  } catch (error) {
    console.error("ERROR COMPLETO:", error);
    console.error("MENSAJE:", error.message);
    console.error("CÓDIGO:", error.code);
    console.error("DETALLE:", error.detail);

    return res.status(500).json({
      error: "No se pudo crear la solicitud de intercambio",
      message: error.message,
      code: error.code,
      detail: error.detail,
    });
  }
});
/*
PUT /api/trade-requests/:id/accept
*/
router.put("/:id/accept", requireAuth, async (req, res) => {
  try {
    const tradeId = Number(req.params.id);

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
      [tradeId, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Solicitud no encontrada",
      });
    }

    return res.json({
      success: true,
      tradeRequest: result.rows[0],
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message,
    });
  }
});
/*
PUT /api/trade-requests/:id/reject
*/
router.put("/:id/reject", requireAuth, async (req, res) => {
  try {
    const tradeId = Number(req.params.id);

    const result = await query(
      `
      UPDATE trade_requests
      SET
        status='rejected',
        updated_at=NOW()
      WHERE id=$1
        AND receiver_id=$2
        AND status='pending'
      RETURNING *
      `,
      [tradeId, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error:"Solicitud no encontrada",
      });
    }

    res.json({
      success:true,
      tradeRequest:result.rows[0],
    });

  } catch(error){

    res.status(500).json({
      error:error.message,
    });

  }
});
/*
PUT /api/trade-requests/:id/cancel
*/
router.put("/:id/cancel", requireAuth, async (req,res)=>{

  try{

    const tradeId=Number(req.params.id);

    const result=await query(

      `
      UPDATE trade_requests
      SET
        status='cancelled',
        updated_at=NOW()
      WHERE id=$1
        AND requester_id=$2
        AND status='pending'
      RETURNING *
      `,

      [tradeId,req.userId]

    );

    if(result.rows.length===0){

      return res.status(404).json({
        error:"Solicitud no encontrada",
      });

    }

    res.json({

      success:true,
      tradeRequest:result.rows[0],

    });

  }
  catch(error){

    res.status(500).json({

      error:error.message,

    });

  }

});

export default router;
