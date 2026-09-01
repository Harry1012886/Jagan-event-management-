import { Icon } from '../components/Icon'
import { Banner } from '../components/ui/Primitives'
import { missingFirebaseKeys } from '../firebase/config'

export const ENV_TEMPLATE = `VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:xxxxxxxxxxxx

# Optional - only needed for Google Calendar reminders
VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com`

/**
 * Shown instead of the sign-in form when the Firebase keys are missing.
 *
 * The app has no local storage mode any more, so without these values there is
 * nowhere to put the data. Saying so plainly is far more useful than letting the
 * SDK throw somewhere deeper.
 */
export function FirebaseSetup() {
  return (
    <div className="login-page">
      <main className="login-panel">
        <div className="login-box" style={{ maxWidth: 560 }}>
          <span className="login-logo">
            <Icon name="cloud" size={26} />
          </span>

          <div>
            <h1>Connect Firebase</h1>
            <p className="text-sm text-muted" style={{ marginTop: 4 }}>
              This dashboard stores everything in Cloud Firestore so your events open on
              your phone and your laptop. Add your project keys to finish setup.
            </p>
          </div>

          <Banner kind="warn" icon="alert">
            Missing from <code>.env</code>: {missingFirebaseKeys.join(', ')}
          </Banner>

          <div className="steps">
            <div className="step">
              Create a free Firebase project at console.firebase.google.com. The Spark plan
              is enough and needs no card.
            </div>
            <div className="step">
              Turn on <strong>Authentication → Sign-in method → Google</strong>.
            </div>
            <div className="step">
              Create a <strong>Cloud Firestore</strong> database.
            </div>
            <div className="step">
              Open <strong>Project settings → Your apps → Web app</strong> and copy the
              config values into a file named <code>.env</code> beside{' '}
              <code>package.json</code>:
            </div>
          </div>

          <pre className="code-block">{ENV_TEMPLATE}</pre>

          <div className="steps">
            <div className="step">
              Publish the security rules so only your own account can read the data:{' '}
              <code>firebase deploy --only firestore:rules,firestore:indexes</code>
            </div>
            <div className="step">
              Restart the dev server. If the site is already hosted, rebuild and redeploy —
              these values are baked in at build time.
            </div>
          </div>

          <p className="text-xs text-muted" style={{ textAlign: 'center' }}>
            These keys are public client identifiers, not secrets. Never put an admin
            service-account key in this app.
          </p>
        </div>
      </main>
    </div>
  )
}
