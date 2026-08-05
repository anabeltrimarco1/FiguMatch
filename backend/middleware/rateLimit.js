import { rateLimit } from "express-rate-limit";

function buildRateLimitMessage(retryAfterSeconds) {
  const minutes = Math.max(
    1,
    Math.ceil(Number(retryAfterSeconds || 0) / 60),
  );

  return {
    error:
      `Demasiados intentos. Esperá ${minutes} minuto${minutes === 1 ? "" : "s"} antes de volver a intentar.`,
    code: "AUTH_RATE_LIMITED",
    retryAfterSeconds: Number(retryAfterSeconds || 0),
  };
}

function rateLimitHandler(req, res, _next, options) {
  const resetTime = req.rateLimit?.resetTime;
  const retryAfterSeconds = resetTime
    ? Math.max(
        1,
        Math.ceil(
          (new Date(resetTime).getTime() - Date.now()) / 1000,
        ),
      )
    : Math.ceil(options.windowMs / 1000);

  res.setHeader("Retry-After", String(retryAfterSeconds));

  return res
    .status(options.statusCode)
    .json(buildRateLimitMessage(retryAfterSeconds));
}

/*
 * LOGIN
 * Permite 5 intentos fallidos cada 15 minutos por IP.
 * Los logins exitosos no consumen el límite.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  requestWasSuccessful: (_req, res) =>
    res.statusCode >= 200 && res.statusCode < 400,
  handler: rateLimitHandler,
});

/*
 * RECUPERACIÓN DE CONTRASEÑA
 * Evita el envío masivo de correos.
 */
export const passwordRecoveryRateLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  limit: 3,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: rateLimitHandler,
});
