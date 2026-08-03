export default function StatusFilter({ filter, setFilter }) {
  return (
    <select value={filter} onChange={(e) => setFilter(e.target.value)}>
      <option value="todas">Todas</option>
      <option value="tengo">Tengo</option>
      <option value="repetida">Repetidas</option>
      <option value="me_falta">Me faltan</option>
    </select>
  );
}
