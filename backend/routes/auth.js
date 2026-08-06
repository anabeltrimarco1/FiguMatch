import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { query } from "../config/db.js";
import {
  loginRateLimiter,
  passwordRecoveryRateLimiter,
} from "../middleware/rateLimit.js";

const router = Router();

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 40;
const PASSWORD_MIN_LENGTH = 6;
const EMAIL_MAX_LENGTH = 160;

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_DAYS = 7;

function signAccessToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("Falta configurar JWT_SECRET.");
  }

  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      type: "access",
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN },
  );
}

function createRefreshTokenValue() {
  return crypto.randomBytes(64).toString("hex");
}

function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function getRefreshExpirationDate() {
  return new Date(
    Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  );
}

async function issueSession(user, metadata = {}) {
  const accessToken = signAccessToken(user);
  const refreshToken = createRefreshTokenValue();
  const tokenHash = hashToken(refreshToken);
  const expiresAt = getRefreshExpirationDate();

  await query(
    `
    INSERT INTO refresh_tokens (
      user_id,
      token_hash,
      expires_at,
      user_agent,
      ip_address
    )
    VALUES ($1, $2, $3, $4, $5)
    `,
    [
      user.id,
      tokenHash,
      expiresAt,
      metadata.userAgent || null,
      metadata.ipAddress || null,
    ],
  );

  return {
    accessToken,
    refreshToken,
    expiresInSeconds: 15 * 60,
  };
}

