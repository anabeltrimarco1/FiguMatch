import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

const pageInformation = {
  "/dashboard": { eyebrow: "RESUMEN GENERAL", title: "Dashboard", description: "Seguí el progreso de tu colección." },
  "/album": { eyebrow: "MI COLECCIÓN", title: "Mi álbum", description: "Administrá todas tus figuritas." },
  "/faltantes": { eyebrow: "MI COLECCIÓN", title: "Figuritas faltantes", description: "Encontrá las figuritas que todavía necesitás." },
  "/repetidas": { eyebrow: "MI COLECCIÓN", title: "Repetidas", description: "Revisá las figuritas disponibles para intercambiar." },
  "/matches": { eyebrow: "INTERCAMBIOS", title: "Coincidencias", description: "Descubrí coleccionistas compatibles con vos." },
  "/chat": { eyebrow: "MENSAJES", title: "Chat", description: "Conversá y coordiná tus intercambios." },
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

function getUserName(user) {
  return user?.name || user?.nombre || user?.username || user?.email?.split("@")[0] || "Coleccionista";
}

function getInitial(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "C";
}

export default function Header({ onMenuClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const { user } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const matchedPath = Object.keys(pageInformation).find((path) =>
    location.pathname.startsWith(path)
  );

  const page = pageInformation[matchedPath] || {
    eyebrow: "FIGUMATCH",
    title: "FiguMatch",
    description: "Tu álbum del Mundial 2026.",
  };

  const userName = getUserName(user);
  const greeting = getGreeting();

  useEffect(() => {
    const handleOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleLogout = () => {
    const confirmed = window.confirm("¿Querés cerrar la sesión?");
    if (!confirmed) return;

    localStorage.removeItem("figuritas_token");
    localStorage.removeItem("figuritas_user");
    setUserMenuOpen(false);
    navigate("/login", { replace: true });
    window.location.reload();
  };

  return (
    <header className="app-header">
      <div className="app-header-left">
        <button
          type="button"
          className="app-menu-button"
          aria-label="Abrir menú principal"
          onClick={onMenuClick}
        >
          <span aria-hidden="true">☰</span>
        </button>

        <div className="app-header-title">
          <span className="app-header-eyebrow">{page.eyebrow}</span>

          <div className="app-header-heading-row">
            <h1>{page.title}</h1>
            <span className="app-header-status">
              <span className="app-header-status-dot" />
              Online
            </span>
          </div>

          <p>
            {greeting}, <strong>{userName}</strong>. {page.description}
          </p>
        </div>
      </div>

      <div className="app-header-actions">
        <button
          type="button"
          className="app-header-icon-button"
          aria-label="Buscar figuritas"
          title="Buscar figuritas"
        >
          🔍
        </button>

        <button
          type="button"
          className="app-header-icon-button app-notification-button"
          aria-label="Notificaciones"
          title="Notificaciones"
        >
          🔔
          <span className="app-notification-dot" />
        </button>

        <div ref={menuRef} className="app-user-menu">
          <button
            type="button"
            className={`app-user-summary ${userMenuOpen ? "is-open" : ""}`}
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
            onClick={() => setUserMenuOpen((current) => !current)}
          >
            <div className="app-user-avatar">{getInitial(userName)}</div>

            <div className="app-user-information">
              <strong>{userName}</strong>
              <span>Coleccionista</span>
            </div>

            <span className="app-user-chevron" aria-hidden="true">
              {userMenuOpen ? "▴" : "▾"}
            </span>
          </button>

          {userMenuOpen && (
            <div className="app-user-dropdown" role="menu">
              <div className="app-user-dropdown-header">
                <div className="app-user-avatar small">
                  {getInitial(userName)}
                </div>

                <div>
                  <strong>{userName}</strong>
                  <span>{user?.email || "Coleccionista"}</span>
                </div>
              </div>

              <div className="app-user-dropdown-separator" />

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setUserMenuOpen(false);
                  navigate("/album");
                }}
              >
                <span aria-hidden="true">📖</span>
                Mi álbum
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setUserMenuOpen(false);
                  window.alert("Cambiar contraseña se implementa en la siguiente fase.");
                }}
              >
                <span aria-hidden="true">🔒</span>
                Cambiar contraseña
              </button>

              <div className="app-user-dropdown-separator" />

              <button
                type="button"
                role="menuitem"
                className="danger"
                onClick={handleLogout}
              >
                <span aria-hidden="true">🚪</span>
                Cerrar sesión
              </button>

              <div className="app-user-dropdown-version">
                FiguMatch · Versión 3.2
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
