const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'authorization',
  'access_token',
  'refresh_token',
  'secret',
]);

/**
 * Returns a deep-cloned object safe for logs/reports (passwords and tokens redacted).
 */
export function redactSecrets<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item)) as T;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = redactSecrets(v);
      }
    }
    return out as T;
  }
  return value;
}
