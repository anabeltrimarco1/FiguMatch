import { useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import api from "../api.js";
import "./ForgotPassword.css";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (password.length < 6) {
      setError(
        "La contraseña debe tener al menos 6 caracteres.",
      );
      return;
    }

    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post(
        "/auth/reset-password",
        {
          token,
          password,
        },
      );

      setMessage(
        data.message ||
          "Contraseña actualizada correctamente.",
      );

      window.setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1800);
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          "No se pudo restablecer la contraseña.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="forgot-page">
      <section className="forgot-card">
        <div className="forgot-brand">
          <div className="forgot-logo" aria-hidden="true">
            ⚽
          </div>

          <div>
            <strong>FiguMatch</strong>
            <span>Mundial 2026</span>
          </div>
        </div>

        <header className="forgot-heading">
          <span>NUEVA CONTRASEÑA</span>
          <h1>Restablecé tu contraseña</h1>
          <p>
            Elegí una contraseña nueva de al menos 6 caracteres.
          </p>
        </header>

        {error && (
          <div className="forgot-error" role="alert">
            <span aria-hidden="true">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="forgot-success" role="status">
            <span aria-hidden="true">✅</span>
            <span>{message}</span>
          </div>
        )}

        <form className="forgot-form" onSubmit={handleSubmit}>
          <label className="forgot-field">
            <span>Nueva contraseña</span>

            <div className="forgot-input-wrapper">
              <span aria-hidden="true">🔒</span>

              <input
                type="password"
                value={password}
                autoComplete="new-password"
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
              />
            </div>
          </label>

          <label className="forgot-field">
            <span>Confirmar contraseña</span>

            <div className="forgot-input-wrapper">
              <span aria-hidden="true">🔒</span>

              <input
                type="password"
                value={confirmation}
                autoComplete="new-password"
                onChange={(event) =>
                  setConfirmation(event.target.value)
                }
                required
              />
            </div>
          </label>

          <button
            type="submit"
            className="forgot-submit"
            disabled={loading || Boolean(message)}
          >
            {loading
              ? "Guardando..."
              : "Guardar contraseña"}
          </button>
        </form>

        <footer className="forgot-footer">
          <Link to="/login">
            ← Volver al inicio de sesión
          </Link>
        </footer>
      </section>
    </main>
  );
}
