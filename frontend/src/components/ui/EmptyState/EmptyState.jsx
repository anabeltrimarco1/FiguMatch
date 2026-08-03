export default function EmptyState({
  icon = "📭",
  title,
  description,
  action,
  compact = false,
  className = "",
}) {
  const classes = [
    "fm-empty-state",
    compact ? "fm-empty-state-compact" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <div className="fm-empty-state-content">
        <div className="fm-empty-state-icon">
          {icon}
        </div>

        {title && <h3>{title}</h3>}

        {description && <p>{description}</p>}

        {action && (
          <div className="fm-empty-state-action">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}