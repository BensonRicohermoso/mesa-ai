import { useEffect, useState } from 'react'
import { LoginPage } from './features/auth/LoginPage.jsx'
import {
  clearStoredSession,
  getCurrentUser,
  loadStoredSession,
} from './features/auth/authClient.js'
import { ProtectedRoute } from './features/auth/ProtectedRoute.jsx'
import { OwnerHome } from './features/owner/OwnerHome.jsx'
import './App.css'

function getPath() {
  return window.location.pathname === '/login' ? '/login' : '/owner'
}

function App() {
  const [path, setPath] = useState(getPath)
  const [session, setSession] = useState(loadStoredSession)
  const [isVerifying, setIsVerifying] = useState(() => Boolean(session))
  const accessToken = session?.accessToken

  useEffect(() => {
    function handlePopState() {
      setPath(getPath())
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

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
      .catch(() => {
        if (!isCurrent) return
        clearStoredSession()
        setSession(null)
      })
      .finally(() => {
        if (isCurrent) setIsVerifying(false)
      })

    return () => {
      isCurrent = false
    }
  }, [accessToken])

  function navigate(nextPath, replace = false) {
    const method = replace ? 'replaceState' : 'pushState'
    window.history[method](null, '', nextPath)
    setPath(nextPath)
  }

  function handleLogin(nextSession) {
    setIsVerifying(true)
    setSession(nextSession)
    navigate('/owner', true)
  }

  function handleSignOut() {
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
      onGoToLogin={() => navigate('/login', true)}
      onSignOut={handleSignOut}
    >
      <OwnerHome session={session} onSignOut={handleSignOut} />
    </ProtectedRoute>
  )
}

export default App
