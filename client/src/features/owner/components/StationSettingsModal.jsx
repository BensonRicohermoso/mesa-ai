import { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { PasswordInput } from '../../../shared/components/PasswordInput.jsx'
import { getStaff, updateStaff } from '../../../shared/api/staffApi.js'

// ─── My PIN sub-form ────────────────────────────────────────────────────────
function MyPinSection({ updatePin }) {
  const [pin, setPin] = useState('')
  const [status, setStatus] = useState(null) // { ok: bool, msg: string }
  const [busy, setBusy] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    if (!/^\d{4}$/.test(pin.trim())) {
      setStatus({ ok: false, msg: 'PIN must be exactly 4 numeric digits.' })
      return
    }
    setBusy(true)
    setStatus(null)
    try {
      await updatePin(pin.trim())
      setPin('')
      setStatus({ ok: true, msg: 'PIN updated successfully.' })
    } catch (err) {
      setStatus({ ok: false, msg: err.message || 'Failed to update PIN.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="station-section">
      <span className="editorial-eyebrow">My Quick-Switch PIN</span>
      <p className="login-intro" style={{ margin: '0.3rem 0 0.9rem' }}>
        Your personal 4-digit PIN used to unlock the terminal or switch operator.
      </p>
      <form className="pin-inline-form" onSubmit={handleSave}>
        <PasswordInput
          inputMode="numeric"
          maxLength={4}
          placeholder="New PIN"
          toggleLabel="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          required
        />
        <button
          type="submit"
          className="primary-button pin-save-btn"
          disabled={busy || pin.length !== 4}
        >
          {busy ? 'Saving…' : 'Save PIN'}
        </button>
      </form>
      {status && (
        <p className={`pin-feedback ${status.ok ? 'pin-feedback--ok' : 'pin-feedback--err'}`}>
          {status.msg}
        </p>
      )}
    </div>
  )
}

MyPinSection.propTypes = {
  updatePin: PropTypes.func.isRequired,
}

// ─── Admin set-PIN-for-any-staff sub-section ────────────────────────────────
function AdminPinSection() {
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [pin, setPin] = useState('')
  const [clearPin, setClearPin] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null)

  const loadStaff = useCallback(async () => {
    try {
      const res = await getStaff()
      const list = (res.staff || []).filter((s) => s.isActive)
      setStaffList(list)
      if (list.length > 0 && !selectedId) setSelectedId(list[0].id)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [selectedId])

  useEffect(() => {
    loadStaff()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset pin fields when staff selection changes
  useEffect(() => {
    setPin('')
    setClearPin(false)
    setStatus(null)
  }, [selectedId])

  const selectedMember = staffList.find((s) => s.id === selectedId)

  async function handleSave(e) {
    e.preventDefault()
    if (!selectedId) return

    if (!clearPin && !/^\d{4}$/.test(pin.trim())) {
      setStatus({ ok: false, msg: 'PIN must be exactly 4 numeric digits.' })
      return
    }

    setBusy(true)
    setStatus(null)
    try {
      await updateStaff(selectedId, { pinCode: clearPin ? null : pin.trim() })
      setPin('')
      setClearPin(false)
      setStatus({
        ok: true,
        msg: clearPin
          ? `PIN cleared for ${selectedMember?.fullName}.`
          : `PIN set for ${selectedMember?.fullName}.`,
      })
      await loadStaff()
    } catch (err) {
      setStatus({ ok: false, msg: err.message || 'Failed to update PIN.' })
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="login-intro">Loading staff roster…</p>
  if (staffList.length === 0) return <p className="login-intro">No active staff found.</p>

  return (
    <div className="station-section">
      <span className="editorial-eyebrow">Set PIN for Staff</span>
      <p className="login-intro" style={{ margin: '0.3rem 0 0.9rem' }}>
        As an admin you can assign or clear the quick-switch PIN for any active staff member.
      </p>

      <form className="admin-pin-form" onSubmit={handleSave}>
        {/* Staff selector */}
        <div className="admin-pin-staff-row">
          <select
            className="form-input"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={busy}
            aria-label="Select staff member"
          >
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName} ({s.role}){s.hasPin ? ' ✓' : ' —'}
              </option>
            ))}
          </select>

          {selectedMember && (
            <span className={`staff-pin-badge ${selectedMember.hasPin ? 'staff-pin-badge--set' : ''}`}>
              {selectedMember.hasPin ? 'PIN Set' : 'No PIN'}
            </span>
          )}
        </div>

        {/* PIN input + clear toggle */}
        <div className="admin-pin-input-row">
          <PasswordInput
            inputMode="numeric"
            maxLength={4}
            placeholder={clearPin ? '(will be cleared)' : 'New 4-digit PIN'}
            toggleLabel="PIN"
            value={clearPin ? '' : pin}
            onChange={(e) => {
              setClearPin(false)
              setPin(e.target.value.replace(/\D/g, '').slice(0, 4))
            }}
            disabled={clearPin || busy}
          />

          {selectedMember?.hasPin && (
            <button
              type="button"
              className="quiet-link"
              onClick={() => {
                setClearPin((p) => !p)
                setPin('')
              }}
            >
              {clearPin ? 'Assign new PIN instead' : 'Clear existing PIN'}
            </button>
          )}
        </div>

        <button
          type="submit"
          className="primary-button pin-save-btn"
          disabled={busy || (!clearPin && pin.length !== 4)}
        >
          {busy ? 'Saving…' : clearPin ? 'Clear PIN' : 'Set PIN'}
        </button>
      </form>

      {status && (
        <p className={`pin-feedback ${status.ok ? 'pin-feedback--ok' : 'pin-feedback--err'}`}>
          {status.msg}
        </p>
      )}
    </div>
  )
}

// ─── Main modal ──────────────────────────────────────────────────────────────
export function StationSettingsModal({
  isOpen,
  onClose,
  session,
  logout,
  updatePin,
  shiftRemainingFormatted,
}) {
  const [busy, setBusy] = useState(false)

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) return undefined
    function handleKey(e) {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, busy, onClose])

  if (!isOpen) return null

  const isAdmin = session?.staff?.role === 'admin'

  async function handleLogout() {
    setBusy(true)
    onClose()
    await logout()
  }

  return (
    <div
      className="modal-overlay"
      onClick={() => !busy && onClose()}
    >
      <div
        className="modal-dialog modal-dialog--wide station-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="station-settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="station-modal-header">
          <div>
            <span className="editorial-eyebrow">Station &amp; Identity</span>
            <h2 id="station-settings-title" className="modal-title">Station Settings</h2>
          </div>
          <button
            className="quiet-button station-close-btn"
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Session info grid */}
        <div className="owner-session" aria-label="Current terminal session metrics">
          <div>
            <span>Active Operator</span>
            <strong>{session?.staff?.fullName}</strong>
          </div>
          <div>
            <span>Floor Role</span>
            <span className="role-badge">{session?.staff?.role}</span>
          </div>
          <div>
            <span>Account</span>
            <strong style={{ fontSize: '0.95rem', wordBreak: 'break-all' }}>
              {session?.user?.email || 'Floor Terminal'}
            </strong>
          </div>
          <div>
            <span>Shift Remaining</span>
            <strong style={{ fontStyle: 'italic' }}>
              {shiftRemainingFormatted || 'Shift In Progress'}
            </strong>
          </div>
        </div>

        {/* Divider */}
        <div className="station-divider" />

        {/* My PIN */}
        <MyPinSection updatePin={updatePin} />

        {/* Admin: set PIN for other staff */}
        {isAdmin && (
          <>
            <div className="station-divider" />
            <AdminPinSection />
          </>
        )}

        {/* Actions */}
        <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
          <button
            className="quiet-button"
            type="button"
            onClick={handleLogout}
            disabled={busy}
          >
            Sign out of station shift &rarr;
          </button>
          <button
            className="action-pill"
            type="button"
            onClick={onClose}
            disabled={busy}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

StationSettingsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  session: PropTypes.object,
  logout: PropTypes.func.isRequired,
  updatePin: PropTypes.func.isRequired,
  shiftRemainingFormatted: PropTypes.string,
}
