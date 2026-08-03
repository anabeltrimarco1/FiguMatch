export default function SectionTitle({
  eyebrow,
  title,
  description,
  action,
  className = "",
}) {
  return (
    <header className={`fm-section-title ${className}`}>
      <div className="fm-section-title-content">
        {eyebrow && (
          <span className="fm-section-eyebrow">
            {eyebrow}
          </span>
        )}

        <h2>{title}</h2>

        {description && (
          <p>{description}</p>
        )}
      </div>

      {action && (
        <div className="fm-section-title-action">
          {action}
        </div>
      )}
    </header>
  );
}