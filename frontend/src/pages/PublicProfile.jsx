import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";

export default function PublicProfile() {
  const { userId } = useParams();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.get(`/profile/${userId}`);
      setProfile(data);
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar el perfil.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <div className="public-profile-loading">
        <div className="album-loading-spinner" />
        <p>Cargando perfil del coleccionista...</p>
      </div>
    );
  }

  if (error) {
    return (
      <section className="public-profile-error">
        <span>⚠️</span>
        <h1>No pudimos cargar el perfil</h1>
        <p>{error}</p>

        <button type="button" onClick={loadProfile}>
          Reintentar
        </button>

        <Link to="/matches">Volver a intercambios</Link>
      </section>
    );
  }

  if (!profile) {
    return null;
  }

  const { username, email, avatarLetter, level, stats, achievements } = profile;

  return (
    <div className="public-profile-page">
      <section className="public-profile-hero">
        <div className="public-profile-avatar">{avatarLetter}</div>

        <div className="public-profile-identity">
          <span className="public-profile-eyebrow">
            PERFIL DEL COLECCIONISTA
          </span>

          <h1>{username}</h1>

          <p>{email || "Coleccionista de FiguMatch"}</p>

          <div className="public-profile-level">
            <span>{level?.icon || "🌟"}</span>

            <div>
              <small>Nivel actual</small>
              <strong>{level?.name || "Coleccionista inicial"}</strong>
            </div>
          </div>
        </div>

        <div className="public-profile-progress">
          <strong>{stats?.progress || 0}%</strong>
          <span>álbum completado</span>

          <div className="public-profile-progress-bar">
            <div
              style={{
                width: `${stats?.progress || 0}%`,
              }}
            />
          </div>

          <small>
            {stats?.completed || 0} de {stats?.total || 0} figuritas
          </small>
        </div>
      </section>

      <section className="public-profile-stats">
        <article className="public-stat-card have">
          <span>✅</span>

          <div>
            <small>Tiene</small>
            <strong>{stats?.have || 0}</strong>
          </div>
        </article>

        <article className="public-stat-card repeated">
          <span>🔁</span>

          <div>
            <small>Repetidas</small>
            <strong>{stats?.repeated || 0}</strong>
          </div>
        </article>

        <article className="public-stat-card missing">
          <span>⭕</span>

          <div>
            <small>Le faltan</small>
            <strong>{stats?.missing || 0}</strong>
          </div>
        </article>

        <article className="public-stat-card achievements">
          <span>🏅</span>

          <div>
            <small>Logros</small>
            <strong>{achievements?.length || 0}</strong>
          </div>
        </article>
      </section>

      <section className="public-profile-section">
        <div className="public-profile-section-header">
          <div>
            <span className="public-profile-eyebrow">LOGROS</span>

            <h2>Insignias de {username}</h2>
          </div>
        </div>

        {achievements?.length > 0 ? (
          <div className="public-achievements-grid">
            {achievements.map((achievement) => (
              <article key={achievement.id} className="public-achievement-card">
                <span>{achievement.icon}</span>

                <div>
                  <h3>{achievement.title}</h3>
                  <p>{achievement.description}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="public-achievements-empty">
            <span>🏅</span>
            <p>Este coleccionista todavía no desbloqueó logros.</p>
          </div>
        )}
      </section>

      <section className="public-profile-actions">
        <Link to={`/chat/${userId}`} className="public-profile-primary">
          💬 Chatear con {username}
        </Link>

        <Link to="/matches" className="public-profile-secondary">
          ← Volver a intercambios
        </Link>
      </section>
    </div>
  );
}
