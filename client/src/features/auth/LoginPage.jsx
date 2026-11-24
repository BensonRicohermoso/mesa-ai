import PropTypes from 'prop-types'
import { useState } from 'react'
import { useAuth } from '../../context/useAuth.js'

export function LoginPage({ onOpenOwner }) {
  const { session, isVerifying, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await login(email, password, remember)
      onOpenOwner()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-story" aria-label="MESA AI station access">
        <div className="story-header">
          <div className="brand">
            MESA <span className="brand-script">atelier</span>
          </div>
        </div>

        <div className="story-copy">
          <span className="editorial-quote">service as an art form</span>
          <h1>
            Refined operations, <em>effortless</em> hospitality.
          </h1>
          <p>
            An understated operational suite engineered for contemporary dining rooms.
            Floor management, kitchen routing, and intelligence unified in pure monochrome.
          </p>
        </div>

        <div className="shift-note">
          <span className="status-dot" aria-hidden="true" />
          <span>Station Terminal Ready &bull; 6-Hr Shift Mode</span>
        </div>
      </section>

      <section className="auth-panel">
        <div className="login-card">
          <span className="editorial-eyebrow">Terminal Access</span>
          <h2>Staff Sign-In</h2>
          <p className="login-intro">
            Provide your floor credentials to authenticate this terminal and initialize your shift.
          </p>

          {session && !isVerifying ? (
            <button
              className="primary-button"
              type="button"
              style={{ width: '100%' }}
              onClick={onOpenOwner}
            >
              Resume As {session.staff.fullName} &rarr;
            </button>
          ) : (
            <form className="login-form" onSubmit={handleSubmit}>
              <label className="field" htmlFor="email">
                <span>Staff Account Email</span>
                <input
                  autoComplete="email"
                  id="email"
                  name="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="e.g. admin@gmail.com"
                  required
                  type="email"
                  value={email}
                />
              </label>

              <label className="field" htmlFor="password">
                <span>Master Password</span>
                <input
                  autoComplete="current-password"
                  id="password"
                  minLength="1"
                  name="password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                  type="password"
                  value={password}
                />
              </label>

              {/* Remember this terminal / persistent storage */}
              <label className="checkbox-field" htmlFor="remember">
                <input
                  id="remember"
                  name="remember"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>
                  <strong>Remember this station</strong> (Keeps shift active across tab restarts)
                </span>
              </label>

              {error ? (
                <p className="form-error" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                className="primary-button"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? 'Authenticating…' : 'Enter Station Shift'}
              </button>
            </form>
          )}

          <p className="login-footer">
            Dedicated POS and KDS stations require master credentials once every 6 hours.
            Subsequent access is authenticated via rapid numeric PIN.
          </p>
        </div>
      </section>
    </main>
  )
}

LoginPage.propTypes = {
  onOpenOwner: PropTypes.func.isRequired,
}
