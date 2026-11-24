import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  getCategories,
  createCategory,
  updateCategory,
  setCategoryStatus,
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
  const [editingCategory, setEditingCategory] = useState(null)
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  function showNotice(msg) {
    setFeedback(msg)
    setTimeout(() => {
      setFeedback((prev) => (prev === msg ? '' : prev))
    }, 3500)
  }

  // ── Data Loading ───────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setError('')
      const [catRes, itemRes] = await Promise.all([
        getCategories(),
        getMenuItems(),
      ])
      setCategories(catRes.categories || [])
      setItems(itemRes.items || [])
    } catch (err) {
      setError(err.message || 'Failed to load menu data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

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
  function openNewCategory() {
    setEditingCategory(null)
    setCatModalOpen(true)
  }

  function openEditCategory(cat) {
    setEditingCategory(cat)
    setCatModalOpen(true)
  }

  async function handleSaveCategory(data) {
    if (editingCategory) {
      const updated = await updateCategory(editingCategory.id, data)
      setCategories((prev) =>
        prev
          .map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
          .sort((a, b) => a.sortOrder - b.sortOrder)
      )
      showNotice(`Category "${updated.name}" updated.`)
    } else {
      const created = await createCategory(data)
      setCategories((prev) =>
        [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder)
      )
      showNotice(`Category "${created.name}" created.`)
    }
  }

  async function handleToggleCategoryStatus(cat) {
    try {
      setError('')
      const updated = await setCategoryStatus(cat.id, !cat.isActive)
      setCategories((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
      )
      showNotice(
        `Category "${updated.name}" ${updated.isActive ? 'restored' : 'archived'}.`
      )
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleMoveCategory(index, direction) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= categories.length) return

    const current = categories[index]
    const adjacent = categories[targetIndex]

    // Ensure distinct sortOrder values even if both had the same number
    const nextCurrentOrder =
      adjacent.sortOrder !== current.sortOrder
        ? adjacent.sortOrder
        : Math.max(0, current.sortOrder + direction)
    const nextAdjacentOrder =
      adjacent.sortOrder !== current.sortOrder
        ? current.sortOrder
        : Math.max(0, adjacent.sortOrder - direction)

    try {
      setError('')
      const [u1, u2] = await Promise.all([
        updateCategory(current.id, { name: current.name, sortOrder: nextCurrentOrder }),
        updateCategory(adjacent.id, { name: adjacent.name, sortOrder: nextAdjacentOrder }),
      ])
      setCategories((prev) =>
        prev
          .map((c) => (c.id === u1.id ? { ...c, ...u1 } : c.id === u2.id ? { ...c, ...u2 } : c))
          .sort((a, b) => a.sortOrder - b.sortOrder)
      )
    } catch (err) {
      setError(err.message)
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
              onClick={openNewCategory}
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
            {categories.map((cat, idx) => (
              <li key={cat.id}>
                <button
                  type="button"
                  className={`category-item ${selectedCategoryId === cat.id ? 'category-item--active' : ''} ${!cat.isActive ? 'category-item--inactive' : ''}`}
                  onClick={() => setSelectedCategoryId(cat.id)}
                >
                  <span>
                    {cat.name}
                    {!cat.isActive && <em className="inactive-label"> (Archived)</em>}
                  </span>
                  <span className="category-count">{categoryCounts.get(cat.id) || 0}</span>
                </button>
                <div className="category-actions">
                  <button
                    type="button"
                    className="quiet-link"
                    onClick={() => openEditCategory(cat)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="quiet-link"
                    onClick={() => handleToggleCategoryStatus(cat)}
                  >
                    {cat.isActive ? 'Archive' : 'Restore'}
                  </button>
                  <span className="category-reorder">
                    <button
                      type="button"
                      className="quiet-link"
                      onClick={() => handleMoveCategory(idx, -1)}
                      disabled={idx === 0}
                      title="Move category up"
                      aria-label={`Move ${cat.name} up`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="quiet-link"
                      onClick={() => handleMoveCategory(idx, 1)}
                      disabled={idx === categories.length - 1}
                      title="Move category down"
                      aria-label={`Move ${cat.name} down`}
                    >
                      ↓
                    </button>
                  </span>
                </div>
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
              <button type="button" className="action-pill" onClick={openNewItem}>
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
        onSave={handleSaveCategory}
        category={editingCategory}
      />
      <MenuItemModal
        isOpen={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        onSave={handleSaveItem}
        item={editingItem}
        categories={categories}
      />
    </div>
  )
}
