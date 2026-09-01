import { useCallback, useState } from 'react'

/**
 * A small preference kept in this browser (reminder timings, dismissed hints).
 * Business data never goes here — that belongs in Firestore so it syncs.
 */
export function useLocalSetting(key, fallback) {
  const storageKey = `pem.setting.${key}`

  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      return raw === null ? fallback : JSON.parse(raw)
    } catch {
      return fallback
    }
  })

  const save = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next
        try {
          localStorage.setItem(storageKey, JSON.stringify(resolved))
        } catch {
          // A full or blocked storage should not break the page.
        }
        return resolved
      })
    },
    [storageKey],
  )

  return [value, save]
}
