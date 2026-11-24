import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildAnalyticsQuery } from '../src/shared/api/analyticsQuery.js'
import {
  formatPhp,
  formatPct,
  formatDelta,
  formatDurationSeconds,
  formatOrderTimestamp,
  getPresetDateRange,
  isValidDateRange,
} from '../src/features/owner/utils/analyticsFormatters.js'
import { buildCsv } from '../src/features/owner/utils/csvExport.js'
import { getPreviewData } from '../src/features/owner/analyticsPreviewData.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientRoot = path.resolve(__dirname, '..')

test('buildAnalyticsQuery always injects tz=Asia/Manila and drops empty/all sentinels', () => {
  const qs = buildAnalyticsQuery({
    from: '2026-11-19',
    to: '2026-11-25',
    categoryId: 'all',
    paymentMethod: 'all',
    granularity: '',
    limit: undefined,
    extra: null,
  })
  const params = new URLSearchParams(qs)
  assert.equal(params.get('tz'), 'Asia/Manila')
  assert.equal(params.get('from'), '2026-11-19')
  assert.equal(params.get('to'), '2026-11-25')
  assert.equal(params.has('categoryId'), false)
  assert.equal(params.has('paymentMethod'), false)
  assert.equal(params.has('granularity'), false)
  assert.equal(params.has('limit'), false)
  assert.equal(params.has('extra'), false)
})

test('getPresetDateRange resolves Asia/Manila boundaries accurately before 08:00 +08:00', () => {
  // 2026-11-24T20:00:00Z === 2026-11-25 04:00:00 Asia/Manila
  const manilaEarlyMorning = new Date('2026-11-24T20:00:00Z')

  assert.deepEqual(getPresetDateRange('today', manilaEarlyMorning), {
    from: '2026-11-25',
    to: '2026-11-25',
  })
  assert.deepEqual(getPresetDateRange('7d', manilaEarlyMorning), {
    from: '2026-11-19',
    to: '2026-11-25',
  })
  assert.deepEqual(getPresetDateRange('30d', manilaEarlyMorning), {
    from: '2026-10-27',
    to: '2026-11-25',
  })
  assert.deepEqual(getPresetDateRange('month', manilaEarlyMorning), {
    from: '2026-11-01',
    to: '2026-11-25',
  })
})

test('isValidDateRange validates format, calendar validity, and ordering', () => {
  assert.equal(isValidDateRange('2026-11-19', '2026-11-25'), true)
  assert.equal(isValidDateRange('2026-11-25', '2026-11-25'), true)
  assert.equal(isValidDateRange('2026-11-26', '2026-11-25'), false)
  assert.equal(isValidDateRange('2026-02-30', '2026-03-01'), false)
  assert.equal(isValidDateRange('', '2026-11-25'), false)
})

test('display formatters return em-dash on nullish or non-finite values', () => {
  assert.equal(formatPhp(null), '—')
  assert.equal(formatPhp('not-a-number'), '—')
  assert.match(formatPhp(1250), /1,250\.00/)

  assert.equal(formatPct(undefined), '—')
  assert.equal(formatPct(61.93), '61.9%')

  assert.equal(formatDelta(null), '—')
  assert.equal(formatDelta(12.4), '+12.4%')
  assert.equal(formatDelta(-3.1), '-3.1%')
  assert.equal(formatDelta(0), '0.0%')

  assert.equal(formatDurationSeconds(42), '42s')
  assert.equal(formatDurationSeconds(192), '3m 12s')
  assert.equal(formatDurationSeconds(120), '2m')
  assert.equal(formatDurationSeconds('bad'), '—')

  assert.equal(formatOrderTimestamp('invalid-date'), '—')
})

test('buildCsv enforces UTF-8 BOM, RFC-4180 quoting, and formula-injection sanitization', () => {
  const csv = buildCsv(
    ['Item', 'Notes', 'Gross Profit (PHP)', 'Gross Margin (%)'],
    ['item', 'notes', 'gp', 'gm'],
    [
      { item: 'Burger, "Deluxe"', notes: '=CMD|calc', gp: -15.5, gm: 61.9 },
      { item: 'Tea\nIced', notes: '+SUM(A1)', gp: 52, gm: 86.7 },
    ],
  )

  assert.equal(csv.startsWith('\uFEFF'), true)
  assert.ok(csv.includes('"Burger, ""Deluxe"""'))
  assert.ok(csv.includes("'=CMD|calc"))
  assert.ok(csv.includes("'+SUM(A1)"))
  // Numeric negatives stay numeric (not treated as formula text)
  assert.ok(csv.includes(',-15.5,'))
  assert.ok(csv.includes('"Tea\nIced"'))
})

test('analyticsPreviewData conforms to all 5 endpoint contract shapes', () => {
  const summary = getPreviewData('summary', '7d')
  assert.equal(summary.range.timezone, 'Asia/Manila')
  assert.equal(typeof summary.kpis.grossSales, 'number')
  assert.equal(typeof summary.kpis.grossProfit, 'number')
  assert.equal(typeof summary.kpis.grossMarginPct, 'number')
  assert.ok(Array.isArray(summary.paymentBreakdown))

  const trends = getPreviewData('trends', '7d')
  assert.ok(trends.salesSeries.length > 0)
  assert.ok(trends.peakHours.length > 0)

  const menu = getPreviewData('menu-engineering', '7d')
  assert.equal(typeof menu.benchmarks.avgPopularityUnits, 'number')
  assert.equal(typeof menu.benchmarks.avgUnitGrossProfit, 'number')
  assert.ok(menu.items.every((i) => ['star', 'plowhorse', 'puzzle', 'dog'].includes(i.quadrant)))

  const top5 = getPreviewData('menu-engineering', '7d', { limit: 5 })
  assert.equal(top5.items.length, 5)

  const perf = getPreviewData('performance', '7d')
  assert.equal(typeof perf.cashier.avgHandlingSeconds, 'number')
  assert.equal(typeof perf.kitchen.avgPrepSeconds, 'number')
  assert.ok(perf.tables.byTable.length > 0)

  const orders = getPreviewData('recent-orders', '7d')
  assert.ok(orders.orders.length > 0)
  assert.equal(typeof orders.pagination.total, 'number')
})

test('terminology audit: zero occurrences of net profit, net margin, or operating profit', () => {
  const filesToScan = [
    'src/shared/api/analyticsApi.js',
    'src/shared/api/analyticsQuery.js',
    'src/features/owner/analyticsPreviewData.js',
    'src/features/owner/OwnerHome.jsx',
    'src/features/owner/utils/analyticsFormatters.js',
    'src/features/owner/utils/csvExport.js',
    'src/features/owner/components/AnalyticsToolbar.jsx',
    'src/features/owner/components/OwnerDashboard.jsx',
    'src/features/owner/components/AnalyticsReports.jsx',
    'src/features/owner/components/StationSettingsModal.jsx',
    'src/features/owner/components/charts/SalesTrendChart.jsx',
    'src/features/owner/components/charts/PeakHoursChart.jsx',
    'src/features/owner/components/charts/MenuEngineeringScatter.jsx',
  ]

  const forbidden = /\b(net profit|net margin|operating profit)\b/i

  for (const relPath of filesToScan) {
    const content = fs.readFileSync(path.join(clientRoot, relPath), 'utf8')
    assert.equal(
      forbidden.test(content),
      false,
      `Disallowed profit terminology found in ${relPath}`,
    )
  }
})
