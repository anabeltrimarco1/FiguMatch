export default function StatsGrid({ stats }) {
  const safeStats = {
    total: Number(stats?.total ?? 0),
    owned: Number(stats?.owned ?? 0),
    missing: Number(stats?.missing ?? 0),
    repeated: Number(stats?.repeated ?? 0),
  };

  return (
    <section className="stats-grid">
      <article className="stat-card">
        <span className="stat-icon" aria-hidden="true">📚</span>
        <div>
          <p>Total</p>
          <strong>{safeStats.total}</strong>
          <small>Figuritas del álbum</small>
        </div>
      </article>

      <article className="stat-card">
        <span className="stat-icon" aria-hidden="true">✅</span>
        <div>
          <p>Tengo</p>
          <strong>{safeStats.owned}</strong>
          <small>En tu colección</small>
        </div>
      </article>

      <article className="stat-card">
        <span className="stat-icon" aria-hidden="true">🔍</span>
        <div>
          <p>Me faltan</p>
          <strong>{safeStats.missing}</strong>
          <small>Para completar</small>
        </div>
      </article>

      <article className="stat-card">
        <span className="stat-icon" aria-hidden="true">🔁</span>
        <div>
          <p>Repetidas</p>
          <strong>{safeStats.repeated}</strong>
          <small>Disponibles para cambiar</small>
        </div>
      </article>
    </section>
  );
}
