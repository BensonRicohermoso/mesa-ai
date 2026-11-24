import PropTypes from 'prop-types'

export function ProtectedRoute({
  allowedRoles,
  children,
  isVerifying,
  onGoToLogin,
  onSignOut,
  session,
  workspaceName,
}) {
  if (isVerifying) {
    return (
      <main className="access-shell">
        <section className="access-card" aria-live="polite">
          <p>Checking staff access</p>
          <h1>One moment.</h1>
        </section>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="access-shell">
        <section className="access-card">
          <p>Staff sign-in required</p>
          <h1>Access starts here.</h1>
          <p>Sign in with an active staff account to continue.</p>
          <button className="primary-button" type="button" onClick={onGoToLogin}>
            Go to sign in
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
          <p>Role access</p>
          <h1>This workspace is for {label.toLowerCase()} staff.</h1>
          <p>
            You are signed in as {session.staff.fullName}. Ask an administrator
            if you need access to the {label.toLowerCase()} workspace.
          </p>
          <button className="quiet-button" type="button" onClick={onSignOut}>
            Sign out
          </button>
        </section>
      </main>
    )
  }

  return children
}

ProtectedRoute.propTypes = {
  /** Roles allowed to view the wrapped content. */
  allowedRoles: PropTypes.arrayOf(PropTypes.string).isRequired,
  children: PropTypes.node.isRequired,
  /** True while the stored token is being verified against the API. */
  isVerifying: PropTypes.bool.isRequired,
  /** Navigate to the login page. */
  onGoToLogin: PropTypes.func.isRequired,
  /** Sign the current user out. */
  onSignOut: PropTypes.func.isRequired,
  /** Active session, or null when unauthenticated. */
  session: PropTypes.shape({
    accessToken: PropTypes.string.isRequired,
    staff: PropTypes.shape({
      fullName: PropTypes.string.isRequired,
      role: PropTypes.string.isRequired,
    }).isRequired,
  }),
  /** Human-readable workspace name used in access-denied messages. */
  workspaceName: PropTypes.string,
}
