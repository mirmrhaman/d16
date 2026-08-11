const DB_UNAVAILABLE_CODES = new Set([
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ENOTFOUND",
]);

export const isDbUnavailableError = (error) => {
  if (!error) return false;
  if (DB_UNAVAILABLE_CODES.has(error.code)) return true;

  const message = String(error.message || error);
  return /ECONNREFUSED|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH|ENOTFOUND/i.test(message);
};

export const shouldUseLocalFallback = (error) => isDbUnavailableError(error);