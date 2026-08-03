import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api.js";
import "./ForgotPassword.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post(
        "/auth/forgot-password",
        {
          email: email.trim().toLowerCase(),
        },
      );

      setMessage(
        data.message ||
          "Revisá tu correo para continuar con la recuperación.",
      );

      setEmail("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          "No se pudo enviar el correo de recuperación.",
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
          <span>RECUPERAR ACCESO</span>
          <h1>¿Olvidaste tu contraseña?</h1>
          <p>
            Ingresá el correo con el que te registraste y te
            enviaremos un enlace para elegir una contraseña nueva.
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
            <span>Correo electrónico</span>

            <div className="forgot-input-wrapper">
              <span aria-hidden="true">📧</span>

              <input
                type="email"
                value={email}
                autoComplete="email"
                placeholder="nombre@correo.com"
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                required
              />
            </div>
          </label>

          <button
            type="submit"
            className="forgot-submit"
            disabled={loading}
          >
            {loading
              ? "Enviando..."
              : "Enviar instrucciones"}
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
