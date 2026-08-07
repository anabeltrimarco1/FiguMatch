import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import "./ProfileEdit.css";

const FAVORITE_TEAMS = [
  {
    name: "Alemania",
    shield: "/shields/alemania.svg",
  },
  {
    name: "Arabia Saudita",
    shield: "/shields/arabia saudita.svg",
  },
  {
    name: "Argelia",
    shield: "/shields/argelia.svg",
  },
  {
    name: "Argentina",
    shield: "/shields/argentina.svg",
  },
  {
    name: "Australia",
    shield: "/shields/australia.svg",
  },
  {
    name: "Austria",
    shield: "/shields/austria.svg",
  },
  {
    name: "Bélgica",
    shield: "/shields/belgica.svg",
  },
  {
    name: "Bosnia y Herzegovina",
    shield: "/shields/bosnia y herzegovina.svg",
  },
  {
    name: "Brasil",
    shield: "/shields/brasil.svg",
  },
  {
    name: "Cabo Verde",
    shield: "/shields/cabo verde.svg",
  },
  {
    name: "Canadá",
    shield: "/shields/canada.svg",
  },
  {
    name: "Chequia",
    shield: "/shields/chequia.svg",
  },
  {
    name: "Colombia",
    shield: "/shields/colombia.svg",
  },
  {
    name: "Corea del Sur",
    shield: "/shields/corea del sur.svg",
  },
  {
    name: "Costa de Marfil",
    shield: "/shields/costa de marfil.svg",
  },
  {
    name: "Croacia",
    shield: "/shields/croacia.svg",
  },
  {
    name: "Curazao",
    shield: "/shields/curazao.svg",
  },
  {
    name: "Ecuador",
    shield: "/shields/ecuador.svg",
  },
  {
    name: "Egipto",
    shield: "/shields/egipto.svg",
  },
  {
    name: "Escocia",
    shield: "/shields/escocia.svg",
  },
  {
    name: "España",
    shield: "/shields/espana.svg",
  },
  {
    name: "Estados Unidos",
    shield: "/shields/estados unidos.svg",
  },
  {
    name: "Francia",
    shield: "/shields/francia.svg",
  },
  {
    name: "Ghana",
    shield: "/shields/ghana.svg",
  },
  {
    name: "Haití",
    shield: "/shields/haiti.svg",
  },
  {
    name: "Inglaterra",
    shield: "/shields/inglaterra.svg",
  },
  {
    name: "Irak",
    shield: "/shields/irak.svg",
  },
  {
    name: "Irán",
    shield: "/shields/iran.svg",
  },
  {
    name: "Japón",
    shield: "/shields/japon.svg",
  },
  {
    name: "Jordania",
    shield: "/shields/jordania.svg",
  },
  {
    name: "Marruecos",
    shield: "/shields/marruecos.svg",
  },
  {
    name: "México",
    shield: "/shields/mexico.svg",
  },
  {
    name: "Noruega",
    shield: "/shields/noruega.svg",
  },
  {
    name: "Nueva Zelanda",
    shield: "/shields/nueva zelanda.svg",
  },
  {
    name: "Países Bajos",
    shield: "/shields/paises bajos.svg",
  },
  {
    name: "Panamá",
    shield: "/shields/panama.svg",
  },
  {
    name: "Paraguay",
    shield: "/shields/paraguay.svg",
  },
  {
    name: "Portugal",
    shield: "/shields/portugal.svg",
  },
  {
    name: "Qatar",
    shield: "/shields/qatar.svg",
  },
  {
    name: "RD Congo",
    shield: "/shields/rd congo.svg",
  },
  {
    name: "Senegal",
    shield: "/shields/senegal.svg",
  },
  {
    name: "Sudáfrica",
    shield: "/shields/sudafrica.png",
  },
  {
    name: "Suecia",
    shield: "/shields/suecia.svg",
  },
  {
    name: "Suiza",
    shield: "/shields/suiza.png",
  },
  {
    name: "Túnez",
    shield: "/shields/tunez.svg",
  },
  {
    name: "Turquía",
    shield: "/shields/turquia.png",
  },
  {
    name: "Uruguay",
    shield: "/shields/uruguay.svg",
  },
  {
    name: "Uzbekistán",
    shield: "/shields/uzbekistan.svg",
  },
];

function getInitialForm(user) {
  return {
    displayName:
      user?.displayName ||
      user?.name ||
      user?.username ||
      "",
    city:
      user?.city ||
      user?.location ||
      user?.zone ||
      "",
    favoriteTeam:
      user?.favoriteTeam ||
      user?.favorite_team ||
      user?.favoriteSelection ||
      user?.favorite_selection ||
      "",
    bio:
      user?.bio ||
      user?.description ||
      "",
    avatarUrl:
      user?.avatarUrl ||
      user?.avatar_url ||
      user?.avatar ||
      "",
  };
}

