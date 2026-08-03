export default function Badge({
  children,
  color = "primary",
}) {
  return (
    <span className={`ui-badge ui-badge-${color}`}>
      {children}
    </span>
  );
}