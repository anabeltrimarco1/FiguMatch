  /**
 * Calcula la compatibilidad entre dos usuarios.
 */
export function calculateCompatibility(theyGiveCount, iGiveCount) {
  const receive = Number(theyGiveCount || 0);
  const give = Number(iGiveCount || 0);

  if (receive === 0 || give === 0) {
    return {
      compatibility: 0,
      tradeCount: 0,
      balance: 0,
      balanceLabel: "Sin intercambio completo",
    };
  }

  const tradeCount = Math.min(receive, give);
  const maxSide = Math.max(receive, give);
  const balance = maxSide > 0 ? tradeCount / maxSide : 0;

  const quantityScore = Math.min(tradeCount / 10, 1) * 55;
  const balanceScore = balance * 35;
  const opportunityScore = Math.min((receive + give) / 20, 1) * 10;

  const compatibility = Math.min(
    100,
    Math.round(quantityScore + balanceScore + opportunityScore),
  );

  let balanceLabel = "Compatibilidad baja";

  if (compatibility >= 90) balanceLabel = "Intercambio ideal";
  else if (compatibility >= 70) balanceLabel = "Muy compatible";
  else if (compatibility >= 50) balanceLabel = "Compatible";

  return {
    compatibility,
    tradeCount,
    balance: Number(balance.toFixed(2)),
    balanceLabel,
  };
}