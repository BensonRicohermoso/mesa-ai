const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const SESSION_KEY = 'mesa-ai.staff-session'

function getAuthHeaders() {
  try {
    const raw =
      window.localStorage.getItem(SESSION_KEY) ||
      window.sessionStorage.getItem(SESSION_KEY)
    if (!raw) return {}
    const session = JSON.parse(raw)
    if (!session?.accessToken) return {}
    return { Authorization: `Bearer ${session.accessToken}` }
  } catch {
    return {}
  }
}

/**
 * Create a scoped JSON request helper for authenticated management APIs.
 */
export function createApiClient(basePath) {
  return async function request(path = '', options = {}) {
    const response = await fetch(`${API_URL}${basePath}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
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
