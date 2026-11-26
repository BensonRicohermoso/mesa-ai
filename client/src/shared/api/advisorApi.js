import { createApiClient } from './apiClient.js'

const request = createApiClient('/api/advisor')
export const getPlanningEvents = (from, to) => request(`/planning-events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
export const createPlanningEvent = (data) => request('/planning-events', { method: 'POST', body: JSON.stringify(data) })
export const updatePlanningEvent = (id, data) => request(`/planning-events/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
export const deletePlanningEvent = (id) => request(`/planning-events/${id}`, { method: 'DELETE' })
