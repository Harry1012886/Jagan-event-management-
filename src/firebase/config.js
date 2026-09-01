import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

/**
 * Firebase is the only data layer. Authentication identifies the owner and Cloud
 * Firestore stores every record, so a booking added on a phone is on the laptop a
 * moment later.
 *
 * These VITE_ values are public client-side identifiers, not secrets — they ship
 * inside the JavaScript bundle by design. What actually protects the data is the
 * Firestore security rules in firestore.rules. No admin credential or service
 * account private key belongs in this app.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/** Which keys are missing, so the setup screen can name them exactly. */
export const missingFirebaseKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => typeof value !== 'string' || value.trim().length === 0)
  .map(([key]) => `VITE_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`)

export const isFirebaseConfigured = missingFirebaseKeys.length === 0

/**
 * Point at the local Firebase emulators instead of the real project. Used for
 * development and for testing the security rules without touching live data.
 * Set VITE_FIREBASE_EMULATOR=true in .env.local and run `npm run emulators`.
 */
const useEmulator = import.meta.env.VITE_FIREBASE_EMULATOR === 'true'

let app = null
let auth = null
let db = null

/**
 * Without keys the SDK would throw on the first call and blank the screen. The
 * app checks isFirebaseConfigured first and shows setup instructions instead.
 */
if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  // The persistent cache lets the dashboard open instantly on a repeat visit and
  // keeps edits made with no signal, pushing them up when the connection returns.
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  })

  if (useEmulator) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    connectFirestoreEmulator(db, '127.0.0.1', 8080)
  }
}

export { app, auth, db }
