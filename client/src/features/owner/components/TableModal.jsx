import { useState } from 'react'
import PropTypes from 'prop-types'

const TABLE_CODE_RE = /^[A-Z0-9]{1,20}$/

function TableModalForm({ onClose, onSave, table }) {
  const [tableCode, setTableCode] = useState(table?.tableCode || '')
  const [label, setLabel] = useState(table?.label || '')
  const [isActive, setIsActive] = useState(table ? table.isActive !== false : true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isEditing = Boolean(table)

  async function handleSubmit(e) {
    e.preventDefault()

    const normalizedCode = tableCode.trim().toUpperCase()
    const trimmedLabel = label.trim()

    if (!TABLE_CODE_RE.test(normalizedCode)) {
      setError('Table code must be 1 to 20 alphanumeric characters (e.g. T01).')
      return
    }
    if (!trimmedLabel || trimmedLabel.length > 50) {
      setError('Table label is required and must be at most 50 characters.')
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSave({
        tableCode: normalizedCode,
        label: trimmedLabel,
        isActive,
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save dining table.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <span className="editorial-eyebrow">Dining Suite Configuration</span>
        <h2 className="modal-title">{isEditing ? 'Edit Dining Table' : 'New Dining Table'}</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="table-code-input">
              TABLE CODE
            </label>
            <input
              id="table-code-input"
              type="text"
              className="form-input form-input--uppercase"
              value={tableCode}
              onChange={(e) => setTableCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="T01"
              maxLength={20}
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="table-label-input">
              TABLE LABEL
            </label>
            <input
              id="table-label-input"
              type="text"
              className="form-input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Table 1 or Patio Table 4"
              maxLength={50}
              required
            />
          </div>

          <div className="form-group form-group--inline">
            <span className="form-label" style={{ marginBottom: 0 }}>
              DINING STATE
            </span>
            <button
              type="button"
              className={`stock-toggle ${isActive ? 'stock-toggle--in' : 'stock-toggle--out'}`}
              onClick={() => setIsActive((prev) => !prev)}
            >
              {isActive ? '● ACTIVE' : '○ CLOSED'}
            </button>
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="quiet-button" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? 'Saving…' : isEditing ? 'Update Table' : 'Create Table'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

TableModalForm.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  table: PropTypes.object,
}

export function TableModal({ isOpen, onClose, onSave, table }) {
  if (!isOpen) return null
  return (
    <TableModalForm
      key={table?.id || 'new'}
      onClose={onClose}
      onSave={onSave}
      table={table}
    />
  )
}

TableModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  table: PropTypes.object,
}
