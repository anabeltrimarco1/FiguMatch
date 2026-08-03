export default function SearchBox({
  value,
  onChange,
  placeholder = "Buscar...",
  onClear,
  className = "",
  ...props
}) {
  const hasValue = Boolean(value);

  const handleClear = () => {
    if (onClear) {
      onClear();
      return;
    }

    onChange?.({
      target: {
        value: "",
      },
    });
  };

  return (
    <div className={`fm-search-box ${className}`}>
      <span
        className="fm-search-icon"
        aria-hidden="true"
      >
        🔎
      </span>

      <input
        type="search"
        className="fm-search-input"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        {...props}
      />

      {hasValue && (
        <button
          type="button"
          className="fm-search-clear"
          onClick={handleClear}
          aria-label="Limpiar búsqueda"
        >
          ×
        </button>
      )}
    </div>
  );
}