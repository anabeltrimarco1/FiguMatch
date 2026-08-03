export default function SearchBox({ search, setSearch }) {
  return (
    <div className="search-box">
      <span className="search-icon">🔍</span>
      <input
        type="text"
        placeholder="Buscar selección, jugador, código o número..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
  );
}
