import {
  loadStoredSession,
  storeSession,
  clearStoredSession,
  refreshSession as apiRefreshSession,
} from '../../features/auth/authClient.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// Global in-flight refresh promise shared across all apiClient consumers
let inFlightRefresh = null

/**
 * Proactive Token Refresh for management APIs (tables, staff).
 * Mirrors the ensureValidToken() logic from authClient.js so that
 * tablesApi and staffApi also refresh tokens before they expire.
 */
async function ensureValidToken() {
  const session = loadStoredSession()
  if (!session?.accessToken) return {}

  const authHeaders = { Authorization: `Bearer ${session.accessToken}` }

  // Skip refresh if no refresh token or expiry info
  if (!session.refreshToken || !session.expiresAt) return authHeaders

  // If the 6-hour shift has elapsed, don't refresh
  if (session.shiftExpiresAt) {
    const shiftEndsMs = new Date(session.shiftExpiresAt).getTime()
    if (Date.now() >= shiftEndsMs) {
      clearStoredSession()
      return authHeaders
    }
  }

  const expiresAtMs = new Date(session.expiresAt).getTime()
  const isCloseToExpiry = Date.now() >= expiresAtMs - 60 * 1000

  if (!isCloseToExpiry) return authHeaders

  try {
    if (!inFlightRefresh) {
      inFlightRefresh = apiRefreshSession(session.refreshToken).finally(() => {
        inFlightRefresh = null
      })
    }

    const refreshed = await inFlightRefresh
    const updated = storeSession({
      ...refreshed,
      shiftExpiresAt: session.shiftExpiresAt,
    })

    return { Authorization: `Bearer ${updated.accessToken}` }
  } catch {
    return authHeaders
  }
}

/**
 * Create a scoped JSON request helper for authenticated management APIs.
 * Uses proactive token refresh so the ~1h Supabase JWT is renewed before expiry.
 */
export function createApiClient(basePath) {
  return async function request(path = '', options = {}) {
    const authHeaders = await ensureValidToken()

    const response = await fetch(`${API_URL}${basePath}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers,
      },
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      const error = new Error(
        payload?.error?.message || 'The request could not be completed.'
      )
      error.status = response.status
      error.code = payload?.error?.code ?? null
      throw error
    }

    return payload
  }
}
