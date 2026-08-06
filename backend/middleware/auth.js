import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const authorizationHeader = String(
    req.headers.authorization || "",
  ).trim();

  if (!authorizationHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "No autenticado. Iniciá sesión para continuar.",
      code: "AUTH_REQUIRED",
    });
  }

  const token = authorizationHeader.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      error: "No autenticado. Falta el token de acceso.",
      code: "AUTH_TOKEN_MISSING",
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error("Falta configurar JWT_SECRET.");

    return res.status(500).json({
      error: "Error de configuración del servidor.",
      code: "AUTH_SERVER_CONFIG",
    });
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET,
    );

    if (payload.type && payload.type !== "access") {
      return res.status(401).json({
        error: "El token enviado no es un access token.",
        code: "AUTH_WRONG_TOKEN_TYPE",
      });
    }

    const userId = Number(payload.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        error: "La sesión no es válida.",
        code: "AUTH_INVALID_PAYLOAD",
      });
    }

    req.userId = userId;
    req.username = String(payload.username || "").trim();

    return next();
  } catch (error) {
    if (error?.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "El access token venció.",
        code: "AUTH_TOKEN_EXPIRED",
      });
    }

    return res.status(401).json({
      error: "La sesión no es válida.",
      code: "AUTH_TOKEN_INVALID",
    });
  }
}
