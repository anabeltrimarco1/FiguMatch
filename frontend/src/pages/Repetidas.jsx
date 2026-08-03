import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

import api from "../api.js";
import StickerCard from "../components/Album/StickerCard/StickerCard.jsx";
import "./Repetidas.css";

const SORTABLE_COLUMNS = {
  code: "Código",
  name: "Nombre",
  team: "Selección",
  group_name: "Grupo",
  category: "Categoría",
  quantity: "Cantidad",
};

export default function Repetidas() {
  const navigate = useNavigate();

  const [stickers, setStickers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("todas");
  const [categoryFilter, setCategoryFilter] = useState("todas");
  const [groupFilter, setGroupFilter] = useState("todos");
  const [quantityFilter, setQuantityFilter] = useState("todas");
  const [viewMode, setViewMode] = useState("cards");
  const [savingId, setSavingId] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: "code",
    direction: "asc",
  });

  useEffect(() => {
    const loadDuplicates = async () => {
      setLoading(true);
      setError("");

      try {
        const { data } = await api.get("/album");
        const album = Array.isArray(data)
          ? data
          : Array.isArray(data?.stickers)
            ? data.stickers
            : [];

        const duplicates = album.filter(
          (sticker) =>
            sticker.status === "repetida" ||
            Number(sticker.quantity || 0) > 1,
        );

        setStickers(duplicates);
      } catch (err) {
        console.error("ERROR AL CARGAR REPETIDAS:", err);
        setError("No se pudieron cargar las figuritas repetidas.");
      } finally {
        setLoading(false);
      }
    };

    loadDuplicates();
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
    const totalCopies = stickers.reduce(
      (sum, sticker) => sum + Math.max(Number(sticker.quantity || 0) - 1, 1),
      0,
    );

    return {
      different: stickers.length,
      copies: totalCopies,
      teams: new Set(
        stickers.map((sticker) => sticker.team).filter(Boolean),
      ).size,
      highStock: stickers.filter(
        (sticker) => Number(sticker.quantity || 0) >= 3,
      ).length,
    };
  }, [stickers]);

  const activeFilters = useMemo(() => {
    const result = [];

    if (search.trim()) {
      result.push({ key: "search", label: `Búsqueda: ${search.trim()}` });
    }

    if (groupFilter !== "todos") {
      result.push({ key: "group", label: `Grupo ${groupFilter}` });
    }

    if (teamFilter !== "todas") {
      result.push({ key: "team", label: teamFilter });
    }

    if (categoryFilter !== "todas") {
      result.push({ key: "category", label: categoryFilter });
    }

    if (quantityFilter !== "todas") {
      result.push({
        key: "quantity",
        label:
          quantityFilter === "2"
            ? "Cantidad: 2"
            : quantityFilter === "3"
              ? "Cantidad: 3"
              : "Cantidad: 4 o más",
      });
    }

    return result;
  }, [
    search,
    groupFilter,
    teamFilter,
    categoryFilter,
    quantityFilter,
  ]);

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

        const quantity = Number(sticker.quantity || 0);

        const matchesSearch = !term || searchableText.includes(term);
        const matchesTeam =
          teamFilter === "todas" || sticker.team === teamFilter;
        const matchesCategory =
          categoryFilter === "todas" ||
          sticker.category === categoryFilter;
        const matchesGroup =
          groupFilter === "todos" ||
          String(sticker.group_name || "") === groupFilter;
        const matchesQuantity =
          quantityFilter === "todas" ||
          (quantityFilter === "4"
            ? quantity >= 4
            : quantity === Number(quantityFilter));

        return (
          matchesSearch &&
          matchesTeam &&
          matchesCategory &&
          matchesGroup &&
          matchesQuantity
        );
      })
      .sort((a, b) => {
        const key = sortConfig.key;
        const direction = sortConfig.direction === "asc" ? 1 : -1;

        if (key === "quantity") {
          return (
            (Number(a.quantity || 0) - Number(b.quantity || 0)) *
            direction
          );
        }

        return (
          String(a[key] || "").localeCompare(String(b[key] || ""), "es", {
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
    quantityFilter,
    sortConfig,
  ]);

  const updateStatus = async (sticker, status) => {
    setSavingId(sticker.id);
    setError("");

    const quantity =
      status === "me_falta"
        ? 0
        : status === "repetida"
          ? Math.max(Number(sticker.quantity || 0), 2)
          : 1;

    try {
      await api.put(`/album/${sticker.id}`, { status, quantity });

      if (status !== "repetida" && quantity <= 1) {
        setStickers((current) =>
          current.filter((item) => item.id !== sticker.id),
        );
      } else {
        setStickers((current) =>
          current.map((item) =>
            item.id === sticker.id
              ? { ...item, status, quantity }
              : item,
          ),
        );
      }
    } catch (err) {
      console.error("ERROR AL ACTUALIZAR REPETIDA:", err);
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
    setQuantityFilter("todas");
  };

  const removeFilter = (filterKey) => {
    if (filterKey === "search") setSearch("");
    if (filterKey === "group") setGroupFilter("todos");
    if (filterKey === "team") setTeamFilter("todas");
    if (filterKey === "category") setCategoryFilter("todas");
    if (filterKey === "quantity") setQuantityFilter("todas");
  };

  const buildExportRows = () =>
    filtered.map((sticker) => ({
      Grupo: sticker.group_name || "",
      Selección: sticker.team || "",
      Código: sticker.code || "",
      Número: sticker.number || "",
      Categoría: sticker.category || "",
      Nombre: sticker.name || "",
      Cantidad: Number(sticker.quantity || 0),
      Disponibles: Math.max(Number(sticker.quantity || 0) - 1, 1),
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
    link.download = "figuritas_repetidas_figumatch.csv";
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
      { wch: 10 },
      { wch: 12 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Repetidas",
    );

    XLSX.writeFile(
      workbook,
      "figuritas_repetidas_figumatch.xlsx",
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
      "🔁 Tengo estas figuritas para intercambiar:",
      "",
      ...Object.entries(grouped).flatMap(([team, items]) => [
        `🌍 ${team}`,
        ...items.map(
          (sticker) =>
            `• ${sticker.code || ""} - ${
              sticker.name || "Nombre no disponible"
            } x${Math.max(Number(sticker.quantity || 0) - 1, 1)}`,
        ),
        "",
      ]),
      "Publicado desde FiguMatch ⚽",
    ].join("\n");
  };

  const copyForWhatsApp = async () => {
    if (filtered.length === 0) return;

    try {
      await navigator.clipboard.writeText(buildWhatsAppText());
      window.alert("Listado copiado. Ya podés pegarlo en WhatsApp.");
    } catch (err) {
      console.error("ERROR AL COPIAR REPETIDAS:", err);
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

  const printDuplicates = () => {
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
      `/matches?offer=${encodeURIComponent(sticker.code || sticker.id)}`,
    );
  };

  if (loading) {
    return (
      <main className="duplicates-loading">
        <div className="duplicates-spinner" />
        <p>Cargando figuritas repetidas...</p>
      </main>
    );
  }

  return (
    <main className="duplicates-page">
      <section className="duplicates-hero">
        <div>
          <span>COLECCIÓN</span>
          <h1>Mis figuritas repetidas</h1>
          <p>
            Organizá las figuritas que tenés de más, compartí tu lista
            y encontrá oportunidades de intercambio.
          </p>
        </div>

        <div className="duplicates-total">
          <strong>{stats.copies}</strong>
          <span>copias disponibles</span>
        </div>
      </section>

      <section className="duplicates-stats">
        <article className="duplicates-stat-card">
          <span aria-hidden="true">🔁</span>
          <div>
            <strong>{stats.different}</strong>
            <small>Figuritas distintas</small>
          </div>
        </article>

        <article className="duplicates-stat-card">
          <span aria-hidden="true">📦</span>
          <div>
            <strong>{stats.copies}</strong>
            <small>Copias disponibles</small>
          </div>
        </article>

        <article className="duplicates-stat-card">
          <span aria-hidden="true">🌍</span>
          <div>
            <strong>{stats.teams}</strong>
            <small>Selecciones</small>
          </div>
        </article>

        <article className="duplicates-stat-card">
          <span aria-hidden="true">⭐</span>
          <div>
            <strong>{stats.highStock}</strong>
            <small>Con 3 o más</small>
          </div>
        </article>
      </section>

      {error && (
        <div className="duplicates-error" role="alert">
          {error}
        </div>
      )}

      <section className="duplicates-actions">
        <div className="duplicates-view-toggle">
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

        <div className="duplicates-export-actions">
          <button
            type="button"
            onClick={copyForWhatsApp}
            disabled={filtered.length === 0}
          >
            📋 Copiar
          </button>

          <button
            type="button"
            className="duplicates-whatsapp-button"
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
            onClick={printDuplicates}
            disabled={filtered.length === 0}
          >
            🖨️ Imprimir
          </button>
        </div>
      </section>

      <section className="duplicates-toolbar">
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
          onChange={(event) => setCategoryFilter(event.target.value)}
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category === "todas"
                ? "Todas las categorías"
                : category}
            </option>
          ))}
        </select>

        <select
          value={quantityFilter}
          onChange={(event) => setQuantityFilter(event.target.value)}
        >
          <option value="todas">Todas las cantidades</option>
          <option value="2">Cantidad 2</option>
          <option value="3">Cantidad 3</option>
          <option value="4">Cantidad 4 o más</option>
        </select>

        <button
          type="button"
          onClick={clearFilters}
          disabled={activeFilters.length === 0}
        >
          Limpiar
        </button>
      </section>

      <section className="duplicates-results-panel">
        <div className="duplicates-results">
          Mostrando <strong>{filtered.length}</strong> de{" "}
          <strong>{stickers.length}</strong> repetidas
        </div>

        <div className="duplicates-filter-summary">
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
        <section className="duplicates-empty">
          <span>🔁</span>
          <h2>No hay repetidas para mostrar</h2>
          <p>Probá limpiando los filtros o marcá figuritas como repetidas.</p>
        </section>
      ) : viewMode === "cards" ? (
        <section className="duplicates-grid">
          {filtered.map((sticker) => (
            <div className="duplicates-card-item" key={sticker.id}>
              <div className="duplicates-quantity-badge">
                x{Number(sticker.quantity || 0)}
              </div>

              <StickerCard
                sticker={sticker}
                savingId={savingId}
                updateStatus={updateStatus}
              />

              <button
                type="button"
                className="duplicates-find-trade"
                onClick={() => goToMatches(sticker)}
              >
                🤝 Buscar intercambio
              </button>
            </div>
          ))}
        </section>
      ) : (
        <section className="duplicates-list-card">
          <div className="duplicates-list-scroll">
            <table className="duplicates-table">
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
                    <td><strong>{sticker.code}</strong></td>
                    <td>{sticker.name || "Nombre no disponible"}</td>
                    <td>{sticker.team || "Sin selección"}</td>
                    <td>{sticker.group_name || "—"}</td>
                    <td>{sticker.category || "Figurita"}</td>
                    <td>
                      <strong>x{Number(sticker.quantity || 0)}</strong>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="duplicates-table-trade"
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
