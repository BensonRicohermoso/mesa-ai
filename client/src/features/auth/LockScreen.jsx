import PropTypes from 'prop-types'
import { useState } from 'react'

export function LockScreen({ staff, shiftRemainingFormatted, onUnlock, onSignOut }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleDigit(digit) {
    if (pin.length < 6) {
      setPin((prev) => prev + digit)
      setError('')
    }
  }

  function handleBackspace() {
    setPin((prev) => prev.slice(0, -1))
    setError('')
  }

  function handleClear() {
    setPin('')
    setError('')
  }

  async function handleUnlock() {
    if (pin.length < 4) {
      setError('Please enter your 4-to-6 digit PIN.')
      return
    }

    setIsSubmitting(true)
    setError('')
    try {
      await onUnlock(pin)
    } catch (err) {
      setError(err.message || 'Incorrect PIN')
      setPin('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="lock-shell" aria-labelledby="lock-title">
      <div className="lock-card">
        <div className="lock-badge">
          <span className="status-dot" aria-hidden="true" />
          <span>
            {shiftRemainingFormatted ? `Shift Active: ${shiftRemainingFormatted}` : 'Shift Active'}
          </span>
        </div>

        <h1 id="lock-title">Welcome back, {staff?.fullName || 'Staff'}.</h1>
        <p className="login-intro">
          Terminal is secured for this 6-hour shift. Enter your 4-digit PIN to resume your shift.
        </p>

        {/* PIN Dots */}
        <div className="pin-display" aria-label="PIN digits entered">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <span
              key={index}
              className={`pin-dot ${index < pin.length ? 'filled' : ''}`}
            />
          ))}
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}

        {/* Numpad */}
        <div className="pin-keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              className="keypad-btn"
              onClick={() => handleDigit(digit)}
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            className="keypad-btn action-btn"
            onClick={handleClear}
            title="Clear"
          >
            CLR
          </button>
          <button
            type="button"
            className="keypad-btn"
            onClick={() => handleDigit('0')}
          >
            0
          </button>
          <button
            type="button"
            className="keypad-btn action-btn"
            onClick={handleBackspace}
            title="Backspace"
          >
            ⌫
          </button>
        </div>

        <button
          className="primary-button pin-submit-btn"
          disabled={pin.length < 4 || isSubmitting}
          type="button"
          onClick={handleUnlock}
        >
          {isSubmitting ? 'Unlocking…' : 'Unlock Terminal'}
        </button>

        <div className="lock-footer">
          <button className="quiet-button" type="button" onClick={onSignOut}>
            End Shift / Sign Out with Password
          </button>
        </div>
      </div>
    </main>
  )
}

LockScreen.propTypes = {
  staff: PropTypes.shape({
    id: PropTypes.string,
    fullName: PropTypes.string,
    role: PropTypes.string,
  }),
  shiftRemainingFormatted: PropTypes.string,
  onUnlock: PropTypes.func.isRequired,
  onSignOut: PropTypes.func.isRequired,
}
