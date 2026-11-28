import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import { getActiveStaffList } from './authClient.js'

function PinPadModalContent({ onClose, onSwitchSuccess, activeStaffId }) {
  const [pin, setPin] = useState('')
  const [staffList, setStaffList] = useState([])
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let isCurrent = true
    getActiveStaffList()
      .then((list) => {
        if (!isCurrent) return
        setStaffList(list)
        const current = list.find((s) => s.id === activeStaffId) || list[0] || null
        setSelectedStaff(current)
      })
      .catch(() => {
        if (!isCurrent) return
        setLoadError('Could not load staff roster.')
      })
    return () => { isCurrent = false }
  }, [activeStaffId])

  useEffect(() => {
    function handleKeyDown(e) {
      if (isSubmitting) return
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'Backspace') { setPin((p) => p.slice(0, -1)); setError(''); return }
      if (/^\d$/.test(e.key)) pressDigit(e.key)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSubmitting, onClose]) // eslint-disable-line react-hooks/exhaustive-deps

  function pressDigit(digit) {
    if (isSubmitting) return
    setPin((prev) => {
      if (prev.length >= 4) return prev
      const next = prev + digit
      setError('')
      if (next.length === 4) submitPin(next)
      return next
    })
  }

  function handleBackspace() {
    if (isSubmitting) return
    setPin((p) => p.slice(0, -1))
    setError('')
  }

  function handleClear() {
    if (isSubmitting) return
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
      setError(err.message || 'Incorrect PIN. Please try again.')
      setPin('')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleSubmit() {
    if (pin.length !== 4) {
      setError('Please enter all 4 digits.')
      return
    }
    submitPin(pin)
  }

  const noPin = staffList.length > 0 && selectedStaff && !selectedStaff.hasPin

  return (
    <div
      className="pin-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-title"
      onClick={() => !isSubmitting && onClose()}
    >
      <div className="pin-card" onClick={(e) => e.stopPropagation()}>
        <header className="pin-header">
          <div>
            <span className="editorial-eyebrow">Quick Shift Switch</span>
            <h2 id="pin-title">Enter Staff PIN</h2>
          </div>
          <button
            className="quiet-button pin-close"
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cancel PIN entry"
          >
            ✕
          </button>
        </header>

        {/* Staff chips — only show when list has more than one person */}
        {loadError ? (
          <p className="form-error" role="alert">{loadError}</p>
        ) : staffList.length > 1 && (
          <div className="staff-selector" role="radiogroup" aria-label="Select staff member">
            {staffList.map((staff) => {
              const isSelected = selectedStaff?.id === staff.id
              return (
                <button
                  key={staff.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`staff-chip ${isSelected ? 'active' : ''} ${!staff.hasPin ? 'staff-chip--no-pin' : ''}`}
                  onClick={() => {
                    setSelectedStaff(staff)
                    setPin('')
                    setError('')
                  }}
                  disabled={isSubmitting}
                  title={!staff.hasPin ? 'No PIN set — cannot switch to this staff member' : undefined}
                >
                  <strong>{staff.fullName}</strong>
                  <span className="chip-role">{staff.role}</span>
                  {!staff.hasPin && <span className="chip-no-pin">No PIN</span>}
                </button>
              )
            })}
          </div>
        )}

        {/* Warning when selected staff has no PIN */}
        {noPin && (
          <p className="pin-no-pin-warning" role="alert">
            {selectedStaff.fullName} has no PIN set. Ask an admin to assign one in Station Settings.
          </p>
        )}

        {/* PIN dot display */}
        <div className="pin-display" aria-label={`${pin.length} of 4 PIN digits entered`}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />
          ))}
        </div>

        {error && <p className="form-error pin-error" role="alert">{error}</p>}

        {/* Numpad */}
        <div className="pin-keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              className="keypad-btn"
              onClick={() => pressDigit(digit)}
              disabled={isSubmitting || noPin}
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            className="keypad-btn action-btn"
            onClick={handleClear}
            disabled={isSubmitting || noPin}
            title="Clear"
          >
            CLR
          </button>
          <button
            type="button"
            className="keypad-btn"
            onClick={() => pressDigit('0')}
            disabled={isSubmitting || noPin}
          >
            0
          </button>
          <button
            type="button"
            className="keypad-btn action-btn"
            onClick={handleBackspace}
            disabled={isSubmitting || noPin}
            title="Backspace"
          >
            ⌫
          </button>
        </div>

        <button
          className="primary-button pin-submit-btn"
          disabled={pin.length < 4 || isSubmitting || noPin}
          type="button"
          onClick={handleSubmit}
        >
          {isSubmitting
            ? 'Verifying…'
            : selectedStaff
              ? `Switch to ${selectedStaff.fullName}`
              : 'Switch Operator'}
        </button>
      </div>
    </div>
  )
}

PinPadModalContent.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSwitchSuccess: PropTypes.func.isRequired,
  activeStaffId: PropTypes.string,
}

export function PinPadModal({ isOpen, onClose, onSwitchSuccess, activeStaffId }) {
  if (!isOpen) return null
  return (
    <PinPadModalContent
      key={activeStaffId}
      onClose={onClose}
      onSwitchSuccess={onSwitchSuccess}
      activeStaffId={activeStaffId}
    />
  )
}

PinPadModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSwitchSuccess: PropTypes.func.isRequired,
  activeStaffId: PropTypes.string,
}
