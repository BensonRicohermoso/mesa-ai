import { createApiClient } from './apiClient.js'

const request = createApiClient('/api/ai')

export function getAiStatus(options = {}) {
  return request('/status', { ...options, method: 'GET' })
}

export function postAiBriefing(payload = {}, options = {}) {
  return request('/briefing', {
    ...options,
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function postAiForecast(payload = {}, options = {}) {
  return request('/forecast', {
    ...options,
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function postAiQna(payload = {}, options = {}) {
  return request('/qna', {
    ...options,
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function postAiPlanning(payload = {}, options = {}) {
  return request('/planning', { ...options, method: 'POST', body: JSON.stringify(payload) })
}

export function acknowledgePlanningRecommendation(key, note = '') {
  return request(`/planning/recommendations/${encodeURIComponent(key)}/acknowledgements`, {
    method: 'POST', body: JSON.stringify({ note }),
  })
}
