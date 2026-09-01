import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../Icon'

const ToastContext = createContext(null)

/** Brief confirmations and error messages in the corner of the screen. */
export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      window.clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const push = useCallback(
    (message, kind = 'ok', duration = 3800) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      setItems((prev) => [...prev, { id, message, kind }])
      timers.current.set(id, window.setTimeout(() => dismiss(id), duration))
      return id
    },
    [dismiss],
  )

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((timer) => window.clearTimeout(timer))
  }, [])

  const value = useMemo(
    () => ({
      success: (message) => push(message, 'ok'),
      error: (message) => push(message, 'error', 6000),
      info: (message) => push(message, 'info'),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="toast-stack" role="status" aria-live="polite">
          {items.map((item) => (
            <div key={item.id} className={`toast ${item.kind}`}>
              <Icon
                name={item.kind === 'error' ? 'alert' : item.kind === 'info' ? 'info' : 'checkCircle'}
                size={17}
              />
              <span className="grow">{item.message}</span>
              <button
                type="button"
                className="toast-close"
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss"
              >
                <Icon name="x" size={15} />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside <ToastProvider>')
  return context
}
