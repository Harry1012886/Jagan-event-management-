import { CURRENCY } from '../data/constants'

/**
 * Dates are stored as plain 'YYYY-MM-DD' strings and times as 'HH:mm' (24-hour)
 * strings. Keeping them as text means a shoot on 15 Oct is always 15 Oct, no
 * matter which device or timezone opens the record.
 */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3))

export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export { MONTHS, MONTHS_SHORT }

/** 'YYYY-MM-DD' for today in the device's own timezone. */
export function todayISO() {
  return toISODate(new Date())
}

/** Date object -> 'YYYY-MM-DD' using local time (never UTC). */
export function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 'YYYY-MM-DD' -> Date at local midnight. Returns null for bad input. */
export function fromISODate(iso) {
  if (!iso || typeof iso !== 'string') return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  const date = new Date(y, m - 1, d)
  return Number.isNaN(date.getTime()) ? null : date
}

/** '2026-10-15' -> '15 Oct 2026' */
export function formatDate(iso) {
  const date = fromISODate(iso)
  if (!date) return '—'
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`
}

/** '2026-10-15' -> 'Thursday, 15 October 2026' */
export function formatDateLong(iso) {
  const date = fromISODate(iso)
  if (!date) return '—'
  const weekday = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
  ][date.getDay()]
  return `${weekday}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

/** '18:30' -> '6:30 PM' */
export function formatTime(hhmm) {
  const parsed = parseTime(hhmm)
  if (!parsed) return '—'
  const { hour, minute } = parsed
  const suffix = hour < 12 ? 'AM' : 'PM'
  const display = hour % 12 === 0 ? 12 : hour % 12
  return `${display}:${String(minute).padStart(2, '0')} ${suffix}`
}

/** '18:30' -> { hour: 18, minute: 30 }, or null when unusable. */
export function parseTime(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return null
  const [h, m] = hhmm.split(':').map(Number)
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return { hour: h, minute: m }
}

export function toTimeString(hour, minute) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

/** '06:00' + '22:00' -> '6:00 AM – 10:00 PM' */
export function formatTimeRange(start, end) {
  if (!start && !end) return '—'
  if (!end) return formatTime(start)
  if (!start) return formatTime(end)
  return `${formatTime(start)} – ${formatTime(end)}`
}

/** 80000 -> '₹80,000' using the Indian digit grouping. */
export function formatMoney(amount) {
  const value = Number(amount)
  if (!Number.isFinite(value)) return `${CURRENCY}0`
  return `${CURRENCY}${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

/** Turns any user input into a safe, non-negative number. */
export function toAmount(input) {
  const value = Number(String(input ?? '').replace(/[^0-9.-]/g, ''))
  if (!Number.isFinite(value) || value < 0) return 0
  return Math.round(value * 100) / 100
}

/** A Firestore Timestamp, Date or ISO string -> '15 Oct 2026, 6:30 PM'. */
export function formatStamp(value) {
  const date = toDate(value)
  if (!date) return '—'
  const time = formatTime(toTimeString(date.getHours(), date.getMinutes()))
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}, ${time}`
}

/** Accepts Firestore Timestamps, Dates, numbers and ISO strings. */
export function toDate(value) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value?.toDate === 'function') return value.toDate()
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000)
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Whole days from today to the given date. Negative means it already passed. */
export function daysFromToday(iso) {
  const target = fromISODate(iso)
  if (!target) return null
  const today = fromISODate(todayISO())
  return Math.round((target - today) / 86400000)
}

/** 'in 3 days' / 'Today' / '2 days ago' */
export function relativeDay(iso) {
  const diff = daysFromToday(iso)
  if (diff === null) return '—'
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff > 1) return `in ${diff} days`
  return `${Math.abs(diff)} days ago`
}

export function initialsOf(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}
