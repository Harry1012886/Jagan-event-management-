import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
} from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from './config'

const AuthContext = createContext(null)

/**
 * Identity for the whole app, backed by Firebase Authentication.
 *
 * Signing in with the same Google account on a second device gives the same uid,
 * which is what makes every record follow you from phone to laptop.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // Nothing to wait for if Firebase was never configured; the app shows setup
  // instructions in that case rather than a sign-in form.
  const [loading, setLoading] = useState(isFirebaseConfigured)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined

    return onAuthStateChanged(
      auth,
      (next) => {
        if (next) {
          setUser({
            uid: next.uid,
            displayName: next.displayName || next.email,
            email: next.email,
            photoURL: next.photoURL,
          })
          // Keep a profile document so the account has a record of its own in
          // Firestore. Never block sign-in on it — a failure here should not
          // lock the owner out of their dashboard.
          saveUserProfile(next).catch((err) =>
            console.error('Could not save the user profile', err),
          )
        } else {
          setUser(null)
        }
        setLoading(false)
      },
      (err) => {
        setError(friendlyAuthError(err))
        setLoading(false)
      },
    )
  }, [])

  const value = useMemo(() => {
    async function signInWithGoogle() {
      setError('')
      try {
        const provider = new GoogleAuthProvider()
        provider.setCustomParameters({ prompt: 'select_account' })
        await signInWithPopup(auth, provider)
      } catch (err) {
        setError(friendlyAuthError(err))
        throw err
      }
    }

    async function signInWithEmail(email, password) {
      setError('')
      try {
        await signInWithEmailAndPassword(auth, email, password)
      } catch (err) {
        setError(friendlyAuthError(err))
        throw err
      }
    }

    async function signOut() {
      try {
        await fbSignOut(auth)
      } catch (err) {
        setError(friendlyAuthError(err))
        throw err
      }
    }

    return {
      user,
      loading,
      error,
      signInWithGoogle,
      signInWithEmail,
      signOut,
      clearError: () => setError(''),
    }
  }, [user, loading, error])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** Upserts users/{uid}. Merge keeps createdAt from the first ever sign-in. */
async function saveUserProfile(fbUser) {
  await setDoc(
    doc(db, 'users', fbUser.uid),
    {
      ownerUid: fbUser.uid,
      displayName: fbUser.displayName ?? '',
      email: fbUser.email ?? '',
      photoURL: fbUser.photoURL ?? '',
      lastSignInAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}

function friendlyAuthError(err) {
  const code = err?.code ?? ''
  if (code.includes('popup-closed')) return 'Sign-in window was closed before finishing.'
  if (code.includes('popup-blocked')) return 'Your browser blocked the sign-in popup. Allow popups and try again.'
  if (code.includes('network')) return 'No internet connection. Check your network and try again.'
  if (code.includes('invalid-credential') || code.includes('wrong-password')) {
    return 'That email or password is not correct.'
  }
  if (code.includes('user-not-found')) return 'No account found for that email address.'
  if (code.includes('too-many-requests')) return 'Too many attempts. Please wait a moment and try again.'
  if (code.includes('unauthorized-domain')) {
    return 'This web address is not authorised in Firebase Authentication settings.'
  }
  if (code.includes('operation-not-allowed')) {
    return 'That sign-in method is switched off in the Firebase console.'
  }
  return err?.message ?? 'Sign-in failed. Please try again.'
}
