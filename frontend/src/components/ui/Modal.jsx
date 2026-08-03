export default function Panel({
  children,
  className = "",
  variant = "default",
}) {
  return (
    <div
      className={`fm-panel fm-panel-${variant} ${className}`}
    >
      {children}
    </div>
  );
}