import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

import api from "../api.js";
import StickerCard from "../components/Album/StickerCard/StickerCard.jsx";
import "./Faltantes.css";

const SORTABLE_COLUMNS = {
  code: "Código",
  name: "Nombre",
  team: "Selección",
  group_name: "Grupo",
  category: "Categoría",
};

export default function Faltantes() {
  const navigate = useNavigate();

  const [stickers, setStickers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("todas");
  const [categoryFilter, setCategoryFilter] = useState("todas");
  const [groupFilter, setGroupFilter] = useState("todos");
  const [viewMode, setViewMode] = useState("cards");
  const [savingId, setSavingId] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: "code",
    direction: "asc",
  });

  useEffect(() => {
    const loadMissing = async () => {
      setLoading(true);
      setError("");

      try {
        const { data } = await api.get("/album/missing");

        const missing = Array.isArray(data)
          ? data
          : Array.isArray(data?.stickers)
            ? data.stickers
            : [];

        setStickers(missing);
      } catch (err) {
        console.error("ERROR AL CARGAR FALTANTES:", err);
        setError("No se pudieron cargar las figuritas faltantes.");
      } finally {
        setLoading(false);
      }
    };

    loadMissing();
  }, []);

  const teams = useMemo(() => {
    return [
      "todas",
      ...new Set(stickers.map((sticker) => sticker.team).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b, "es"));
  }, [stickers]);

  const categories = useMemo(() => {
    return [
      "todas",
      ...new Set(
        stickers.map((sticker) => sticker.category).filter(Boolean),
      ),
    ].sort((a, b) => a.localeCompare(b, "es"));
  }, [stickers]);

  const groups = useMemo(() => {
    return [
      "todos",
      ...new Set(
        stickers.map((sticker) => sticker.group_name).filter(Boolean),
      ),
    ].sort((a, b) =>
      String(a).localeCompare(String(b), "es", { numeric: true }),
    );
  }, [stickers]);

  const stats = useMemo(() => {
    return {
      total: stickers.length,
      teams: new Set(
        stickers.map((sticker) => sticker.team).filter(Boolean),
      ).size,
      shields: stickers.filter(
        (sticker) =>
          String(sticker.category || "").trim().toLowerCase() === "escudo",
      ).length,
      teamPhotos: stickers.filter((sticker) => {
        const category = String(sticker.category || "")
          .trim()
          .toLowerCase();

        return category === "equipo" || category === "foto de equipo";
      }).length,
    };
  }, [stickers]);

  const activeFilters = useMemo(() => {
    const result = [];

    if (search.trim()) {
      result.push({
        key: "search",
        label: `Búsqueda: ${search.trim()}`,
      });
    }

    if (groupFilter !== "todos") {
      result.push({
        key: "group",
        label: `Grupo ${groupFilter}`,
      });
    }

    if (teamFilter !== "todas") {
      result.push({
        key: "team",
        label: teamFilter,
      });
    }

    if (categoryFilter !== "todas") {
      result.push({
        key: "category",
        label: categoryFilter,
      });
    }

    return result;
  }, [search, groupFilter, teamFilter, categoryFilter]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return stickers
      .filter((sticker) => {
        const searchableText = [
          sticker.code,
          sticker.name,
          sticker.team,
          sticker.category,
          sticker.group_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch = !term || searchableText.includes(term);
        const matchesTeam =
          teamFilter === "todas" || sticker.team === teamFilter;
        const matchesCategory =
          categoryFilter === "todas" ||
          sticker.category === categoryFilter;
        const matchesGroup =
          groupFilter === "todos" ||
          String(sticker.group_name || "") === groupFilter;

        return (
          matchesSearch &&
          matchesTeam &&
          matchesCategory &&
          matchesGroup
        );
      })
      .sort((a, b) => {
        const key = sortConfig.key;
        const direction = sortConfig.direction === "asc" ? 1 : -1;

        const valueA =
          key === "number"
            ? Number(a[key] || 0)
            : String(a[key] || "");

        const valueB =
          key === "number"
            ? Number(b[key] || 0)
            : String(b[key] || "");

        if (typeof valueA === "number" && typeof valueB === "number") {
          return (valueA - valueB) * direction;
        }

        return (
          String(valueA).localeCompare(String(valueB), "es", {
            numeric: true,
            sensitivity: "base",
          }) * direction
        );
      });
  }, [
    stickers,
    search,
    teamFilter,
    categoryFilter,
    groupFilter,
    sortConfig,
  ]);

  const updateStatus = async (sticker, status) => {
    setSavingId(sticker.id);
    setError("");

    const quantity =
      status === "me_falta"
        ? 0
        : status === "repetida"
          ? Math.max(sticker.quantity || 0, 2)
          : 1;

    try {
      await api.put(`/album/${sticker.id}`, {
        status,
        quantity,
      });

      if (status !== "me_falta") {
        setStickers((current) =>
          current.filter((item) => item.id !== sticker.id),
        );
      }
    } catch (err) {
      console.error("ERROR AL ACTUALIZAR FIGURITA:", err);
      setError("No se pudo actualizar la figurita.");
    } finally {
      setSavingId(null);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setTeamFilter("todas");
    setCategoryFilter("todas");
    setGroupFilter("todos");
  };

  const removeFilter = (filterKey) => {
    if (filterKey === "search") setSearch("");
    if (filterKey === "group") setGroupFilter("todos");
    if (filterKey === "team") setTeamFilter("todas");
    if (filterKey === "category") setCategoryFilter("todas");
  };

  const buildExportRows = () =>
    filtered.map((sticker) => ({
      Grupo: sticker.group_name || "",
      Selección: sticker.team || "",
      Código: sticker.code || "",
      Número: sticker.number || "",
      Categoría: sticker.category || "",
      Nombre: sticker.name || "",
    }));

  const downloadCsv = () => {
    if (filtered.length === 0) return;

    const rows = buildExportRows();
    const headers = Object.keys(rows[0]);

    const csv = [
      headers,
      ...rows.map((row) => headers.map((header) => row[header])),
    ]
      .map((row) =>
        row
          .map((value) => {
            const escaped = String(value ?? "").replaceAll('"', '""');
            return `"${escaped}"`;
          })
          .join(","),
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "figuritas_faltantes_figumatch.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  const downloadExcel = () => {
    if (filtered.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(buildExportRows());
    worksheet["!cols"] = [
      { wch: 10 },
      { wch: 22 },
      { wch: 12 },
      { wch: 10 },
      { wch: 18 },
      { wch: 34 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Faltantes",
    );

    XLSX.writeFile(
      workbook,
      "figuritas_faltantes_figumatch.xlsx",
    );
  };

  const buildWhatsAppText = () => {
    const grouped = filtered.reduce((result, sticker) => {
      const team = sticker.team || "Sin selección";

      if (!result[team]) {
        result[team] = [];
      }

      result[team].push(sticker);
      return result;
    }, {});

    return [
      "📢 Busco estas figuritas del Mundial 2026:",
      "",
      ...Object.entries(grouped).flatMap(([team, items]) => [
        `🌍 ${team}`,
        ...items.map(
          (sticker) =>
            `• ${sticker.code || ""} - ${
              sticker.name || "Nombre no disponible"
            }`,
        ),
        "",
      ]),
      "Enviado desde FiguMatch ⚽",
    ].join("\n");
  };

  const copyForWhatsApp = async () => {
    if (filtered.length === 0) return;

    try {
      await navigator.clipboard.writeText(buildWhatsAppText());
      window.alert("Listado copiado. Ya podés pegarlo en WhatsApp.");
    } catch (err) {
      console.error("ERROR AL COPIAR LISTADO:", err);
      setError("No se pudo copiar el listado.");
    }
  };

  const shareOnWhatsApp = () => {
    if (filtered.length === 0) return;

    const url = `https://wa.me/?text=${encodeURIComponent(
      buildWhatsAppText(),
    )}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const printMissing = () => {
    if (filtered.length === 0) return;
    window.print();
  };

  const handleSort = (key) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc"
          ? "desc"
          : "asc",
    }));
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return "↕";
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  const goToMatches = (sticker) => {
    navigate(
      `/matches?sticker=${encodeURIComponent(sticker.code || sticker.id)}`,
    );
  };

  if (loading) {
    return (
      <main className="missing-loading">
        <div className="missing-spinner" />
        <p>Cargando figuritas faltantes...</p>
      </main>
    );
  }

  return (
    <main className="missing-page">
      <section className="missing-hero">
        <div>
          <span>COLECCIÓN</span>
          <h1>Figuritas faltantes</h1>
          <p>
            Revisá lo que todavía te falta y descargá un listado
            para imprimir, compartir o llevar a un intercambio.
          </p>
        </div>

        <div className="missing-total">
          <strong>{stickers.length}</strong>
          <span>faltantes</span>
        </div>
      </section>

      <section className="missing-stats">
        <article className="missing-stat-card">
          <span aria-hidden="true">⭕</span>
          <div>
            <strong>{stats.total}</strong>
            <small>Faltantes</small>
          </div>
        </article>

        <article className="missing-stat-card">
          <span aria-hidden="true">🌍</span>
          <div>
            <strong>{stats.teams}</strong>
            <small>Selecciones</small>
          </div>
        </article>

        <article className="missing-stat-card">
          <span aria-hidden="true">🛡️</span>
          <div>
            <strong>{stats.shields}</strong>
            <small>Escudos</small>
          </div>
        </article>

        <article className="missing-stat-card">
          <span aria-hidden="true">👥</span>
          <div>
            <strong>{stats.teamPhotos}</strong>
            <small>Equipos</small>
          </div>
        </article>
      </section>

      {error && (
        <div className="missing-error" role="alert">
          {error}
        </div>
      )}

      <section className="missing-actions">
        <div className="missing-view-toggle">
          <button
            type="button"
            className={viewMode === "cards" ? "active" : ""}
            onClick={() => setViewMode("cards")}
          >
            🃏 Tarjetas
          </button>

          <button
            type="button"
            className={viewMode === "list" ? "active" : ""}
            onClick={() => setViewMode("list")}
          >
            📋 Lista
          </button>
        </div>

        <div className="missing-export-actions">
          <button
            type="button"
            onClick={copyForWhatsApp}
            disabled={filtered.length === 0}
          >
            📋 Copiar
          </button>

          <button
            type="button"
            className="missing-whatsapp-button"
            onClick={shareOnWhatsApp}
            disabled={filtered.length === 0}
          >
            📱 WhatsApp
          </button>

          <button
            type="button"
            onClick={downloadCsv}
            disabled={filtered.length === 0}
          >
            📄 CSV
          </button>

          <button
            type="button"
            onClick={downloadExcel}
            disabled={filtered.length === 0}
          >
            📗 Excel
          </button>

          <button
            type="button"
            onClick={printMissing}
            disabled={filtered.length === 0}
          >
            🖨️ Imprimir
          </button>
        </div>
      </section>

      <section className="missing-toolbar">
        <input
          type="search"
          placeholder="Buscar jugador, código o selección..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          value={groupFilter}
          onChange={(event) => setGroupFilter(event.target.value)}
        >
          {groups.map((group) => (
            <option key={group} value={group}>
              {group === "todos" ? "Todos los grupos" : `Grupo ${group}`}
            </option>
          ))}
        </select>

        <select
          value={teamFilter}
          onChange={(event) => setTeamFilter(event.target.value)}
        >
          {teams.map((team) => (
            <option key={team} value={team}>
              {team === "todas" ? "Todas las selecciones" : team}
            </option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(event) =>
            setCategoryFilter(event.target.value)
          }
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category === "todas"
                ? "Todas las categorías"
                : category}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={clearFilters}
          disabled={activeFilters.length === 0}
        >
          Limpiar
        </button>
      </section>

      <section className="missing-results-panel">
        <div className="missing-results">
          Mostrando <strong>{filtered.length}</strong> de{" "}
          <strong>{stickers.length}</strong> faltantes
        </div>

        <div className="missing-filter-summary">
          <span>
            Filtros activos: <strong>{activeFilters.length}</strong>
          </span>

          {activeFilters.map((filterItem) => (
            <button
              key={filterItem.key}
              type="button"
              onClick={() => removeFilter(filterItem.key)}
            >
              {filterItem.label} ×
            </button>
          ))}
        </div>
      </section>

      {filtered.length === 0 ? (
        <section className="missing-empty">
          <span>🎉</span>
          <h2>No hay figuritas para mostrar</h2>
          <p>Probá limpiando los filtros.</p>
        </section>
      ) : viewMode === "cards" ? (
        <section className="missing-grid">
          {filtered.map((sticker) => (
            <div className="missing-card-item" key={sticker.id}>
              <StickerCard
                sticker={sticker}
                savingId={savingId}
                updateStatus={updateStatus}
              />

              <button
                type="button"
                className="missing-find-trade"
                onClick={() => goToMatches(sticker)}
              >
                🤝 Buscar intercambio
              </button>
            </div>
          ))}
        </section>
      ) : (
        <section className="missing-list-card">
          <div className="missing-list-scroll">
            <table className="missing-table">
              <thead>
                <tr>
                  {Object.entries(SORTABLE_COLUMNS).map(([key, label]) => (
                    <th key={key}>
                      <button
                        type="button"
                        onClick={() => handleSort(key)}
                      >
                        {label} {getSortIndicator(key)}
                      </button>
                    </th>
                  ))}
                  <th>Acción</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((sticker) => (
                  <tr key={sticker.id}>
                    <td>
                      <strong>{sticker.code}</strong>
                    </td>
                    <td>{sticker.name || "Nombre no disponible"}</td>
                    <td>{sticker.team || "Sin selección"}</td>
                    <td>{sticker.group_name || "—"}</td>
                    <td>{sticker.category || "Figurita"}</td>
                    <td>
                      <button
                        type="button"
                        className="missing-table-trade"
                        onClick={() => goToMatches(sticker)}
                      >
                        🤝 Buscar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
