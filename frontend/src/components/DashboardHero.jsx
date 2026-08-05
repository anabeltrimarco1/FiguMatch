import { Link } from "react-router-dom";

export default function DashboardHero({
  user,
  generalProgress,
  stats,
}) {
  return (
    <section className="dashboard-welcome">
      <div className="dashboard-welcome-content">
        <p className="dashboard-eyebrow">
          Mi colección
        </p>

        <h1>
          Hola, {user?.username || "coleccionista"} 👋
        </h1>

        <p className="dashboard-welcome-text">
          Bienvenido nuevamente a FiguMatch.

          Tu álbum está al <strong>{generalProgress}%</strong> y todavía te
          faltan <strong>{stats.missing}</strong> figuritas para completarlo.
        </p>

        <div className="dashboard-welcome-actions">
          <Link
            to="/album"
            className="dashboard-main-button"
          >
            Ver mi álbum
          </Link>

          <Link
            to="/matches"
            className="dashboard-secondary-button"
          >
            Buscar intercambios
          </Link>
        </div>
      </div>

      <div className="dashboard-welcome-progress">
        <div className="dashboard-progress-circle">
          <strong>{generalProgress}%</strong>
          <span>completado</span>
        </div>

        <p>
          {stats.owned} de {stats.total} figuritas
        </p>
      </div>
    </section>
  );
}