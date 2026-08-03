const STATUS_LABEL = {
  tengo: "Tengo",
  repetida: "Repetida",
  me_falta: "Me falta",
};

const TEAM_CODES = {
  mexico: "mx",
  sudafrica: "za",
  southafrica: "za",
  coreadelsur: "kr",
  southkorea: "kr",
  chequia: "cz",
  czechia: "cz",

  canada: "ca",
  bosnia: "ba",
  bosniayherzegovina: "ba",
  bosniaandherzegovina: "ba",
  qatar: "qa",
  suiza: "ch",
  switzerland: "ch",

  brasil: "br",
  brazil: "br",
  marruecos: "ma",
  morocco: "ma",
  haiti: "ht",
  escocia: "gb-sct",
  scotland: "gb-sct",

  argentina: "ar",
  alemania: "de",
  germany: "de",
  espana: "es",
  spain: "es",
  francia: "fr",
  france: "fr",
  uruguay: "uy",
  paraguay: "py",
  australia: "au",
  japon: "jp",
  japan: "jp",
  tunez: "tn",
  tunisia: "tn",

  croacia: "hr",
  croatia: "hr",
  ghana: "gh",
  panama: "pa",
  inglaterra: "gb-eng",
  england: "gb-eng",

  estadosunidos: "us",
  unitedstates: "us",
  usa: "us",
  turquia: "tr",
  turkey: "tr",
  paisesbajos: "nl",
  netherlands: "nl",
  suecia: "se",
  sweden: "se",
  belgica: "be",
  belgium: "be",
  egipto: "eg",
  egypt: "eg",
  iran: "ir",
  nuevazelanda: "nz",
  newzealand: "nz",
  caboverde: "cv",
  capeverde: "cv",
  arabiasaudita: "sa",
  saudiarabia: "sa",
  senegal: "sn",
  irak: "iq",
  iraq: "iq",
  noruega: "no",
  norway: "no",
  argelia: "dz",
  algeria: "dz",
  austria: "at",
  costademarfil: "ci",
  ivorycoast: "ci",
  ecuador: "ec",
  curazao: "cw",
  curacao: "cw",
};

const TEAM_CRESTS = {
  mexico: "/crests/mex.png",
  canada: "/crests/can.png",
  brasil: "/crests/bra.png",
  brazil: "/crests/bra.png",
  argentina: "/crests/arg.png",
  marruecos: "/crests/mar.png",
  morocco: "/crests/mar.png",
  haiti: "/crests/hai.png",
  escocia: "/crests/sco.png",
  scotland: "/crests/sco.png",
  qatar: "/crests/qat.png",
  suiza: "/crests/sui.png",
  switzerland: "/crests/sui.png",
};

function normalizeTeamName(name = "") {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toLowerCase();
}

export default function TeamSection({
  team,
  stickers,
  savingId,
  updateStatus,
}) {
  const total = stickers.length;

  const completed = stickers.filter(
    (sticker) => sticker.status === "tengo" || sticker.status === "repetida",
  ).length;

  const repeated = stickers.filter(
    (sticker) => sticker.status === "repetida",
  ).length;

  const missing = stickers.filter(
    (sticker) => sticker.status === "me_falta",
  ).length;

  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const orderedStickers = [...stickers].sort(
    (a, b) => Number(a.number) - Number(b.number),
  );

  const groupName = stickers[0]?.group_name || "";
  const normalizedTeam = normalizeTeamName(team);
  const countryCode = TEAM_CODES[normalizedTeam];

  const flagUrl = countryCode
    ? `https://flagcdn.com/w80/${countryCode}.png`
    : null;

  const crestUrl = TEAM_CRESTS[normalizedTeam] || null;

  return (
    <section className="album-team">
      <header className="album-team-cover">
        <div className="album-team-identity">
          <div className="album-team-symbols">
            <div className="album-team-flag">
              {flagUrl ? (
                <img src={flagUrl} alt={`Bandera de ${team}`} loading="lazy" />
              ) : (
                <span>⚽</span>
              )}
            </div>

            <div className="album-team-crest">
              {crestUrl ? (
                <img
                  src={crestUrl}
                  alt={`Escudo de ${team}`}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <span>🏆</span>
              )}
            </div>
          </div>

          <div>
            <span className="album-team-group">
              {groupName ? `Grupo ${groupName}` : "Mundial 2026"}
            </span>

            <h2>{team}</h2>

            <p>
              {completed} de {total} figuritas completadas
            </p>
          </div>
        </div>

        <div className="album-team-percent">
          <strong>{percent}%</strong>
          <span>completado</span>
        </div>
      </header>

      <div className="team-progress">
        <div style={{ width: `${percent}%` }} />
      </div>

      <div className="album-team-stats">
        <span className="team-stat tengo">
          ✅ Tengo: {completed - repeated}
        </span>

        <span className="team-stat repetida">🔁 Repetidas: {repeated}</span>

        <span className="team-stat falta">⭕ Faltan: {missing}</span>
      </div>

      <div className="album-grid">
        {orderedStickers.map((sticker) => (
          <article
            key={sticker.id}
            className={`album-slot ${sticker.status} ${sticker.category?.toLowerCase()}`}
          >
            <div className="album-slot-top">
              <span className="album-code">{sticker.code}</span>
              <span className={`album-status-dot ${sticker.status}`} />
            </div>

            <div className="album-slot-placeholder">
              <div className="album-empty-slot">
                <span className="album-empty-number">{sticker.number}</span>

                <span className="album-empty-code">{sticker.code}</span>
              </div>
            </div>

            <div className="album-player">{sticker.name}</div>

            <div className="album-slot-actions">
              {["tengo", "repetida", "me_falta"].map((status) => (
                <button
                  key={status}
                  type="button"
                  title={STATUS_LABEL[status]}
                  className={`album-btn ${status} ${
                    sticker.status === status ? "active" : ""
                  }`}
                  disabled={savingId === sticker.id}
                  onClick={() => updateStatus(sticker, status)}
                >
                  {status === "tengo" && "Tengo"}
                  {status === "repetida" && "Repe"}
                  {status === "me_falta" && "Falta"}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
