import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api.js";
import "./Matches.css";

function getCompatibility(match) {
  const score = Number(match.score || 0);
  const giveCount = Array.isArray(match.ellosMeDan)
    ? match.ellosMeDan.length
    : 0;
  const receiveCount = Array.isArray(match.yoLesDoy)
    ? match.yoLesDoy.length
    : 0;

  const possibleTrades = Math.min(giveCount, receiveCount);
  const raw = score > 0 ? score : possibleTrades * 10;
  const percentage = Math.max(0, Math.min(100, Math.round(raw)));
  if (percentage >= 90) {
    return {
      percentage,
      label: "Excelente",
      className: "excellent",
      stars: 5,
    };
  }

  if (percentage >= 70) {
    return {
      percentage,
      label: "Muy buena",
      className: "very-good",
      stars: 4,
    };
  }

  if (percentage >= 50) {
    return {
      percentage,
      label: "Buena",
      className: "good",
      stars: 3,
    };
  }

  return {
    percentage,
    label: "Inicial",
    className: "basic",
    stars: 2,
  };
}

function StickerChip({ sticker }) {
  return (
    <span className="match-sticker-chip">
      <strong>{sticker.code || `#${sticker.number}`}</strong>
      <small>{sticker.team}</small>
    </span>
  );
}

