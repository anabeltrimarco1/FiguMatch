export default function TeamFilter({ teams, teamFilter, setTeamFilter }) {
  return (
    <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
      {teams.map((team) => (
        <option key={team} value={team}>
          {team === "todas" ? "Todas las selecciones" : team}
        </option>
      ))}
    </select>
  );
}
