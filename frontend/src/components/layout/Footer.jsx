export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="app-footer-brand">
        <strong>FiguMatch</strong>
        <span>© 2026 Todos los derechos reservados</span>
      </div>

      <div className="app-footer-information">
        <span className="app-footer-version">Versión 3.2</span>

        <span className="app-footer-status">
          <span className="app-footer-status-dot" />
          Sistema operativo
        </span>

        <span>Hecho para coleccionistas</span>

        <span className="app-footer-powered">
          Powered by <strong>Coreia</strong>
        </span>
      </div>
    </footer>
  );
}