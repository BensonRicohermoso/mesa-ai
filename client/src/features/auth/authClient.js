const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const SESSION_KEY = 'mesa-ai.staff-session'

function getApiError(payload, fallback) {
  return payload?.error?.message || fallback
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}/api${path}`, options)
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(getApiError(payload, 'The request could not be completed.'))
    error.status = response.status
    error.code = payload?.error?.code ?? null
    throw error
  }

  return payload
}

export async function login(email, password) {
  return request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
}

export async function getCurrentUser(accessToken) {
  return request('/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

// Exchange a refresh token for a new session. Returns the full session object.
export async function refreshSession(refreshToken) {
  return request('/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
}

// Revoke the current session server-side.
export async function logout(accessToken) {
  return request('/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export function loadStoredSession() {
  try {
    const value = window.sessionStorage.getItem(SESSION_KEY)
    const session = value ? JSON.parse(value) : null
    return session?.accessToken && session?.staff ? session : null
  } catch {
    return null
  }
}

export function storeSession(session) {
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearStoredSession() {
  window.sessionStorage.removeItem(SESSION_KEY)
}
