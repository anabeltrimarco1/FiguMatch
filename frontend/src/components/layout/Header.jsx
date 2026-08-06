import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import NotificationBell from "../notifications/NotificationBell.jsx";

const pageInformation = {
  "/dashboard": {
    eyebrow: "RESUMEN GENERAL",
    title: "Dashboard",
    description: "Seguí el progreso de tu colección.",
  },
  "/album": {
    eyebrow: "MI COLECCIÓN",
    title: "Mi álbum",
    description: "Administrá todas tus figuritas.",
  },
  "/faltantes": {
    eyebrow: "MI COLECCIÓN",
    title: "Figuritas faltantes",
    description: "Encontrá las figuritas que todavía necesitás.",
  },
  "/repetidas": {
    eyebrow: "MI COLECCIÓN",
    title: "Repetidas",
    description: "Revisá las figuritas disponibles para intercambiar.",
  },
  "/matches": {
    eyebrow: "INTERCAMBIOS",
    title: "Coincidencias",
    description: "Descubrí coleccionistas compatibles con vos.",
  },
  "/chat": {
    eyebrow: "MENSAJES",
    title: "Chat",
    description: "Conversá y coordiná tus intercambios.",
  },
  "/intercambios": {
    eyebrow: "INTERCAMBIOS",
    title: "Centro de intercambios",
    description: "Administrá tus solicitudes de intercambio.",
  },
};

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";

  return "Buenas noches";
}

function getUserName(user) {
  return (
    user?.name ||
    user?.nombre ||
    user?.username ||
    user?.email?.split("@")[0] ||
    "Coleccionista"
  );
}

function getInitial(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "C";
}

export default function Header({ onMenuClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const menuRef = useRef(null);

  const {
    user,
    logout,
  } = useAuth();

  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const matchedPath = Object.keys(pageInformation).find(
    (path) => location.pathname.startsWith(path),
  );

  const page = pageInformation[matchedPath] || {
    eyebrow: "FIGUMATCH",
    title: "FiguMatch",
    description: "Tu álbum del Mundial 2026.",
  };

  const userName = getUserName(user);
  const greeting = getGreeting();

  useEffect(() => {
    function handleOutside(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setUserMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutside,
      );
      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, []);

  async function handleLogout() {
    const confirmed = window.confirm(
      "¿Querés cerrar la sesión?",
    );

    if (!confirmed) {
      return;
    }

    setUserMenuOpen(false);
    await logout();

    navigate("/login", {
      replace: true,
    });
  }

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
          <span className="app-header-eyebrow">
            {page.eyebrow}
          </span>

          <div className="app-header-heading-row">
            <h1>{page.title}</h1>
          </div>

          <p>
            {greeting}, <strong>{userName}</strong>.{" "}
            {page.description}
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

        <NotificationBell />

        <div
          ref={menuRef}
          className="app-user-menu"
        >
          <button
            type="button"
            className={`app-user-summary ${
              userMenuOpen ? "is-open" : ""
            }`}
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
            onClick={() =>
              setUserMenuOpen((current) => !current)
            }
          >
            <div className="app-user-avatar">
              {getInitial(userName)}
            </div>

            <div className="app-user-information">
              <strong>{userName}</strong>
              <span>Coleccionista</span>
            </div>

            <span
              className="app-user-chevron"
              aria-hidden="true"
            >
              {userMenuOpen ? "▴" : "▾"}
            </span>
          </button>

          {userMenuOpen && (
            <div
              className="app-user-dropdown"
              role="menu"
            >
              <div className="app-user-dropdown-header">
                <div className="app-user-avatar small">
                  {getInitial(userName)}
                </div>

                <div>
                  <strong>{userName}</strong>
                  <span>
                    {user?.email || "Coleccionista"}
                  </span>
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
                FiguMatch · Sprint 7.1.1
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
