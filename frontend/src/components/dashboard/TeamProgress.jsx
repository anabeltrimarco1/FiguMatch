import { Link } from "react-router-dom";

function getSafeProgress(team) {
  const owned = Number(team?.owned ?? 0);
  const total = Number(team?.total ?? 0);

  const calculatedProgress = total > 0
    ? Math.round((owned / total) * 100)
    : 0;

  const rawProgress = Number(team?.progress ?? calculatedProgress);

  return Math.min(
    Math.max(Number.isFinite(rawProgress) ? rawProgress : 0, 0),
    100
  );
}

export default function TeamProgress({ teams = [] }) {
  return (
    <article className="dashboard-panel dashboard-progress-panel">
      <div className="panel-title-row">
        <div>
          <p className="panel-eyebrow">Tu avance</p>
          <h2>Progreso por selección</h2>
        </div>

        <Link to="/album" className="panel-link">
          Ver todas
        </Link>
      </div>

      <div className="teams-list">
        {teams.map((team, index) => {
          const owned = Number(team?.owned ?? 0);
          const total = Number(team?.total ?? 0);
          const safeProgress = getSafeProgress(team);
          const teamName = team?.team || "Selección";

          return (
            <article
              className="team-progress-card"
              key={team?.id ?? teamName ?? index}
            >
              <div className="team-progress-header">
                <div className="team-data">
                  <strong>{teamName}</strong>
                </div>
              </div>

              <div className="team-progress-meta">
                <small>
                  {owned} de {total} figuritas
                </small>

                <strong className="team-progress-percent">
                  {safeProgress}%
                </strong>
              </div>

              <div
                className="team-progress-track"
                role="progressbar"
                aria-label={`Progreso de ${teamName}`}
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={safeProgress}
              >
                <div
                  className="team-progress-fill"
                  style={{ width: `${safeProgress}%` }}
                />
              </div>
            </article>
          );
        })}
      </div>
    </article>
  );
}
