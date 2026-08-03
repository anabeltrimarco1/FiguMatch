import { useEffect, useState } from 'react';
import api from "../api.js";
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';
import QuickActions from "../components/dashboard/QuickActions";
import ProgressPanel from "../components/dashboard/ProgressPanel";
import StatsGrid from "../components/dashboard/StatsGrid";
import TeamProgress from "../components/dashboard/TeamProgress";
import DashboardHero from "../components/dashboard/DashboardHero";


export default function Dashboard() {
  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    async function loadDashboard() {

      try {

        const [statsRes, teamsRes] = await Promise.all([
          api.get('/album/stats'),
          api.get('/album/progress-by-team')
        ]);

        setStats(statsRes.data);

        setTeams(
          teamsRes.data.teams ??
          teamsRes.data
        );

      } catch (err) {

        console.error(err);

      } finally {

        setLoading(false);

      }

    }

    loadDashboard();

  }, []);
  if (loading) {

    return (

      <main className="dashboard-page">

        <h2>Cargando Dashboard...</h2>

      </main>

    );

  }
  return (
    <main className="dashboard-page">
      <section className="dashboard-container">
        <DashboardHero
          user={user}
          generalProgress={stats?.progress ?? 0}
          stats={stats ?? { total: 0, owned: 0, missing: 0, repeated: 0 }}
        />

        <ProgressPanel progress={stats?.progress ?? 0} />

        <StatsGrid stats={stats} />

        <section className="dashboard-grid">
          <TeamProgress teams={teams} />

          <QuickActions />
        </section>
      </section>
    </main>
  );
}