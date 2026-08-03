export default function Avatar({
  src,
  alt = "Avatar",
  name = "",
  size = "medium",
  status,
  className = "",
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  const classes = [
    "fm-avatar",
    `fm-avatar-${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className="fm-avatar-image"
        />
      ) : (
        <span className="fm-avatar-initials">
          {initials || "FM"}
        </span>
      )}

      {status && (
        <span
          className={`fm-avatar-status fm-avatar-status-${status}`}
          aria-label={`Estado: ${status}`}
        />
      )}
    </div>
  );
}