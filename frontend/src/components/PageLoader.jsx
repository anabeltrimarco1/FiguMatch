import "../styles/PageLoader.css";

export default function PageLoader() {
  return (
    <div
      className="page-loader"
      role="status"
      aria-live="polite"
      aria-label="Cargando FiguMatch"
    >
      <div
        className="page-loader-ball"
        aria-hidden="true"
      >
        ⚽
      </div>

      <div className="page-loader-spinner" />

      <h2>Cargando FiguMatch...</h2>

      <p>Preparando tu colección.</p>
    </div>
  );
}
