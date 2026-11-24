import { useMemo } from 'react'
import PropTypes from 'prop-types'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { formatPhp, formatPct } from '../../utils/analyticsFormatters.js'

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0]?.payload || {}
  return (
    <div className="chart-tooltip">
      <strong className="chart-tooltip-label">{label}</strong>
      <div className="chart-tooltip-row">Gross Sales: {formatPhp(d.grossSales)}</div>
      <div className="chart-tooltip-row">Gross Profit: {formatPhp(d.grossProfit)}</div>
      <div className="chart-tooltip-row">Gross Margin: {formatPct(d.grossMarginPct)}</div>
      <div className="chart-tooltip-row">Orders: {d.orderCount ?? '—'}</div>
    </div>
  )
}

ChartTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
  label: PropTypes.string,
}

export function SalesTrendChart({ data, showComparison }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    return data.map((d) => ({
      ...d,
      name: d.label || d.bucket,
    }))
  }, [data])

  if (chartData.length === 0) {
    return <div className="mgmt-empty"><p>No trend data available.</p></div>
  }

  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height={280} minWidth={0}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            tick={{ fill: '#858585', fontSize: 11, fontFamily: 'var(--font-sans)' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#858585', fontSize: 11, fontFamily: 'var(--font-sans)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<ChartTooltip />} />
          <defs>
            <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="grossSales"
            stroke="#FFFFFF"
            strokeWidth={2}
            fill="url(#salesFill)"
            isAnimationActive={false}
            name="Gross Sales"
          />
          <Line
            type="monotone"
            dataKey="grossProfit"
            stroke="#999999"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
            name="Gross Profit"
          />
          {showComparison && (
            <Line
              type="monotone"
              dataKey="previousGrossSales"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth={1}
              strokeDasharray="2 4"
              dot={false}
              isAnimationActive={false}
              name="Previous Gross Sales"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

SalesTrendChart.propTypes = {
  data: PropTypes.array,
  showComparison: PropTypes.bool,
}
