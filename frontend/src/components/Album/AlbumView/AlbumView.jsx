import { useMemo, useState } from "react";
import TeamSection from "../TeamSection.jsx";

export default function AlbumView({ groupedByTeam, savingId, updateStatus }) {
  const [collapsed, setCollapsed] = useState({});
  const teams = useMemo(
    () =>
      Object.entries(groupedByTeam).sort((a, b) =>
        a[0].localeCompare(b[0], "es"),
      ),
    [groupedByTeam],
  );

  const toggle = (team) => setCollapsed((s) => ({ ...s, [team]: !s[team] }));
  const expandAll = () => setCollapsed({});
  const collapseAll = () => {
    const o = {};
    teams.forEach(([t]) => (o[t] = true));
    setCollapsed(o);
  };

  if (!teams.length) {
    return (
      <section className="album-view-empty-v11">
        <span>📖</span>
        <h2>No hay figuritas para mostrar</h2>
        <p>Probá cambiando los filtros.</p>
      </section>
    );
  }

  return (
    <section className="album-view album-view-v11">
      <header className="album-view-header-v11">
        <div>
          <span className="card-view-eyebrow">VISTA ÁLBUM</span>
          <h2>Álbum Panini Digital</h2>
          <p>{teams.length} selecciones visibles</p>
        </div>
        <div className="album-view-actions-v11">
          <button onClick={expandAll}>➕ Expandir todo</button>
          <button onClick={collapseAll}>➖ Contraer todo</button>
        </div>
      </header>

      {teams.map(([team, stickers]) => (
        <section key={team} className="album-team-wrapper-v11">
          <button
            className="album-team-toggle-v11"
            onClick={() => toggle(team)}
          >
            <span>{collapsed[team] ? "▶" : "▼"}</span>
            <strong>{team}</strong>
            <small>{stickers.length} figuritas</small>
          </button>

          {!collapsed[team] && (
            <TeamSection
              team={team}
              stickers={stickers}
              savingId={savingId}
              updateStatus={updateStatus}
            />
          )}
        </section>
      ))}
    </section>
  );
}
