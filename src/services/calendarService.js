import {
  GoogleAuthProvider,
  linkWithPopup,
  linkWithRedirect,
  reauthenticateWithPopup,
  reauthenticateWithRedirect,
} from 'firebase/auth'
import { auth, isFirebaseConfigured } from '../firebase/config'
import { locationLabel } from '../utils/calc'
import { isAppleTouchDevice } from '../utils/device'
import { formatMoney } from '../utils/format'

/**
 * Google Calendar reminders — still on the free Spark plan.
 *
 * Gmail is not used. A Gmail reminder while the website is closed would need a
 * paid Cloud Function. Calendar stores the reminder and Google sends the email
 * and the phone notification itself, at no cost.
 *
 * Permission comes from the same Google sign-in already used to open the app.
 * No extra OAuth client ID and no billing account.
 */

const SCOPE = 'https://www.googleapis.com/auth/calendar.events'
const API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
const TIME_ZONE = 'Asia/Kolkata'
const TOKEN_KEY = 'pem.calendarToken'
const EXPIRY_KEY = 'pem.calendarTokenExpiry'

export const isCalendarConfigured = isFirebaseConfigured

/** Reminder choices offered in Settings, in minutes before the event starts. */
export const REMINDER_PRESETS = [
  { value: 10080, label: '1 week before' },
  { value: 2880, label: '2 days before' },
  { value: 1440, label: '1 day before' },
  { value: 120, label: '2 hours before' },
  { value: 60, label: '1 hour before' },
  { value: 30, label: '30 minutes before' },
]

export const DEFAULT_REMINDERS = [10080, 1440]

let cachedToken = readStored(TOKEN_KEY)
let tokenExpiry = Number(readStored(EXPIRY_KEY) || 0)

function readStored(key) {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStored(token, expiry) {
  cachedToken = token
  tokenExpiry = expiry
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token)
      sessionStorage.setItem(EXPIRY_KEY, String(expiry))
    } else {
      sessionStorage.removeItem(TOKEN_KEY)
      sessionStorage.removeItem(EXPIRY_KEY)
    }
  } catch {
    // Private browsing can block sessionStorage.
  }
}

function markCalendarLinked(linked) {
  try {
    localStorage.setItem('pem.setting.calendarLinked', JSON.stringify(linked))
  } catch {
    // Ignore storage errors.
  }
}

function rememberToken(accessToken, expiresIn = 3600) {
  writeStored(accessToken, Date.now() + Number(expiresIn) * 1000)
}

function calendarProvider() {
  const provider = new GoogleAuthProvider()
  provider.addScope(SCOPE)
  provider.setCustomParameters({
    prompt: 'consent',
    include_granted_scopes: 'true',
    login_hint: 'clixionphotography@gmail.com',
  })
  return provider
}

export function captureCalendarToken(result) {
  const credential = result ? GoogleAuthProvider.credentialFromResult(result) : null
  if (!credential?.accessToken) return false
  rememberToken(credential.accessToken, 3500)
  markCalendarLinked(true)
  return true
}

/**
 * Ask Google for Calendar permission without switching the signed-in Firebase user.
 * Email/password logins are linked to Google so reminders stay on the same account.
 * iPhone uses a full-page redirect because Safari blocks popups.
 */
export async function connectCalendar() {
  if (!auth.currentUser) {
    throw new Error('Sign in first, then connect Calendar.')
  }

  const provider = calendarProvider()
  const hasGoogle = auth.currentUser.providerData.some((item) => item.providerId === 'google.com')

  if (isAppleTouchDevice()) {
    if (hasGoogle) await reauthenticateWithRedirect(auth.currentUser, provider)
    else await linkWithRedirect(auth.currentUser, provider)
    return true
  }

  let result
  try {
    result = hasGoogle
      ? await reauthenticateWithPopup(auth.currentUser, provider)
      : await linkWithPopup(auth.currentUser, provider)
  } catch (err) {
    const code = String(err?.code ?? '')
    if (code.includes('popup-closed')) {
      throw new Error('The Google permission window was closed before finishing.')
    }
    if (code.includes('popup-blocked')) {
      throw new Error('Your browser blocked the Google popup. Allow popups and try again.')
    }
    if (code.includes('provider-already-linked')) {
      result = await reauthenticateWithPopup(auth.currentUser, provider)
    } else if (code.includes('credential-already-in-use')) {
      throw new Error(
        'That Google account is already used on another login. Choose clixionphotography@gmail.com in the Google window.',
      )
    } else {
      throw err
    }
  }

  if (!captureCalendarToken(result)) {
    throw new Error(
      'Google signed you in but did not grant Calendar. Tick Calendar access in the popup and try again.',
    )
  }
  return true
}

export function disconnectCalendar() {
  writeStored(null, 0)
  markCalendarLinked(false)
}

export function isCalendarConnected() {
  return Boolean(cachedToken) && Date.now() < tokenExpiry
}

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry - 60_000) return cachedToken
  await connectCalendar()
  return cachedToken
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
    if (response.status === 401 || response.status === 403) {
      writeStored(null, 0)
    }
    throw new Error(friendlyCalendarError(response.status, body?.error?.message))
  }
  return body
}

function friendlyCalendarError(status, message = '') {
  const text = String(message)
  if (status === 403 && (text.includes('has not been used') || text.includes('disabled') || text.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT'))) {
    return 'Google Calendar API is not switched on yet for this project. In Google Cloud, open APIs & Services → Library → Google Calendar API → Enable. It is free. Then tap Connect Google Calendar again.'
  }
  if (status === 401 || status === 403) {
    return 'Calendar permission expired or was declined. Open Settings and tap Connect Google Calendar.'
  }
  return text || `Google Calendar returned ${status}`
}

/** Builds the Calendar event body from one of our event records. */
function toCalendarBody(event, client, reminderMinutes = DEFAULT_REMINDERS) {
  const minutes = (reminderMinutes?.length ? reminderMinutes : DEFAULT_REMINDERS).filter(Boolean)
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
      overrides: minutes.flatMap((value) => [
        { method: 'email', minutes: value },
        { method: 'popup', minutes: value },
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
    body.start = { date: event.date }
    body.end = { date: nextDay(event.date) }
  }

  return body
}

export async function createCalendarEvent(event, client, reminderMinutes) {
  const created = await callCalendar('?sendUpdates=none', {
    method: 'POST',
    body: JSON.stringify(toCalendarBody(event, client, reminderMinutes)),
  })
  return { calendarEventId: created.id, calendarLink: created.htmlLink }
}

export async function updateCalendarEvent(calendarEventId, event, client, reminderMinutes) {
  const updated = await callCalendar(
    `/${encodeURIComponent(calendarEventId)}?sendUpdates=none`,
    {
      method: 'PATCH',
      body: JSON.stringify(toCalendarBody(event, client, reminderMinutes)),
    },
  )
  return { calendarEventId: updated.id, calendarLink: updated.htmlLink }
}

export async function deleteCalendarEvent(calendarEventId) {
  await callCalendar(`/${encodeURIComponent(calendarEventId)}?sendUpdates=none`, {
    method: 'DELETE',
  })
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
