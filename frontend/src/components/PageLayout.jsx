import { Link } from "react-router-dom";
import "./PageLayout.css";

export default function PageLayout({
  eyebrow,
  title,
  subtitle,
  actionText,
  actionTo,
  children,
}) {
  return (
    <main className="dashboard-page">
      <section className="dashboard-container">
        <header className="dashboard-header">
          <div>
            {eyebrow && <p className="dashboard-eyebrow">{eyebrow}</p>}

            <h1>{title}</h1>

            {subtitle && <p className="dashboard-subtitle">{subtitle}</p>}
          </div>

          {actionText && actionTo && (
            <Link to={actionTo} className="dashboard-main-button">
              {actionText}
            </Link>
          )}
        </header>

        <section className="dashboard-sections">
          <article className="dashboard-panel">{children}</article>
        </section>
      </section>
    </main>
  );
}
