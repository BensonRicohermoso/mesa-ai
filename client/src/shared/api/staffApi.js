import { createApiClient } from './apiClient.js'

const request = createApiClient('/api/staff')

export function getStaff() {
  return request('')
}

export function createStaff(data) {
  return request('', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateStaff(id, data) {
  return request(`/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function setStaffStatus(id, isActive) {
  return request(`/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  })
}
