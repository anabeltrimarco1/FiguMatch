import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import "./login.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await login(username.trim(), password);
      navigate("/dashboard");
    } catch (err) {
      console.error("LOGIN ERROR:", err);

      setError(
        err?.message ||
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          "No se pudo iniciar sesión."
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

          <span className="auth-kicker">TU ÁLBUM, TU COMUNIDAD</span>

          <h1>
            Tu colección.
            <br />
            Tus intercambios.
            <br />
            <span>Tu mundial.</span>
          </h1>

          <p className="auth-description">
            Conectate con otros coleccionistas, completá tu álbum y encontrá
            rápidamente las figuritas que te faltan.
          </p>

          <div className="auth-benefits">
            <article>
              <div className="auth-benefit-icon" aria-hidden="true">👥</div>
              <div>
                <strong>Comunidad</strong>
                <span>Encontrá coleccionistas cerca tuyo.</span>
              </div>
            </article>

            <article>
              <div className="auth-benefit-icon" aria-hidden="true">🔄</div>
              <div>
                <strong>Intercambios simples</strong>
                <span>Descubrí quién tiene la figurita que buscás.</span>
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
          <div className="auth-form-icon" aria-hidden="true">⚽</div>

          <header className="auth-heading">
            <span>BIENVENIDO</span>
            <h2>Iniciá sesión</h2>
            <p>Ingresá para continuar organizando tu colección.</p>
          </header>

          {error && (
            <div className="auth-error" role="alert">
              <span aria-hidden="true">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>Usuario o correo</span>

              <div className="auth-input">
                <span aria-hidden="true">👤</span>

                <input
                  type="text"
                  value={username}
                  autoComplete="username"
                  placeholder="Ingresá tu usuario"
                  onChange={(event) => {
                    setUsername(event.target.value);
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
                  autoComplete="current-password"
                  placeholder="Ingresá tu contraseña"
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
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

            <div className="auth-form-options">
              <Link to="/forgot-password">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          <div className="auth-switch">
            <span>¿No tenés una cuenta?</span>
            <Link to="/register">Crear una cuenta</Link>
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