function normalizeUsername(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateUsername(username) {
  if (!username) {
    return "Ingresá un nombre de usuario.";
  }

  if (username.length < USERNAME_MIN_LENGTH) {
    return `El usuario debe tener al menos ${USERNAME_MIN_LENGTH} caracteres.`;
  }

  if (username.length > USERNAME_MAX_LENGTH) {
    return `El usuario no puede superar los ${USERNAME_MAX_LENGTH} caracteres.`;
  }

  if (!/^[A-Za-z0-9._-]+$/.test(username)) {
    return "El usuario solo puede contener letras, números, punto, guion y guion bajo.";
  }

  return null;
}

function validatePassword(password) {
  if (!password) {
    return "Ingresá una contraseña.";
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }

  return null;
}

function validateMailEnvironment() {
  const requiredVariables = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "MAIL_FROM",
  ];

  const missingVariables = requiredVariables.filter(
    (variableName) => !process.env[variableName],
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Faltan variables SMTP en backend/.env: ${missingVariables.join(", ")}`,
    );
  }
}

function createMailTransporter() {
  validateMailEnvironment();

  const port = Number(process.env.SMTP_PORT);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("SMTP_PORT debe ser un número válido.");
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getRequestMetadata(req) {
  return {
    userAgent: String(req.headers["user-agent"] || "").slice(0, 500),
    ipAddress: req.ip || null,
  };
}

// REGISTRO
router.post("/register", async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username);
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    const usernameError = validateUsername(username);
    if (usernameError) {
      return res.status(400).json({ error: usernameError });
    }

    if (!email) {
      return res.status(400).json({
        error: "Ingresá un correo electrónico.",
      });
    }

    if (email.length > EMAIL_MAX_LENGTH || !isValidEmail(email)) {
      return res.status(400).json({
        error: "Ingresá un correo electrónico válido.",
      });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const existing = await query(
      `
      SELECT id, username, email
      FROM users
      WHERE TRIM(username) = $1
         OR LOWER(TRIM(email)) = LOWER($2)
      LIMIT 1
      `,
      [username, email],
    );

    if (existing.rows.length > 0) {
      const found = existing.rows[0];

      if (found.username === username) {
        return res.status(409).json({
          error: "Ese nombre de usuario ya está registrado.",
        });
      }

      return res.status(409).json({
        error: "Ese correo electrónico ya está registrado.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const insertResult = await query(
      `
      INSERT INTO users (
        username,
        email,
        password_hash
      )
      VALUES ($1, $2, $3)
      RETURNING
        id,
        username,
        email,
        created_at
      `,
      [username, email, passwordHash],
    );

    const user = insertResult.rows[0];

    await query(
      `
      INSERT INTO user_stickers (
        user_id,
        sticker_id,
        status,
        quantity
      )
      SELECT
        $1,
        id,
        'me_falta',
        0
      FROM stickers
      ON CONFLICT (user_id, sticker_id)
      DO NOTHING
      `,
      [user.id],
    );

    const session = await issueSession(
      user,
      getRequestMetadata(req),
    );

    return res.status(201).json({
      /*
       * "token" se mantiene temporalmente para no romper
       * el frontend actual antes del Sprint 6.5.4.
       */
      token: session.accessToken,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresInSeconds: session.expiresInSeconds,
      user,
      message: "Cuenta creada correctamente.",
    });
  } catch (error) {
    console.error("ERROR REGISTER:", error);

    if (error?.code === "23505") {
      return res.status(409).json({
        error: "El usuario o el correo ya están registrados.",
      });
    }

    return res.status(500).json({
      error: "No se pudo crear la cuenta. Intentá nuevamente.",
    });
  }
});

// LOGIN
router.post("/login", loginRateLimiter, async (req, res) => {
  try {
    const usernameOrEmail = normalizeUsername(req.body.username);
    const password = String(req.body.password || "");

    if (!usernameOrEmail || !password) {
      return res.status(400).json({
        error: "Ingresá tu usuario o correo y tu contraseña.",
      });
    }

    const result = await query(
      `
      SELECT
        id,
        username,
        email,
        password_hash
      FROM users
      WHERE TRIM(username) = $1
         OR LOWER(TRIM(email)) = LOWER($1)
      LIMIT 1
      `,
      [usernameOrEmail],
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        error: "Usuario, correo o contraseña incorrectos.",
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.password_hash,
    );

    if (!validPassword) {
      return res.status(401).json({
        error: "Usuario, correo o contraseña incorrectos.",
      });
    }

    delete user.password_hash;

    const session = await issueSession(
      user,
      getRequestMetadata(req),
    );

    return res.json({
      token: session.accessToken,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresInSeconds: session.expiresInSeconds,
      user,
      message: "Inicio de sesión correcto.",
    });
  } catch (error) {
    console.error("ERROR LOGIN:", error);

    return res.status(500).json({
      error: "No se pudo iniciar sesión. Intentá nuevamente.",
    });
  }
});

// RENOVAR ACCESS TOKEN
router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = String(
      req.body.refreshToken || "",
    ).trim();

    if (!refreshToken) {
      return res.status(400).json({
        error: "Falta el refresh token.",
        code: "REFRESH_TOKEN_MISSING",
      });
    }

    const tokenHash = hashToken(refreshToken);

    const result = await query(
      `
      SELECT
        rt.id AS refresh_token_id,
        rt.user_id,
        rt.expires_at,
        rt.revoked_at,
        u.username,
        u.email
      FROM refresh_tokens rt
      INNER JOIN users u
        ON u.id = rt.user_id
      WHERE rt.token_hash = $1
      LIMIT 1
      `,
      [tokenHash],
    );

    const storedToken = result.rows[0];

    if (!storedToken) {
      return res.status(401).json({
        error: "La sesión no es válida.",
        code: "REFRESH_TOKEN_INVALID",
      });
    }

    if (storedToken.revoked_at) {
      return res.status(401).json({
        error: "La sesión fue cerrada.",
        code: "REFRESH_TOKEN_REVOKED",
      });
    }

    if (new Date(storedToken.expires_at).getTime() <= Date.now()) {
      await query(
        `
        UPDATE refresh_tokens
        SET revoked_at = NOW()
        WHERE id = $1
        `,
        [storedToken.refresh_token_id],
      );

      return res.status(401).json({
        error: "La sesión venció. Iniciá sesión nuevamente.",
        code: "REFRESH_TOKEN_EXPIRED",
      });
    }

    /*
     * Rotación de refresh token:
     * el token usado se revoca y se emite uno nuevo.
     */
    await query(
      `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE id = $1
      `,
      [storedToken.refresh_token_id],
    );

    const user = {
      id: storedToken.user_id,
      username: storedToken.username,
      email: storedToken.email,
    };

    const session = await issueSession(
      user,
      getRequestMetadata(req),
    );

    return res.json({
      token: session.accessToken,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresInSeconds: session.expiresInSeconds,
      user,
    });
  } catch (error) {
    console.error("ERROR REFRESH TOKEN:", error);

    return res.status(500).json({
      error: "No se pudo renovar la sesión.",
    });
  }
});

// LOGOUT
router.post("/logout", async (req, res) => {
  try {
    const refreshToken = String(
      req.body.refreshToken || "",
    ).trim();

    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);

      await query(
        `
        UPDATE refresh_tokens
        SET revoked_at = COALESCE(revoked_at, NOW())
        WHERE token_hash = $1
        `,
        [tokenHash],
      );
    }

    /*
     * Siempre responde correctamente para que el logout
     * sea idempotente y no revele si el token existía.
     */
    return res.json({
      message: "Sesión cerrada correctamente.",
    });
  } catch (error) {
    console.error("ERROR LOGOUT:", error);

    return res.status(500).json({
      error: "No se pudo cerrar la sesión.",
    });
  }
});

// RECUPERACIÓN DE CONTRASEÑA
router.post(
  "/forgot-password",
  passwordRecoveryRateLimiter,
  async (req, res) => {
    const genericMessage =
      "Si existe una cuenta asociada a ese correo, recibirás un enlace para recuperar tu contraseña.";

    let userId = null;

    try {
      const email = normalizeEmail(req.body.email);

      if (!email) {
        return res.status(400).json({
          error: "Ingresá tu correo electrónico.",
        });
      }

      if (email.length > EMAIL_MAX_LENGTH || !isValidEmail(email)) {
        return res.status(400).json({
          error: "Ingresá un correo electrónico válido.",
        });
      }

      const result = await query(
        `
        SELECT
          id,
          TRIM(username) AS username,
          TRIM(email) AS email
        FROM users
        WHERE LOWER(TRIM(email)) = LOWER($1)
        LIMIT 1
        `,
        [email],
      );

      const user = result.rows[0];

      if (!user) {
        return res.json({
          message: genericMessage,
        });
      }

      userId = Number(user.id);

      const rawToken = crypto.randomBytes(32).toString("hex");

      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      await query(
        `
        UPDATE users
        SET
          reset_password_token = $1,
          reset_password_expires = $2
        WHERE id = $3
        `,
        [tokenHash, expiresAt, userId],
      );

      const frontendUrl =
        process.env.FRONTEND_URL || "http://localhost:5173";

      const resetUrl =
        `${frontendUrl}/reset-password/${encodeURIComponent(rawToken)}`;

      const transporter = createMailTransporter();

      await transporter.verify();

      const safeUsername = escapeHtml(
        user.username || "Coleccionista",
      );

      const info = await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: user.email,
        subject: "Recuperá tu contraseña de FiguMatch",
        text: [
          `Hola ${user.username || "Coleccionista"},`,
          "",
          "Recibimos una solicitud para cambiar tu contraseña.",
          "",
          `Abrí este enlace: ${resetUrl}`,
          "",
          "El enlace vence en 30 minutos.",
          "",
          "Si no hiciste esta solicitud, ignorá este correo.",
        ].join("\n"),
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#172554">
            <h1 style="margin:0 0 24px;color:#2563eb">FiguMatch</h1>
            <p>Hola <strong>${safeUsername}</strong>,</p>
            <p>Recibimos una solicitud para cambiar tu contraseña.</p>
            <p style="margin:30px 0">
              <a
                href="${resetUrl}"
                style="display:inline-block;padding:14px 22px;border-radius:10px;background:#2563eb;color:#fff;font-weight:bold;text-decoration:none"
              >
                Restablecer contraseña
              </a>
            </p>
            <p>Este enlace vence en <strong>30 minutos</strong>.</p>
            <p style="margin-top:24px;color:#64748b;font-size:13px">
              Si no hiciste esta solicitud, podés ignorar este correo.
            </p>
          </div>
        `,
      });

      console.log("MAIL DE RECUPERACIÓN ENVIADO:", {
        messageId: info.messageId,
        destinatario: user.email,
        respuesta: info.response,
      });

      return res.json({
        message: genericMessage,
      });
    } catch (error) {
      console.error("ERROR FORGOT PASSWORD:", {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
      });

      if (Number.isInteger(userId) && userId > 0) {
        try {
          await query(
            `
            UPDATE users
            SET
              reset_password_token = NULL,
              reset_password_expires = NULL
            WHERE id = $1
            `,
            [userId],
          );
        } catch (cleanupError) {
          console.error(
            "ERROR AL LIMPIAR TOKEN DE RECUPERACIÓN:",
            cleanupError,
          );
        }
      }

      return res.status(500).json({
        error:
          "No se pudo enviar el correo. Revisá la configuración SMTP del backend.",
      });
    }
  },
);

