import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { query } from "../config/db.js";

const router = Router();

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 40;
const PASSWORD_MIN_LENGTH = 6;
const EMAIL_MAX_LENGTH = 160;

function signToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("Falta configurar JWT_SECRET.");
  }

  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
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

    /*
     * Username: comparación exacta y sensible a mayúsculas.
     * Email: comparación sin distinguir mayúsculas.
     */
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

    const token = signToken(user);

    return res.status(201).json({
      token,
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
router.post("/login", async (req, res) => {
  try {
    const usernameOrEmail = normalizeUsername(req.body.username);
    const password = String(req.body.password || "");

    if (!usernameOrEmail || !password) {
      return res.status(400).json({
        error: "Ingresá tu usuario o correo y tu contraseña.",
      });
    }

    /*
     * Username: comparación exacta, distingue mayúsculas.
     * Email: comparación sin distinguir mayúsculas.
     */
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

    const token = signToken(user);

    return res.json({
      token,
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

// RECUPERACIÓN DE CONTRASEÑA
router.post("/forgot-password", async (req, res) => {
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

    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

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
});

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

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

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

