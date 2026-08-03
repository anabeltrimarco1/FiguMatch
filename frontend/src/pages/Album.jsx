import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from "../api.js";
import ProgressBar from '../components/Album/ProgressBar.jsx';
import StatusFilter from '../components/Filters/StatusFilter.jsx';
import TeamFilter from '../components/Filters/TeamFilter.jsx';
import CardView from "../components/Album/CardView/CardView.jsx";
import AlbumView from "../components/Album/AlbumView/AlbumView.jsx";
import SearchBox from '../components/Filters/SearchBox.jsx';
import './Album.css';

export default function Album() {
  const [searchParams] = useSearchParams();
  const requestedFilter = searchParams.get('filter');

  const [stickers, setStickers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState(
    ['tengo', 'repetida', 'me_falta'].includes(requestedFilter)
      ? requestedFilter
      : 'todas'
  );
  const [teamFilter, setTeamFilter] = useState('todas');
  const [viewMode, setViewMode] = useState('cards');
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [importing, setImporting] = useState(false);

  const loadAlbum = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/album');
      setStickers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('ERROR AL CARGAR ÁLBUM:', err);
      setError('No se pudo cargar el álbum.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlbum();
  }, [loadAlbum]);

  useEffect(() => {
    if (['tengo', 'repetida', 'me_falta'].includes(requestedFilter)) {
      setFilter(requestedFilter);
    }
  }, [requestedFilter]);

  const importExcel = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setImporting(true);
    setError('');

    try {
      await api.post('/import/excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      await loadAlbum();
      window.alert('Álbum importado correctamente.');
    } catch (err) {
      console.error('ERROR AL IMPORTAR EXCEL:', err);
      setError('No se pudo importar el archivo Excel.');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const updateStatus = async (sticker, status) => {
    setSavingId(sticker.id);
    setError('');

    const quantity =
      status === 'me_falta'
        ? 0
        : status === 'repetida'
          ? Math.max(sticker.quantity || 0, 2)
          : 1;

    try {
      await api.put(`/album/${sticker.id}`, { status, quantity });

      setStickers((current) =>
        current.map((item) =>
          item.id === sticker.id
            ? { ...item, status, quantity }
            : item
        )
      );
    } catch (err) {
      console.error('ERROR AL ACTUALIZAR FIGURITA:', err);
      setError('No se pudo actualizar la figurita.');
    } finally {
      setSavingId(null);
    }
  };

  const counts = useMemo(
    () =>
      stickers.reduce(
        (result, sticker) => {
          result[sticker.status] = (result[sticker.status] || 0) + 1;
          return result;
        },
        { tengo: 0, repetida: 0, me_falta: 0 }
      ),
    [stickers]
  );

  const total = stickers.length;
  const completed = counts.tengo + counts.repetida;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const teams = useMemo(
    () =>
      [
        'todas',
        ...new Set(stickers.map((sticker) => sticker.team).filter(Boolean))
      ].sort((a, b) => a.localeCompare(b, 'es')),
    [stickers]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return stickers.filter((sticker) => {
      const searchableText = [
        sticker.team,
        sticker.name,
        sticker.code,
        sticker.number,
        sticker.category,
        sticker.group_name
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesStatus =
        filter === 'todas' || sticker.status === filter;
      const matchesTeam =
        teamFilter === 'todas' || sticker.team === teamFilter;
      const matchesSearch =
        !term || searchableText.includes(term);

      return matchesStatus && matchesTeam && matchesSearch;
    });
  }, [stickers, filter, teamFilter, search]);


  const groupedByTeam = useMemo(() => {
    return filtered.reduce((groups, sticker) => {
      const team = sticker.team || 'Sin selección';

      if (!groups[team]) {
        groups[team] = [];
      }

      groups[team].push(sticker);
      return groups;
    }, {});
  }, [filtered]);

  const activeFilters = useMemo(() => {
    let count = 0;

    if (filter !== 'todas') count += 1;
    if (teamFilter !== 'todas') count += 1;
    if (search.trim()) count += 1;

    return count;
  }, [filter, teamFilter, search]);

  const clearFilters = () => {
    setFilter('todas');
    setTeamFilter('todas');
    setSearch('');
  };

  if (loading) {
    return (
      <main className="album-loading-v11">
        <div className="album-loading-spinner" />
        <p>Cargando tu álbum...</p>
      </main>
    );
  }

  return (
    <main className="album-page album-page-v11">
      <section className="album-hero-v11">
        <div className="album-hero-content-v11">
          <span className="album-eyebrow-v11">MUNDIAL 2026</span>
          <h1>Mi álbum</h1>
          <p>
            Administrá tu colección, revisá tus repetidas y encontrá
            rápidamente las figuritas que todavía te faltan.
          </p>
        </div>

        <div
          className="album-progress-summary-v11"
          aria-label={`${progress}% del álbum completado`}
        >
          <strong>{progress}%</strong>
          <span>
            {completed} de {total} figuritas
          </span>
        </div>
      </section>

      {error && (
        <div className="album-error-v11" role="alert">
          <span>{error}</span>
          <button type="button" onClick={loadAlbum}>
            Reintentar
          </button>
        </div>
      )}

      <section className="album-summary album-summary-v11">
        <article
          className={`album-stat-v11 tengo ${filter === "tengo" ? "selected" : ""
            }`}
          onClick={() => setFilter("tengo")}
        >
          <span className="album-stat-icon-v11">✅</span>

          <div>
            <small>Tengo</small>
            <strong>{counts.tengo}</strong>
          </div>
        </article>

        <article
          className={`album-stat-v11 repetida ${filter === "repetida" ? "selected" : ""
            }`}
          onClick={() => setFilter("repetida")}
        >
          <span className="album-stat-icon-v11">🔁</span>

          <div>
            <small>Repetidas</small>
            <strong>{counts.repetida}</strong>
          </div>
        </article>

        <article
          className={`album-stat-v11 falta ${filter === "me_falta" ? "selected" : ""
            }`}
          onClick={() => setFilter("me_falta")}
        >
          <span className="album-stat-icon-v11">⭕</span>

          <div>
            <small>Me faltan</small>
            <strong>{counts.me_falta}</strong>
          </div>
        </article>

        <article
          className={`album-stat-v11 total ${filter === "todas" ? "selected" : ""
            }`}
          onClick={() => setFilter("todas")}
        >
          <span className="album-stat-icon-v11">⚽</span>

          <div>
            <small>Total</small>
            <strong>{total}</strong>
          </div>
        </article>
      </section>

      <section className="album-progress-card-v11">
        <div className="album-section-heading-v11">
          <div>
            <span>PROGRESO GENERAL</span>
            <h2>Tu colección</h2>
          </div>
          <strong>{progress}%</strong>
        </div>
        <ProgressBar progress={progress} />
      </section>

      <section className="album-toolbar-v11">
        <div className="view-toggle view-toggle-v11">
          <button
            type="button"
            className={viewMode === 'cards' ? 'active' : ''}
            onClick={() => setViewMode('cards')}
          >
            <span>📇</span>
            Tarjetas
          </button>

          <button
            type="button"
            className={viewMode === 'album' ? 'active' : ''}
            onClick={() => setViewMode('album')}
          >
            <span>📖</span>
            Álbum
          </button>
        </div>

        <label
          className={`import-button import-button-v11 ${importing ? 'disabled' : ''
            }`}
        >
          {importing ? 'Importando...' : '📥 Importar Excel'}
          <input
            type="file"
            accept=".xlsx,.xls"
            hidden
            disabled={importing}
            onChange={importExcel}
          />
        </label>
      </section>

      <section className="album-controls album-controls-v11">
        <SearchBox search={search} setSearch={setSearch} />

        <StatusFilter filter={filter} setFilter={setFilter} />

        <TeamFilter
          teams={teams}
          teamFilter={teamFilter}
          setTeamFilter={setTeamFilter}
        />

        {activeFilters > 0 && (
          <button
            type="button"
            className="clear-filters-v11"
            onClick={clearFilters}
          >
            Limpiar filtros ({activeFilters})
          </button>
        )}
      </section>

      <div className="album-results-bar-v11">
        <span>
          Mostrando <strong>{filtered.length}</strong> de{' '}
          <strong>{total}</strong> figuritas
        </span>

        <div className="album-active-filters-v11">
          {filter !== 'todas' && (
            <span className="album-active-filter-v11">
              Estado: {filter.replace('_', ' ')}
            </span>
          )}

          {teamFilter !== 'todas' && (
            <span className="album-active-filter-v11">
              Selección: {teamFilter}
            </span>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <section className="album-empty-v11">
          <span>🔎</span>
          <h2>No encontramos figuritas</h2>
          <p>Probá cambiando o limpiando los filtros.</p>
          <button type="button" onClick={clearFilters}>
            Limpiar filtros
          </button>
        </section>
      ) : viewMode === 'cards' ? (
        <CardView
          filtered={filtered}
          savingId={savingId}
          updateStatus={updateStatus}
        />
      ) : (
        <AlbumView
          groupedByTeam={groupedByTeam}
          savingId={savingId}
          updateStatus={updateStatus}
        />
      )}
    </main>
  );
}
