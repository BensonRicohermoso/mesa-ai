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
