import { useState } from 'react'
import { login } from './authClient.js'

export function LoginPage({ activeSession, isVerifying, onAuthenticated, onOpenOwner }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      // Session storage is managed by App via onAuthenticated — don't duplicate it here.
      const session = await login(email, password)
      onAuthenticated(session)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-story" aria-label="MESA AI staff access">
        <div className="brand">MESA<span className="brand-mark">/</span>AI</div>
        <div className="story-copy"><h1>Good service starts behind the counter.</h1><p>Sign in to manage your floor, kitchen, and business decisions in one place.</p></div>
        <div className="shift-note"><span className="status-dot" aria-hidden="true" />Staff workspace is ready</div>
      </section>
      <section className="auth-panel">
        <div className="login-card">
          <h2>Welcome back.</h2>
          <p className="login-intro">Use the staff email and password assigned by your administrator.</p>
          {activeSession && !isVerifying ? <button className="primary-button" type="button" onClick={onOpenOwner}>Continue as {activeSession.staff.fullName}</button> : (
            <form className="login-form" onSubmit={handleSubmit}>
              <label className="field" htmlFor="email">Email address<input autoComplete="email" id="email" name="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
              <label className="field" htmlFor="password">Password<input autoComplete="current-password" id="password" minLength="1" name="password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>
              {error ? <p className="form-error" role="alert">{error}</p> : null}
              <button className="primary-button" disabled={isSubmitting} type="submit">{isSubmitting ? 'Signing in…' : 'Sign in to workspace'}</button>
            </form>
          )}
          <p className="login-footer">Contact your administrator if you need an account or cannot access your role.</p>
        </div>
      </section>
    </main>
  )
}
