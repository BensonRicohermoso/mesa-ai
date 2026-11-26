import { lazy, Suspense, useEffect, useState } from 'react'
import { AuthProvider } from './context/AuthContext.jsx'
import { useAuth } from './context/useAuth.js'
import { LockScreen } from './features/auth/LockScreen.jsx'
import { LoginPage } from './features/auth/LoginPage.jsx'
import { ProtectedRoute } from './features/auth/ProtectedRoute.jsx'
import './App.css'

const OwnerHome = lazy(() => import('./features/owner/OwnerHome.jsx').then((module) => ({ default: module.OwnerHome })))

function getPath() {
  return window.location.pathname === '/owner' ? '/owner' : '/login'
}

function AppContent() {
  const [path, setPath] = useState(getPath)
  const { isLocked, staff, shiftRemainingFormatted, unlockScreen, logout } = useAuth()

  // Sync browser back/forward navigation
  useEffect(() => {
    function handlePopState() {
      setPath(getPath())
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function navigate(nextPath, replace = false) {
    const method = replace ? 'replaceState' : 'pushState'
    window.history[method](null, '', nextPath)
    setPath(nextPath)
  }

  // If locked (idle timeout or returning to terminal), present the PIN Lock Screen
  if (isLocked) {
    return (
      <LockScreen
        staff={staff}
        shiftRemainingFormatted={shiftRemainingFormatted}
        onUnlock={unlockScreen}
        onSignOut={() => {
          logout()
          navigate('/login', true)
        }}
      />
    )
  }

  if (path === '/login') {
    return <LoginPage onOpenOwner={() => navigate('/owner')} />
  }

  return (
    <ProtectedRoute
      allowedRoles={['admin']}
      workspaceName="Owner"
      onGoToLogin={() => navigate('/login', true)}
    >
      <Suspense fallback={<main className="app-loading" aria-live="polite">Loading workspace…</main>}>
        <OwnerHome />
      </Suspense>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
