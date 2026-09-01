import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * Shared open/close shell for the select, date picker and time picker.
 *
 * Handles the fiddly parts once: closing on outside click or Escape, returning
 * focus to the trigger afterwards, and flipping the panel above the field when
 * there is not enough room below (which happens a lot on phones).
 */
export function Dropdown({ open, onOpenChange, trigger, children, panelClassName = '', align = 'left' }) {
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const wasOpenRef = useRef(false)
  const [dropUp, setDropUp] = useState(false)

  const close = useCallback(() => onOpenChange(false), [onOpenChange])

  useEffect(() => {
    if (!open) return undefined

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) onOpenChange(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onOpenChange(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onOpenChange])

  // Send focus back to the field after closing, but only if focus was still
  // inside the dropdown — clicking elsewhere on the page should not yank it back.
  useEffect(() => {
    if (wasOpenRef.current && !open) {
      const active = document.activeElement
      if (!active || active === document.body || rootRef.current?.contains(active)) {
        triggerRef.current?.focus()
      }
    }
    wasOpenRef.current = open
  }, [open])

  useLayoutEffect(() => {
    if (!open) return
    const triggerBox = triggerRef.current?.getBoundingClientRect()
    const panelHeight = panelRef.current?.offsetHeight ?? 300
    if (!triggerBox) return
    const spaceBelow = window.innerHeight - triggerBox.bottom
    setDropUp(spaceBelow < panelHeight + 16 && triggerBox.top > panelHeight + 16)
  }, [open])

  return (
    <div className="select" ref={rootRef}>
      {trigger({ ref: triggerRef, open, toggle: () => onOpenChange(!open) })}
      {open && (
        <div
          ref={panelRef}
          className={[
            'popover',
            dropUp ? 'drop-up' : '',
            align === 'right' ? 'align-right' : '',
            panelClassName,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </div>
  )
}
