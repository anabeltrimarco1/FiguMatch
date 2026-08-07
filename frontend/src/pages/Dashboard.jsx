import { useEffect, useState } from "react";
import api from "../api.js";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

import QuickActions from "../components/dashboard/QuickActions";
import ProgressPanel from "../components/dashboard/ProgressPanel";
import StatsGrid from "../components/dashboard/StatsGrid";
import TeamProgress from "../components/dashboard/TeamProgress";
import DashboardHero from "../components/dashboard/DashboardHero";

const EMPTY_STATS = {
  total: 0,
  owned: 0,
  missing: 0,
  repeated: 0,
  progress: 0,
};

export default function Dashboard() {
  const { user } = useAuth();

  const [stats, setStats] = useState(EMPTY_STATS);
  const [teams, setTeams] = useState([]);
  const [activity, setActivity] = useState([]);

  const [tradeStats, setTradeStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    completed: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const [
        statsRes,
        teamsRes,
        receivedRes,
        sentRes,
      ] = await Promise.all([
        api.get("/album/stats"),
        api.get("/album/progress-by-team"),
        api.get("/trade-requests/received"),
        api.get("/trade-requests/sent"),
      ]);

      setActivity([]);

      setStats({
        ...EMPTY_STATS,
        ...(statsRes.data || {}),
      });

      setTeams(
        Array.isArray(teamsRes.data?.teams)
          ? teamsRes.data.teams
          : Array.isArray(teamsRes.data)
            ? teamsRes.data
            : [],
      );

      const receivedRequests = Array.isArray(
        receivedRes.data?.tradeRequests,
      )
        ? receivedRes.data.tradeRequests
        : [];

      const sentRequests = Array.isArray(
        sentRes.data?.tradeRequests,
      )
        ? sentRes.data.tradeRequests
        : [];

      const allTradeRequests = [
        ...receivedRequests,
        ...sentRequests,
      ];

      setTradeStats({
        total: allTradeRequests.length,

        pending: allTradeRequests.filter(
          (request) =>
            String(request.status).toLowerCase() ===
            "pending",
        ).length,

        accepted: allTradeRequests.filter(
          (request) =>
            String(request.status).toLowerCase() ===
            "accepted",
        ).length,

        completed: allTradeRequests.filter(
          (request) =>
            String(request.status).toLowerCase() ===
            "completed",
        ).length,
      });
    } catch (err) {
      console.error("DASHBOARD ERROR:", err);

      setError(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "No se pudo cargar el Dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <main className="dashboard-page">
        <section className="dashboard-container">
          <div className="dashboard-state-card">
            <div
              className="dashboard-spinner"
              aria-hidden="true"
            />

            <p className="dashboard-eyebrow">
              FiguMatch
            </p>

            <h2>Preparando tu colección</h2>

            <p>
              Estamos cargando tus figuritas,
              estadísticas e intercambios.
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="dashboard-page">
        <section className="dashboard-container">
          <div className="dashboard-state-card dashboard-state-card-error">
            <div
              className="dashboard-state-icon"
              aria-hidden="true"
            >
              ⚠️
            </div>

            <p className="dashboard-eyebrow">
              No pudimos cargar el panel
            </p>

            <h2>Ocurrió un problema</h2>

            <p>{error}</p>

            <button
              type="button"
              onClick={loadDashboard}
            >
              Reintentar
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <section className="dashboard-container">

        <DashboardHero
          user={user}
          generalProgress={stats.progress ?? 0}
          stats={stats}
        />

        <section className="dashboard-highlight-grid">
          <ProgressPanel
            progress={stats.progress ?? 0}
          />

          <StatsGrid stats={stats} />
        </section>

        <section className="dashboard-grid">
          <TeamProgress teams={teams} />

          <QuickActions />
        </section>

        <section className="dashboard-recent-activity">
          <div className="dashboard-section-header">
            <div>
              <span className="dashboard-eyebrow">
                Intercambios
              </span>

              <h2>Resumen de intercambios</h2>
            </div>
          </div>

          <div className="dashboard-trade-summary">

            <article className="dashboard-trade-card">
              <span aria-hidden="true">🤝</span>

              <div>
                <strong>
                  {tradeStats.total}
                </strong>

                <small>Totales</small>
              </div>
            </article>

            <article className="dashboard-trade-card pending">
              <span aria-hidden="true">⏳</span>

              <div>
                <strong>
                  {tradeStats.pending}
                </strong>

                <small>Pendientes</small>
              </div>
            </article>

            <article className="dashboard-trade-card accepted">
              <span aria-hidden="true">✅</span>

              <div>
                <strong>
                  {tradeStats.accepted}
                </strong>

                <small>Aceptados</small>
              </div>
            </article>

            <article className="dashboard-trade-card completed">
              <span aria-hidden="true">🏆</span>

              <div>
                <strong>
                  {tradeStats.completed}
                </strong>

                <small>Completados</small>
              </div>
            </article>

          </div>
        </section>

        <section className="dashboard-recent-activity">
          <div className="dashboard-section-header">
            <div>
              <span className="dashboard-eyebrow">
                Actividad reciente
              </span>

              <h2>Últimos movimientos</h2>
            </div>
          </div>

          {activity.length === 0 ? (
            <div className="dashboard-empty-activity">
              <span aria-hidden="true">📭</span>

              <p>
                Todavía no hay actividad reciente.
              </p>
            </div>
          ) : (
            <div className="dashboard-activity-list">
              {activity
                .slice(0, 5)
                .map((item, index) => (
                  <article
                    key={
                      item.id ||
                      `${item.type || "activity"
                      }-${index}`
                    }
                    className="dashboard-activity-item"
                  >
                    <span
                      className="dashboard-activity-icon"
                      aria-hidden="true"
                    >
                      {item.icon || "🔔"}
                    </span>

                    <div>
                      <strong>
                        {item.title ||
                          item.message ||
                          "Actividad"}
                      </strong>

                      {item.description && (
                        <p>
                          {item.description}
                        </p>
                      )}

                      {item.created_at && (
                        <small>
                          {new Date(
                            item.created_at,
                          ).toLocaleString(
                            "es-AR",
                          )}
                        </small>
                      )}
                    </div>
                  </article>
                ))}
            </div>
          )}
        </section>

      </section>
    </main>
  );
}