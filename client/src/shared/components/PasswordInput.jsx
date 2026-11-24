import { useState } from 'react'
import PropTypes from 'prop-types'

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.77 21.77 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a21.8 21.8 0 0 1-3.17 4.35" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

EyeIcon.propTypes = {
  open: PropTypes.bool.isRequired,
}

export function PasswordInput({
  className = '',
  disabled = false,
  toggleLabel = 'password',
  wrapperClassName = '',
  ...inputProps
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className={`password-field ${wrapperClassName}`.trim()}>
      <input
        {...inputProps}
        disabled={disabled}
        type={visible ? 'text' : 'password'}
        className={`password-input ${className}`.trim()}
      />
      <button
        type="button"
        className="password-toggle-btn"
        onClick={() => setVisible((prev) => !prev)}
        disabled={disabled}
        aria-label={visible ? `Hide ${toggleLabel}` : `Show ${toggleLabel}`}
        aria-pressed={visible}
        title={visible ? `Hide ${toggleLabel}` : `Show ${toggleLabel}`}
      >
        <EyeIcon open={!visible} />
      </button>
    </div>
  )
}

PasswordInput.propTypes = {
  className: PropTypes.string,
  disabled: PropTypes.bool,
  toggleLabel: PropTypes.string,
  wrapperClassName: PropTypes.string,
}
