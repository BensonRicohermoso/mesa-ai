/**
 * Display-only formatting helpers for analytics data.
 * These perform ZERO analytical calculations — only display formatting.
 */

const phpFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const manilaDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const manilaTimestampFormatter = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
})

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

/** Format a numeric amount as PHP currency: ₱1,250.00 */
export function formatPhp(amount) {
  const n = toFiniteNumber(amount)
  if (n === null) return '—'
  return phpFormatter.format(n)
}

/** Format a percentage value: 61.9% */
export function formatPct(value) {
  const n = toFiniteNumber(value)
  if (n === null) return '—'
  return `${n.toFixed(1)}%`
}

/** Format a comparison delta: +12.4% / -3.1% / 0.0% */
export function formatDelta(deltaPct) {
  const n = toFiniteNumber(deltaPct)
  if (n === null) return '—'
  const prefix = n > 0 ? '+' : ''
  return `${prefix}${n.toFixed(1)}%`
}

/** Format duration in seconds to human-readable: 42s or 3m 12s */
export function formatDurationSeconds(seconds) {
  const n = toFiniteNumber(seconds)
  if (n === null) return '—'
  const s = Math.max(0, Math.round(n))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`
}

/** Format an ISO timestamp to Asia/Manila local display */
export function formatOrderTimestamp(iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  try {
    return manilaTimestampFormatter.format(date)
  } catch {
    return '—'
  }
}

/**
 * Compute YYYY-MM-DD date bounds for a named preset using Asia/Manila timezone.
 * Uses UTC calendar arithmetic on the Manila YYYY-MM-DD string so results do not
 * depend on the host OS timezone.
 * Returns { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }
 */
export function getPresetDateRange(preset, now = new Date()) {
  const todayStr = manilaDateFormatter.format(now)

  if (preset === 'today') {
    return { from: todayStr, to: todayStr }
  }

  const [year, month, day] = todayStr.split('-').map(Number)
  const baseUtc = new Date(Date.UTC(year, month - 1, day))

  if (preset === '7d') {
    baseUtc.setUTCDate(baseUtc.getUTCDate() - 6)
    return { from: formatDateUtc(baseUtc), to: todayStr }
  }

  if (preset === '30d') {
    baseUtc.setUTCDate(baseUtc.getUTCDate() - 29)
    return { from: formatDateUtc(baseUtc), to: todayStr }
  }

  if (preset === 'month') {
    baseUtc.setUTCDate(1)
    return { from: formatDateUtc(baseUtc), to: todayStr }
  }

  return { from: todayStr, to: todayStr }
}

function formatDateUtc(date) {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Validate a date range: both must be valid YYYY-MM-DD calendar dates and from <= to */
export function isValidDateRange(from, to) {
  const dateRe = /^\d{4}-\d{2}-\d{2}$/
  if (typeof from !== 'string' || typeof to !== 'string') return false
  if (!dateRe.test(from) || !dateRe.test(to)) return false
  return isValidCalendarDate(from) && isValidCalendarDate(to) && from <= to
}

function isValidCalendarDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  )
}
