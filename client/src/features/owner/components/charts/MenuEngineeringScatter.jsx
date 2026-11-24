import { useMemo } from 'react'
import PropTypes from 'prop-types'
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { formatPhp, formatPct } from '../../utils/analyticsFormatters.js'

const QUADRANT_STYLES = {
  star: { fill: '#FFFFFF', stroke: '#FFFFFF', shape: 'circle' },
  plowhorse: { fill: 'transparent', stroke: '#FFFFFF', shape: 'circle' },
  puzzle: { fill: '#858585', stroke: '#858585', shape: 'diamond' },
  dog: { fill: 'transparent', stroke: '#666666', shape: 'diamond' },
}

function QuadrantShape(props) {
  const { cx, cy, payload } = props
  const style = QUADRANT_STYLES[payload?.quadrant] || QUADRANT_STYLES.dog
  const size = 6

  if (style.shape === 'diamond') {
    return (
      <polygon
        points={`${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={1.5}
      />
    )
  }

  return (
    <circle
      cx={cx}
      cy={cy}
      r={size}
      fill={style.fill}
      stroke={style.stroke}
      strokeWidth={1.5}
    />
  )
}

QuadrantShape.propTypes = {
  cx: PropTypes.number,
  cy: PropTypes.number,
  payload: PropTypes.object,
}

function ScatterTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0]?.payload || {}
  return (
    <div className="chart-tooltip">
      <strong className="chart-tooltip-label">{d.itemName}</strong>
      <div className="chart-tooltip-row">{d.categoryName}</div>
      <div className="chart-tooltip-row">Units Sold: {d.unitsSold}</div>
      <div className="chart-tooltip-row">Unit Gross Profit: {formatPhp(d.unitGrossProfit)}</div>
      <div className="chart-tooltip-row">Gross Margin: {formatPct(d.grossMarginPct)}</div>
      <div className="chart-tooltip-row">Quadrant: {(d.quadrant || '').toUpperCase()}</div>
    </div>
  )
}

ScatterTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
}

export function MenuEngineeringScatter({ items, benchmarks, onItemClick }) {
  const hasNegativeProfit = useMemo(() => {
    return (items || []).some((item) => item.unitGrossProfit < 0)
  }, [items])

  if (!items || items.length === 0) {
    return <div className="mgmt-empty"><p>No menu performance data available.</p></div>
  }

  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height={320} minWidth={0}>
        <ScatterChart margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="unitsSold"
            name="Units Sold"
            tick={{ fill: '#858585', fontSize: 11, fontFamily: 'var(--font-sans)' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
            tickLine={false}
            label={{ value: 'Popularity (Units Sold)', position: 'insideBottom', offset: -4, fill: '#858585', fontSize: 10, fontFamily: 'var(--font-sans)' }}
          />
          <YAxis
            type="number"
            dataKey="unitGrossProfit"
            name="Unit Gross Profit"
            domain={hasNegativeProfit ? ['auto', 'auto'] : [0, 'auto']}
            tick={{ fill: '#858585', fontSize: 11, fontFamily: 'var(--font-sans)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `₱${v}`}
            label={{ value: 'Unit Gross Profit (₱)', angle: -90, position: 'insideLeft', offset: 10, fill: '#858585', fontSize: 10, fontFamily: 'var(--font-sans)' }}
          />
          <Tooltip content={<ScatterTooltip />} />

          {benchmarks?.avgPopularityUnits != null && (
            <ReferenceLine
              x={benchmarks.avgPopularityUnits}
              stroke="rgba(255,255,255,0.3)"
              strokeDasharray="6 4"
              label={{ value: 'Avg Popularity', position: 'top', fill: '#858585', fontSize: 9 }}
            />
          )}
          {benchmarks?.avgUnitGrossProfit != null && (
            <ReferenceLine
              y={benchmarks.avgUnitGrossProfit}
              stroke="rgba(255,255,255,0.3)"
              strokeDasharray="6 4"
              label={{ value: 'Avg Unit GP', position: 'right', fill: '#858585', fontSize: 9 }}
            />
          )}
          {hasNegativeProfit && (
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
          )}

          <Scatter
            data={items}
            shape={<QuadrantShape />}
            isAnimationActive={false}
            onClick={(entry) => onItemClick?.(entry)}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

MenuEngineeringScatter.propTypes = {
  items: PropTypes.array,
  benchmarks: PropTypes.object,
  onItemClick: PropTypes.func,
}
