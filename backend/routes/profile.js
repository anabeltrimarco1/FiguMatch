import { Router } from "express";

import { query } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const DISPLAY_NAME_MAX_LENGTH = 80;
const CITY_MAX_LENGTH = 100;
const FAVORITE_TEAM_MAX_LENGTH = 100;
const BIO_MAX_LENGTH = 280;
const AVATAR_URL_MAX_LENGTH = 1000;

function normalizeOptionalText(value, maxLength) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

function validateAvatarUrl(value) {
  const normalized = normalizeOptionalText(
    value,
    AVATAR_URL_MAX_LENGTH
  );

  if (!normalized) {
    return {
      value: null,
      error: null,
    };
  }

  try {
    const parsedUrl = new URL(normalized);

    if (
      !["http:", "https:"].includes(
        parsedUrl.protocol
      )
    ) {
      return {
        value: null,
        error:
          "La URL del avatar debe comenzar con http:// o https://.",
      };
    }

    return {
      value: normalized,
      error: null,
    };
  } catch {
    return {
      value: null,
      error: "La URL del avatar no es válida.",
    };
  }
}

function mapUserProfile(row) {
  return {
    id: Number(row.id),
    username: String(row.username || "").trim(),
    email: String(row.email || "").trim(),

    displayName:
      row.display_name ||
      String(row.username || "").trim(),

    city: row.city || "",

    favoriteTeam:
      row.favorite_team || "",

    bio: row.bio || "",

    avatarUrl:
      row.avatar_url || "",

    createdAt: row.created_at,

    profileUpdatedAt:
      row.profile_updated_at,
  };
}

/* =====================================================
   OBTENER PERFIL
===================================================== */

router.get(
  "/",
  requireAuth,
  async (req, res) => {
    try {
      const userId = Number(req.userId);

      const result = await query(
        `
        SELECT
          id,
          username,
          email,
          display_name,
          city,
          favorite_team,
          bio,
          avatar_url,
          created_at,
          profile_updated_at
        FROM users
        WHERE id = $1
        LIMIT 1
        `,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error:
            "No se encontró el perfil.",
        });
      }

      return res.json({
        profile: mapUserProfile(
          result.rows[0]
        ),
      });
    } catch (error) {
      console.error(
        "ERROR PERFIL:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo cargar el perfil.",
      });
    }
  }
);
/* =====================================================
   ACTUALIZAR PERFIL
===================================================== */

router.put(
  "/",
  requireAuth,
  async (req, res) => {
    try {
      const userId = Number(req.userId);

      const displayName =
        normalizeOptionalText(
          req.body.displayName,
          DISPLAY_NAME_MAX_LENGTH
        );

      const city =
        normalizeOptionalText(
          req.body.city,
          CITY_MAX_LENGTH
        );

      const favoriteTeam =
        normalizeOptionalText(
          req.body.favoriteTeam,
          FAVORITE_TEAM_MAX_LENGTH
        );

      const bio =
        normalizeOptionalText(
          req.body.bio,
          BIO_MAX_LENGTH
        );

      const avatarResult =
        validateAvatarUrl(
          req.body.avatarUrl
        );

      if (avatarResult.error) {
        return res.status(400).json({
          error: avatarResult.error,
        });
      }

      if (
        req.body.displayName !== undefined &&
        !displayName
      ) {
        return res.status(400).json({
          error:
            "El nombre visible no puede quedar vacío.",
        });
      }
     const result = await query(
        `
        UPDATE users
        SET
          display_name = COALESCE(
            $1,
            display_name
          ),
          city = $2,
          favorite_team = $3,
          bio = $4,
          avatar_url = $5,
          profile_updated_at = NOW()
        WHERE id = $6
        RETURNING
          id,
          username,
          email,
          display_name,
          city,
          favorite_team,
          bio,
          avatar_url,
          created_at,
          profile_updated_at
        `,
        [
          displayName,
          city,
          favoriteTeam,
          bio,
          avatarResult.value,
          userId,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error:
            "No se encontró el perfil.",
        });
      }

      return res.json({
        message:
          "Perfil actualizado correctamente.",

        profile: mapUserProfile(
          result.rows[0]
        ),
      });
          } catch (error) {
      console.error(
        "ERROR AL ACTUALIZAR PERFIL:",
        error
      );

      return res.status(500).json({
        error:
          "No se pudo actualizar el perfil.",
        message: error.message,
      });
    }
  }
);

export default router;