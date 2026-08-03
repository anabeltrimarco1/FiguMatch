import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import "./login.css";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await register(username.trim(), email.trim(), password);
      navigate("/dashboard");
    } catch (err) {
      console.error("REGISTER ERROR:", err);

      setError(
        err?.message ||
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          "No se pudo crear la cuenta."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-hero" aria-label="Presentación de FiguMatch">
        <div className="auth-hero-content">
          <div className="auth-brand">
            <div className="auth-brand-mark" aria-hidden="true">
              <span className="auth-card-mini auth-card-mini-left">🧑</span>
              <span className="auth-swap">↔</span>
              <span className="auth-card-mini auth-card-mini-right">🧑</span>
            </div>

            <div>
              <strong>FiguMatch</strong>
              <span>Mundial 2026</span>
            </div>
          </div>

          <span className="auth-kicker">SUMATE A FIGUMATCH</span>

          <h1>
            Tu colección.
            <br />
            Tus intercambios.
            <br />
            <span>Tu mundial.</span>
          </h1>

          <p className="auth-description">
            Creá tu cuenta, organizá todas tus figuritas y conectate con otros
            coleccionistas para completar el álbum.
          </p>

          <div className="auth-benefits">
            <article>
              <div className="auth-benefit-icon" aria-hidden="true">👥</div>
              <div>
                <strong>Comunidad</strong>
                <span>Conectate con coleccionistas como vos.</span>
              </div>
            </article>

            <article>
              <div className="auth-benefit-icon" aria-hidden="true">🔄</div>
              <div>
                <strong>Intercambios simples</strong>
                <span>Publicá repetidas y encontrá las que te faltan.</span>
              </div>
            </article>

            <article>
              <div className="auth-benefit-icon" aria-hidden="true">🛡️</div>
              <div>
                <strong>Cuenta protegida</strong>
                <span>Tu información se mantiene segura.</span>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-form-icon" aria-hidden="true">👤</div>

          <header className="auth-heading">
            <span>NUEVA CUENTA</span>
            <h2>Crear cuenta</h2>
            <p>Unite a FiguMatch y empezá a organizar tu colección.</p>
          </header>

          {error && (
            <div className="auth-error" role="alert">
              <span aria-hidden="true">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>Nombre de usuario</span>

              <div className="auth-input">
                <span aria-hidden="true">👤</span>

                <input
                  type="text"
                  value={username}
                  autoComplete="username"
                  placeholder="Elegí tu usuario"
                  onChange={(event) => {
                    setUsername(event.target.value);
                    setError("");
                  }}
                  required
                />
              </div>
            </label>

            <label className="auth-field">
              <span>Correo electrónico</span>

              <div className="auth-input">
                <span aria-hidden="true">✉️</span>

                <input
                  type="email"
                  value={email}
                  autoComplete="email"
                  placeholder="nombre@correo.com"
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError("");
                  }}
                  required
                />
              </div>
            </label>

            <label className="auth-field">
              <span>Contraseña</span>

              <div className="auth-input">
                <span aria-hidden="true">🔒</span>

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  minLength={6}
                  required
                />

                <button
                  type="button"
                  className="auth-password-toggle"
                  aria-label={
                    showPassword
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </label>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>

          <div className="auth-switch">
            <span>¿Ya tenés una cuenta?</span>
            <Link to="/login">Iniciá sesión</Link>
          </div>

          <footer className="auth-footer">
            <span>🔒 Tus datos están protegidos</span>
            <span>© 2026 FiguMatch · Powered by CoreIA</span>
          </footer>
        </div>
      </section>
    </main>
  );
}