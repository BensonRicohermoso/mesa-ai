import { useState, useEffect, useCallback } from 'react'
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

  // Filters
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  const [showArchived, setShowArchived] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Modals
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

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

  // ── Filtering ──────────────────────────────────────────────────────────────
  const activeCategories = categories.filter((c) => c.isActive)

  const filteredItems = items.filter((item) => {
    // Active / Archived filter
    if (showArchived) {
      if (item.isActive) return false
    } else {
      if (!item.isActive) return false
    }
    // Category filter
    if (selectedCategoryId && item.categoryId !== selectedCategoryId) return false
    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (
        !item.name.toLowerCase().includes(q) &&
        !(item.description || '').toLowerCase().includes(q)
      )
        return false
    }
    return true
  })

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
      await updateCategory(editingCategory.id, data)
    } else {
      await createCategory(data)
    }
    await loadData()
  }

  async function handleToggleCategoryStatus(cat) {
    try {
      await setCategoryStatus(cat.id, !cat.isActive)
      await loadData()
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
      await updateMenuItem(editingItem.id, data)
    } else {
      await createMenuItem(data)
    }
    await loadData()
  }

  async function handleToggleAvailability(item) {
    try {
      await setItemAvailability(item.id, !item.isAvailable)
      await loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleToggleItemStatus(item) {
    try {
      await setItemActiveStatus(item.id, !item.isActive)
      await loadData()
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

      <div className="menu-mgmt-layout">
        {/* ── Left: Categories Panel ─────────────────────────────────── */}
        <aside className="menu-categories-panel">
          <div className="panel-header">
            <span className="editorial-eyebrow">Categories</span>
            <button className="action-pill action-pill--small" onClick={openNewCategory}>
              + New
            </button>
          </div>

          <ul className="category-list">
            <li>
              <button
                className={`category-item ${!selectedCategoryId ? 'category-item--active' : ''}`}
                onClick={() => setSelectedCategoryId(null)}
              >
                All Items ({items.filter((i) => (showArchived ? !i.isActive : i.isActive)).length})
              </button>
            </li>
            {categories.map((cat) => (
              <li key={cat.id}>
                <button
                  className={`category-item ${selectedCategoryId === cat.id ? 'category-item--active' : ''} ${!cat.isActive ? 'category-item--inactive' : ''}`}
                  onClick={() => setSelectedCategoryId(cat.id)}
                >
                  <span>
                    {cat.name}
                    {!cat.isActive && <em className="inactive-label"> (Archived)</em>}
                  </span>
                  <span className="category-count">{cat.itemCount}</span>
                </button>
                <div className="category-actions">
                  <button className="quiet-link" onClick={() => openEditCategory(cat)}>
                    Edit
                  </button>
                  <button
                    className="quiet-link"
                    onClick={() => handleToggleCategoryStatus(cat)}
                  >
                    {cat.isActive ? 'Archive' : 'Restore'}
                  </button>
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
                  className={`segment-btn ${!showArchived ? 'segment-btn--active' : ''}`}
                  onClick={() => setShowArchived(false)}
                >
                  Active ({items.filter((i) => i.isActive).length})
                </button>
                <button
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
              <button className="action-pill" onClick={openNewItem}>
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
                  <article key={item.id} className={`item-card ${!item.isActive ? 'item-card--archived' : ''}`}>
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
                        className={`stock-toggle ${item.isAvailable ? 'stock-toggle--in' : 'stock-toggle--out'}`}
                        onClick={() => handleToggleAvailability(item)}
                        disabled={!item.isActive}
                        title={item.isAvailable ? 'Mark as sold out' : 'Mark as in stock'}
                      >
                        {item.isAvailable ? '● IN STOCK' : '○ SOLD OUT'}
                      </button>

                      <div className="item-actions">
                        <button className="action-pill action-pill--small" onClick={() => openEditItem(item)}>
                          Edit
                        </button>
                        <button
                          className="action-pill action-pill--small"
                          onClick={() => handleToggleItemStatus(item)}
                        >
                          {item.isActive ? 'Archive' : 'Restore'}
                        </button>
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
        categories={activeCategories}
      />
    </div>
  )
}
