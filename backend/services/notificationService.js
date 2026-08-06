import { query } from "../config/db.js";

export const NOTIFICATION_TYPES = Object.freeze({
  NEW_MESSAGE: "NEW_MESSAGE",
  TRADE_REQUEST: "TRADE_REQUEST",
  TRADE_ACCEPTED: "TRADE_ACCEPTED",
  TRADE_REJECTED: "TRADE_REJECTED",
  TRADE_CANCELLED: "TRADE_CANCELLED",
  NEW_MATCH: "NEW_MATCH",
  SYSTEM: "SYSTEM",
});

const ALLOWED_TYPES = new Set(
  Object.values(NOTIFICATION_TYPES),
);

function normalizeUserId(value) {
  const userId = Number(value);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error(
      "El destinatario de la notificación no es válido.",
    );
  }

  return userId;
}

function normalizeType(value) {
  const type = String(value || "")
    .trim()
    .toUpperCase();

  if (!ALLOWED_TYPES.has(type)) {
    throw new Error(
      `Tipo de notificación no permitido: ${
        type || "vacío"
      }.`,
    );
  }

  return type;
}

function normalizeRequiredText(
  value,
  fieldName,
  maxLength,
) {
  const text = String(value || "").trim();

  if (!text) {
    throw new Error(
      `El campo ${fieldName} es obligatorio.`,
    );
  }

  if (text.length > maxLength) {
    throw new Error(
      `El campo ${fieldName} no puede superar los ${maxLength} caracteres.`,
    );
  }

  return text;
}

function normalizeOptionalLink(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const link = String(value).trim();

  if (link.length > 300) {
    throw new Error(
      "El enlace no puede superar los 300 caracteres.",
    );
  }

  if (!link.startsWith("/")) {
    throw new Error(
      "El enlace debe ser una ruta interna.",
    );
  }

  return link;
}

export async function createNotification({
  userId,
  type,
  title,
  message,
  link = null,
  io = null,
}) {
  const normalizedUserId = normalizeUserId(userId);
  const normalizedType = normalizeType(type);

  const normalizedTitle = normalizeRequiredText(
    title,
    "title",
    160,
  );

  const normalizedMessage = normalizeRequiredText(
    message,
    "message",
    2000,
  );

  const normalizedLink = normalizeOptionalLink(link);

  const result = await query(
    `
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING
      id,
      user_id,
      type,
      title,
      message,
      link,
      is_read,
      created_at,
      read_at
    `,
    [
      normalizedUserId,
      normalizedType,
      normalizedTitle,
      normalizedMessage,
      normalizedLink,
    ],
  );

  const notification = result.rows[0];

  if (io) {
    io
      .to(`user:${normalizedUserId}`)
      .emit("notification:new", notification);
  }

  return notification;
}

export async function createNotificationSafely(data) {
  try {
    return await createNotification(data);
  } catch (error) {
    console.error(
      "ERROR AL CREAR NOTIFICACIÓN AUTOMÁTICA:",
      {
        message: error.message,
        code: error.code,
        detail: error.detail,
        userId: data?.userId,
        type: data?.type,
      },
    );

    return null;
  }
}