function getInitials(value) {
  return String(value || "Usuario")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function ProfileEdit() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const initialForm = useMemo(
    () => getInitialForm(user),
    [user],
  );

  const [form, setForm] = useState(initialForm);
  const [previewError, setPreviewError] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teamSearch, setTeamSearch] = useState("");

  const filteredTeams = useMemo(() => {
    const search = teamSearch
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

    if (!search) {
      return FAVORITE_TEAMS;
    }

    return FAVORITE_TEAMS.filter((team) =>
      team.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .includes(search)
    );
  }, [teamSearch]);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setLoadingProfile(true);
      setMessage("");
      setMessageType("");

      try {
        const response = await api.get("/profile");
        const profile = response.data?.profile;

        if (!profile || !isMounted) {
          return;
        }

        setForm({
          displayName:
            profile.displayName ||
            user?.username ||
            "",
          city: profile.city || "",
          favoriteTeam:
            profile.favoriteTeam || "",
          bio: profile.bio || "",
          avatarUrl:
            profile.avatarUrl || "",
        });

        setPreviewError(false);
      } catch (requestError) {
        console.error(
          "ERROR AL CARGAR PERFIL:",
          requestError,
        );

        if (isMounted) {
          setMessage(
            requestError.response?.data?.error ||
            "No se pudo cargar el perfil.",
          );
          setMessageType("error");
        }
      } finally {
        if (isMounted) {
          setLoadingProfile(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user?.username]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setMessage("");
    setMessageType("");

    if (name === "avatarUrl") {
      setPreviewError(false);
    }
  }

  function handleReset() {
    setForm(initialForm);
    setPreviewError(false);
    setMessage("");
    setMessageType("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.displayName.trim()) {
      setMessage("El nombre visible no puede quedar vacío.");
      setMessageType("error");
      return;
    }

    setSaving(true);
    setMessage("");
    setMessageType("");

    try {
      const response = await api.put("/profile", {
        displayName: form.displayName.trim(),
        city: form.city.trim(),
        favoriteTeam: form.favoriteTeam,
        bio: form.bio.trim(),
        avatarUrl: form.avatarUrl.trim(),
      });

      const savedProfile = response.data?.profile;

      if (savedProfile) {
        setForm({
          displayName:
            savedProfile.displayName || "",
          city: savedProfile.city || "",
          favoriteTeam:
            savedProfile.favoriteTeam || "",
          bio: savedProfile.bio || "",
          avatarUrl:
            savedProfile.avatarUrl || "",
        });

        updateUser(savedProfile);
      }

      setMessage(
        response.data?.message ||
        "Perfil actualizado correctamente.",
      );
      setMessageType("success");
    } catch (requestError) {
      console.error(
        "ERROR AL GUARDAR PERFIL:",
        requestError,
      );

      setMessage(
        requestError.response?.data?.error ||
        "No se pudo guardar el perfil.",
      );
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  }

  const avatarUrl = form.avatarUrl.trim();
  const showImage = avatarUrl && !previewError;

  return (
    <section className="profile-edit-page">
      <header className="profile-edit-hero">
        <div>
          <span className="profile-edit-eyebrow">
            PERFIL PREMIUM
          </span>

          <h2>Editar perfil</h2>

          <p>
            Personalizá cómo te ven otros coleccionistas
            dentro de FiguMatch.
          </p>
        </div>

        <button
          type="button"
          className="profile-edit-back"
          onClick={() => navigate("/perfil")}
        >
          ← Volver al perfil
        </button>
      </header>

      {loadingProfile ? (
        <div className="profile-edit-loading">
          <span aria-hidden="true">⏳</span>
          <strong>Cargando perfil...</strong>
        </div>
      ) : (
        <form
          className="profile-edit-layout"
          onSubmit={handleSubmit}
        >
          <aside className="profile-edit-preview">
            <div className="profile-edit-avatar">
              {showImage ? (
                <img
                  src={avatarUrl}
                  alt="Vista previa del avatar"
                  onError={() => setPreviewError(true)}
                />
              ) : (
                <span aria-hidden="true">
                  {getInitials(form.displayName)}
                </span>
              )}
            </div>

            <h3>
              {form.displayName.trim() ||
                user?.username ||
                "Coleccionista"}
            </h3>

            <p>
              @{String(user?.username || "usuario").replace(/^@/, "")}
            </p>

            <div className="profile-edit-preview-info">
              <span>📍 {form.city.trim() || "Sin ubicación"}</span>

              <div className="profile-edit-preview-team">
                <div className="profile-edit-preview-team-shield">
                  {form.favoriteTeam ? (
                    (() => {
                      const selectedTeam = FAVORITE_TEAMS.find(
                        (team) => team.name === form.favoriteTeam
                      );

                      return selectedTeam ? (
                        <img
                          src={selectedTeam.shield}
                          alt={`Escudo de ${selectedTeam.name}`}
                        />
                      ) : (
                        <span aria-hidden="true">⭐</span>
                      );
                    })()
                  ) : (
                    <span aria-hidden="true">⭐</span>
                  )}
                </div>

                <div>
                  <small>Selección favorita</small>

                  <strong>
                    {form.favoriteTeam || "Sin selección favorita"}
                  </strong>
                </div>
              </div>
            </div>

            <p className="profile-edit-preview-bio">
              {form.bio.trim() || "Tu presentación aparecerá acá."}
            </p>
          </aside>

          <main className="profile-edit-form-card">
            <section className="profile-edit-section">
              <div className="profile-edit-section-heading">
                <span aria-hidden="true">👤</span>

                <div>
                  <h3>Información pública</h3>
                  <p>
                    Estos datos serán visibles para otros
                    coleccionistas.
                  </p>
                </div>
              </div>

              <div className="profile-edit-fields">
                <div className="profile-edit-team-field">
                  <span className="profile-edit-team-label">
                    Selección favorita
                  </span>

                  <div className="profile-edit-team-search">
                    <span aria-hidden="true">🔍</span>

                    <input
                      type="search"
                      value={teamSearch}
                      placeholder="Buscar selección..."
                      onChange={(event) =>
                        setTeamSearch(event.target.value)
                      }
                    />

                    {teamSearch && (
                      <button
                        type="button"
                        aria-label="Limpiar búsqueda"
                        onClick={() => setTeamSearch("")}
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <div className="profile-edit-team-grid">
                    {filteredTeams.map((team) => {
                      const isSelected =
                        form.favoriteTeam === team.name;

                      return (
                        <button
                          key={team.name}
                          type="button"
                          className={`profile-edit-team-card ${isSelected ? "is-selected" : ""
                            }`}
                          aria-pressed={isSelected}
                          onClick={() => {
                            setForm((current) => ({
                              ...current,
                              favoriteTeam: team.name,
                            }));

                            setMessage("");
                            setMessageType("");
                          }}
                        >
                          <div className="profile-edit-team-shield">
                            <img
                              src={team.shield}
                              alt={`Escudo de ${team.name}`}
                              loading="lazy"
                              onError={(event) => {
                                event.currentTarget.style.display =
                                  "none";
                              }}
                            />
                          </div>

                          <div className="profile-edit-team-copy">
                            <strong>{team.name}</strong>

                            <small>
                              {isSelected
                                ? "Seleccionada"
                                : "Seleccionar"}
                            </small>
                          </div>

                          {isSelected && (
                            <span
                              className="profile-edit-team-check"
                              aria-hidden="true"
                            >
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {filteredTeams.length === 0 && (
                    <div className="profile-edit-team-empty">
                      No encontramos ninguna selección.
                    </div>
                  )}
                </div>
                <label>
                  <span>Ciudad o zona</span>

                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    maxLength={100}
                    placeholder="Ej.: Villa Ballester"
                    onChange={handleChange}
                  />

                  <small>{form.city.length}/100</small>
                </label>

                <label>
                  <span>Selección favorita</span>

                  <select
                    name="favoriteTeam"
                    value={form.favoriteTeam}
                    onChange={handleChange}
                  >
                    <option value="">Elegí una selección</option>

                    {FAVORITE_TEAMS.map((team) => (
                      <option
                        key={team.name}
                        value={team.name}
                      >
                        {team.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="profile-edit-field-wide">
                  <span>Biografía</span>

                  <textarea
                    name="bio"
                    value={form.bio}
                    maxLength={280}
                    rows={5}
                    placeholder="Contá algo sobre tu colección..."
                    onChange={handleChange}
                  />

                  <small>{form.bio.length}/280</small>
                </label>
              </div>
            </section>

            <section className="profile-edit-section">
              <div className="profile-edit-section-heading">
                <span aria-hidden="true">🖼️</span>

                <div>
                  <h3>Avatar</h3>
                  <p>
                    Por ahora podés usar una imagen mediante una URL pública.
                  </p>
                </div>
              </div>

              <label className="profile-edit-avatar-field">
                <span>URL de la imagen</span>

                <input
                  type="url"
                  name="avatarUrl"
                  value={form.avatarUrl}
                  maxLength={1000}
                  placeholder="https://..."
                  onChange={handleChange}
                />

                {previewError && (
                  <small className="profile-edit-error">
                    No se pudo cargar esa imagen.
                  </small>
                )}
              </label>
            </section>

            {message && (
              <div
                className={`profile-edit-message is-${messageType || "info"}`}
                role={messageType === "error" ? "alert" : "status"}
              >
                {message}
              </div>
            )}

            <footer className="profile-edit-actions">
              <button
                type="button"
                className="profile-edit-reset"
                onClick={handleReset}
                disabled={saving}
              >
                Restablecer
              </button>

              <button
                type="button"
                className="profile-edit-cancel"
                onClick={() => navigate("/perfil")}
                disabled={saving}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="profile-edit-save"
                disabled={saving}
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </footer>
          </main>
        </form>
      )}
    </section>
  );
}
