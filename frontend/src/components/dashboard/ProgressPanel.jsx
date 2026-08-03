export default function ProgressPanel({ progress = 0 }) {
  const numericProgress = Number(progress);
  const safeProgress = Math.min(
    Math.max(Number.isFinite(numericProgress) ? numericProgress : 0, 0),
    100
  );

  return (
    <section className="progress-panel">
      <div className="progress-panel-header">
        <div>
          <p className="progress-label">Progreso general</p>
          <strong className="progress-value">{safeProgress}%</strong>
        </div>

        <span className="progress-trophy" aria-hidden="true">
          🏆
        </span>
      </div>

      <div
        className="progress-track"
        role="progressbar"
        aria-label="Progreso general del álbum"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={safeProgress}
      >
        <div
          className="progress-fill"
          style={{ width: `${safeProgress}%` }}
        />
      </div>

      <p className="progress-message">
        {safeProgress >= 100
          ? "¡Completaste el álbum!"
          : "Seguí sumando figuritas para completar tu colección."}
      </p>
    </section>
  );
}
