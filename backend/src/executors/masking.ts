/**
 * Sensitive Data Redaction Utility
 *
 * Masks sensitive keys (passwords, tokens, secrets, authorization headers)
 * before persisting to logs, database records, or returning to callers.
 */

const SENSITIVE_KEY_PATTERN = /(authorization|password|passwd|token|secret|api[_-]?key)/i;

/**
 * Deeply clones and masks sensitive keys within an object or array.
 * Replaces matching values with "[REDACTED]".
 */
export function maskSensitiveData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => maskSensitiveData(item));
  }

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = maskSensitiveData(value);
    }
  }

  return sanitized;
}
