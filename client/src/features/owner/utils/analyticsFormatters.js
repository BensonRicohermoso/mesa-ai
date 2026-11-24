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

/** Format a numeric amount as PHP currency: ₱1,250.00 */
export function formatPhp(amount) {
  if (amount === null || amount === undefined) return '—'
  return phpFormatter.format(Number(amount))
}

/** Format a percentage value: 61.9% */
export function formatPct(value) {
  if (value === null || value === undefined) return '—'
  return `${Number(value).toFixed(1)}%`
}

/** Format a comparison delta: +12.4% / -3.1% / 0.0% */
export function formatDelta(deltaPct) {
  if (deltaPct === null || deltaPct === undefined) return '—'
  const n = Number(deltaPct)
  const prefix = n > 0 ? '+' : ''
  return `${prefix}${n.toFixed(1)}%`
}

/** Format duration in seconds to human-readable: 42s or 3m 12s */
export function formatDurationSeconds(seconds) {
  if (seconds === null || seconds === undefined) return '—'
  const s = Math.round(Number(seconds))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`
}

/** Format an ISO timestamp to Asia/Manila local display */
export function formatOrderTimestamp(iso) {
  if (!iso) return '—'
  try {
    return manilaTimestampFormatter.format(new Date(iso))
  } catch {
    return '—'
  }
}

/**
 * Compute YYYY-MM-DD date bounds for a named preset using Asia/Manila timezone.
 * Returns { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }
 */
export function getPresetDateRange(preset) {
  const todayStr = manilaDateFormatter.format(new Date())

  if (preset === 'today') {
    return { from: todayStr, to: todayStr }
  }

  const todayDate = new Date(todayStr + 'T00:00:00+08:00')

  if (preset === '7d') {
    const from = new Date(todayDate)
    from.setDate(from.getDate() - 6)
    return { from: formatDateLocal(from), to: todayStr }
  }

  if (preset === '30d') {
    const from = new Date(todayDate)
    from.setDate(from.getDate() - 29)
    return { from: formatDateLocal(from), to: todayStr }
  }

  if (preset === 'month') {
    const from = new Date(todayDate)
    from.setDate(1)
    return { from: formatDateLocal(from), to: todayStr }
  }

  return { from: todayStr, to: todayStr }
}

function formatDateLocal(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Validate a date range: both must be YYYY-MM-DD and from <= to */
export function isValidDateRange(from, to) {
  const dateRe = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRe.test(from) || !dateRe.test(to)) return false
  return from <= to
}
