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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const [statsRes, teamsRes] = await Promise.all([
        api.get("/album/stats"),
        api.get("/album/progress-by-team"),
      ]);

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
            <div className="dashboard-spinner" aria-hidden="true" />
            <p className="dashboard-eyebrow">FiguMatch</p>
            <h2>Preparando tu colección</h2>
            <p>Estamos cargando tus figuritas, estadísticas e intercambios.</p>
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
            <div className="dashboard-state-icon" aria-hidden="true">⚠️</div>
            <p className="dashboard-eyebrow">No pudimos cargar el panel</p>
            <h2>Ocurrió un problema</h2>
            <p>{error}</p>
            <button type="button" onClick={loadDashboard}>
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
          <ProgressPanel progress={stats.progress ?? 0} />
          <StatsGrid stats={stats} />
        </section>

        <section className="dashboard-grid">
          <TeamProgress teams={teams} />
          <QuickActions />
        </section>
      </section>
    </main>
  );
}