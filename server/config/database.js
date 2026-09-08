const configurationError = (...names) => {
  throw new Error(`Invalid or missing environment variables: ${names.join(", ")}`);
};

export function resolveDatabaseConfig(source = process.env) {
  const mode = String(source.DATABASE_MODE || "local").trim().toLowerCase();
  const nodeEnv = String(source.NODE_ENV || "development").trim().toLowerCase();

  if (!['local', 'turso'].includes(mode)) configurationError('DATABASE_MODE');

  if (mode === 'local') {
    if (nodeEnv === 'production') configurationError('DATABASE_MODE');
    const url = String(source.DATABASE_URL || '').trim();
    if (!url.startsWith('file:')) configurationError('DATABASE_URL');
    return Object.freeze({ mode, url });
  }

  const url = String(source.TURSO_DATABASE_URL || '').trim();
  const authToken = String(source.TURSO_AUTH_TOKEN || '').trim();
  if (!url || !authToken) configurationError('TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN');

  try {
    if (new URL(url).protocol !== 'libsql:') configurationError('TURSO_DATABASE_URL');
  } catch (error) {
    if (error?.message?.startsWith('Invalid or missing environment variables:')) throw error;
    configurationError('TURSO_DATABASE_URL');
  }

  return Object.freeze({ mode, url, authToken });
}
