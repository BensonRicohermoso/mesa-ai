import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import { getActiveStaffList } from './authClient.js'

export function PinPadModal({ isOpen, onClose, onSwitchSuccess, activeStaffId }) {
  const [pin, setPin] = useState('')
  const [staffList, setStaffList] = useState([])
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    let isCurrent = true
    getActiveStaffList()
      .then((list) => {
        if (!isCurrent) return
        setStaffList(list)
        const current = list.find((s) => s.id === activeStaffId) || list[0]
        setSelectedStaff(current)
      })
      .catch(() => {})

    return () => {
      isCurrent = false
    }
  }, [isOpen, activeStaffId])

  if (!isOpen) return null

  function handleDigit(digit) {
    if (pin.length < 4) {
      const nextPin = pin + digit
      setPin(nextPin)
      setError('')
      // Auto-submit when all 4 digits are punched in
      if (nextPin.length === 4) {
        submitPin(nextPin)
      }
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

  async function submitPin(pinToVerify) {
    setIsSubmitting(true)
    setError('')
    try {
      await onSwitchSuccess(pinToVerify, selectedStaff?.id || null)
      onClose()
    } catch (err) {
      setError(err.message || 'Incorrect PIN')
      setPin('')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleSubmit(e) {
    if (e) e.preventDefault()
    if (pin.length !== 4) {
      setError('Please enter a 4-digit PIN.')
      return
    }
    submitPin(pin)
  }

  return (
    <div className="pin-overlay" role="dialog" aria-modal="true" aria-labelledby="pin-title">
      <div className="pin-card">
        <header className="pin-header">
          <div>
            <span className="owner-eyebrow">Quick Shift Switch</span>
            <h2 id="pin-title">Enter Staff PIN</h2>
          </div>
          <button className="quiet-button pin-close" type="button" onClick={onClose}>
            ✕ Cancel
          </button>
        </header>

        {/* Staff selector tabs */}
        {staffList.length > 0 && (
          <div className="staff-selector" role="radiogroup" aria-label="Select staff member">
            {staffList.map((staff) => (
              <button
                key={staff.id}
                type="button"
                className={`staff-chip ${selectedStaff?.id === staff.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedStaff(staff)
                  setPin('')
                  setError('')
                }}
              >
                <strong>{staff.fullName}</strong>
                <span>{staff.role}</span>
              </button>
            ))}
          </div>
        )}

        {/* Exactly 4 PIN Dots indicator */}
        <div className="pin-display" aria-label="PIN digits entered">
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              className={`pin-dot ${index < pin.length ? 'filled' : ''}`}
            />
          ))}
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}

        {/* Tactile POS Numpad */}
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
            title="Clear PIN"
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
          onClick={handleSubmit}
        >
          {isSubmitting ? 'Verifying PIN…' : `Switch to ${selectedStaff?.fullName || 'Staff'}`}
        </button>
      </div>
    </div>
  )
}

PinPadModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSwitchSuccess: PropTypes.func.isRequired,
  activeStaffId: PropTypes.string,
}
