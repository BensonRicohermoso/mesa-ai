import { useState } from 'react'
import { useAuth } from '../../context/useAuth.js'
import { PinPadModal } from '../auth/PinPadModal.jsx'
import { MenuManagement } from './components/MenuManagement.jsx'
import { TableManagement } from './components/TableManagement.jsx'
import { StaffManagement } from './components/StaffManagement.jsx'
import './owner.css'

const TABS = [
  { key: 'overview', label: '01 · Overview' },
  { key: 'menu', label: '02 · Menu Atelier' },
  { key: 'tables', label: '03 · Table Suite' },
  { key: 'staff', label: '04 · Staff Roster' },
]

export function OwnerHome() {
  const { session, logout, lockScreen, switchStaff, updatePin, shiftRemainingFormatted } = useAuth()
  const [isPinModalOpen, setIsPinModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  // PIN settings state
  const [newPin, setNewPin] = useState('')
  const [pinFeedback, setPinFeedback] = useState('')
  const [isUpdatingPin, setIsUpdatingPin] = useState(false)

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

  return (
    <main className="owner-shell">
      <div className="owner-container">
        <section className="owner-card">
          {/* ── Header Bar ──────────────────────────────────────── */}
          <header className="owner-header-bar">
            <div>
              <span className="editorial-eyebrow">Executive Atelier &bull; Verified Station</span>
              <div className="brand" style={{ color: 'var(--black)', fontSize: '0.95rem' }}>
                MESA <span className="brand-script" style={{ color: 'var(--muted-gray)' }}>administration</span>
              </div>
            </div>

            <div className="terminal-actions">
              <button
                className="action-pill"
                type="button"
                onClick={() => setIsPinModalOpen(true)}
                title="Switch floor operator via 4-digit PIN"
              >
                Switch Operator (PIN)
              </button>
              <button
                className="action-pill"
                type="button"
                onClick={lockScreen}
                title="Lock terminal screen immediately"
              >
                Lock Station
              </button>
            </div>
          </header>

          {/* ── Tab Navigation ──────────────────────────────────── */}
          <nav className="owner-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className={`owner-tab ${activeTab === tab.key ? 'owner-tab--active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* ── Tab Content ─────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <>
              <h1>Welcome, {session?.staff?.fullName}.</h1>
              <p className="owner-subtitle">
                Station authenticated. All transactions, kitchen tickets, and analytics modules
                are synchronized. Operators may switch shifts rapidly with their 4-digit PIN.
              </p>

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
                  <strong style={{ color: 'var(--black)', fontStyle: 'italic' }}>
                    {shiftRemainingFormatted || 'Shift In Progress'}
                  </strong>
                </div>
              </div>

              {/* Quick PIN Passcode Configuration */}
              <div className="pin-settings-box">
                <span className="editorial-eyebrow">Station Security</span>
                <h3>Quick-Switch Passcode</h3>
                <p className="login-intro" style={{ margin: '0.4rem 0 1rem' }}>
                  Assign a personal 4-digit numeric PIN to transition between POS, KDS, and management views.
                </p>
                <form className="pin-inline-form" onSubmit={handleSetPin}>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="••••"
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

              <footer className="owner-actions">
                <button className="quiet-button" type="button" onClick={logout}>
                  Sign out of station shift &rarr;
                </button>
              </footer>
            </>
          )}

          {activeTab === 'menu' && <MenuManagement />}
          {activeTab === 'tables' && <TableManagement />}
          {activeTab === 'staff' && <StaffManagement />}
        </section>
      </div>

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
