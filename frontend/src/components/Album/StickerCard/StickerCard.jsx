import "./StickerCard.css";

const STATUS_CONFIG = {
  tengo: {
    label: "Tengo",
    shortLabel: "Tengo",
    icon: "✅",
  },
  repetida: {
    label: "Repetida",
    shortLabel: "Repe",
    icon: "🔁",
  },
  me_falta: {
    label: "Me falta",
    shortLabel: "Falta",
    icon: "⭕",
  },
};

function normalizeTeamName(team = "") {
  const normalized = team
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const aliases = {
    argelia: "dza",
    algeria: "dza",
  };

  return aliases[normalized] || normalized;
}

function getShield(team, extension = "svg") {
  return `/shields/${normalizeTeamName(team)}.${extension}`;
}

export default function StickerCard({
  sticker,
  savingId,
  updateStatus,
}) {
  const isSaving = savingId === sticker.id;

  const currentStatus =
    STATUS_CONFIG[sticker.status] || STATUS_CONFIG.me_falta;

  const categoryClass = sticker.category
    ? sticker.category.toLowerCase().replace(/\s+/g, "-")
    : "";

  const isShield =
    String(sticker.category || "").trim().toLowerCase() === "escudo";

  const displayName = isShield
    ? `Escudo de ${sticker.team || "selección"}`
    : sticker.name ||
    sticker.player_name ||
    sticker.player ||
    "Nombre no disponible";

  const handleShieldError = (event) => {
    const image = event.currentTarget;

    if (image.dataset.pngTried !== "true") {
      image.dataset.pngTried = "true";
      image.src = getShield(sticker.team, "png");
      return;
    }

    image.style.display = "none";

    const fallbackIcon =
      image.parentElement?.querySelector(
        ".premium-sticker-placeholder-icon"
      );

    if (fallbackIcon) {
      fallbackIcon.style.display = "block";
    }
  };

  return (
    <article
      className={`premium-sticker-card ${sticker.status} ${categoryClass}`}
    >
      <div className="premium-sticker-visual">
        <div className="premium-sticker-topbar">
          <span className="premium-sticker-code">
              {sticker.code}
          </span>

          <span
            className={`premium-sticker-status ${sticker.status}`}
          >
            <span aria-hidden="true">
              {currentStatus.icon}
            </span>

            {currentStatus.label}
          </span>
        </div>

        <div className="premium-sticker-image-wrap">
          <div className="premium-sticker-placeholder">
            <img
              src={getShield(sticker.team, "svg")}
              alt={`Escudo de ${sticker.team}`}
              className="premium-sticker-placeholder-shield"
              loading="lazy"
              onError={handleShieldError}
            />

            <span
              className="premium-sticker-placeholder-icon"
              style={{ display: "none" }}
              aria-hidden="true"
            >
              ⚽
            </span>

            <strong className="premium-sticker-placeholder-code">
              {displayName}
            </strong>

            <small>{sticker.team}</small>
          </div>
        </div>

        <div className="premium-sticker-team">
          <span>SELECCIÓN</span>
          <strong>{sticker.team}</strong>
        </div>
      </div>

      <div className="premium-sticker-info">
        <div className="premium-sticker-title-row">
          <div>
            <h3 className="premium-player-name">
              {displayName}
            </h3>

            <p className="premium-team-name">
              {sticker.team}
            </p>
          </div>

          <span className="premium-sticker-number">
            #{sticker.number}
          </span>
        </div>

        <div className="premium-sticker-meta">
          <span>
            🏆 {sticker.category || "Figurita"}
          </span>

          {sticker.group_name && (
            <span>
              🌎 Grupo {sticker.group_name}
            </span>
          )}

          {sticker.quantity > 1 && (
            <span>
              📦 x{sticker.quantity}
            </span>
          )}
        </div>
      </div>

      <div className="premium-sticker-actions">
        {Object.entries(STATUS_CONFIG).map(
          ([status, config]) => (
            <button
              key={status}
              type="button"
              className={`premium-status-button ${status} ${sticker.status === status ? "active" : ""
                }`}
              disabled={isSaving}
              onClick={() =>
                updateStatus(sticker, status)
              }
              aria-pressed={
                sticker.status === status
              }
              title={`Marcar ${sticker.code} como ${config.label}`}
            >
              <span aria-hidden="true">
                {config.icon}
              </span>

              <span>{config.shortLabel}</span>
            </button>
          )
        )}
      </div>

      {isSaving && (
        <div
          className="premium-sticker-saving"
          aria-live="polite"
        >
          <span className="premium-sticker-spinner" />
          Guardando...
        </div>
      )}
    </article>
  );
}