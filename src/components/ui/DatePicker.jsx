import { useMemo, useState } from 'react'
import { Dropdown } from './Dropdown'
import { Icon } from '../Icon'
import {
  MONTHS,
  WEEKDAYS_SHORT,
  formatDate,
  fromISODate,
  toISODate,
  todayISO,
} from '../../utils/format'

const YEARS_BACK = 6
const YEARS_AHEAD = 10

/**
 * Calendar date field.
 *
 * The month and the year are both plain dropdowns in the header, so jumping to
 * "December 2027" takes two taps instead of clicking a next-month arrow twenty
 * times. Value in and out is always a 'YYYY-MM-DD' string.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = 'Choose a date',
  disabled = false,
  invalid = false,
  clearable = true,
  /** Dates that should show a dot, e.g. days that already have a shoot. */
  markedDates,
  id,
}) {
  const [open, setOpen] = useState(false)
  const today = todayISO()
  const selectedDate = fromISODate(value)

  const [view, setView] = useState(() => {
    const base = selectedDate ?? new Date()
    return { year: base.getFullYear(), month: base.getMonth() }
  })

  // Re-centre the calendar on the chosen date each time the panel opens.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      const base = selectedDate ?? new Date()
      setView({ year: base.getFullYear(), month: base.getMonth() })
    }
  }

  const years = useMemo(() => {
    const current = new Date().getFullYear()
    const list = []
    for (let y = current - YEARS_BACK; y <= current + YEARS_AHEAD; y += 1) list.push(y)
    if (selectedDate && !list.includes(selectedDate.getFullYear())) {
      list.push(selectedDate.getFullYear())
      list.sort((a, b) => a - b)
    }
    return list
  }, [selectedDate])

  const cells = useMemo(() => buildMonthCells(view.year, view.month), [view])

  function shiftMonth(step) {
    setView(({ year, month }) => {
      const next = new Date(year, month + step, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })
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
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
        >
          <Icon name="calendar" size={17} style={{ color: 'var(--ink-400)', flex: 'none' }} />
          <span className={`select-value ${value ? '' : 'placeholder'}`}>
            {value ? formatDate(value) : placeholder}
          </span>
          <Icon name="chevronDown" size={17} className="select-caret" />
        </button>
      )}
      panelClassName="picker-panel"
    >
      {(close) => (
        <>
          <div className="picker-head">
            <button
              type="button"
              className="picker-nav"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
            >
              <Icon name="chevronLeft" size={16} />
            </button>

            <select
              className="native-select grow"
              value={view.month}
              onChange={(event) =>
                setView((prev) => ({ ...prev, month: Number(event.target.value) }))
              }
              aria-label="Month"
            >
              {MONTHS.map((name, index) => (
                <option key={name} value={index}>
                  {name}
                </option>
              ))}
            </select>

            <select
              className="native-select"
              style={{ width: 88 }}
              value={view.year}
              onChange={(event) =>
                setView((prev) => ({ ...prev, year: Number(event.target.value) }))
              }
              aria-label="Year"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="picker-nav"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
            >
              <Icon name="chevronRight" size={16} />
            </button>
          </div>

          <div className="cal-grid" role="grid">
            {WEEKDAYS_SHORT.map((day) => (
              <div key={day} className="cal-dow">
                {day.slice(0, 2)}
              </div>
            ))}

            {cells.map((cell) => (
              <button
                key={cell.iso}
                type="button"
                className={[
                  'cal-day',
                  cell.outside ? 'outside' : '',
                  cell.iso === today ? 'today' : '',
                  cell.iso === value ? 'selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-current={cell.iso === today ? 'date' : undefined}
                aria-pressed={cell.iso === value}
                onClick={() => {
                  onChange(cell.iso)
                  close()
                }}
              >
                {cell.day}
                {markedDates?.has?.(cell.iso) && cell.iso !== value && (
                  <span className="event-dot" />
                )}
              </button>
            ))}
          </div>

          <div className="picker-foot">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                onChange(today)
                close()
              }}
            >
              Today
            </button>
            {clearable && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  onChange('')
                  close()
                }}
              >
                Clear
              </button>
            )}
          </div>
        </>
      )}
    </Dropdown>
  )
}

/** Six weeks of cells so the calendar never changes height between months. */
function buildMonthCells(year, month) {
  const first = new Date(year, month, 1)
  const start = new Date(year, month, 1 - first.getDay())
  const cells = []
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
    cells.push({
      iso: toISODate(date),
      day: date.getDate(),
      outside: date.getMonth() !== month,
    })
  }
  return cells
}
