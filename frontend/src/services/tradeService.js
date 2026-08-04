import api from "../api.js";

/* ============================
   Obtener solicitudes recibidas
============================ */

export async function getReceivedTradeRequests() {
  const response = await api.get("/trade-requests/received");
  return response.data;
}

/* ============================
   Obtener solicitudes enviadas
============================ */

export async function getSentTradeRequests() {
  const response = await api.get("/trade-requests/sent");
  return response.data;
}

/* ============================
   Aceptar intercambio
============================ */

export async function acceptTradeRequest(id) {
  const response = await api.put(
    `/trade-requests/${id}/accept`
  );

  return response.data;
}

/* ============================
   Rechazar intercambio
============================ */

export async function rejectTradeRequest(id) {
  const response = await api.put(
    `/trade-requests/${id}/reject`
  );

  return response.data;
}

/* ============================
   Cancelar solicitud
============================ */

export async function cancelTradeRequest(id) {
  const response = await api.put(
    `/trade-requests/${id}/cancel`
  );

  return response.data;
}