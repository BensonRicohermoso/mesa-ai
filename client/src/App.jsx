import { useEffect, useState } from 'react'
import { LoginPage } from './features/auth/LoginPage.jsx'
import {
  clearStoredSession,
  getCurrentUser,
  loadStoredSession,
  logout,
  refreshSession,
  storeSession,
} from './features/auth/authClient.js'
import { ProtectedRoute } from './features/auth/ProtectedRoute.jsx'
import { OwnerHome } from './features/owner/OwnerHome.jsx'
import './App.css'

// Resolve the current route to one of the two known paths.
// Any unrecognised path (e.g. '/', bookmarks) goes to /login.
function getPath() {
  return window.location.pathname === '/owner' ? '/owner' : '/login'
}

function App() {
  const [path, setPath] = useState(getPath)
  const [session, setSession] = useState(loadStoredSession)
  const [isVerifying, setIsVerifying] = useState(() => Boolean(loadStoredSession()))
  const accessToken = session?.accessToken

  // Sync path state when the user navigates with browser back/forward.
  useEffect(() => {
    function handlePopState() {
      setPath(getPath())
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // On mount (or when the stored token changes), verify the token is still valid.
  // If the token is expired (401), attempt a silent refresh before giving up.
  useEffect(() => {
    if (!accessToken) return undefined

    let isCurrent = true

    getCurrentUser(accessToken)
      .then((identity) => {
        if (!isCurrent) return
        setSession((current) =>
          current
            ? { ...current, user: identity.user, staff: identity.staff }
            : current,
        )
      })
      .catch(async (err) => {
        if (!isCurrent) return

        // Attempt a silent token refresh when the access token has expired.
        if (err.status === 401 && session?.refreshToken) {
          try {
            const next = await refreshSession(session.refreshToken)
            if (!isCurrent) return
            storeSession(next)
            setSession(next)
            return
          } catch {
            // Refresh also failed — fall through to sign-out.
          }
        }

        clearStoredSession()
        setSession(null)
      })
      .finally(() => {
        if (isCurrent) setIsVerifying(false)
      })

    return () => {
      isCurrent = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  function navigate(nextPath, replace = false) {
    const method = replace ? 'replaceState' : 'pushState'
    window.history[method](null, '', nextPath)
    setPath(nextPath)
  }

  // After a successful login the token is already validated by the API — no
  // extra /auth/me call needed. Skip setting isVerifying to avoid a stuck state.
  function handleLogin(nextSession) {
    storeSession(nextSession)
    setSession(nextSession)
    setIsVerifying(false)
    navigate('/owner', true)
  }

  async function handleSignOut() {
    // Best-effort server-side revocation; don't block the UI on failure.
    if (session?.accessToken) {
      logout(session.accessToken).catch(() => {})
    }
    clearStoredSession()
    setIsVerifying(false)
    setSession(null)
    navigate('/login', true)
  }

  if (path === '/login') {
    return (
      <LoginPage
        activeSession={session}
        isVerifying={isVerifying}
        onAuthenticated={handleLogin}
        onOpenOwner={() => navigate('/owner')}
      />
    )
  }

  return (
    <ProtectedRoute
      allowedRoles={['admin']}
      isVerifying={isVerifying}
      session={session}
      workspaceName="Owner"
      onGoToLogin={() => navigate('/login', true)}
      onSignOut={handleSignOut}
    >
      <OwnerHome session={session} onSignOut={handleSignOut} />
    </ProtectedRoute>
  )
}

export default App
