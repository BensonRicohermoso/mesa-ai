import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

const SAFE_URL_RE = /^(https?:\/\/|\/)/i

function buildInitialForm(item, categories) {
  if (item) {
    return {
      name: item.name || '',
      categoryId: item.categoryId || '',
      description: item.description || '',
      imageUrl: item.imageUrl || '',
      price: item.price ?? '',
      costPrice: item.costPrice ?? '',
      isAvailable: item.isAvailable !== false,
    }
  }
  const firstActive = (categories || []).find((c) => c.isActive)
  return {
    name: '',
    categoryId: firstActive?.id || categories?.[0]?.id || '',
    description: '',
    imageUrl: '',
    price: '',
    costPrice: '',
    isAvailable: true,
  }
}

function MenuItemModalForm({ onClose, onSave, item, categories }) {
  const [form, setForm] = useState(() => buildInitialForm(item, categories))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isEditing = Boolean(item)

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saving, onClose])

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()

    const trimmedName = form.name.trim()
    if (!trimmedName) {
      setError('Item name is required.')
      return
    }
    if (!form.categoryId) {
      setError('Please select a category.')
      return
    }
    const trimmedUrl = form.imageUrl.trim()
    if (trimmedUrl && !SAFE_URL_RE.test(trimmedUrl)) {
      setError('Image URL must start with http://, https://, or /.')
      return
    }
    const price = Number(form.price)
    const costPrice = Number(form.costPrice)
    if (Number.isNaN(price) || price < 0) {
      setError('Price must be a non-negative number.')
      return
    }
    if (Number.isNaN(costPrice) || costPrice < 0) {
      setError('Cost price must be a non-negative number.')
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSave({
        name: trimmedName,
        categoryId: form.categoryId,
        description: form.description.trim() || null,
        imageUrl: trimmedUrl || null,
        price,
        costPrice,
        isAvailable: form.isAvailable,
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save menu item.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={() => !saving && onClose()}>
      <div
        className="modal-dialog modal-dialog--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-item-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="editorial-eyebrow">Menu Item Configuration</span>
        <h2 id="menu-item-modal-title" className="modal-title">
          {isEditing ? 'Edit Menu Item' : 'New Menu Item'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group form-group--flex">
              <label className="form-label" htmlFor="menu-item-name-input">
                ITEM NAME
              </label>
              <input
                id="menu-item-name-input"
                type="text"
                className="form-input"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                maxLength={150}
                autoFocus
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="menu-item-category-select">
                CATEGORY
              </label>
              <select
                id="menu-item-category-select"
                className="form-input"
                value={form.categoryId}
                onChange={(e) => handleChange('categoryId', e.target.value)}
                required
              >
                <option value="">Select category…</option>
                {(categories || []).map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}{!cat.isActive ? ' (Archived)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="menu-item-description-input">
              DESCRIPTION
            </label>
            <textarea
              id="menu-item-description-input"
              className="form-input form-textarea"
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={2}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="menu-item-image-url-input">
              IMAGE URL
            </label>
            <input
              id="menu-item-image-url-input"
              type="text"
              className="form-input"
              value={form.imageUrl}
              onChange={(e) => handleChange('imageUrl', e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="menu-item-price-input">
                SELLING PRICE (₱)
              </label>
              <input
                id="menu-item-price-input"
                type="number"
                className="form-input"
                value={form.price}
                onChange={(e) => handleChange('price', e.target.value)}
                min={0}
                step="0.01"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="menu-item-cost-input">
                COST PRICE (₱)
              </label>
              <input
                id="menu-item-cost-input"
                type="number"
                className="form-input"
                value={form.costPrice}
                onChange={(e) => handleChange('costPrice', e.target.value)}
                min={0}
                step="0.01"
                required
              />
            </div>
          </div>

          <div className="form-group form-group--inline">
            <span className="form-label" style={{ marginBottom: 0 }}>
              AVAILABILITY
            </span>
            <button
              type="button"
              className={`stock-toggle ${form.isAvailable ? 'stock-toggle--in' : 'stock-toggle--out'}`}
              onClick={() => handleChange('isAvailable', !form.isAvailable)}
            >
              {form.isAvailable ? '● IN STOCK' : '○ SOLD OUT'}
            </button>
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="quiet-button" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? 'Saving…' : isEditing ? 'Update Item' : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

MenuItemModalForm.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  item: PropTypes.object,
  categories: PropTypes.array,
}

export function MenuItemModal({ isOpen, onClose, onSave, item, categories }) {
  if (!isOpen) return null
  return (
    <MenuItemModalForm
      key={item?.id || 'new'}
      onClose={onClose}
      onSave={onSave}
      item={item}
      categories={categories}
    />
  )
}

MenuItemModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  item: PropTypes.object,
  categories: PropTypes.array,
}
