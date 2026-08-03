import { NavLink } from "react-router-dom";

const menuGroups = [
  {
    label: "PRINCIPAL",
    items: [
      {
        to: "/dashboard",
        icon: "🏠",
        label: "Dashboard",
        end: true,
      },
      {
        to: "/album",
        icon: "📖",
        label: "Mi álbum",
      },
    ],
  },
  {
    label: "COLECCIÓN",
    items: [
      {
        to: "/faltantes",
        icon: "⭕",
        label: "Faltantes",
      },
      {
        to: "/repetidas",
        icon: "🔁",
        label: "Repetidas",
      },
    ],
  },
  {
    label: "COMUNIDAD",
    items: [
      {
        to: "/matches",
        icon: "🤝",
        label: "Coincidencias",
      },
      {
        to: "/chat",
        icon: "💬",
        label: "Chat",
      },
    ],
  },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && (
        <button
          type="button"
          className="app-sidebar-overlay"
          aria-label="Cerrar menú"
          onClick={onClose}
        />
      )}

      <aside className={`app-sidebar ${open ? "is-open" : ""}`}>
        <div className="app-sidebar-brand">
          <NavLink to="/dashboard" onClick={onClose}>
            <span className="app-sidebar-logo" aria-hidden="true">
              ⚽
            </span>

            <div className="app-sidebar-brand-text">
              <strong>FiguMatch</strong>
              <small>Mundial 2026</small>
            </div>
          </NavLink>

          <div className="app-sidebar-powered">
            <span>Powered by</span>

            <img
              src="/coreia-logo.png"
              alt="Coreia"
              className="app-sidebar-powered-logo"
            />
          </div>
        </div>

        <nav className="app-sidebar-nav" aria-label="Navegación principal">
          {menuGroups.map((group) => (
            <div className="app-sidebar-group" key={group.label}>
              <span className="app-sidebar-group-label">{group.label}</span>

              <div className="app-sidebar-group-links">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `app-sidebar-link ${isActive ? "active" : ""}`
                    }
                  >
                    <span className="app-sidebar-icon" aria-hidden="true">
                      {item.icon}
                    </span>

                    <span className="app-sidebar-link-label">
                      {item.label}
                    </span>

                    <span
                      className="app-sidebar-link-arrow"
                      aria-hidden="true"
                    >
                      ›
                    </span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="app-sidebar-bottom">
          <div className="app-sidebar-system-card">
            <div className="app-sidebar-system-heading">
              <span className="app-sidebar-system-icon">🏆</span>

              <div>
                <strong>Álbum Mundial 2026</strong>
                <span>Tu colección en un solo lugar</span>
              </div>
            </div>

            <div className="app-sidebar-online">
              <span className="app-sidebar-online-dot" />
              Sistema conectado
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}