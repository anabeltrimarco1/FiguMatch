import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import "./Profile.css";

const TEAM_SHIELDS = {
  Alemania: "/shields/alemania.svg",
  "Arabia Saudita": "/shields/arabia saudita.svg",
  Argelia: "/shields/argelia.svg",
  Argentina: "/shields/argentina.svg",
  Australia: "/shields/australia.svg",
  Austria: "/shields/austria.svg",
  Bélgica: "/shields/belgica.svg",
  "Bosnia y Herzegovina": "/shields/bosnia y herzegovina.svg",
  Brasil: "/shields/brasil.svg",
  "Cabo Verde": "/shields/cabo verde.svg",
  Canadá: "/shields/canada.svg",
  Chequia: "/shields/chequia.svg",
  Colombia: "/shields/colombia.svg",
  "Corea del Sur": "/shields/corea del sur.svg",
  "Costa de Marfil": "/shields/costa de marfil.svg",
  Croacia: "/shields/croacia.svg",
  Curazao: "/shields/curazao.svg",
  Ecuador: "/shields/ecuador.svg",
  Egipto: "/shields/egipto.svg",
  Escocia: "/shields/escocia.svg",
  España: "/shields/espana.svg",
  "Estados Unidos": "/shields/estados unidos.svg",
  Francia: "/shields/francia.svg",
  Ghana: "/shields/ghana.svg",
  Haití: "/shields/haiti.svg",
  Inglaterra: "/shields/inglaterra.svg",
  Irak: "/shields/irak.svg",
  Irán: "/shields/iran.svg",
  Japón: "/shields/japon.svg",
  Jordania: "/shields/jordania.svg",
  Marruecos: "/shields/marruecos.svg",
  México: "/shields/mexico.svg",
  Noruega: "/shields/noruega.svg",
  "Nueva Zelanda": "/shields/nueva zelanda.svg",
  "Países Bajos": "/shields/paises bajos.svg",
  Panamá: "/shields/panama.svg",
  Paraguay: "/shields/paraguay.svg",
  Portugal: "/shields/portugal.svg",
  Qatar: "/shields/qatar.svg",
  "RD Congo": "/shields/rd congo.svg",
  Senegal: "/shields/senegal.svg",
  Sudáfrica: "/shields/sudafrica.png",
  Suecia: "/shields/suecia.svg",
  Suiza: "/shields/suiza.png",
  Túnez: "/shields/tunez.svg",
  Turquía: "/shields/turquia.png",
  Uruguay: "/shields/uruguay.svg",
  Uzbekistán: "/shields/uzbekistan.svg",
};
function getInitials(value) {
  const normalized = String(value || "Usuario").trim();

  return normalized
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getDisplayName(user) {
  return (
    user?.displayName ||
    user?.name ||
    user?.username ||
    "Coleccionista"
  );
}

function getUsername(user) {
  const username = String(
    user?.username || user?.email || "usuario",
  ).trim();

  return username.startsWith("@")
    ? username
    : `@${username.split("@")[0]}`;
}

function getFavoriteTeam(user) {
  return (
    user?.favoriteTeam ||
    user?.favorite_team ||
    user?.favoriteSelection ||
    user?.favorite_selection ||
    "Todavía no elegida"
  );
}

function getLocation(user) {
  return (
    user?.city ||
    user?.location ||
    user?.zone ||
    "Ubicación no configurada"
  );
}

function getNumericValue(user, keys) {
  for (const key of keys) {
    const value = Number(user?.[key]);

    if (Number.isFinite(value) && value >= 0) {
      return value;
    }
  }

  return 0;
}

function getCollectorLevel(progress) {
  if (progress >= 90) {
    return {
      name: "Coleccionista Leyenda",
      icon: "🏆",
      next: "Álbum casi completo",
    };
  }

  if (progress >= 70) {
    return {
      name: "Coleccionista Oro",
      icon: "🥇",
      next: "Próximo nivel: Leyenda",
    };
  }

  if (progress >= 40) {
    return {
      name: "Coleccionista Plata",
      icon: "🥈",
      next: "Próximo nivel: Oro",
    };
  }

  return {
    name: "Coleccionista Inicial",
    icon: "🌱",
    next: "Próximo nivel: Plata",
  };
}

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const profile = useMemo(() => {
    const owned = getNumericValue(user, [
      "ownedCount",
      "owned_count",
      "stickersOwned",
      "stickers_owned",
      "totalOwned",
    ]);

    const repeated = getNumericValue(user, [
      "repeatedCount",
      "repeated_count",
      "duplicates",
      "duplicateCount",
    ]);

    const missing = getNumericValue(user, [
      "missingCount",
      "missing_count",
      "stickersMissing",
      "stickers_missing",
    ]);

    const trades = getNumericValue(user, [
      "tradeCount",
      "trade_count",
      "completedTrades",
      "completed_trades",
    ]);

    const explicitProgress = getNumericValue(user, [
      "albumProgress",
      "album_progress",
      "progress",
      "completionPercentage",
    ]);

    const totalConsidered = owned + missing;

    const calculatedProgress =
      totalConsidered > 0
        ? Math.round((owned / totalConsidered) * 100)
        : 0;

    const progress = Math.min(
      100,
      explicitProgress || calculatedProgress,
    );

    return {
      displayName: getDisplayName(user),
      username: getUsername(user),
      email: user?.email || "Correo no disponible",
      location: getLocation(user),
      favoriteTeam: getFavoriteTeam(user),
      bio:
        user?.bio ||
        user?.description ||
        "Coleccionista de FiguMatch rumbo a completar el álbum del Mundial 2026.",
      owned,
      repeated,
      missing,
      trades,
      progress,
      level: getCollectorLevel(progress),
    };
  }, [user]);

  return (
    <section className="profile-page">
      <header className="profile-cover">
        <div className="profile-cover-glow" />

        <div className="profile-identity">
          <div className="profile-avatar">
            {user?.avatar || user?.avatarUrl ? (
              <img
                src={user.avatar || user.avatarUrl}
                alt={`Avatar de ${profile.displayName}`}
              />
            ) : (
              <span aria-hidden="true">
                {getInitials(profile.displayName)}
              </span>
            )}

            <i
              className="profile-status-dot"
              title="Usuario conectado"
            />
          </div>

          <div className="profile-identity-copy">
            <span className="profile-eyebrow">
              PERFIL DE COLECCIONISTA
            </span>

            <h2>{profile.displayName}</h2>

            <p className="profile-username">
              {profile.username}
            </p>

            <p className="profile-bio">
              {profile.bio}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="profile-edit-button"
          onClick={() => navigate("/perfil/editar")}
          title="Editar información del perfil"
        >
          ✏️ Editar perfil
        </button>
      </header>

      <div className="profile-grid">
        <section className="profile-main-column">
          <article className="profile-card profile-progress-card">
            <div className="profile-card-heading">
              <div>
                <span>PROGRESO DEL ÁLBUM</span>
                <h3>{profile.progress}% completado</h3>
              </div>

              <div
                className="profile-progress-ring"
                style={{
                  "--profile-progress": `${profile.progress * 3.6}deg`,
                }}
                aria-label={`${profile.progress}% completado`}
              >
                <strong>{profile.progress}%</strong>
              </div>
            </div>

            <div className="profile-progress-track">
              <span
                style={{
                  width: `${profile.progress}%`,
                }}
              />
            </div>

            <p>
              Cada figurita cargada acerca tu colección al
              objetivo de completar el Mundial 2026.
            </p>

            <button
              type="button"
              onClick={() => navigate("/album")}
            >
              Ver mi álbum
            </button>
          </article>

          <section className="profile-stats">
            <article>
              <span aria-hidden="true">📖</span>
              <div>
                <small>En el álbum</small>
                <strong>{profile.owned}</strong>
              </div>
            </article>

            <article>
              <span aria-hidden="true">🔁</span>
              <div>
                <small>Repetidas</small>
                <strong>{profile.repeated}</strong>
              </div>
            </article>

            <article>
              <span aria-hidden="true">⭕</span>
              <div>
                <small>Faltantes</small>
                <strong>{profile.missing}</strong>
              </div>
            </article>

            <article>
              <span aria-hidden="true">🤝</span>
              <div>
                <small>Intercambios</small>
                <strong>{profile.trades}</strong>
              </div>
            </article>
          </section>
        </section>

        <aside className="profile-side-column">
          <article className="profile-card profile-level-card">
            <span className="profile-level-icon" aria-hidden="true">
              {profile.level.icon}
            </span>

            <small>NIVEL ACTUAL</small>
            <h3>{profile.level.name}</h3>
            <p>{profile.level.next}</p>
          </article>

          <article className="profile-card profile-details-card">
            <div className="profile-card-title">
              <span aria-hidden="true">👤</span>
              <h3>Información</h3>
            </div>

            <dl>
              <div>
                <dt>Correo</dt>
                <dd>{profile.email}</dd>
              </div>

              <div>
                <dt>Ubicación</dt>
                <dd>{profile.location}</dd>
              </div>

              <div>
                <dt>Selección favorita</dt>

                <dd className="profile-favorite-team">
                  {profile.favoriteTeam !== "Todavía no elegida" ? (
                    <>
                      <span className="profile-favorite-team-shield">
                        <img
                          src={TEAM_SHIELDS[profile.favoriteTeam]}
                          alt={`Escudo de ${profile.favoriteTeam}`}
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      </span>

                      <strong>{profile.favoriteTeam}</strong>
                    </>
                  ) : (
                    <span>{profile.favoriteTeam}</span>
                  )}
                </dd>
              </div>
            </dl>
          </article>

          <article className="profile-card profile-actions-card">
            <h3>Accesos rápidos</h3>

            <button
              type="button"
              onClick={() => navigate("/intercambios")}
            >
              <span aria-hidden="true">📦</span>
              Mis intercambios
            </button>

            <button
              type="button"
              onClick={() => navigate("/actividad")}
            >
              <span aria-hidden="true">🔔</span>
              Mi actividad
            </button>

            <button
              type="button"
              onClick={() => navigate("/matches")}
            >
              <span aria-hidden="true">🤝</span>
              Ver coincidencias
            </button>
          </article>
        </aside>
      </div>

      <p className="profile-data-note">
        Las estadísticas muestran los datos disponibles en la
        sesión actual. La sincronización completa se incorporará
        en los próximos pasos del Sprint 7.4.
      </p>
    </section>
  );
}
