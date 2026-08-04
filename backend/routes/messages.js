import express from "express";
import { pool } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

/*
  GET /api/messages/conversations

  Devuelve todas las conversaciones del usuario autenticado,
  ordenadas por el mensaje más reciente.
*/
router.get("/conversations", requireAuth, async (req, res) => {
  try {
    const authenticatedUserId = Number(req.userId);

    if (
      !Number.isInteger(authenticatedUserId) ||
      authenticatedUserId <= 0
    ) {
      return res.status(401).json({
        ok: false,
        message: "Usuario no autenticado.",
      });
    }

    const result = await pool.query(
      `
     SELECT DISTINCT ON (other_user_id)
  other_user_id AS id,
  username,
  content AS last_message,
  created_at AS last_message_at
FROM (
  SELECT
    CASE
      WHEN m.sender_id = $1 THEN m.receiver_id
      ELSE m.sender_id
      END AS other_user_id,

      TRIM(u.username) AS username,
      m.content,
      m.created_at

      FROM messages m

        JOIN users u
          ON u.id = CASE
            WHEN m.sender_id = $1 THEN m.receiver_id
            ELSE m.sender_id
          END

        WHERE
          m.sender_id = $1
          OR m.receiver_id = $1
      ) AS conversation_messages

      ORDER BY
        other_user_id,
        created_at DESC
      `,
      [authenticatedUserId]
    );

    const conversations = [...result.rows].sort(
      (firstConversation, secondConversation) =>
        new Date(secondConversation.last_message_at).getTime() -
        new Date(firstConversation.last_message_at).getTime()
    );

    return res.json({
      ok: true,
      conversations,
    });
  } catch (error) {
    console.error("Error al cargar conversaciones:", error);

    return res.status(500).json({
      ok: false,
      message: "No se pudieron cargar las conversaciones.",
    });
  }
});

/*
  GET /api/messages/:userId

  Devuelve todos los mensajes entre el usuario autenticado
  y el usuario indicado.
*/
router.get("/:userId", requireAuth, async (req, res) => {
  try {
    const authenticatedUserId = Number(req.userId);
    const otherUserId = Number(req.params.userId);

    if (!Number.isInteger(otherUserId) || otherUserId <= 0) {
      return res.status(400).json({
        ok: false,
        message: "El usuario indicado no es válido.",
      });
    }

    if (authenticatedUserId === otherUserId) {
      return res.status(400).json({
        ok: false,
        message: "No podés abrir una conversación con vos misma.",
      });
    }

    const userResult = await pool.query(
      `
      SELECT
        id,
        TRIM(username) AS username
      FROM users
      WHERE id = $1
      `,
      [otherUserId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "El usuario no existe.",
      });
    }
 
    const messagesResult = await pool.query(
      `
      SELECT
      m.id,
      m.trade_request_id,
      m.sender_id,
      m.receiver_id,
      m.content AS body,
      m.created_at,
      TRIM(sender.username) AS sender_username,
      TRIM(receiver.username) AS receiver_username

      FROM messages m

      JOIN users sender
        ON sender.id = m.sender_id

      JOIN users receiver
        ON receiver.id = m.receiver_id

      WHERE
        (
          m.sender_id = $1
          AND m.receiver_id = $2
        )
        OR
        (
          m.sender_id = $2
          AND m.receiver_id = $1
        )

      ORDER BY
        m.created_at ASC,
        m.id ASC
      `,
      [authenticatedUserId, otherUserId]
    );

    return res.json({
      ok: true,
      user: userResult.rows[0],
      messages: messagesResult.rows,
    });
  } catch (error) {
    console.error("Error al cargar mensajes:", error);

    return res.status(500).json({
      ok: false,
      message: "No se pudieron cargar los mensajes.",
    });
  }
});

/*
  POST /api/messages

  Body esperado:

  {
    "receiverUserId": 2,
    "body": "Hola Martín",
    "tradeRequestId": 1
  }

  tradeRequestId es opcional.
*/
router.post("/", requireAuth, async (req, res) => {
  try {
    const senderUserId = Number(req.userId);
    const receiverUserId = Number(req.body.receiverUserId);
    const body = String(req.body.body || "").trim();

    const tradeRequestId =
      req.body.tradeRequestId === null ||
      req.body.tradeRequestId === undefined ||
      req.body.tradeRequestId === ""
        ? null
        : Number(req.body.tradeRequestId);

    if (
      !Number.isInteger(senderUserId) ||
      senderUserId <= 0
    ) {
      return res.status(401).json({
        ok: false,
        message: "Usuario no autenticado.",
      });
    }

    if (
      !Number.isInteger(receiverUserId) ||
      receiverUserId <= 0
    ) {
      return res.status(400).json({
        ok: false,
        message: "El destinatario no es válido.",
      });
    }

    if (senderUserId === receiverUserId) {
      return res.status(400).json({
        ok: false,
        message: "No podés enviarte mensajes a vos misma.",
      });
    }

    if (!body) {
      return res.status(400).json({
        ok: false,
        message: "El mensaje está vacío.",
      });
    }

    if (body.length > 1000) {
      return res.status(400).json({
        ok: false,
        message: "El mensaje no puede superar los 1000 caracteres.",
      });
    }

    if (
      tradeRequestId !== null &&
      (
        !Number.isInteger(tradeRequestId) ||
        tradeRequestId <= 0
      )
    ) {
      return res.status(400).json({
        ok: false,
        message: "La solicitud de intercambio no es válida.",
      });
    }

    const receiverResult = await pool.query(
      `
      SELECT id
      FROM users
      WHERE id = $1
      `,
      [receiverUserId]
    );

    if (receiverResult.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "El destinatario no existe.",
      });
    }

    if (tradeRequestId !== null) {
      const tradeRequestResult = await pool.query(
        `
        SELECT id
        FROM trade_requests
        WHERE id = $1
          AND (
            requester_id = $2
            OR receiver_id = $2
          )
        `,
        [tradeRequestId, senderUserId]
      );

      if (tradeRequestResult.rows.length === 0) {
        return res.status(403).json({
          ok: false,
          message:
            "No tenés acceso a esa solicitud de intercambio.",
        });
      }
    }

    const result = await pool.query(
    `
    INSERT INTO messages (
      trade_request_id,
      sender_id,
      receiver_id,
      content
    )
    VALUES ($1, $2, $3, $4)

    RETURNING
      id,
      trade_request_id,
      sender_id,
      receiver_id,
      content AS body,
      created_at
    `,
    [
      tradeRequestId,
      senderUserId,
      receiverUserId,
      body,
    ]
  );

    const createdMessage = result.rows[0];

    const io = req.app.get("io");

    if (io) {
      io.to(`user:${receiverUserId}`).emit(
        "message:new",
        createdMessage
      );

      io.to(`user:${senderUserId}`).emit(
        "message:sent",
        createdMessage
      );
    }

    return res.status(201).json({
      ok: true,
      message: createdMessage,
    });
  } catch (error) {
    console.error("Error al enviar mensaje:", error);

    return res.status(500).json({
      ok: false,
      message: "No se pudo enviar el mensaje.",
    });
  }
});

export default router;