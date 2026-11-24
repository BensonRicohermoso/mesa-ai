export function ProtectedRoute({ allowedRoles, children, isVerifying, onGoToLogin, onSignOut, session }) {
  if (isVerifying) return <main className="access-shell"><section className="access-card" aria-live="polite"><p>Checking staff access</p><h1>One moment.</h1></section></main>
  if (!session) return <main className="access-shell"><section className="access-card"><p>Staff sign-in required</p><h1>Access starts here.</h1><p>Sign in with an active staff account to continue.</p><button className="primary-button" type="button" onClick={onGoToLogin}>Go to sign in</button></section></main>
  if (!allowedRoles.includes(session.staff.role)) return <main className="access-shell"><section className="access-card"><p>Role access</p><h1>This workspace is for owners.</h1><p>You are signed in as {session.staff.fullName}. Ask an administrator if you need access to the owner workspace.</p><button className="quiet-button" type="button" onClick={onSignOut}>Sign out</button></section></main>
  return children
}
