import { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import {
  getAnalyticsSummary,
  getAnalyticsTrends,
  getMenuEngineering,
  getRecentAnalyticsOrders,
} from '../../../shared/api/analyticsApi.js'
import { getPreviewData } from '../analyticsPreviewData.js'
import {
  formatPhp,
  formatPct,
  formatDelta,
  formatOrderTimestamp,
} from '../utils/analyticsFormatters.js'
import { SalesTrendChart } from './charts/SalesTrendChart.jsx'
import { PeakHoursChart } from './charts/PeakHoursChart.jsx'

const STATUS_LABELS = {
  completed: 'Completed',
  ready: 'Ready',
  preparing: 'Preparing',
  confirmed: 'Confirmed',
  pending: 'Pending',
  cancelled: 'Cancelled',
  expired: 'Expired',
}

export function OwnerDashboard({
  filter,
  refreshNonce = 0,
  onNavigateReports,
  onSwitchToPreview,
  onResetRange,
  onLoadingChange,
}) {
  const [summary, setSummary] = useState(null)
  const [trends, setTrends] = useState(null)
  const [topItems, setTopItems] = useState(null)
  const [recentOrders, setRecentOrders] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [granularityOverride, setGranularityOverride] = useState(null)
  const [prevRangeKey, setPrevRangeKey] = useState(`${filter.from}|${filter.to}`)
  const [localRetryCount, setLocalRetryCount] = useState(0)

  const rangeKey = `${filter.from}|${filter.to}`
  if (rangeKey !== prevRangeKey) {
    setPrevRangeKey(rangeKey)
    if (granularityOverride !== null) {
      setGranularityOverride(null)
    }
  }

  // Derive default granularity from date range; allow manual override
  const granularity = granularityOverride ?? (filter.from === filter.to ? 'hour' : 'day')

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
        setSummary(getPreviewData('summary', preset))
        setTrends(getPreviewData('trends', preset, { granularity }))
        setTopItems(getPreviewData('menu-engineering', preset, { limit: 5 }))
        setRecentOrders(getPreviewData('recent-orders', preset))
        return
      }

      const results = await Promise.all([
        getAnalyticsSummary({ ...params, compare: 'true' }, { signal }),
        getAnalyticsTrends(
          { ...params, granularity, compare: filter.compare ? 'true' : undefined },
          { signal },
        ),
        getMenuEngineering({ ...params, limit: 5 }, { signal }),
        getRecentAnalyticsOrders({ ...params, limit: 8 }, { signal }),
      ])

      if (signal.aborted) return

      setSummary(results[0])
      setTrends(results[1])
      setTopItems(results[2])
      setRecentOrders(results[3])
    } catch (err) {
      if (err.name === 'AbortError' || signal.aborted) return
      const status = err.status || err.statusCode
      if (status === 401 || status === 403) {
        setError({ type: 'auth', message: 'Authentication required. Please sign in again to view analytics.' })
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
  }, [filter, granularity, onLoadingChange])

  useEffect(() => {
    const ac = new AbortController()
    // oxlint-disable-next-line react/set-state-in-effect -- async fetch is the standard pattern
    fetchData(ac.signal)
    return () => ac.abort()
  }, [fetchData, refreshNonce, localRetryCount])

  const kpis = summary?.kpis
  const deltas = summary?.deltasPct

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="dashboard-skeleton">
        <div className="kpi-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="kpi-cell">
              <div className="skeleton-block skeleton-block--sm" />
              <div className="skeleton-block skeleton-block--lg" />
              <div className="skeleton-block skeleton-block--sm" />
            </div>
          ))}
        </div>
        <div className="dashboard-charts-grid">
          <div className="skeleton-block skeleton-block--chart" />
          <div className="skeleton-block skeleton-block--chart" />
        </div>
      </div>
    )
  }

  // ── Error states ──
  if (error) {
    return (
      <div className="dashboard-error-state">
        <div className="mgmt-error">{error.message}</div>
        {error.type === 'not-ready' && (
          <p className="owner-subtitle">
            Once Dev 1 mounts the analytics endpoints, click Retry Live API. In the meantime, you can
            preview the dashboard layout with static sample fixtures.
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

  // ── Empty state ──
  if (kpis && kpis.paidOrdersCount === 0) {
    return (
      <div className="dashboard-empty-state">
        <h2>No Paid Orders In Range</h2>
        <p className="owner-subtitle">
          No paid orders match the current date range and filters.
        </p>
        {onResetRange && (
          <div className="dashboard-error-actions">
            <button type="button" className="action-pill" onClick={onResetRange}>
              Reset Date Range
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="owner-dashboard">
      {/* ── KPI Strip ── */}
      <div className="kpi-grid">
        <div className="kpi-cell">
          <span className="kpi-label">Gross Sales</span>
          <strong className="kpi-value">{formatPhp(kpis?.grossSales)}</strong>
          <span className={`kpi-delta ${(deltas?.grossSales ?? 0) >= 0 ? 'kpi-delta--up' : 'kpi-delta--down'}`}>
            {formatDelta(deltas?.grossSales)}
          </span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-label">Gross Profit</span>
          <strong className="kpi-value">{formatPhp(kpis?.grossProfit)}</strong>
          <span className={`kpi-delta ${(deltas?.grossProfit ?? 0) >= 0 ? 'kpi-delta--up' : 'kpi-delta--down'}`}>
            {formatDelta(deltas?.grossProfit)}
          </span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-label">Gross Margin</span>
          <strong className="kpi-value">{formatPct(kpis?.grossMarginPct)}</strong>
          <span className={`kpi-delta ${(deltas?.grossMarginPct ?? 0) >= 0 ? 'kpi-delta--up' : 'kpi-delta--down'}`}>
            {formatDelta(deltas?.grossMarginPct)}
          </span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-label">Avg Order Value</span>
          <strong className="kpi-value">{formatPhp(kpis?.averageOrderValue)}</strong>
          <span className={`kpi-delta ${(deltas?.averageOrderValue ?? 0) >= 0 ? 'kpi-delta--up' : 'kpi-delta--down'}`}>
            {formatDelta(deltas?.averageOrderValue)}
          </span>
          <span className="kpi-secondary">{kpis?.paidOrdersCount ?? 0} paid orders</span>
        </div>
      </div>

      {/* ── Charts Grid ── */}
      <div className="dashboard-charts-grid">
        <div className="dashboard-chart-section">
          <div className="dashboard-section-header">
            <h3 className="dashboard-section-title">Sales Trend</h3>
            <div className="segment-toggle">
              <button
                type="button"
                className={`segment-btn ${granularity === 'day' ? 'segment-btn--active' : ''}`}
                onClick={() => setGranularityOverride('day')}
              >
                Day
              </button>
              <button
                type="button"
                className={`segment-btn ${granularity === 'hour' ? 'segment-btn--active' : ''}`}
                onClick={() => setGranularityOverride('hour')}
              >
                Hour
              </button>
            </div>
          </div>
          <SalesTrendChart
            data={trends?.salesSeries}
            showComparison={filter.compare}
          />
        </div>
        <div className="dashboard-chart-section">
          <h3 className="dashboard-section-title">Peak Hours</h3>
          <PeakHoursChart data={trends?.peakHours} />
        </div>
      </div>

      {/* ── Bottom Grid: Top Items + Recent Orders ── */}
      <div className="dashboard-bottom-grid">
        {/* Top Items */}
        <div className="dashboard-bottom-section">
          <h3 className="dashboard-section-title">Top Items</h3>
          {topItems?.items?.length > 0 ? (
            <div className="editorial-table-wrap">
              <table className="editorial-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Sold</th>
                    <th>Gross Sales</th>
                    <th>Gross Profit</th>
                    <th>Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {topItems.items.map((item) => (
                    <tr key={item.menuItemId}>
                      <td>
                        <span className="top-item-name">{item.itemName}</span>
                        <span className="top-item-category">{item.categoryName}</span>
                      </td>
                      <td>{item.unitsSold}</td>
                      <td>{formatPhp(item.grossSales)}</td>
                      <td>{formatPhp(item.grossProfit)}</td>
                      <td>{formatPct(item.grossMarginPct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mgmt-empty"><p>No item data.</p></div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="dashboard-bottom-section">
          <h3 className="dashboard-section-title">Recent Orders</h3>
          {recentOrders?.orders?.length > 0 ? (
            <div className="editorial-table-wrap">
              <table className="editorial-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Table</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.orders.map((order) => (
                    <tr key={order.id} className={order.orderStatus === 'cancelled' || order.orderStatus === 'expired' ? 'editorial-row--inactive' : ''}>
                      <td className="order-ref-cell">{order.orderRef}</td>
                      <td>
                        <span className="table-code-pill">{order.tableCode}</span>
                      </td>
                      <td>
                        <span className={`order-status-badge order-status-badge--${order.orderStatus}`}>
                          {STATUS_LABELS[order.orderStatus] || order.orderStatus}
                        </span>
                      </td>
                      <td>{formatPhp(order.total)}</td>
                      <td className="order-time-cell">{formatOrderTimestamp(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mgmt-empty"><p>No recent orders.</p></div>
          )}
        </div>
      </div>

      {/* Explore CTA */}
      {onNavigateReports && (
        <div className="dashboard-cta">
          <button
            type="button"
            className="action-pill"
            onClick={onNavigateReports}
          >
            Explore Full Reports →
          </button>
        </div>
      )}
    </div>
  )
}

OwnerDashboard.propTypes = {
  filter: PropTypes.shape({
    preset: PropTypes.string.isRequired,
    from: PropTypes.string.isRequired,
    to: PropTypes.string.isRequired,
    sourceMode: PropTypes.string.isRequired,
    compare: PropTypes.bool,
    categoryId: PropTypes.string,
    paymentMethod: PropTypes.string,
  }).isRequired,
  refreshNonce: PropTypes.number,
  onNavigateReports: PropTypes.func,
  onSwitchToPreview: PropTypes.func,
  onResetRange: PropTypes.func,
  onLoadingChange: PropTypes.func,
}
