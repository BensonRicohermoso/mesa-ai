import { lazy, Suspense, useState, useCallback } from 'react'
import { useAuth } from '../../context/useAuth.js'
import { PinPadModal } from '../auth/PinPadModal.jsx'
import { StationSettingsModal } from './components/StationSettingsModal.jsx'
import { AnalyticsToolbar } from './components/AnalyticsToolbar.jsx'
import { getPresetDateRange } from './utils/analyticsFormatters.js'
import './owner.css'

const MenuManagement = lazy(() => import('./components/MenuManagement.jsx').then((m) => ({ default: m.MenuManagement })))
const TableManagement = lazy(() => import('./components/TableManagement.jsx').then((m) => ({ default: m.TableManagement })))
const StaffManagement = lazy(() => import('./components/StaffManagement.jsx').then((m) => ({ default: m.StaffManagement })))
const OwnerDashboard = lazy(() => import('./components/OwnerDashboard.jsx').then((m) => ({ default: m.OwnerDashboard })))
const AnalyticsReports = lazy(() => import('./components/AnalyticsReports.jsx').then((m) => ({ default: m.AnalyticsReports })))
const AiAdvisor = lazy(() => import('./components/AiAdvisor.jsx').then((m) => ({ default: m.AiAdvisor })))
const PlanningWorkspace = lazy(() => import('./components/PlanningWorkspace.jsx').then((m) => ({ default: m.PlanningWorkspace })))

const TABS = [
  { key: 'overview', label: '01 · Overview' },
  { key: 'menu', label: '02 · Menu Atelier' },
  { key: 'tables', label: '03 · Table Suite' },
  { key: 'staff', label: '04 · Staff Roster' },
  { key: 'reports', label: '05 · Analytics & Reports' },
  { key: 'ai', label: '06 · AI Advisor', adminOnly: true },
  { key: 'planning', label: '07 · Planning', adminOnly: true },
]

function buildDefaultFilter(sourceMode = 'live') {
  const range = getPresetDateRange('7d')
  return {
    preset: '7d',
    from: range.from,
    to: range.to,
    sourceMode,
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
  const [analyticsFilter, setAnalyticsFilter] = useState(() => buildDefaultFilter('live'))
  const [reportsSubView, setReportsSubView] = useState('comparisons')
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false)

  const handleRefresh = useCallback(() => {
    setRefreshNonce((k) => k + 1)
  }, [])

  const handleFilterChange = useCallback((next) => {
    setAnalyticsFilter(next)
  }, [])

  const handleSwitchToPreview = useCallback(() => {
    setAnalyticsFilter((prev) => ({ ...prev, sourceMode: 'preview' }))
  }, [])

  const handleResetRange = useCallback(() => {
    setAnalyticsFilter((prev) => buildDefaultFilter(prev.sourceMode))
  }, [])

  const isAdmin = (session?.staff?.role || 'admin') === 'admin'
  const visibleTabs = TABS.filter((tab) => !tab.adminOnly || isAdmin)
  const showToolbar = activeTab === 'overview' || activeTab === 'reports' || activeTab === 'ai'

  return (
    <main className="owner-shell">
      <div className="owner-workspace">
        <nav className="owner-rail" aria-label="Workspace sections">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              className={`owner-rail-item ${activeTab === tab.key ? 'owner-rail-item--active' : ''}`}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              aria-current={activeTab === tab.key ? 'page' : undefined}
            >
              <span className="owner-rail-index">{tab.label.slice(0, 2)}</span>
              <span className="owner-rail-label">{tab.label.slice(5)}</span>
            </button>
          ))}
        </nav>

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
          {/* ── Analytics Toolbar (shared by Overview & Reports) ── */}
          <div className="owner-content-transition" key={activeTab}>
          <Suspense fallback={<div className="mgmt-empty" role="status">Loading section…</div>}>
          {showToolbar && (
            <AnalyticsToolbar
              filter={analyticsFilter}
              onFilterChange={handleFilterChange}
              onRefresh={handleRefresh}
              isLoading={isAnalyticsLoading}
            />
          )}

          {/* ── Tab Content ─────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <OwnerDashboard
              filter={analyticsFilter}
              refreshNonce={refreshNonce}
              onNavigateReports={() => setActiveTab('reports')}
              onNavigatePlanning={() => setActiveTab('planning')}
              onSwitchToPreview={handleSwitchToPreview}
              onResetRange={handleResetRange}
              onLoadingChange={setIsAnalyticsLoading}
            />
          )}

          {activeTab === 'menu' && <MenuManagement />}
          {activeTab === 'tables' && <TableManagement />}
          {activeTab === 'staff' && <StaffManagement />}

          {activeTab === 'reports' && (
            <AnalyticsReports
              filter={analyticsFilter}
              subView={reportsSubView}
              onSubViewChange={setReportsSubView}
              refreshNonce={refreshNonce}
              onSwitchToPreview={handleSwitchToPreview}
              onLoadingChange={setIsAnalyticsLoading}
            />
          )}

          {activeTab === 'ai' && isAdmin && (
            <AiAdvisor
              filter={analyticsFilter}
              refreshNonce={refreshNonce}
              onSwitchToPreview={handleSwitchToPreview}
              onLoadingChange={setIsAnalyticsLoading}
            />
          )}
          {activeTab === 'planning' && isAdmin && <PlanningWorkspace />}
          </Suspense>

          {/* ── Compact Station Footer Strip ──────────────────── */}
          </div>

          <footer className="owner-station-strip no-print">
            <span className="owner-station-meta">
              {session?.staff?.fullName || 'Operator'} &bull;{' '}
              <span style={{ textTransform: 'uppercase' }}>{session?.staff?.role || 'admin'}</span> &bull;{' '}
              {shiftRemainingFormatted || 'Shift In Progress'}
            </span>
            <button className="quiet-link" type="button" onClick={logout}>
              Sign out &rarr;
            </button>
          </footer>
        </section>
        </div>
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
