export default function Button({
  children,
  variant = "primary",
  size = "medium",
  fullWidth = false,
  loading = false,
  disabled = false,
  className = "",
  type = "button",
  ...props
}) {
  const classes = [
    "fm-button",
    `fm-button-${variant}`,
    `fm-button-${size}`,
    fullWidth ? "fm-button-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading && (
        <span
          className="fm-button-loader"
          aria-hidden="true"
        />
      )}

      <span>{loading ? "Cargando..." : children}</span>
    </button>
  );
}