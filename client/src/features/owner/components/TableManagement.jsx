import { useState, useEffect, useCallback } from 'react'
import { TwinOrbit } from '../../../shared/components/TwinOrbit.jsx'
import {
  getTables,
  createTable,
  updateTable,
  setTableStatus,
} from '../../../shared/api/tablesApi.js'
import { TableModal } from './TableModal.jsx'
import { PrintTableQrModal } from './PrintTableQrModal.jsx'

export function TableManagement() {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState(null)

  const [tableModalOpen, setTableModalOpen] = useState(false)
  const [editingTable, setEditingTable] = useState(null)

  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [printTargets, setPrintTargets] = useState([])
  const [printMode, setPrintMode] = useState('single')

  const loadTables = useCallback(async () => {
    try {
      const res = await getTables()
      setTables(res.tables || [])
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to load dining tables.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    getTables()
      .then((res) => {
        if (!mounted) return
        setTables(res.tables || [])
        setError('')
      })
      .catch((err) => {
        if (!mounted) return
        setError(err.message || 'Failed to load dining tables.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const activeTables = tables.filter((t) => t.isActive)
  const closedTables = tables.filter((t) => !t.isActive)

  const filteredTables = tables.filter((table) => {
    if (statusFilter === 'active' && !table.isActive) return false
    if (statusFilter === 'closed' && table.isActive) return false

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchesCode = table.tableCode.toLowerCase().includes(q)
      const matchesLabel = table.label.toLowerCase().includes(q)
      if (!matchesCode && !matchesLabel) return false
    }
    return true
  })

  function openNewTable() {
    setEditingTable(null)
    setTableModalOpen(true)
  }

  function openEditTable(table) {
    setEditingTable(table)
    setTableModalOpen(true)
  }

  async function handleSaveTable(data) {
    if (editingTable) {
      await updateTable(editingTable.id, data)
    } else {
      await createTable(data)
    }
    await loadTables()
  }

  async function handleToggleStatus(table) {
    try {
      setError('')
      await setTableStatus(table.id, !table.isActive)
      await loadTables()
    } catch (err) {
      setError(err.message || 'Failed to update table status.')
    }
  }

  function openSingleQr(table) {
    setPrintTargets([table])
    setPrintMode('single')
    setPrintModalOpen(true)
  }

  function openBatchPrint() {
    const targets = activeTables.length > 0 ? activeTables : tables
    if (targets.length === 0) return
    setPrintTargets(targets)
    setPrintMode('all')
    setPrintModalOpen(true)
  }

  async function handleCopyUrl(table) {
    const url = table.customerUrl || `${window.location.origin}/t/${table.tableCode}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(table.id)
      setTimeout(() => {
        setCopiedId((current) => (current === table.id ? null : current))
      }, 1800)
    } catch {
      setError(`Copy failed. Customer URL: ${url}`)
    }
  }

  if (loading) {
    return (
      <div className="mgmt-loading">
        <TwinOrbit size="1.1rem" label="Loading dining tables" />
      </div>
    )
  }

  return (
    <div className="table-mgmt">
      <div className="table-mgmt-content">
        {error && <p className="mgmt-error">{error}</p>}

        <div className="panel-header table-toolbar">
          <div className="panel-header-left">
            <span className="editorial-eyebrow" style={{ marginBottom: 0 }}>
              Table Directory
            </span>
            <div className="segment-toggle">
              <button
                type="button"
                className={`segment-btn ${statusFilter === 'all' ? 'segment-btn--active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                All ({tables.length})
              </button>
              <button
                type="button"
                className={`segment-btn ${statusFilter === 'active' ? 'segment-btn--active' : ''}`}
                onClick={() => setStatusFilter('active')}
              >
                Active ({activeTables.length})
              </button>
              <button
                type="button"
                className={`segment-btn ${statusFilter === 'closed' ? 'segment-btn--active' : ''}`}
                onClick={() => setStatusFilter('closed')}
              >
                Closed ({closedTables.length})
              </button>
            </div>
          </div>

          <div className="panel-header-right">
            <input
              type="text"
              className="search-input"
              placeholder="Search code or label…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="button"
              className="action-pill"
              onClick={openBatchPrint}
              disabled={tables.length === 0}
              title="Open print preview for all active table tent cards"
            >
              Print All Tent Cards
            </button>
            <button type="button" className="action-pill action-pill--solid" onClick={openNewTable}>
              + New Table
            </button>
          </div>
        </div>

        {filteredTables.length === 0 ? (
          <div className="mgmt-empty">
            <p>
              {searchQuery
                ? 'No dining tables match your search.'
                : statusFilter === 'closed'
                  ? 'No closed tables.'
                  : 'No dining tables configured yet. Create your first table.'}
            </p>
          </div>
        ) : (
          <div className="editorial-table-wrap">
            <table className="editorial-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Label</th>
                  <th>Customer URL</th>
                  <th>Dining State</th>
                  <th className="editorial-table-actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTables.map((table) => {
                  const customerUrl =
                    table.customerUrl || `${window.location.origin}/t/${table.tableCode}`
                  return (
                    <tr
                      key={table.id}
                      className={!table.isActive ? 'editorial-row--inactive' : ''}
                    >
                      <td>
                        <span className="table-code-pill">{table.tableCode}</span>
                      </td>
                      <td>
                        <span className="table-label-text">{table.label}</span>
                      </td>
                      <td>
                        <div className="table-url-cell">
                          <span className="table-url-text" title={customerUrl}>
                            {customerUrl}
                          </span>
                          <button
                            type="button"
                            className="quiet-link"
                            onClick={() => handleCopyUrl(table)}
                          >
                            {copiedId === table.id ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`stock-toggle ${table.isActive ? 'stock-toggle--in' : 'stock-toggle--out'}`}
                          onClick={() => handleToggleStatus(table)}
                          title={table.isActive ? 'Close table to new orders' : 'Activate table'}
                        >
                          {table.isActive ? '● ACTIVE' : '○ CLOSED'}
                        </button>
                      </td>
                      <td className="editorial-table-actions-col">
                        <div className="item-actions item-actions--end">
                          <button
                            type="button"
                            className="action-pill action-pill--small"
                            onClick={() => openSingleQr(table)}
                          >
                            View QR
                          </button>
                          <button
                            type="button"
                            className="action-pill action-pill--small"
                            onClick={() => openEditTable(table)}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TableModal
        isOpen={tableModalOpen}
        onClose={() => setTableModalOpen(false)}
        onSave={handleSaveTable}
        table={editingTable}
      />

      <PrintTableQrModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        tables={printTargets}
        mode={printMode}
      />
    </div>
  )
}
