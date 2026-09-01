import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { EventCard } from '../components/EventCard'
import { EmptyState, PageHeader, SectionCard } from '../components/ui/Primitives'
import { useEventViews } from '../hooks/useEvents'
import { STATUS_TONE } from '../data/constants'
import {
  MONTHS,
  WEEKDAYS_SHORT,
  formatDateLong,
  toISODate,
  todayISO,
} from '../utils/format'

const YEARS_BACK = 6
const YEARS_AHEAD = 10

export function CalendarView() {
  const views = useEventViews()
  const today = todayISO()

  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selected, setSelected] = useState(today)

  const byDate = useMemo(() => {
    const map = new Map()
    for (const view of views) {
      const list = map.get(view.event.date) ?? []
      list.push(view)
      map.set(view.event.date, list)
    }
    return map
  }, [views])

  const cells = useMemo(() => buildMonthCells(cursor.year, cursor.month), [cursor])

  const years = useMemo(() => {
    const current = new Date().getFullYear()
    const list = []
    for (let y = current - YEARS_BACK; y <= current + YEARS_AHEAD; y += 1) list.push(y)
    if (!list.includes(cursor.year)) {
      list.push(cursor.year)
      list.sort((a, b) => a - b)
    }
    return list
  }, [cursor.year])

  const monthEvents = useMemo(
    () =>
      views.filter((view) => {
        const [y, m] = String(view.event.date).split('-').map(Number)
        return y === cursor.year && m === cursor.month + 1
      }),
    [views, cursor],
  )

  const selectedEvents = byDate.get(selected) ?? []

  function shiftMonth(step) {
    setCursor(({ year, month }) => {
      const next = new Date(year, month + step, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

  function goToToday() {
    const now = new Date()
    setCursor({ year: now.getFullYear(), month: now.getMonth() })
    setSelected(today)
  }

  return (
    <>
      <PageHeader
        title="Calendar"
        subtitle={`${monthEvents.length} event${monthEvents.length === 1 ? '' : 's'} in ${MONTHS[cursor.month]} ${cursor.year}`}
        actions={
          <Link to="/events/new" className="btn btn-primary">
            <Icon name="plus" size={17} />
            Add Event
          </Link>
        }
      />

      <div className="month-toolbar">
        <div className="month-jump">
          <button
            type="button"
            className="picker-nav"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
          >
            <Icon name="chevronLeft" size={17} />
          </button>

          <select
            className="native-select"
            value={cursor.month}
            onChange={(event) =>
              setCursor((prev) => ({ ...prev, month: Number(event.target.value) }))
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
            value={cursor.year}
            onChange={(event) =>
              setCursor((prev) => ({ ...prev, year: Number(event.target.value) }))
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
            <Icon name="chevronRight" size={17} />
          </button>
        </div>

        <button type="button" className="btn btn-secondary btn-sm" onClick={goToToday}>
          <Icon name="calendarCheck" size={15} />
          Today
        </button>
      </div>

      <div className="month-grid" role="grid" aria-label="Month view">
        {WEEKDAYS_SHORT.map((day) => (
          <div key={day} className="month-dow">
            <span className="hide-mobile">{day}</span>
            <span className="only-mobile">{day[0]}</span>
          </div>
        ))}

        {cells.map((cell) => {
          const dayEvents = byDate.get(cell.iso) ?? []
          return (
            <button
              key={cell.iso}
              type="button"
              className={[
                'month-cell',
                cell.outside ? 'outside' : '',
                cell.iso === today ? 'today' : '',
                cell.iso === selected ? 'selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => {
                setSelected(cell.iso)
                if (cell.outside) {
                  const date = new Date(cell.iso)
                  setCursor({ year: date.getFullYear(), month: date.getMonth() })
                }
              }}
              aria-label={`${formatDateLong(cell.iso)}, ${dayEvents.length} events`}
            >
              <span className="month-daynum">{cell.day}</span>

              {dayEvents.slice(0, 3).map((view) => (
                <span
                  key={view.event.id}
                  className={`month-pill ${STATUS_TONE[view.status] ?? 'muted'}`}
                >
                  {view.event.eventName}
                </span>
              ))}
              {dayEvents.length > 3 && (
                <span className="month-more">+{dayEvents.length - 3} more</span>
              )}

              {dayEvents.length > 0 && (
                <span className="month-dots">
                  {dayEvents.slice(0, 4).map((view) => (
                    <span key={view.event.id} />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div style={{ marginTop: 18 }}>
        <SectionCard
          title={formatDateLong(selected)}
          icon="calendar"
          action={
            <Link
              to={`/events/new?date=${selected}`}
              className="btn btn-secondary btn-sm"
            >
              <Icon name="plus" size={15} />
              Add on this day
            </Link>
          }
        >
          {selectedEvents.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="Nothing booked"
              text="No shoot is scheduled for this date."
            />
          ) : (
            <div className="grid grid-2">
              {selectedEvents.map((view) => (
                <EventCard key={view.event.id} view={view} />
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  )
}

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
