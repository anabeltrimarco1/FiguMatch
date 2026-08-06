import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const NAV_ITEMS = [
  { to: "/dashboard", icon: "🏠", label: "Inicio" },
  { to: "/album", icon: "📖", label: "Mi álbum" },
  { to: "/matches", icon: "🤝", label: "Intercambios" },
  { to: "/chat", icon: "💬", label: "Chat" },
  { to: "/profile", icon: "👤", label: "Perfil" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const username = user?.username || "Coleccionista";
  const avatarLetter = username.charAt(0).toUpperCase();

  const handleLogout = async () => {
    await logout();

    navigate("/login", {
      replace: true,
    });
  };

  return (
    <header className="navbar-v11-shell">
      <nav className="navbar navbar-v11">
        <NavLink
          to="/dashboard"
          className="navbar-brand navbar-brand-v11"
          aria-label="Ir al inicio de FiguMatch"
        >
          <div className="navbar-brand-main">
            <span className="brand-ball" aria-hidden="true">
              ⚽
            </span>

            <div className="navbar-brand-copy">
              <strong>FiguMatch</strong>
              <small>El álbum digital del Mundial 2026</small>
            </div>
          </div>

          <div className="coreia-mini">
            <span>powered by</span>
            <img src="/coreia-logo.png" alt="Coreia" />
          </div>
        </NavLink>

        <div className="navbar-links navbar-links-v11">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/dashboard"}
              className={({ isActive }) =>
                `navbar-link-v11 ${isActive ? "active" : ""}`
              }
            >
              <span className="navbar-link-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="navbar-user navbar-user-v11">
          <div className="navbar-avatar" aria-hidden="true">
            {avatarLetter}
          </div>

          <div className="navbar-user-copy">
            <strong>{username}</strong>
            <small>Coleccionista</small>
          </div>

          <button
            type="button"
            className="navbar-logout"
            onClick={handleLogout}
            title="Cerrar sesión"
          >
            <span aria-hidden="true">🚪</span>
            <span>Salir</span>
          </button>
        </div>
      </nav>
    </header>
  );
}