// RESTABLECER CONTRASEÑA
router.post("/reset-password", async (req, res) => {
  try {
    const token = String(req.body.token || "").trim();
    const password = String(req.body.password || "");

    if (!token || !password) {
      return res.status(400).json({
        error: "Faltan el token o la nueva contraseña.",
      });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const tokenHash = hashToken(token);

    const result = await query(
      `
      SELECT id
      FROM users
      WHERE reset_password_token = $1
        AND reset_password_expires > NOW()
      LIMIT 1
      `,
      [tokenHash],
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({
        error: "El enlace es inválido, ya fue utilizado o venció.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await query(
      `
      UPDATE users
      SET
        password_hash = $1,
        reset_password_token = NULL,
        reset_password_expires = NULL
      WHERE id = $2
      `,
      [passwordHash, user.id],
    );

    /*
     * Revoca todas las sesiones abiertas después de cambiar
     * la contraseña.
     */
    await query(
      `
      UPDATE refresh_tokens
      SET revoked_at = COALESCE(revoked_at, NOW())
      WHERE user_id = $1
      `,
      [user.id],
    );

    return res.json({
      message: "Contraseña actualizada correctamente.",
    });
  } catch (error) {
    console.error("ERROR RESET PASSWORD:", error);

    return res.status(500).json({
      error: "No se pudo restablecer la contraseña.",
    });
  }
});

export default router;
