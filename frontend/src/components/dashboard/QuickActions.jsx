import { Link } from "react-router-dom";

export default function QuickActions() {
  return (
    <article className="dashboard-panel dashboard-actions-panel">
      <div className="panel-title-row">
        <div>
          <p className="panel-eyebrow">Accesos rápidos</p>
          <h2>¿Qué querés hacer hoy?</h2>
        </div>
      </div>

      <div className="quick-actions">
        <Link to="/album" className="quick-action">
          <span aria-hidden="true">📖</span>
          <div>
            <strong>Ver mi álbum</strong>
            <small>Revisá todas tus figuritas.</small>
          </div>
        </Link>

        <Link to="/repetidas" className="quick-action">
          <span aria-hidden="true">🔁</span>
          <div>
            <strong>Mis repetidas</strong>
            <small>Prepará figuritas para intercambiar.</small>
          </div>
        </Link>

        <Link to="/matches" className="quick-action">
          <span aria-hidden="true">🎯</span>
          <div>
            <strong>Buscar intercambios</strong>
            <small>Encontrá personas compatibles.</small>
          </div>
        </Link>

        <Link to="/album?filter=me_falta" className="quick-action">
          <span aria-hidden="true">🔎</span>
          <div>
            <strong>Ver faltantes</strong>
            <small>Descubrí cuáles necesitás.</small>
          </div>
        </Link>
      </div>
    </article>
  );
}
