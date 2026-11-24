/**
 * RFC-4180 compliant CSV serializer with UTF-8 BOM and formula-injection protection.
 * Uses only Gross Profit and Gross Margin terminology.
 */

const BOM = '\uFEFF'
const FORMULA_START_RE = /^[=+\-@\t\r]/

/**
 * Escape a single CSV cell value.
 * - Neutralizes formula injection by prefixing with ' for string cells.
 * - Wraps in double quotes if the value contains comma, quote, or newline.
 */
function escapeCell(value) {
  if (value === null || value === undefined) return ''

  const str = String(value)

  // For non-numeric values that start with formula characters, prepend '
  const isNumeric = str !== '' && !isNaN(Number(str))
  const sanitized = !isNumeric && FORMULA_START_RE.test(str) ? `'${str}` : str

  // Wrap in quotes if contains special characters
  if (sanitized.includes(',') || sanitized.includes('"') || sanitized.includes('\n') || sanitized.includes('\r')) {
    return `"${sanitized.replace(/"/g, '""')}"`
  }

  return sanitized
}

/**
 * Convert an array of row objects into a CSV string.
 * @param {Array<string>} headers - Column header labels (e.g. 'Gross Sales (PHP)')
 * @param {Array<string>} keys - Object keys corresponding to each header
 * @param {Array<Object>} rows - Data rows
 * @returns {string} CSV content with UTF-8 BOM
 */
export function buildCsv(headers, keys, rows) {
  const lines = [headers.map(escapeCell).join(',')]

  for (const row of rows) {
    const cells = keys.map((key) => escapeCell(row[key]))
    lines.push(cells.join(','))
  }

  return BOM + lines.join('\r\n') + '\r\n'
}

/**
 * Trigger a browser download of a CSV string.
 * @param {string} csvContent - Full CSV string (with BOM)
 * @param {string} filename - Download filename (e.g. 'menu-engineering-2026-11-25.csv')
 */
export function downloadCsv(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
