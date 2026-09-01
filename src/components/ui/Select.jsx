import { useEffect, useMemo, useRef, useState } from 'react'
import { Dropdown } from './Dropdown'
import { Icon } from '../Icon'

/**
 * Accessible dropdown used for every fixed choice in the app: payment status,
 * payment method, event type, crew role, footage upload status, client, district.
 *
 * Options may be plain strings or objects:
 *   { value, label, sub, tone, disabled }
 * `tone` draws the small coloured dot so a status reads at a glance.
 *
 * A search box appears automatically once the list gets long.
 */
export function Select({
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  disabled = false,
  invalid = false,
  searchable,
  searchPlaceholder = 'Type to search…',
  emptyText = 'No matches found',
  clearable = false,
  id,
  ariaLabel,
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlight, setHighlight] = useState(-1)
  const listRef = useRef(null)
  const searchRef = useRef(null)

  const items = useMemo(
    () =>
      options.map((option) =>
        typeof option === 'string' || typeof option === 'number'
          ? { value: String(option), label: String(option) }
          : option,
      ),
    [options],
  )

  const showSearch = searchable ?? items.length > 8

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return items
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(term) ||
        String(item.sub ?? '').toLowerCase().includes(term),
    )
  }, [items, search])

  const selected = items.find((item) => item.value === value) ?? null

  // Reset the search box and cursor as the panel opens or closes. Adjusting
  // state during render is the pattern React recommends over an effect here.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    setSearch('')
    setHighlight(open ? items.findIndex((item) => item.value === value) : -1)
  }

  useEffect(() => {
    if (open && showSearch) {
      const timer = window.setTimeout(() => searchRef.current?.focus(), 20)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [open, showSearch])

  useEffect(() => {
    if (highlight < 0 || !listRef.current) return
    const options = listRef.current.querySelectorAll('[data-option]')
    options[highlight]?.scrollIntoView({ block: 'nearest' })
  }, [highlight])

  function pick(item, close) {
    if (item?.disabled) return
    onChange(item ? item.value : '')
    close()
  }

  function onKeyDown(event, close) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!visible.length) return
      const step = event.key === 'ArrowDown' ? 1 : -1
      setHighlight((prev) => {
        const next = prev + step
        if (next < 0) return visible.length - 1
        if (next >= visible.length) return 0
        return next
      })
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      if (highlight >= 0) pick(visible[highlight], close)
      return
    }
    if (event.key === 'Home') {
      event.preventDefault()
      setHighlight(0)
    }
    if (event.key === 'End') {
      event.preventDefault()
      setHighlight(visible.length - 1)
    }
  }

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={({ ref, toggle }) => (
        <button
          type="button"
          id={id}
          ref={ref}
          className="select-trigger"
          onClick={toggle}
          onKeyDown={(event) => {
            if (!open && (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault()
              setOpen(true)
            }
          }}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          aria-label={ariaLabel}
        >
          {selected?.tone && <span className={`opt-dot dot-${selected.tone}`} />}
          <span className={`select-value ${selected ? '' : 'placeholder'}`}>
            {selected ? selected.label : placeholder}
          </span>
          {clearable && selected && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear selection"
              className="icon-button"
              style={{ width: 24, height: 24 }}
              onClick={(event) => {
                event.stopPropagation()
                onChange('')
              }}
            >
              <Icon name="x" size={14} />
            </span>
          )}
          <Icon name="chevronDown" size={17} className="select-caret" />
        </button>
      )}
    >
      {(close) => (
        <>
          {showSearch && (
            <div className="select-search">
              <input
                ref={searchRef}
                className="input"
                style={{ minHeight: 38 }}
                value={search}
                placeholder={searchPlaceholder}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setHighlight(0)
                }}
                onKeyDown={(event) => onKeyDown(event, close)}
                aria-label={searchPlaceholder}
              />
            </div>
          )}
          <ul
            className="select-list"
            role="listbox"
            ref={listRef}
            tabIndex={showSearch ? -1 : 0}
            onKeyDown={showSearch ? undefined : (event) => onKeyDown(event, close)}
          >
            {visible.length === 0 && <li className="select-empty">{emptyText}</li>}
            {visible.map((item, index) => (
              <li key={item.value}>
                <button
                  type="button"
                  data-option
                  role="option"
                  aria-selected={item.value === value}
                  disabled={item.disabled}
                  className={[
                    'select-option',
                    item.value === value ? 'selected' : '',
                    index === highlight ? 'highlighted' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => pick(item, close)}
                >
                  {item.tone && <span className={`opt-dot dot-${item.tone}`} />}
                  <span className="grow">
                    <span style={{ display: 'block' }}>{item.label}</span>
                    {item.sub && <span className="sub">{item.sub}</span>}
                  </span>
                  {item.value === value && (
                    <Icon name="check" size={16} className="check" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Dropdown>
  )
}
