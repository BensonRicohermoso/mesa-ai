import { useState, useEffect, useCallback } from 'react'
import { TwinOrbit } from '../../../shared/components/TwinOrbit.jsx'
import { useAuth } from '../../../context/useAuth.js'
import {
  getStaff,
  createStaff,
  updateStaff,
  setStaffStatus,
} from '../../../shared/api/staffApi.js'
import { StaffModal } from './StaffModal.jsx'

export function StaffManagement() {
  const { staff: currentOperator, logout } = useAuth()
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [togglingId, setTogglingId] = useState(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)

  const loadStaff = useCallback(async () => {
    try {
      const res = await getStaff()
      setStaffList(res.staff || [])
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to load staff roster.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    getStaff()
      .then((res) => {
        if (!mounted) return
        setStaffList(res.staff || [])
        setError('')
      })
      .catch((err) => {
        if (!mounted) return
        setError(err.message || 'Failed to load staff roster.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const activeStaff = staffList.filter((m) => m.isActive)
  const inactiveStaff = staffList.filter((m) => !m.isActive)

  const filteredStaff = staffList.filter((member) => {
    if (statusFilter === 'active' && !member.isActive) return false
    if (statusFilter === 'inactive' && member.isActive) return false
    if (roleFilter !== 'all' && member.role !== roleFilter) return false

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchesName = member.fullName.toLowerCase().includes(q)
      const matchesEmail = (member.email || '').toLowerCase().includes(q)
      const matchesRole = member.role.toLowerCase().includes(q)
      if (!matchesName && !matchesEmail && !matchesRole) return false
    }
    return true
  })

  function openNewStaff() {
    setEditingStaff(null)
    setModalOpen(true)
  }

  function openEditStaff(member) {
    setEditingStaff(member)
    setModalOpen(true)
  }

  async function handleSaveStaff(data) {
    if (editingStaff) {
      await updateStaff(editingStaff.id, data)

      // If the admin just deactivated or demoted themselves, the session is
      // now invalid (subsequent admin-only API calls will 403). Sign out
      // cleanly instead of leaving a broken UI.
      const isSelf = currentOperator?.id === editingStaff.id
      if (isSelf) {
        const demotedSelf = data.role !== undefined && data.role !== 'admin'
        const deactivatedSelf = data.isActive === false
        if (demotedSelf || deactivatedSelf) {
          await logout()
          return
        }
      }
    } else {
      await createStaff(data)
    }
    await loadStaff()
  }

  async function handleToggleStatus(member) {
    if (member.isLastActiveAdmin && member.isActive) return
    setTogglingId(member.id)
    try {
      setError('')
      await setStaffStatus(member.id, !member.isActive)

      // If the admin just deactivated themselves, sign out cleanly
      const isSelf = currentOperator?.id === member.id
      if (isSelf && member.isActive) {
        // Was active, now toggled to inactive
        await logout()
        return
      }

      await loadStaff()
    } catch (err) {
      setError(err.message || 'Failed to update staff status.')
    } finally {
      setTogglingId(null)
    }
  }

  if (loading) {
    return (
      <div className="mgmt-loading">
        <TwinOrbit size="1.1rem" label="Loading staff roster" />
      </div>
    )
  }

  return (
    <div className="staff-mgmt">
      {error && <p className="mgmt-error">{error}</p>}

      <div className="panel-header table-toolbar">
        <div className="panel-header-left">
          <span className="editorial-eyebrow" style={{ marginBottom: 0 }}>
            Staff Atelier
          </span>
          <div className="segment-toggle">
            <button
              type="button"
              className={`segment-btn ${statusFilter === 'all' ? 'segment-btn--active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All ({staffList.length})
            </button>
            <button
              type="button"
              className={`segment-btn ${statusFilter === 'active' ? 'segment-btn--active' : ''}`}
              onClick={() => setStatusFilter('active')}
            >
              Active ({activeStaff.length})
            </button>
            <button
              type="button"
              className={`segment-btn ${statusFilter === 'inactive' ? 'segment-btn--active' : ''}`}
              onClick={() => setStatusFilter('inactive')}
            >
              Inactive ({inactiveStaff.length})
            </button>
          </div>
        </div>

        <div className="panel-header-right">
          <select
            className="search-input role-filter-select"
            aria-label="Filter by role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="cashier">Cashier</option>
            <option value="kitchen">Kitchen</option>
          </select>
          <input
            type="text"
            className="search-input"
            placeholder="Search name or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            type="button"
            className="action-pill action-pill--solid"
            onClick={openNewStaff}
          >
            + Provision Staff
          </button>
        </div>
      </div>

      {filteredStaff.length === 0 ? (
        <div className="mgmt-empty">
          <p>
            {searchQuery || roleFilter !== 'all'
              ? 'No staff members match your filter.'
              : statusFilter === 'inactive'
                ? 'No inactive staff accounts.'
                : 'No staff accounts provisioned yet.'}
          </p>
        </div>
      ) : (
        <div className="editorial-table-wrap">
          <table className="editorial-table">
            <thead>
              <tr>
                <th>Staff Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>PIN Code</th>
                <th>Status</th>
                <th className="editorial-table-actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((member) => {
                const isSelf = currentOperator?.id === member.id
                const isProtected = member.isLastActiveAdmin && member.isActive
                return (
                  <tr
                    key={member.id}
                    className={!member.isActive ? 'editorial-row--inactive' : ''}
                  >
                    <td>
                      <div className="staff-name-cell">
                        <span className="table-label-text">{member.fullName}</span>
                        {isSelf && <span className="staff-self-tag">You</span>}
                      </div>
                    </td>
                    <td>
                      <span className="staff-email-text">{member.email || '—'}</span>
                    </td>
                    <td>
                      <span className="role-badge">{member.role}</span>
                    </td>
                    <td>
                      <span
                        className={`staff-pin-status ${member.hasPin ? 'staff-pin-status--set' : ''}`}
                      >
                        {member.hasPin ? 'Set (••••)' : 'Not Set'}
                      </span>
                    </td>
                    <td>
                      <div className="staff-status-cell">
                        <button
                          type="button"
                          className={`stock-toggle ${member.isActive ? 'stock-toggle--in' : 'stock-toggle--out'}`}
                          onClick={() => handleToggleStatus(member)}
                          disabled={isProtected || togglingId === member.id}
                          title={
                            isProtected
                              ? 'Cannot deactivate the sole active administrator'
                              : member.isActive
                                ? 'Deactivate staff account'
                                : 'Activate staff account'
                          }
                        >
                          {member.isActive ? '● ACTIVE' : '○ INACTIVE'}
                        </button>
                        {isProtected && (
                          <span className="staff-protected-note">
                            Protected · Sole Admin
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="editorial-table-actions-col">
                      <div className="item-actions item-actions--end">
                        <button
                          type="button"
                          className="action-pill action-pill--small"
                          onClick={() => openEditStaff(member)}
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

      <StaffModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveStaff}
        staff={editingStaff}
      />
    </div>
  )
}
