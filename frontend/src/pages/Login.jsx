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
        err.message ||
          err.response?.data?.error ||
          err.response?.data?.message ||
          "No se pudo iniciar sesión."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <div className="login-logo" aria-hidden="true">
            ⚽
          </div>

          <div>
            <strong>FiguMatch</strong>
            <span>Mundial 2026</span>
          </div>
        </div>

        <header className="login-heading">
          <span>BIENVENIDO</span>

          <h1>Iniciá sesión</h1>

          <p>
            Ingresá para continuar organizando tu colección.
          </p>
        </header>

        {error && (
          <div className="login-error" role="alert">
            <span aria-hidden="true">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-field">
            <span>Usuario</span>

            <div className="login-input-wrapper">
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

          <label className="login-field">
            <span>Contraseña</span>

            <div className="login-input-wrapper">
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
                className="login-password-toggle"
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

          <div className="login-options">
            <Link to="/forgot-password">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button
            type="submit"
            className="login-submit"
            disabled={loading}
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <footer className="login-footer">
          <span>¿No tenés una cuenta?</span>

          <Link to="/register">
            Crear una cuenta
          </Link>
        </footer>
      </section>
    </main>
  );
}