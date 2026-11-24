import { createApiClient } from './apiClient.js'
import { buildAnalyticsQuery } from './analyticsQuery.js'

export { buildAnalyticsQuery }

const request = createApiClient('/api/analytics')

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
