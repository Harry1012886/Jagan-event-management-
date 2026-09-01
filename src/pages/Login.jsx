import { useState } from 'react'
import { GoogleMark, Icon } from '../components/Icon'
import { Banner, Field, Spinner } from '../components/ui/Primitives'
import { useAuth } from '../firebase/auth'

const HERO_POINTS = [
  'Every booking, payment and crew member in one place',
  'Cash, UPI and Bank Transfer recorded for each payment',
  'Know who has uploaded footage and who has not',
  'Opens on your phone and your laptop with the same data',
]

export function Login() {
  const { signInWithGoogle, signInWithEmail, error, clearError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState('')

  async function run(kind, action) {
    setBusy(kind)
    clearError()
    try {
      await action()
    } catch {
      // The message is surfaced through the auth context.
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="login-page">
      <aside className="login-hero">
        <div className="row gap-12">
          <span className="brand-mark" style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.18)' }}>
            <Icon name="camera" size={21} />
          </span>
          <strong style={{ fontSize: '1.05rem' }}>Event Manager</strong>
        </div>

        <div>
          <h2>Your shoots, money and crew — under control.</h2>
          <p>
            A private dashboard for your photography and videography business. Track
            every event from the day it is booked until the final payment lands and
            the footage is uploaded.
          </p>

          <div className="hero-points">
            {HERO_POINTS.map((point) => (
              <div className="hero-point" key={point}>
                <Icon name="checkCircle" size={17} />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
          Private admin access only.
        </p>
      </aside>

      <main className="login-panel">
        <div className="login-box">
          <span className="login-logo">
            <Icon name="camera" size={26} />
          </span>

          <div>
            <h1>Sign in</h1>
            <p className="text-sm text-muted" style={{ marginTop: 4 }}>
              Use the Google account that owns this dashboard.
            </p>
          </div>

          {error && <Banner kind="danger">{error}</Banner>}

          <button
            type="button"
            className="google-btn"
            onClick={() => run('google', signInWithGoogle)}
            disabled={Boolean(busy)}
          >
            {busy === 'google' ? <Spinner /> : <GoogleMark size={19} />}
            Continue with Google
          </button>

          <div className="or-split">or</div>

          <form
            className="col gap-12"
            onSubmit={(event) => {
              event.preventDefault()
              run('email', () => signInWithEmail(email.trim(), password))
            }}
          >
            <Field label="Email address">
              {(id) => (
                <input
                  id={id}
                  className="input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              )}
            </Field>

            <Field label="Password">
              {(id) => (
                <input
                  id={id}
                  className="input"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              )}
            </Field>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={Boolean(busy)}
            >
              {busy === 'email' ? <Spinner /> : <Icon name="logout" size={16} />}
              Sign in
            </button>
          </form>

          <p className="text-xs text-muted" style={{ textAlign: 'center' }}>
            Only accounts you authorise in Firebase can open this dashboard.
          </p>
        </div>
      </main>
    </div>
  )
}
