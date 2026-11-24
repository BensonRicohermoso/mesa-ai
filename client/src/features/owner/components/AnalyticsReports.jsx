import { useState, useEffect, useCallback, useMemo } from 'react'
import PropTypes from 'prop-types'
import {
  getAnalyticsSummary,
  getAnalyticsTrends,
  getMenuEngineering,
  getPerformanceAnalytics,
  getRecentAnalyticsOrders,
} from '../../../shared/api/analyticsApi.js'
import { getPreviewData } from '../analyticsPreviewData.js'
import {
  formatPhp,
  formatPct,
  formatDelta,
  formatDurationSeconds,
  formatOrderTimestamp,
} from '../utils/analyticsFormatters.js'
import { buildCsv, downloadCsv } from '../utils/csvExport.js'
import { SalesTrendChart } from './charts/SalesTrendChart.jsx'
import { MenuEngineeringScatter } from './charts/MenuEngineeringScatter.jsx'

const SUB_VIEWS = [
  { key: 'comparisons', label: 'Comparisons & Mix' },
  { key: 'engineering', label: 'Menu Engineering' },
  { key: 'performance', label: 'Floor & Kitchen' },
]

const QUADRANT_LABELS = {
  all: 'All',
  star: '★ Stars',
  plowhorse: '◆ Plowhorses',
  puzzle: '◇ Puzzles',
  dog: '○ Dogs',
}

const STATUS_LABELS = {
  completed: 'Completed',
  ready: 'Ready',
  preparing: 'Preparing',
  confirmed: 'Confirmed',
  pending: 'Pending',
  cancelled: 'Cancelled',
  expired: 'Expired',
}

