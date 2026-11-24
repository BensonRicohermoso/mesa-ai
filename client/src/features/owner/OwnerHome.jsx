import { useState, useCallback } from 'react'
import { useAuth } from '../../context/useAuth.js'
import { PinPadModal } from '../auth/PinPadModal.jsx'
import { MenuManagement } from './components/MenuManagement.jsx'
import { TableManagement } from './components/TableManagement.jsx'
import { StaffManagement } from './components/StaffManagement.jsx'
import { StationSettingsModal } from './components/StationSettingsModal.jsx'
import { AnalyticsToolbar } from './components/AnalyticsToolbar.jsx'
import { OwnerDashboard } from './components/OwnerDashboard.jsx'
import { AnalyticsReports } from './components/AnalyticsReports.jsx'
import { getPresetDateRange } from './utils/analyticsFormatters.js'
import './owner.css'

const TABS = [
  { key: 'overview', label: '01 · Overview' },
  { key: 'menu', label: '02 · Menu Atelier' },
  { key: 'tables', label: '03 · Table Suite' },
  { key: 'staff', label: '04 · Staff Roster' },
  { key: 'reports', label: '05 · Analytics & Reports' },
]

function buildDefaultFilter() {
  const range = getPresetDateRange('7d')
  return {
    preset: '7d',
    from: range.from,
    to: range.to,
    sourceMode: 'preview',
    compare: false,
    categoryId: 'all',
    paymentMethod: 'all',
  }
}

export function OwnerHome() {
  const { session, logout, lockScreen, switchStaff, updatePin, shiftRemainingFormatted } = useAuth()
  const [isPinModalOpen, setIsPinModalOpen] = useState(false)
  const [isStationModalOpen, setIsStationModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  // Shared analytics filter state (lifted for Overview + Reports)
  const [analyticsFilter, setAnalyticsFilter] = useState(buildDefaultFilter)
  const [reportsSubView, setReportsSubView] = useState('comparisons')
  const [refreshKey, setRefreshKey] = useState(0)

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  // Reset granularity override when user changes date preset via toolbar
  const handleFilterChange = useCallback((next) => {
    setAnalyticsFilter(next)
  }, [])

  const showToolbar = activeTab === 'overview' || activeTab === 'reports'

  return (
    <main className="owner-shell">
      <div className="owner-container">
        <section className="owner-card">
          {/* ── Header Bar ──────────────────────────────────────── */}
          <header className="owner-header-bar">
            <div>
              <span className="editorial-eyebrow">Executive Atelier &bull; Verified Station</span>
              <div className="brand" style={{ fontSize: '0.95rem' }}>
                MESA <span className="brand-script">administration</span>
              </div>
            </div>

            <div className="terminal-actions">
              <button
                className="action-pill"
                type="button"
                onClick={() => setIsStationModalOpen(true)}
                title="Station settings, PIN, and session info"
              >
                Station &amp; PIN
              </button>
              <button
                className="action-pill"
                type="button"
                onClick={() => setIsPinModalOpen(true)}
                title="Switch floor operator via 4-digit PIN"
              >
                Switch Operator
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

          {/* ── Analytics Toolbar (shared by Overview & Reports) ── */}
          {showToolbar && (
            <AnalyticsToolbar
              filter={analyticsFilter}
              onFilterChange={handleFilterChange}
              onRefresh={handleRefresh}
              isLoading={false}
            />
          )}

          {/* ── Tab Content ─────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <OwnerDashboard
              key={refreshKey}
              filter={analyticsFilter}
              onNavigateReports={() => setActiveTab('reports')}
            />
          )}

          {activeTab === 'menu' && <MenuManagement />}
          {activeTab === 'tables' && <TableManagement />}
          {activeTab === 'staff' && <StaffManagement />}

          {activeTab === 'reports' && (
            <AnalyticsReports
              key={refreshKey}
              filter={analyticsFilter}
              subView={reportsSubView}
              onSubViewChange={setReportsSubView}
            />
          )}
        </section>
      </div>

      {/* PIN Shift Switch Modal */}
      <PinPadModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        activeStaffId={session?.staff?.id}
        onSwitchSuccess={switchStaff}
      />

      {/* Station Settings Modal */}
      <StationSettingsModal
        isOpen={isStationModalOpen}
        onClose={() => setIsStationModalOpen(false)}
        session={session}
        logout={logout}
        updatePin={updatePin}
        shiftRemainingFormatted={shiftRemainingFormatted}
      />
    </main>
  )
}
