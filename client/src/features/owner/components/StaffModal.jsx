import { useState } from 'react'
import PropTypes from 'prop-types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin — Owner & Management' },
  { value: 'cashier', label: 'Cashier — POS & Payments' },
  { value: 'kitchen', label: 'Kitchen — Kitchen Display System' },
]

function StaffModalForm({ onClose, onSave, staff }) {
  const isEditing = Boolean(staff)
  const isProtectedAdmin = Boolean(staff?.isLastActiveAdmin)

  const [fullName, setFullName] = useState(staff?.fullName || '')
  const [email, setEmail] = useState(staff?.email || '')
  const [role, setRole] = useState(staff?.role || 'cashier')
  const [password, setPassword] = useState('')
  const [pinCode, setPinCode] = useState('')
  const [clearPin, setClearPin] = useState(false)
  const [isActive, setIsActive] = useState(staff ? staff.isActive !== false : true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()

    const trimmedName = fullName.trim()
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedPin = pinCode.trim()

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      setError('Staff name must be between 2 and 100 characters.')
      return
    }

    if (!isEditing && !EMAIL_RE.test(trimmedEmail)) {
      setError('Please enter a valid email address.')
      return
    }

    if (!isEditing && password.length < 6) {
      setError('Initial password must be at least 6 characters.')
      return
    }

    if (isEditing && password && password.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }

    if (!clearPin && trimmedPin && !/^\d{4}$/.test(trimmedPin)) {
      setError('Quick-switch PIN must be exactly 4 numeric digits.')
      return
    }

    setSaving(true)
    setError('')

    try {
      if (isEditing) {
        const payload = {
          fullName: trimmedName,
          role,
          isActive,
        }
        if (password) {
          payload.password = password
        }
        if (clearPin) {
          payload.pinCode = null
        } else if (trimmedPin) {
          payload.pinCode = trimmedPin
        }
        await onSave(payload)
      } else {
        await onSave({
          fullName: trimmedName,
          email: trimmedEmail,
          password,
          role,
          pinCode: trimmedPin || null,
          isActive,
        })
      }
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save staff account.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog modal-dialog--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="editorial-eyebrow">Staff Atelier Configuration</span>
        <h2 id="staff-modal-title" className="modal-title">
          {isEditing ? 'Edit Staff Account' : 'Provision Staff Account'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="staff-name-input">
                FULL NAME
              </label>
              <input
                id="staff-name-input"
                type="text"
                className="form-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Maria Santos"
                maxLength={100}
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="staff-role-select">
                FLOOR ROLE
              </label>
              <select
                id="staff-role-select"
                className="form-input"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={isProtectedAdmin}
                required
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {isProtectedAdmin && (
                <p className="form-hint">
                  Sole active administrator cannot be demoted.
                </p>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="staff-email-input">
              EMAIL ADDRESS
            </label>
            <input
              id="staff-email-input"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cashier@restaurant.com"
              disabled={isEditing}
              required={!isEditing}
            />
            {isEditing && (
              <p className="form-hint">
                Login email is bound to the staff authentication identity.
              </p>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="staff-password-input">
                {isEditing ? 'NEW PASSWORD (OPTIONAL)' : 'MASTER PASSWORD'}
              </label>
              <input
                id="staff-password-input"
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEditing ? 'Leave blank to keep current' : 'Minimum 6 characters'}
                minLength={isEditing && !password ? undefined : 6}
                maxLength={128}
                required={!isEditing}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="staff-pin-input">
                4-DIGIT TERMINAL PIN {isEditing ? '(OPTIONAL)' : '(OPTIONAL)'}
              </label>
              <input
                id="staff-pin-input"
                type="password"
                inputMode="numeric"
                className="form-input"
                value={clearPin ? '' : pinCode}
                onChange={(e) => {
                  setClearPin(false)
                  setPinCode(e.target.value.replace(/\D/g, '').slice(0, 4))
                }}
                placeholder={
                  isEditing && staff?.hasPin
                    ? '•••• (blank keeps existing)'
                    : 'e.g. 2222'
                }
                maxLength={4}
                disabled={clearPin}
              />
              {isEditing && staff?.hasPin && (
                <div className="staff-pin-row">
                  <button
                    type="button"
                    className="quiet-link"
                    onClick={() => {
                      setClearPin((prev) => !prev)
                      setPinCode('')
                    }}
                  >
                    {clearPin ? 'Keep Existing PIN' : 'Clear Saved PIN'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="form-group form-group--inline">
            <span className="form-label" style={{ marginBottom: 0 }}>
              ACCOUNT STATUS
            </span>
            <button
              type="button"
              className={`stock-toggle ${isActive ? 'stock-toggle--in' : 'stock-toggle--out'}`}
              onClick={() => setIsActive((prev) => !prev)}
              disabled={isProtectedAdmin}
            >
              {isActive ? '● ACTIVE' : '○ INACTIVE'}
            </button>
            {isProtectedAdmin && (
              <span className="staff-protected-note">
                Protected · Sole Active Admin
              </span>
            )}
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="quiet-button" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? 'Saving…' : isEditing ? 'Update Staff' : 'Provision Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

StaffModalForm.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  staff: PropTypes.object,
}

export function StaffModal({ isOpen, onClose, onSave, staff }) {
  if (!isOpen) return null
  return (
    <StaffModalForm
      key={staff?.id || 'new'}
      onClose={onClose}
      onSave={onSave}
      staff={staff}
    />
  )
}

StaffModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  staff: PropTypes.object,
}
