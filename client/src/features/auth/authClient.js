const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const SESSION_KEY = 'mesa-ai.staff-session'
const REMEMBER_KEY = 'mesa-ai.remember-device'

// Hard 6-hour shift lifespan for restaurant floor terminals (cashier / kitchen)
export const SHIFT_DURATION_MS = 6 * 60 * 60 * 1000

function getApiError(payload, fallback) {
  return payload?.error?.message || fallback
}

// Global promise to prevent duplicate concurrent refresh requests
let inFlightRefresh = null

function getActiveStorage() {
  const remember = window.localStorage.getItem(REMEMBER_KEY) === 'true'
  return remember ? window.localStorage : window.sessionStorage
}

export function loadStoredSession() {
  try {
    const raw =
      window.localStorage.getItem(SESSION_KEY) ||
      window.sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)

    if (!session?.accessToken || !session?.staff) {
      return null
    }

    // Verify hard 6-hour shift expiration
    if (session.shiftExpiresAt) {
      const shiftEndsMs = new Date(session.shiftExpiresAt).getTime()
      if (Date.now() >= shiftEndsMs) {
        // Shift has expired; force full email/password re-login
        clearStoredSession()
        return null
      }
    }

    return session
  } catch {
    return null
  }
}

export function storeSession(session, remember = null) {
  if (typeof remember === 'boolean') {
    window.localStorage.setItem(REMEMBER_KEY, remember ? 'true' : 'false')
  }

  // Attach 6-hour shift expiration window if not already established
  const sessionWithShift = {
    ...session,
    shiftExpiresAt:
      session.shiftExpiresAt ||
      new Date(Date.now() + SHIFT_DURATION_MS).toISOString(),
  }

  const storage = getActiveStorage()
  if (storage === window.localStorage) {
    window.sessionStorage.removeItem(SESSION_KEY)
  } else {
    window.localStorage.removeItem(SESSION_KEY)
  }

  storage.setItem(SESSION_KEY, JSON.stringify(sessionWithShift))
  return sessionWithShift
}

export function clearStoredSession() {
  window.localStorage.removeItem(SESSION_KEY)
  window.sessionStorage.removeItem(SESSION_KEY)
}

/**
 * Proactive Token Refresh Interceptor:
 * If an access token is within 60 seconds of expiring, refresh it
 * before dispatching the request so staff never face unexpected 401s.
 * Ensures the 6-hour shift window is preserved and not bypassed.
 */
async function ensureValidToken(options) {
  const authHeader = options?.headers?.Authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return options
  }

  const currentSession = loadStoredSession()
  if (!currentSession?.refreshToken || !currentSession?.expiresAt) {
    return options
  }

  // If the 6-hour shift has elapsed, do not refresh; let request fail or prompt login
  if (currentSession.shiftExpiresAt) {
    const shiftEndsMs = new Date(currentSession.shiftExpiresAt).getTime()
    if (Date.now() >= shiftEndsMs) {
      clearStoredSession()
      return options
    }
  }

  const expiresAtMs = new Date(currentSession.expiresAt).getTime()
  const isCloseToExpiry = Date.now() >= expiresAtMs - 60 * 1000

  if (!isCloseToExpiry) {
    return options
  }

  try {
    if (!inFlightRefresh) {
      inFlightRefresh = refreshSession(currentSession.refreshToken).finally(() => {
        inFlightRefresh = null
      })
    }

    const refreshed = await inFlightRefresh
    // Preserve original shift expiration timestamp across token refreshes
    const updated = storeSession({
      ...refreshed,
      shiftExpiresAt: currentSession.shiftExpiresAt,
    })

    return {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${updated.accessToken}`,
      },
    }
  } catch {
    return options
  }
}

export async function request(path, options = {}) {
  const finalOptions = await ensureValidToken(options)
  const response = await fetch(`${API_URL}/api${path}`, finalOptions)
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(getApiError(payload, 'The request could not be completed.'))
    error.status = response.status
    error.code = payload?.error?.code ?? null
    throw error
  }

  return payload
}

// Master / terminal authentication
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

// Exchange a refresh token for a new session
export async function refreshSession(refreshToken) {
  return request('/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
}

// Revoke current session on server
export async function logout(accessToken) {
  return request('/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

// List active staff members for terminal quick-switching
export async function getActiveStaffList() {
  return request('/auth/staff')
}

// Quick PIN switch on shared terminal
export async function switchStaffByPin(pin, staffId = null) {
  return request('/auth/pin-switch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin, staffId }),
  })
}

// Set or update current staff PIN (4 digits)
export async function setStaffPin(pin, accessToken) {
  return request('/auth/pin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ pin }),
  })
}
