/**
 * Create a structured application error that the errorHandler middleware
 * will serialise into a consistent API response.
 *
 * @param {number} statusCode - HTTP status code (4xx / 5xx).
 * @param {string} code       - Machine-readable error code (e.g. "AUTH_TOKEN_MISSING").
 * @param {string} message    - Human-readable message returned to the client.
 */
export function createAuthError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}
