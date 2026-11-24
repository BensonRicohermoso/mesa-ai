import { loadStoredSession, request as authRequest } from '../../features/auth/authClient.js'

function request(path, options = {}) {
  const session = loadStoredSession()
  const authHeader = session?.accessToken
    ? { Authorization: `Bearer ${session.accessToken}` }
    : {}

  return authRequest(`/menu${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...options.headers,
    },
  })
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

export function deleteCategory(id) {
  return request(`/categories/${id}`, {
    method: 'DELETE',
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
