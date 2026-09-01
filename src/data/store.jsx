import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db as firestore } from '../firebase/config'
import { useAuth } from '../firebase/auth'

/**
 * One place that owns all business data, stored in Cloud Firestore.
 *
 * Every collection is watched with a live listener, so a change saved on one
 * device appears on every other signed-in device within about a second. That is
 * what makes the hosted site usable from a phone at the venue and a laptop at
 * home without exporting anything.
 *
 * Each document carries an `ownerUid`. Queries filter on it and the security
 * rules enforce it, so two different Google accounts never see each other's work.
 */

/** Business collections, each watched live. */
export const COLLECTIONS = [
  'clients',
  'events',
  'payments',
  'crewAssignments',
  'footageUploads',
  'notifications',
]

/**
 * Profile documents keyed by uid, written at sign-in. Not listed in COLLECTIONS
 * because it holds one document per account rather than a list of records.
 */
export const USERS_COLLECTION = 'users'

/** Child records that must go when their parent event goes. */
const EVENT_CHILDREN = ['payments', 'crewAssignments', 'footageUploads', 'notifications']

/** Firestore caps a batch at 500 writes. */
const BATCH_LIMIT = 450

const EMPTY_DB = Object.fromEntries(COLLECTIONS.map((name) => [name, []]))
const NONE_LOADED = Object.fromEntries(COLLECTIONS.map((name) => [name, false]))
const ALL_LOADED = Object.fromEntries(COLLECTIONS.map((name) => [name, true]))

const DataContext = createContext(null)

/** Firestore rejects undefined, so drop those keys before every write. */
function clean(object) {
  const output = {}
  for (const [key, value] of Object.entries(object ?? {})) {
    if (value !== undefined) output[key] = value
  }
  return output
}

/** Turns a Firebase error into something worth showing a photographer. */
function describeError(err, action) {
  if (err?.code === 'permission-denied') {
    return 'Firestore denied that request. Publish the rules from firestore.rules and make sure you are signed in with your own account.'
  }
  if (err?.code === 'unavailable') {
    return 'No connection to Firestore. The change is saved on this device and will sync when you are back online.'
  }
  if (err?.code === 'failed-precondition') {
    return 'Firestore needs an index for that query. Run: firebase deploy --only firestore:indexes'
  }
  return `Could not ${action}: ${err?.message ?? 'unknown error'}`
}

