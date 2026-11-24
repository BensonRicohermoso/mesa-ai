import PropTypes from 'prop-types'
import { useAuth } from '../../context/useAuth.js'

export function ProtectedRoute({
  allowedRoles,
  children,
  workspaceName,
  onGoToLogin,
}) {
  const { session, isVerifying, logout } = useAuth()

  if (isVerifying) {
    return (
      <main className="access-shell">
        <section className="access-card" aria-live="polite">
          <span className="editorial-eyebrow">Station Security</span>
          <h1>Verifying credentials.</h1>
          <p className="login-intro">Synchronizing staff role permissions and active shift token…</p>
        </section>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="access-shell">
        <section className="access-card">
          <span className="editorial-eyebrow">Station Authentication Required</span>
          <h1>Access restricted.</h1>
          <p className="login-intro">
            An active 6-hour staff session is required to interface with this station.
          </p>
          <button className="primary-button" type="button" onClick={onGoToLogin}>
            Sign in with credentials &rarr;
          </button>
        </section>
      </main>
    )
  }

  if (!allowedRoles.includes(session.staff.role)) {
    const label = workspaceName || allowedRoles.join(' or ')
    return (
      <main className="access-shell">
        <section className="access-card">
          <span className="editorial-eyebrow">Role Authorization</span>
          <h1>Station reserved for {label.toLowerCase()} personnel.</h1>
          <p className="login-intro">
            Currently authenticated as <strong>{session.staff.fullName}</strong> ({session.staff.role}).
            Consult management to request assignment to the {label.toLowerCase()} workspace.
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginTop: '2rem' }}>
            <button className="primary-button" type="button" onClick={logout}>
              Switch account
            </button>
          </div>
        </section>
      </main>
    )
  }

  return children
}

ProtectedRoute.propTypes = {
  allowedRoles: PropTypes.arrayOf(PropTypes.string).isRequired,
  children: PropTypes.node.isRequired,
  workspaceName: PropTypes.string,
  onGoToLogin: PropTypes.func,
}
