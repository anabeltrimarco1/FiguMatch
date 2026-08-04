import api from "../api.js";

export async function getReceivedTradeRequests() {
  const response = await api.get("/trade-requests/received");
  return response.data;
}

export async function getSentTradeRequests() {
  const response = await api.get("/trade-requests/sent");
  return response.data;
}