export function DataProvider({ children }) {
  const { user } = useAuth()
  const uid = user?.uid ?? null

  const [data, setData] = useState(EMPTY_DB)
  const [loaded, setLoaded] = useState(ALL_LOADED)
  const [error, setError] = useState('')

  // Signing in or out starts a new data source. Reset during render rather than
  // in an effect, so the previous account's records are never shown for a frame
  // underneath the new one.
  const [activeUid, setActiveUid] = useState(null)
  if (activeUid !== uid) {
    setActiveUid(uid)
    setError('')
    setData(EMPTY_DB)
    // Signed out there is nothing to wait for; signed in, hold the app on its
    // loading state until the first snapshot of each collection has arrived.
    setLoaded(uid ? NONE_LOADED : ALL_LOADED)
  }

  useEffect(() => {
    if (!uid) return undefined

    const unsubscribers = COLLECTIONS.map((name) =>
      onSnapshot(
        query(collection(firestore, name), where('ownerUid', '==', uid)),
        (snapshot) => {
          const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
          setData((prev) => ({ ...prev, [name]: rows }))
          setLoaded((prev) => ({ ...prev, [name]: true }))
        },
        (err) => {
          console.error(`Firestore listener failed for "${name}"`, err)
          setError(describeError(err, `load ${name}`))
          // Mark it loaded anyway, otherwise the app hangs on a spinner forever.
          setLoaded((prev) => ({ ...prev, [name]: true }))
        },
      ),
    )

    return () => unsubscribers.forEach((stop) => stop())
  }, [uid])

  const create = useCallback(
    async (name, values) => {
      if (!uid) throw new Error('You must be signed in to save data.')
      try {
        const ref = await addDoc(collection(firestore, name), {
          ...clean({ ...values, ownerUid: uid }),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        return ref.id
      } catch (err) {
        const message = describeError(err, `save that ${singular(name)}`)
        setError(message)
        throw new Error(message, { cause: err })
      }
    },
    [uid],
  )

  const update = useCallback(
    async (name, id, patch) => {
      if (!uid) throw new Error('You must be signed in to save data.')
      try {
        await updateDoc(doc(firestore, name, id), {
          ...clean(patch),
          updatedAt: serverTimestamp(),
        })
      } catch (err) {
        const message = describeError(err, `update that ${singular(name)}`)
        setError(message)
        throw new Error(message, { cause: err })
      }
    },
    [uid],
  )

  const remove = useCallback(
    async (name, id) => {
      if (!uid) throw new Error('You must be signed in to delete data.')
      try {
        await deleteDoc(doc(firestore, name, id))
      } catch (err) {
        const message = describeError(err, `delete that ${singular(name)}`)
        setError(message)
        throw new Error(message, { cause: err })
      }
    },
    [uid],
  )

  /** Removes an event together with its payments, crew, footage and alerts. */
  const removeEvent = useCallback(
    async (eventId) => {
      if (!uid) throw new Error('You must be signed in to delete data.')
      try {
        const refs = []
        for (const name of EVENT_CHILDREN) {
          const snapshot = await getDocs(
            query(
              collection(firestore, name),
              where('ownerUid', '==', uid),
              where('eventId', '==', eventId),
            ),
          )
          snapshot.docs.forEach((d) => refs.push(d.ref))
        }
        refs.push(doc(firestore, 'events', eventId))
        await commitInBatches(refs.map((ref) => ({ kind: 'delete', ref })))
      } catch (err) {
        const message = describeError(err, 'delete that event')
        setError(message)
        throw new Error(message, { cause: err })
      }
    },
    [uid],
  )

  /** Deletes a crew member and the footage record that belongs to them. */
  const removeCrewMember = useCallback(
    async (assignmentId) => {
      const linked = data.footageUploads.filter(
        (f) => f.crewAssignmentId === assignmentId,
      )
      for (const row of linked) await remove('footageUploads', row.id)
      await remove('crewAssignments', assignmentId)
    },
    [data.footageUploads, remove],
  )

  /**
   * Replaces everything in the account with the contents of a backup file.
   * Used by Settings > Restore a backup, and by Clear all data with {}.
   */
  const replaceAll = useCallback(
    async (incoming) => {
      if (!uid) throw new Error('You must be signed in to restore data.')
      try {
        const writes = []

        // Clear what is there now.
        for (const name of COLLECTIONS) {
          const snapshot = await getDocs(
            query(collection(firestore, name), where('ownerUid', '==', uid)),
          )
          snapshot.docs.forEach((d) => writes.push({ kind: 'delete', ref: d.ref }))
        }

        // Then write the backup back in, keeping the original document ids so
        // that eventId/clientId cross-references in the file still line up.
        for (const name of COLLECTIONS) {
          const rows = Array.isArray(incoming?.[name]) ? incoming[name] : []
          for (const row of rows) {
            const { id, ...fields } = row
            const ref = id
              ? doc(firestore, name, String(id))
              : doc(collection(firestore, name))
            writes.push({
              kind: 'set',
              ref,
              data: {
                ...clean(fields),
                ownerUid: uid,
                updatedAt: serverTimestamp(),
              },
            })
          }
        }

        await commitInBatches(writes)
      } catch (err) {
        const message = describeError(err, 'restore that backup')
        setError(message)
        throw new Error(message, { cause: err })
      }
    },
    [uid],
  )

  const ready = !uid || COLLECTIONS.every((name) => loaded[name])

  const value = useMemo(
    () => ({
      db: data,
      ready,
      error,
      create,
      update,
      remove,
      removeEvent,
      removeCrewMember,
      replaceAll,
      dismissError: () => setError(''),
    }),
    [data, ready, error, create, update, remove, removeEvent, removeCrewMember, replaceAll],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

/** Applies writes in chunks, because one batch cannot exceed 500 operations. */
async function commitInBatches(writes) {
  for (let index = 0; index < writes.length; index += BATCH_LIMIT) {
    const batch = writeBatch(firestore)
    for (const write of writes.slice(index, index + BATCH_LIMIT)) {
      if (write.kind === 'delete') batch.delete(write.ref)
      else batch.set(write.ref, write.data)
    }
    await batch.commit()
  }
}

/** 'payments' -> 'payment', for readable error messages. */
function singular(name) {
  const words = name.replace(/([A-Z])/g, ' $1').toLowerCase().trim()
  return words.endsWith('s') ? words.slice(0, -1) : words
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData must be used inside <DataProvider>')
  return context
}
