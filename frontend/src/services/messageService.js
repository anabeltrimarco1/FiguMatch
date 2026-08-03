import api from "../api.js";

export async function getConversations() {
  const response = await api.get(
    "/messages/conversations"
  );

  return response.data;
}

export async function getMessages(userId) {
  if (!userId) {
    return {
      ok: true,
      user: null,
      messages: [],
    };
  }

  const response = await api.get(
    `/messages/${userId}`
  );

  return response.data;
}

export async function sendMessage(
  receiverUserId,
  body,
  tradeRequestId = null
) {
  const cleanBody = String(body || "").trim();

  if (!receiverUserId) {
    throw new Error(
      "Falta el destinatario del mensaje."
    );
  }

  if (!cleanBody) {
    throw new Error("El mensaje está vacío.");
  }

  const response = await api.post("/messages", {
    receiverUserId,
    body: cleanBody,
    tradeRequestId,
  });

  return response.data;
}