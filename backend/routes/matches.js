import { Router } from "express";
import { query } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
function calculateCompatibility(giveCount, receiveCount) {
  const safeGiveCount = Number(giveCount) || 0;
  const safeReceiveCount = Number(receiveCount) || 0;

  const tradeCount = Math.min(safeGiveCount, safeReceiveCount);

  const total = safeGiveCount + safeReceiveCount;

  const balance = total > 0 ? Math.round((tradeCount * 2 * 100) / total) : 0;

  let balanceLabel = "Sin oportunidades";

  if (safeGiveCount > 0 && safeReceiveCount > 0) {
    balanceLabel =
      safeGiveCount === safeReceiveCount
        ? "Intercambio equilibrado"
        : "Intercambio posible";
  } else if (safeReceiveCount > 0) {
    balanceLabel = "Puede darte figuritas";
  } else if (safeGiveCount > 0) {
    balanceLabel = "Necesita tus figuritas";
  }

  const compatibility =
    tradeCount === 0
      ? Math.min(total * 10, 45)
      : Math.min(100, 50 + tradeCount * 15 + Math.round(balance / 4));

  return {
    compatibility,
    tradeCount,
    balance,
    balanceLabel,
  };
}

  router.get("/", requireAuth, async (req, res) => {
  try {
    const meId = Number(req.userId);

    const ellosMeDan = await query(
  `
  SELECT
    us.user_id AS other_id,
    s.id AS sticker_id,
    s.code,
    s.number,
    s.team,
    s.name,
    s.category,
    s.group_name
  FROM user_stickers AS us
  INNER JOIN stickers AS s
    ON s.id = us.sticker_id
  WHERE us.status = 'repetida'
    AND us.user_id <> $1
    AND EXISTS (
      SELECT 1
      FROM user_stickers AS mine
      WHERE mine.user_id = $1
        AND mine.sticker_id = us.sticker_id
        AND mine.status = 'me_falta'
    )
  ORDER BY s.team, s.number
  `,
  [Number(meId)],
);

    const yoLesDoy = await query(
  `
  SELECT
    us.user_id AS other_id,
    s.id AS sticker_id,
    s.code,
    s.number,
    s.team,
    s.name,
    s.category,
    s.group_name
  FROM user_stickers AS us
  INNER JOIN stickers AS s
    ON s.id = us.sticker_id
  WHERE us.status = 'me_falta'
    AND us.user_id <> $1
    AND EXISTS (
      SELECT 1
      FROM user_stickers AS mine
      WHERE mine.user_id = $1
        AND mine.sticker_id = us.sticker_id
        AND mine.status = 'repetida'
    )
  ORDER BY s.team, s.number
  `,
  [Number(meId)],
);

    const byUser = new Map();
    const ensureUser = (userId) => {
      if (!byUser.has(userId)) {
        byUser.set(userId, {
          userId,
          ellosMeDan: [],
          yoLesDoy: [],
        });
      }

      return byUser.get(userId);
    };

    for (const row of ellosMeDan.rows) {
      ensureUser(row.other_id).ellosMeDan.push({
        stickerId: row.sticker_id,
        code: row.code,
        number: row.number,
        team: row.team,
        name: row.name,
        category: row.category,
        groupName: row.group_name,
      });
    }

    for (const row of yoLesDoy.rows) {
      ensureUser(row.other_id).yoLesDoy.push({
        stickerId: row.sticker_id,
        code: row.code,
        number: row.number,
        team: row.team,
        name: row.name,
        category: row.category,
        groupName: row.group_name,
      });
    }

    const otherIds = [...byUser.keys()];

    let usersInfo = [];

    if (otherIds.length > 0) {
      const usersResult = await query(
        `
SELECT
    id,
    username,
    email

FROM users

WHERE id = ANY($1::int[])
        `,
        [otherIds],
      );

      usersInfo = usersResult.rows;
    }

    const userInfoById = new Map(
      usersInfo.map((user) => [
        user.id,
        {
          username: user.username,
          email: user.email,
        },
      ]),
    );
    const matches = [...byUser.values()]
      .map((match) => {
        const metrics = calculateCompatibility(
          match.ellosMeDan.length,
          match.yoLesDoy.length,
        );

        const userInfo = userInfoById.get(match.userId) || {};

        return {
          ...match,

          username: userInfo.username || "Coleccionista",

          email: userInfo.email || null,

          score: metrics.compatibility,

          compatibility: metrics.compatibility,

          tradeCount: metrics.tradeCount,

          balance: metrics.balance,

          balanceLabel: metrics.balanceLabel,

          totalOpportunities: match.ellosMeDan.length + match.yoLesDoy.length,
        };
      })

      .filter(
        (match) => match.ellosMeDan.length > 0 || match.yoLesDoy.length > 0,
      )

      .sort((a, b) => {
        if (b.compatibility !== a.compatibility) {
          return b.compatibility - a.compatibility;
        }

        if (b.tradeCount !== a.tradeCount) {
          return b.tradeCount - a.tradeCount;
        }

        return b.totalOpportunities - a.totalOpportunities;
      });
    res.json(matches);
  } catch (err) {
    console.error("ERROR AL BUSCAR INTERCAMBIOS:", err);

    res.status(500).json({
      error: "Error al buscar intercambios",
    });
  }
});
router.post("/request", requireAuth, async (req, res) => {
  try {
    const requesterId = req.userId;

    const { receiverId, giveStickerIds, receiveStickerIds } = req.body;

    if (
      !receiverId ||
      !Array.isArray(giveStickerIds) ||
      !Array.isArray(receiveStickerIds)
    ) {
      return res.status(400).json({
        error: "Datos de intercambio inválidos",
      });
    }

    if (giveStickerIds.length === 0 || receiveStickerIds.length === 0) {
      return res.status(400).json({
        error: "Debés seleccionar figuritas para entregar y recibir",
      });
    }

    if (Number(receiverId) === Number(requesterId)) {
      return res.status(400).json({
        error: "No podés intercambiar figuritas con vos mismo",
      });
    }

    const receiverResult = await query(
      `
      SELECT id, username
      FROM users
      WHERE id = $1
      `,
      [receiverId],
    );

    if (receiverResult.rows.length === 0) {
      return res.status(404).json({
        error: "El coleccionista no existe",
      });
    }

    const tradeQuantity = Math.min(
      giveStickerIds.length,
      receiveStickerIds.length,
    );

    const createdRequests = [];

    for (let index = 0; index < tradeQuantity; index += 1) {
      const offeredStickerId = Number(giveStickerIds[index]);
      const requestedStickerId = Number(receiveStickerIds[index]);

      if (
        !Number.isInteger(offeredStickerId) ||
        !Number.isInteger(requestedStickerId)
      ) {
        return res.status(400).json({
          error: "Una de las figuritas seleccionadas no es válida",
        });
      }

      const offeredResult = await query(
        `
        SELECT id
        FROM user_stickers
        WHERE user_id = $1
          AND sticker_id = $2
          AND status = 'repetida'
        `,
        [requesterId, offeredStickerId],
      );

      if (offeredResult.rows.length === 0) {
        return res.status(400).json({
          error: `No tenés la figurita ${offeredStickerId} marcada como repetida`,
        });
      }

      const requestedResult = await query(
        `
        SELECT id
        FROM user_stickers
        WHERE user_id = $1
          AND sticker_id = $2
          AND status = 'repetida'
        `,
        [receiverId, requestedStickerId],
      );

      if (requestedResult.rows.length === 0) {
        return res.status(400).json({
          error: `El otro usuario ya no tiene disponible la figurita ${requestedStickerId}`,
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
        [requesterId, receiverId, offeredStickerId, requestedStickerId],
      );

      if (duplicateResult.rows.length > 0) {
        continue;
      }

      const insertResult = await query(
        `
        INSERT INTO trade_requests (
          requester_id,
          receiver_id,
          offered_sticker_id,
          requested_sticker_id,
          status
        )
        VALUES ($1, $2, $3, $4, 'pending')
        RETURNING
          id,
          requester_id,
          receiver_id,
          offered_sticker_id,
          requested_sticker_id,
          status,
          created_at
        `,
        [requesterId, receiverId, offeredStickerId, requestedStickerId],
      );

      createdRequests.push(insertResult.rows[0]);
    }

    if (createdRequests.length === 0) {
      return res.status(409).json({
        error: "Estas solicitudes ya estaban pendientes",
      });
    }

    return res.status(201).json({
      message: "Solicitud de intercambio enviada correctamente",
      requests: createdRequests,
    });
  } catch (err) {
    console.error("ERROR AL CREAR SOLICITUD:", err);

    return res.status(500).json({
      error: "No se pudo crear la solicitud de intercambio",
    });
  }
});
export default router;
