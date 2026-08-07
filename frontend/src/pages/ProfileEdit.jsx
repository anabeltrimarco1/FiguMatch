import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import "./ProfileEdit.css";

const FAVORITE_TEAMS = [
  "Argentina",
  "Brasil",
  "Uruguay",
  "España",
  "Francia",
  "Alemania",
  "Italia",
  "Portugal",
  "Inglaterra",
  "Países Bajos",
  "México",
  "Estados Unidos",
  "Canadá",
  "Japón",
  "Corea del Sur",
  "Otra",
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

            <span>
              ⭐ {form.favoriteTeam || "Sin selección favorita"}
            </span>
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
              <label>
                <span>Nombre visible</span>

                <input
                  type="text"
                  name="displayName"
                  value={form.displayName}
                  maxLength={80}
                  placeholder="Ej.: Joaquín"
                  required
                  onChange={handleChange}
                />

                <small>{form.displayName.length}/80</small>
              </label>

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
                    <option key={team} value={team}>
                      {team}
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
