import PropTypes from 'prop-types'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { AuthContext } from './authContextInstance.js'
import {
  clearStoredSession,
  getCurrentUser,
  loadStoredSession,
  login as apiLogin,
  logout as apiLogout,
  refreshSession as apiRefreshSession,
  setStaffPin as apiSetStaffPin,
  storeSession,
  switchStaffByPin as apiSwitchStaffByPin,
} from '../features/auth/authClient.js'

// 10 minutes of inactivity locks the terminal in POS mode
const DEFAULT_IDLE_TIMEOUT_MS = 10 * 60 * 1000

export function AuthProvider({
  children,
  idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS,
}) {
  const [session, setSession] = useState(loadStoredSession)
  const [isVerifying, setIsVerifying] = useState(() => Boolean(loadStoredSession()))

  // On terminal launch or tab reopen: if a valid 6-hr shift session exists,
  // require staff PIN to unlock (no full email/password re-entry required).
  const [isLocked, setIsLocked] = useState(() => Boolean(loadStoredSession()))
  const [nowMs, setNowMs] = useState(() => Date.now())
  const idleTimerRef = useRef(null)

  const accessToken = session?.accessToken

  // Lock terminal
  const lockScreen = useCallback(() => {
    if (session) {
      setIsLocked(true)
    }
  }, [session])

  // Reset or start the idle timer on user interaction
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
    }
    if (session && !isLocked) {
      idleTimerRef.current = setTimeout(() => {
        setIsLocked(true)
      }, idleTimeoutMs)
    }
  }, [session, isLocked, idleTimeoutMs])

  // Activity listeners for touch/mouse/keyboard
  useEffect(() => {
    if (!session || isLocked) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      return undefined
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
    const handleActivity = () => resetIdleTimer()

    events.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }))
    resetIdleTimer()

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity))
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [session, isLocked, resetIdleTimer])

  // Watch 6-hour shift expiration: auto sign-out when shift ends
  useEffect(() => {
    if (!session?.shiftExpiresAt) return undefined

    const shiftEndsMs = new Date(session.shiftExpiresAt).getTime()
    const checkShift = () => {
      if (Date.now() >= shiftEndsMs) {
        clearStoredSession()
        setSession(null)
        setIsLocked(false)
      }
    }

    checkShift()
    const interval = setInterval(() => {
      setNowMs(Date.now())
      checkShift()
    }, 20 * 1000)
    return () => clearInterval(interval)
  }, [session?.shiftExpiresAt])

  // Verify access token on mount and refresh silently if expired
  useEffect(() => {
    if (!accessToken) {
      setIsVerifying(false)
      return undefined
    }

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

        if (err.status === 401 && session?.refreshToken) {
          try {
            const next = await apiRefreshSession(session.refreshToken)
            if (!isCurrent) return
            const updated = storeSession({
              ...next,
              shiftExpiresAt: session.shiftExpiresAt,
            })
            setSession(updated)
            return
          } catch {
            // Refresh failed; clear session
          }
        }

        clearStoredSession()
        setSession(null)
        setIsLocked(false)
      })
      .finally(() => {
        if (isCurrent) setIsVerifying(false)
      })

    return () => {
      isCurrent = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  // Initial master login (starts fresh 6-hour shift)
  const login = useCallback(async (email, password, remember = true) => {
    const nextSession = await apiLogin(email, password)
    const stored = storeSession(nextSession, remember)
    setNowMs(Date.now())
    setSession(stored)
    setIsLocked(false)
    setIsVerifying(false)
    return stored
  }, [])

  // Manual terminal sign out
  const logout = useCallback(async () => {
    if (session?.accessToken) {
      apiLogout(session.accessToken).catch(() => {})
    }
    clearStoredSession()
    setSession(null)
    setIsLocked(false)
    setIsVerifying(false)
  }, [session?.accessToken])

  // Quick PIN-based Staff Switching (POS Mode)
  // The backend now returns a fresh accessToken + refreshToken for the target user,
  // so the Bearer token matches the switched-to user's RBAC role.
  const switchStaff = useCallback(async (pin, staffId = null) => {
    const result = await apiSwitchStaffByPin(pin, staffId)
    setSession((current) => {
      if (!current) return current
      const updated = {
        ...current,
        accessToken: result.accessToken || current.accessToken,
        refreshToken: result.refreshToken || current.refreshToken,
        expiresAt: result.expiresAt || current.expiresAt,
        staff: result.staff,
        user: result.user || current.user,
      }
      storeSession(updated)
      return updated
    })
    setIsLocked(false)
    return result
  }, [])

  // Unlock screen with PIN
  const unlockScreen = useCallback(async (pin) => {
    const targetStaffId = session?.staff?.id || null
    return switchStaff(pin, targetStaffId)
  }, [session?.staff?.id, switchStaff])

  // Update staff PIN
  const updatePin = useCallback(async (pin) => {
    if (!session?.accessToken) throw new Error('Not authenticated')
    return apiSetStaffPin(pin, session.accessToken)
  }, [session?.accessToken])

  // Formatted shift time remaining
  const shiftRemainingFormatted = useMemo(() => {
    if (!session?.shiftExpiresAt) return null
    const diffMs = new Date(session.shiftExpiresAt).getTime() - nowMs
    if (diffMs <= 0) return 'Shift Expired'
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m remaining`
  }, [session?.shiftExpiresAt, nowMs])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      staff: session?.staff ?? null,
      shiftExpiresAt: session?.shiftExpiresAt ?? null,
      shiftRemainingFormatted,
      isAuthenticated: Boolean(session?.accessToken),
      isVerifying,
      isLocked,
      login,
      logout,
      switchStaff,
      unlockScreen,
      lockScreen,
      updatePin,
    }),
    [
      session,
      shiftRemainingFormatted,
      isVerifying,
      isLocked,
      login,
      logout,
      switchStaff,
      unlockScreen,
      lockScreen,
      updatePin,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
  idleTimeoutMs: PropTypes.number,
}
