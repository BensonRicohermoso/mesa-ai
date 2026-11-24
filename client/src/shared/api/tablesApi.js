import { createApiClient } from './apiClient.js'

const request = createApiClient('/api/tables')

export function getTables() {
  return request('')
}

export function createTable(data) {
  return request('', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateTable(id, data) {
  return request(`/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function setTableStatus(id, isActive) {
  return request(`/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  })
}
