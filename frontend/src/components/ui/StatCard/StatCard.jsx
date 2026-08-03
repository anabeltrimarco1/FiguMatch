export default function StatCard({
  icon,
  label,
  value,
  helper,
  variant = "primary",
  trend,
  className = "",
}) {
  const classes = [
    "fm-stat-card",
    `fm-stat-card-${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={classes}>
      <div className="fm-stat-card-top">
        <div className="fm-stat-card-icon">
          {icon}
        </div>

        {trend && (
          <span
            className={`fm-stat-card-trend fm-stat-card-trend-${trend.type}`}
          >
            {trend.value}
          </span>
        )}
      </div>

      <div className="fm-stat-card-content">
        <strong>{value}</strong>
        <span>{label}</span>

        {helper && (
          <small>{helper}</small>
        )}
      </div>
    </article>
  );
}