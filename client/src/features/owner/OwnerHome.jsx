import { useState } from 'react'
import { useAuth } from '../../context/useAuth.js'
import { PinPadModal } from '../auth/PinPadModal.jsx'

export function OwnerHome() {
  const { session, logout, lockScreen, switchStaff, updatePin, shiftRemainingFormatted } = useAuth()
  const [isPinModalOpen, setIsPinModalOpen] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [pinFeedback, setPinFeedback] = useState('')
  const [isUpdatingPin, setIsUpdatingPin] = useState(false)

  async function handleSetPin(e) {
    e.preventDefault()
    if (!/^\d{4,6}$/.test(newPin.trim())) {
      setPinFeedback('PIN must be 4 to 6 numbers.')
      return
    }

    setIsUpdatingPin(true)
    setPinFeedback('')
    try {
      await updatePin(newPin.trim())
      setPinFeedback('Your 4-6 digit quick PIN is updated!')
      setNewPin('')
    } catch (err) {
      setPinFeedback(err.message || 'Failed to update PIN.')
    } finally {
      setIsUpdatingPin(false)
    }
  }

  return (
    <main className="owner-shell">
      <section className="owner-card">
        <div className="owner-header-bar">
          <p className="owner-eyebrow">Owner Workspace</p>
          <div className="terminal-actions">
            <button
              className="action-pill"
              type="button"
              onClick={() => setIsPinModalOpen(true)}
              title="Quick-switch shift operator without logging out master terminal"
            >
              🔄 Switch Staff (PIN)
            </button>
            <button
              className="action-pill lock-pill"
              type="button"
              onClick={lockScreen}
              title="Lock terminal screen immediately"
            >
              🔒 Lock Terminal
            </button>
          </div>
        </div>

        <h1>Hello, {session?.staff?.fullName}.</h1>
        <p>
          Your terminal session is active with proactive refresh and idle auto-lock enabled.
          Floor staff can switch shifts instantly using their 4-digit PIN.
        </p>

        <div className="owner-session" aria-label="Current session details">
          <div>
            <span>Active Staff Operator</span>
            <strong>{session?.staff?.fullName}</strong>
          </div>
          <div>
            <span>Role Permission</span>
            <strong className="role-tag">{session?.staff?.role?.toUpperCase()}</strong>
          </div>
          <div>
            <span>Account Email</span>
            <strong>{session?.user?.email || 'Terminal Staff'}</strong>
          </div>
          <div>
            <span>6-Hour Shift Lifespan</span>
            <strong style={{ color: 'var(--tomato)' }}>
              {shiftRemainingFormatted || 'Shift In Progress'}
            </strong>
          </div>
        </div>

        {/* Quick PIN configuration box */}
        <div className="pin-settings-box">
          <h3>Set / Change Your Quick Switch PIN</h3>
          <p className="login-intro">
            Set a 4 to 6 digit numeric code for 1-tap shift switching on this terminal.
          </p>
          <form className="pin-inline-form" onSubmit={handleSetPin}>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="e.g. 1234"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              required
            />
            <button
              type="submit"
              className="primary-button pin-save-btn"
              disabled={isUpdatingPin || newPin.length < 4}
            >
              {isUpdatingPin ? 'Saving…' : 'Save PIN'}
            </button>
          </form>
          {pinFeedback && <p className="pin-feedback">{pinFeedback}</p>}
        </div>

        <div className="owner-actions">
          <button className="quiet-button" type="button" onClick={logout}>
            Sign out of terminal
          </button>
        </div>
      </section>

      {/* PIN Shift Switch Modal */}
      <PinPadModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        activeStaffId={session?.staff?.id}
        onSwitchSuccess={switchStaff}
      />
    </main>
  )
}
