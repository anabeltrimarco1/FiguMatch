import StickerCard from "../StickerCard/StickerCard.jsx";

export default function CardView({ filtered, savingId, updateStatus }) {
  const sortedStickers = [...filtered].sort((a, b) => {
    // Primero por selección
    const teamComparison = String(a.team || "").localeCompare(
      String(b.team || ""),
      "es",
      { sensitivity: "base" }
    );

    if (teamComparison !== 0) {
      return teamComparison;
    }

    // Después por número
    return Number(a.number || 0) - Number(b.number || 0);
  });

  return (
    <section className="card-view-v11">
      <div className="card-view-header">
        <div>
          <span className="card-view-eyebrow">COLECCIÓN</span>
          <h2>Vista de tarjetas</h2>
          <p>Explorá tu colección y actualizá el estado de cada figurita.</p>
        </div>

        <div className="card-view-counter">
          <strong>{filtered.length}</strong>
          <span>figuritas</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card-view-empty">
          <span>🔎</span>
          <h3>No encontramos figuritas</h3>
          <p>Probá cambiar los filtros o la búsqueda.</p>
        </div>
      ) : (
        <div className="sticker-grid sticker-grid-v11">
          {sortedStickers.map((sticker) => (
            <StickerCard
              key={sticker.id}
              sticker={sticker}
              savingId={savingId}
              updateStatus={updateStatus}
            />
          ))}
        </div>
      )}
    </section>
  );
}
