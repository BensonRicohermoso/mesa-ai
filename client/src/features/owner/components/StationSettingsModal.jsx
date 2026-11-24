import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { PasswordInput } from '../../../shared/components/PasswordInput.jsx'

export function StationSettingsModal({ isOpen, onClose, session, logout, updatePin, shiftRemainingFormatted }) {
  const [newPin, setNewPin] = useState('')
  const [pinFeedback, setPinFeedback] = useState('')
  const [isUpdatingPin, setIsUpdatingPin] = useState(false)
  const [lastOpenState, setLastOpenState] = useState(false)

  // Reset form state when modal transitions from closed -> open
  if (isOpen && !lastOpenState) {
    setNewPin('')
    setPinFeedback('')
  }
  if (isOpen !== lastOpenState) {
    setLastOpenState(isOpen)
  }

  useEffect(() => {
    if (!isOpen) return undefined
    function handleKeyDown(e) {
      if (e.key === 'Escape' && !isUpdatingPin) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isUpdatingPin, onClose])

  if (!isOpen) return null

  async function handleSetPin(e) {
    e.preventDefault()
    if (!/^\d{4}$/.test(newPin.trim())) {
      setPinFeedback('PIN must be exactly 4 numeric digits.')
      return
    }

    setIsUpdatingPin(true)
    setPinFeedback('')
    try {
      await updatePin(newPin.trim())
      setPinFeedback('Personal 4-digit shift PIN updated successfully.')
      setNewPin('')
    } catch (err) {
      setPinFeedback(err.message || 'Failed to update PIN.')
    } finally {
      setIsUpdatingPin(false)
    }
  }

  async function handleLogout() {
    onClose()
    await logout()
  }

  return (
    <div
      className="modal-overlay"
      onClick={() => !isUpdatingPin && onClose()}
    >
      <div
        className="modal-dialog modal-dialog--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="station-settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="editorial-eyebrow">Station &amp; Identity</span>
        <h2 id="station-settings-title" className="modal-title">Station Settings</h2>

        {/* Session Grid */}
        <div className="owner-session" aria-label="Current terminal session metrics">
          <div>
            <span>Active Operator</span>
            <strong>{session?.staff?.fullName}</strong>
          </div>
          <div>
            <span>Floor Role</span>
            <div>
              <span className="role-badge">{session?.staff?.role}</span>
            </div>
          </div>
          <div>
            <span>Account Identity</span>
            <strong style={{ fontSize: '1.05rem', wordBreak: 'break-all' }}>
              {session?.user?.email || 'Floor Terminal'}
            </strong>
          </div>
          <div>
            <span>Shift Lifespan</span>
            <strong style={{ fontStyle: 'italic' }}>
              {shiftRemainingFormatted || 'Shift In Progress'}
            </strong>
          </div>
        </div>

        {/* Quick PIN */}
        <div className="pin-settings-box" style={{ marginTop: '1.5rem' }}>
          <span className="editorial-eyebrow">Station Security</span>
          <h3>Quick-Switch Passcode</h3>
          <p className="login-intro" style={{ margin: '0.4rem 0 1rem' }}>
            Assign a personal 4-digit numeric PIN to transition between POS, KDS, and management views.
          </p>
          <form className="pin-inline-form" onSubmit={handleSetPin}>
            <PasswordInput
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              toggleLabel="PIN"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              required
            />
            <button
              type="submit"
              className="primary-button pin-save-btn"
              disabled={isUpdatingPin || newPin.length !== 4}
            >
              {isUpdatingPin ? 'Saving…' : 'Save PIN'}
            </button>
          </form>
          {pinFeedback && <p className="pin-feedback">{pinFeedback}</p>}
        </div>

        {/* Modal actions */}
        <div className="modal-actions">
          <button className="quiet-button" type="button" onClick={handleLogout}>
            Sign out of station shift &rarr;
          </button>
          <button className="action-pill" type="button" onClick={onClose} disabled={isUpdatingPin}>
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
