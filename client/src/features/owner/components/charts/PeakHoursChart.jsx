import { useMemo } from 'react'
import PropTypes from 'prop-types'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { formatPhp } from '../../utils/analyticsFormatters.js'

function PeakTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0]?.payload || {}
  return (
    <div className="chart-tooltip">
      <strong className="chart-tooltip-label">{label}</strong>
      <div className="chart-tooltip-row">Orders: {d.orderCount ?? '—'}</div>
      <div className="chart-tooltip-row">Gross Sales: {formatPhp(d.grossSales)}</div>
      <div className="chart-tooltip-row">Gross Profit: {formatPhp(d.grossProfit)}</div>
    </div>
  )
}

PeakTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
  label: PropTypes.string,
}

export function PeakHoursChart({ data }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    return data.map((d) => ({
      ...d,
      name: d.hourLabel || `${String(d.hour).padStart(2, '0')}:00`,
    }))
  }, [data])

  if (chartData.length === 0) {
    return <div className="mgmt-empty"><p>No peak hour data available.</p></div>
  }

  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height={280} minWidth={0}>
        <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#858585', fontSize: 10, fontFamily: 'var(--font-sans)' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#858585', fontSize: 11, fontFamily: 'var(--font-sans)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<PeakTooltip />} />
          <Bar dataKey="orderCount" isAnimationActive={false} name="Orders">
            {chartData.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.isPeak ? '#FFFFFF' : 'rgba(255,255,255,0.22)'}
                stroke={entry.isPeak ? '#FFFFFF' : '#666666'}
                strokeWidth={1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

PeakHoursChart.propTypes = {
  data: PropTypes.array,
}
