import { locationLabel } from '../utils/calc'
import { formatMoney } from '../utils/format'

/**
 * Google Calendar integration — the reminder system for this app.
 *
 * Why Calendar and not Gmail:
 * a reminder has to fire at a set time in the future, whether or not the website
 * is open. Gmail can only send while something is running, so a Gmail reminder
 * would need a scheduled Cloud Function, and Firebase requires the paid Blaze
 * plan for those. Google Calendar stores the reminder itself and Google delivers
 * it — as an email and as a phone notification — with no server and no billing
 * account. Calendar API usage at this volume has no fee.
 *
 * Security: this uses Google Identity Services with a public OAuth client ID and
 * no client secret, exactly as the requirements ask. Nothing secret ships to the
 * browser.
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
const SCOPE = 'https://www.googleapis.com/auth/calendar.events'
const GIS_SRC = 'https://accounts.google.com/gsi/client'
const API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
const TIME_ZONE = 'Asia/Kolkata'

export const isCalendarConfigured = CLIENT_ID.trim().length > 0

/** Reminder choices offered in Settings, in minutes before the event starts. */
export const REMINDER_PRESETS = [
  { value: 10080, label: '1 week before' },
  { value: 2880, label: '2 days before' },
  { value: 1440, label: '1 day before' },
  { value: 120, label: '2 hours before' },
  { value: 60, label: '1 hour before' },
  { value: 30, label: '30 minutes before' },
]

export const DEFAULT_REMINDERS = [1440, 120]

let scriptPromise = null
let tokenClient = null
let cachedToken = null
let tokenExpiry = 0

function loadGis() {
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('Could not reach Google. Check your internet connection.'))
    }
    document.head.appendChild(script)
  })

  return scriptPromise
}

/**
 * Returns a valid access token, opening Google's consent window the first time.
 * The token is kept in memory only and never written to storage.
 */
async function getAccessToken({ forceConsent = false } = {}) {
  if (!isCalendarConfigured) {
    throw new Error(
      'Google Calendar is not set up yet. Add VITE_GOOGLE_CLIENT_ID to your .env file.',
    )
  }

  if (!forceConsent && cachedToken && Date.now() < tokenExpiry - 60_000) {
    return cachedToken
  }

  await loadGis()

  return new Promise((resolve, reject) => {
    try {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        prompt: forceConsent ? 'consent' : '',
        callback: (response) => {
          if (response.error) {
            reject(new Error(describeOauthError(response.error)))
            return
          }
          cachedToken = response.access_token
          tokenExpiry = Date.now() + Number(response.expires_in ?? 3600) * 1000
          resolve(cachedToken)
        },
        error_callback: (error) => {
          reject(new Error(describeOauthError(error?.type ?? 'unknown')))
        },
      })
      tokenClient.requestAccessToken()
    } catch (err) {
      reject(err)
    }
  })
}

/** Asks Google for permission up front, from the Settings page. */
export async function connectCalendar() {
  await getAccessToken({ forceConsent: true })
  return true
}

export function disconnectCalendar() {
  if (cachedToken && window.google?.accounts?.oauth2?.revoke) {
    window.google.accounts.oauth2.revoke(cachedToken, () => {})
  }
  cachedToken = null
  tokenExpiry = 0
}

export function isCalendarConnected() {
  return Boolean(cachedToken) && Date.now() < tokenExpiry
}

async function callCalendar(path, options = {}) {
  const token = await getAccessToken()
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (response.status === 204) return null

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = body?.error?.message ?? `Google Calendar returned ${response.status}`
    if (response.status === 401 || response.status === 403) {
      cachedToken = null
      tokenExpiry = 0
    }
    throw new Error(message)
  }
  return body
}

/** Builds the Calendar event body from one of our event records. */
function toCalendarBody(event, client, reminderMinutes = DEFAULT_REMINDERS) {
  const description = [
    client?.name ? `Client: ${client.name}` : null,
    client?.phone ? `Phone: ${client.phone}` : null,
    event.eventType ? `Type: ${event.eventType}` : null,
    event.totalAmount ? `Total: ${formatMoney(event.totalAmount)}` : null,
    event.notes ? `\n${event.notes}` : null,
    '\nCreated from your Event Manager dashboard.',
  ]
    .filter(Boolean)
    .join('\n')

  const body = {
    summary: event.eventName,
    location: locationLabel(event.location),
    description,
    reminders: {
      useDefault: false,
      overrides: reminderMinutes.flatMap((minutes) => [
        { method: 'email', minutes },
        { method: 'popup', minutes },
      ]),
    },
  }

  if (event.startTime && event.endTime) {
    body.start = { dateTime: `${event.date}T${event.startTime}:00`, timeZone: TIME_ZONE }
    body.end = { dateTime: `${event.date}T${event.endTime}:00`, timeZone: TIME_ZONE }
  } else if (event.startTime) {
    body.start = { dateTime: `${event.date}T${event.startTime}:00`, timeZone: TIME_ZONE }
    body.end = { dateTime: `${event.date}T${addHours(event.startTime, 2)}:00`, timeZone: TIME_ZONE }
  } else {
    // No times entered, so book the whole day.
    body.start = { date: event.date }
    body.end = { date: nextDay(event.date) }
  }

  return body
}

export async function createCalendarEvent(event, client, reminderMinutes) {
  const created = await callCalendar('', {
    method: 'POST',
    body: JSON.stringify(toCalendarBody(event, client, reminderMinutes)),
  })
  return { calendarEventId: created.id, calendarLink: created.htmlLink }
}

export async function updateCalendarEvent(calendarEventId, event, client, reminderMinutes) {
  const updated = await callCalendar(`/${encodeURIComponent(calendarEventId)}`, {
    method: 'PATCH',
    body: JSON.stringify(toCalendarBody(event, client, reminderMinutes)),
  })
  return { calendarEventId: updated.id, calendarLink: updated.htmlLink }
}

export async function deleteCalendarEvent(calendarEventId) {
  await callCalendar(`/${encodeURIComponent(calendarEventId)}`, { method: 'DELETE' })
}

function addHours(hhmm, hours) {
  const [h, m] = hhmm.split(':').map(Number)
  const total = Math.min(23 * 60 + 59, h * 60 + m + hours * 60)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function nextDay(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d + 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

function describeOauthError(code) {
  if (String(code).includes('popup_closed')) {
    return 'The Google permission window was closed before finishing.'
  }
  if (String(code).includes('popup_failed')) {
    return 'Your browser blocked the Google popup. Allow popups for this site and try again.'
  }
  if (String(code).includes('access_denied')) {
    return 'Permission was declined, so the calendar event was not created.'
  }
  return `Google sign-in failed (${code}).`
}