function TradeStickerSelector({
  title,
  eyebrow,
  icon,
  type,
  stickers,
  selected,
  setSelected,
  toggleSticker,
}) {
  return (
    <section className={`trade-modal-column ${type}`}>
      <div className="trade-modal-column-title">
        <span>{icon}</span>

        <div>
          <small>{eyebrow}</small>
          <h3>{title}</h3>
        </div>
      </div>

      <div className="trade-modal-stickers">
        {stickers.map((sticker) => {
          const stickerId = sticker.stickerId;
          const checked = selected.includes(stickerId);

          return (
            <button
              key={stickerId}
              type="button"
              className={`trade-modal-sticker ${checked ? "selected" : ""}`}
              aria-pressed={checked}
              onClick={() => toggleSticker(stickerId, setSelected)}
              style={{ cursor: "pointer", textAlign: "left" }}
            >
              <span className="trade-checkmark">{checked ? "✓" : ""}</span>

              <div>
                <strong>{sticker.code || `#${sticker.number}`}</strong>

                <small>{sticker.team}</small>
                <span>{sticker.name || "Figurita"}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function Matches() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [minimumCompatibility, setMinimumCompatibility] = useState(0);
  const [minimumTrades, setMinimumTrades] = useState(0);
  const [sortBy, setSortBy] = useState("compatibility");
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedReceive, setSelectedReceive] = useState([]);
  const [selectedGive, setSelectedGive] = useState([]);
  const [sendingRequest, setSendingRequest] = useState(false);

  const handleOpenChat = (match) => {
    const userId = Number(match?.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      window.alert("No se pudo abrir el chat con este usuario.");
      return;
    }

    const username = encodeURIComponent(
      match?.username || "Coleccionista",
    );

    navigate(`/chat?userId=${userId}&username=${username}`);
  };

  const loadMatches = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true);
      setError("");
    }

    try {
      const { data } = await api.get("/matches");
      setMatches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("ERROR AL CARGAR INTERCAMBIOS:", err);
      setError("No se pudieron cargar los intercambios.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRetry = () => {
    void loadMatches(true);
  };

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  const filteredMatches = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const result = matches.filter((match) => {
      const compatibility = getCompatibility(match).percentage;

      const theyGive = Array.isArray(match.ellosMeDan) ? match.ellosMeDan : [];

      const iGive = Array.isArray(match.yoLesDoy) ? match.yoLesDoy : [];

      const tradeCount = Math.min(theyGive.length, iGive.length);

      const username = String(match.username || "Coleccionista").toLowerCase();

      const matchesSearch =
        normalizedSearch === "" || username.includes(normalizedSearch);

      const matchesCompatibility = compatibility >= minimumCompatibility;

      const matchesTrades = tradeCount >= minimumTrades;

      return matchesSearch && matchesCompatibility && matchesTrades;
    });

    return result.sort((a, b) => {
      const aCompatibility = getCompatibility(a).percentage;
      const bCompatibility = getCompatibility(b).percentage;

      const aTradeCount = Math.min(
        Array.isArray(a.ellosMeDan) ? a.ellosMeDan.length : 0,
        Array.isArray(a.yoLesDoy) ? a.yoLesDoy.length : 0,
      );

      const bTradeCount = Math.min(
        Array.isArray(b.ellosMeDan) ? b.ellosMeDan.length : 0,
        Array.isArray(b.yoLesDoy) ? b.yoLesDoy.length : 0,
      );

      if (sortBy === "trades") {
        return bTradeCount - aTradeCount;
      }

      if (sortBy === "name") {
        return String(a.username || "").localeCompare(
          String(b.username || ""),
          "es",
        );
      }

      return bCompatibility - aCompatibility;
    });
  }, [matches, search, minimumCompatibility, minimumTrades, sortBy]);

  const totalPossibleTrades = useMemo(() => {
    return matches.reduce((total, match) => {
      const giveCount = Array.isArray(match.ellosMeDan)
        ? match.ellosMeDan.length
        : 0;
      const receiveCount = Array.isArray(match.yoLesDoy)
        ? match.yoLesDoy.length
        : 0;

      return total + Math.min(giveCount, receiveCount);
    }, 0);
  }, [matches]);
  const averageCompatibility = useMemo(() => {
    if (matches.length === 0) {
      return 0;
    }

    const total = matches.reduce((sum, match) => {
      return sum + getCompatibility(match).percentage;
    }, 0);

    return Math.round(total / matches.length);
  }, [matches]);

  const bestMatch = useMemo(() => {
    if (matches.length === 0) {
      return null;
    }

    return [...matches].sort((a, b) => {
      return getCompatibility(b).percentage - getCompatibility(a).percentage;
    })[0];
  }, [matches]);

  const openTradeModal = (match) => {
    const theyGive = Array.isArray(match.ellosMeDan) ? match.ellosMeDan : [];

    const iGive = Array.isArray(match.yoLesDoy) ? match.yoLesDoy : [];

    const initialQuantity = Math.min(theyGive.length, iGive.length);

    setSelectedMatch(match);

    setSelectedReceive(
      theyGive.slice(0, initialQuantity).map((sticker) => sticker.stickerId),
    );

    setSelectedGive(
      iGive.slice(0, initialQuantity).map((sticker) => sticker.stickerId),
    );
  };

  const closeTradeModal = () => {
    setSelectedMatch(null);
    setSelectedReceive([]);
    setSelectedGive([]);
  };

  const toggleSticker = (stickerId, setSelectedStickers) => {
    setSelectedStickers((current) =>
      current.includes(stickerId)
        ? current.filter((id) => id !== stickerId)
        : [...current, stickerId],
    );
  };

  const submitTradeRequest = async () => {
    if (!selectedMatch || sendingRequest) return;

    if (selectedReceive.length === 0 || selectedGive.length === 0) {
      window.alert(
        "Elegí al menos una figurita para recibir y una para entregar.",
      );
      return;
    }
    try {
      const requestData = {
        receiverId: selectedMatch.userId,
        giveStickerIds: selectedGive,
        receiveStickerIds: selectedReceive,
      };

      setSendingRequest(true);

      await api.post("/matches/request", requestData);

      window.alert("✅ Solicitud enviada correctamente");

      closeTradeModal();

      loadMatches();
    } catch (err) {
      console.error(err);

      window.alert(
        err.response?.data?.error || "No se pudo enviar la solicitud.",
      );
    } finally {
      setSendingRequest(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setMinimumCompatibility(0);
    setMinimumTrades(0);
    setSortBy("compatibility");
  };
  if (loading) {
    return (
      <div className="matches-loading-v11">
        <div className="album-loading-spinner" />
        <p>Buscando intercambios compatibles...</p>
      </div>
    );
  }

  return (
    <div className="matches-page matches-page-v11">
      <section className="matches-hero-v11">
        <div>
          <span className="matches-eyebrow-v11">Intercambios</span>
          <h1>Encontrá tu próximo match</h1>
          <p>
            Descubrí coleccionistas que tienen las figuritas que te faltan y
            buscan las repetidas que vos podés ofrecer.
          </p>
        </div>

        <div className="matches-summary-v11">
          <article>
            <strong>{matches.length}</strong>
            <span>personas compatibles</span>
          </article>

          <article>
            <strong>{totalPossibleTrades}</strong>
            <span>intercambios posibles</span>
          </article>

          <article>
            <strong>{averageCompatibility}%</strong>
            <span>compatibilidad promedio</span>
          </article>

          <article>
            <strong>
              {bestMatch ? getCompatibility(bestMatch).percentage : 0}%
            </strong>

            <span>
              mejor match
              {bestMatch?.username ? `: ${bestMatch.username}` : ""}
            </span>
          </article>
        </div>
      </section>
      <section className="matches-filters-v11">
        <div className="matches-search-v11">
          <label htmlFor="match-search">Buscar coleccionista</label>

          <input
            id="match-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Escribí un nombre..."
          />
        </div>

        <div className="matches-filter-field-v11">
          <label htmlFor="compatibility-filter">Compatibilidad</label>

          <select
            id="compatibility-filter"
            value={minimumCompatibility}
            onChange={(event) =>
              setMinimumCompatibility(Number(event.target.value))
            }
          >
            <option value={0}>Todas</option>
            <option value={50}>50 % o más</option>
            <option value={70}>70 % o más</option>
            <option value={90}>90 % o más</option>
          </select>
        </div>

        <div className="matches-filter-field-v11">
          <label htmlFor="trades-filter">Intercambios posibles</label>

          <select
            id="trades-filter"
            value={minimumTrades}
            onChange={(event) => setMinimumTrades(Number(event.target.value))}
          >
            <option value={0}>Cualquier cantidad</option>
            <option value={1}>1 o más</option>
            <option value={3}>3 o más</option>
            <option value={5}>5 o más</option>
            <option value={10}>10 o más</option>
          </select>
        </div>

        <div className="matches-filter-field-v11">
          <label htmlFor="matches-sort">Ordenar por</label>

          <select
            id="matches-sort"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
          >
            <option value="compatibility">Mayor compatibilidad</option>

            <option value="trades">Más intercambios</option>

            <option value="name">Nombre</option>
          </select>
        </div>

        <button
          type="button"
          className="matches-clear-filters-v11"
          onClick={clearFilters}
        >
          Limpiar filtros
        </button>
      </section>

      {error && (
        <div className="matches-error-v11">
          <span>{error}</span>
          <button type="button" onClick={handleRetry}>
            Reintentar
          </button>
        </div>
      )}

      {!error && filteredMatches.length === 0 ? (
        <section className="matches-empty-v11">
          <span>🤝</span>
          <h2>
            {matches.length === 0
              ? "Todavía no encontramos coincidencias"
              : "No encontramos resultados con estos filtros"}
          </h2>
          <p>
            {matches.length === 0 ? (
              <>
                Marcá figuritas como <strong>Repetida</strong> y{" "}
                <strong>Me falta</strong> en tu álbum. Cuando otros usuarios
                hagan lo mismo, aparecerán acá.
              </>
            ) : (
              <>
                Probá reduciendo la compatibilidad mínima o la cantidad de
                intercambios requeridos.
              </>
            )}
          </p>

          <Link to="/album">📖 Ir a mi álbum</Link>
          {matches.length > 0 && (
            <button
              type="button"
              className="matches-clear-filters-v11"
              onClick={clearFilters}
            >
              Limpiar filtros
            </button>
          )}
        </section>
      ) : (
        <section className="matches-list matches-list-v11">
          {filteredMatches.map((match, index) => {
            const compatibility = getCompatibility(match);
            const theyGive = Array.isArray(match.ellosMeDan)
              ? match.ellosMeDan
              : [];
            const iGive = Array.isArray(match.yoLesDoy) ? match.yoLesDoy : [];
            const tradeCount = Math.min(theyGive.length, iGive.length);
            const username = match.username || "Coleccionista";
            const avatarLetter = username.charAt(0).toUpperCase();

            return (
              <article
                key={match.userId}
                className={`match-card match-card-v11 ${compatibility.className}`}
              >
                <header className="match-card-header-v11">
                  <div className="match-user-v11">
                    <div className="match-rank-v11">#{index + 1}</div>

                    <div className="match-avatar-v11">{avatarLetter}</div>

                    <div>
                      <span className="match-card-eyebrow-v11">
                        COLECCIONISTA
                      </span>
                      <h2>{username}</h2>
                      <p>
                        {tradeCount} intercambio
                        {tradeCount === 1 ? "" : "s"} posible
                        {tradeCount === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>

                  <div className="match-compatibility-v11">
                    <div className="match-stars-v11">
                      {"⭐".repeat(compatibility.stars)}
                    </div>

                    <strong>{compatibility.percentage}%</strong>
                    <span>{compatibility.label}</span>

                    <div
                      className="match-compatibility-track-v11"
                      aria-hidden="true"
                    >
                      <div
                        className="match-compatibility-fill-v11"
                        style={{ width: `${compatibility.percentage}%` }}
                      />
                    </div>
                  </div>
                </header>

                <div className="match-columns match-columns-v11">
                  <section className="match-column-v11 receive">
                    <div className="match-column-header-v11">
                      <div>
                        <span>🎁</span>
                        <div>
                          <small>VOS RECIBÍS</small>
                          <h3>Te puede dar ({theyGive.length})</h3>
                        </div>
                      </div>
                    </div>

                    {theyGive.length > 0 ? (
                      <div className="match-stickers-v11">
                        {theyGive.map((sticker) => (
                          <StickerChip
                            key={sticker.stickerId}
                            sticker={sticker}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="match-empty-list-v11">Nada por ahora.</p>
                    )}
                  </section>

                  <section className="match-column-v11 give">
                    <div className="match-column-header-v11">
                      <div>
                        <span>📦</span>
                        <div>
                          <small>VOS ENTREGÁS</small>
                          <h3>Le podés dar ({iGive.length})</h3>
                        </div>
                      </div>
                    </div>

                    {iGive.length > 0 ? (
                      <div className="match-stickers-v11">
                        {iGive.map((sticker) => (
                          <StickerChip
                            key={sticker.stickerId}
                            sticker={sticker}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="match-empty-list-v11">Nada por ahora.</p>
                    )}
                  </section>
                </div>

                <footer className="match-actions-v11">
                  <div className="match-balance-v11">
                    <span>⚖️</span>
                    <p>
                      Intercambio equilibrado para <strong>{tradeCount}</strong>{" "}
                      figurita
                      {tradeCount === 1 ? "" : "s"}.
                    </p>
                  </div>

                  <div className="match-buttons-v11">
                    <button
                      type="button"
                      className="match-request-btn"
                      onClick={() => openTradeModal(match)}
                      style={{ cursor: "pointer" }}
                    >
                      🤝 Solicitar intercambio
                    </button>

                    <button
                      type="button"
                      className="match-secondary-btn"
                      onClick={() => handleOpenChat(match)}
                    >
                      💬 Chatear
                    </button>
                  </div>
                </footer>
              </article>
            );
          })}
        </section>
      )}

      {selectedMatch && (
        <div
          className="trade-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeTradeModal();
            }
          }}
        >
          <section
            className="trade-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="trade-modal-title"
          >
            <header className="trade-modal-header">
              <div>
                <span>PROPUESTA DE INTERCAMBIO</span>

                <h2 id="trade-modal-title">
                  Intercambio con {selectedMatch.username || "Coleccionista"}
                </h2>
              </div>

              <button
                type="button"
                className="trade-modal-close"
                onClick={closeTradeModal}
                aria-label="Cerrar"
              >
                ×
              </button>
            </header>

            <div className="trade-modal-summary">
              <article>
                <strong>{selectedReceive.length}</strong>
                <span>recibís</span>
              </article>

              <article>
                <strong>{selectedGive.length}</strong>
                <span>entregás</span>
              </article>

              <article>
                <strong>
                  {Math.min(selectedReceive.length, selectedGive.length)}
                </strong>
                <span>intercambios</span>
              </article>
            </div>

            <div className="trade-modal-columns">
              <TradeStickerSelector
                title="Elegí las figuritas que querés"
                eyebrow="VOS RECIBÍS"
                icon="🎁"
                type="receive"
                stickers={selectedMatch.ellosMeDan || []}
                selected={selectedReceive}
                setSelected={setSelectedReceive}
                toggleSticker={toggleSticker}
              />

              <TradeStickerSelector
                title="Elegí tus repetidas"
                eyebrow="VOS ENTREGÁS"
                icon="📦"
                type="give"
                stickers={selectedMatch.yoLesDoy || []}
                selected={selectedGive}
                setSelected={setSelectedGive}
                toggleSticker={toggleSticker}
              />
            </div>

            <footer className="trade-modal-actions">
              <button
                type="button"
                className="trade-cancel-btn"
                onClick={closeTradeModal}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="trade-submit-btn"
                onClick={submitTradeRequest}
                disabled={
                  sendingRequest ||
                  selectedReceive.length === 0 ||
                  selectedGive.length === 0
                }
                style={{
                  cursor:
                    sendingRequest ||
                      selectedReceive.length === 0 ||
                      selectedGive.length === 0
                      ? "default"
                      : "pointer",
                }}
              >
                {sendingRequest ? "Enviando..." : "🤝 Enviar solicitud"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