export function AnalyticsReports({
  filter,
  subView,
  onSubViewChange,
  refreshNonce = 0,
  onSwitchToPreview,
  onLoadingChange,
}) {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [localRetryCount, setLocalRetryCount] = useState(0)

  // Menu engineering local state
  const [quadrantFilter, setQuadrantFilter] = useState('all')
  const [engSortKey, setEngSortKey] = useState('unitsSold')
  const [engSortDir, setEngSortDir] = useState('desc')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState(null)

  // Orders audit pagination — reset to page 0 when filters change
  const [ordersPage, setOrdersPage] = useState(0)
  const [prevFilterKey, setPrevFilterKey] = useState('')
  const ordersPerPage = 15

  const filterKey = `${filter.from}|${filter.to}|${filter.categoryId}|${filter.paymentMethod}`
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey)
    if (ordersPage !== 0) {
      setOrdersPage(0)
    }
    if (selectedItemId !== null) {
      setSelectedItemId(null)
    }
  }

  const fetchData = useCallback(async (signal) => {
    setLoading(true)
    onLoadingChange?.(true)
    setError(null)

    const params = {
      from: filter.from,
      to: filter.to,
      categoryId: filter.categoryId,
      paymentMethod: filter.paymentMethod,
    }

    try {
      if (filter.sourceMode === 'preview') {
        const preset = filter.preset === 'custom' ? '7d' : filter.preset
        setData({
          summary: getPreviewData('summary', preset),
          trends: getPreviewData('trends', preset),
          menuEngineering: getPreviewData('menu-engineering', preset),
          performance: getPreviewData('performance', preset),
          recentOrders: getPreviewData('recent-orders', preset),
        })
        return
      }

      const results = await Promise.all([
        getAnalyticsSummary({ ...params, compare: 'true' }, { signal }),
        getAnalyticsTrends({ ...params, compare: 'true' }, { signal }),
        getMenuEngineering({ ...params, includeArchived: includeArchived ? 'true' : undefined }, { signal }),
        getPerformanceAnalytics(params, { signal }),
        getRecentAnalyticsOrders({ ...params, limit: 50 }, { signal }),
      ])

      if (signal.aborted) return

      setData({
        summary: results[0],
        trends: results[1],
        menuEngineering: results[2],
        performance: results[3],
        recentOrders: results[4],
      })
    } catch (err) {
      if (err.name === 'AbortError' || signal.aborted) return
      const status = err.status || err.statusCode
      if (status === 401 || status === 403) {
        setError({ type: 'auth', message: 'Authentication required. Please sign in again to view reports.' })
      } else if (status === 404 || status === 501) {
        setError({
          type: 'not-ready',
          message: 'Analytics API Pending Dev 1 Integration — /api/analytics/* endpoints are not yet active.',
        })
      } else {
        setError({ type: 'server', message: err.message || 'Failed to load analytics data.' })
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false)
        onLoadingChange?.(false)
      }
    }
  }, [filter, includeArchived, onLoadingChange])

  useEffect(() => {
    const ac = new AbortController()
    // oxlint-disable-next-line react/set-state-in-effect -- async fetch is the standard pattern
    fetchData(ac.signal)
    return () => ac.abort()
  }, [fetchData, refreshNonce, localRetryCount])

  // ── Menu engineering derived data ──
  const filteredItems = useMemo(() => {
    const items = data.menuEngineering?.items || []
    const base = quadrantFilter === 'all' ? items : items.filter((i) => i.quadrant === quadrantFilter)
    return [...base].sort((a, b) => {
      const aRaw = a[engSortKey]
      const bRaw = b[engSortKey]
      const aVal = Number.isFinite(Number(aRaw)) ? Number(aRaw) : Number.NEGATIVE_INFINITY
      const bVal = Number.isFinite(Number(bRaw)) ? Number(bRaw) : Number.NEGATIVE_INFINITY
      return engSortDir === 'asc' ? aVal - bVal : bVal - aVal
    })
  }, [data.menuEngineering, quadrantFilter, engSortKey, engSortDir])

  function handleEngSort(key) {
    if (engSortKey === key) {
      setEngSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setEngSortKey(key)
      setEngSortDir('desc')
    }
  }

  function sortIndicator(key) {
    if (engSortKey !== key) return ''
    return engSortDir === 'asc' ? ' ▲' : ' ▼'
  }

  function handleSelectMenuItem(item) {
    if (!item?.menuItemId) return
    setSelectedItemId((prev) => (prev === item.menuItemId ? null : item.menuItemId))
  }

  // ── Paginated orders ──
  const allOrders = data.recentOrders?.orders || []
  const paginatedOrders = allOrders.slice(ordersPage * ordersPerPage, (ordersPage + 1) * ordersPerPage)
  const totalOrderPages = Math.ceil(allOrders.length / ordersPerPage)
  const cashiers = data.performance?.cashier?.byCashier || []

  // ── CSV exports ──
  function exportOrdersCsv() {
    if (allOrders.length === 0) return
    const csv = buildCsv(
      ['Order Ref', 'Table', 'Order Status', 'Payment Status', 'Payment Method', 'Items', 'Total (PHP)', 'Gross Profit (PHP)', 'Gross Margin (%)', 'Created At'],
      ['orderRef', 'tableCode', 'orderStatus', 'paymentStatus', 'paymentMethod', 'itemCount', 'total', 'grossProfit', 'grossMarginPct', 'createdAt'],
      allOrders,
    )
    downloadCsv(csv, `orders-audit-${filter.from}-to-${filter.to}.csv`)
  }

  function exportMenuEngineeringCsv() {
    if (filteredItems.length === 0) return
    const csv = buildCsv(
      ['Item', 'Category', 'Units Sold', 'Gross Sales (PHP)', 'COGS (PHP)', 'Gross Profit (PHP)', 'Unit Gross Profit (PHP)', 'Gross Margin (%)', 'Quadrant'],
      ['itemName', 'categoryName', 'unitsSold', 'grossSales', 'cogs', 'grossProfit', 'unitGrossProfit', 'grossMarginPct', 'quadrant'],
      filteredItems,
    )
    downloadCsv(csv, `menu-engineering-${filter.from}-to-${filter.to}.csv`)
  }

  function exportPerformanceCsv() {
    if (cashiers.length === 0) return
    const csv = buildCsv(
      ['Staff', 'Confirmed', 'Total Amount (PHP)', 'Avg Handling (s)', 'Cash', 'GCash', 'Online'],
      ['fullName', 'confirmedCount', 'totalAmount', 'avgHandlingSeconds', 'cashCount', 'gcashCount', 'onlineCount'],
      cashiers,
    )
    downloadCsv(csv, `cashier-performance-${filter.from}-to-${filter.to}.csv`)
  }

  function handlePrintReport() {
    window.print()
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="analytics-reports">
        <nav className="analytics-sub-tabs">
          {SUB_VIEWS.map((v) => (
            <button key={v.key} type="button" className="segment-btn" disabled>{v.label}</button>
          ))}
        </nav>
        <div className="skeleton-block skeleton-block--chart" />
        <div className="skeleton-block skeleton-block--chart" />
      </div>
    )
  }

  // ── Error ──
  if (error) {
    return (
      <div className="analytics-reports dashboard-error-state">
        <div className="mgmt-error">{error.message}</div>
        {error.type === 'not-ready' && (
          <p className="owner-subtitle">
            Once Dev 1 mounts the analytics endpoints, click Retry Live API. In the meantime, toggle
            Preview Fixtures to inspect all reports.
          </p>
        )}
        <div className="dashboard-error-actions">
          {error.type !== 'auth' && (
            <button
              type="button"
              className="action-pill"
              onClick={() => setLocalRetryCount((c) => c + 1)}
            >
              Retry Live API
            </button>
          )}
          {error.type === 'not-ready' && onSwitchToPreview && (
            <button
              type="button"
              className="action-pill action-pill--solid"
              onClick={onSwitchToPreview}
            >
              Preview With Sample Fixtures
            </button>
          )}
        </div>
      </div>
    )
  }

  const activeSubLabel = SUB_VIEWS.find((v) => v.key === subView)?.label || 'Analytics Report'
  const hasPerformanceData = Boolean(
    data.performance?.cashier ||
    data.performance?.kitchen ||
    data.performance?.tables?.byTable?.length > 0
  )

  return (
    <div className="analytics-reports analytics-print-report">
      {/* Editorial print header (hidden on screen, visible when printing) */}
      <div className="print-only-header">
        <div className="print-only-eyebrow">MESA EXECUTIVE REPORT &bull; {activeSubLabel.toUpperCase()}</div>
        <h2 className="print-only-title">Analytics &amp; Financial Performance</h2>
        <div className="print-only-meta">
          Period: {filter.from} to {filter.to} (Asia/Manila)
          {filter.sourceMode === 'preview' ? ' • Sample Preview Fixtures' : ''}
        </div>
      </div>

      {/* Sub-view tabs */}
      <nav className="analytics-sub-tabs no-print">
        {SUB_VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            className={`segment-btn ${subView === v.key ? 'segment-btn--active' : ''}`}
            onClick={() => onSubViewChange(v.key)}
          >
            {v.label}
          </button>
        ))}
      </nav>

      {/* ═══════════════ Comparisons & Mix ═══════════════ */}
      {subView === 'comparisons' && (
        <div className="reports-section">
          {/* Delta matrix */}
          {data.summary?.deltasPct && (
            <div className="kpi-grid kpi-grid--compact">
              {[
                { label: 'Gross Sales', value: formatPhp(data.summary.kpis?.grossSales), delta: data.summary.deltasPct.grossSales },
                { label: 'Gross Profit', value: formatPhp(data.summary.kpis?.grossProfit), delta: data.summary.deltasPct.grossProfit },
                { label: 'Gross Margin', value: formatPct(data.summary.kpis?.grossMarginPct), delta: data.summary.deltasPct.grossMarginPct },
                { label: 'Orders', value: data.summary.kpis?.paidOrdersCount ?? '—', delta: data.summary.deltasPct.paidOrdersCount },
                { label: 'AOV', value: formatPhp(data.summary.kpis?.averageOrderValue), delta: data.summary.deltasPct.averageOrderValue },
              ].map((k) => (
                <div key={k.label} className="kpi-cell">
                  <span className="kpi-label">{k.label}</span>
                  <strong className="kpi-value">{k.value}</strong>
                  <span className={`kpi-delta ${(k.delta ?? 0) >= 0 ? 'kpi-delta--up' : 'kpi-delta--down'}`}>
                    {formatDelta(k.delta)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Trend chart with comparison */}
          <div className="dashboard-chart-section">
            <h3 className="dashboard-section-title">Sales Trend (Comparison)</h3>
            <SalesTrendChart data={data.trends?.salesSeries} showComparison={true} />
          </div>

          {/* Payment Breakdown */}
          {data.summary?.paymentBreakdown?.length > 0 && (
            <div className="reports-subsection">
              <h3 className="dashboard-section-title">Payment Breakdown</h3>
              <div className="editorial-table-wrap">
                <table className="editorial-table">
                  <thead>
                    <tr>
                      <th>Method</th>
                      <th>Orders</th>
                      <th>Amount</th>
                      <th>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.summary.paymentBreakdown.map((p) => (
                      <tr key={p.method}>
                        <td style={{ textTransform: 'uppercase' }}>{p.method}</td>
                        <td>{p.orderCount}</td>
                        <td>{formatPhp(p.amount)}</td>
                        <td>{formatPct(p.sharePct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Order Outcomes */}
          {data.performance?.orderOutcomes && (
            <div className="reports-subsection">
              <h3 className="dashboard-section-title">Order Outcomes</h3>
              <div className="kpi-grid kpi-grid--compact">
                {Object.entries(data.performance.orderOutcomes).map(([status, count]) => (
                  <div key={status} className="kpi-cell">
                    <span className="kpi-label">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                    <strong className="kpi-value">{count}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orders Audit Table */}
          <div className="reports-subsection">
            <div className="dashboard-section-header">
              <h3 className="dashboard-section-title">Orders Audit</h3>
              <span className="kpi-secondary">{allOrders.length} orders</span>
            </div>
            {paginatedOrders.length > 0 ? (
              <>
                <div className="editorial-table-wrap">
                  <table className="editorial-table">
                    <thead>
                      <tr>
                        <th>Ref</th>
                        <th>Table</th>
                        <th>Status</th>
                        <th>Payment</th>
                        <th>Items</th>
                        <th>Total</th>
                        <th>Gross Profit</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedOrders.map((order) => (
                        <tr key={order.id} className={order.orderStatus === 'cancelled' || order.orderStatus === 'expired' ? 'editorial-row--inactive' : ''}>
                          <td className="order-ref-cell">{order.orderRef}</td>
                          <td><span className="table-code-pill">{order.tableCode}</span></td>
                          <td>
                            <span className={`order-status-badge order-status-badge--${order.orderStatus}`}>
                              {STATUS_LABELS[order.orderStatus] || order.orderStatus}
                            </span>
                          </td>
                          <td style={{ textTransform: 'uppercase' }}>{order.paymentMethod || '—'}</td>
                          <td>{order.itemCount}</td>
                          <td>{formatPhp(order.total)}</td>
                          <td>{formatPhp(order.grossProfit)}</td>
                          <td className="order-time-cell">{formatOrderTimestamp(order.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalOrderPages > 1 && (
                  <div className="pagination-controls no-print">
                    <button
                      type="button"
                      className="action-pill action-pill--small"
                      disabled={ordersPage === 0}
                      onClick={() => setOrdersPage((p) => p - 1)}
                    >
                      ← Prev
                    </button>
                    <span className="kpi-secondary">
                      Page {ordersPage + 1} of {totalOrderPages}
                    </span>
                    <button
                      type="button"
                      className="action-pill action-pill--small"
                      disabled={ordersPage >= totalOrderPages - 1}
                      onClick={() => setOrdersPage((p) => p + 1)}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="mgmt-empty"><p>No orders in this period.</p></div>
            )}
          </div>

          {/* Exports */}
          <div className="reports-actions no-print">
            <button
              type="button"
              className="action-pill"
              onClick={exportOrdersCsv}
              disabled={allOrders.length === 0}
            >
              Export Orders CSV
            </button>
            <button type="button" className="action-pill" onClick={handlePrintReport}>
              Print Editorial Report
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════ Menu Engineering ═══════════════ */}
      {subView === 'engineering' && (
        <div className="reports-section">
          {/* Benchmark strip */}
          {data.menuEngineering?.benchmarks && (
            <div className="kpi-grid kpi-grid--compact">
              <div className="kpi-cell">
                <span className="kpi-label">Total Items Sold</span>
                <strong className="kpi-value">{data.menuEngineering.benchmarks.totalUnitsSold}</strong>
              </div>
              <div className="kpi-cell">
                <span className="kpi-label">Avg Popularity</span>
                <strong className="kpi-value">{data.menuEngineering.benchmarks.avgPopularityUnits}</strong>
              </div>
              <div className="kpi-cell">
                <span className="kpi-label">Avg Unit Gross Profit</span>
                <strong className="kpi-value">{formatPhp(data.menuEngineering.benchmarks.avgUnitGrossProfit)}</strong>
              </div>
              <div className="kpi-cell">
                <span className="kpi-label">Total Gross Profit</span>
                <strong className="kpi-value">{formatPhp(data.menuEngineering.benchmarks.totalGrossProfit)}</strong>
              </div>
              <div className="kpi-cell">
                <span className="kpi-label">Avg Gross Margin</span>
                <strong className="kpi-value">{formatPct(data.menuEngineering.benchmarks.avgGrossMarginPct)}</strong>
              </div>
            </div>
          )}

          {/* Quadrant filter pills */}
          <div className="quadrant-grid no-print">
            {Object.entries(QUADRANT_LABELS).map(([key, label]) => {
              const count = key === 'all'
                ? (data.menuEngineering?.items?.length || 0)
                : (data.menuEngineering?.quadrantCounts?.[key] || 0)
              return (
                <button
                  key={key}
                  type="button"
                  className={`quadrant-pill ${quadrantFilter === key ? 'quadrant-pill--active' : ''}`}
                  onClick={() => setQuadrantFilter(key)}
                >
                  {label} ({count})
                </button>
              )
            })}
            <label className="analytics-compare-toggle">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
              />
              <span className="analytics-compare-label">Include Archived</span>
            </label>
          </div>

          {/* Scatter chart */}
          <div className="dashboard-chart-section">
            <h3 className="dashboard-section-title">Menu Performance Matrix</h3>
            <MenuEngineeringScatter
              items={filteredItems}
              benchmarks={data.menuEngineering?.benchmarks}
              selectedItemId={selectedItemId}
              onItemClick={handleSelectMenuItem}
            />
          </div>

          {/* Sortable table */}
          {filteredItems.length > 0 ? (
            <div className="editorial-table-wrap">
              <table className="editorial-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="sortable-th" onClick={() => handleEngSort('unitsSold')}>
                      Units Sold{sortIndicator('unitsSold')}
                    </th>
                    <th className="sortable-th" onClick={() => handleEngSort('grossSales')}>
                      Gross Sales{sortIndicator('grossSales')}
                    </th>
                    <th className="sortable-th" onClick={() => handleEngSort('grossProfit')}>
                      Gross Profit{sortIndicator('grossProfit')}
                    </th>
                    <th className="sortable-th" onClick={() => handleEngSort('unitGrossProfit')}>
                      Unit Gross Profit{sortIndicator('unitGrossProfit')}
                    </th>
                    <th className="sortable-th" onClick={() => handleEngSort('grossMarginPct')}>
                      Gross Margin %{sortIndicator('grossMarginPct')}
                    </th>
                    <th>Quadrant</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const isSelected = selectedItemId === item.menuItemId
                    const rowClasses = [
                      !item.isActive ? 'editorial-row--inactive' : '',
                      isSelected ? 'editorial-row--selected' : '',
                    ].filter(Boolean).join(' ')
                    return (
                      <tr
                        key={item.menuItemId}
                        className={rowClasses || undefined}
                        onClick={() => handleSelectMenuItem(item)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <span className="top-item-name">{item.itemName}</span>
                          <span className="top-item-category">{item.categoryName}</span>
                        </td>
                        <td>{item.unitsSold}</td>
                        <td>{formatPhp(item.grossSales)}</td>
                        <td>{formatPhp(item.grossProfit)}</td>
                        <td>{formatPhp(item.unitGrossProfit)}</td>
                        <td>{formatPct(item.grossMarginPct)}</td>
                        <td style={{ textTransform: 'capitalize' }}>{item.quadrant}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mgmt-empty"><p>No items match the selected filter.</p></div>
          )}

          {/* Export */}
          <div className="reports-actions no-print">
            <button
              type="button"
              className="action-pill"
              onClick={exportMenuEngineeringCsv}
              disabled={filteredItems.length === 0}
            >
              Export CSV
            </button>
            <button type="button" className="action-pill" onClick={handlePrintReport}>
              Print Editorial Report
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════ Floor & Kitchen Performance ═══════════════ */}
      {subView === 'performance' && (
        <div className="reports-section">
          {!hasPerformanceData ? (
            <div className="mgmt-empty"><p>No floor or kitchen performance data available for this period.</p></div>
          ) : (
            <>
              {/* Cashier KPIs */}
              {data.performance?.cashier && (
                <>
                  <h3 className="dashboard-section-title">Cashier Performance</h3>
                  <div className="kpi-grid kpi-grid--compact">
                    <div className="kpi-cell">
                      <span className="kpi-label">Payments Confirmed</span>
                      <strong className="kpi-value">{data.performance.cashier.paymentsConfirmedCount}</strong>
                    </div>
                    <div className="kpi-cell">
                      <span className="kpi-label">Avg Handling Time</span>
                      <strong className="kpi-value">{formatDurationSeconds(data.performance.cashier.avgHandlingSeconds)}</strong>
                    </div>
                    <div className="kpi-cell">
                      <span className="kpi-label">Median Handling Time</span>
                      <strong className="kpi-value">{formatDurationSeconds(data.performance.cashier.medianHandlingSeconds)}</strong>
                    </div>
                  </div>

                  {/* Per-cashier table */}
                  {cashiers.length > 0 && (
                    <div className="editorial-table-wrap" style={{ marginTop: '1rem' }}>
                      <table className="editorial-table">
                        <thead>
                          <tr>
                            <th>Staff</th>
                            <th>Confirmed</th>
                            <th>Total Amount</th>
                            <th>Avg Handling</th>
                            <th>Cash</th>
                            <th>GCash</th>
                            <th>Online</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cashiers.map((c) => (
                            <tr key={c.staffId}>
                              <td>{c.fullName}</td>
                              <td>{c.confirmedCount}</td>
                              <td>{formatPhp(c.totalAmount)}</td>
                              <td>{formatDurationSeconds(c.avgHandlingSeconds)}</td>
                              <td>{c.cashCount}</td>
                              <td>{c.gcashCount}</td>
                              <td>{c.onlineCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* Kitchen Pipeline KPIs */}
              {data.performance?.kitchen && (
                <div className="reports-subsection">
                  <h3 className="dashboard-section-title">Kitchen Pipeline</h3>
                  <div className="kpi-grid kpi-grid--compact">
                    <div className="kpi-cell">
                      <span className="kpi-label">Completed Orders</span>
                      <strong className="kpi-value">{data.performance.kitchen.completedOrdersCount}</strong>
                    </div>
                    <div className="kpi-cell">
                      <span className="kpi-label">Avg Queue Wait</span>
                      <strong className="kpi-value">{formatDurationSeconds(data.performance.kitchen.avgQueueWaitSeconds)}</strong>
                    </div>
                    <div className="kpi-cell">
                      <span className="kpi-label">Avg Prep Time</span>
                      <strong className="kpi-value">{formatDurationSeconds(data.performance.kitchen.avgPrepSeconds)}</strong>
                    </div>
                    <div className="kpi-cell">
                      <span className="kpi-label">Avg Fulfillment</span>
                      <strong className="kpi-value">{formatDurationSeconds(data.performance.kitchen.avgFulfillmentSeconds)}</strong>
                    </div>
                    <div className="kpi-cell">
                      <span className="kpi-label">Active in Kitchen</span>
                      <strong className="kpi-value">{data.performance.kitchen.activeInKitchenCount}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Table Performance */}
              {data.performance?.tables?.byTable?.length > 0 && (
                <div className="reports-subsection">
                  <h3 className="dashboard-section-title">Table Performance</h3>
                  <div className="editorial-table-wrap">
                    <table className="editorial-table">
                      <thead>
                        <tr>
                          <th>Table</th>
                          <th>Label</th>
                          <th>Orders</th>
                          <th>Gross Sales</th>
                          <th>Gross Profit</th>
                          <th>AOV</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.performance.tables.byTable.map((t) => (
                          <tr key={t.tableId}>
                            <td><span className="table-code-pill">{t.tableCode}</span></td>
                            <td>{t.label}</td>
                            <td>{t.orderCount}</td>
                            <td>{formatPhp(t.grossSales)}</td>
                            <td>{formatPhp(t.grossProfit)}</td>
                            <td>{formatPhp(t.averageOrderValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Export */}
              <div className="reports-actions no-print">
                <button
                  type="button"
                  className="action-pill"
                  onClick={exportPerformanceCsv}
                  disabled={cashiers.length === 0}
                >
                  Export Cashier CSV
                </button>
                <button type="button" className="action-pill" onClick={handlePrintReport}>
                  Print Editorial Report
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

AnalyticsReports.propTypes = {
  filter: PropTypes.shape({
    preset: PropTypes.string.isRequired,
    from: PropTypes.string.isRequired,
    to: PropTypes.string.isRequired,
    sourceMode: PropTypes.string.isRequired,
    compare: PropTypes.bool,
    categoryId: PropTypes.string,
    paymentMethod: PropTypes.string,
  }).isRequired,
  subView: PropTypes.string.isRequired,
  onSubViewChange: PropTypes.func.isRequired,
  refreshNonce: PropTypes.number,
  onSwitchToPreview: PropTypes.func,
  onLoadingChange: PropTypes.func,
}
