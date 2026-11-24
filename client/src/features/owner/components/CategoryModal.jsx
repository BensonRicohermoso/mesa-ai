import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

export function CategoryModal({ isOpen, onClose, onSave, category }) {
  const [name, setName] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isEditing = Boolean(category)

  useEffect(() => {
    if (isOpen) {
      setName(category?.name || '')
      setSortOrder(category?.sortOrder ?? 0)
      setError('')
      setSaving(false)
    }
  }, [isOpen, category])

  if (!isOpen) return null

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
      setError(err.message || 'Failed to save category.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <span className="editorial-eyebrow">Category Configuration</span>
        <h2 className="modal-title">{isEditing ? 'Edit Category' : 'New Category'}</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">CATEGORY NAME</label>
            <input
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
            <label className="form-label">DISPLAY ORDER</label>
            <input
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
              {saving ? 'Saving…' : isEditing ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

CategoryModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  category: PropTypes.object,
}
