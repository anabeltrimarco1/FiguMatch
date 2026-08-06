DELETE FROM refresh_tokens
WHERE expires_at < NOW()
   OR revoked_at < NOW() - INTERVAL '30 days';
