import { createApiClient } from './apiClient.js'

const request = createApiClient('/api/analytics')

/**
 * Build a query string from analytics filter params,
 * omitting empty, null, undefined, and sentinel 'all' values.
 * Always includes tz=Asia/Manila.
 */
export function buildAnalyticsQuery(params = {}) {
  const query = new URLSearchParams()
  query.set('tz', 'Asia/Manila')

  const entries = Object.entries(params)
  for (const [key, value] of entries) {
    if (key === 'tz') continue
    if (value === undefined || value === null || value === '' || value === 'all') continue
    query.set(key, String(value))
  }

  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export function getAnalyticsSummary(params = {}, options = {}) {
  return request(`/summary${buildAnalyticsQuery(params)}`, options)
}

export function getAnalyticsTrends(params = {}, options = {}) {
  return request(`/trends${buildAnalyticsQuery(params)}`, options)
}

export function getMenuEngineering(params = {}, options = {}) {
  return request(`/menu-engineering${buildAnalyticsQuery(params)}`, options)
}

export function getPerformanceAnalytics(params = {}, options = {}) {
  return request(`/performance${buildAnalyticsQuery(params)}`, options)
}

export function getRecentAnalyticsOrders(params = {}, options = {}) {
  return request(`/recent-orders${buildAnalyticsQuery(params)}`, options)
}
