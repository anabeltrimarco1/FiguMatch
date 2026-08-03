export default function Card({
  children,
  title,
  subtitle,
  actions,
  className = "",
}) {
  return (
    <section className={`ui-card ${className}`}>
      {(title || subtitle || actions) && (
        <header className="ui-card-header">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p>{subtitle}</p>}
          </div>

          {actions && (
            <div className="ui-card-actions">
              {actions}
            </div>
          )}
        </header>
      )}

      <div className="ui-card-body">
        {children}
      </div>
    </section>
  );
}