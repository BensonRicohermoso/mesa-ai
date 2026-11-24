const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function getAuthHeaders() {
  const SESSION_KEY = 'mesa-ai.staff-session'
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

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}/api/menu${path}`, {
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

// ── Categories ───────────────────────────────────────────────────────────────

export function getCategories() {
  return request('/categories')
}

export function createCategory(data) {
  return request('/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateCategory(id, data) {
  return request(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function setCategoryStatus(id, isActive) {
  return request(`/categories/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  })
}

// ── Menu Items ───────────────────────────────────────────────────────────────

export function getMenuItems(params = {}) {
  const query = new URLSearchParams()
  if (params.categoryId) query.set('categoryId', params.categoryId)
  if (params.includeInactive === false) query.set('includeInactive', 'false')
  const qs = query.toString()
  return request(`/items${qs ? `?${qs}` : ''}`)
}

export function createMenuItem(data) {
  return request('/items', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateMenuItem(id, data) {
  return request(`/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function setItemAvailability(id, isAvailable) {
  return request(`/items/${id}/availability`, {
    method: 'PATCH',
    body: JSON.stringify({ isAvailable }),
  })
}

export function setItemActiveStatus(id, isActive) {
  return request(`/items/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  })
}
