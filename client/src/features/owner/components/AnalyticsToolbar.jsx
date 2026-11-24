import { useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { getCategories } from '../../../shared/api/menuApi.js'
import { getPresetDateRange, isValidDateRange } from '../utils/analyticsFormatters.js'

const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 D' },
  { key: '30d', label: '30 D' },
  { key: 'month', label: 'This Month' },
  { key: 'custom', label: 'Custom' },
]

const PAYMENT_METHODS = [
  { value: 'all', label: 'All Payments' },
  { value: 'cash', label: 'Cash' },
  { value: 'gcash', label: 'GCash' },
  { value: 'online', label: 'Online' },
]

export function AnalyticsToolbar({
  filter,
  onFilterChange,
  onRefresh,
  isLoading,
}) {
  const [categories, setCategories] = useState([])
  const fetchedCategories = useRef(false)

  useEffect(() => {
    // Fetch categories only once per mount, not on every filter change
    if (fetchedCategories.current) return
    fetchedCategories.current = true
    let cancelled = false
    getCategories()
      .then((res) => {
        if (!cancelled) {
          // getCategories returns { categories: [...] } or possibly a plain array
          const list = Array.isArray(res) ? res : (res?.categories || [])
          setCategories(list)
        }
      })
      .catch(() => {
        fetchedCategories.current = false // allow retry on next mount
      })
    return () => { cancelled = true }
  }, [])

  function handlePreset(preset) {
    if (preset === 'custom') {
      onFilterChange({ ...filter, preset: 'custom' })
      return
    }
    const range = getPresetDateRange(preset)
    onFilterChange({ ...filter, preset, from: range.from, to: range.to })
  }

  function handleDateChange(field, value) {
    const next = { ...filter, [field]: value, preset: 'custom' }
    // Always update local state so the input stays in sync, but only
    // propagate a valid range so child components don't fetch with bad dates.
    if (isValidDateRange(next.from, next.to)) {
      onFilterChange(next)
    }
    // If invalid (from > to), don't fire — let the user correct the other date
  }

  function handleSourceToggle() {
    const next = filter.sourceMode === 'live' ? 'preview' : 'live'
    onFilterChange({ ...filter, sourceMode: next })
  }

  return (
    <div className="analytics-toolbar">
      {/* Date Presets */}
      <div className="analytics-toolbar-row">
        <div className="segment-toggle">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`segment-btn ${filter.preset === p.key ? 'segment-btn--active' : ''}`}
              onClick={() => handlePreset(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="analytics-toolbar-actions">
          {/* Compare toggle */}
          <label className="analytics-compare-toggle">
            <input
              type="checkbox"
              checked={filter.compare || false}
              onChange={(e) => onFilterChange({ ...filter, compare: e.target.checked })}
            />
            <span className="analytics-compare-label">Compare</span>
          </label>

          {/* Refresh */}
          <button
            type="button"
            className="action-pill action-pill--small"
            onClick={onRefresh}
            disabled={isLoading}
          >
            {isLoading ? 'Loading…' : 'Refresh'}
          </button>

          {/* Source toggle */}
          <button
            type="button"
            className={`action-pill action-pill--small ${filter.sourceMode === 'preview' ? 'action-pill--preview' : ''}`}
            onClick={handleSourceToggle}
            title={filter.sourceMode === 'preview'
              ? 'Showing static preview fixtures'
              : 'Fetching from live API'}
          >
            {filter.sourceMode === 'preview' ? '⬥ Preview' : '● Live'}
          </button>
        </div>
      </div>

      {/* Custom date inputs */}
      {filter.preset === 'custom' && (
        <div className="analytics-date-inputs">
          <label className="form-label">
            From
            <input
              type="date"
              className="form-input"
              value={filter.from}
              onChange={(e) => handleDateChange('from', e.target.value)}
            />
          </label>
          <label className="form-label">
            To
            <input
              type="date"
              className="form-input"
              value={filter.to}
              onChange={(e) => handleDateChange('to', e.target.value)}
            />
          </label>
        </div>
      )}

      {/* Filter row */}
      <div className="analytics-toolbar-filters">
        <select
          className="form-input analytics-filter-select"
          value={filter.categoryId || 'all'}
          onChange={(e) => onFilterChange({ ...filter, categoryId: e.target.value })}
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          className="form-input analytics-filter-select"
          value={filter.paymentMethod || 'all'}
          onChange={(e) => onFilterChange({ ...filter, paymentMethod: e.target.value })}
        >
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Preview banner */}
      {filter.sourceMode === 'preview' && (
        <div className="preview-banner" role="alert">
          Preview Fixtures — Displaying static sample data. Analytics API not yet connected.
        </div>
      )}
    </div>
  )
}

AnalyticsToolbar.propTypes = {
  filter: PropTypes.shape({
    preset: PropTypes.string.isRequired,
    from: PropTypes.string.isRequired,
    to: PropTypes.string.isRequired,
    sourceMode: PropTypes.oneOf(['live', 'preview']).isRequired,
    compare: PropTypes.bool,
    categoryId: PropTypes.string,
    paymentMethod: PropTypes.string,
  }).isRequired,
  onFilterChange: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
}
