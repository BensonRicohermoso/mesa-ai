import {
  loadStoredSession,
  request as authRequest,
} from '../../features/auth/authClient.js'

/**
 * Create a scoped JSON request helper for authenticated management APIs.
 * Delegates to authClient.request() so all management APIs (menu, tables, staff)
 * share one proactive token refresh pipeline and single inFlightRefresh lock.
 */
export function createApiClient(basePath) {
  const apiSubPath = basePath.replace(/^\/api/, '')

  return async function request(path = '', options = {}) {
    const session = loadStoredSession()
    const authHeaders = session?.accessToken
      ? { Authorization: `Bearer ${session.accessToken}` }
      : {}

    return authRequest(`${apiSubPath}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers,
      },
    })
  }
}
