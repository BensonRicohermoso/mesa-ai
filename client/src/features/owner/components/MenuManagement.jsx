import { useState, useEffect, useMemo } from 'react'
import {
  getCategories,
  createCategory,
  setCategoryStatus,
  deleteCategory,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  setItemAvailability,
  setItemActiveStatus,
} from '../../../shared/api/menuApi.js'
import { CategoryModal } from './CategoryModal.jsx'
import { MenuItemModal } from './MenuItemModal.jsx'

export function MenuManagement() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  // Filters
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  const [showArchived, setShowArchived] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Modals
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [confirmRemoveCat, setConfirmRemoveCat] = useState(null)
  const [removingCat, setRemovingCat] = useState(false)

  function showNotice(msg) {
    setFeedback(msg)
    setTimeout(() => {
      setFeedback((prev) => (prev === msg ? '' : prev))
    }, 3500)
  }

  // ── Data Loading ───────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true
    Promise.all([
      getCategories({ includeInactive: true }),
      getMenuItems(),
    ])
      .then(([catRes, itemRes]) => {
        if (!mounted) return
        setCategories(catRes.categories || [])
        setItems(itemRes.items || [])
        setError('')
      })
      .catch((err) => {
        if (!mounted) return
        setError(err.message || 'Failed to load menu data.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!confirmRemoveCat) return undefined
    function handleKeyDown(e) {
      if (e.key === 'Escape' && !removingCat) {
        setConfirmRemoveCat(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [confirmRemoveCat, removingCat])

  // ── Filtering & Dynamic Counts ─────────────────────────────────────────────
  const segmentItems = useMemo(
    () => items.filter((item) => (showArchived ? !item.isActive : item.isActive)),
    [items, showArchived]
  )

  const categoryCounts = useMemo(() => {
    const counts = new Map()
    for (const item of segmentItems) {
      counts.set(item.categoryId, (counts.get(item.categoryId) || 0) + 1)
    }
    return counts
  }, [segmentItems])

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return segmentItems.filter((item) => {
      if (selectedCategoryId && item.categoryId !== selectedCategoryId) return false
      if (
        q &&
        !item.name.toLowerCase().includes(q) &&
        !(item.description || '').toLowerCase().includes(q)
      ) {
        return false
      }
      return true
    })
  }, [segmentItems, selectedCategoryId, searchQuery])

  // ── Category Handlers ──────────────────────────────────────────────────────
  async function handleCreateCategory(data) {
    const created = await createCategory(data)
    setCategories((prev) => {
      const exists = prev.some((c) => c.id === created.id)
      const next = exists
        ? prev.map((c) => (c.id === created.id ? created : c))
        : [...prev, created]
      return next.sort((a, b) => a.sortOrder - b.sortOrder)
    })
    showNotice(`Category "${created.name}" created.`)
  }

  async function handleToggleCategoryStatus(cat) {
    try {
      setError('')
      const updated = await setCategoryStatus(cat.id, !cat.isActive)
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      showNotice(
        `Category "${updated.name}" ${updated.isActive ? 'restored' : 'deactivated'}.`
      )
    } catch (err) {
      setError(err.message || 'Failed to update category status.')
    }
  }

  async function handleConfirmRemoveCategory() {
    if (!confirmRemoveCat) return
    const cat = confirmRemoveCat
    setRemovingCat(true)
    try {
      setError('')
      const result = await deleteCategory(cat.id)
      if (result.softDeleted) {
        setCategories((prev) =>
          prev.map((c) => (c.id === cat.id ? { ...c, isActive: false } : c))
        )
      } else {
        setCategories((prev) => prev.filter((c) => c.id !== cat.id))
      }
      if (selectedCategoryId === cat.id) {
        setSelectedCategoryId(null)
      }
      setConfirmRemoveCat(null)
      showNotice(`Category "${cat.name}" removed.`)
    } catch (err) {
      setError(err.message || 'Failed to remove category.')
      setConfirmRemoveCat(null)
    } finally {
      setRemovingCat(false)
    }
  }

  // ── Item Handlers ──────────────────────────────────────────────────────────
  function openNewItem() {
    setEditingItem(null)
    setItemModalOpen(true)
  }

  function openEditItem(item) {
    setEditingItem(item)
    setItemModalOpen(true)
  }

  async function handleSaveItem(data) {
    if (editingItem) {
      const updated = await updateMenuItem(editingItem.id, data)
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
      showNotice(`"${updated.name}" updated.`)
    } else {
      const created = await createMenuItem(data)
      setItems((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      )
      showNotice(`"${created.name}" added to menu.`)
    }
  }

  async function handleToggleAvailability(item) {
    try {
      setError('')
      const updated = await setItemAvailability(item.id, !item.isAvailable)
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
      showNotice(
        `"${updated.name}" marked ${updated.isAvailable ? 'In Stock' : 'Sold Out'}.`
      )
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleToggleItemStatus(item) {
    try {
      setError('')
      const updated = await setItemActiveStatus(item.id, !item.isActive)
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
      showNotice(
        `"${updated.name}" ${updated.isActive ? 'restored to menu' : 'archived'}.`
      )
    } catch (err) {
      setError(err.message)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mgmt-loading">
        <p>Loading menu data…</p>
      </div>
    )
  }

  return (
    <div className="menu-mgmt">
      {error && <p className="mgmt-error">{error}</p>}
      {feedback && <p className="mgmt-feedback">{feedback}</p>}

      <div className="menu-mgmt-layout">
        {/* ── Left: Categories Panel ─────────────────────────────────── */}
        <aside className="menu-categories-panel">
          <div className="panel-header">
            <span className="editorial-eyebrow">Categories</span>
            <button
              type="button"
              className="action-pill action-pill--small"
              onClick={() => setCatModalOpen(true)}
            >
              + New
            </button>
          </div>

          <ul className="category-list">
            <li>
              <button
                type="button"
                className={`category-item ${!selectedCategoryId ? 'category-item--active' : ''}`}
                onClick={() => setSelectedCategoryId(null)}
              >
                <span>All Items</span>
                <span className="category-count">{segmentItems.length}</span>
              </button>
            </li>
            {categories.map((cat) => (
              <li key={cat.id} className="category-row">
                <button
                  type="button"
                  className={`category-item ${selectedCategoryId === cat.id ? 'category-item--active' : ''} ${!cat.isActive ? 'category-item--inactive' : ''}`}
                  onClick={() => setSelectedCategoryId(cat.id)}
                >
                  <span>
                    {cat.name}
                    {!cat.isActive && <span className="inactive-label"> (Inactive)</span>}
                  </span>
                  <span className="category-count">{categoryCounts.get(cat.id) || 0}</span>
                </button>
                {cat.isActive ? (
                  <button
                    type="button"
                    className="category-remove-btn"
                    onClick={() => setConfirmRemoveCat(cat)}
                    title={`Remove ${cat.name}`}
                    aria-label={`Remove ${cat.name}`}
                  >
                    ×
                  </button>
                ) : (
                  <button
                    type="button"
                    className="action-pill action-pill--small"
                    onClick={() => handleToggleCategoryStatus(cat)}
                    title={`Restore ${cat.name}`}
                  >
                    Restore
                  </button>
                )}
              </li>
            ))}
          </ul>
        </aside>

        {/* ── Right: Items Panel ──────────────────────────────────────── */}
        <section className="menu-items-panel">
          <div className="panel-header">
            <div className="panel-header-left">
              <span className="editorial-eyebrow">Menu Items</span>
              <div className="segment-toggle">
                <button
                  type="button"
                  className={`segment-btn ${!showArchived ? 'segment-btn--active' : ''}`}
                  onClick={() => setShowArchived(false)}
                >
                  Active ({items.filter((i) => i.isActive).length})
                </button>
                <button
                  type="button"
                  className={`segment-btn ${showArchived ? 'segment-btn--active' : ''}`}
                  onClick={() => setShowArchived(true)}
                >
                  Archived ({items.filter((i) => !i.isActive).length})
                </button>
              </div>
            </div>
            <div className="panel-header-right">
              <input
                type="text"
                className="search-input"
                placeholder="Search items…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="button" className="action-pill action-pill--solid" onClick={openNewItem}>
                + New Item
              </button>
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="mgmt-empty">
              <p>
                {showArchived
                  ? 'No archived items found.'
                  : searchQuery
                    ? 'No items match your search.'
                    : 'No menu items yet. Create your first item.'}
              </p>
            </div>
          ) : (
            <div className="item-grid">
              {filteredItems.map((item) => {
                const margin =
                  item.price > 0
                    ? (((item.price - item.costPrice) / item.price) * 100).toFixed(1)
                    : '0.0'
                return (
                  <article
                    key={item.id}
                    className={`item-card ${!item.isActive ? 'item-card--archived' : ''}`}
                  >
                    <div className="item-card-body">
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="item-thumb"
                          loading="lazy"
                        />
                      )}
                      <div className="item-card-content">
                        <div className="item-card-header">
                          <h3 className="item-name">{item.name}</h3>
                          {item.categoryName && (
                            <span className="item-category-badge">{item.categoryName}</span>
                          )}
                        </div>

                        {item.description && (
                          <p className="item-description">{item.description}</p>
                        )}

                        <div className="item-pricing">
                          <span>Price: ₱{item.price.toFixed(2)}</span>
                          <span>Cost: ₱{item.costPrice.toFixed(2)}</span>
                          <span>Margin: {margin}%</span>
                        </div>

                        <div className="item-card-footer">
                          <button
                            type="button"
                            className={`stock-toggle ${item.isAvailable ? 'stock-toggle--in' : 'stock-toggle--out'}`}
                            onClick={() => handleToggleAvailability(item)}
                            disabled={!item.isActive}
                            title={item.isAvailable ? 'Mark as sold out' : 'Mark as in stock'}
                          >
                            {item.isAvailable ? '● IN STOCK' : '○ SOLD OUT'}
                          </button>

                          <div className="item-actions">
                            <button
                              type="button"
                              className="action-pill action-pill--small"
                              onClick={() => openEditItem(item)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="action-pill action-pill--small"
                              onClick={() => handleToggleItemStatus(item)}
                            >
                              {item.isActive ? 'Archive' : 'Restore'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────── */}
      <CategoryModal
        isOpen={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        onSave={handleCreateCategory}
      />
      <MenuItemModal
        isOpen={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        onSave={handleSaveItem}
        item={editingItem}
        categories={categories}
      />
      {confirmRemoveCat && (
        <div
          className="modal-overlay"
          onClick={() => !removingCat && setConfirmRemoveCat(null)}
        >
          <div
            className="modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-remove-category-title"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="editorial-eyebrow">Category Removal</span>
            <h2 id="confirm-remove-category-title" className="modal-title">
              Remove &ldquo;{confirmRemoveCat.name}&rdquo;?
            </h2>
            <p className="owner-subtitle" style={{ marginBottom: '1.5rem' }}>
              Empty categories are permanently deleted. Categories with archived items are
              deactivated and can be restored later. Categories with active items cannot be
              removed.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="quiet-button"
                onClick={() => setConfirmRemoveCat(null)}
                disabled={removingCat}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handleConfirmRemoveCategory}
                disabled={removingCat}
                autoFocus
              >
                {removingCat ? 'Removing…' : 'Remove Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
