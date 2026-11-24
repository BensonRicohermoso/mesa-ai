import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

function CategoryModalForm({ onClose, onSave }) {
  const [name, setName] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saving, onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Category name is required.')
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSave({ name: trimmed, sortOrder })
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to create category.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={() => !saving && onClose()}>
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="editorial-eyebrow">Category Configuration</span>
        <h2 id="category-modal-title" className="modal-title">
          New Category
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="category-name-input">
              CATEGORY NAME
            </label>
            <input
              id="category-name-input"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="category-sort-order-input">
              DISPLAY ORDER
            </label>
            <input
              id="category-sort-order-input"
              type="number"
              className="form-input"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              min={0}
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="quiet-button" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? 'Saving…' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

CategoryModalForm.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
}

export function CategoryModal({ isOpen, onClose, onSave }) {
  if (!isOpen) return null
  return <CategoryModalForm onClose={onClose} onSave={onSave} />
}

CategoryModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
}
